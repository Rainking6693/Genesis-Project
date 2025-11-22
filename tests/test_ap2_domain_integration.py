"""
Test AP2 (Agent Payments Protocol) Integration with Domain Name Agent
Author: Ben (Full-Stack Integration Specialist)
Date: November 14, 2025

Tests comprehensive AP2 payment consent flow for domain registration:
- Intent mandate creation
- Cart mandate creation and approval
- Payment consent verification
- Audit trail logging
- Domain-specific payment flows (registration, renewal, privacy)
"""

import pytest
import asyncio
import os
from datetime import datetime, timezone, timedelta
from decimal import Decimal

# Test imports
from agents.domain_name_agent import (
    DomainNameAgent,
    DomainCandidate,
    DomainRegistrationResult,
    get_domain_agent
)
from infrastructure.ap2_connector import (
    AP2Connector,
    AP2IntentMandate,
    AP2CartMandate,
    CartItem,
    PaymentMethod,
    PaymentMethodDetails,
    ConsentStatus,
    MandateType
)
from infrastructure.namecom_client import (
    NameComClient,
    DomainAvailability,
    DomainRegistration
)


# ==============================================================================
# FIXTURES
# ==============================================================================

@pytest.fixture
def ap2_connector():
    """Create AP2 connector for testing"""
    return AP2Connector()


@pytest.fixture
def mock_namecom_client(monkeypatch):
    """Mock Name.com client for testing without real API calls"""
    class MockNameComClient:
        def check_availability(self, domain: str) -> DomainAvailability:
            return DomainAvailability(
                domain=domain,
                available=True,
                price=12.99,
                premium=False,
                purchasable=True,
                error=None
            )

        def register_domain(
            self,
            domain: str,
            years: int = 1,
            auto_renew: bool = True,
            privacy: bool = True
        ) -> DomainRegistration:
            return DomainRegistration(
                domain=domain,
                success=True,
                order_id=f"order_{domain.split('.')[0]}",
                total_cost=12.99,
                expires_at=(datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                error=None
            )

        def configure_github_pages(self, domain: str) -> bool:
            return True

    return MockNameComClient()


@pytest.fixture
def domain_agent(ap2_connector, mock_namecom_client):
    """Create domain agent with AP2 connector and mock client"""
    # Enable auto-approval for testing
    os.environ["AP2_AUTO_APPROVE_DOMAINS"] = "true"

    agent = DomainNameAgent(
        namecom_client=mock_namecom_client,
        cost_alert_threshold=100.0,
        ap2_connector=ap2_connector,
        enable_ap2_consent=True
    )
    return agent


# ==============================================================================
# TEST: AP2 INTENT MANDATE CREATION
# ==============================================================================

@pytest.mark.asyncio
async def test_create_intent_mandate(domain_agent):
    """Test creating AP2 intent mandate for domain purchases"""
    # Create intent mandate
    mandate = await domain_agent.create_payment_intent_mandate(
        user_id="test_user_123",
        business_name="TaskFlow Pro",
        business_type="saas",
        max_domains=10,
        max_price_per_domain=50.0,
        valid_for_hours=168  # 7 days
    )

    # Verify mandate properties
    assert mandate.mandate_id.startswith("intent_")
    assert mandate.user_id == "test_user_123"
    assert mandate.agent_id == "domain_name_agent"
    assert mandate.constraints.max_price_cents == 5000  # $50.00
    assert mandate.constraints.currency == "USD"
    assert "TaskFlow Pro" in mandate.task_description
    assert "saas" in mandate.task_description

    # Verify mandate is valid
    assert not mandate.is_expired()
    assert mandate.signature is not None

    # Verify mandate is stored in agent
    assert domain_agent.current_intent_mandate == mandate


# ==============================================================================
# TEST: AP2 CART MANDATE CREATION
# ==============================================================================

@pytest.mark.asyncio
async def test_create_cart_mandate(ap2_connector):
    """Test creating AP2 cart mandate for domain registration"""
    # First create intent mandate
    intent = await ap2_connector.create_intent_mandate(
        user_id="test_user_123",
        agent_id="domain_name_agent",
        task_description="Purchase domain for test business",
        max_price_cents=5000,
        currency="USD",
        valid_for_hours=24
    )

    # Create cart item
    cart_item = CartItem(
        item_id="domain_testdomain",
        name="testdomain.com - 1 year registration + privacy",
        quantity=1,
        unit_price_cents=1299,  # $12.99
        currency="USD"
    )

    # Create cart mandate
    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=[cart_item],
        user_id="test_user_123"
    )

    # Verify cart properties
    assert cart.mandate_id.startswith("cart_")
    assert cart.intent_mandate_id == intent.mandate_id
    assert cart.user_id == "test_user_123"
    assert len(cart.items) == 1
    assert cart.total_cents == 1299
    assert cart.currency == "USD"
    assert not cart.is_approved()

    # Approve cart
    approved_cart = await ap2_connector.approve_cart_mandate(cart.mandate_id, "test_user_123")
    assert approved_cart.is_approved()
    assert approved_cart.approved_at is not None


