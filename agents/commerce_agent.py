from __future__ import annotations

EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER COMMERCE AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."

"""
Commerce Agent - AP2-backed commerce orchestration.

Manages domain registration, payment gateways, tax engines, and fulfillment budgets
with signatures and alerts.
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import threading
from datetime import datetime
from typing import Any, Awaitable, Dict, Optional

from infrastructure.ap2_service import AP2Service, AP2BudgetConfig, DEFAULT_BUDGETS
from infrastructure.x402_client import get_x402_client, X402PaymentError
from infrastructure.x402_vendor_cache import get_x402_vendor_cache

# Import StandardIntegrationMixin for ALL 283 integrations
from infrastructure.standard_integration_mixin import StandardIntegrationMixin, darwin_evolved

# Import MemoryOS for commerce history and transaction memory
from infrastructure.memory_os_mongodb_adapter import (
    create_genesis_memory_mongodb
)

logger = logging.getLogger(__name__)


class CommerceAgent(StandardIntegrationMixin):
    """Commerce stack automation agent with AP2 cost controls."""

    def __init__(self, business_id: str = "default"):
        super().__init__()
        self.business_id = business_id
        self._ap2_service_instance: Optional[AP2Service] = None
        self._ap2_loop: Optional[asyncio.AbstractEventLoop] = None
        self._ap2_thread: Optional[threading.Thread] = None
        self._budget_config = self._get_commerce_budget()
        self._monthly_spend = 0.0
        self._budget_window = datetime.utcnow().strftime("%Y-%m")
        self._ap2_secret = os.getenv("AP2_SECRET_KEY", "dev-commerce-secret")
        self.commerce_audit: list[Dict[str, Any]] = []
        self.commerce_alerts: list[Dict[str, Any]] = []
        self._x402_client_instance = get_x402_client()
        self._vendor_cache_instance = get_x402_vendor_cache()

        try:
            self._ap2_service_instance = AP2Service()
        except (RuntimeError, OSError) as exc:
            logger.warning("CommerceAgent AP2 unavailable: %s", exc)
            self._ap2_service_instance = None

        if self._ap2_service_instance:
            self._ap2_loop = asyncio.new_event_loop()
            self._ap2_thread = threading.Thread(
                target=self._run_ap2_loop,
                name="CommerceAgent-AP2Loop",
                daemon=True,
            )
            self._ap2_thread.start()

        # Initialize MemoryOS for commerce history and transaction memory
        self.memory = None  # Lazy initialization

    async def _init_memory(self):
        """Initialize MemoryOS MongoDB backend for Commerce memory."""
        try:
            self.memory = create_genesis_memory_mongodb(
                mongodb_uri=os.getenv("MONGODB_URI", "mongodb://localhost:27017/"),
                database_name="genesis_memory_commerce",
                short_term_capacity=10,   # Recent transactions
                mid_term_capacity=500,    # Historical commerce data
                long_term_knowledge_capacity=200  # Commerce strategies, vendor insights
            )
            logger.info("[OK] MemoryOS initialized for CommerceAgent")
        except Exception as e:
            logger.warning(f"[CommerceAgent] Failed to initialize MemoryOS: {e}. Memory features disabled.")
            self.memory = None

    async def _charge_x402(self, vendor: str, amount: float, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Charge x402 payment with LLM analysis."""
        try:
            prepared_metadata = await self._prepare_x402_metadata(vendor, metadata)
            self._x402_client_instance.record_manual_payment(
                agent_name="commerce_agent",
                vendor=vendor,
                amount=max(amount, 0.01),
                metadata=prepared_metadata,
            )
            
            # LLM analysis of x402 payment
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze x402 payment and provide insights.

Payment Details:
- Vendor: {vendor}
- Amount: ${amount:.2f}
- Category: commerce

Requirements:
- Assess payment efficiency
- Identify optimization opportunities
- Provide recommendations for payment strategy

