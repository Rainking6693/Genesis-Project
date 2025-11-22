"""
AP2 Connector Test Suite
========================

Comprehensive tests for Agent Payments Protocol (AP2) integration.

Test Coverage:
- Intent Mandate creation and validation
- Cart Mandate creation and approval
- Payment Mandate creation and execution
- Cryptographic signature verification
- Audit trail creation and verification
- Multi-method payment support (cards, crypto, bank transfers)
- Error handling and edge cases
- Integration with Stripe (mocked)

Author: Shane (Senior Backend Engineer)
Date: 2025-11-14
"""

import asyncio
import json
import os
import pytest
import secrets
from datetime import datetime, timezone, timedelta
from typing import List
from unittest.mock import AsyncMock, MagicMock, patch

# Import AP2 components
from infrastructure.ap2_connector import (
    AP2Connector,
    AP2IntentMandate,
    AP2CartMandate,
    AP2PaymentMandate,
    AP2AuditLogger,
    CartItem,
    PaymentMethodDetails,
    PaymentMethod,
    PaymentStatus,
    IntentConstraints,
    get_ap2_connector
)


@pytest.fixture
def test_secret_key():
    """Generate test secret key for signing"""
    return secrets.token_urlsafe(32)


@pytest.fixture
def test_user_id():
    """Test user identifier"""
    return "user_test_123"


@pytest.fixture
def test_agent_id():
    """Test agent identifier"""
    return "billing_agent_test"


@pytest.fixture
def ap2_connector():
    """Create AP2 connector for testing"""
    # Set test environment variables
    os.environ["AP2_SIGNING_SECRET"] = secrets.token_urlsafe(32)
    os.environ["STRIPE_SECRET_KEY"] = "sk_test_mock_key"

    connector = AP2Connector(enable_crypto=False)
    yield connector

    # Cleanup
    if hasattr(connector, 'audit_logger') and connector.audit_logger:
        # Clean up test audit log
        if os.path.exists(connector.audit_logger.storage_path):
            try:
                os.remove(connector.audit_logger.storage_path)
            except:
                pass


@pytest.fixture
def sample_cart_items():
    """Sample cart items for testing"""
    return [
        CartItem(
            item_id="item_001",
            name="Concert Ticket - VIP",
            quantity=2,
            unit_price_cents=7500,  # $75
            currency="USD"
        ),
        CartItem(
            item_id="item_002",
            name="Parking Pass",
            quantity=1,
            unit_price_cents=2000,  # $20
            currency="USD"
        )
    ]


# ========================================================================
# INTENT MANDATE TESTS
# ========================================================================


@pytest.mark.asyncio
async def test_create_intent_mandate(ap2_connector, test_user_id, test_agent_id):
    """Test creating Intent Mandate"""
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets when they go on sale",
        max_price_cents=20000,  # $200
        currency="USD",
        valid_for_hours=24
    )

    assert intent is not None
    assert intent.user_id == test_user_id
    assert intent.agent_id == test_agent_id
    assert intent.constraints.max_price_cents == 20000
    assert intent.constraints.currency == "USD"
    assert intent.signature is not None
    assert intent.mandate_id.startswith("intent_")

    # Verify signature
    assert ap2_connector.verify_intent_mandate(intent)


@pytest.mark.asyncio
async def test_intent_mandate_signature_verification(ap2_connector, test_user_id, test_agent_id):
    """Test Intent Mandate signature verification"""
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Test task",
        max_price_cents=10000,
        currency="USD"
    )

    # Valid signature
    assert ap2_connector.verify_intent_mandate(intent)

    # Tamper with mandate
    intent.constraints.max_price_cents = 50000
    assert not ap2_connector.verify_intent_mandate(intent)


@pytest.mark.asyncio
async def test_intent_mandate_expiration(ap2_connector, test_user_id, test_agent_id):
    """Test Intent Mandate expiration check"""
    # Create mandate that expires in 1 hour
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Test task",
        max_price_cents=10000,
        currency="USD",
        valid_for_hours=1
    )

    # Should not be expired
    assert not intent.is_expired()

    # Verify validity
    assert ap2_connector.verify_intent_mandate(intent)


@pytest.mark.asyncio
async def test_intent_mandate_price_validation(ap2_connector, test_user_id, test_agent_id):
    """Test Intent Mandate price constraint validation"""
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Test task",
        max_price_cents=10000,  # $100 limit
        currency="USD"
    )

    # Within limit
    assert intent.validate_price(5000)  # $50
    assert intent.validate_price(10000)  # $100

    # Exceeds limit
    assert not intent.validate_price(15000)  # $150


