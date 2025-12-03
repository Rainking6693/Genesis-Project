"""
Lago Integration for HybridBillingAgent

Provides open-source usage-based billing as a Stripe alternative.

Features:
- Customer management
- Subscription plans
- Usage-based billing
- Invoice generation
- Payment processing

Target Agent: HybridBillingAgent
Docker Container: genesis-lago-api
Ports: 3002 (API), 8080 (Frontend)

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
class LagoConfig:
    """Configuration for Lago connection."""
    api_url: str = "http://localhost:3002"
    api_key: Optional[str] = None


@dataclass
class LagoCustomer:
    """Lago customer model."""
    external_id: str
    name: str
    email: str
    address_line1: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    zipcode: Optional[str] = None


@dataclass
class LagoSubscription:
    """Lago subscription model."""
    external_customer_id: str
    plan_code: str
    external_id: Optional[str] = None
    subscription_at: Optional[datetime] = None


class LagoIntegration:
    """
    Lago integration for HybridBillingAgent.

    Provides methods for:
    - Customer lifecycle management
    - Plan and subscription management
    - Usage event tracking
    - Invoice operations
    - Webhook handling

    Usage:
        lago = LagoIntegration()

        # Create customer
        customer = await lago.create_customer(
            external_id="cust_123",
            name="Acme Corp",
            email="billing@acme.com"
        )

        # Create subscription
        subscription = await lago.create_subscription(
            customer_id="cust_123",
            plan_code="basic_monthly"
        )

        # Track usage
        await lago.track_usage(
            customer_id="cust_123",
            event_code="api_calls",
            properties={"count": 100}
        )
    """

    def __init__(self, config: Optional[LagoConfig] = None):
        """Initialize Lago integration."""
        self.config = config or LagoConfig()
        self._api_key = self.config.api_key or os.getenv("LAGO_API_KEY")
        self._session: Optional[requests.Session] = None

    @property
    def session(self) -> requests.Session:
        """Get or create HTTP session."""
        if self._session is None:
            self._session = requests.Session()
            if self._api_key:
                self._session.headers["Authorization"] = f"Bearer {self._api_key}"
            self._session.headers["Content-Type"] = "application/json"
        return self._session

    def _api_url(self, path: str) -> str:
        """Build API URL."""
        return urljoin(self.config.api_url, f"/api/v1/{path.lstrip('/')}")

    def check_health(self) -> bool:
        """Check if Lago is healthy and accessible."""
        try:
            response = self.session.get(
                urljoin(self.config.api_url, "/health"),
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Lago health check failed: {e}")
            return False

    # =========================================================================
    # CUSTOMER MANAGEMENT
    # =========================================================================

    async def create_customer(
        self,
        external_id: str,
        name: str,
        email: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new customer in Lago.

        Args:
            external_id: Your unique customer identifier
            name: Customer name
            email: Customer email
            **kwargs: Additional customer attributes

        Returns:
            Customer data dict
        """
        payload = {
            "customer": {
                "external_id": external_id,
                "name": name,
                "email": email,
                **kwargs
            }
        }

        try:
            response = self.session.post(
                self._api_url("/customers"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            customer_data = response.json().get("customer", {})
            logger.info(f"Created Lago customer: {external_id}")
            return customer_data

        except requests.RequestException as e:
            logger.error(f"Failed to create customer {external_id}: {e}")
            raise

    async def get_customer(self, external_id: str) -> Optional[Dict[str, Any]]:
        """Get customer by external ID."""
        try:
            response = self.session.get(
                self._api_url(f"/customers/{external_id}"),
                timeout=30
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json().get("customer")
        except requests.RequestException as e:
            logger.error(f"Failed to get customer {external_id}: {e}")
            return None

    async def update_customer(
        self,
        external_id: str,
        **updates
    ) -> Dict[str, Any]:
        """Update customer information."""
        payload = {"customer": updates}

        try:
            response = self.session.put(
                self._api_url(f"/customers/{external_id}"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("customer", {})
        except requests.RequestException as e:
            logger.error(f"Failed to update customer {external_id}: {e}")
            raise

    async def delete_customer(self, external_id: str) -> bool:
        """Delete a customer."""
        try:
            response = self.session.delete(
                self._api_url(f"/customers/{external_id}"),
                timeout=30
            )
            response.raise_for_status()
            logger.info(f"Deleted customer: {external_id}")
            return True
        except requests.RequestException as e:
            logger.error(f"Failed to delete customer {external_id}: {e}")
            return False

    # =========================================================================
    # PLAN MANAGEMENT
    # =========================================================================

    async def create_plan(
        self,
        code: str,
        name: str,
        amount_cents: int,
        interval: str = "monthly",
        currency: str = "USD",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a billing plan.

        Args:
            code: Unique plan code
            name: Plan display name
            amount_cents: Price in cents
            interval: Billing interval (monthly, yearly, weekly)
            currency: Currency code

        Returns:
            Plan data dict
        """
        payload = {
            "plan": {
                "code": code,
                "name": name,
                "amount_cents": amount_cents,
                "interval": interval,
                "amount_currency": currency,
                **kwargs
            }
        }

        try:
            response = self.session.post(
                self._api_url("/plans"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            plan_data = response.json().get("plan", {})
            logger.info(f"Created plan: {code}")
            return plan_data
        except requests.RequestException as e:
            logger.error(f"Failed to create plan {code}: {e}")
            raise

    async def list_plans(self) -> List[Dict[str, Any]]:
        """List all plans."""
        try:
            response = self.session.get(
                self._api_url("/plans"),
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("plans", [])
        except requests.RequestException as e:
            logger.error(f"Failed to list plans: {e}")
            return []

    # =========================================================================
    # SUBSCRIPTION MANAGEMENT
    # =========================================================================

    async def create_subscription(
        self,
        external_customer_id: str,
        plan_code: str,
        external_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a subscription for a customer.

        Args:
            external_customer_id: Customer's external ID
            plan_code: Plan code to subscribe to
            external_id: Optional external subscription ID

        Returns:
            Subscription data dict
        """
        payload = {
            "subscription": {
                "external_customer_id": external_customer_id,
                "plan_code": plan_code,
                **kwargs
            }
        }

        if external_id:
            payload["subscription"]["external_id"] = external_id

        try:
            response = self.session.post(
                self._api_url("/subscriptions"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            subscription_data = response.json().get("subscription", {})
            logger.info(f"Created subscription for customer: {external_customer_id}")
            return subscription_data
        except requests.RequestException as e:
            logger.error(f"Failed to create subscription: {e}")
            raise

    async def terminate_subscription(self, external_id: str) -> Dict[str, Any]:
        """Terminate a subscription."""
        try:
            response = self.session.delete(
                self._api_url(f"/subscriptions/{external_id}"),
                timeout=30
            )
            response.raise_for_status()
            logger.info(f"Terminated subscription: {external_id}")
            return response.json().get("subscription", {})
        except requests.RequestException as e:
            logger.error(f"Failed to terminate subscription {external_id}: {e}")
            raise

    # =========================================================================
    # USAGE TRACKING
    # =========================================================================

    async def track_usage(
        self,
        external_customer_id: str,
        code: str,
        transaction_id: str,
        properties: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Track a usage event for billing.

        Args:
            external_customer_id: Customer's external ID
            code: Billable metric code
            transaction_id: Unique transaction ID
            properties: Event properties (e.g., {"count": 100})
            timestamp: Event timestamp (defaults to now)

        Returns:
            Event data dict
        """
        payload = {
            "event": {
                "external_customer_id": external_customer_id,
                "code": code,
                "transaction_id": transaction_id,
                "properties": properties or {},
                "timestamp": (timestamp or datetime.utcnow()).isoformat()
            }
        }

        try:
            response = self.session.post(
                self._api_url("/events"),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            logger.debug(f"Tracked usage event: {code} for {external_customer_id}")
            return response.json().get("event", {})
        except requests.RequestException as e:
            logger.error(f"Failed to track usage event: {e}")
            raise

    async def batch_track_usage(
        self,
        events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Track multiple usage events in batch."""
        payload = {"events": events}

        try:
            response = self.session.post(
                self._api_url("/events/batch"),
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            logger.info(f"Tracked {len(events)} usage events in batch")
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to batch track usage: {e}")
            raise

    # =========================================================================
    # INVOICE MANAGEMENT
    # =========================================================================

    async def get_invoices(
        self,
        external_customer_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get invoices, optionally filtered.

        Args:
            external_customer_id: Filter by customer
            status: Filter by status (draft, finalized, voided)

        Returns:
            List of invoice dicts
        """
        params = {}
        if external_customer_id:
            params["external_customer_id"] = external_customer_id
        if status:
            params["status"] = status

        try:
            response = self.session.get(
                self._api_url("/invoices"),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("invoices", [])
        except requests.RequestException as e:
            logger.error(f"Failed to get invoices: {e}")
            return []

    async def finalize_invoice(self, lago_id: str) -> Dict[str, Any]:
        """Finalize a draft invoice."""
        try:
            response = self.session.put(
                self._api_url(f"/invoices/{lago_id}/finalize"),
                timeout=30
            )
            response.raise_for_status()
            return response.json().get("invoice", {})
        except requests.RequestException as e:
            logger.error(f"Failed to finalize invoice {lago_id}: {e}")
            raise

    async def download_invoice(self, lago_id: str) -> bytes:
        """Download invoice PDF."""
        try:
            response = self.session.get(
                self._api_url(f"/invoices/{lago_id}/download"),
                timeout=60
            )
            response.raise_for_status()
            return response.content
        except requests.RequestException as e:
            logger.error(f"Failed to download invoice {lago_id}: {e}")
            raise


# Integration with HybridBillingAgent
def register_with_billing_agent(agent: Any) -> None:
    """
    Register Lago integration with HybridBillingAgent.

    Args:
        agent: HybridBillingAgent instance
    """
    lago = LagoIntegration()

    if hasattr(agent, "register_tool"):
        agent.register_tool("lago_create_customer", lago.create_customer)
        agent.register_tool("lago_create_subscription", lago.create_subscription)
        agent.register_tool("lago_track_usage", lago.track_usage)
        agent.register_tool("lago_get_invoices", lago.get_invoices)

    logger.info("Lago integration registered with HybridBillingAgent")