Return JSON with:
{{
  "payment_assessment": str,
  "optimization_opportunities": [str],
  "strategy_recommendations": [str]
}}
"""
            try:
                if hasattr(self, 'local_llm_client') and self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    if llm_data:
                        logger.debug(f"x402 payment analysis: {llm_data.get('payment_assessment', 'N/A')[:100]}")
            except Exception as e:
                logger.warning(f"LLM x402 payment analysis failed: {e}")
        except X402PaymentError as exc:
            raise RuntimeError(f"Commerce Agent x402 budget exceeded: {exc}") from exc

    async def _prepare_x402_metadata(
        self, vendor: str, metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare x402 metadata with LLM analysis."""
        data = dict(metadata or {})
        data.setdefault("business_id", self.business_id)
        data.setdefault("agent_name", "commerce_agent")
        data.setdefault("category", "commerce")
        capabilities = self._vendor_cache_instance.lookup(vendor)
        if capabilities:
            data.setdefault("accepted_tokens", capabilities.get("accepted_tokens"))
            data.setdefault("preferred_chain", capabilities.get("preferred_chain"))
        
        # LLM analysis of metadata preparation
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze x402 metadata preparation and provide insights.

Metadata Details:
- Vendor: {vendor}
- Business ID: {self.business_id}
- Category: commerce
- Capabilities: {json.dumps(capabilities, indent=2) if capabilities else 'None'}

Requirements:
- Assess metadata completeness
- Identify optimization opportunities
- Provide recommendations for metadata strategy

Return JSON with:
{{
  "metadata_assessment": str,
  "optimization_opportunities": [str],
  "strategy_recommendations": [str]
}}
"""
        try:
            if hasattr(self, 'local_llm_client') and self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Metadata preparation analysis: {llm_data.get('metadata_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM metadata preparation analysis failed: {e}")
        
        return data

    async def register_domain(self, domain: str, registrar: str = "Namecheap", registration_cost: float = 12.0) -> str:
        receipt = self._ensure_commerce_budget(
            service_name=f"{registrar} domain",
            amount=registration_cost,
            metadata={"domain": domain},
        )
        staged_amount = max(0.02, registration_cost * 0.01)
        auth_id = await self._authorize_staged_payment(
            vendor="commerce-domain-api",
            amount=staged_amount,
            metadata={"domain": domain, "registrar": registrar},
        )

        # LLM validation and analysis
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Validate domain registration and provide recommendations.

Domain: {domain}
Registrar: {registrar}
Cost: ${registration_cost}

Requirements:
- Validate domain name quality
- Check for brand risk
- Suggest DNS configuration
- Recommend security settings

Return JSON with:
{{
  "domain_quality_score": float,
  "brand_risk_assessment": str,
  "dns_recommendations": [str],
  "security_recommendations": [str],
  "registration_status": str
}}
"""

        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=350)
            domain_data = json.loads(response) if response.strip().startswith('{') else {}
        except Exception as e:
            logger.warning(f"LLM domain validation failed: {e}")
            domain_data = {}

        result = {
            "domain": domain,
            "registrar": registrar,
            "cost": registration_cost,
            "status": domain_data.get("registration_status", "registered"),
            "ap2_approval": receipt,
            "llm_validation": {**domain_data} if domain_data else None,
        }
        try:
            if auth_id:
                await self._capture_staged_payment(auth_id, {"domain": domain, "status": result["status"]})
        except Exception as exc:
            self._cancel_staged_payment(auth_id, f"domain_capture_failed:{exc}")
        return json.dumps(result, indent=2)

    async def activate_payment_gateway(self, gateway: str, setup_fee: float) -> str:
        receipt = self._ensure_commerce_budget(
            service_name=f"{gateway} gateway setup",
            amount=setup_fee,
            metadata={"gateway": gateway},
        )
        staged_amount = max(0.03, setup_fee * 0.005)
        auth_id = await self._authorize_staged_payment(
            vendor="commerce-gateway-cert",
            amount=staged_amount,
            metadata={"gateway": gateway},
        )

        # LLM configuration recommendation
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Recommend optimal payment gateway configuration.

Gateway: {gateway}
Setup Fee: ${setup_fee}

Requirements:
- Validate gateway selection for business type
- Recommend security settings
- Suggest fee optimization
- Identify compliance requirements

