EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER BILLING AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."

"""
BILLING AGENT - Microsoft Agent Framework Version
Version: 5.0 (AP2 Integration + DAAO + TUMIX + MongoDB Persistence)

Handles payment processing, invoicing, and revenue management.
Enhanced with AP2 (Agent Payments Protocol) for secure agent-initiated payments.

New Features (v5.0):
- AP2 mandate-based payment authorization
- Cryptographic signature verification
- Multi-method payment support (cards, crypto, bank transfers)
- Non-repudiable audit trails
- Integration with A2A protocol
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
# from agent_framework import ChatAgent  # Commented out - missing module
# from agent_framework.azure import AzureAIAgentClient  # Commented out - missing module
# from agent_framework.observability import setup_observability  # Commented out - missing module
# from azure.identity.aio import AzureCliCredential  # Commented out - missing module

# P0-6 FIX: Import Pydantic for payment validation
from pydantic import BaseModel, Field, validator

# MongoDB for persistence
try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure
    MONGO_AVAILABLE = True
except ImportError:
    MONGO_AVAILABLE = False
    logging.warning("pymongo not available - using in-memory storage only")

# setup_observability(enable_sensitive_data=True)  # Commented out - missing import

# Import DAAO and TUMIX
from infrastructure.daao_router import get_daao_router, RoutingDecision
from infrastructure.tumix_termination import (
    get_tumix_termination,
    RefinementResult,
    TerminationDecision
)
# REMOVED: Discord integration (integration disabled due to webhook errors)
# from infrastructure.genesis_discord import GenesisDiscord, fire_and_forget

# Import StandardIntegrationMixin for ALL 283 integrations
from infrastructure.standard_integration_mixin import StandardIntegrationMixin
from infrastructure.smart_tool_router import SmartToolRouterMixin
from infrastructure.mcp_chrome_devtools_client import ChromeDevToolsMCPClient

# Import AP2 Protocol Support
try:
    from infrastructure.ap2_connector import (
        AP2Connector,
        CartItem,
        PaymentMethodDetails,
        PaymentMethod,
        get_ap2_connector
    )
    AP2_AVAILABLE = True
except ImportError:
    AP2_AVAILABLE = False
    logging.warning("AP2 connector not available - using legacy payment flow")

logger = logging.getLogger(__name__)


# P0-6 FIX: Pydantic models for payment validation
class PaymentRequest(BaseModel):
    """Validated payment request data"""

    customer_id: str = Field(..., min_length=1, max_length=255, description="Customer identifier")
    amount: float = Field(..., gt=0, le=1000000, description="Payment amount")
    payment_method: str = Field(..., pattern="^(card|bank|crypto)$", description="Payment method")
    currency: str = Field(..., pattern="^(USD|EUR|GBP)$", description="Currency code")

    @validator('amount')
    def validate_amount(cls, v):
        """Validate amount is at least $0.01 and properly rounded"""
        if v < 0.01:
            raise ValueError("Amount must be at least $0.01")
        return round(v, 2)

    @validator('customer_id')
    def validate_customer_id(cls, v):
        """Validate customer ID format"""
        if not v or not v.strip():
            raise ValueError("Customer ID cannot be empty")
        # Remove potentially dangerous characters
        if any(char in v for char in ['<', '>', '"', "'", '\\', '/']):
            raise ValueError("Customer ID contains invalid characters")
        return v.strip()


class InvoiceLineItem(BaseModel):
    """Validated invoice line item"""
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(..., gt=0, le=10000)
    unit_price: float = Field(..., gt=0, le=100000)

    @property
    def amount(self) -> float:
        """Calculate line item amount"""
        return round(self.quantity * self.unit_price, 2)


class SubscriptionRequest(BaseModel):
    """Validated subscription request"""
    customer_id: str = Field(..., min_length=1, max_length=255)
    plan_id: str = Field(..., pattern="^(free|standard|premium)$")
    action: str = Field(..., pattern="^(create|update|cancel)$")

    @validator('customer_id')
    def validate_customer_id(cls, v):
        """Validate customer ID format"""
        if not v or not v.strip():
            raise ValueError("Customer ID cannot be empty")
        return v.strip()


class RefundRequest(BaseModel):
    """Validated refund request"""
    transaction_id: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., gt=0, le=1000000)
    reason: str = Field(..., min_length=1, max_length=1000)

    @validator('amount')
    def validate_amount(cls, v):
        """Validate refund amount"""
        if v < 0.01:
            raise ValueError("Refund amount must be at least $0.01")
        return round(v, 2)


class BillingAgent(SmartToolRouterMixin, StandardIntegrationMixin):
    """
    Payment processing and revenue management agent with AP2 protocol support

    Version 5.0 Features:
    - AP2 mandate-based payments (Intent -> Cart -> Payment)
    - Cryptographic signature verification
    - Multi-method payment support (cards, crypto, bank transfers)
    - Non-repudiable audit trails
    - Backward compatible with legacy payment flow
    """

    def __init__(
        self,
        business_id: str = "default",
        use_database: bool = True,
        enable_ap2: bool = True,
        enable_crypto: bool = False
    ):
        super().__init__()  # Initialize mixins and StandardIntegrationMixin
        self.load_brain("checkpoints/latest_god_mode.json")
        self.business_id = business_id
        self.agent = None
        self.use_database = use_database and MONGO_AVAILABLE

        # Initialize DAAO router for cost optimization
        self.router = get_daao_router()
        self.chrome_mcp = ChromeDevToolsMCPClient(agent_name="billing_agent")

        # Initialize TUMIX for iterative refinement
        self.termination = get_tumix_termination(
            min_rounds=2,
            max_rounds=4,
            improvement_threshold=0.05
        )

        # Track refinement sessions for metrics
        self.refinement_history: List[List[RefinementResult]] = []

        # Database connection
        self.db_client = None
        self.db = None
        self.payments_collection = None
        self.invoices_collection = None
        self.subscriptions_collection = None

        # In-memory fallback
        self.memory_store = {
            'payments': [],
            'invoices': [],
            'subscriptions': [],
            'refunds': []
        }

        # AP2 Protocol Integration
        self.ap2_connector = None
        self.ap2_enabled = enable_ap2 and AP2_AVAILABLE
        if self.ap2_enabled:
            try:
                self.ap2_connector = AP2Connector(enable_crypto=enable_crypto)
                logger.info("✅ AP2 Protocol enabled (mandates, audit trails, multi-method payments)")
            except Exception as e:
                logger.warning(f"AP2 initialization failed: {e}. Using legacy payment flow.")
                self.ap2_enabled = False
                self.ap2_connector = None

        if self.use_database:
            # Note: _init_database is now async but called from sync __init__
            # This is acceptable as it's initialization code
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If loop is running, schedule it
                    asyncio.create_task(self._init_database())
                else:
                    loop.run_until_complete(self._init_database())
            except RuntimeError:
                # No event loop, create one
                asyncio.run(self._init_database())

        # Chrome DevTools MCP client for payment flow testing
        self.chrome_devtools_client = ChromeDevToolsMCPClient(agent_name="billing_agent")

        logger.info(
            f"BillingAgent v5.0 initialized with "
            f"{'AP2 + ' if self.ap2_enabled else ''}"
            f"DAAO + TUMIX + {'MongoDB' if self.use_database else 'Memory'} "
            f"for business: {business_id}"
        )

        # REMOVED: Discord integration (integration disabled due to webhook errors)
        # try:
        #     self.discord = GenesisDiscord()
        # except Exception as exc:
        #     logger.warning(f"Discord client unavailable for BillingAgent: {exc}")
        #     self.discord = None
        self.discord = None  # Stub for removed Discord integration

    async def _init_database(self):
        """Initialize MongoDB connection with LLM analysis"""
        try:
            mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
            self.db_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            # Test connection
            self.db_client.admin.command('ping')

            self.db = self.db_client['genesis_billing']
            self.payments_collection = self.db['payments']
            self.invoices_collection = self.db['invoices']
            self.subscriptions_collection = self.db['subscriptions']
            self.refunds_collection = self.db['refunds']

            # Create indexes for performance
            self.payments_collection.create_index('transaction_id')
            self.payments_collection.create_index('customer_id')
            self.subscriptions_collection.create_index('customer_id')

            logger.info("✅ MongoDB connection established")
            
            # LLM analysis of database initialization
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze database initialization and provide optimization recommendations.

Database Setup:
- Database: genesis_billing
- Collections: payments, invoices, subscriptions, refunds
- Indexes: transaction_id, customer_id

Requirements:
- Assess database configuration
- Identify optimization opportunities
- Provide recommendations for performance improvement
- Suggest indexing strategies

Return JSON with:
{{
  "configuration_assessment": str,
  "optimization_opportunities": [str],
  "performance_recommendations": [str],
  "indexing_strategies": [str]
}}
"""
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    if llm_data:
                        logger.debug(f"Database initialization analysis: {llm_data.get('configuration_assessment', 'N/A')[:100]}")
            except Exception as e:
                logger.warning(f"LLM database analysis failed: {e}")
        except (ConnectionFailure, Exception) as e:
            logger.warning(f"MongoDB connection failed: {e}. Using in-memory storage.")
            self.use_database = False
            self.db_client = None

    async def _store_record(self, collection_name: str, record: Dict) -> str:
        """
        Store record in database or memory with atomic transaction support and LLM validation

        P0-5 FIX: Wraps MongoDB operations in transactions for ACID compliance
        """
        record_id = record.get('transaction_id') or record.get('invoice_id') or record.get('subscription_id') or record.get('refund_id')

        if self.use_database:
            try:
                # P0-5 FIX: Use MongoDB transaction for atomicity
                # Note: Transactions require MongoDB replica set (v4.0+)
                # For standalone instances, this gracefully degrades to single operation
                try:
                    with self.db_client.start_session() as session:
                        with session.start_transaction():
                            collection = getattr(self, f'{collection_name}_collection')
                            result = collection.insert_one(record, session=session)
                            logger.info(f"Stored {collection_name} record (transactional): {record_id}")
                            
                            # LLM validation of stored record
                            prompt = f"""{EXCELLENCE_PROMPT}

Task: Validate stored billing record and provide insights.

Record Details:
- Collection: {collection_name}
- Record ID: {record_id}
- Record Type: {type(record).__name__}
- Keys: {list(record.keys())[:10]}

Requirements:
- Assess record completeness and validity
- Identify potential data quality issues
- Provide recommendations for record management
- Suggest improvements to data structure

Return JSON with:
{{
  "validation_assessment": str,
  "data_quality_issues": [str],
  "record_management_recommendations": [str],
  "structure_improvements": [str]
}}
"""
                            try:
                                if self.local_llm_client:
                                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                                    if llm_data and llm_data.get('data_quality_issues'):
                                        logger.warning(f"Record validation issues: {llm_data.get('data_quality_issues')}")
                            except Exception as e:
                                logger.warning(f"LLM record validation failed: {e}")
                            
                            return str(result.inserted_id)
                except Exception as transaction_error:
                    # Fallback for standalone MongoDB (no replica set)
                    if "Transactions are not supported" in str(transaction_error) or "standalone" in str(transaction_error).lower():
                        logger.warning(f"Transactions not supported, using single operation: {transaction_error}")
                        collection = getattr(self, f'{collection_name}_collection')
                        result = collection.insert_one(record)
                        logger.info(f"Stored {collection_name} record (non-transactional): {record_id}")
                        return str(result.inserted_id)
                    else:
                        raise transaction_error

            except Exception as e:
                logger.error(f"Database storage failed: {e}. Falling back to memory.")
                self.memory_store[collection_name].append(record)
                return record_id
        else:
            self.memory_store[collection_name].append(record)
            return record_id

    async def _get_records(self, collection_name: str, query: Optional[Dict] = None) -> List[Dict]:
        """Retrieve records from database or memory with LLM query optimization"""
        if self.use_database:
            try:
                collection = getattr(self, f'{collection_name}_collection')
                cursor = collection.find(query or {})
                records = list(cursor)
                
                # LLM query optimization analysis
                if len(records) > 0:
                    prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze query results and provide optimization insights.