# ==============================================================================
# TEST: DOMAIN REGISTRATION WITH AP2 CONSENT (AUTO-APPROVAL)
# ==============================================================================

@pytest.mark.asyncio
async def test_domain_registration_with_ap2_auto_approval(domain_agent):
    """Test complete domain registration flow with AP2 auto-approval"""
    # Create intent mandate first
    mandate = await domain_agent.create_payment_intent_mandate(
        user_id="test_user_456",
        business_name="AI Startup",
        business_type="ai",
        max_price_per_domain=50.0
    )

    # Register domain with AP2 consent
    result = await domain_agent.select_and_register_domain(
        business_name="AI Startup",
        business_type="ai",
        user_id="test_user_456",
        auto_register=True,
        configure_dns=True,
        max_cost=50.0
    )

    # Verify registration result
    assert result.registration_success is True
    assert result.selected_domain is not None
    assert result.total_cost > 0
    assert result.dns_configured is True
    assert result.github_pages_ready is True

    # Verify AP2 mandate tracking
    assert result.ap2_intent_mandate_id == mandate.mandate_id
    assert result.ap2_cart_mandate_id is not None
    assert result.payment_consent_status == "approved"

    # Verify audit trail
    audit_events = domain_agent.ap2_connector.get_audit_trail(result.ap2_cart_mandate_id)
    assert len(audit_events) >= 2  # cart_created + domain_registered


# ==============================================================================
# TEST: DOMAIN REGISTRATION WITHOUT AP2 CONSENT (DISABLED)
# ==============================================================================

@pytest.mark.asyncio
async def test_domain_registration_without_ap2(mock_namecom_client):
    """Test domain registration with AP2 consent disabled"""
    # Create agent with AP2 disabled
    agent = DomainNameAgent(
        namecom_client=mock_namecom_client,
        enable_ap2_consent=False
    )

    result = await agent.select_and_register_domain(
        business_name="Simple Business",
        business_type="ecommerce",
        user_id="test_user_789",
        auto_register=True,
        max_cost=50.0
    )

    # Verify registration without AP2
    assert result.registration_success is True
    assert result.payment_consent_status == "not_required"
    assert result.ap2_intent_mandate_id is None
    assert result.ap2_cart_mandate_id is None


# ==============================================================================
# TEST: PAYMENT CONSENT PENDING (MANUAL APPROVAL REQUIRED)
# ==============================================================================

@pytest.mark.asyncio
async def test_payment_consent_pending_manual_approval(mock_namecom_client, ap2_connector):
    """Test domain registration with manual approval required"""
    # Disable auto-approval
    os.environ["AP2_AUTO_APPROVE_DOMAINS"] = "false"

    agent = DomainNameAgent(
        namecom_client=mock_namecom_client,
        ap2_connector=ap2_connector,
        enable_ap2_consent=True
    )

    # Create intent mandate
    await agent.create_payment_intent_mandate(
        user_id="test_user_999",
        business_name="Pending Business",
        business_type="saas"
    )

    # Try to register domain (should require manual approval)
    result = await agent.select_and_register_domain(
        business_name="Pending Business",
        business_type="saas",
        user_id="test_user_999",
        auto_register=True,
        max_cost=50.0
    )

    # Verify registration is pending approval
    assert result.registration_success is False
    assert result.payment_consent_status == "pending_approval"
    assert result.ap2_cart_mandate_id is not None
    assert "awaiting user approval" in result.error.lower()

    # Re-enable auto-approval for other tests
    os.environ["AP2_AUTO_APPROVE_DOMAINS"] = "true"


# ==============================================================================
# TEST: COST THRESHOLD ENFORCEMENT VIA AP2
# ==============================================================================

@pytest.mark.asyncio
async def test_cost_threshold_exceeded(domain_agent):
    """Test that cost threshold prevents registration via AP2"""
    # Set monthly cost near threshold
    domain_agent.total_monthly_cost = 95.0

    # Create intent mandate
    await domain_agent.create_payment_intent_mandate(
        user_id="test_user_threshold",
        business_name="Expensive Business",
        business_type="fintech"
    )

    # Try to register domain that would exceed threshold
    result = await domain_agent.select_and_register_domain(
        business_name="Expensive Business",
        business_type="fintech",
        user_id="test_user_threshold",
        auto_register=True,
        max_cost=50.0
    )

    # Verify registration was blocked
    assert result.registration_success is False
    assert result.payment_consent_status == "threshold_exceeded"
    assert "COST ALERT" in result.error
    assert "exceeding threshold" in result.error