@pytest.mark.asyncio
async def test_intent_mandate_invalid_expiration():
    """Test Intent Mandate with invalid expiration"""
    with pytest.raises(ValueError, match="Mandate expiration is in the past"):
        IntentConstraints(
            max_price_cents=10000,
            currency="USD",
            valid_until=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        )


@pytest.mark.asyncio
async def test_intent_mandate_max_validity():
    """Test Intent Mandate maximum validity period"""
    with pytest.raises(ValueError, match="exceeds 30 days maximum"):
        IntentConstraints(
            max_price_cents=10000,
            currency="USD",
            valid_until=(datetime.now(timezone.utc) + timedelta(days=31)).isoformat()
        )


# ========================================================================
# CART MANDATE TESTS
# ========================================================================


@pytest.mark.asyncio
async def test_create_cart_mandate(ap2_connector, test_user_id, test_agent_id, sample_cart_items):
    """Test creating Cart Mandate"""
    # Create intent first
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=20000,
        currency="USD"
    )

    # Create cart
    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )

    assert cart is not None
    assert cart.intent_mandate_id == intent.mandate_id
    assert cart.user_id == test_user_id
    assert len(cart.items) == 2
    assert cart.total_cents == 17000  # $75*2 + $20 = $170
    assert cart.signature is not None
    assert cart.mandate_id.startswith("cart_")


@pytest.mark.asyncio
async def test_cart_mandate_price_exceeds_intent(ap2_connector, test_user_id, test_agent_id):
    """Test Cart Mandate with price exceeding Intent limit"""
    # Create intent with low limit
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=10000,  # $100 limit
        currency="USD"
    )

    # Try to create cart exceeding limit
    expensive_items = [
        CartItem(
            item_id="item_001",
            name="Expensive Item",
            quantity=1,
            unit_price_cents=15000,  # $150
            currency="USD"
        )
    ]

    with pytest.raises(ValueError, match="exceeds intent limit"):
        await ap2_connector.create_cart_mandate(
            intent_mandate_id=intent.mandate_id,
            items=expensive_items,
            user_id=test_user_id
        )


@pytest.mark.asyncio
async def test_cart_mandate_approval(ap2_connector, test_user_id, test_agent_id, sample_cart_items):
    """Test Cart Mandate approval flow"""
    # Create intent and cart
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=20000,
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )

    # Cart should not be approved initially
    assert not cart.is_approved()

    # Approve cart
    approved_cart = await ap2_connector.approve_cart_mandate(
        cart_mandate_id=cart.mandate_id,
        user_id=test_user_id
    )

    assert approved_cart.is_approved()
    assert approved_cart.approved_at is not None


@pytest.mark.asyncio
async def test_cart_mandate_approval_user_mismatch(ap2_connector, test_user_id, test_agent_id, sample_cart_items):
    """Test Cart Mandate approval with wrong user"""
    # Create intent and cart
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=20000,
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )

    # Try to approve with different user
    with pytest.raises(ValueError, match="User ID mismatch"):
        await ap2_connector.approve_cart_mandate(
            cart_mandate_id=cart.mandate_id,
            user_id="wrong_user_123"
        )


@pytest.mark.asyncio
async def test_cart_total_validation():
    """Test Cart Mandate total validation"""
    items = [
        CartItem(item_id="1", name="A", quantity=2, unit_price_cents=1000, currency="USD"),
        CartItem(item_id="2", name="B", quantity=1, unit_price_cents=500, currency="USD")
    ]

    # Correct total
    cart = AP2CartMandate(
        mandate_id="cart_test",
        intent_mandate_id="intent_test",
        user_id="user_test",
        items=items,
        total_cents=2500,  # 2*1000 + 500
        currency="USD"
    )
    assert cart.total_cents == 2500

    # Incorrect total
    with pytest.raises(ValueError, match="Cart total mismatch"):
        AP2CartMandate(
            mandate_id="cart_test",
            intent_mandate_id="intent_test",
            user_id="user_test",
            items=items,
            total_cents=3000,  # Wrong!
            currency="USD"
        )


# ========================================================================
# PAYMENT EXECUTION TESTS
# ========================================================================


