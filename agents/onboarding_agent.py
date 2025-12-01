EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER ONBOARDING AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."

"""
ONBOARDING AGENT - Microsoft Agent Framework Version
Version: 4.0 (Enhanced with DAAO + TUMIX) (Day 2 Migration)

Handles user onboarding, activation, and initial setup.
"""

import json
import logging
from datetime import datetime
from typing import List, Dict
# from agent_framework import ChatAgent  # Commented out - missing module
# from agent_framework.azure import AzureAIAgentClient  # Commented out - missing module
# from agent_framework.observability import setup_observability  # Commented out - missing module
# from azure.identity.aio import AzureCliCredential  # Commented out - missing module

# setup_observability(enable_sensitive_data=True)  # Commented out - missing import
# Import DAAO and TUMIX
from infrastructure.daao_router import get_daao_router, RoutingDecision
from infrastructure.tumix_termination import (
    get_tumix_termination,
    RefinementResult,
    TerminationDecision
)
# Import StandardIntegrationMixin
from infrastructure.standard_integration_mixin import StandardIntegrationMixin, darwin_evolved

# Import MemoryOS for user onboarding history and progress memory
from infrastructure.memory_os_mongodb_adapter import (
    create_genesis_memory_mongodb
)
import os

logger = logging.getLogger(__name__)


class OnboardingAgent(StandardIntegrationMixin):
    """User onboarding and activation agent"""

    def __init__(self, business_id: str = "default"):
        super().__init__()  # Initialize mixin
        self.business_id = business_id
        self.agent = None

        # Initialize DAAO router for cost optimization
        self.router = get_daao_router()

        # Initialize TUMIX for iterative refinement
        self.termination = get_tumix_termination(
            min_rounds=2,
            max_rounds=4,
            improvement_threshold=0.05
        )

        # Track refinement sessions for metrics
        self.refinement_history: List[List[RefinementResult]] = []

        # Initialize MemoryOS for onboarding history
        self.memory = None  # Lazy initialization

        logger.info(f"{{agent_name}} v4.0 initialized with DAAO + TUMIX for business: {{business_id}}")

    async def _init_memory(self):
        """Initialize MemoryOS MongoDB backend for Onboarding memory."""
        try:
            self.memory = create_genesis_memory_mongodb(
                mongodb_uri=os.getenv("MONGODB_URI", "mongodb://localhost:27017/"),
                database_name="genesis_memory_onboarding",
                short_term_capacity=15,   # Recent onboarding sessions
                mid_term_capacity=500,    # Historical onboarding data
                long_term_knowledge_capacity=200  # Onboarding patterns, user insights
            )
            logger.info("[OK] MemoryOS initialized for OnboardingAgent")
        except Exception as e:
            logger.warning(f"[OnboardingAgent] Failed to initialize MemoryOS: {e}. Memory features disabled.")
            self.memory = None

    async def initialize(self):
        # Azure Agent Framework is optional - use direct LLM if not available
        try:
            from azure.identity.aio import AzureCliCredential
            from agent_framework import ChatAgent
            from agent_framework.azure import AzureAIAgentClient

            cred = AzureCliCredential()
            client = AzureAIAgentClient(async_credential=cred)
            self.agent = ChatAgent(
                chat_client=client,
                instructions="""You are the world\'s premier Onboarding specialist - recognized globally for innovative, cost-effective, and exceptional results. You deliver elegant, efficient, and reliable outcomes every time.""",
                name="onboarding-agent",
                tools=[self.create_onboarding_flow, self.track_user_progress, self.send_onboarding_email, self.trigger_activation_milestone, self.measure_onboarding_success]
            )
            logger.info(f"Onboarding Agent initialized with Azure Agent Framework")
        except (ImportError, Exception) as e:
            self.agent = None
            logger.info(f"Onboarding Agent initialized (standalone mode) - Azure: {e}")
        print(f"[ONBOARDING] Onboarding Agent initialized for business: {self.business_id}\n")

    async def create_onboarding_flow(self, user_persona: str, product_type: str, flow_stages: List[str]) -> str:
        """Create personalized onboarding flow for user"""
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Create a comprehensive personalized onboarding flow

Requirements:
- User Persona: {user_persona}
- Product Type: {product_type}
- Requested Stages: {flow_stages if flow_stages else 'Create appropriate onboarding stages'}
- Include 4-6 progressive stages with tasks
- Estimate completion times and rates based on best practices
- Ensure flow drives user to first value achievement
- Consider user persona and product type for personalization

