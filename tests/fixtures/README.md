# AP2 QA Harness

Shared fixtures that keep AP2-focused tests consistent. Import helpers from
`tests.fixtures.ap2_harness` to generate stable intent/cart payloads, fake
approval responses, or assert audit activity without re-implementing boilerplate.

## Example

```python
from tests.fixtures.ap2_harness import mock_ap2_approved, assert_audit_logged

payload = mock_ap2_approved(service_name="stock_images", price=25.0)
monitor.record_ap2_event("content_agent", {"event_type": "cart_created", "status": payload["status"], "cost": payload["price"]})
assert_audit_logged(monitor.events, "cart_created", status="approved")
```

Available utilities include:

| Helper | Purpose |
| --- | --- |
| `mock_ap2_intent_mandate` | Lightweight intent mandate dictionary |
| `mock_ap2_cart_items` | Deterministic cart line items |
| `mock_ap2_payment_methods` | Sample payment method list |
| `mock_ap2_approved / mock_ap2_denied / mock_ap2_budget_hold` | One-line approval payloads |
| `mock_ap2_signature_failure` | Generates mismatched signature for negative tests |
| `mock_ap2_timeout` | Coroutine that raises `asyncio.TimeoutError` |
| `create_test_intent_mandate` / `create_test_cart_mandate` | Convenience wrappers used by other fixtures |
| `verify_signature` | HMAC helper used in audit assertions |
| `assert_audit_logged` | Ensures a monitor captured the expected AP2 event |

