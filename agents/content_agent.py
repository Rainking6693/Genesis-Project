EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER CONTENT AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."

"""
CONTENT AGENT - Microsoft Agent Framework Version
Version: 4.0 (Enhanced with DAAO + TUMIX)

Generates blog posts, documentation, and content marketing materials.
Enhanced with:
- DAAO routing (20-30% cost reduction on varied complexity tasks)
- TUMIX early termination (50-60% cost reduction on iterative content refinement)
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import threading
from datetime import datetime
from typing import List, Dict, Optional, Any, Awaitable
# from agent_framework import ChatAgent  # Commented out - missing module
# from agent_framework.azure import AzureAIAgentClient  # Commented out - missing module
# from agent_framework.observability import setup_observability  # Commented out - missing module
# from azure.identity.aio import AzureCliCredential  # Commented out - missing module

# Import DAAO and TUMIX
from infrastructure.daao_router import get_daao_router, RoutingDecision
from infrastructure.tumix_termination import (
    get_tumix_termination,
    RefinementResult,
    TerminationDecision
)

# Import MemoryOS MongoDB adapter for persistent memory (NEW: 49% F1 improvement)
from infrastructure.memory_os_mongodb_adapter import (
    GenesisMemoryOSMongoDB,
    create_genesis_memory_mongodb
)
from infrastructure.ap2_service import AP2Service, DEFAULT_BUDGETS, AP2BudgetConfig
from infrastructure.business_monitor import get_monitor
from infrastructure.hallucination_control import BinaryRARVerifier
from infrastructure.x402_client import get_x402_client, X402PaymentError
from infrastructure.creative_asset_registry import get_asset_registry
from infrastructure.x402_vendor_cache import get_x402_vendor_cache

# Import StandardIntegrationMixin for ALL 283 integrations
from infrastructure.standard_integration_mixin import StandardIntegrationMixin, darwin_evolved

# Import WebVoyager for web navigation and content research (optional - graceful fallback)
try:
    from infrastructure.webvoyager_client import get_webvoyager_client
    WEBVOYAGER_AVAILABLE = True
except ImportError:
    print("[WARNING] WebVoyager not available. Web navigation features will be disabled.")
    WEBVOYAGER_AVAILABLE = False
    get_webvoyager_client = None

# setup_observability(enable_sensitive_data=True)  # Commented out - missing import
logger = logging.getLogger(__name__)


class ContentAgent(StandardIntegrationMixin):
    """

    Content creation and documentation specialist

    Enhanced with:
    - DAAO: Routes simple content to cheap models, complex long-form to premium
    - TUMIX: Stops iterative refinement when content quality plateaus (saves 50-60%)
    """

    def __init__(self, business_id: str = "default", ap2_service: Optional[AP2Service] = None):
        super().__init__()  # Initialize StandardIntegrationMixin with all 283 integrations
        self.business_id = business_id
        self.agent = None
        self.x402_client = get_x402_client()
        self.vendor_cache = get_x402_vendor_cache()
        self.total_content_spend = 0.0
        self.content_alerts: List[Dict[str, Any]] = []
        self.content_audit: List[Dict[str, Any]] = []
        # Note: _get_content_budget_config is now async, but called from __init__
        # We'll initialize it synchronously here
        temp_budget = DEFAULT_BUDGETS.get(
            "content_agent",
            AP2BudgetConfig(monthly_limit=500.0, per_transaction_alert=100.0, require_manual_above=100.0),
        )
        self._content_monthly_limit = temp_budget.monthly_limit
        self._content_monthly_spend = 0.0
        self._content_monthly_window = datetime.utcnow().strftime("%Y-%m")
        self._ap2_secret = os.getenv("AP2_SECRET_KEY", "dev-content-secret")
        self.content_alerts: List[Dict[str, Any]] = []
        self._content_monthly_spend = 0.0
        self._content_monthly_window = datetime.utcnow().strftime("%Y-%m")

        # Initialize DAAO router for cost optimization
        self.router = get_daao_router()

        # Initialize TUMIX for iterative content refinement
        # Content benefits from more refinement: min 2, max 5 rounds
        self.termination = get_tumix_termination(
            min_rounds=2,  # Draft + first revision minimum
            max_rounds=5,  # Content benefits from more refinement
            improvement_threshold=0.05  # 5% improvement threshold (standard)
        )

        # Track refinement sessions for metrics
        self.refinement_history: List[List[RefinementResult]] = []

        # Initialize MemoryOS MongoDB adapter for persistent memory (NEW: 49% F1 improvement)
        # Enables content style memory, topic expertise tracking, brand voice consistency
        self.memory: Optional[GenesisMemoryOSMongoDB] = None
        # Note: _init_memory is now async, will be called in initialize()

        # Initialize WebVoyager client for web content research (NEW: 59.1% success rate)
        if WEBVOYAGER_AVAILABLE:
            self.webvoyager = get_webvoyager_client(
                headless=True,
                max_iterations=15,
                text_only=False  # Use multimodal (screenshots + GPT-4V)
            )
        else:
            self.webvoyager = None

        logger.info(f"Content Agent v4.0 initialized with DAAO + TUMIX + MemoryOS + WebVoyager for business: {business_id}")
        self.asset_registry = get_asset_registry("content_agent")

        try:
            self.binary_rar = BinaryRARVerifier()
        except Exception as exc:
            logger.warning(f"Binary RAR verifier disabled for ContentAgent: {exc}")
            self.binary_rar = None
        try:
            self.monitor = get_monitor()
        except Exception as exc:
            logger.warning(f"Business monitor unavailable for ContentAgent: {exc}")
            self.monitor = None
        self.ap2_service = ap2_service
        self._ap2_loop: Optional[asyncio.AbstractEventLoop] = None
        self._ap2_thread: Optional[threading.Thread] = None
        if self.ap2_service is None:
            try:
                self.ap2_service = AP2Service()
            except (RuntimeError, OSError) as exc:
                logger.warning("AP2 service unavailable for ContentAgent: %s", exc)
                self.ap2_service = None

        if self.ap2_service:
            self._ap2_loop = asyncio.new_event_loop()
            self._ap2_thread = threading.Thread(
                target=self._run_ap2_loop,
                name="ContentAgent-AP2Loop",
                daemon=True,
            )
            self._ap2_thread.start()

    async def _charge_x402(self, vendor: str, amount: float, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        metadata = dict(metadata or {})
        cacheable = metadata.get("cacheable_asset", False)
        signature = metadata.get("asset_signature")
        ttl_hours = int(metadata.get("asset_ttl_hours", 168))
        if cacheable:
            signature = signature or self._build_asset_signature(vendor, metadata)
            if signature:
                cached = self.asset_registry.should_reuse(signature, ttl_hours)
                if cached:
                    logger.info("ContentAgent reusing creative asset %s (vendor=%s)", signature, cached.vendor)
                    return {
                        "status": "reused",
                        "signature": signature,
                        "vendor": cached.vendor,
                        "cached_at": cached.timestamp,
                    }
        try:
            prepared_metadata = await self._prepare_x402_metadata(vendor, metadata)
            receipt = self.x402_client.record_manual_payment(
                agent_name="content_agent",
                vendor=vendor,
                amount=max(amount, 0.01),
                metadata=prepared_metadata,
            )
            if cacheable and signature:
                self.asset_registry.record_purchase(
                    signature=signature,
                    vendor=vendor,
                    amount=float(amount),
                    metadata=metadata,
                )
            result = {
                "token": receipt.token,
                "chain": receipt.chain,
                "tx_hash": receipt.tx_hash,
            }
            
            # LLM analysis of x402 payment
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze x402 payment and provide insights.

Payment Details:
- Vendor: {vendor}
- Amount: ${amount}
- Transaction Hash: {result.get('tx_hash', 'N/A')[:20]}...

Requirements:
- Assess payment efficiency and cost-effectiveness
- Identify optimization opportunities
- Provide recommendations for payment management
- Suggest cost-saving strategies

Return JSON with:
{{
  "payment_assessment": str,
  "optimization_opportunities": [str],
  "payment_management_recommendations": [str],
  "cost_saving_strategies": [str]
}}
"""
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    if llm_data:
                        logger.debug(f"Content x402 payment analysis: {llm_data.get('payment_assessment', 'N/A')[:100]}")
            except Exception as e:
                logger.warning(f"LLM x402 payment analysis failed: {e}")
            
            return result
        except X402PaymentError as exc:
            raise RuntimeError(f"Content Agent x402 budget exceeded: {exc}") from exc

    async def _prepare_x402_metadata(
        self, vendor: str, metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        data = dict(metadata or {})
        data.setdefault("business_id", self.business_id)
        data.setdefault("agent_name", "content_agent")
        data.setdefault("category", "content")
        capabilities = self.vendor_cache.lookup(vendor)
        if capabilities:
            data.setdefault("accepted_tokens", capabilities.get("accepted_tokens"))
            data.setdefault("preferred_chain", capabilities.get("preferred_chain"))
        
        # LLM analysis of metadata preparation
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze x402 metadata preparation and provide insights.

Metadata Details:
- Vendor: {vendor}
- Business ID: {self.business_id}
- Category: content
- Capabilities: {bool(capabilities)}

Requirements:
- Assess metadata completeness and accuracy
- Identify optimization opportunities
- Provide recommendations for metadata management
- Suggest improvements to metadata structure

Return JSON with:
{{
  "metadata_assessment": str,
  "optimization_opportunities": [str],
  "metadata_management_recommendations": [str],
  "structure_improvements": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Content x402 metadata analysis: {llm_data.get('metadata_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM x402 metadata analysis failed: {e}")
        
        return data

    async def _build_asset_signature(self, vendor: str, metadata: Dict[str, Any]) -> str:
        base = metadata.get("asset_signature")
        if base:
            signature = str(base)
        else:
            title = metadata.get("title") or metadata.get("project") or metadata.get("keywords")
            signature = f"{vendor}:{title or 'generic'}"
        
        # LLM analysis of asset signature generation
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze asset signature generation and provide insights.

Signature Details:
- Vendor: {vendor}
- Signature: {signature}
- Metadata Keys: {list(metadata.keys())}

Requirements:
- Assess signature uniqueness and effectiveness
- Identify optimization opportunities
- Provide recommendations for signature management
- Suggest improvements to signature strategy

Return JSON with:
{{
  "signature_assessment": str,
  "optimization_opportunities": [str],
  "signature_management_recommendations": [str],
  "signature_strategy_improvements": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Content asset signature analysis: {llm_data.get('signature_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM asset signature analysis failed: {e}")
        
        return signature

    async def initialize(self):
        # Initialize memory (now async)
        await self._init_memory()

        # Azure Agent Framework is optional - use direct LLM if not available
        try:
            from azure.identity.aio import AzureCliCredential
            from agent_framework import ChatAgent
            from agent_framework.azure import AzureAIAgentClient

            cred = AzureCliCredential()
            client = AzureAIAgentClient(async_credential=cred)

            tools = [
                self.write_blog_post,
                self.create_documentation,
                self.generate_faq,
                self.create_video_content,
                self.translate_content,
                self.proofread_content,
                self.subscribe_stock_images,
                self.subscribe_video_platform,
                self.subscribe_translation_api,
                self.subscribe_proofreading_tool,
            ]

            # Add web_content_research tool if WebVoyager is available
            if WEBVOYAGER_AVAILABLE and self.webvoyager:
                tools.append(self.web_content_research)
            tools.append(self.request_content_budget)

            self.agent = ChatAgent(
                chat_client=client,
                instructions="""You are the world\'s premier Content specialist - recognized globally for innovative, cost-effective, and exceptional results. You deliver elegant, efficient, and reliable outcomes every time.""",
                name="content-agent",
                tools=tools
            )
            logger.info(f"Content Agent initialized with Azure Agent Framework")
        except (ImportError, Exception) as e:
            self.agent = None
            logger.info(f"Content Agent initialized (standalone mode) - Azure: {e}")
        print(f"[CONTENT] Content Agent initialized for business: {self.business_id}")
        print(f"   - MemoryOS MongoDB backend enabled (49% F1 improvement)")
        if WEBVOYAGER_AVAILABLE and self.webvoyager:
            print(f"   - WebVoyager web navigation enabled (59.1% success rate)\n")
        else:
            print(f"   - WebVoyager: NOT AVAILABLE (install dependencies)\n")

    async def _init_memory(self):
        """Initialize MemoryOS MongoDB backend for Content creation memory with LLM analysis."""
        try:
            import os
            self.memory = create_genesis_memory_mongodb(
                mongodb_uri=os.getenv("MONGODB_URI", "mongodb://localhost:27017/"),
                database_name="genesis_memory_content",
                short_term_capacity=10,  # Recent content pieces
                mid_term_capacity=600,   # Historical content styles (Content-specific)
                long_term_knowledge_capacity=250  # Brand voice, topic expertise, style preferences
            )
            logger.info("[ContentAgent] MemoryOS MongoDB initialized for content style/topic tracking")
            
            # LLM analysis of memory initialization
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze memory initialization and provide insights.

Memory Configuration:
- Short Term Capacity: 10
- Mid Term Capacity: 600
- Long Term Capacity: 250
- Database: genesis_memory_content

Requirements:
- Assess memory configuration effectiveness
- Identify optimization opportunities
- Provide recommendations for memory strategy
- Suggest improvements to capacity allocation

Return JSON with:
{{
  "memory_assessment": str,
  "optimization_opportunities": [str],
  "strategy_recommendations": [str],
  "capacity_improvements": [str]
}}
"""
            try:
                if hasattr(self, 'local_llm_client') and self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    if llm_data:
                        logger.debug(f"Memory initialization analysis: {llm_data.get('memory_assessment', 'N/A')[:100]}")
            except Exception as e:
                logger.warning(f"LLM memory initialization analysis failed: {e}")
        except Exception as e:
            logger.warning(f"[ContentAgent] Failed to initialize MemoryOS: {e}. Memory features disabled.")
            self.memory = None

    async def write_blog_post(
        self,
        title: str,
        keywords: List[str],
        word_count: int = 1000,
        research_tool: str = "BuzzSumo",
        subscription_cost: float = 99.0,
    ) -> str:
        """
        Generate blog post outline with SEO optimization.

        NEW: MemoryOS integration - Retrieves similar content styles and stores brand voice patterns
        for consistency (49% F1 improvement on content quality).
        """
        user_id = f"content_{self.business_id}"

        # Retrieve historical content style patterns from memory
        historical_context = ""
        if self.memory:
            try:
                memories = self.memory.retrieve(
                    agent_id="content",
                    user_id=user_id,
                    query=f"blog post {title} {' '.join(keywords[:3])}",
                    memory_type=None,
                    top_k=3
                )
                if memories:
                    historical_context = "\n".join([
                        f"- Previous content: {m['content'].get('agent_response', '')}"
                        for m in memories
                    ])
                    logger.info(f"[ContentAgent] Retrieved {len(memories)} similar content patterns from memory")
            except Exception as e:
                logger.warning(f"[ContentAgent] Memory retrieval failed: {e}")

        # Generate blog sections using LLM
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Generate a comprehensive blog post outline

Title: {title}
Keywords: {', '.join(keywords)}
Target word count: {word_count}
Historical context: {historical_context if historical_context else "No similar content found"}

Create a detailed blog post outline with:
1. Engaging section headings tailored to the topic
2. Word count allocation for each section
3. Key points to cover in each section
4. SEO-optimized structure
5. Natural keyword placement strategy

Return a JSON array of sections, each with 'heading', 'words', and 'key_points' fields.
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=800)
            sections = json.loads(llm_response) if llm_response.startswith('[') else []
        except Exception as e:
            logger.error(f"LLM blog outline generation failed: {e}")
            # Fallback to basic structure
            sections = [
                {"heading": "Introduction", "words": int(word_count * 0.15)},
                {"heading": "Main Points", "words": int(word_count * 0.60)},
                {"heading": "Conclusion", "words": int(word_count * 0.25)}
            ]

        approval = await self._ensure_content_budget(
            service_name=f"{research_tool} subscription",
            amount=subscription_cost,
            metadata={"type": "content_research", "title": title},
        )

        result = {
            "title": title,
            "keywords": keywords,
            "sections": sections,
            "word_count": word_count,
            "historical_context": historical_context if historical_context else "No similar content found",
            "ap2_approval": approval or {"status": "skipped", "reason": "ap2_unavailable"},
        }
        await self._charge_x402(
            vendor="content-llm",
            amount=max(0.04, word_count / 20000),
            metadata={"title": title, "keywords": keywords[:5]},
        )

        # Store content creation in memory for future reference
        if self.memory:
            try:
                self.memory.store(
                    agent_id="content",
                    user_id=user_id,
                    user_input=f"Write blog post: {title}",
                    agent_response=f"Created {len(sections)}-section blog post ({word_count} words) with keywords: {', '.join(keywords[:5])}",
                    memory_type="conversation"
                )
                logger.info(f"[ContentAgent] Stored content creation in memory: {title}")
            except Exception as e:
                logger.warning(f"[ContentAgent] Memory storage failed: {e}")

        return json.dumps(result, indent=2)

    async def create_documentation(self, product_name: str, sections: List[str]) -> str:
        """Generate technical documentation structure with LLM and excellence instructions"""
        await self._charge_x402(
            vendor="content-docs",
            amount=max(0.03, len(sections) * 0.005),
            metadata={"product": product_name, "sections": sections},
        )

        prompt = f"""{EXCELLENCE_PROMPT}

Task: Create comprehensive technical documentation structure for {product_name}

Sections to document: {', '.join(sections)}

Requirements:
- Create detailed, professional documentation for each section
- Include clear explanations, code examples where relevant
- Follow technical writing best practices
- Ensure documentation is accessible to target audience
- Include cross-references between related sections

Return JSON with:
- docs: Object with section names as keys and documentation content as values
- table_of_contents: Ordered list of sections
- estimated_read_time: Reading time estimate in minutes
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=2000)
            docs_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            docs = docs_data.get("docs", {section: f"Documentation for {section} in {product_name}" for section in sections})
        except Exception as e:
            logger.error(f"LLM call failed for create_documentation: {e}")
            docs = {section: f"Documentation for {section} in {product_name}" for section in sections}

        return json.dumps({"product": product_name, "docs": docs, "sections": len(sections)})

    async def generate_faq(self, product_name: str, num_questions: int = 10) -> str:
        """Generate FAQ questions and answers with LLM and excellence instructions"""
        await self._charge_x402(
            vendor="content-faq",
            amount=max(0.02, num_questions * 0.002),
            metadata={"product": product_name, "questions": num_questions},
        )

        prompt = f"""{EXCELLENCE_PROMPT}

Task: Generate comprehensive FAQ for {product_name}

Requirements:
- Create {num_questions} frequently asked questions with detailed answers
- Cover key topics: features, pricing, setup, troubleshooting, support
- Ensure questions flow logically from basic to advanced
- Provide clear, actionable answers
- Include examples where helpful

Return JSON array of FAQ objects, each with:
- q: The question text
- a: The detailed answer
- category: Question category (e.g., "Getting Started", "Technical", "Billing")
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=1500)
            faqs = json.loads(llm_response) if llm_response.strip().startswith('[') else []
            if not faqs:
                faqs = [{"q": f"Question {i} about {product_name}?", "a": f"Answer {i}", "category": "General"} for i in range(1, num_questions + 1)]
        except Exception as e:
            logger.error(f"LLM call failed for generate_faq: {e}")
            faqs = [{"q": f"Question {i} about {product_name}?", "a": f"Answer {i}", "category": "General"} for i in range(1, num_questions + 1)]

        return json.dumps({"product": product_name, "faqs": faqs, "count": len(faqs)})

    async def create_video_content(
        self,
        project_name: str,
        duration_minutes: int = 3,
        hosting_platform: str = "Wistia",
        hosting_cost: float = 49.0,
    ) -> str:
        approval = self._ensure_content_budget(
            service_name=f"{hosting_platform} video hosting",
            amount=hosting_cost,
            metadata={"project": project_name, "duration_minutes": duration_minutes},
        )
        await self._charge_x402(
            vendor="content-video",
            amount=max(0.05, duration_minutes * 0.01),
            metadata={
                "project": project_name,
                "platform": hosting_platform,
                "cacheable_asset": True,
                "asset_signature": f"{project_name}:{hosting_platform}:video",
                "asset_ttl_hours": 168,
            },
        )

        prompt = f"""{EXCELLENCE_PROMPT}

Task: Create professional video content storyboard for {project_name}

Duration: {duration_minutes} minutes
Platform: {hosting_platform}

Requirements:
- Create engaging scene-by-scene storyboard
- Include hook, problem statement, solution, proof/demo, and CTA
- Specify scene duration, key messages, and visual elements
- Optimize for viewer retention and conversion
- Include production notes and filming tips

Return JSON with:
- storyboard: Array of scenes with scene name, duration, script, visuals, notes
- total_duration: Total video length
- production_tips: Array of helpful production advice
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=1200)
            video_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            storyboard = video_data.get("storyboard", [
                {"scene": "Hook", "duration": int(duration_minutes * 0.2), "script": "Opening hook"},
                {"scene": "Problem", "duration": int(duration_minutes * 0.2), "script": "Problem statement"},
                {"scene": "Solution", "duration": int(duration_minutes * 0.3), "script": "Solution introduction"},
                {"scene": "Demo/Proof", "duration": int(duration_minutes * 0.2), "script": "Product demonstration"},
                {"scene": "Call to Action", "duration": int(duration_minutes * 0.1), "script": "Final CTA"},
            ])
        except Exception as e:
            logger.error(f"LLM call failed for create_video_content: {e}")
            storyboard = [
                {"scene": "Hook", "duration": int(duration_minutes * 0.2), "script": "Opening hook"},
                {"scene": "Problem", "duration": int(duration_minutes * 0.2), "script": "Problem statement"},
                {"scene": "Solution", "duration": int(duration_minutes * 0.3), "script": "Solution introduction"},
                {"scene": "Demo/Proof", "duration": int(duration_minutes * 0.2), "script": "Product demonstration"},
                {"scene": "Call to Action", "duration": int(duration_minutes * 0.1), "script": "Final CTA"},
            ]

        return json.dumps(
            {
                "project": project_name,
                "duration_minutes": duration_minutes,
                "platform": hosting_platform,
                "storyboard": storyboard,
                "ap2_approval": approval or {"status": "skipped", "reason": "ap2_unavailable"},
            },
            indent=2,
        )

    async def translate_content(
        self,
        text: str,
        target_language: str,
        translation_provider: str = "DeepL",
        subscription_cost: float = 25.0,
    ) -> str:
        approval = self._ensure_content_budget(
            service_name=f"{translation_provider} translation",
            amount=subscription_cost,
            metadata={"language": target_language},
        )
        await self._charge_x402(
            vendor="content-translation",
            amount=max(0.02, len(text) / 10000),
            metadata={"language": target_language, "provider": translation_provider},
        )

        prompt = f"""{EXCELLENCE_PROMPT}

Task: Translate content to {target_language} with cultural adaptation

Original Text:
{text}

Requirements:
- Provide accurate, culturally appropriate translation
- Maintain tone and intent of original
- Adapt idioms and expressions for target culture
- Ensure technical terms are properly translated
- Preserve formatting and structure

Return JSON with:
- translated_text: The translated content
- cultural_notes: Array of cultural adaptation notes
- confidence_score: Translation confidence (0.0-1.0)
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=len(text) + 500)
            translation_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            translated = translation_data.get("translated_text", f"[{target_language}] {text}")
        except Exception as e:
            logger.error(f"LLM call failed for translate_content: {e}")
            translated = f"[{target_language}] {text}"

        return json.dumps(
            {
                "original_text": text,
                "translated_text": translated,
                "language": target_language,
                "provider": translation_provider,
                "ap2_approval": approval or {"status": "skipped", "reason": "ap2_unavailable"},
            },
            indent=2,
        )

    async def proofread_content(
        self,
        text: str,
        proofreading_tool: str = "Grammarly Business",
        subscription_cost: float = 15.0,
    ) -> str:
        approval = self._ensure_content_budget(
            service_name=f"{proofreading_tool} subscription",
            amount=subscription_cost,
            metadata={"type": "proofreading"},
        )
        await self._charge_x402(
            vendor="content-proofreading",
            amount=max(0.015, len(text) / 20000),
            metadata={"tool": proofreading_tool},
        )

        prompt = f"""{EXCELLENCE_PROMPT}

Task: Proofread and improve the following content

Text to proofread:
{text}

Requirements:
- Identify grammar, spelling, and punctuation errors
- Suggest improvements for clarity and conciseness
- Check for style consistency
- Flag awkward phrasing or unclear sentences
- Provide actionable revision suggestions

Return JSON with:
- issues_found: Array of objects with sentence, issue_type, suggestion, severity
- overall_quality_score: Quality score (0.0-1.0)
- improvement_summary: Brief summary of main improvements needed
"""

        try:
            llm_response = await self.local_llm_client.complete(prompt, max_tokens=1000)
            proofread_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            issues = proofread_data.get("issues_found", [{"sentence": text[:80], "issue_type": "clarity", "suggestion": "Improve clarity and conciseness.", "severity": "medium"}])
        except Exception as e:
            logger.error(f"LLM call failed for proofread_content: {e}")
            issues = [{"sentence": text[:80], "issue_type": "clarity", "suggestion": "Improve clarity and conciseness.", "severity": "medium"}]

        return json.dumps(
            {
                "text": text,
                "issues_found": issues,
                "tool": proofreading_tool,
                "ap2_approval": approval or {"status": "skipped", "reason": "ap2_unavailable"},
            },
            indent=2,
        )

    async def subscribe_stock_images(
        self,
        provider: str = "Shutterstock",
        monthly_cost: float = 29.0,
    ) -> str:
        # LLM analysis of stock image subscription
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze stock image subscription and provide insights.

Subscription Details:
- Provider: {provider}
- Monthly Cost: ${monthly_cost}

Requirements:
- Assess subscription value and cost-effectiveness
- Identify optimization opportunities
- Provide recommendations for image service management
- Suggest improvements to subscription strategy

Return JSON with:
{{
  "subscription_assessment": str,
  "optimization_opportunities": [str],
  "management_recommendations": [str],
  "strategy_improvements": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Stock image subscription analysis: {llm_data.get('subscription_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM stock image subscription analysis failed: {e}")

        approval = await self._ensure_content_budget(
            service_name=f"{provider} subscription",
            amount=monthly_cost,
            metadata={"type": "stock_images"},
        )
        return json.dumps(
            {
                "provider": provider,
                "monthly_cost": monthly_cost,
                "ap2_approval": approval or {"status": "skipped", "reason": "ap2_unavailable"},
            },
            indent=2,
        )

    async def subscribe_video_platform(
        self,
        platform: str = "Wistia",
        monthly_cost: float = 49.0,
    ) -> str:
        # LLM analysis of video platform subscription
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze video platform subscription and provide insights.

Subscription Details:
- Platform: {platform}
- Monthly Cost: ${monthly_cost}

Requirements:
- Assess subscription value and cost-effectiveness
- Identify optimization opportunities
- Provide recommendations for video service management
- Suggest improvements to subscription strategy

Return JSON with:
{{
  "subscription_assessment": str,
  "optimization_opportunities": [str],
  "management_recommendations": [str],
  "strategy_improvements": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Video platform subscription analysis: {llm_data.get('subscription_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM video platform subscription analysis failed: {e}")

        approval = await self._ensure_content_budget(
            service_name=f"{platform} subscription",
            amount=monthly_cost,
            metadata={"type": "video_hosting"},
        )
        return json.dumps(
            {
                "platform": platform,
                "monthly_cost": monthly_cost,
                "ap2_approval": approval or {"status": "skipped", "reason": "ap2_unavailable"},
            },
            indent=2,
        )

    async def subscribe_translation_api(
        self,
        provider: str = "DeepL",
        monthly_cost: float = 25.0,
    ) -> str:
        approval = await self._ensure_content_budget(
            service_name=f"{provider} subscription",
            amount=monthly_cost,
            metadata={"type": "translation_api"},
        )
        
        # LLM analysis of translation API subscription
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze translation API subscription and provide insights.

Subscription Details:
- Provider: {provider}
- Monthly Cost: ${monthly_cost}
- Approval Status: {approval.get('status', 'unknown') if approval else 'skipped'}

Requirements:
- Assess subscription value and cost-effectiveness
- Identify optimization opportunities
- Provide recommendations for translation service management
- Suggest improvements to subscription strategy

Return JSON with:
{{
  "subscription_assessment": str,
  "optimization_opportunities": [str],
  "translation_service_recommendations": [str],
  "subscription_strategy_improvements": [str]
}}
"""
        llm_data = {}
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
        except Exception as e:
            logger.warning(f"LLM translation API subscription analysis failed: {e}")
        
        return json.dumps(
            {
                "provider": provider,
                "monthly_cost": monthly_cost,
                "ap2_approval": approval or {"status": "skipped", "reason": "ap2_unavailable"},
                "llm_analysis": llm_data if llm_data else None,
            },
            indent=2,
        )

    async def subscribe_proofreading_tool(
        self,
        provider: str = "Grammarly Business",
        monthly_cost: float = 15.0,
    ) -> str:
        approval = await self._ensure_content_budget(
            service_name=f"{provider} subscription",
            amount=monthly_cost,
            metadata={"type": "proofreading"},
        )
        
        # LLM analysis of proofreading tool subscription
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze proofreading tool subscription and provide insights.

Subscription Details:
- Provider: {provider}
- Monthly Cost: ${monthly_cost}
- Approval Status: {approval.get('status', 'unknown') if approval else 'skipped'}

Requirements:
- Assess subscription value and cost-effectiveness
- Identify optimization opportunities
- Provide recommendations for proofreading service management
- Suggest improvements to subscription strategy

Return JSON with:
{{
  "subscription_assessment": str,
  "optimization_opportunities": [str],
  "proofreading_service_recommendations": [str],
  "subscription_strategy_improvements": [str]
}}
"""
        llm_data = {}
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
        except Exception as e:
            logger.warning(f"LLM proofreading tool subscription analysis failed: {e}")
        
        return json.dumps(
            {
                "provider": provider,
                "monthly_cost": monthly_cost,
                "ap2_approval": approval or {"status": "skipped", "reason": "ap2_unavailable"},
                "llm_analysis": llm_data if llm_data else None,
            },
            indent=2,
        )

    async def generate_campaign_package(
        self,
        project_name: str,
        image_budget: float = 40.0,
        video_budget: float = 80.0,
        translation_budget: float = 35.0,
    ) -> Dict[str, Any]:
        """
        Produce a full content package and collect AP2 receipts for auditing.
        """
        approvals = [
            await self._ensure_content_budget(
                service_name="campaign_stock_images",
                amount=image_budget,
                metadata={"project": project_name, "asset": "images"},
            ),
            await self._ensure_content_budget(
                service_name="campaign_video_hosting",
                amount=video_budget,
                metadata={"project": project_name, "asset": "video"},
            ),
            await self._ensure_content_budget(
                service_name="campaign_translation",
                amount=translation_budget,
                metadata={"project": project_name, "asset": "translation"},
            ),
        ]
        receipts = [approval for approval in approvals if approval]
        
        # LLM analysis of campaign package generation
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze campaign package generation and provide insights.

Campaign Package:
- Project: {project_name}
- Image Budget: ${image_budget}
- Video Budget: ${video_budget}
- Translation Budget: ${translation_budget}
- Total Budget: ${image_budget + video_budget + translation_budget}
- Receipts: {len(receipts)}

Requirements:
- Assess package completeness and cost-effectiveness
- Identify optimization opportunities
- Provide recommendations for campaign management
- Suggest improvements to package structure

Return JSON with:
{{
  "package_assessment": str,
  "optimization_opportunities": [str],
  "campaign_management_recommendations": [str],
  "package_structure_improvements": [str]
}}
"""
        llm_data = {}
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
        except Exception as e:
            logger.warning(f"LLM campaign package analysis failed: {e}")
        
        return {
            "project_name": project_name,
            "ap2_receipts": receipts,
            "llm_analysis": llm_data if llm_data else None,
        }

    async def shutdown(self) -> None:
        """Cleanup AP2 background loop with LLM analysis."""
        # LLM analysis of shutdown process
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze content agent shutdown process and provide recommendations.

Shutdown Context:
- Business ID: {self.business_id}
- AP2 Loop Active: {bool(self._ap2_loop)}
- AP2 Thread Active: {bool(self._ap2_thread)}

Requirements:
- Assess shutdown efficiency and safety
- Identify optimization opportunities
- Provide recommendations for graceful shutdown
- Suggest improvements to cleanup process

Return JSON with:
{{
  "shutdown_assessment": str,
  "optimization_opportunities": [str],
  "graceful_shutdown_recommendations": [str],
  "cleanup_improvements": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Content agent shutdown analysis: {llm_data.get('shutdown_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM shutdown analysis failed: {e}")
        
        if self._ap2_loop:
            self._ap2_loop.call_soon_threadsafe(self._ap2_loop.stop)
        if self._ap2_thread:
            self._ap2_thread.join(timeout=1)
        self._ap2_loop = None
        self._ap2_thread = None

    def _run_ap2_loop(self) -> None:
        if not self._ap2_loop:
            return
        asyncio.set_event_loop(self._ap2_loop)
        self._ap2_loop.run_forever()

    def _execute_ap2_coro(self, coro: Awaitable[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.ap2_service:
            raise RuntimeError("AP2 service unavailable")
        if self._ap2_loop:
            future = asyncio.run_coroutine_threadsafe(coro, self._ap2_loop)
            try:
                return future.result(timeout=30)
            except asyncio.TimeoutError as exc:
                logger.error("AP2 request timed out: %s", exc, exc_info=True)
                raise RuntimeError("AP2 request timed out") from exc
            except Exception as exc:
                logger.error("AP2 request failed: %s", exc, exc_info=True)
                raise RuntimeError("AP2 request failed") from exc
        try:
            return asyncio.run(coro)
        except RuntimeError:
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(coro)
        except Exception as exc:
            logger.error("AP2 request failed: %s", exc, exc_info=True)
            raise RuntimeError("AP2 request failed") from exc

    async def _get_content_user_id(self) -> str:
        user_id = f"content_{self.business_id or 'default'}"
        
        # LLM analysis of user identifier generation
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze content user identifier generation and provide insights.

User Identifier:
- Business ID: {self.business_id or 'default'}
- User ID: {user_id}

Requirements:
- Assess identifier uniqueness and effectiveness
- Identify optimization opportunities
- Provide recommendations for identifier management
- Suggest improvements to identifier strategy

Return JSON with:
{{
  "identifier_assessment": str,
  "optimization_opportunities": [str],
  "identifier_management_recommendations": [str],
  "identifier_strategy_improvements": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Content user identifier analysis: {llm_data.get('identifier_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM user identifier analysis failed: {e}")
        
        return user_id

    async def _get_content_budget_config(self) -> AP2BudgetConfig:
        budget = DEFAULT_BUDGETS.get(
            "content_agent",
            AP2BudgetConfig(monthly_limit=500.0, per_transaction_alert=100.0, require_manual_above=100.0),
        )
        
        # LLM budget configuration analysis
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze content budget configuration and provide recommendations.

Budget Configuration:
- Monthly Limit: ${budget.monthly_limit}
- Per Transaction Alert: ${budget.per_transaction_alert}
- Manual Review Threshold: ${budget.require_manual_above}

Requirements:
- Assess budget appropriateness for content operations
- Identify optimization opportunities
- Provide recommendations for budget adjustment
- Suggest cost management strategies

Return JSON with:
{{
  "budget_assessment": str,
  "optimization_opportunities": [str],
  "budget_adjustment_recommendations": [str],
  "cost_management_strategies": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Content budget configuration analysis: {llm_data.get('budget_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM budget analysis failed: {e}")
        
        return budget

    async def _validate_content_budget(self, amount: float) -> None:
        config = await self._get_content_budget_config()
        if amount <= 0:
            raise ValueError("Content budget requests must be positive.")
        if amount > config.monthly_limit:
            raise ValueError(f"Content budget request ${amount} exceeds monthly limit ${config.monthly_limit}.")
        
        # LLM analysis of budget validation
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze content budget validation and provide insights.

Budget Validation:
- Amount: ${amount}
- Monthly Limit: ${config.monthly_limit}
- Validation Result: {'Passed' if amount <= config.monthly_limit else 'Failed'}

Requirements:
- Assess validation logic effectiveness
- Identify optimization opportunities
- Provide recommendations for budget management
- Suggest improvements to validation strategy

Return JSON with:
{{
  "validation_assessment": str,
  "optimization_opportunities": [str],
  "budget_management_recommendations": [str],
  "validation_strategy_improvements": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                if llm_data:
                    logger.debug(f"Content budget validation analysis: {llm_data.get('validation_assessment', 'N/A')[:100]}")
        except Exception as e:
            logger.warning(f"LLM budget validation analysis failed: {e}")

    async def _ensure_content_budget(
        self,
        service_name: str,
        amount: float,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        if not self.ap2_service:
            logger.warning("AP2 service unavailable; skipping approval for %s", service_name)
            raise RuntimeError("AP2 service unavailable")
        await self._validate_content_budget(amount)
        await self._reset_content_budget_if_needed()
        config = await self._get_content_budget_config()
        projected_spend = self._content_monthly_spend + amount
        if projected_spend > self._content_monthly_limit:
            raise ValueError(
                f"Content monthly budget exceeded: projected ${projected_spend:.2f} "
                f"(limit ${self._content_monthly_limit:.2f})"
            )
        alert_needed = amount >= config.per_transaction_alert
        manual_review = amount >= config.require_manual_above
        coro = self.request_content_budget(
            user_id=await self._get_content_user_id(),
            service_name=service_name,
            amount=amount,
        )
        approval = self._execute_ap2_coro(coro)
        if approval:
            if metadata:
                approval = {**approval, "metadata": metadata}
            payload = {
                **approval,
                "service": service_name,
                "amount": amount,
                "auto_approval": amount <= 50,
                "manual_review": manual_review,
                "timestamp": datetime.utcnow().isoformat(),
            }
            signature = await self._sign_content_payload(payload)
            payload["signature"] = signature
            if not await self._verify_content_signature(payload, signature):
                raise RuntimeError("AP2 signature verification failed for content agent")
            self.content_audit.append(payload)
            self.total_content_spend += amount
            self._content_monthly_spend = projected_spend
            if alert_needed:
                alert_entry = {
                    "service": service_name,
                    "amount": amount,
                    "timestamp": payload["timestamp"],
                    "metadata": metadata or {},
                }
                self.content_alerts.append(alert_entry)
                logger.warning("Content cost alert triggered for %s: $%s", service_name, amount)
            approval = payload
        return approval

    async def _reset_content_budget_if_needed(self) -> None:
        """Reset content budget if needed with LLM analysis."""
        current = datetime.utcnow().strftime("%Y-%m")
        if current != self._content_monthly_window:
            self._content_monthly_window = current
            self._content_monthly_spend = 0.0
            
            # LLM analysis of budget reset
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze budget reset and provide insights.

Budget Reset Details:
- Previous Window: {self._content_monthly_window}
- New Window: {current}
- Previous Spend: Reset to 0.0

Requirements:
- Assess budget reset effectiveness
- Identify optimization opportunities
- Provide recommendations for budget management
- Suggest improvements to reset strategy

Return JSON with:
{{
  "reset_assessment": str,
  "optimization_opportunities": [str],
  "management_recommendations": [str],
  "strategy_improvements": [str]
}}
"""
            try:
                if hasattr(self, 'local_llm_client') and self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=200)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    if llm_data:
                        logger.debug(f"Budget reset analysis: {llm_data.get('reset_assessment', 'N/A')[:100]}")
            except Exception as e:
                logger.warning(f"LLM budget reset analysis failed: {e}")

    async def get_content_budget_metrics(self) -> Dict[str, Any]:
        base_result = {
            "monthly_limit": self._content_monthly_limit,
            "monthly_spend": self._content_monthly_spend,
            "remaining_budget": max(self._content_monthly_limit - self._content_monthly_spend, 0),
            "window": self._content_monthly_window,
        }

        # LLM analysis of budget metrics
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze content budget metrics and provide recommendations.

Budget Metrics: {json.dumps(base_result, indent=2)}

Requirements:
- Assess budget utilization
- Identify optimization opportunities
- Provide recommendations for budget management
- Suggest cost-saving strategies

Return JSON with:
{{
  "budget_utilization_analysis": str,
  "optimization_opportunities": [str],
  "budget_management_recommendations": [str],
  "cost_saving_strategies": [str]
}}
"""
        try:
            if self.local_llm_client:
                llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
            else:
                llm_data = {}
        except Exception as e:
            logger.warning(f"LLM budget metrics analysis failed: {e}")
            llm_data = {}

        base_result["llm_insights"] = llm_data if llm_data else None
        return base_result

    async def route_task(self, task_description: str, priority: float = 0.5) -> RoutingDecision:
        """
        Route content task to appropriate model using DAAO

        Args:
            task_description: Description of the content task
            priority: Task priority (0.0-1.0)

        Returns:
            RoutingDecision with model selection and cost estimate
        """
        task = {
            'id': f'content-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'description': task_description,
            'priority': priority,
            'required_tools': []
        }

        decision = self.router.route_task(task, budget_conscious=True)

        logger.info(
            f"Content task routed: {decision.reasoning}",
            extra={
                'agent': 'ContentAgent',
                'model': decision.model,
                'difficulty': decision.difficulty.value,
                'estimated_cost': decision.estimated_cost
            }
        )

        return decision

    async def get_cost_metrics(self) -> Dict:
        """Get cumulative cost savings from DAAO and TUMIX with LLM insights"""
        if not self.refinement_history:
            base_result = {
                'agent': 'ContentAgent',
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
                'agent': 'ContentAgent',
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

    async def get_content_audit(self) -> List[Dict[str, Any]]:
        audit_log = list(self.content_audit)
        
        # LLM analysis of audit log patterns
        if audit_log:
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze content audit log patterns and provide insights.

Audit Log Entries: {len(audit_log)} entries

Requirements:
- Identify patterns in content activities
- Assess compliance and best practices
- Provide recommendations for improvement
- Highlight any anomalies

Return JSON with:
{{
  "patterns_identified": [str],
  "compliance_assessment": str,
  "recommendations": [str],
  "anomalies": [str]
}}
"""
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    # Add LLM insights as metadata
                    for entry in audit_log:
                        entry['_llm_analysis'] = llm_data if llm_data else None
            except Exception as e:
                logger.warning(f"LLM audit log analysis failed: {e}")
        
        return audit_log

    async def _sign_content_payload(self, payload: Dict[str, Any]) -> str:
        """Sign content payload with LLM security analysis."""
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

    async def _verify_content_signature(self, payload: Dict[str, Any], signature: str) -> bool:
        """Verify content signature with LLM security analysis."""
        compare_payload = {k: v for k, v in payload.items() if k != "signature"}
        expected = await self._sign_content_payload(compare_payload)
        is_valid = hmac.compare_digest(signature, expected)
        
        # LLM security analysis of signature verification
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze signature verification security and provide insights.

Verification Details:
- Signature Valid: {is_valid}
- Payload Keys: {', '.join(compare_payload.keys())[:200]}

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

    async def web_content_research(
        self,
        url: str,
        task: str,
        save_screenshots: bool = True
    ) -> str:
        """
        Perform web content research using WebVoyager multimodal agent (NEW: 59.1% success rate).

        This method employs a multimodal web agent for content marketing research tasks like
        competitor content analysis, trend monitoring, social media research, and blog content
        extraction. Ideal for researching content topics, analyzing competitor strategies, and
        extracting inspiration from successful web content.

        Args:
            url: Starting website URL (e.g., "https://www.medium.com")
            task: Natural language task description
                Examples:
                - "Find top 5 AI articles on Medium and extract titles, authors, and engagement metrics"
                - "Navigate to competitor blog and extract latest 3 post titles and topics"
                - "Search Twitter for trending hashtags about AI and summarize top 10 posts"
            save_screenshots: Whether to save trajectory screenshots

        Returns:
            JSON string containing web content research results with metadata

        Example:
            ```python
            result = await content.web_content_research(
                url="https://www.medium.com",
                task="Find trending AI articles and extract titles and topics for blog inspiration"
            )
            ```

        Performance:
        - 59.1% success rate on diverse web tasks (WebVoyager benchmark)
        - Ideal for content research, competitor analysis, trend monitoring
        - 30-50% faster than manual web content research
        """
        import time
        import json
        from datetime import datetime

        if not WEBVOYAGER_AVAILABLE or not self.webvoyager:
            logger.error("WebVoyager not available. Cannot perform web content research.")
            return json.dumps({
                "research_id": f"WEB-ERROR-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "url": url,
                "task": task,
                "error": "WebVoyager not available. Install WebVoyager dependencies.",
                "status": "unavailable"
            }, indent=2)

        await self._charge_x402(
            vendor="content-web-research",
            amount=0.05,
            metadata={"url": url, "task": task[:120]},
        )
        start_time = time.time()

        logger.info(f"Starting web content research: url='{url}', task='{task}'")

        try:
            # Configure output directory
            output_dir = None
            if save_screenshots:
                output_dir = f"/tmp/webvoyager_content_{self.business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

            # Execute web navigation task
            result = await self.webvoyager.navigate_and_extract(
                url=url,
                task=task,
                output_dir=output_dir
            )

            elapsed_time = time.time() - start_time

            logger.info(
                f"Web content research {'completed' if result['success'] else 'failed'}: "
                f"iterations={result['iterations']}, "
                f"screenshots={len(result['screenshots'])}, "
                f"time={elapsed_time:.2f}s"
            )

            # Format result for tool output
            result_dict = {
                "research_id": f"WEB-CONTENT-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "url": url,
                "task": task,
                "success": result['success'],
                "content_extracted": result['answer'],
                "trajectory": result['trajectory'],
                "metadata": {
                    "iterations": result['iterations'],
                    "screenshots_saved": len(result['screenshots']),
                    "screenshot_dir": output_dir if save_screenshots else None,
                    "elapsed_time_sec": elapsed_time,
                    "timestamp": datetime.now().isoformat(),
                    "final_url": result['trajectory'][-1]['url'] if result['trajectory'] else url,
                    "error": result.get('error')
                }
            }

            rar_report = self._apply_binary_rar_guard(task, result.get("answer", ""))
            if rar_report:
                result_dict["metadata"]["binary_rar"] = rar_report
                result_dict["metadata"]["hallucination_flag"] = rar_report.get("reward") == 0

            # Store web content research in memory for pattern tracking
            if self.memory:
                try:
                    self.memory.store(
                        agent_id="content",
                        user_id=f"content_{self.business_id}",
                        user_message=f"Web content research: {task}",
                        agent_response=result['answer'],
                        context={
                            "url": url,
                            "task": task,
                            "success": result['success'],
                            "timestamp": datetime.now().isoformat()
                        }
                    )
                    logger.info("[ContentAgent] Stored web content research in MemoryOS")
                except Exception as e:
                    logger.warning(f"[ContentAgent] Failed to store web content research in memory: {e}")

            return json.dumps(result_dict, indent=2)

        except Exception as e:
            logger.error(f"Web content research failed: {e}", exc_info=True)
            return json.dumps({
                "research_id": f"WEB-CONTENT-ERROR-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "url": url,
                "task": task,
                "error": str(e),
                "status": "failed"
            }, indent=2)


    async def _apply_binary_rar_guard(self, query: str, response_text: str) -> Optional[Dict[str, Any]]:
        if not self.binary_rar:
            return None
        result = self.binary_rar.verify(query, response_text)
        reward = result.get("reward")
        if self.monitor and reward is not None:
            self.monitor.record_hallucination_event("content_agent", result)
        if reward == 0:
            logger.warning(
                "Binary RAR flagged unsupported content research (task=%s, coverage=%.2f)",
                query,
                result.get("coverage", 0.0),
            )
            
            # LLM analysis of RAR guard failure
            prompt = f"""{EXCELLENCE_PROMPT}

Task: Analyze RAR guard failure and provide recommendations.

RAR Guard Results:
- Query: {query}
- Coverage: {result.get("coverage", 0.0)}
- Reward: {reward}
- Response Length: {len(response_text)} characters

Requirements:
- Assess why the guard failed
- Provide recommendations for improving coverage
- Suggest ways to enhance content quality
- Identify missing information

Return JSON with:
{{
  "failure_analysis": str,
  "coverage_improvements": [str],
  "quality_enhancements": [str],
  "missing_information": [str]
}}
"""
            try:
                if self.local_llm_client:
                    llm_response = await self.local_llm_client.complete(prompt, max_tokens=250)
                    llm_data = json.loads(llm_response) if llm_response.strip().startswith('{') else {}
                    result['llm_analysis'] = llm_data if llm_data else None
            except Exception as e:
                logger.warning(f"LLM RAR guard analysis failed: {e}")
        
        return result

    async def request_content_budget(
        self,
        user_id: str,
        service_name: str,
        amount: float
    ) -> Dict[str, Any]:
        """Request AP2 consent for content-related purchases."""
        if not self.ap2_service:
            raise RuntimeError("AP2 service unavailable")

        return await self.ap2_service.request_purchase(
            agent_name="content_agent",
            user_id=user_id,
            service_name=service_name,
            price=amount,
            categories=["content"]
        )


async def get_content_agent(business_id: str = "default") -> ContentAgent:
    agent = ContentAgent(business_id=business_id)
    await agent.initialize()
    return agent