Return JSON with:
{{
  "configuration_recommendations": [str],
  "security_settings": [str],
  "fee_optimization": str,
  "compliance_checklist": [str],
  "activation_status": str
}}
"""

        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=400)
            gateway_data = json.loads(response) if response.strip().startswith('{') else {}
        except Exception as e:
            logger.warning(f"LLM gateway configuration failed: {e}")
            gateway_data = {}

        result = {
            "gateway": gateway,
            "setup_fee": setup_fee,
            "activated_at": datetime.utcnow().isoformat(),
            "ap2_approval": receipt,
            "llm_configuration": {**gateway_data} if gateway_data else None,
        }
        try:
            if auth_id:
                await self._capture_staged_payment(auth_id, {"gateway": gateway, "status": gateway_data.get("activation_status", "activated")})
        except Exception as exc:
            self._cancel_staged_payment(auth_id, f"gateway_capture_failed:{exc}")
        return json.dumps(result, indent=2)

    async def configure_tax_engine(self, provider: str, monthly_cost: float) -> str:
        receipt = self._ensure_commerce_budget(
            service_name=f"{provider} tax engine",
            amount=monthly_cost,
            metadata={"provider": provider},
        )

        # LLM tax compliance analysis
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze tax engine configuration and compliance.

Tax Provider: {provider}
Monthly Cost: ${monthly_cost}

Requirements:
- Identify tax jurisdictions covered
- Recommend tax rule updates
- Assess compliance gaps
- Suggest optimization strategies

Return JSON with:
{{
  "jurisdictions_covered": [str],
  "compliance_status": str,
  "recommended_rules": [str],
  "tax_optimization_tips": [str],
  "configuration_complete": bool
}}
"""

        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=350)
            tax_data = json.loads(response) if response.strip().startswith('{') else {}
        except Exception as e:
            logger.warning(f"LLM tax analysis failed: {e}")
            tax_data = {}

        result = {
            "provider": provider,
            "monthly_cost": monthly_cost,
            "configured_at": datetime.utcnow().isoformat(),
            "ap2_approval": receipt,
            "llm_analysis": {**tax_data} if tax_data else None,
        }
        return json.dumps(result, indent=2)

    async def ship_fulfillment_batch(self, carrier: str, orders: int, per_order_cost: float) -> str:
        spend = round(orders * per_order_cost, 2)
        receipt = self._ensure_commerce_budget(
            service_name=f"{carrier} fulfillment batch",
            amount=spend,
            metadata={"orders": orders},
        )

        # LLM fulfillment optimization
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Optimize fulfillment batch configuration.

Carrier: {carrier}
Order Count: {orders}
Per Order Cost: ${per_order_cost}
Total Cost: ${spend}

Requirements:
- Validate carrier efficiency
- Recommend batch optimization
- Suggest cost reduction strategies
- Identify shipping risks

