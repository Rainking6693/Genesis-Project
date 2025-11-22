# AP2 (Agent Payments Protocol) Integration for Domain Name Agent

**Author:** Ben (Full-Stack Integration Specialist)
**Date:** November 14, 2025
**Version:** 1.0.0
**Spec:** [AP2 Protocol Specification](https://github.com/google-agentic-commerce/AP2)

## Overview

This document describes the integration of Google's AP2 (Agent Payments Protocol) with the Genesis Domain Name Agent for secure, auditable agent-initiated domain purchases.

### What is AP2?

AP2 is an open protocol announced by Google in September 2025 that enables AI agents to securely initiate and complete payments with cryptographically signed mandates and non-repudiable audit trails.

**Key Features:**
- **Mandate-based trust**: Intent, Cart, and Payment mandates create cryptographic proof of authorization
- **Multi-method payments**: Supports cards (Stripe), bank transfers, crypto, and digital wallets
- **Audit trail**: Non-repudiable transaction logs for compliance and dispute resolution
- **User control**: Explicit consent required for autonomous purchases
- **A2A extension**: Seamlessly integrates with Agent-to-Agent protocol

---

## Architecture

### High-Level Flow

```
User Request
    ↓
[Intent Mandate] ← User authorizes agent with spending constraints
    ↓
[Domain Name Agent] ← Finds available domains within budget
    ↓
[Cart Mandate] ← Specific domain purchase with price
    ↓
[User Approval] ← Manual or auto-approval (configurable)
    ↓
[Payment Execution] ← Name.com API domain registration
    ↓
[Audit Trail] ← Cryptographically signed transaction log
```

### Components

1. **AP2Connector** (`infrastructure/ap2_connector.py`)
   - Shane's implementation of AP2 protocol
   - Mandate creation, signing, and verification
   - Audit logging and compliance

2. **DomainNameAgent** (`agents/domain_name_agent.py`)
   - Domain discovery and registration
   - AP2 payment consent integration
   - Name.com API integration

3. **NameComClient** (`infrastructure/namecom_client.py`)
   - Domain availability checking
   - Domain registration and renewal
   - DNS configuration

---

## Domain-Specific AP2 Flows

### Flow 1: Single Domain Registration (Human-Present)

**Scenario:** User wants to register a domain for their new SaaS business.

```python
import asyncio
from agents.domain_name_agent import get_domain_agent

async def register_domain_with_approval():
    agent = get_domain_agent()

    # Step 1: Create Intent Mandate
    # User authorizes agent to purchase domains within constraints
    intent = await agent.create_payment_intent_mandate(
        user_id="user_12345",
        business_name="TaskFlow Pro",
        business_type="saas",
        max_domains=1,
        max_price_per_domain=50.0,  # Maximum $50/domain
        valid_for_hours=24  # Mandate expires in 24 hours
    )

    # Step 2: Agent finds domain and requests approval
    result = await agent.select_and_register_domain(
        business_name="TaskFlow Pro",
        business_type="saas",
        user_id="user_12345",
        auto_register=True,  # Will request AP2 consent
        configure_dns=True,
        max_cost=50.0
    )

    # Step 3: Check result
    if result.registration_success:
        print(f"✅ Domain registered: {result.selected_domain}")
        print(f"   Cost: ${result.total_cost}")
        print(f"   Intent Mandate: {result.ap2_intent_mandate_id}")
        print(f"   Cart Mandate: {result.ap2_cart_mandate_id}")
        print(f"   Payment Status: {result.payment_consent_status}")
    else:
        print(f"❌ Registration failed: {result.error}")
        if result.payment_consent_status == "pending_approval":
            print(f"   Awaiting user approval for cart: {result.ap2_cart_mandate_id}")

asyncio.run(register_domain_with_approval())
```

**Payment Flow:**

1. **Intent Mandate Created**
   - User ID: `user_12345`
   - Agent ID: `domain_name_agent`
   - Max price: $50.00 per domain
   - Valid for: 24 hours
   - Categories: `["domains", "dns", "privacy"]`

2. **Cart Mandate Created**
   - Domain: `taskflowpro.com`
   - Price: $12.99 (1 year + privacy)
   - Quantity: 1
   - Total: $12.99

3. **User Approval** (Manual or Auto)
   - Production: User reviews cart in UI and approves
   - Testing: Auto-approved if `AP2_AUTO_APPROVE_DOMAINS=true` and price ≤ $50

4. **Payment Execution**
   - Name.com API call to register domain
   - Stripe/card payment processed
   - DNS configured for GitHub Pages

5. **Audit Log Created**
   - Event: `domain_registered`
   - Mandate ID: Cart mandate ID
   - Domain details, cost, order ID
   - Cryptographically signed for non-repudiation

---

### Flow 2: Multiple Domains (Human-Not-Present)

**Scenario:** Agent autonomously purchases multiple domains for a marketplace business.

```python
async def autonomous_domain_purchases():
    agent = get_domain_agent()

    # Create Intent Mandate with higher limits
    intent = await agent.create_payment_intent_mandate(
        user_id="user_67890",
        business_name="Multi-Marketplace",
        business_type="marketplace",
        max_domains=5,  # Up to 5 domains
        max_price_per_domain=50.0,
        valid_for_hours=168  # 7 days
    )

    # Register multiple domains under same intent
    domains = []
    for i, subdomain in enumerate(["shop", "seller", "buyer", "admin"], 1):
        result = await agent.select_and_register_domain(
            business_name=f"Multi-Marketplace {subdomain.title()}",
            business_type="marketplace",
            user_id="user_67890",
            auto_register=True
        )

        if result.registration_success:
            domains.append(result.selected_domain)
            print(f"✅ Domain {i}: {result.selected_domain} (${result.total_cost})")
        else:
            print(f"❌ Failed: {result.error}")

    print(f"\n📊 Total domains registered: {len(domains)}")
    print(f"💰 Total cost: ${sum(agent.registered_domains, key=lambda d: d['cost'])}")
```

**Intent Mandate Reuse:**
- Single intent mandate authorizes multiple purchases
- Each domain gets its own cart mandate
- All purchases must be within `max_price_per_domain` limit
- Intent expires after 7 days or when all 5 domains purchased

---

### Flow 3: Domain Renewal (Recurring Payment)

**Scenario:** Auto-renew domains every year without user intervention.

```python
from infrastructure.ap2_connector import AP2Connector, CartItem, PaymentMethod

async def setup_domain_renewal():
    ap2 = AP2Connector()

    # Create Intent Mandate for renewals
    intent = await ap2.create_intent_mandate(
        user_id="user_renewal",
        agent_id="domain_name_agent",
        task_description="Auto-renew domains for 3 years",
        max_price_cents=15000,  # $150 for 3-year renewal
        currency="USD",
        valid_for_hours=720,  # 30 days
        allowed_categories=["domains", "renewals"],
        require_approval=False  # Auto-renew without user approval
    )

    # Create cart for 3-year renewal
    renewal_item = CartItem(
        item_id="renewal_taskflowpro",
        name="taskflowpro.com - 3 year renewal + privacy",
        quantity=1,
        unit_price_cents=14999,  # $149.99
        currency="USD"
    )

    cart = await ap2.create_cart_mandate(
        intent_mandate_id=intent.mandate_id,
        items=[renewal_item],
        user_id="user_renewal"
    )

    # Auto-approve (since require_approval=False)
    await ap2.approve_cart_mandate(cart.mandate_id, "user_renewal")

    print(f"✅ Renewal authorized: {cart.mandate_id}")
    print(f"   Duration: 3 years")
    print(f"   Cost: $149.99")
```

**Recurring Payment Handling:**
- Intent mandate with `require_approval=False` enables autonomous renewals
- Agent can renew domains without real-time user approval
- Audit trail logs every renewal for accountability
- User can revoke intent mandate to stop auto-renewals

---

### Flow 4: Cost Threshold Enforcement

**Scenario:** Prevent agent from exceeding monthly budget.

```python
async def enforce_cost_threshold():
    # Agent with $100/month threshold
    agent = get_domain_agent(cost_alert_threshold=100.0)

    # Simulate existing monthly costs
    agent.total_monthly_cost = 95.0  # Already spent $95 this month

    # Try to register domain ($12.99 would exceed $100)
    result = await agent.select_and_register_domain(
        business_name="Over Budget Business",
        business_type="saas",
        user_id="user_budget",
        auto_register=True,
        max_cost=50.0
    )

    # Result: Registration blocked
    assert result.registration_success == False
    assert result.payment_consent_status == "threshold_exceeded"
    assert "COST ALERT" in result.error

    print(f"❌ Registration blocked: {result.error}")
    print(f"   Monthly cost: ${agent.total_monthly_cost}")
    print(f"   Threshold: ${agent.cost_alert_threshold}")
```

**Threshold Enforcement:**
- Checked before AP2 payment consent request
- Prevents agent from exceeding authorized spending limits
- User must manually approve purchases that exceed threshold
- Integrated with AP2 for cryptographic proof of authorization

---

## Configuration

### Environment Variables

```bash
# AP2 Configuration
AP2_SIGNING_SECRET=<secret_key>          # Cryptographic signing key
AP2_AUTO_APPROVE_DOMAINS=false           # Auto-approve domain purchases (TESTING ONLY)
AP2_AUTO_APPROVAL_THRESHOLD=50.0         # Max auto-approval amount (USD)

# Domain Agent Configuration
LARGE_BILL_THRESHOLD=100.0               # Monthly cost alert threshold
NAMECOM_API_USERNAME=<username>          # Name.com API credentials
NAMECOM_API_TOKEN=<token>                # Name.com API token

# Payment Provider Configuration
STRIPE_SECRET_KEY=sk_live_...            # Stripe API key for card payments
```

### Auto-Approval (Testing Only)

For **testing purposes only**, you can enable auto-approval to bypass manual cart approval:

```python
import os
os.environ["AP2_AUTO_APPROVE_DOMAINS"] = "true"  # DANGEROUS - TESTING ONLY

agent = get_domain_agent()
```

**⚠️ WARNING:** Never use auto-approval in production. This bypasses user consent and is only for testing/development.

---

## Security Features

### 1. Cryptographic Mandates

All mandates (Intent, Cart, Payment) are signed using HMAC-SHA256:

```python
signature = hmac.new(
    secret_key.encode(),
    mandate_data.encode(),
    hashlib.sha256
).hexdigest()
```

### 2. Mandate Expiration

Intent mandates expire after specified TTL:

```python
# Create mandate valid for 24 hours
intent = await ap2.create_intent_mandate(
    valid_for_hours=24,
    ...
)

# Check if expired
if intent.is_expired():
    raise ValueError("Mandate expired - user authorization required")
```

### 3. Price Validation

Cart total must not exceed intent mandate limits:

```python
if cart.total_cents > intent.constraints.max_price_cents:
    raise ValueError(f"Cart total ${cart.total_cents/100} exceeds limit ${intent.constraints.max_price_cents/100}")
```

### 4. User ID Verification

Cart approval requires matching user ID:

```python
if cart.user_id != approving_user_id:
    raise ValueError("User ID mismatch - unauthorized approval")
```

### 5. Audit Trail Integrity

All audit events are cryptographically signed and verifiable:

```python
# Verify audit chain
is_valid = ap2.verify_audit_chain(cart_mandate_id)
assert is_valid  # True if all signatures valid
```

---

## Audit Trail

### Event Types

1. **`intent_created`**: Intent mandate created
2. **`cart_created`**: Cart mandate created
3. **`cart_approved`**: User approved cart
4. **`domain_registered`**: Domain successfully registered
5. **`payment_succeeded`**: Payment completed
6. **`payment_failed`**: Payment failed

### Retrieving Audit Trail

```python
# Get all audit events for a cart mandate
events = ap2.get_audit_trail(cart_mandate_id)

for event in events:
    print(f"{event.event_type} at {event.timestamp}")
    print(f"  User: {event.user_id}")
    print(f"  Agent: {event.agent_id}")
    print(f"  Data: {event.data}")
    print(f"  Signature: {event.signature[:16]}...")
```

### Audit Log Storage

Audit logs are stored in `logs/ap2_audit.jsonl` (JSONL format):

```json
{"event_id": "evt_abc123", "event_type": "domain_registered", "mandate_id": "cart_xyz789", "user_id": "user_12345", "timestamp": "2025-11-14T12:00:00Z", "data": {"domain": "taskflowpro.com", "cost_usd": 12.99}, "signature": "a1b2c3..."}
```

---

## Testing

### Running Tests

```bash
# Run all AP2 domain integration tests
pytest tests/test_ap2_domain_integration.py -v

# Run specific test
pytest tests/test_ap2_domain_integration.py::test_domain_registration_with_ap2_auto_approval -v

# Run with coverage
pytest tests/test_ap2_domain_integration.py --cov=agents.domain_name_agent --cov=infrastructure.ap2_connector
```

### Test Coverage

**14 comprehensive test cases:**

1. ✅ `test_create_intent_mandate` - Intent mandate creation
2. ✅ `test_create_cart_mandate` - Cart mandate creation and approval
3. ✅ `test_domain_registration_with_ap2_auto_approval` - Full flow with auto-approval
4. ✅ `test_domain_registration_without_ap2` - Registration without AP2
5. ✅ `test_payment_consent_pending_manual_approval` - Manual approval required
6. ✅ `test_cost_threshold_exceeded` - Threshold enforcement
7. ✅ `test_intent_mandate_expiration` - Mandate expiration handling
8. ✅ `test_audit_trail_integrity` - Cryptographic signature verification
9. ✅ `test_domain_renewal_consent` - Recurring payment consent
10. ✅ `test_multiple_domains_single_mandate` - Multiple purchases under one intent
11. ✅ `test_user_id_mismatch_rejected` - Security validation
12. ✅ `test_payment_method_details_validation` - Payment method validation
13. ✅ `test_complete_domain_registration_flow` - End-to-end integration test

### Mock Objects

Tests use mock Name.com client to avoid real API calls:

```python
class MockNameComClient:
    def check_availability(self, domain: str) -> DomainAvailability:
        return DomainAvailability(
            domain=domain,
            available=True,
            price=12.99,
            premium=False,
            purchasable=True
        )
```

---

## Integration Points

### 1. With Shane's AP2 Connector

Ben's Domain Name Agent integrates with Shane's `AP2Connector` implementation:

```python
from infrastructure.ap2_connector import AP2Connector

# Domain agent uses Shane's connector
agent = DomainNameAgent(
    ap2_connector=AP2Connector(),
    enable_ap2_consent=True
)
```

### 2. With Name.com API

Domain registration executes via `NameComClient`:

```python
from infrastructure.namecom_client import get_namecom_client

client = get_namecom_client()
registration = client.register_domain(
    domain="taskflowpro.com",
    years=1,
    auto_renew=True,
    privacy=True
)
```

### 3. With A2A Protocol

AP2 is designed as an extension of the A2A protocol:

```python
# A2A connector can invoke domain agent with AP2 consent
from infrastructure.a2a_connector import A2AConnector

a2a = A2AConnector()
result = await a2a.invoke_agent_tool(
    agent_name="domain_name_agent",
    tool_name="register_domain",
    arguments={
        "business_name": "TaskFlow Pro",
        "user_id": "user_12345",
        "ap2_enabled": True
    }
)
```

---

## Deployment Considerations

### Production Checklist

- [ ] Set `AP2_SIGNING_SECRET` to secure random key
- [ ] Disable `AP2_AUTO_APPROVE_DOMAINS` (must be `false`)
- [ ] Configure `STRIPE_SECRET_KEY` for production payments
- [ ] Set `LARGE_BILL_THRESHOLD` for cost control
- [ ] Enable audit log backup/archival
- [ ] Set up user approval UI for cart mandates
- [ ] Configure webhooks for payment status updates
- [ ] Implement domain renewal reminders
- [ ] Set up monitoring for failed payments
- [ ] Document dispute resolution process

### Monitoring

Monitor AP2 payment flows via audit logs:

```bash
# Count successful domain registrations
cat logs/ap2_audit.jsonl | grep "domain_registered" | wc -l

# Check for failed payments
cat logs/ap2_audit.jsonl | grep "payment_failed"

# Verify audit chain integrity
python -m infrastructure.ap2_connector verify_audit_chain <cart_mandate_id>
```

---

## Troubleshooting

### Issue: Payment consent pending forever

**Cause:** Auto-approval disabled, user hasn't approved cart

**Solution:**
```python
# Check cart status
cart = ap2.get_cart_mandate(cart_mandate_id)
if not cart.is_approved():
    # Manual approval via UI or:
    await ap2.approve_cart_mandate(cart_mandate_id, user_id)
```

### Issue: Intent mandate expired

**Cause:** Mandate TTL exceeded

**Solution:**
```python
# Create new intent mandate
intent = await agent.create_payment_intent_mandate(
    user_id=user_id,
    business_name=business_name,
    business_type=business_type,
    valid_for_hours=168  # Extend to 7 days
)
```

### Issue: Cost threshold exceeded

**Cause:** Monthly domain costs exceed `LARGE_BILL_THRESHOLD`

**Solution:**
```python
# Increase threshold or reset monthly costs
agent.cost_alert_threshold = 200.0  # Increase to $200/month
# OR
agent.total_monthly_cost = 0.0  # Reset (new billing cycle)
```

### Issue: Audit signature verification failed

**Cause:** `AP2_SIGNING_SECRET` changed or audit log corrupted

**Solution:**
- Verify `AP2_SIGNING_SECRET` is consistent
- Check audit log file integrity
- Review recent changes to signing key

---

## Future Enhancements

### Planned Features

1. **Push Payments** (AP2 v1.0)
   - ACH, SEPA, UPI, PIX support
   - Direct bank transfers for domain purchases

2. **Cryptocurrency Payments** (x402 Extension)
   - Stablecoins (USDC, USDT) via Coinbase Commerce
   - Blockchain payment verification

3. **Recurring Billing**
   - Subscription-based domain management
   - Auto-renew with payment method on file

4. **Bulk Domain Purchases**
   - Single cart with multiple domains
   - Volume discounts integration

5. **Domain Transfer Consent**
   - AP2 mandates for domain transfers
   - Secure transfer authorization

---

## Conclusion

The AP2 integration for Domain Name Agent provides:

✅ **Secure autonomous payments** with cryptographic mandates
✅ **User control** via explicit consent and spending limits
✅ **Audit trail** for compliance and dispute resolution
✅ **Multi-method payments** (cards, bank, crypto)
✅ **Cost enforcement** via threshold monitoring
✅ **Production-ready** with comprehensive testing (14 test cases)

For questions or support, contact Ben (Full-Stack Integration Specialist).

---

**Version History:**

- v1.0.0 (Nov 14, 2025): Initial AP2 integration with Domain Name Agent
  - Intent/Cart/Payment mandate support
  - Auto-approval for testing
  - Audit trail logging
  - 14 comprehensive test cases
  - Integration with Shane's AP2 connector
