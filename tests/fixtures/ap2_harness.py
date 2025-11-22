"""
AP2 QA Harness
==============

Reusable fixtures + helpers for AP2-related tests. Provides deterministic
payloads for intents, carts, approvals, and audit assertions so every agent/unit
test speaks the same vocabulary.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --------------------------------------------------------------------------- #
# Mock approval payloads
# --------------------------------------------------------------------------- #
def mock_ap2_intent_mandate(
    *,
    user_id: str = "user-test",
    agent_name: str = "agent-test",
    max_price: float = 100.0,
) -> Dict[str, Any]:
    mandate_id = f"intent-{uuid.uuid4()}"
    return {
        "mandate_id": mandate_id,
        "agent": agent_name,
        "user_id": user_id,
        "max_price": max_price,
        "created_at": _now_iso(),
        "valid_for_hours": 720,
    }


def mock_ap2_cart_items(
    *,
    item_name: str = "service",
    price: float = 10.0,
    quantity: int = 1,
) -> List[Dict[str, Any]]:
    return [
        {
            "item_id": f"item-{uuid.uuid4()}",
            "name": item_name,
            "quantity": quantity,
            "unit_price": price,
            "currency": "USD",
        }
    ]


def mock_ap2_payment_methods() -> List[Dict[str, Any]]:
    return [
        {
            "method_id": f"pm-{uuid.uuid4()}",
            "type": "card",
            "brand": "visa",
            "last4": "4242",
        }
    ]


def create_test_intent_mandate(
    user_id: str,
    agent_name: str,
    max_price: float,
) -> Dict[str, Any]:
    return mock_ap2_intent_mandate(user_id=user_id, agent_name=agent_name, max_price=max_price)


def create_test_cart_mandate(
    intent_mandate_id: str,
    *,
    user_id: str,
    items: Optional[Sequence[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    return {
        "mandate_id": f"cart-{uuid.uuid4()}",
        "intent_mandate_id": intent_mandate_id,
        "user_id": user_id,
        "items": list(items or mock_ap2_cart_items()),
        "created_at": _now_iso(),
    }


def mock_ap2_approved(
    *,
    user_id: str = "user-test",
    agent_name: str = "agent-test",
    service_name: str = "service",
    price: float = 25.0,
) -> Dict[str, Any]:
    intent = mock_ap2_intent_mandate(user_id=user_id, agent_name=agent_name, max_price=price * 2)
    cart = create_test_cart_mandate(intent["mandate_id"], user_id=user_id)
    return {
        "intent": intent,
        "cart": cart,
        "status": "approved",
        "service": service_name,
        "price": price,
    }


def mock_ap2_denied(*, reason: str = "user_denied") -> Dict[str, Any]:
    payload = mock_ap2_approved()
    payload["status"] = "denied"
    payload["reason"] = reason
    return payload


def mock_ap2_budget_hold(*, remaining: float = 0.0) -> Dict[str, Any]:
    payload = mock_ap2_approved()
    payload["status"] = "budget_hold"
    payload["remaining_budget"] = remaining
    return payload


def mock_ap2_signature_failure(secret: str = "test", payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    sample = payload or mock_ap2_approved()
    invalid_signature = hmac.new(secret.encode(), b"invalid", hashlib.sha256).hexdigest()
    return {"payload": sample, "signature": invalid_signature}


def mock_ap2_timeout() -> Any:
    async def _raise_timeout(*_args, **_kwargs):
        raise asyncio.TimeoutError("AP2 request timed out")

    return _raise_timeout


# --------------------------------------------------------------------------- #
# Validation helpers
# --------------------------------------------------------------------------- #
def verify_signature(payload: Dict[str, Any], secret: str, signature: str) -> bool:
    serialized = repr(sorted(payload.items())).encode()
    expected = hmac.new(secret.encode(), serialized, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)


def assert_audit_logged(
    events: Iterable[Any],
    event_type: str,
    *,
    status: Optional[str] = None,
) -> None:
    """
    Assert that a monitor captured the requested event_type (and optional status).
    """
    for _agent, payload in events:
        if payload.get("event_type") == event_type:
            if status is None or payload.get("status") == status:
                return
    raise AssertionError(f"Expected audit event '{event_type}' (status={status}) not found.")


__all__ = [
    "mock_ap2_intent_mandate",
    "mock_ap2_cart_items",
    "mock_ap2_payment_methods",
    "mock_ap2_approved",
    "mock_ap2_denied",
    "mock_ap2_budget_hold",
    "mock_ap2_signature_failure",
    "mock_ap2_timeout",
    "create_test_intent_mandate",
    "create_test_cart_mandate",
    "verify_signature",
    "assert_audit_logged",
]

