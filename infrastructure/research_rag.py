"""
LlamaIndex Research RAG for Genesis Pipeline

Minimal LlamaIndex integration for intelligent niche discovery in the RESEARCH stage.
Replaces random niche selection with semantic search over curated business knowledge.

Features:
- Business idea corpus with market trends, niches, and opportunities
- VectorStoreIndex for semantic similarity search
- Fallback to random selection if LlamaIndex unavailable

Usage:
    from infrastructure.research_rag import ResearchRAG

    rag = ResearchRAG()
    niche = await rag.discover_niche("saas", "developers")
    # Returns semantically relevant niche instead of random selection

Dependencies:
    pip install llama-index-core llama-index-embeddings-huggingface
"""

import logging
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Flag to track LlamaIndex availability
LLAMAINDEX_AVAILABLE = False

try:
    from llama_index.core import VectorStoreIndex, Document, Settings
    from llama_index.core.node_parser import SentenceSplitter
    # Use HuggingFace embeddings (local, free) instead of OpenAI
    try:
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        # Set default embedding model to local HuggingFace
        Settings.embed_model = HuggingFaceEmbedding(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        logger.info("Using HuggingFace embeddings (local)")
    except ImportError:
        # Fallback: disable LLM calls, use simple embeddings
        Settings.llm = None
        logger.info("Using default embeddings")
    LLAMAINDEX_AVAILABLE = True
    logger.info("LlamaIndex loaded successfully")
except ImportError as e:
    logger.warning(f"LlamaIndex not available: {e}. Using fallback random selection.")


@dataclass
class DiscoveredNiche:
    """Result of niche discovery."""
    niche: str
    target_market: str
    value_proposition: str
    market_size: str
    confidence: float
    source: str  # "rag" or "fallback"
    reasoning: str = ""


class BusinessKnowledgeCorpus:
    """
    Curated corpus of business knowledge for RAG.

    Contains:
    - Market trends and opportunities
    - Successful business patterns
    - Underserved niches by category
    - Value proposition templates
    """

    @staticmethod
    def get_documents() -> List[Dict[str, str]]:
        """Get business knowledge as documents for indexing."""
        return [
            # SaaS Opportunities
            {
                "content": """SaaS opportunities for indie game developers in 2025:
                - Asset management tools for organizing sprites, audio, and 3D models
                - Analytics dashboards showing player behavior and retention metrics
                - Automated testing tools for game mechanics and balance
                - Community management platforms with Discord integration
                - Monetization optimization tools for in-app purchases
                Value proposition: Save 10+ hours per week on non-coding tasks
                Market size: Medium (500K+ indie devs globally)
                Competition: Low-moderate, fragmented market""",
                "metadata": {"type": "saas", "niche": "indie game developers", "market_size": "medium"}
            },
            {
                "content": """SaaS opportunities for AI/ML engineers in 2025:
                - Experiment tracking and model versioning platforms
                - Dataset curation and labeling workflow tools
                - Cost optimization dashboards for GPU cloud spending
                - Model deployment and monitoring solutions
                - Prompt engineering and testing workbenches
                Value proposition: Reduce ML infrastructure costs by 40%
                Market size: Large (growing 25% annually)
                Competition: Moderate, but room for specialization""",
                "metadata": {"type": "saas", "niche": "AI/ML engineers", "market_size": "large"}
            },
            {
                "content": """SaaS opportunities for DevOps teams in 2025:
                - Kubernetes cost optimization and right-sizing tools
                - Incident response automation platforms
                - Infrastructure drift detection and remediation
                - Multi-cloud management dashboards
                - Security posture monitoring for CI/CD pipelines
                Value proposition: Reduce cloud costs by 30% while improving reliability
                Market size: Large (enterprise budgets)
                Competition: High, but niches exist""",
                "metadata": {"type": "saas", "niche": "DevOps teams", "market_size": "large"}
            },
            {
                "content": """SaaS opportunities for startup founders in 2025:
                - Investor CRM and fundraising pipeline management
                - Cap table management and equity planning
                - Competitor monitoring and market intelligence
                - Customer feedback aggregation and analysis
                - Metrics dashboards for board reporting
                Value proposition: Focus on building, not admin work
                Market size: Medium (high willingness to pay)
                Competition: Moderate""",
                "metadata": {"type": "saas", "niche": "startup founders", "market_size": "medium"}
            },
            {
                "content": """SaaS opportunities for mobile app developers in 2025:
                - Cross-platform testing automation
                - App store optimization and keyword tracking
                - Push notification campaign management
                - In-app analytics with privacy compliance
                - Revenue optimization for subscriptions
                Value proposition: Ship 3x faster with confidence
                Market size: Large (millions of mobile devs)
                Competition: Moderate""",
                "metadata": {"type": "saas", "niche": "mobile app developers", "market_size": "large"}
            },

            # Marketplace Opportunities
            {
                "content": """Marketplace opportunities for freelance designers in 2025:
                - Niche design asset marketplaces (e.g., Figma plugins only)
                - Design critique and feedback platforms
                - Client-designer matching with portfolio analysis
                - Design system licensing marketplaces
                - White-label design service platforms
                Value proposition: Find better clients, charge higher rates
                Market size: Medium (high transaction values)
                Competition: Moderate""",
                "metadata": {"type": "marketplace", "niche": "freelance designers", "market_size": "medium"}
            },
            {
                "content": """Marketplace opportunities for contract developers in 2025:
                - Code review marketplace connecting experts with teams
                - Technical interview prep coaching marketplace
                - Open source bounty and sponsorship platforms
                - Legacy code modernization service marketplace
                - API integration specialist matching
                Value proposition: Connect with clients who value expertise
                Market size: Large (growing gig economy)
                Competition: High, but differentiation possible""",
                "metadata": {"type": "marketplace", "niche": "contract developers", "market_size": "large"}
            },
            {
                "content": """Marketplace opportunities for content creators in 2025:
                - UGC creator and brand matching platforms
                - Niche newsletter acquisition marketplace
                - Podcast guest booking and monetization
                - Course collaboration and co-creation platforms
                - Content licensing and syndication marketplaces
                Value proposition: Monetize content beyond ads
                Market size: Large (creator economy booming)
                Competition: Moderate""",
                "metadata": {"type": "marketplace", "niche": "content creators", "market_size": "large"}
            },

            # Analytics Opportunities
            {
                "content": """Analytics opportunities for e-commerce stores in 2025:
                - Customer lifetime value prediction dashboards
                - Inventory demand forecasting tools
                - Abandoned cart recovery analytics
                - Cross-sell/upsell recommendation engines
                - Shipping cost optimization analytics
                Value proposition: Increase revenue by 20% with data-driven decisions
                Market size: Large (millions of stores)
                Competition: High, but SMB segment underserved""",
                "metadata": {"type": "analytics", "niche": "e-commerce stores", "market_size": "large"}
            },
            {
                "content": """Analytics opportunities for SaaS companies in 2025:
                - Product-led growth metric dashboards
                - Feature adoption and engagement tracking
                - Churn prediction and prevention analytics
                - Pricing optimization experiments
                - Customer health scoring systems
                Value proposition: Reduce churn by 25% with predictive insights
                Market size: Large (every SaaS needs this)
                Competition: Moderate""",
                "metadata": {"type": "analytics", "niche": "SaaS companies", "market_size": "large"}
            },

            # Automation Opportunities
            {
                "content": """Automation opportunities for HR departments in 2025:
                - Employee onboarding workflow automation
                - Performance review scheduling and tracking
                - Benefits enrollment automation
                - Time-off request and approval workflows
                - Employee feedback collection automation
                Value proposition: Eliminate 80% of repetitive HR tasks
                Market size: Large (every company has HR)
                Competition: Moderate""",
                "metadata": {"type": "automation", "niche": "HR departments", "market_size": "large"}
            },
            {
                "content": """Automation opportunities for sales teams in 2025:
                - Lead enrichment and scoring automation
                - Follow-up sequence personalization
                - CRM data cleanup and deduplication
                - Meeting scheduling and prep automation
                - Proposal generation from CRM data
                Value proposition: Double meeting bookings, halve admin time
                Market size: Large (sales tech is huge)
                Competition: High, but integration opportunities exist""",
                "metadata": {"type": "automation", "niche": "sales teams", "market_size": "large"}
            },

            # Education Opportunities
            {
                "content": """Education opportunities for coding bootcamp students in 2025:
                - Personalized learning path generators
                - Project-based assessment platforms
                - Peer code review and collaboration tools
                - Job placement preparation dashboards
                - Technical interview simulation platforms
                Value proposition: Land your first dev job 2x faster
                Market size: Medium (focused audience)
                Competition: Low-moderate""",
                "metadata": {"type": "education", "niche": "coding bootcamp students", "market_size": "medium"}
            },
            {
                "content": """Education opportunities for career changers in 2025:
                - Skills gap analysis and learning paths
                - Portfolio building guided platforms
                - Industry-specific knowledge bases
                - Networking facilitation for newcomers
                - Salary negotiation preparation tools
                Value proposition: Transition careers with confidence
                Market size: Large (millions changing careers yearly)
                Competition: Moderate""",
                "metadata": {"type": "education", "niche": "career changers", "market_size": "large"}
            },

            # AI Opportunities
            {
                "content": """AI opportunities for prompt engineers in 2025:
                - Prompt library and version control systems
                - A/B testing platforms for prompts
                - Prompt performance analytics
                - Template marketplaces for domain-specific prompts
                - Collaborative prompt development tools
                Value proposition: Build production-ready AI apps 5x faster
                Market size: Medium (emerging but growing fast)
                Competition: Low (new category)""",
                "metadata": {"type": "ai", "niche": "prompt engineers", "market_size": "medium"}
            },
            {
                "content": """AI opportunities for data scientists in 2025:
                - AutoML pipeline builders with explainability
                - Feature engineering automation tools
                - Model comparison and selection platforms
                - Data quality monitoring dashboards
                - Collaboration tools for ML teams
                Value proposition: Ship models to production in days, not months
                Market size: Large (enterprise data science)
                Competition: Moderate""",
                "metadata": {"type": "ai", "niche": "data scientists", "market_size": "large"}
            },

            # Fintech Opportunities
            {
                "content": """Fintech opportunities for freelancers managing taxes in 2025:
                - Automated expense categorization tools
                - Quarterly tax estimation calculators
                - Invoice tracking with tax implications
                - Multi-currency income tracking
                - Tax deduction optimization suggestions
                Value proposition: Save $1000+ on taxes, never miss a deduction
                Market size: Large (millions of freelancers)
                Competition: Moderate""",
                "metadata": {"type": "fintech", "niche": "freelancers managing taxes", "market_size": "large"}
            },
            {
                "content": """Fintech opportunities for small business owners in 2025:
                - Cash flow forecasting dashboards
                - Invoice factoring comparison platforms
                - Business credit building tools
                - Expense policy enforcement automation
                - Financial health scoring systems
                Value proposition: Never run out of cash, grow with confidence
                Market size: Large (millions of small businesses)
                Competition: Moderate""",
                "metadata": {"type": "fintech", "niche": "small business owners", "market_size": "large"}
            },

            # Social Opportunities
            {
                "content": """Social opportunities for remote teams in 2025:
                - Virtual watercooler and casual conversation spaces
                - Team mood and engagement tracking
                - Async social activities and games
                - Recognition and kudos platforms
                - Virtual team building event coordination
                Value proposition: Build team culture without physical offices
                Market size: Large (remote work is permanent)
                Competition: Moderate""",
                "metadata": {"type": "social", "niche": "remote teams", "market_size": "large"}
            },
            {
                "content": """Social opportunities for online communities in 2025:
                - Community analytics and engagement dashboards
                - Moderation automation and queue management
                - Member segmentation and personalization
                - Event and meetup coordination tools
                - Community monetization platforms
                Value proposition: Grow and monetize your community 10x
                Market size: Medium (community-led growth trend)
                Competition: Low-moderate""",
                "metadata": {"type": "social", "niche": "online communities", "market_size": "medium"}
            },

            # E-commerce Opportunities
            {
                "content": """E-commerce opportunities for handmade sellers in 2025:
                - Craft cost calculator and pricing tools
                - Multi-platform inventory sync (Etsy, Shopify, etc.)
                - Shipping label comparison and automation
                - Customer relationship management for repeat buyers
                - Seasonal trend prediction for crafters
                Value proposition: Spend more time creating, less on admin
                Market size: Medium (growing maker economy)
                Competition: Low""",
                "metadata": {"type": "ecommerce", "niche": "handmade sellers", "market_size": "medium"}
            },
            {
                "content": """E-commerce opportunities for subscription box creators in 2025:
                - Box curation and profitability calculators
                - Subscriber preference tracking
                - Supplier relationship management
                - Churn prediction and win-back tools
                - Unboxing experience optimization
                Value proposition: Double subscriber retention
                Market size: Medium (growing subscription economy)
                Competition: Low""",
                "metadata": {"type": "ecommerce", "niche": "subscription box creators", "market_size": "medium"}
            },
        ]


class ResearchRAG:
    """
    LlamaIndex-powered research for RESEARCH stage.

    Uses semantic search over business knowledge corpus to discover
    relevant niches instead of random selection.
    """

    def __init__(self, corpus_path: Optional[Path] = None):
        """
        Initialize ResearchRAG.

        Args:
            corpus_path: Optional path to custom corpus JSON file
        """
        self.corpus_path = corpus_path
        self.index = None
        self.query_engine = None
        self._initialized = False

        if LLAMAINDEX_AVAILABLE:
            self._initialize_index()
        else:
            logger.warning("ResearchRAG using fallback mode (LlamaIndex not available)")

    def _initialize_index(self):
        """Build VectorStoreIndex from business knowledge corpus."""
        try:
            # Get corpus documents
            corpus = BusinessKnowledgeCorpus.get_documents()

            # Convert to LlamaIndex documents
            documents = [
                Document(
                    text=doc["content"],
                    metadata=doc["metadata"]
                )
                for doc in corpus
            ]

            logger.info(f"Building index from {len(documents)} documents...")

            # Disable LLM - we only need embedding-based retrieval
            Settings.llm = None

            # Create index with HuggingFace embeddings
            self.index = VectorStoreIndex.from_documents(
                documents,
                show_progress=False
            )

            # Use retriever instead of query_engine (no LLM needed)
            # This does pure semantic similarity search
            self.retriever = self.index.as_retriever(
                similarity_top_k=3
            )

            self._initialized = True
            logger.info("ResearchRAG index built successfully (retriever mode)")

        except Exception as e:
            logger.error(f"Failed to initialize ResearchRAG index: {e}")
            self._initialized = False

    async def discover_niche(
        self,
        business_type: str,
        initial_hint: str = "general"
    ) -> DiscoveredNiche:
        """
        Discover a relevant niche using semantic search.

        Args:
            business_type: Type of business (saas, marketplace, etc.)
            initial_hint: Initial market hint from user

        Returns:
            DiscoveredNiche with semantically relevant market
        """
        if not self._initialized or not LLAMAINDEX_AVAILABLE:
            return await self._fallback_discovery(business_type, initial_hint)

        try:
            # Build semantic query for retriever
            query = f"{business_type} business opportunities for {initial_hint if initial_hint != 'general' else 'emerging markets'}"

            # Retrieve similar documents (no LLM needed)
            nodes = self.retriever.retrieve(query)

            if not nodes:
                return await self._fallback_discovery(business_type, initial_hint)

            # Get the best matching node
            top_node = nodes[0]
            metadata = top_node.metadata if hasattr(top_node, 'metadata') else {}

            # Extract niche from metadata or parse text
            niche = metadata.get("niche", "general users")
            market_size = metadata.get("market_size", "medium")

            # Parse value proposition from node text
            node_text = top_node.text if hasattr(top_node, 'text') else str(top_node)
            value_prop = self._extract_value_prop(node_text)

            return DiscoveredNiche(
                niche=niche,
                target_market=f"{niche} who want to {value_prop}",
                value_proposition=value_prop,
                market_size=market_size,
                confidence=0.85,
                source="rag",
                reasoning=node_text[:300]
            )

        except Exception as e:
            logger.error(f"RAG discovery failed: {e}, using fallback")
            return await self._fallback_discovery(business_type, initial_hint)

    def _extract_value_prop(self, text: str) -> str:
        """Extract value proposition from document text."""
        # Look for "Value proposition:" pattern
        lines = text.split("\n")
        for line in lines:
            if "value proposition:" in line.lower():
                parts = line.split(":", 1)
                if len(parts) > 1:
                    return parts[1].strip()[:100]
        # Fallback
        return "improve their workflow"

    def _parse_response(self, response, business_type: str) -> Dict[str, str]:
        """Parse LlamaIndex response to extract niche details."""
        response_text = str(response)

        # Try to extract structured data from response
        result = {
            "niche": "general users",
            "target_market": f"{business_type} users",
            "value_proposition": "improve their workflow",
            "market_size": "medium"
        }

        # Look for patterns in response
        lines = response_text.split("\n")
        for line in lines:
            line_lower = line.lower()
            if "niche:" in line_lower or "target:" in line_lower:
                # Extract value after colon
                parts = line.split(":", 1)
                if len(parts) > 1:
                    result["niche"] = parts[1].strip()[:100]
            elif "value proposition:" in line_lower:
                parts = line.split(":", 1)
                if len(parts) > 1:
                    result["value_proposition"] = parts[1].strip()[:200]
            elif "market size:" in line_lower:
                parts = line.split(":", 1)
                if len(parts) > 1:
                    size = parts[1].strip().lower()
                    if "small" in size:
                        result["market_size"] = "small"
                    elif "large" in size:
                        result["market_size"] = "large"
                    else:
                        result["market_size"] = "medium"

        # If we found source node metadata, use it
        if hasattr(response, 'source_nodes') and response.source_nodes:
            top_node = response.source_nodes[0]
            if hasattr(top_node, 'metadata'):
                metadata = top_node.metadata
                result["niche"] = metadata.get("niche", result["niche"])
                result["market_size"] = metadata.get("market_size", result["market_size"])

        # Build target market string
        result["target_market"] = f"{result['niche']} who want to {result['value_proposition']}"

        return result

    async def _fallback_discovery(
        self,
        business_type: str,
        initial_hint: str
    ) -> DiscoveredNiche:
        """Fallback to random selection when RAG unavailable."""
        import random

        # Fallback niches by business type (simplified)
        fallback_niches = {
            "saas": [
                ("indie game developers", "save 10+ hours per week", "medium"),
                ("AI/ML engineers", "reduce infrastructure costs by 40%", "large"),
                ("startup founders", "focus on building, not admin", "medium"),
            ],
            "marketplace": [
                ("freelance designers", "find better clients", "medium"),
                ("content creators", "monetize beyond ads", "large"),
            ],
            "analytics": [
                ("e-commerce stores", "increase revenue by 20%", "large"),
                ("SaaS companies", "reduce churn by 25%", "large"),
            ],
            "automation": [
                ("HR departments", "eliminate 80% of repetitive tasks", "large"),
                ("sales teams", "double meeting bookings", "large"),
            ],
            "education": [
                ("coding bootcamp students", "land first dev job 2x faster", "medium"),
                ("career changers", "transition careers with confidence", "large"),
            ],
            "ai": [
                ("prompt engineers", "build AI apps 5x faster", "medium"),
                ("data scientists", "ship models in days, not months", "large"),
            ],
            "fintech": [
                ("freelancers managing taxes", "save $1000+ on taxes", "large"),
                ("small business owners", "never run out of cash", "large"),
            ],
            "social": [
                ("remote teams", "build culture without offices", "large"),
                ("online communities", "grow and monetize 10x", "medium"),
            ],
            "ecommerce": [
                ("handmade sellers", "spend more time creating", "medium"),
                ("subscription box creators", "double subscriber retention", "medium"),
            ],
        }

        # Get niches for business type
        niches = fallback_niches.get(business_type, fallback_niches["saas"])

        # Random selection
        niche, value_prop, market_size = random.choice(niches)

        return DiscoveredNiche(
            niche=niche,
            target_market=f"{niche} who want to {value_prop}",
            value_proposition=value_prop,
            market_size=market_size,
            confidence=0.6,  # Lower confidence for random
            source="fallback",
            reasoning="Random selection (LlamaIndex not available)"
        )

    async def get_competitor_insights(
        self,
        business_type: str,
        niche: str
    ) -> Dict[str, Any]:
        """
        Get competitor and market insights for a niche.

        Args:
            business_type: Type of business
            niche: Target niche

        Returns:
            Dict with competitor and market insights
        """
        if not self._initialized or not LLAMAINDEX_AVAILABLE:
            return {"insights": "No RAG available", "competitors": [], "opportunities": []}

        try:
            query = f"""
            What are the competitive dynamics for a {business_type} targeting {niche}?
            Include: competition level, key differentiators, and market opportunities.
            """

            response = self.query_engine.query(query)

            return {
                "insights": str(response)[:1000],
                "source": "rag"
            }

        except Exception as e:
            logger.error(f"Competitor insights failed: {e}")
            return {"insights": "Analysis unavailable", "source": "error"}


# ========== Pipeline Integration ==========

async def get_research_rag() -> ResearchRAG:
    """Get a ResearchRAG instance."""
    return ResearchRAG()


async def discover_niche_with_rag(
    business_type: str,
    initial_hint: str = "general"
) -> Dict[str, Any]:
    """
    Convenience function for pipeline integration.

    Returns dict compatible with existing pipeline format.
    """
    rag = ResearchRAG()
    result = await rag.discover_niche(business_type, initial_hint)

    return {
        "initial_hint": initial_hint,
        "refined_market": result.target_market,
        "niche": result.niche,
        "value_proposition": result.value_proposition,
        "market_size": result.market_size,
        "modifier": "growth-stage" if result.market_size == "large" else "early-stage",
        "full_description": f"{result.niche} seeking to {result.value_proposition}",
        "discovery_method": result.source,
        "confidence": result.confidence,
        "reasoning": result.reasoning[:200] if result.reasoning else ""
    }


if __name__ == "__main__":
    import asyncio

    async def test():
        print("Testing ResearchRAG")
        print("=" * 60)
        print(f"LlamaIndex available: {LLAMAINDEX_AVAILABLE}")
        print()

        rag = ResearchRAG()

        # Test different business types
        for biz_type in ["saas", "marketplace", "ai", "fintech"]:
            print(f"\nDiscovering niche for: {biz_type}")
            result = await rag.discover_niche(biz_type)
            print(f"  Niche: {result.niche}")
            print(f"  Target: {result.target_market}")
            print(f"  Value: {result.value_proposition}")
            print(f"  Size: {result.market_size}")
            print(f"  Source: {result.source}")
            print(f"  Confidence: {result.confidence:.0%}")

    asyncio.run(test())
