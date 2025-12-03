"""
Postal Integration for HybridMarketingAgent

Provides self-hosted email sending for transactional and marketing emails.

Features:
- Transactional email sending
- Marketing campaigns
- Email templates
- Delivery tracking
- Webhook notifications

Target Agent: HybridMarketingAgent
Docker Container: genesis-postal
Ports: 25 (SMTP), 5000 (Web)

Author: Genesis Project
Date: 2025-12-03
"""

import os
import logging
import requests
from typing import Dict, Optional, List, Any
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urljoin

logger = logging.getLogger(__name__)


@dataclass
class PostalConfig:
    """Configuration for Postal connection."""
    api_url: str = "http://localhost:5000"
    api_key: Optional[str] = None
    smtp_host: str = "localhost"
    smtp_port: int = 25


@dataclass
class EmailMessage:
    """Email message structure."""
    to: List[str]
    subject: str
    html_body: Optional[str] = None
    plain_body: Optional[str] = None
    from_address: Optional[str] = None
    from_name: Optional[str] = None
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    reply_to: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    tag: Optional[str] = None


class PostalIntegration:
    """
    Postal integration for HybridMarketingAgent.

    Provides methods for:
    - Sending individual and bulk emails
    - Email template management
    - Delivery status tracking
    - Campaign management
    - Webhook handling

    Usage:
        postal = PostalIntegration()

        # Send transactional email
        result = await postal.send_email(
            to=["user@example.com"],
            subject="Welcome!",
            html_body="<h1>Welcome to our service</h1>"
        )

        # Send bulk marketing email
        results = await postal.send_bulk(
            recipients=["user1@example.com", "user2@example.com"],
            subject="Newsletter",
            html_body="<p>Monthly update...</p>"
        )

        # Check delivery status
        status = await postal.get_message_status(result["message_id"])
    """

    def __init__(self, config: Optional[PostalConfig] = None):
        """Initialize Postal integration."""
        self.config = config or PostalConfig()
        self._api_key = self.config.api_key or os.getenv("POSTAL_API_KEY")
        self._session: Optional[requests.Session] = None

    @property
    def session(self) -> requests.Session:
        """Get or create HTTP session."""
        if self._session is None:
            self._session = requests.Session()
            if self._api_key:
                self._session.headers["X-Server-API-Key"] = self._api_key
            self._session.headers["Content-Type"] = "application/json"
        return self._session

    def _api_url(self, path: str) -> str:
        """Build API URL."""
        return urljoin(self.config.api_url, f"/api/v1/{path.lstrip('/')}")

    def check_health(self) -> bool:
        """Check if Postal is healthy and accessible."""
        try:
            response = self.session.get(
                self.config.api_url,
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Postal health check failed: {e}")
            return False

    # =========================================================================
    # EMAIL SENDING
    # =========================================================================

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: Optional[str] = None,
        plain_body: Optional[str] = None,
        from_address: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        tag: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Send a single email.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML content
            plain_body: Plain text content
            from_address: Sender email
            from_name: Sender name
            reply_to: Reply-to address
            cc: CC recipients
            bcc: BCC recipients
            tag: Email tag for tracking
            attachments: List of attachment dicts

        Returns:
            Send result with message ID
        """
        payload = {
            "to": to,
            "subject": subject,
        }

        if html_body:
            payload["html_body"] = html_body
        if plain_body:
            payload["plain_body"] = plain_body
        if from_address:
            payload["from"] = from_address
        if from_name:
            payload["sender"] = from_name
        if reply_to:
            payload["reply_to"] = reply_to
        if cc:
            payload["cc"] = cc
        if bcc:
            payload["bcc"] = bcc
        if tag:
            payload["tag"] = tag
        if attachments:
            payload["attachments"] = attachments

        try:
            response = self.session.post(
                self._api_url("/send/message"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()

            logger.info(f"Sent email to {len(to)} recipients")
            return {
                "success": True,
                "message_id": result.get("data", {}).get("message_id"),
                "status": result.get("status"),
                "recipients": to
            }

        except requests.RequestException as e:
            logger.error(f"Failed to send email: {e}")
            return {"success": False, "error": str(e)}

    async def send_bulk(
        self,
        recipients: List[str],
        subject: str,
        html_body: Optional[str] = None,
        plain_body: Optional[str] = None,
        from_address: Optional[str] = None,
        from_name: Optional[str] = None,
        tag: Optional[str] = None,
        batch_size: int = 50
    ) -> Dict[str, Any]:
        """
        Send bulk emails (marketing campaigns).

        Args:
            recipients: List of recipient emails
            subject: Email subject
            html_body: HTML content
            plain_body: Plain text content
            from_address: Sender email
            from_name: Sender name
            tag: Campaign tag
            batch_size: Emails per batch

        Returns:
            Bulk send result summary
        """
        results = {
            "total": len(recipients),
            "sent": 0,
            "failed": 0,
            "message_ids": [],
            "errors": []
        }

        # Send in batches
        for i in range(0, len(recipients), batch_size):
            batch = recipients[i:i + batch_size]

            for recipient in batch:
                result = await self.send_email(
                    to=[recipient],
                    subject=subject,
                    html_body=html_body,
                    plain_body=plain_body,
                    from_address=from_address,
                    from_name=from_name,
                    tag=tag
                )

                if result.get("success"):
                    results["sent"] += 1
                    if result.get("message_id"):
                        results["message_ids"].append(result["message_id"])
                else:
                    results["failed"] += 1
                    results["errors"].append({
                        "recipient": recipient,
                        "error": result.get("error")
                    })

        logger.info(
            f"Bulk email complete: {results['sent']} sent, {results['failed']} failed"
        )
        return results

    async def send_raw(
        self,
        mail_from: str,
        rcpt_to: List[str],
        data: str
    ) -> Dict[str, Any]:
        """
        Send raw MIME email.

        Args:
            mail_from: Envelope sender
            rcpt_to: Envelope recipients
            data: Raw MIME message

        Returns:
            Send result
        """
        payload = {
            "mail_from": mail_from,
            "rcpt_to": rcpt_to,
            "data": data
        }

        try:
            response = self.session.post(
                self._api_url("/send/raw"),
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to send raw email: {e}")
            return {"success": False, "error": str(e)}

    # =========================================================================
    # MESSAGE STATUS
    # =========================================================================

    async def get_message_status(self, message_id: str) -> Dict[str, Any]:
        """
        Get delivery status for a message.

        Args:
            message_id: Message ID from send result

        Returns:
            Message status dict
        """
        try:
            response = self.session.get(
                self._api_url(f"/messages/{message_id}"),
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get message status: {e}")
            return {"error": str(e)}

    async def get_message_deliveries(self, message_id: str) -> List[Dict[str, Any]]:
        """
        Get delivery attempts for a message.

        Args:
            message_id: Message ID

        Returns:
            List of delivery attempt records
        """
        try:
            response = self.session.get(
                self._api_url(f"/messages/{message_id}/deliveries"),
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.RequestException as e:
            logger.error(f"Failed to get deliveries: {e}")
            return []

    # =========================================================================
    # DOMAIN MANAGEMENT
    # =========================================================================

    async def get_domains(self) -> List[Dict[str, Any]]:
        """Get all configured sending domains."""
        try:
            response = self.session.get(
                self._api_url("/domains"),
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.RequestException as e:
            logger.error(f"Failed to get domains: {e}")
            return []

    async def check_domain_dns(self, domain: str) -> Dict[str, Any]:
        """
        Check DNS configuration for a domain.

        Args:
            domain: Domain name

        Returns:
            DNS check results
        """
        try:
            response = self.session.post(
                self._api_url(f"/domains/{domain}/check"),
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to check domain DNS: {e}")
            return {"error": str(e)}

    # =========================================================================
    # WEBHOOK MANAGEMENT
    # =========================================================================

    async def get_webhooks(self) -> List[Dict[str, Any]]:
        """Get configured webhooks."""
        try:
            response = self.session.get(
                self._api_url("/webhooks"),
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.RequestException as e:
            logger.error(f"Failed to get webhooks: {e}")
            return []

    async def create_webhook(
        self,
        url: str,
        events: Optional[List[str]] = None,
        enabled: bool = True
    ) -> Dict[str, Any]:
        """
        Create a webhook for email events.

        Args:
            url: Webhook URL
            events: Events to trigger (MessageDeliveryFailed, MessageBounced, etc.)
            enabled: Whether webhook is active

        Returns:
            Webhook creation result
        """
        events = events or [
            "MessageDeliveryFailed",
            "MessageBounced",
            "MessageLinkClicked",
            "MessageLoadCompleted"
        ]

        payload = {
            "url": url,
            "events": events,
            "enabled": enabled
        }

        try:
            response = self.session.post(
                self._api_url("/webhooks"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            logger.info(f"Created webhook: {url}")
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to create webhook: {e}")
            return {"error": str(e)}

    # =========================================================================
    # EMAIL TEMPLATES
    # =========================================================================

    def create_welcome_template(self, company_name: str, logo_url: Optional[str] = None) -> str:
        """
        Generate a welcome email template.

        Args:
            company_name: Company name
            logo_url: Logo image URL

        Returns:
            HTML template string
        """
        logo_html = f'<img src="{logo_url}" alt="{company_name}" style="max-width: 200px;">' if logo_url else ""

        return f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        {logo_html}
        <h1 style="color: #2c3e50;">Welcome to {company_name}!</h1>
    </div>

    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
        <p>Hi there!</p>
        <p>Thank you for signing up. We're excited to have you on board.</p>
        <p>Here are a few things you can do to get started:</p>
        <ul>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Connect with our community</li>
        </ul>
    </div>

    <div style="margin-top: 30px; text-align: center;">
        <a href="#" style="background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
        <p>&copy; {datetime.now().year} {company_name}. All rights reserved.</p>
        <p><a href="#" style="color: #888;">Unsubscribe</a> | <a href="#" style="color: #888;">Privacy Policy</a></p>
    </div>
</body>
</html>'''

    def create_newsletter_template(
        self,
        company_name: str,
        title: str,
        content_sections: List[Dict[str, str]]
    ) -> str:
        """
        Generate a newsletter email template.

        Args:
            company_name: Company name
            title: Newsletter title
            content_sections: List of {title, content, link} dicts

        Returns:
            HTML template string
        """
        sections_html = ""
        for section in content_sections:
            link_html = f'<a href="{section.get("link", "#")}" style="color: #3498db;">Read more</a>' if section.get("link") else ""
            sections_html += f'''
            <div style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
                <h2 style="color: #2c3e50; margin-bottom: 10px;">{section.get("title", "")}</h2>
                <p>{section.get("content", "")}</p>
                {link_html}
            </div>
            '''

        return f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50;">{title}</h1>
        <p style="color: #888;">{company_name} Newsletter</p>
    </div>

    <div style="padding: 20px;">
        {sections_html}
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
        <p>&copy; {datetime.now().year} {company_name}. All rights reserved.</p>
        <p><a href="#" style="color: #888;">Unsubscribe</a> | <a href="#" style="color: #888;">View in Browser</a></p>
    </div>
</body>
</html>'''


# Integration with Marketing Agent
def register_with_marketing_agent(agent: Any) -> None:
    """Register Postal integration with HybridMarketingAgent."""
    postal = PostalIntegration()

    if hasattr(agent, "register_tool"):
        agent.register_tool("postal_send_email", postal.send_email)
        agent.register_tool("postal_send_bulk", postal.send_bulk)
        agent.register_tool("postal_get_status", postal.get_message_status)
        agent.register_tool("postal_welcome_template", postal.create_welcome_template)
        agent.register_tool("postal_newsletter_template", postal.create_newsletter_template)

    logger.info("Postal integration registered with HybridMarketingAgent")