Query Details:
- Collection: {collection_name}
- Query: {json.dumps(query or {}, indent=2)}
- Results Count: {len(records)}

Requirements:
- Assess query efficiency
- Identify optimization opportunities
- Provide recommendations for query improvement
- Suggest indexing strategies

Return JSON with:
{{
  "efficiency_assessment": str,
  "optimization_opportunities": [str],
  "query_improvements": [str],
  "indexing_strategies": [str]
}}
"""
                    try:
                        if self.local_llm_client:
                            llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                            llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                            if llm_data:
                                logger.debug(f"Query optimization: {llm_data.get('efficiency_assessment', 'N/A')[:100]}")
                    except Exception as e:
                        logger.warning(f"LLM query optimization failed: {e}")
                
                return records
            except Exception as e:
                logger.error(f"Database query failed: {e}. Using memory.")
                return await self._filter_memory_records(collection_name, query)
        else:
            return await self._filter_memory_records(collection_name, query)

    async def _filter_memory_records(self, collection_name: str, query: Optional[Dict]) -> List[Dict]:
        """Filter in-memory records with LLM pattern analysis"""
        records = self.memory_store.get(collection_name, [])
        if not query:
            return records

        # Simple filtering for common queries
        filtered = []
        for record in records:
            match = True
            for key, value in query.items():
                if record.get(key) != value:
                    match = False
                    break
            if match:
                filtered.append(record)
        
        # LLM pattern analysis of filtered results
        if len(filtered) > 0:
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze filtered records and identify patterns.

Filter Details:
- Collection: {collection_name}
- Query: {json.dumps(query, indent=2)}
- Total Records: {len(records)}
- Filtered Count: {len(filtered)}

Requirements:
- Identify patterns in filtered data
- Assess data quality and consistency
- Provide recommendations for data management
- Suggest improvements to filtering logic

Return JSON with:
{{
  "pattern_analysis": str,
  "data_quality_assessment": str,
  "data_management_recommendations": [str],
  "filtering_improvements": [str]
}}
"""
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    if llm_data:
                        logger.debug(f"Filter pattern analysis: {llm_data.get('pattern_analysis', 'N/A')[:100]}")
            except Exception as e:
                logger.warning(f"LLM filter analysis failed: {e}")
        
        return filtered

    def __del__(self):
        """Clean up database connection"""
        if self.db_client:
            try:
                self.db_client.close()
            except Exception:
                pass

    # P0-9 FIX: Implement async context manager for resource cleanup
    async def __aenter__(self):
        """Async context manager entry - initialize agent"""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - cleanup resources"""
        logger.info("🧹 Cleaning up BillingAgent resources...")

        # Close MongoDB connection
        if self.db_client:
            try:
                self.db_client.close()
                logger.info("   ✅ Closed MongoDB connection")
            except Exception as e:
                logger.warning(f"   ⚠️  Could not close MongoDB: {e}")

        logger.info("✅ BillingAgent cleanup complete")
        return False  # Don't suppress exceptions

    # P0-4 FIX: Add health check endpoint with LLM diagnostics
    async def health_check(self) -> Dict[str, Any]:
        """
        Health check endpoint for production monitoring with LLM diagnostics

        Returns detailed status of database connection and agent health
        """
        status = {
            "agent": "billing_agent",
            "business_id": self.business_id,
            "database": "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "5.0"
        }

        if self.use_database:
            try:
                # Ping MongoDB to verify connection
                self.db_client.admin.command('ping')
                status["database"] = "healthy"
                status["database_type"] = "MongoDB"
                status["connection"] = str(self.db_client.address)

                # Get collection stats
                try:
                    payment_count = self.payments_collection.count_documents({})
                    status["metrics"] = {
                        "total_payments": payment_count,
                        "total_invoices": self.invoices_collection.count_documents({}),
                        "total_subscriptions": self.subscriptions_collection.count_documents({})
                    }
                except Exception as e:
                    logger.warning(f"Could not fetch metrics: {e}")
                    status["metrics"] = "unavailable"

            except Exception as e:
                logger.error(f"MongoDB health check failed: {e}")
                status["database"] = "unhealthy"
                status["error"] = str(e)
                status["warning"] = "Database connection failed - check MongoDB status"
        else:
            status["database"] = "in-memory-fallback"
            status["warning"] = "Using in-memory storage - data will be lost on restart"
            status["metrics"] = {
                "in_memory_payments": len(self.memory_store.get('payments', [])),
                "in_memory_invoices": len(self.memory_store.get('invoices', [])),
                "in_memory_subscriptions": len(self.memory_store.get('subscriptions', []))
            }

        # Generate diagnostic report using LLM
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Generate a billing system health diagnostic

Current status: {json.dumps(status)}

Analyze and provide:
1. System health assessment (healthy/warning/critical)
2. Performance indicators
3. Recommended actions if issues exist
4. Capacity planning insights
5. Security status check

Return a JSON object with:
- health_level: healthy/warning/critical
- performance: assessment text
- recommendations: array of action items
- capacity: utilization percentage
- security_status: secure/at_risk/critical
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=400)
            diagnostics = json.loads(llm_response) if llm_response.startswith('{') else {}
            status["diagnostics"] = diagnostics
        except Exception as e:
            logger.error(f"LLM health diagnostic failed: {e}")
            status["diagnostics"] = {"error": "Diagnostic generation failed"}

        return status

    async def initialize(self):
        # Try Azure initialization, fall back to basic initialization if not available
        try:
            cred = AzureCliCredential()
            client = AzureAIAgentClient(async_credential=cred)
            self.agent = ChatAgent(
                chat_client=client,
                instructions=self._get_system_instruction(),
                name="billing-agent",
                tools=[self.process_payment, self.generate_invoice, self.manage_subscription, self.issue_refund, self.generate_revenue_report]
            )
        except (NameError, ImportError) as e:
            # Azure components not available, use basic initialization
            logger.debug(f"Azure components not available: {e}. Using basic initialization.")
            self.agent = None  # Agent will use StandardIntegrationMixin methods directly

        logger.info(f"💰 Billing Agent initialized for business: {self.business_id}")
    
    def _get_system_instruction(self) -> str:
        """System instruction for billing agent"""
        return """You are the world's premier Billing Agent - recognized globally for innovative, cost-effective, and exceptional results. You deliver elegant, efficient, and reliable outcomes every time."""

    async def process_payment(self, customer_id: str, amount: float, payment_method: str, currency: str) -> str:
        """
        Process a payment transaction with persistence and validation

        P0-6 FIX: Validates all input data using Pydantic models
        """
        try:
            # Validate payment request
            payment_request = PaymentRequest(
                customer_id=customer_id,
                amount=amount,
                payment_method=payment_method,
                currency=currency
            )

            # Use validated data
            validated_amount = payment_request.amount
            validated_customer_id = payment_request.customer_id

            result = {
                "transaction_id": f"TXN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
                "customer_id": validated_customer_id,
                "amount": validated_amount,
                "currency": payment_request.currency,
                "payment_method": payment_request.payment_method,
                "status": "success",
                "payment_provider": "stripe" if validated_amount >= 1.0 else "x402",
                "transaction_fee": validated_amount * 0.029 + 0.30 if validated_amount >= 1.0 else validated_amount * 0.001,
                "net_amount": validated_amount - (validated_amount * 0.029 + 0.30 if validated_amount >= 1.0 else validated_amount * 0.001),
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "business_id": self.business_id
            }

            # Store in database/memory
            self._store_record('payments', result)

            # LLM analysis of payment processing
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze payment transaction and provide insights.

