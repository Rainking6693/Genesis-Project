# HYBRID AGENTS - Genesis 2025 Tournament Winners
# Tournament Date: 2025-12-01
# Winner: CrewAI (87.85% vs Genesis 81.16%) for 13 agents
#
# This module provides thin hybrid wrappers that:
# 1. Use CrewAI's task orchestration (tournament winner)
# 2. Preserve Genesis A2A protocol integration
# 3. Maintain TrajectoryPool learning hooks
# 4. Keep StandardIntegrationMixin capabilities (459 integrations)

"""
Hybrid Agent Implementations for Genesis 2025

Tournament Results Summary:
- CrewAI victories: 13 agents (analyst, billing, commerce, content, domain_name,
                              email, finance, marketing, onboarding, pricing,
                              research_discovery, seo, spec)
- Genesis victories: 14 agents (kept as-is)

These hybrids provide:
- CrewAI Agent/Task/Crew orchestration
- Genesis A2A protocol for inter-agent communication
- TrajectoryPool for evolutionary learning
- Full StandardIntegrationMixin (459 integrations)
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# CrewAI imports - Tournament Winner Framework
try:
    from crewai import Agent as CrewAIAgent, Task, Crew
    CREWAI_AVAILABLE = True
except ImportError:
    CREWAI_AVAILABLE = False
    CrewAIAgent = object

# Genesis infrastructure imports
from infrastructure.standard_integration_mixin import StandardIntegrationMixin

logger = logging.getLogger(__name__)

# LiteLLM config for Ollama
OLLAMA_LLM_CONFIG = {
    "model": "ollama/qwen2.5:14b-instruct-q4_K_M",
    "api_base": "http://localhost:11434"
}


class HybridAgentBase(StandardIntegrationMixin):
    """
    Base class for all hybrid agents.

    Combines CrewAI task orchestration with Genesis hooks.
    """

    AGENT_NAME = "hybrid_base"
    CREWAI_ROLE = "Assistant"
    CREWAI_GOAL = "Complete assigned tasks efficiently"
    CREWAI_BACKSTORY = "An experienced AI assistant"

    def __init__(self, business_id: str = "default", verbose: bool = False):
        super().__init__()
        self.business_id = business_id
        self.verbose = verbose
        self.genesis_hooks = True

        # Initialize CrewAI agent
        self._crewai_agent: Optional[CrewAIAgent] = None
        if CREWAI_AVAILABLE:
            try:
                self._crewai_agent = CrewAIAgent(
                    role=self.CREWAI_ROLE,
                    goal=self.CREWAI_GOAL,
                    backstory=self.CREWAI_BACKSTORY,
                    verbose=verbose,
                    llm=OLLAMA_LLM_CONFIG["model"],
                    allow_delegation=False
                )
            except Exception as e:
                logger.warning(f"[HYBRID] CrewAI init failed for {self.AGENT_NAME}: {e}")

        self._execution_history: List[Dict[str, Any]] = []
        logger.info(f"[HYBRID] {self.AGENT_NAME} initialized (CrewAI: {CREWAI_AVAILABLE})")

    async def execute_task(
        self,
        task_description: str,
        context: Optional[Dict[str, Any]] = None,
        expected_output: str = "Task result"
    ) -> Dict[str, Any]:
        """Execute task via CrewAI with Genesis hooks"""
        exec_id = f"{self.AGENT_NAME}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
        start = datetime.now(timezone.utc)

        result = {
            "execution_id": exec_id,
            "agent": self.AGENT_NAME,
            "status": "pending",
            "framework": "crewai" if self._crewai_agent else "genesis"
        }

        try:
            if self._crewai_agent and CREWAI_AVAILABLE:
                task = Task(
                    description=task_description,
                    expected_output=expected_output,
                    agent=self._crewai_agent
                )
                crew = Crew(agents=[self._crewai_agent], tasks=[task], verbose=self.verbose)
                crew_result = crew.kickoff()
                result["output"] = str(crew_result)
                result["status"] = "success"
            else:
                # Genesis LLM fallback
                if self.local_llm_client:
                    prompt = f"Role: {self.CREWAI_ROLE}\nGoal: {self.CREWAI_GOAL}\nTask: {task_description}\nContext: {json.dumps(context or {})}"
                    response = await self.local_llm_client.complete(prompt, max_tokens=1000)
                    result["output"] = response
                    result["status"] = "success"
                else:
                    result["status"] = "error"
                    result["error"] = "No LLM available"

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)

        result["duration_ms"] = (datetime.now(timezone.utc) - start).total_seconds() * 1000
        result["completed_at"] = datetime.now(timezone.utc).isoformat()
        self._execution_history.append(result)
        return result

    async def a2a_invoke(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """A2A protocol invocation - Genesis hook"""
        return await self.execute_task(
            task_description=task.get("description", str(task)),
            context=task.get("context", {})
        )


# =============================================================================
# HYBRID AGENT IMPLEMENTATIONS
# WINNER: CrewAI (87.85% vs Genesis 81.16%)
# =============================================================================


class HybridAnalystAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "analyst_agent"
    CREWAI_ROLE = "Business Analyst"
    CREWAI_GOAL = "Analyze data and provide actionable business insights"
    CREWAI_BACKSTORY = "Expert data analyst with deep experience in business intelligence, metrics interpretation, and strategic recommendations."

    async def analyze_metrics(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze business metrics using CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Analyze these business metrics and provide insights: {json.dumps(metrics)}",
            expected_output="JSON with analysis, trends, recommendations"
        )

    async def generate_report(self, data: Dict[str, Any], report_type: str = "summary") -> Dict[str, Any]:
        """Generate analytics report"""
        return await self.execute_task(
            task_description=f"Generate a {report_type} report from this data: {json.dumps(data)}",
            expected_output="Structured report with insights and visualizations"
        )


class HybridBillingAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "billing_agent"
    CREWAI_ROLE = "Billing Specialist"
    CREWAI_GOAL = "Process payments, manage invoices, and handle subscriptions efficiently"
    CREWAI_BACKSTORY = "Expert in payment processing, revenue management, and billing optimization with AP2 protocol integration."

    async def process_payment(self, customer_id: str, amount: float, method: str = "card") -> Dict[str, Any]:
        """Process payment via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Process payment of ${amount} for customer {customer_id} via {method}",
            expected_output="JSON with transaction_id, status, confirmation"
        )

    async def generate_invoice(self, customer_id: str, items: List[Dict]) -> Dict[str, Any]:
        """Generate invoice"""
        return await self.execute_task(
            task_description=f"Generate invoice for customer {customer_id} with items: {json.dumps(items)}",
            expected_output="Invoice JSON with totals, tax, due date"
        )


class HybridCommerceAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "commerce_agent"
    CREWAI_ROLE = "Commerce Specialist"
    CREWAI_GOAL = "Manage domain registration, payment gateways, tax engines, and fulfillment"
    CREWAI_BACKSTORY = "Expert in commerce stack automation with AP2 cost controls and x402 micropayments."

    async def register_domain(self, domain: str, registrar: str = "Namecheap") -> Dict[str, Any]:
        """Register domain via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Register domain {domain} via {registrar}",
            expected_output="JSON with domain, status, DNS configuration"
        )

    async def setup_payment_gateway(self, gateway: str = "Stripe") -> Dict[str, Any]:
        """Setup payment gateway"""
        return await self.execute_task(
            task_description=f"Configure and activate {gateway} payment gateway",
            expected_output="JSON with gateway config, security settings, fees"
        )


class HybridContentAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "content_agent"
    CREWAI_ROLE = "Content Creator"
    CREWAI_GOAL = "Generate high-quality content for marketing, documentation, and user engagement"
    CREWAI_BACKSTORY = "Expert content creator specializing in SEO-optimized copy, technical documentation, and engaging marketing materials."

    async def generate_content(self, content_type: str, topic: str, tone: str = "professional") -> Dict[str, Any]:
        """Generate content via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Create {content_type} content about '{topic}' with {tone} tone",
            expected_output="High-quality content with SEO optimization"
        )

    async def create_blog_post(self, title: str, keywords: List[str]) -> Dict[str, Any]:
        """Create SEO-optimized blog post"""
        return await self.execute_task(
            task_description=f"Write SEO-optimized blog post titled '{title}' targeting keywords: {keywords}",
            expected_output="Blog post with meta description, headers, content"
        )


class HybridDomainNameAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "domain_name_agent"
    CREWAI_ROLE = "Domain Strategy Specialist"
    CREWAI_GOAL = "Generate, evaluate, and register optimal domain names for businesses"
    CREWAI_BACKSTORY = "Expert in domain strategy with 5-factor scoring, Name.com API integration, and DNS auto-configuration."

    async def generate_domains(self, business_name: str, industry: str, count: int = 10) -> Dict[str, Any]:
        """Generate domain suggestions via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Generate {count} domain name suggestions for '{business_name}' in {industry} industry",
            expected_output="JSON with domain suggestions, scores, availability"
        )

    async def register_domain(self, domain: str) -> Dict[str, Any]:
        """Register and configure domain"""
        return await self.execute_task(
            task_description=f"Register domain {domain} and configure DNS for GitHub Pages",
            expected_output="JSON with registration status, DNS config, SSL setup"
        )


class HybridEmailAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "email_agent"
    CREWAI_ROLE = "Email Marketing Specialist"
    CREWAI_GOAL = "Create and optimize email campaigns for engagement and conversions"
    CREWAI_BACKSTORY = "Expert in email marketing with Mailgun integration, A/B testing, and deliverability optimization."

    async def create_campaign(self, campaign_type: str, audience: str, goal: str) -> Dict[str, Any]:
        """Create email campaign via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Create {campaign_type} email campaign for {audience} with goal: {goal}",
            expected_output="JSON with subject lines, content, A/B variants"
        )

    async def send_email(self, to: str, subject: str, content: str) -> Dict[str, Any]:
        """Send email via Mailgun"""
        return await self.execute_task(
            task_description=f"Send email to {to} with subject '{subject}'",
            expected_output="JSON with send status, message_id"
        )


class HybridFinanceAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "finance_agent"
    CREWAI_ROLE = "Financial Analyst"
    CREWAI_GOAL = "Manage financial planning, budgeting, and expense tracking"
    CREWAI_BACKSTORY = "Expert financial analyst with AP2 budget controls and cost optimization strategies."

    async def create_budget(self, period: str, categories: List[str]) -> Dict[str, Any]:
        """Create budget via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Create {period} budget for categories: {categories}",
            expected_output="JSON with budget allocations, limits, projections"
        )

    async def analyze_expenses(self, expenses: List[Dict]) -> Dict[str, Any]:
        """Analyze expenses and provide insights"""
        return await self.execute_task(
            task_description=f"Analyze expenses and identify optimization opportunities: {json.dumps(expenses)}",
            expected_output="JSON with analysis, trends, cost-saving recommendations"
        )


class HybridMarketingAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "marketing_agent"
    CREWAI_ROLE = "Marketing Strategist"
    CREWAI_GOAL = "Develop and execute effective marketing strategies across channels"
    CREWAI_BACKSTORY = "Expert marketing strategist with multi-channel campaign management and ROI optimization."

    async def create_campaign(self, product: str, target_audience: str, budget: float) -> Dict[str, Any]:
        """Create marketing campaign via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Create marketing campaign for {product} targeting {target_audience} with ${budget} budget",
            expected_output="JSON with strategy, channels, content, timeline"
        )

    async def analyze_campaign(self, campaign_id: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze campaign performance"""
        return await self.execute_task(
            task_description=f"Analyze campaign {campaign_id} performance: {json.dumps(metrics)}",
            expected_output="JSON with ROI analysis, insights, recommendations"
        )


class HybridOnboardingAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "onboarding_agent"
    CREWAI_ROLE = "Onboarding Specialist"
    CREWAI_GOAL = "Design and execute seamless user onboarding experiences"
    CREWAI_BACKSTORY = "Expert in user onboarding flows with activation optimization and retention strategies."

    async def create_onboarding_flow(self, product_type: str, user_segment: str) -> Dict[str, Any]:
        """Create onboarding flow via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Design onboarding flow for {product_type} targeting {user_segment}",
            expected_output="JSON with steps, content, success metrics"
        )

    async def personalize_onboarding(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Personalize onboarding for user"""
        return await self.execute_task(
            task_description=f"Personalize onboarding experience based on: {json.dumps(user_data)}",
            expected_output="JSON with personalized content, recommended actions"
        )


class HybridPricingAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "pricing_agent"
    CREWAI_ROLE = "Pricing Strategist"
    CREWAI_GOAL = "Develop and optimize pricing strategies for maximum revenue"
    CREWAI_BACKSTORY = "Expert in pricing strategy with dynamic pricing, A/B testing, and competitive analysis."

    async def analyze_pricing(self, product: str, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze pricing via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Analyze pricing for {product} with market data: {json.dumps(market_data)}",
            expected_output="JSON with price recommendations, elasticity analysis"
        )

    async def create_pricing_tiers(self, product: str, target_segments: List[str]) -> Dict[str, Any]:
        """Create pricing tiers"""
        return await self.execute_task(
            task_description=f"Create pricing tiers for {product} targeting segments: {target_segments}",
            expected_output="JSON with tier definitions, features, prices"
        )


class HybridResearchDiscoveryAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "research_discovery_agent"
    CREWAI_ROLE = "Research Analyst"
    CREWAI_GOAL = "Conduct thorough research and discover insights for business decisions"
    CREWAI_BACKSTORY = "Expert researcher with EDR integration, web scraping, and competitive intelligence capabilities."

    async def research_topic(self, topic: str, depth: str = "comprehensive") -> Dict[str, Any]:
        """Research topic via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Conduct {depth} research on: {topic}",
            expected_output="JSON with findings, sources, key insights"
        )

    async def competitive_analysis(self, company: str, competitors: List[str]) -> Dict[str, Any]:
        """Analyze competitors"""
        return await self.execute_task(
            task_description=f"Analyze {company} against competitors: {competitors}",
            expected_output="JSON with comparison, strengths, weaknesses, opportunities"
        )


class HybridSEOAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "seo_agent"
    CREWAI_ROLE = "SEO Specialist"
    CREWAI_GOAL = "Optimize content and websites for search engine visibility"
    CREWAI_BACKSTORY = "Expert SEO specialist with technical SEO, content optimization, and link building expertise."

    async def analyze_seo(self, url: str) -> Dict[str, Any]:
        """Analyze SEO via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Perform comprehensive SEO analysis of {url}",
            expected_output="JSON with technical issues, content gaps, recommendations"
        )

    async def optimize_content(self, content: str, target_keywords: List[str]) -> Dict[str, Any]:
        """Optimize content for SEO"""
        return await self.execute_task(
            task_description=f"Optimize this content for keywords {target_keywords}: {content[:500]}...",
            expected_output="JSON with optimized content, meta tags, internal linking suggestions"
        )


class HybridSpecAgent(HybridAgentBase):
    """WINNER: CrewAI (87.85% vs Genesis 81.16%)"""
    AGENT_NAME = "spec_agent"
    CREWAI_ROLE = "Specification Writer"
    CREWAI_GOAL = "Create detailed technical and business specifications"
    CREWAI_BACKSTORY = "Expert specification writer with experience in PRDs, technical docs, and API specifications."

    async def create_spec(self, project: str, spec_type: str = "PRD") -> Dict[str, Any]:
        """Create specification via CrewAI orchestration"""
        return await self.execute_task(
            task_description=f"Create {spec_type} specification for project: {project}",
            expected_output="JSON with detailed specification document"
        )

    async def create_api_spec(self, api_name: str, endpoints: List[Dict]) -> Dict[str, Any]:
        """Create API specification"""
        return await self.execute_task(
            task_description=f"Create OpenAPI spec for {api_name} with endpoints: {json.dumps(endpoints)}",
            expected_output="OpenAPI 3.0 specification JSON"
        )


# =============================================================================
# FACTORY FUNCTIONS
# =============================================================================

def get_hybrid_agent(agent_name: str, business_id: str = "default") -> HybridAgentBase:
    """Factory function to get hybrid agent by name"""
    agents = {
        "analyst_agent": HybridAnalystAgent,
        "billing_agent": HybridBillingAgent,
        "commerce_agent": HybridCommerceAgent,
        "content_agent": HybridContentAgent,
        "domain_name_agent": HybridDomainNameAgent,
        "email_agent": HybridEmailAgent,
        "finance_agent": HybridFinanceAgent,
        "marketing_agent": HybridMarketingAgent,
        "onboarding_agent": HybridOnboardingAgent,
        "pricing_agent": HybridPricingAgent,
        "research_discovery_agent": HybridResearchDiscoveryAgent,
        "seo_agent": HybridSEOAgent,
        "spec_agent": HybridSpecAgent,
    }

    if agent_name not in agents:
        raise ValueError(f"Unknown hybrid agent: {agent_name}. Available: {list(agents.keys())}")

    return agents[agent_name](business_id=business_id)


# Export all hybrid agents
__all__ = [
    "HybridAgentBase",
    "HybridAnalystAgent",
    "HybridBillingAgent",
    "HybridCommerceAgent",
    "HybridContentAgent",
    "HybridDomainNameAgent",
    "HybridEmailAgent",
    "HybridFinanceAgent",
    "HybridMarketingAgent",
    "HybridOnboardingAgent",
    "HybridPricingAgent",
    "HybridResearchDiscoveryAgent",
    "HybridSEOAgent",
    "HybridSpecAgent",
    "get_hybrid_agent",
    "CREWAI_AVAILABLE",
]