@pytest.mark.asyncio
@patch('stripe.PaymentIntent.create')
async def test_execute_payment_card(
    mock_stripe_create,
    ap2_connector,
    test_user_id,
    test_agent_id,
    sample_cart_items
):
    """Test payment execution via card (Stripe)"""
    # Mock Stripe response
    mock_stripe_create.return_value = MagicMock(
        id="pi_test_123",
        amount=17000,
        currency="usd",
        client_secret="pi_test_123_secret_abc"
    )

    # Create and approve cart
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=20000,
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )

    await ap2_connector.approve_cart_mandate(
        cart_mandate_id=cart.mandate_id,
        user_id=test_user_id
    )

    # Execute payment
    payment_method = PaymentMethodDetails(
        method_type=PaymentMethod.CARD,
        provider="stripe",
        last_four="4242"
    )

    result = await ap2_connector.execute_payment(
        cart_mandate_id=cart.mandate_id,
        payment_method=payment_method,
        user_id=test_user_id
    )

    assert result["status"] == PaymentStatus.SUCCEEDED.value
    assert result["transaction_id"] == "pi_test_123"
    assert result["amount_cents"] == 17000
    assert result["provider"] == "stripe"
    assert "client_secret" in result


@pytest.mark.asyncio
async def test_execute_payment_unapproved_cart(
    ap2_connector,
    test_user_id,
    test_agent_id,
    sample_cart_items
):
    """Test payment execution with unapproved cart"""
    # Create cart without approval
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=20000,
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )

    # Try to execute payment without approval
    payment_method = PaymentMethodDetails(
        method_type=PaymentMethod.CARD,
        provider="stripe"
    )

    with pytest.raises(ValueError, match="Cart not approved"):
        await ap2_connector.execute_payment(
            cart_mandate_id=cart.mandate_id,
            payment_method=payment_method,
            user_id=test_user_id
        )


@pytest.mark.asyncio
async def test_execute_payment_crypto(ap2_connector, test_user_id, test_agent_id, sample_cart_items):
    """Test cryptocurrency payment execution (placeholder)"""
    # Enable crypto for this test
    ap2_connector.enable_crypto = True

    # Create and approve cart
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=20000,
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )

    await ap2_connector.approve_cart_mandate(
        cart_mandate_id=cart.mandate_id,
        user_id=test_user_id
    )

    # Execute crypto payment
    payment_method = PaymentMethodDetails(
        method_type=PaymentMethod.CRYPTO,
        provider="coinbase",
        wallet_address="0x123abc..."
    )

    result = await ap2_connector.execute_payment(
        cart_mandate_id=cart.mandate_id,
        payment_method=payment_method,
        user_id=test_user_id
    )

    assert result["status"] == PaymentStatus.PENDING.value
    assert result["provider"] == "crypto_placeholder"
    assert "note" in result


# ========================================================================
# AUDIT TRAIL TESTS
# ========================================================================


@pytest.mark.asyncio
async def test_audit_trail_creation(ap2_connector, test_user_id, test_agent_id):
    """Test audit trail event creation"""
    # Create intent mandate (triggers audit event)
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Test task",
        max_price_cents=10000,
        currency="USD"
    )

    # Retrieve audit trail
    events = ap2_connector.get_audit_trail(intent.mandate_id)

    assert len(events) >= 1
    assert events[0].event_type == "intent_created"
    assert events[0].mandate_id == intent.mandate_id
    assert events[0].user_id == test_user_id
    assert events[0].agent_id == test_agent_id
    assert events[0].signature is not None


@pytest.mark.asyncio
async def test_audit_chain_verification(ap2_connector, test_user_id, test_agent_id, sample_cart_items):
    """Test audit chain signature verification"""
    # Create full payment flow (generates multiple audit events)
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=20000,
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )

    await ap2_connector.approve_cart_mandate(
        cart_mandate_id=cart.mandate_id,
        user_id=test_user_id
    )

    # Verify audit chains
    assert ap2_connector.verify_audit_chain(intent.mandate_id)
    assert ap2_connector.verify_audit_chain(cart.mandate_id)


@pytest.mark.asyncio
async def test_audit_event_types(ap2_connector, test_user_id, test_agent_id, sample_cart_items):
    """Test different audit event types"""
    # Create full flow
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets",
        max_price_cents=20000,
        currency="USD"
    )

    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )

    await ap2_connector.approve_cart_mandate(
        cart_mandate_id=cart.mandate_id,
        user_id=test_user_id
    )

    # Check event types
    intent_events = ap2_connector.get_audit_trail(intent.mandate_id)
    cart_events = ap2_connector.get_audit_trail(cart.mandate_id)

    event_types = [e.event_type for e in intent_events + cart_events]
    assert "intent_created" in event_types
    assert "cart_created" in event_types
    assert "cart_approved" in event_types


# ========================================================================
# INTEGRATION TESTS
# ========================================================================