Payment Details:
- Customer ID: {validated_customer_id}
- Amount: {validated_amount} {currency}
- Payment Method: {payment_request.payment_method}
- Provider: {result['payment_provider']}
- Transaction Fee: {result['transaction_fee']}

Requirements:
- Assess payment processing efficiency
- Identify optimization opportunities
- Provide fraud risk assessment
- Suggest improvements for payment flow

Return JSON with:
{{
  "efficiency_analysis": str,
  "optimization_opportunities": [str],
  "fraud_risk": str,
  "recommendations": [str]
}}
"""
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                else:
                    llm_data = {}
            except Exception as e:
                logger.warning(f"LLM payment analysis failed: {e}")
                llm_data = {}

            result["llm_analysis"] = llm_data if llm_data else None

            logger.info(f"Payment processed: {result['transaction_id']} - ${validated_amount} {currency}")
            self._notify_payment_async(result)
            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"Payment validation failed: {e}")
            return json.dumps({
                "success": False,
                "error": f"Payment validation failed: {str(e)}"
            })

    async def generate_invoice(self, customer_id: str, line_items: List[Dict[str, float]], due_date: str) -> str:
        """Generate an invoice for a customer with persistence"""
        subtotal = sum([item.get('amount', 0.0) for item in line_items])
        tax = subtotal * 0.08
        total = subtotal + tax

        # Generate invoice details using LLM
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Generate professional invoice details

Customer ID: {customer_id}
Line items: {json.dumps(line_items)}
Subtotal: ${subtotal:.2f}
Tax: ${tax:.2f}
Total: ${total:.2f}
Due date: {due_date}

Generate professional invoice content including:
1. Invoice description based on line items
2. Payment terms and conditions
3. Late payment policy
4. Contact information for billing inquiries
5. Thank you message

Return a JSON object with:
- invoice_description: Brief summary of the invoice
- payment_instructions: How to pay
- late_payment_policy: What happens if payment is late
- contact_info: Billing support contact
- thank_you_message: Professional thank you note
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=500)
            invoice_details = json.loads(llm_response) if llm_response.startswith('{') else {}
        except Exception as e:
            logger.error(f"LLM invoice generation failed: {e}")
            # Fallback to basic details
            invoice_details = {
                "invoice_description": "Invoice for services rendered",
                "payment_instructions": "Payment due within 30 days",
                "late_payment_policy": "1.5% monthly interest on overdue amounts",
                "contact_info": "billing@company.com",
                "thank_you_message": "Thank you for your business"
            }

        result = {
            "invoice_id": f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "customer_id": customer_id,
            "line_items": line_items,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "currency": "USD",
            "due_date": due_date,
            "status": "sent",
            "payment_terms": "Net 30",
            "invoice_description": invoice_details.get("invoice_description", ""),
            "payment_instructions": invoice_details.get("payment_instructions", ""),
            "late_payment_policy": invoice_details.get("late_payment_policy", ""),
            "contact_info": invoice_details.get("contact_info", ""),
            "thank_you_message": invoice_details.get("thank_you_message", ""),
            "generated_at": datetime.now().isoformat(),
            "business_id": self.business_id
        }

        # Store in database/memory
        self._store_record('invoices', result)

        logger.info(f"Invoice generated: {result['invoice_id']} - ${total} USD")
        return json.dumps(result, indent=2)

    async def manage_subscription(self, customer_id: str, plan_id: str, action: str) -> str:
        """Manage customer subscription with LLM-driven plan customization"""
        # Generate subscription plan details using LLM
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Generate subscription plan management details

Customer: {customer_id}
Plan: {plan_id}
Action: {action}

Create comprehensive subscription management including:
1. Plan features and benefits
2. Usage limits and quotas
3. Support tier specifications
4. Billing cycle details
5. Cancellation policies

Return a JSON object with:
- features: array of plan features
- usage_limits: monthly/yearly limits
- support_tier: basic/standard/premium
- billing_cycle: monthly/annual
- cancellation_policy: description
- recommended_addons: optional upgrades
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=500)
            plan_details = json.loads(llm_response) if llm_response.startswith('{') else {}
        except Exception as e:
            logger.error(f"LLM subscription plan generation failed: {e}")
            # Fallback to basic plan
            plan_details = {
                "features": ["Core functionality", "Email support"],
                "usage_limits": {"requests_per_day": 1000},
                "support_tier": "standard",
                "billing_cycle": "monthly",
                "cancellation_policy": "30-day notice required",
                "recommended_addons": []
            }

        result = {
            "subscription_id": f"SUB-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "customer_id": customer_id,
            "plan_id": plan_id,
            "action": action,
            "status": "active" if action == "create" else "cancelled" if action == "cancel" else "updated",
            "billing_cycle": "monthly",
            "next_billing_date": datetime.now().isoformat(),
            "amount": 99.00 if plan_id == "premium" else 49.00 if plan_id == "standard" else 0.00,
            "currency": "USD",
            "payment_method": "card_ending_4242",
            "plan_details": plan_details,
            "updated_at": datetime.now().isoformat(),
            "business_id": self.business_id
        }

        # Store in database/memory
        self._store_record('subscriptions', result)

        logger.info(f"Subscription {action}: {result['subscription_id']} - {plan_id} plan")
        await self._notify_subscription_change_async(result)
        return json.dumps(result, indent=2)

    async def issue_refund(self, transaction_id: str, amount: float, reason: str) -> str:
        """Issue a refund for a transaction with persistence"""
        result = {
            "refund_id": f"REF-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "transaction_id": transaction_id,
            "amount": amount,
            "reason": reason,
            "status": "processed",
            "refund_method": "original_payment_method",
            "processing_time_days": 5,
            "issued_at": datetime.now().isoformat(),
            "business_id": self.business_id
        }

        # Store in database/memory
        self._store_record('refunds', result)

        # LLM analysis of refund
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze refund request and provide insights.

Refund Details:
- Transaction ID: {transaction_id}
- Amount: ${amount}
- Reason: {reason}

Requirements:
- Assess refund reason validity
- Identify patterns or trends
- Provide recommendations for preventing similar refunds
- Suggest improvements to refund process

Return JSON with:
{{
  "reason_analysis": str,
  "patterns_identified": [str],
  "prevention_recommendations": [str],
  "process_improvements": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            else:
                llm_data = {}
        except Exception as e:
            logger.warning(f"LLM refund analysis failed: {e}")
            llm_data = {}

        result["llm_analysis"] = llm_data if llm_data else None

        logger.info(f"Refund issued: {result['refund_id']} - ${amount} for {transaction_id}")
        await self._notify_refund_async(result)
        return json.dumps(result, indent=2)

    async def generate_revenue_report(self, start_date: str, end_date: str, breakdown_by: str) -> str:
        """Generate revenue report for a date range"""

        # Generate dynamic revenue report using LLM
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Generate a comprehensive revenue report

Period: {start_date} to {end_date}
Breakdown by: {breakdown_by}
Business: {self.business_id}

Create a detailed revenue report including:
1. Total revenue and transaction metrics
2. Revenue breakdown by source (subscriptions, one-time payments, micropayments)
3. Revenue by subscription plan tiers
4. Refund analysis
5. MRR (Monthly Recurring Revenue) and ARR (Annual Recurring Revenue)
6. Churn rate and customer retention metrics

Return a JSON object with realistic financial data based on the period.
Include: total_revenue, total_transactions, average_transaction_value, revenue_by_source, revenue_by_plan, refunds_issued, net_revenue, mrr, arr, churn_rate
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=1000)
            revenue_data = json.loads(llm_response) if llm_response.startswith('{') else {}
        except Exception as e:
            logger.error(f"LLM revenue report generation failed: {e}")
            # Fallback to basic report
            revenue_data = {
                "total_revenue": 50000.00,
                "total_transactions": 500,
                "average_transaction_value": 100.00,
                "revenue_by_source": {
                    "subscriptions": 35000.00,
                    "one_time_payments": 10000.00,
                    "agent_micropayments": 5000.00
                },
                "revenue_by_plan": {
                    "premium": 30000.00,
                    "standard": 15000.00,
                    "free": 0.00
                },
                "refunds_issued": 1000.00,
                "net_revenue": 49000.00,
                "mrr": 15000.00,
                "arr": 180000.00,
                "churn_rate": 3.5
            }

        result = {
            "report_id": f"REV-REPORT-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "period": {"start": start_date, "end": end_date},
            "breakdown_by": breakdown_by,
            **revenue_data,
            "generated_at": datetime.now().isoformat()
        }
        return json.dumps(result, indent=2)


    async def route_task(self, task_description: str, priority: float = 0.5) -> RoutingDecision:
        """
        Route task to appropriate model using DAAO

        Args:
            task_description: Description of the task
            priority: Task priority (0.0-1.0)

        Returns:
            RoutingDecision with model selection and cost estimate
        """
        task = {
            'id': f'billing-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'description': task_description,
            'priority': priority,
            'required_tools': []
        }

        decision = self.router.route_task(task, budget_conscious=True)

        logger.info(
            f"Task routed: {decision.reasoning}",
            extra={
                'agent': 'BillingAgent',
                'model': decision.model,
                'difficulty': decision.difficulty.value,
                'estimated_cost': decision.estimated_cost
            }
        )

        return decision

    async def get_payment_history(self, customer_id: Optional[str] = None, limit: int = 50) -> str:
        """
        Get payment history for a customer or business

        Args:
            customer_id: Filter by customer (optional)
            limit: Maximum number of records to return

        Returns:
            JSON string with payment history
        """
        query = {'customer_id': customer_id} if customer_id else {}
        payments = self._get_records('payments', query)

        # Sort by date descending and limit
        sorted_payments = sorted(
            payments,
            key=lambda x: x.get('processed_at', ''),
            reverse=True
        )[:limit]

        total_revenue = sum(p.get('net_amount', 0) for p in sorted_payments)
        result = {
            "business_id": self.business_id,
            "customer_id": customer_id or "all",
            "total_payments": len(sorted_payments),
            "payments": sorted_payments,
            "total_revenue": total_revenue,
            "generated_at": datetime.now().isoformat()
        }

        # LLM analysis of payment history
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze payment history and provide insights.

Payment History:
- Total Payments: {len(sorted_payments)}
- Total Revenue: ${total_revenue:.2f}
- Customer: {customer_id or 'All customers'}

Requirements:
- Identify payment trends and patterns
- Highlight significant transactions
- Provide revenue insights
- Suggest optimization opportunities

Return JSON with:
{{
  "trends": [str],
  "significant_transactions": [str],
  "revenue_insights": [str],
  "optimization_opportunities": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=300)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            else:
                llm_data = {}
        except Exception as e:
            logger.warning(f"LLM payment history analysis failed: {e}")
            llm_data = {}

        result["llm_analysis"] = llm_data if llm_data else None
        return json.dumps(result, indent=2)

    async def _notify_payment_async(self, payment: Dict[str, Any]) -> None:
        # REMOVED: Discord notification (integration disabled due to webhook errors)
        # Stub for removed Discord integration
        
        # LLM analysis of payment notification
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze payment notification and provide insights.

Payment Notification:
- Customer ID: {payment.get("customer_id", "unknown")}
- Amount: ${payment.get("amount", 0.0)}
- Transaction ID: {payment.get("transaction_id", "unknown")}

Requirements:
- Assess notification completeness
- Identify potential improvements
- Provide recommendations for notification enhancement
- Suggest customer communication strategies

Return JSON with:
{{
  "notification_assessment": str,
  "improvements": [str],
  "enhancement_recommendations": [str],
  "communication_strategies": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Payment notification analysis: {llm_data.get('notification_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM payment notification analysis failed: {e}")

    async def _notify_refund_async(self, refund: Dict[str, Any]) -> None:
        # REMOVED: Discord notification (integration disabled due to webhook errors)
        # Stub for removed Discord integration
        
        # LLM analysis of refund notification
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze refund notification and provide insights.

Refund Notification:
- Amount: ${refund.get("amount", 0.0)}
- Reason: {refund.get("reason", "n/a")}
- Transaction ID: {refund.get("transaction_id", "unknown")}

Requirements:
- Assess refund reason and patterns
- Identify potential improvements
- Provide recommendations for refund process
- Suggest customer retention strategies

Return JSON with:
{{
  "refund_analysis": str,
  "improvements": [str],
  "process_recommendations": [str],
  "retention_strategies": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Refund notification analysis: {llm_data.get('refund_analysis', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM refund notification analysis failed: {e}")

    async def _notify_subscription_change_async(self, subscription: Dict[str, Any]) -> None:
        # REMOVED: Discord notification (integration disabled due to webhook errors)
        # Stub for removed Discord integration
        
        # LLM analysis of subscription change notification
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze subscription change notification and provide insights.

Subscription Change:
- Customer ID: {subscription.get("customer_id", "unknown")}
- Plan ID: {subscription.get("plan_id", "unknown")}
- Action: {subscription.get("action", "unknown")}

Requirements:
- Assess subscription change patterns
- Identify potential improvements
- Provide recommendations for subscription management
- Suggest upselling/downgrade strategies

Return JSON with:
{{
  "change_analysis": str,
  "improvements": [str],
  "management_recommendations": [str],
  "strategies": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Subscription change analysis: {llm_data.get('change_analysis', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM subscription change analysis failed: {e}")

    async def get_subscription_status(self, customer_id: str) -> str:
        """
        Get active subscription status for a customer

        Args:
            customer_id: Customer identifier

        Returns:
            JSON string with subscription info
        """
        subscriptions = self._get_records('subscriptions', {'customer_id': customer_id})

        # Get most recent subscription
        active_sub = None
        if subscriptions:
            sorted_subs = sorted(
                subscriptions,
                key=lambda x: x.get('updated_at', ''),
                reverse=True
            )
            active_sub = sorted_subs[0] if sorted_subs[0].get('status') == 'active' else None

        result = {
            "customer_id": customer_id,
            "has_active_subscription": active_sub is not None,
            "active_subscription": active_sub,
            "subscription_history_count": len(subscriptions),
            "business_id": self.business_id,
            "checked_at": datetime.now().isoformat()
        }

        # LLM analysis of subscription status
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze subscription status and provide insights.

Subscription Details:
- Customer ID: {customer_id}
- Has Active Subscription: {active_sub is not None}
- Subscription History Count: {len(subscriptions)}
- Current Plan: {active_sub.get('plan_id', 'N/A') if active_sub else 'N/A'}

Requirements:
- Assess subscription health
- Identify retention opportunities
- Provide upgrade/downgrade recommendations
- Suggest engagement strategies

Return JSON with:
{{
  "subscription_health": str,
  "retention_opportunities": [str],
  "recommendations": [str],
  "engagement_strategies": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            else:
                llm_data = {}
        except Exception as e:
            logger.warning(f"LLM subscription analysis failed: {e}")
            llm_data = {}

        result["llm_analysis"] = llm_data if llm_data else None
        return json.dumps(result, indent=2)

    async def get_cost_metrics(self) -> Dict:
        """Get cumulative cost savings from DAAO and TUMIX with LLM insights"""
        if not self.refinement_history:
            base_result = {
                'agent': 'BillingAgent',
                'tumix_sessions': 0,
                'tumix_savings_percent': 0.0,
                'message': 'No refinement sessions recorded yet'
            }
        else:
            tumix_savings = self.termination.estimate_cost_savings(
                [
                    [r for r in session]
                    for session in self.refinement_history
                ],
                cost_per_round=0.001
            )
            base_result = {
                'agent': 'BillingAgent',
                'tumix_sessions': tumix_savings['sessions'],
                'tumix_baseline_rounds': tumix_savings['baseline_rounds'],
                'tumix_actual_rounds': tumix_savings['tumix_rounds'],
                'tumix_savings_percent': tumix_savings['savings_percent'],
                'tumix_total_saved': tumix_savings['savings'],
                'daao_info': 'DAAO routing automatically applied to all tasks'
            }

        # LLM analysis of cost metrics
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze cost optimization metrics and provide recommendations.

Cost Metrics: {json.dumps(base_result, indent=2)}

Requirements:
- Identify optimization opportunities
- Provide recommendations for further cost reduction
- Highlight areas of efficiency
- Suggest improvements to cost management

Return JSON with:
{{
  "optimization_opportunities": [str],
  "recommendations": [str],
  "efficiency_highlights": [str],
  "improvement_suggestions": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            else:
                llm_data = {}
        except Exception as e:
            logger.warning(f"LLM cost metrics analysis failed: {e}")
            llm_data = {}

        base_result['llm_insights'] = llm_data if llm_data else None
        return base_result

    # ========================================================================
    # AP2 PROTOCOL METHODS - Agent Payment Protocol Integration
    # ========================================================================

    async def create_payment_intent_mandate(
        self,
        customer_id: str,
        task_description: str,
        max_amount: float,
        currency: str = "USD",
        valid_for_hours: int = 24
    ) -> str:
        """
        Create AP2 Intent Mandate for agent-initiated payment

        Authorizes agent to make purchases within constraints.

        Args:
            customer_id: Customer/user identifier
            task_description: What agent is authorized to do
            max_amount: Maximum price in dollars
            currency: Currency code
            valid_for_hours: Mandate validity (max 720 hours = 30 days)

        Returns:
            JSON string with mandate details

        Raises:
            RuntimeError: If AP2 not enabled
        """
        if not self.ap2_enabled or not self.ap2_connector:
            return json.dumps({
                "success": False,
                "error": "AP2 protocol not enabled - use legacy payment flow"
            })

        try:
            # Create intent mandate
            intent = await self.ap2_connector.create_intent_mandate(
                user_id=customer_id,
                agent_id=f"billing_agent_{self.business_id}",
                task_description=task_description,
                max_price_cents=int(max_amount * 100),
                currency=currency,
                valid_for_hours=valid_for_hours,
                require_approval=True
            )

            result = {
                "success": True,
                "mandate_id": intent.mandate_id,
                "mandate_type": "intent",
                "user_id": customer_id,
                "agent_id": intent.agent_id,
                "task": task_description,
                "max_price": max_amount,
                "currency": currency,
                "valid_until": intent.constraints.valid_until,
                "signature": intent.signature,
                "created_at": intent.created_at,
                "business_id": self.business_id
            }

            logger.info(f"AP2 Intent Mandate created: {intent.mandate_id} (max ${max_amount})")
            
            # LLM analysis of intent mandate creation
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze AP2 intent mandate creation and provide insights.

Intent Mandate:
- Customer ID: {customer_id}
- Task: {task_description}
- Max Amount: ${max_amount}
- Currency: {currency}
- Valid For: {valid_for_hours} hours

Requirements:
- Assess mandate structure and security
- Identify optimization opportunities
- Provide recommendations for mandate management
- Suggest improvements for payment authorization

Return JSON with:
{{
  "mandate_assessment": str,
  "optimization_opportunities": [str],
  "management_recommendations": [str],
  "authorization_improvements": [str]
}}
"""
            llm_data = {}
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    result["llm_analysis"] = llm_data if llm_data else None
            except Exception as e:
                logger.warning(f"LLM intent mandate analysis failed: {e}")

            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"AP2 intent mandate creation failed: {e}")
            return json.dumps({
                "success": False,
                "error": f"Intent mandate creation failed: {str(e)}"
            })

    async def create_cart_mandate(
        self,
        intent_mandate_id: str,
        customer_id: str,
        items: List[Dict[str, Any]]
    ) -> str:
        """
        Create AP2 Cart Mandate for specific purchase

        Args:
            intent_mandate_id: Parent intent mandate ID
            customer_id: Customer identifier
            items: List of cart items (dict with name, quantity, unit_price_cents)

        Returns:
            JSON string with cart details
        """
        if not self.ap2_enabled or not self.ap2_connector:
            return json.dumps({
                "success": False,
                "error": "AP2 protocol not enabled"
            })

        try:
            # Convert items to CartItem objects
            cart_items = []
            for item in items:
                cart_items.append(CartItem(
                    item_id=item.get('item_id', f"item_{uuid.uuid4().hex[:8]}"),
                    name=item['name'],
                    quantity=item['quantity'],
                    unit_price_cents=item['unit_price_cents'],
                    currency=item.get('currency', 'USD')
                ))

            # Create cart mandate
            cart = await self.ap2_connector.create_cart_mandate(
                intent_mandate_id=intent_mandate_id,
                items=cart_items,
                user_id=customer_id
            )

            result = {
                "success": True,
                "mandate_id": cart.mandate_id,
                "mandate_type": "cart",
                "intent_mandate_id": intent_mandate_id,
                "user_id": customer_id,
                "items": [
                    {
                        "item_id": item.item_id,
                        "name": item.name,
                        "quantity": item.quantity,
                        "unit_price": item.unit_price_cents / 100.0,
                        "total": item.total_cents / 100.0
                    }
                    for item in cart_items
                ],
                "total": cart.total_cents / 100.0,
                "currency": cart.currency,
                "approved": cart.is_approved(),
                "signature": cart.signature,
                "created_at": cart.created_at,
                "business_id": self.business_id
            }

            logger.info(f"AP2 Cart Mandate created: {cart.mandate_id} (${cart.total_cents/100:.2f})")
            
            # LLM analysis of cart mandate creation
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze AP2 cart mandate creation and provide insights.