Return JSON with:
{{
  "carrier_rating": float,
  "efficiency_score": float,
  "cost_optimization": str,
  "recommended_batch_size": int,
  "shipping_recommendations": [str],
  "batch_status": str
}}
"""

        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=400)
            fulfillment_data = json.loads(response) if response.strip().startswith('{') else {}
        except Exception as e:
            logger.warning(f"LLM fulfillment optimization failed: {e}")
            fulfillment_data = {}

        result = {
            "carrier": carrier,
            "orders": orders,
            "total_cost": spend,
            "ap2_approval": receipt,
            "llm_optimization": {**fulfillment_data} if fulfillment_data else None,
        }
        return json.dumps(result, indent=2)

    def launch_commerce_stack(
        self,
        domain: str,
        registrar_cost: float,
        gateway_fee: float,
        tax_engine_cost: float,
        fulfillment_orders: int,
    ) -> Dict[str, Any]:
        domain_receipt = json.loads(self.register_domain(domain, registration_cost=registrar_cost))
        gateway = json.loads(self.activate_payment_gateway("Stripe", gateway_fee))
        tax = json.loads(self.configure_tax_engine("Avalara", tax_engine_cost))
        fulfillment = json.loads(self.ship_fulfillment_batch("Shippo", fulfillment_orders, per_order_cost=8.5))
        receipts = [
            domain_receipt.get("ap2_approval"),
            gateway.get("ap2_approval"),
            tax.get("ap2_approval"),
            fulfillment.get("ap2_approval"),
        ]
        return {
            "domain": domain_receipt,
            "gateway": gateway,
            "tax": tax,
            "fulfillment": fulfillment,
            "ap2_receipts": [r for r in receipts if r],
        }

    def shutdown(self) -> None:
        if self._ap2_loop:
            self._ap2_loop.call_soon_threadsafe(self._ap2_loop.stop)
        if self._ap2_thread:
            self._ap2_thread.join(timeout=1)
        self._ap2_loop = None
        self._ap2_thread = None

    def get_budget_metrics(self) -> Dict[str, Any]:
        self._reset_budget_if_needed()
        return {
            "monthly_limit": self._budget_config.monthly_limit,
            "monthly_spend": self._monthly_spend,
            "remaining_budget": max(self._budget_config.monthly_limit - self._monthly_spend, 0),
            "window": self._budget_window,
        }

    def get_audit_log(self) -> list[Dict[str, Any]]:
        return list(self.commerce_audit)

    def get_alerts(self) -> list[Dict[str, Any]]:
        return list(self.commerce_alerts)

    async def _authorize_staged_payment(
        self, *, vendor: str, amount: float, metadata: Dict[str, Any]
    ) -> Optional[str]:
        """Authorize staged payment with LLM analysis."""
        if not self._x402_client_instance:
            return None
        try:
            auth_id = self._x402_client_instance.authorize_payment(
                agent_name="commerce_agent",
                vendor=vendor,
                amount=amount,
                metadata=metadata,
            )
            
            # LLM analysis of payment authorization
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze payment authorization and provide insights.

Authorization Details:
- Vendor: {vendor}
- Amount: ${amount:.2f}
- Auth ID: {auth_id or 'None'}

Requirements:
- Assess authorization effectiveness
- Identify optimization opportunities
- Provide recommendations for payment strategy

Return JSON with:
{{
  "authorization_assessment": str,
  "optimization_opportunities": [str],
  "strategy_recommendations": [str]
}}
"""
            try:
                if hasattr(self, 'local_llm_client') and self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    if llm_data:
                        logger.debug(f"Payment authorization analysis: {llm_data.get('authorization_assessment', 'N/A')[:100]}")
            except Exception as e:
                logger.warning(f"LLM payment authorization analysis failed: {e}")
            
            return auth_id
        except X402PaymentError as exc:
            raise RuntimeError(f"Commerce Agent staged payment denied: {exc}") from exc
        except Exception as exc:
            logger.warning("CommerceAgent: staged payment skipped (%s)", exc)
            return None

    async def _capture_staged_payment(self, auth_id: Optional[str], metadata: Dict[str, Any]) -> None:
        """Capture staged payment with LLM analysis."""
        if auth_id and self._x402_client_instance:
            self._x402_client_instance.capture_payment(auth_id, metadata=metadata)
            
            # LLM analysis of payment capture
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze payment capture and provide insights.

Capture Details:
- Auth ID: {auth_id}
- Metadata: {json.dumps(metadata, indent=2)[:200]}

Requirements:
- Assess capture effectiveness
- Identify optimization opportunities
- Provide recommendations for payment strategy