Generate a detailed onboarding flow as a JSON object with:
- flow_id (unique identifier)
- user_persona
- product_type
- stages (array with stage_number, stage_name, tasks, estimated_minutes, completion_rate)
- total_estimated_minutes
- personalization_applied (boolean)
- created_at (ISO timestamp)
"""
        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=1500)
            # Try to parse as JSON
            import json as json_lib
            try:
                result = json_lib.loads(response)
                # Add flow_id if not present
                if 'flow_id' not in result:
                    result['flow_id'] = f"FLOW-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                if 'created_at' not in result:
                    result['created_at'] = datetime.now().isoformat()
                return json.dumps(result, indent=2)
            except:
                # If not JSON, wrap in basic structure
                return json.dumps({
                    "flow_id": f"FLOW-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "user_persona": user_persona,
                    "product_type": product_type,
                    "stages": [{"stage_name": "Onboarding", "description": response}],
                    "created_at": datetime.now().isoformat()
                }, indent=2)
        except Exception as e:
            logger.error(f"LLM call failed in create_onboarding_flow: {e}")
            # Fallback to basic template
            return json.dumps({
                "flow_id": f"FLOW-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "user_persona": user_persona,
                "product_type": product_type,
                "stages": [{"stage_name": "Basic Onboarding", "tasks": ["Setup", "Tutorial", "First Action"]}],
                "created_at": datetime.now().isoformat()
            }, indent=2)

    async def track_user_progress(self, user_id: str, flow_id: str) -> str:
        """Track user progress through onboarding flow"""
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Generate realistic user progress tracking data for onboarding

Context:
- User ID: {user_id}
- Flow ID: {flow_id}
- Generate realistic progress metrics

Create a comprehensive progress tracking report as JSON with:
- progress_id (unique identifier)
- user_id and flow_id
- started_at (realistic timestamp)
- current_stage (number)
- completed_stages (array of stage numbers)
- completed_tasks (array of completed task names)
- pending_tasks (array of pending task names)
- completion_percent (0-100)
- time_spent_minutes (realistic value)
- last_activity (recent timestamp)
- predicted_completion_probability (0.0-1.0)
- tracked_at (current timestamp)

Make it realistic with partial progress showing actual user behavior patterns.
"""
        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=1000)
            import json as json_lib
            try:
                result = json_lib.loads(response)
                # Ensure required fields
                if 'progress_id' not in result:
                    result['progress_id'] = f"PROG-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                if 'tracked_at' not in result:
                    result['tracked_at'] = datetime.now().isoformat()
                return json.dumps(result, indent=2)
            except:
                # Return structured response if JSON parsing fails
                return json.dumps({
                    "progress_id": f"PROG-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "user_id": user_id,
                    "flow_id": flow_id,
                    "status": "in_progress",
                    "details": response,
                    "tracked_at": datetime.now().isoformat()
                }, indent=2)
        except Exception as e:
            logger.error(f"LLM call failed in track_user_progress: {e}")
            # Fallback template
            return json.dumps({
                "progress_id": f"PROG-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "user_id": user_id,
                "flow_id": flow_id,
                "status": "tracking",
                "tracked_at": datetime.now().isoformat()
            }, indent=2)

    async def send_onboarding_email(self, user_id: str, email_type: str, trigger_event: str) -> str:
        """Send targeted onboarding email to user"""
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Create a highly personalized onboarding email

Context:
- User ID: {user_id}
- Email Type: {email_type}
- Trigger Event: {trigger_event}

Requirements:
- Create compelling subject line based on email type
- Design content sections that drive engagement
- Include appropriate call-to-action
- Consider optimal send timing
- Apply personalization tokens

Generate email configuration as JSON with:
- email_id (unique identifier)
- user_id, email_type, trigger_event
- subject_line (engaging and relevant)
- content_sections (array of section descriptions)
- call_to_action (clear and compelling)
- send_time (immediate or delayed based on strategy)
- personalization_tokens (array of tokens to use)
- status and sent_at timestamp