# ==============================================================================
# TEST: INTENT MANDATE EXPIRATION
# ==============================================================================

@pytest.mark.asyncio
async def test_intent_mandate_expiration(ap2_connector):
    """Test that expired intent mandate is rejected"""
    # Create intent mandate with short TTL
    intent = await ap2_connector.create_intent_mandate(
        user_id="test_user_expire",
        agent_id="domain_name_agent",
        task_description="Short-lived mandate test",
        max_price_cents=5000,
        currency="USD",
        valid_for_hours=0.0001  # Expires almost immediately
    )

    # Wait for expiration
    await asyncio.sleep(0.5)

    # Verify mandate is expired
    assert intent.is_expired()

    # Verify verification fails
    assert not ap2_connector.verify_intent_mandate(intent)


# ==============================================================================
# TEST: AP2 AUDIT TRAIL INTEGRITY
# ==============================================================================

@pytest.mark.asyncio
async def test_audit_trail_integrity(domain_agent):
    """Test AP2 audit trail cryptographic integrity"""
    # Create intent and register domain
    await domain_agent.create_payment_intent_mandate(
        user_id="test_user_audit",
        business_name="Audit Test Business",
        business_type="analytics"
    )

    result = await domain_agent.select_and_register_domain(
        business_name="Audit Test Business",
        business_type="analytics",
        user_id="test_user_audit",
        auto_register=True,
        max_cost=50.0
    )

    # Verify audit trail exists
    cart_mandate_id = result.ap2_cart_mandate_id
    assert cart_mandate_id is not None

    audit_events = domain_agent.ap2_connector.get_audit_trail(cart_mandate_id)
    assert len(audit_events) > 0

    # Verify audit chain integrity
    is_valid = domain_agent.ap2_connector.verify_audit_chain(cart_mandate_id)
    assert is_valid is True

    # Verify each event has valid signature
    for event in audit_events:
        assert event.signature is not None
        assert len(event.signature) == 64  # HMAC-SHA256 hex digest length


# ==============================================================================
# TEST: DOMAIN RENEWAL PAYMENT CONSENT
# ==============================================================================

@pytest.mark.asyncio
async def test_domain_renewal_consent(ap2_connector):
    """Test AP2 consent for domain renewal payments"""
    # Create intent mandate for renewals
    intent = await ap2_connector.create_intent_mandate(
        user_id="test_user_renewal",
        agent_id="domain_name_agent",
        task_description="Auto-renew domains for 3 years",
        max_price_cents=15000,  # $150 for 3-year renewal
        currency="USD",
        valid_for_hours=720,  # 30 days
        allowed_categories=["domains", "renewals"],
        require_approval=False  # Auto-renew without approval
    )

    # Create cart for 3-year renewal
    renewal_item = CartItem(
        item_id="renewal_existingdomain",
        name="existingdomain.com - 3 year renewal + privacy",
        quantity=1,
        unit_price_cents=14999,  # $149.99
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=[renewal_item],
        user_id="test_user_renewal"
    )

    # Verify renewal cart
    assert cart.total_cents == 14999
    assert len(cart.items) == 1
    assert "renewal" in cart.items[0].name.lower()


# ==============================================================================
# TEST: MULTIPLE DOMAINS WITHIN MANDATE
# ==============================================================================

@pytest.mark.asyncio
async def test_multiple_domains_single_mandate(domain_agent):
    """Test purchasing multiple domains under single intent mandate"""
    # Create intent for multiple domains
    mandate = await domain_agent.create_payment_intent_mandate(
        user_id="test_user_multi",
        business_name="Multi-Domain Business",
        business_type="marketplace",
        max_domains=5,
        max_price_per_domain=50.0
    )

    # Register first domain
    result1 = await domain_agent.select_and_register_domain(
        business_name="Multi-Domain Business Site 1",
        business_type="marketplace",
        user_id="test_user_multi",
        auto_register=True,
        max_cost=50.0
    )

    # Register second domain (reuse same mandate)
    result2 = await domain_agent.select_and_register_domain(
        business_name="Multi-Domain Business Site 2",
        business_type="marketplace",
        user_id="test_user_multi",
        auto_register=True,
        max_cost=50.0
    )

    # Verify both registrations used same intent mandate
    assert result1.ap2_intent_mandate_id == mandate.mandate_id
    assert result2.ap2_intent_mandate_id == mandate.mandate_id

    # Verify different cart mandates
    assert result1.ap2_cart_mandate_id != result2.ap2_cart_mandate_id


# ==============================================================================
# TEST: INVALID USER ID MISMATCH
# ==============================================================================