Return JSON with:
{{
  "capture_assessment": str,
  "optimization_opportunities": [str],
  "strategy_recommendations": [str]
}}
"""
            try:
                if hasattr(self, 'local_llm_client') and self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    if llm_data:
                        logger.debug(f"Payment capture analysis: {llm_data.get('capture_assessment', 'N/A')[:100]}")
            except Exception as e:
                logger.warning(f"LLM payment capture analysis failed: {e}")

    def _cancel_staged_payment(self, auth_id: Optional[str], reason: str) -> None:
        if not auth_id or not self._x402_client_instance:
            return
        try:
            self._x402_client_instance.cancel_authorization(auth_id, reason=reason)
        except Exception as exc:
            logger.warning("CommerceAgent: failed to cancel authorization %s (%s)", auth_id, exc)

    def _run_ap2_loop(self) -> None:
        if not self._ap2_loop:
            return
        asyncio.set_event_loop(self._ap2_loop)
        self._ap2_loop.run_forever()

    def _execute_ap2_coro(self, coro: Awaitable[Dict[str, Any]]) -> Dict[str, Any]:
        if not self._ap2_service_instance:
            raise RuntimeError("AP2 service unavailable for CommerceAgent.")
        if self._ap2_loop:
            future = asyncio.run_coroutine_threadsafe(coro, self._ap2_loop)
            try:
                result = future.result(timeout=30)
            except asyncio.TimeoutError as exc:
                raise RuntimeError("AP2 request timed out") from exc
        else:
            result = asyncio.run(coro)
        if result.get("status") != "approved":
            raise RuntimeError(f"AP2 request denied: {result.get('status')}")
        return result

    def _get_commerce_budget(self) -> AP2BudgetConfig:
        return DEFAULT_BUDGETS.get(
            "commerce_agent",
            AP2BudgetConfig(monthly_limit=3000.0, per_transaction_alert=400.0, require_manual_above=600.0),
        )

    def _reset_budget_if_needed(self) -> None:
        current_window = datetime.utcnow().strftime("%Y-%m")
        if current_window != self._budget_window:
            self._budget_window = current_window
            self._monthly_spend = 0.0

    async def _ensure_commerce_budget(
        self,
        service_name: str,
        amount: float,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Commerce spend must be positive.")
        if not self._ap2_service_instance:
            raise RuntimeError("AP2 service unavailable for CommerceAgent.")

        self._reset_budget_if_needed()
        if self._monthly_spend + amount > self._budget_config.monthly_limit:
            raise ValueError(
                f"Commerce monthly budget exhausted. Remaining "
                f"${self._budget_config.monthly_limit - self._monthly_spend:.2f}."
            )

        auto_approval = amount <= 60.0
        manual_review = amount > 500.0
        receipt = self._execute_ap2_coro(
            self._ap2_service_instance.request_purchase(
                agent_name="commerce_agent",
                user_id=f"{self.business_id}_commerce",
                service_name=service_name,
                price=amount,
                categories=["commerce"],
                metadata=metadata or {},
            )
        )
        payload = {
            **receipt,
            "service": service_name,
            "amount": amount,
            "auto_approval": auto_approval,
            "manual_review": manual_review,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
        }
        signature = await self._sign_payload(payload)
        payload["signature"] = signature
        if not await self._verify_signature(payload, signature):
            raise RuntimeError("CommerceAgent AP2 signature verification failed.")

        self._monthly_spend += amount
        self.commerce_audit.append(payload)
        if amount >= self._budget_config.per_transaction_alert:
            self.commerce_alerts.append(
                {"service": service_name, "amount": amount, "timestamp": payload["timestamp"]}
            )
        return payload

    async def _sign_payload(self, payload: Dict[str, Any]) -> str:
        """Sign payload with LLM security analysis."""
        body = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            self._ap2_secret.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        
        # LLM security analysis of payload signing
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze payload signing security and provide insights.

Signing Details:
- Payload Keys: {', '.join(payload.keys())[:200]}
- Signature Generated: Yes

Requirements:
- Assess signing security
- Identify potential vulnerabilities
- Provide recommendations for security improvements
- Suggest best practices for payload signing

Return JSON with:
{{
  "security_assessment": str,
  "vulnerability_analysis": [str],
  "security_recommendations": [str],
  "best_practices": [str]
}}
"""
        try:
            if hasattr(self, 'local_llm_client') and self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Payload signing security analysis: {llm_data.get('security_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM payload signing analysis failed: {e}")
        
        return signature

    async def _verify_signature(self, payload: Dict[str, Any], signature: str) -> bool:
        """Verify signature with LLM security analysis."""
        comparison = {k: v for k, v in payload.items() if k != "signature"}
        expected = await self._sign_payload(comparison)
        is_valid = hmac.compare_digest(signature, expected)
        
        # LLM security analysis of signature verification
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze signature verification security and provide insights.

Verification Details:
- Signature Valid: {is_valid}
- Payload Keys: {', '.join(comparison.keys())[:200]}

Requirements:
- Assess verification security
- Identify potential vulnerabilities
- Provide recommendations for security improvements
- Suggest best practices for signature verification

Return JSON with:
{{
  "verification_assessment": str,
  "vulnerability_analysis": [str],
  "security_recommendations": [str],
  "best_practices": [str]
}}
"""
        try:
            if hasattr(self, 'local_llm_client') and self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Signature verification security analysis: {llm_data.get('verification_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM signature verification analysis failed: {e}")
        
        return is_valid


__all__ = ["CommerceAgent"]