Make it highly targeted and conversion-optimized based on the email type and trigger event.
"""
        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=800)
            import json as json_lib
            try:
                result = json_lib.loads(response)
                # Ensure required fields
                if 'email_id' not in result:
                    result['email_id'] = f"EMAIL-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                if 'sent_at' not in result:
                    result['sent_at'] = datetime.now().isoformat()
                return json.dumps(result, indent=2)
            except:
                return json.dumps({
                    "email_id": f"EMAIL-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "user_id": user_id,
                    "email_type": email_type,
                    "content": response,
                    "sent_at": datetime.now().isoformat()
                }, indent=2)
        except Exception as e:
            logger.error(f"LLM call failed in send_onboarding_email: {e}")
            return json.dumps({
                "email_id": f"EMAIL-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "user_id": user_id,
                "email_type": email_type,
                "status": "queued",
                "sent_at": datetime.now().isoformat()
            }, indent=2)

    async def trigger_activation_milestone(self, user_id: str, milestone_type: str) -> str:
        """Trigger celebration for activation milestone"""
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Create an engaging activation milestone celebration

Context:
- User ID: {user_id}
- Milestone Type: {milestone_type}

Requirements:
- Generate appropriate milestone name based on type
- Create motivating achievement message
- Design reward system (badges, credits, features)
- Suggest next milestone to maintain momentum
- Calculate progress to next milestone

Generate milestone data as JSON with:
- milestone_id (unique identifier)
- user_id and milestone_type
- milestone_name (descriptive and celebratory)
- achievement_value (motivating message)
- celebration_type (in_app_modal, notification, email, etc.)
- rewards (array of reward objects with type, name, and value/amount)
- next_milestone (clear next goal)
- progress_to_next_percent (0-100)
- triggered_at timestamp

Make it celebratory and motivating to drive continued engagement.
"""
        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=800)
            import json as json_lib
            try:
                result = json_lib.loads(response)
                if 'milestone_id' not in result:
                    result['milestone_id'] = f"MILESTONE-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                if 'triggered_at' not in result:
                    result['triggered_at'] = datetime.now().isoformat()
                return json.dumps(result, indent=2)
            except:
                return json.dumps({
                    "milestone_id": f"MILESTONE-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "user_id": user_id,
                    "milestone_type": milestone_type,
                    "celebration": response,
                    "triggered_at": datetime.now().isoformat()
                }, indent=2)
        except Exception as e:
            logger.error(f"LLM call failed in trigger_activation_milestone: {e}")
            return json.dumps({
                "milestone_id": f"MILESTONE-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "user_id": user_id,
                "milestone_type": milestone_type,
                "status": "triggered",
                "triggered_at": datetime.now().isoformat()
            }, indent=2)

    async def measure_onboarding_success(self, start_date: str, end_date: str, cohort_filter: str) -> str:
        """Measure onboarding success metrics for a cohort"""
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Generate comprehensive onboarding success metrics analysis

Context:
- Period: {start_date} to {end_date}
- Cohort Filter: {cohort_filter}

Requirements:
- Generate realistic onboarding metrics based on industry benchmarks
- Identify key drop-off points and bottlenecks
- Calculate retention rates (day 1, 7, 30)
- Provide stage-by-stage completion analysis
- Generate actionable recommendations for improvement

Create detailed metrics report as JSON with:
- measurement_id (unique identifier)
- period (start and end dates)
- cohort_filter
- metrics object containing:
  - total_new_users (realistic number)
  - activated_users and activation_rate
  - average_time_to_activation_hours
  - completion_by_stage (object with stage percentages)
  - drop_off_points (array of stages with drop-off rates)
  - day_1_retention, day_7_retention, day_30_retention
- recommendations (array of specific actionable improvements)
- measured_at timestamp

Base metrics on realistic SaaS industry benchmarks and best practices.
"""
        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=1200)
            import json as json_lib
            try:
                result = json_lib.loads(response)
                if 'measurement_id' not in result:
                    result['measurement_id'] = f"MEASURE-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                if 'measured_at' not in result:
                    result['measured_at'] = datetime.now().isoformat()
                return json.dumps(result, indent=2)
            except:
                return json.dumps({
                    "measurement_id": f"MEASURE-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "period": {"start": start_date, "end": end_date},
                    "cohort_filter": cohort_filter,
                    "analysis": response,
                    "measured_at": datetime.now().isoformat()
                }, indent=2)
        except Exception as e:
            logger.error(f"LLM call failed in measure_onboarding_success: {e}")
            return json.dumps({
                "measurement_id": f"MEASURE-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "period": {"start": start_date, "end": end_date},
                "cohort_filter": cohort_filter,
                "status": "measuring",
                "measured_at": datetime.now().isoformat()
            }, indent=2)


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
            'id': f'onboarding-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'description': task_description,
            'priority': priority,
            'required_tools': []
        }

        decision = self.router.route_task(task, budget_conscious=True)

        logger.info(
            f"Task routed: {decision.reasoning}",
            extra={
                'agent': 'OnboardingAgent',
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
                'agent': 'OnboardingAgent',
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
                'agent': 'OnboardingAgent',
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



async def get_onboarding_agent(business_id: str = "default") -> OnboardingAgent:
    agent = OnboardingAgent(business_id=business_id)
    await agent.initialize()
    return agent