@pytest.mark.asyncio
async def test_user_id_mismatch_rejected(ap2_connector):
    """Test that cart approval with mismatched user ID is rejected"""
    # Create intent for user A
    intent = await ap2_connector.create_intent_mandate(
        user_id="user_a",
        agent_id="domain_name_agent",
        task_description="User A's domains",
        max_price_cents=5000,
        currency="USD"
    )

    # Create cart for user A
    cart_item = CartItem(
        item_id="domain_test",
        name="test.com",
        quantity=1,
        unit_price_cents=1299,
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=[cart_item],
        user_id="user_a"
    )

    # Try to approve cart as user B (should fail)
    with pytest.raises(ValueError, match="User ID mismatch"):
        await ap2_connector.approve_cart_mandate(cart.mandate_id, "user_b")


# ==============================================================================
# TEST: AP2 PAYMENT METHOD DETAILS
# ==============================================================================

def test_payment_method_details_validation():
    """Test payment method details validation"""
    # Valid card payment method
    card_method = PaymentMethodDetails(
        method_type=PaymentMethod.CARD,
        provider="stripe",
        last_four="4242",
        expiry="12/25"
    )

    assert card_method.method_type == PaymentMethod.CARD
    assert card_method.provider == "stripe"
    assert card_method.last_four == "4242"
    assert card_method.expiry == "12/25"

    # Valid crypto payment method
    crypto_method = PaymentMethodDetails(
        method_type=PaymentMethod.CRYPTO,
        provider="coinbase",
        wallet_address="0x1234567890abcdef"
    )

    assert crypto_method.method_type == PaymentMethod.CRYPTO
    assert crypto_method.wallet_address == "0x1234567890abcdef"


# ==============================================================================
# INTEGRATION TEST: END-TO-END DOMAIN REGISTRATION FLOW
# ==============================================================================

@pytest.mark.asyncio
async def test_complete_domain_registration_flow():
    """
    End-to-end integration test for complete domain registration with AP2

    Flow:
    1. Create intent mandate (user authorizes agent)
    2. Agent finds available domain
    3. Create cart mandate with domain details
    4. Request user approval (auto-approved in test)
    5. Register domain with Name.com
    6. Configure DNS for GitHub Pages
    7. Log audit trail
    """
    # Setup
    from infrastructure.namecom_client import NameComClient

    class MockClient:
        def check_availability(self, domain):
            return DomainAvailability(
                domain=domain, available=True, price=12.99,
                premium=False, purchasable=True, error=None
            )

        def register_domain(self, domain, years=1, auto_renew=True, privacy=True):
            return DomainRegistration(
                domain=domain, success=True, order_id=f"order_{domain[:10]}",
                total_cost=12.99,
                expires_at=(datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                error=None
            )

        def configure_github_pages(self, domain):
            return True

    # Enable auto-approval
    os.environ["AP2_AUTO_APPROVE_DOMAINS"] = "true"

    # Create agent
    ap2_conn = AP2Connector()
    agent = DomainNameAgent(
        namecom_client=MockClient(),
        ap2_connector=ap2_conn,
        enable_ap2_consent=True
    )

    # Step 1: Create intent mandate
    intent = await agent.create_payment_intent_mandate(
        user_id="integration_test_user",
        business_name="Integration Test Business",
        business_type="saas",
        max_price_per_domain=50.0
    )

    assert intent.mandate_id is not None
    print(f"✅ Intent mandate created: {intent.mandate_id}")

    # Step 2-7: Complete domain registration
    result = await agent.select_and_register_domain(
        business_name="Integration Test Business",
        business_type="saas",
        user_id="integration_test_user",
        auto_register=True,
        configure_dns=True,
        max_cost=50.0
    )

    # Verify complete flow
    assert result.registration_success is True
    assert result.selected_domain is not None
    assert result.dns_configured is True
    assert result.ap2_intent_mandate_id == intent.mandate_id
    assert result.ap2_cart_mandate_id is not None
    assert result.payment_consent_status == "approved"

    print(f"✅ Domain registered: {result.selected_domain}")
    print(f"✅ Intent mandate: {result.ap2_intent_mandate_id}")
    print(f"✅ Cart mandate: {result.ap2_cart_mandate_id}")
    print(f"✅ Payment consent: {result.payment_consent_status}")

    # Verify audit trail
    audit_events = ap2_conn.get_audit_trail(result.ap2_cart_mandate_id)
    assert len(audit_events) >= 2

    print(f"✅ Audit events logged: {len(audit_events)}")
    for event in audit_events:
        print(f"   - {event.event_type} at {event.timestamp}")

    print("\n✅ END-TO-END INTEGRATION TEST PASSED!")


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