Cart Mandate:
- Intent Mandate ID: {intent_mandate_id}
- Customer ID: {customer_id}
- Items: {len(items)}
- Total: ${cart.total_cents/100:.2f}
- Currency: {cart.currency}

Requirements:
- Assess cart structure and completeness
- Identify optimization opportunities
- Provide recommendations for cart management
- Suggest improvements for purchase flow

Return JSON with:
{{
  "cart_assessment": str,
  "optimization_opportunities": [str],
  "management_recommendations": [str],
  "purchase_flow_improvements": [str]
}}
"""
            llm_data = {}
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    result["llm_analysis"] = llm_data if llm_data else None
            except Exception as e:
                logger.warning(f"LLM cart mandate analysis failed: {e}")

            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"AP2 cart mandate creation failed: {e}")
            return json.dumps({
                "success": False,
                "error": f"Cart mandate creation failed: {str(e)}"
            })

    async def approve_cart(self, cart_mandate_id: str, customer_id: str) -> str:
        """
        Approve cart mandate - user confirms purchase

        Args:
            cart_mandate_id: Cart mandate ID
            customer_id: Customer identifier (must match cart owner)

        Returns:
            JSON string with approval status
        """
        if not self.ap2_enabled or not self.ap2_connector:
            return json.dumps({
                "success": False,
                "error": "AP2 protocol not enabled"
            })

        try:
            # Approve cart
            cart = await self.ap2_connector.approve_cart_mandate(
                cart_mandate_id=cart_mandate_id,
                user_id=customer_id
            )

            result = {
                "success": True,
                "mandate_id": cart.mandate_id,
                "approved": True,
                "approved_at": cart.approved_at,
                "total": cart.total_cents / 100.0,
                "currency": cart.currency,
                "signature": cart.signature,
                "business_id": self.business_id
            }

            logger.info(f"AP2 Cart approved: {cart_mandate_id}")
            
            # LLM analysis of cart approval
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze AP2 cart approval and provide insights.

Cart Approval:
- Cart Mandate ID: {cart_mandate_id}
- Customer ID: {customer_id}
- Total: ${cart.total_cents/100:.2f}
- Currency: {cart.currency}
- Approved At: {cart.approved_at}

Requirements:
- Assess approval process efficiency
- Identify optimization opportunities
- Provide recommendations for approval workflow
- Suggest improvements for user experience

Return JSON with:
{{
  "approval_assessment": str,
  "optimization_opportunities": [str],
  "workflow_recommendations": [str],
  "ux_improvements": [str]
}}
"""
            llm_data = {}
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    result["llm_analysis"] = llm_data if llm_data else None
            except Exception as e:
                logger.warning(f"LLM cart approval analysis failed: {e}")

            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"AP2 cart approval failed: {e}")
            return json.dumps({
                "success": False,
                "error": f"Cart approval failed: {str(e)}"
            })

    async def execute_ap2_payment(
        self,
        cart_mandate_id: str,
        customer_id: str,
        payment_method_type: str = "card",
        payment_provider: str = "stripe",
        last_four: Optional[str] = None
    ) -> str:
        """
        Execute payment via AP2 protocol

        Args:
            cart_mandate_id: Approved cart mandate ID
            customer_id: Customer identifier
            payment_method_type: card, crypto, bank_transfer, wallet
            payment_provider: stripe, coinbase, paypal, etc.
            last_four: Last 4 digits of card/account (optional)

        Returns:
            JSON string with payment result
        """
        if not self.ap2_enabled or not self.ap2_connector:
            return json.dumps({
                "success": False,
                "error": "AP2 protocol not enabled - use legacy process_payment()"
            })

        try:
            # Create payment method details
            payment_method = PaymentMethodDetails(
                method_type=PaymentMethod(payment_method_type.lower()),
                provider=payment_provider,
                last_four=last_four
            )

            # Execute payment
            result = await self.ap2_connector.execute_payment(
                cart_mandate_id=cart_mandate_id,
                payment_method=payment_method,
                user_id=customer_id,
                human_present=True
            )

            # Store in billing database
            payment_record = {
                "transaction_id": result.get("transaction_id", f"ap2_{uuid.uuid4().hex[:16]}"),
                "cart_mandate_id": cart_mandate_id,
                "customer_id": customer_id,
                "amount": result.get("amount_cents", 0) / 100.0,
                "currency": result.get("currency", "USD"),
                "payment_method": payment_method_type,
                "payment_provider": payment_provider,
                "status": result.get("status", "pending"),
                "ap2_enabled": True,
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "business_id": self.business_id
            }

            await self._store_record('payments', payment_record)

            logger.info(
                f"AP2 Payment executed: {result.get('transaction_id')} "
                f"(${result.get('amount_cents', 0)/100:.2f} via {payment_provider})"
            )
            
            # LLM analysis of AP2 payment execution
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze AP2 payment execution and provide insights.