@pytest.mark.asyncio
async def test_full_payment_flow(ap2_connector, test_user_id, test_agent_id, sample_cart_items):
    """Test complete payment flow: Intent -> Cart -> Approval -> Payment"""
    # 1. Create Intent Mandate
    intent = await ap2_connector.create_intent_mandate(
        user_id=test_user_id,
        agent_id=test_agent_id,
        task_description="Buy concert tickets when they go on sale",
        max_price_cents=20000,
        currency="USD"
    )
    assert intent.signature is not None

    # 2. Create Cart Mandate
    cart = await ap2_connector.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=sample_cart_items,
        user_id=test_user_id
    )
    assert cart.total_cents == 17000
    assert not cart.is_approved()

    # 3. Approve Cart
    approved_cart = await ap2_connector.approve_cart_mandate(
        cart_mandate_id=cart.mandate_id,
        user_id=test_user_id
    )
    assert approved_cart.is_approved()

    # 4. Verify Audit Trail
    assert ap2_connector.verify_audit_chain(intent.mandate_id)
    assert ap2_connector.verify_audit_chain(cart.mandate_id)

    # 5. Check audit events
    events = ap2_connector.get_audit_trail(cart.mandate_id)
    assert len(events) >= 2  # cart_created, cart_approved


@pytest.mark.asyncio
async def test_health_check(ap2_connector):
    """Test AP2 connector health check"""
    health = ap2_connector.health_check()

    assert health["connector"] == "ap2"
    assert health["version"] == "1.0.0"
    assert health["status"] == "healthy"
    assert "mandates" in health
    assert "stripe_enabled" in health


@pytest.mark.asyncio
async def test_factory_function():
    """Test AP2 connector factory function"""
    connector = await get_ap2_connector(enable_crypto=False)

    assert connector is not None
    assert isinstance(connector, AP2Connector)
    assert connector.enable_crypto is False


# ========================================================================
# ERROR HANDLING TESTS
# ========================================================================


@pytest.mark.asyncio
async def test_cart_not_found(ap2_connector, test_user_id):
    """Test error handling for non-existent cart"""
    with pytest.raises(ValueError, match="Cart mandate .* not found"):
        await ap2_connector.approve_cart_mandate(
            cart_mandate_id="cart_nonexistent",
            user_id=test_user_id
        )


@pytest.mark.asyncio
async def test_intent_not_found(ap2_connector, test_user_id, sample_cart_items):
    """Test error handling for non-existent intent"""
    with pytest.raises(ValueError, match="Intent mandate .* not found"):
        await ap2_connector.create_cart_mandate(
            intent_mandate_id="intent_nonexistent",
            items=sample_cart_items,
            user_id=test_user_id
        )


@pytest.mark.asyncio
async def test_payment_method_validation():
    """Test payment method validation"""
    # Valid payment method
    pm = PaymentMethodDetails(
        method_type=PaymentMethod.CARD,
        provider="stripe",
        last_four="4242"
    )
    assert pm.method_type == PaymentMethod.CARD

    # Invalid last four
    with pytest.raises(ValueError):
        PaymentMethodDetails(
            method_type=PaymentMethod.CARD,
            provider="stripe",
            last_four="123"  # Must be 4 digits
        )


@pytest.mark.asyncio
async def test_cart_item_validation():
    """Test CartItem validation"""
    # Valid cart item
    item = CartItem(
        item_id="test_001",
        name="Test Product",
        quantity=2,
        unit_price_cents=1000,
        currency="USD"
    )
    assert item.total_cents == 2000

    # Invalid quantity
    with pytest.raises(ValueError):
        CartItem(
            item_id="test",
            name="Test",
            quantity=0,  # Must be > 0
            unit_price_cents=1000,
            currency="USD"
        )

    # Invalid price
    with pytest.raises(ValueError):
        CartItem(
            item_id="test",
            name="Test",
            quantity=1,
            unit_price_cents=0,  # Must be > 0
            currency="USD"
        )


# ========================================================================
# PERFORMANCE TESTS
# ========================================================================


@pytest.mark.asyncio
async def test_concurrent_mandate_creation(ap2_connector, test_user_id, test_agent_id):
    """Test creating multiple mandates concurrently"""
    tasks = [
        ap2_connector.create_intent_mandate(
            user_id=f"{test_user_id}_{i}",
            agent_id=test_agent_id,
            task_description=f"Task {i}",
            max_price_cents=10000,
            currency="USD"
        )
        for i in range(10)
    ]

    intents = await asyncio.gather(*tasks)

    assert len(intents) == 10
    assert all(intent.signature is not None for intent in intents)
    assert all(ap2_connector.verify_intent_mandate(intent) for intent in intents)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])
