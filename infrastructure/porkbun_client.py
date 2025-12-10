"""
Porkbun API Client for Domain Registration and Management
Author: Genesis AI
Date: December 10, 2025
Replaces Name.com with user's Porkbun account

API Docs: https://porkbun.com/api/json/v3/documentation
"""

import os
import logging
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import time

logger = logging.getLogger(__name__)


@dataclass
class DomainAvailability:
    """Domain availability check result"""
    domain: str
    available: bool
    price: float
    premium: bool
    purchasable: bool
    error: Optional[str] = None


@dataclass
class DomainRegistration:
    """Domain registration result"""
    domain: str
    success: bool
    order_id: Optional[str] = None
    total_cost: float = 0.0
    expires_at: Optional[str] = None
    error: Optional[str] = None


@dataclass
class DNSRecord:
    """DNS record for domain configuration"""
    domain: str
    host: str
    record_type: str  # A, AAAA, CNAME, MX, TXT, etc.
    answer: str
    ttl: int = 300


class PorkbunClient:
    """
    Porkbun API v3 client for domain operations

    Features:
    - Domain availability checking
    - Domain registration with auto-renewal
    - DNS record management
    - GitHub Pages integration
    - Cost tracking and alerts

    API Docs: https://porkbun.com/api/json/v3/documentation
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        endpoint: Optional[str] = None
    ):
        """
        Initialize Porkbun API client

        Args:
            api_key: Porkbun API key (defaults to env PORKBUN_API_KEY)
            secret_key: Porkbun secret key (defaults to env PORKBUN_SECRET_KEY)
            endpoint: API endpoint (defaults to Porkbun's production API)
        """
        self.api_key = api_key or os.getenv("PORKBUN_API_KEY")
        self.secret_key = secret_key or os.getenv("PORKBUN_SECRET_KEY")
        self.endpoint = endpoint or "https://porkbun.com/api/json/v3"

        if not self.api_key or not self.secret_key:
            raise ValueError(
                "Porkbun credentials not found. Set PORKBUN_API_KEY and "
                "PORKBUN_SECRET_KEY in .env file or pass as arguments."
            )

        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "Genesis-AI-Domain-Agent/1.0"
        })

        logger.info(f"PorkbunClient initialized (endpoint={self.endpoint})")

    def _get_auth_payload(self) -> Dict[str, str]:
        """Get authentication payload required for all Porkbun API calls"""
        return {
            "apikey": self.api_key,
            "secretapikey": self.secret_key
        }

    def _request(
        self,
        path: str,
        data: Optional[Dict] = None,
        retry_count: int = 3
    ) -> Dict[str, Any]:
        """
        Make authenticated request to Porkbun API

        Note: Porkbun API is POST-only for all endpoints

        Args:
            path: API path (e.g., "/dns/create")
            data: JSON payload (auth will be added automatically)
            retry_count: Number of retries on failure

        Returns:
            API response as dict

        Raises:
            requests.HTTPError: On API error
        """
        url = f"{self.endpoint}{path}"
        payload = self._get_auth_payload()
        if data:
            payload.update(data)

        for attempt in range(retry_count):
            try:
                response = self.session.post(
                    url=url,
                    json=payload,
                    timeout=30
                )
                response.raise_for_status()

                result = response.json()

                # Porkbun returns status in response body
                if result.get("status") == "ERROR":
                    error_msg = result.get("message", "Unknown error")
                    logger.error(f"Porkbun API error: {error_msg}")
                    raise Exception(f"Porkbun API error: {error_msg}")

                return result

            except requests.exceptions.HTTPError as e:
                if response.status_code == 429:  # Rate limit
                    wait_time = 2 ** attempt
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry {attempt+1}/{retry_count}")
                    time.sleep(wait_time)
                    continue
                elif response.status_code >= 500 and attempt < retry_count - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Server error {response.status_code}, retrying in {wait_time}s")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"API error: {response.status_code} - {response.text}")
                    raise

            except requests.exceptions.RequestException as e:
                if attempt < retry_count - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Request failed: {e}, retrying in {wait_time}s")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Request failed after {retry_count} attempts: {e}")
                    raise

        raise Exception(f"Request failed after {retry_count} retries")

    def ping(self) -> bool:
        """
        Test API connection with ping endpoint

        Returns:
            True if connection successful
        """
        try:
            result = self._request("/ping")
            return result.get("status") == "SUCCESS"
        except Exception as e:
            logger.error(f"Porkbun ping failed: {e}")
            return False

    def check_availability(self, domain: str) -> DomainAvailability:
        """
        Check if domain is available for registration

        Args:
            domain: Domain name (e.g., "example.com")

        Returns:
            DomainAvailability object
        """
        try:
            # Porkbun pricing/get endpoint
            response = self._request("/pricing/get")

            # Extract TLD from domain
            tld = domain.split(".")[-1] if "." in domain else domain

            pricing = response.get("pricing", {}).get(tld, {})
            base_price = float(pricing.get("registration", 0))

            # Check actual availability via domain check
            try:
                check_response = self._request(f"/domain/checkAvailability/{domain}")
                available = check_response.get("status") == "SUCCESS"
            except Exception:
                # If check fails, assume not available
                available = False

            return DomainAvailability(
                domain=domain,
                available=available,
                price=base_price,
                premium=False,  # Porkbun doesn't have premium domains in the same way
                purchasable=available,
                error=None
            )

        except Exception as e:
            logger.error(f"Failed to check availability for {domain}: {e}")
            return DomainAvailability(
                domain=domain,
                available=False,
                price=0.0,
                premium=False,
                purchasable=False,
                error=str(e)
            )

    def register_domain(
        self,
        domain: str,
        years: int = 1,
        auto_renew: bool = True,
        privacy: bool = True
    ) -> DomainRegistration:
        """
        Register a domain name

        Args:
            domain: Domain name to register
            years: Registration period (1-10 years)
            auto_renew: Enable auto-renewal (handled in account settings)
            privacy: Enable WHOIS privacy protection (free with Porkbun)

        Returns:
            DomainRegistration object
        """
        try:
            # Check availability first
            availability = self.check_availability(domain)
            if not availability.purchasable:
                return DomainRegistration(
                    domain=domain,
                    success=False,
                    error=f"Domain not available: {availability.error or 'already registered'}"
                )

            # Register domain via Porkbun
            # Note: Porkbun registration endpoint
            payload = {
                "domain": domain,
                "years": years
            }

            response = self._request("/domain/create", data=payload)

            return DomainRegistration(
                domain=domain,
                success=response.get("status") == "SUCCESS",
                order_id=response.get("domain"),
                total_cost=availability.price * years,
                expires_at=None,  # Porkbun doesn't return this directly
                error=None
            )

        except Exception as e:
            logger.error(f"Failed to register {domain}: {e}")
            return DomainRegistration(
                domain=domain,
                success=False,
                error=str(e)
            )

    def get_dns_records(self, domain: str) -> List[Dict[str, Any]]:
        """
        Get all DNS records for a domain

        Args:
            domain: Domain name

        Returns:
            List of DNS record dicts
        """
        try:
            response = self._request(f"/dns/retrieve/{domain}")
            return response.get("records", [])
        except Exception as e:
            logger.error(f"Failed to get DNS records for {domain}: {e}")
            return []

    def create_dns_record(
        self,
        domain: str,
        record_type: str,
        content: str,
        name: str = "",
        ttl: int = 300
    ) -> bool:
        """
        Create a DNS record

        Args:
            domain: Domain name
            record_type: Record type (A, AAAA, CNAME, MX, TXT, etc.)
            content: Record content/answer
            name: Subdomain (empty for apex domain)
            ttl: Time to live

        Returns:
            True if successful
        """
        try:
            payload = {
                "type": record_type,
                "content": content,
                "ttl": str(ttl)
            }
            if name:
                payload["name"] = name

            self._request(f"/dns/create/{domain}", data=payload)
            logger.info(f"Created DNS record: {record_type} {name}.{domain} -> {content}")
            return True

        except Exception as e:
            logger.error(f"Failed to create DNS record: {e}")
            return False

    def delete_dns_record(self, domain: str, record_id: str) -> bool:
        """
        Delete a DNS record by ID

        Args:
            domain: Domain name
            record_id: Record ID to delete

        Returns:
            True if successful
        """
        try:
            self._request(f"/dns/delete/{domain}/{record_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete DNS record {record_id}: {e}")
            return False

    def set_dns_records(self, domain: str, records: List[DNSRecord]) -> bool:
        """
        Set DNS records for a domain (clears existing first)

        Args:
            domain: Domain name
            records: List of DNSRecord objects

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing records
            existing = self.get_dns_records(domain)

            # Delete existing A, AAAA, and CNAME records (keep MX, TXT for email)
            for record in existing:
                if record.get("type") in ["A", "AAAA", "CNAME"]:
                    record_id = record.get("id")
                    if record_id:
                        self.delete_dns_record(domain, record_id)

            # Add new records
            success = True
            for record in records:
                if not self.create_dns_record(
                    domain=domain,
                    record_type=record.record_type,
                    content=record.answer,
                    name=record.host if record.host != "@" else "",
                    ttl=record.ttl
                ):
                    success = False

            logger.info(f"DNS records updated for {domain}: {len(records)} records set")
            return success

        except Exception as e:
            logger.error(f"Failed to set DNS records for {domain}: {e}")
            return False

    def configure_github_pages(
        self,
        domain: str,
        github_username: Optional[str] = None
    ) -> bool:
        """
        Configure DNS records for GitHub Pages

        GitHub Pages requires:
        - 4 A records pointing to GitHub IPs
        - CNAME record for www subdomain

        Args:
            domain: Domain name (e.g., "example.com")
            github_username: GitHub username for CNAME (optional)

        Returns:
            True if successful, False otherwise
        """
        # GitHub Pages IP addresses (as of 2025)
        github_ips = [
            "185.199.108.153",
            "185.199.109.153",
            "185.199.110.153",
            "185.199.111.153"
        ]

        records = []

        # Add A records for apex domain
        for ip in github_ips:
            records.append(DNSRecord(
                domain=domain,
                host="",  # Apex domain (empty for Porkbun)
                record_type="A",
                answer=ip,
                ttl=300
            ))

        # Add CNAME for www subdomain
        # Points to the apex domain for GitHub Pages
        records.append(DNSRecord(
            domain=domain,
            host="www",
            record_type="CNAME",
            answer=domain,
            ttl=300
        ))

        return self.set_dns_records(domain, records)

    def get_domain_info(self, domain: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a registered domain

        Args:
            domain: Domain name

        Returns:
            Domain info dict or None if not found
        """
        try:
            response = self._request(f"/domain/getNS/{domain}")
            if response.get("status") == "SUCCESS":
                return {
                    "domain": domain,
                    "nameservers": response.get("ns", []),
                    "status": "active"
                }
            return None
        except Exception as e:
            logger.error(f"Failed to get domain info for {domain}: {e}")
            return None

    def list_domains(self) -> List[Dict[str, Any]]:
        """
        List all domains in the account

        Returns:
            List of domain info dicts
        """
        try:
            response = self._request("/domain/listAll")
            return response.get("domains", [])
        except Exception as e:
            logger.error(f"Failed to list domains: {e}")
            return []


def get_porkbun_client() -> PorkbunClient:
    """
    Factory function to get PorkbunClient instance

    Returns:
        PorkbunClient instance
    """
    return PorkbunClient()


# Alias for backward compatibility with Name.com integration
def get_domain_client() -> PorkbunClient:
    """
    Get the default domain client (now Porkbun)

    Returns:
        PorkbunClient instance
    """
    return PorkbunClient()


if __name__ == "__main__":
    # Test the client
    logging.basicConfig(level=logging.INFO)

    try:
        client = get_porkbun_client()

        # Test ping
        print("\nTesting Porkbun API connection...")
        if client.ping():
            print("✓ API connection successful")
        else:
            print("✗ API connection failed")
            exit(1)

        # Test domain availability
        test_domain = "genesis-ai-test-12345.com"
        print(f"\nChecking availability: {test_domain}")
        result = client.check_availability(test_domain)
        print(f"Available: {result.available}, Price: ${result.price}, Purchasable: {result.purchasable}")

        # List domains
        print("\nListing domains:")
        domains = client.list_domains()
        print(f"Found {len(domains)} domains in account")
        for d in domains[:5]:  # Show first 5
            print(f"  - {d.get('domain', d)}")

    except ValueError as e:
        print(f"Configuration error: {e}")
        print("\nTo configure Porkbun, add to your .env file:")
        print("PORKBUN_API_KEY=pk1_...")
        print("PORKBUN_SECRET_KEY=sk1_...")