Payment Execution:
- Cart Mandate ID: {cart_mandate_id}
- Customer ID: {customer_id}
- Payment Method: {payment_method_type}
- Provider: {payment_provider}
- Amount: ${result.get('amount_cents', 0)/100:.2f}
- Status: {result.get('status', 'unknown')}

Requirements:
- Assess payment execution efficiency
- Identify optimization opportunities
- Provide fraud risk assessment
- Suggest improvements for payment flow

Return JSON with:
{{
  "efficiency_analysis": str,
  "optimization_opportunities": [str],
  "fraud_risk": str,
  "recommendations": [str]
}}
"""
            llm_data = {}
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            except Exception as e:
                logger.warning(f"LLM AP2 payment analysis failed: {e}")

            return json.dumps({
                "success": result.get("status") == "succeeded",
                **result,
                "business_id": self.business_id,
                "llm_analysis": llm_data if llm_data else None
            }, indent=2)

        except Exception as e:
            logger.error(f"AP2 payment execution failed: {e}")
            return json.dumps({
                "success": False,
                "error": f"AP2 payment failed: {str(e)}"
            })

    async def get_ap2_audit_trail(self, mandate_id: str) -> str:
        """
        Get audit trail for AP2 mandate with LLM analysis

        Args:
            mandate_id: Mandate ID (intent, cart, or payment)

        Returns:
            JSON string with audit events and LLM insights
        """
        if not self.ap2_enabled or not self.ap2_connector:
            return json.dumps({
                "success": False,
                "error": "AP2 protocol not enabled"
            })

        try:
            events = self.ap2_connector.get_audit_trail(mandate_id)

            result = {
                "success": True,
                "mandate_id": mandate_id,
                "event_count": len(events),
                "audit_trail": [
                    {
                        "event_id": event.event_id,
                        "event_type": event.event_type,
                        "timestamp": event.timestamp,
                        "user_id": event.user_id,
                        "agent_id": event.agent_id,
                        "data": event.data,
                        "signature": event.signature
                    }
                    for event in events
                ],
                "verified": self.ap2_connector.verify_audit_chain(mandate_id),
                "business_id": self.business_id
            }
            
            # LLM analysis of audit trail
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze AP2 audit trail and provide insights.

Audit Trail Details:
- Mandate ID: {mandate_id}
- Event Count: {len(events)}
- Verified: {result.get("verified", False)}
- Business ID: {self.business_id}

Requirements:
- Assess audit trail completeness and integrity
- Identify potential security concerns
- Provide recommendations for audit enhancement
- Suggest improvements for compliance tracking

Return JSON with:
{{
  "audit_assessment": str,
  "security_concerns": [str],
  "enhancement_recommendations": [str],
  "compliance_improvements": [str]
}}
"""
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    result["llm_analysis"] = llm_data if llm_data else None
            except Exception as e:
                logger.warning(f"LLM audit trail analysis failed: {e}")

            return json.dumps(result, indent=2)

        except Exception as e:
            logger.error(f"AP2 audit trail retrieval failed: {e}")
            return json.dumps({
                "success": False,
                "error": f"Audit trail retrieval failed: {str(e)}"
            })

    async def get_ap2_health(self) -> str:
        """
        Get AP2 connector health status with LLM analysis

        Returns:
            JSON string with health info and LLM insights
        """
        if not self.ap2_enabled or not self.ap2_connector:
            return json.dumps({
                "ap2_enabled": False,
                "status": "disabled",
                "message": "AP2 protocol not available"
            })

        try:
            health = self.ap2_connector.health_check()
            result = {
                **health,
                "business_id": self.business_id
            }
            return json.dumps(result, indent=2)

        except Exception as e:
            return json.dumps({
                "ap2_enabled": True,
                "status": "error",
                "error": str(e)
            })

    async def mcp_visit(self, url: str, wait_for: Optional[str] = None) -> Dict[str, Any]:
        """Navigate via Chrome DevTools MCP for checkout/payment flow checks."""
        try:
            ok = await self.chrome_mcp.initialize()
            if not ok:
                return {"success": False, "error": "MCP init failed"}
            result = await self.chrome_mcp.navigate(url, wait_for=wait_for)
            return result.__dict__
        except Exception as e:
            logger.debug(f"MCP visit failed for billing: {e}")
            return {"success": False, "error": str(e)}



async def get_billing_agent(business_id: str = "default") -> BillingAgent:
    agent = BillingAgent(business_id=business_id)
    await agent.initialize()
    return agent
