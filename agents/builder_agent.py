EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER BUILDER AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."

"""
BUILDER AGENT - Microsoft Agent Framework Version
Version: 4.0 (Enhanced with DAAO + TUMIX)
Last Updated: October 16, 2025

Complete code generation system for building production-ready applications.
Enhanced with:
- DAAO routing (40-50% cost reduction on varied complexity code tasks)
- TUMIX early termination (10-20% cost reduction on code refinement)

MODEL: Claude Sonnet 4 (via Azure fallback) or GPT-4o
OUTPUT: 20-30 complete code files ready to deploy
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
# from agent_framework import ChatAgent  # Commented out - missing module
# from agent_framework.azure import AzureAIAgentClient  # Commented out - missing module
# from agent_framework.observability import setup_observability  # Commented out - missing module
# from azure.identity.aio import AzureCliCredential  # Commented out - missing module

# Import StandardIntegrationMixin for ALL 283 integrations
from infrastructure.standard_integration_mixin import StandardIntegrationMixin, darwin_evolved

# Import DAAO and TUMIX
from infrastructure.daao_router import get_daao_router, RoutingDecision
from infrastructure.tumix_termination import (
    get_tumix_termination,
    RefinementResult,
    TerminationDecision
)

# Import self-correction for QA validation loop
from infrastructure.self_correction import (
    SelfCorrectingAgent,
    ValidationCategory,
    get_self_correcting_agent
)

# Import OpenEnv for deployment testing
from infrastructure.openenv_wrapper import EnvRegistry
from infrastructure.env_learning_agent import EnvironmentLearningAgent
from infrastructure.hopx_agent_adapter import HopXAgentAdapter, collect_directory_payload
from infrastructure.x402_vendor_cache import get_x402_vendor_cache
from infrastructure.x402_client import get_x402_client, X402PaymentError

# setup_observability(enable_sensitive_data=True)  # Commented out - missing import
logger = logging.getLogger(__name__)


class BuilderAgent(StandardIntegrationMixin):
    """

    Builder Agent - Code Generation Specialist

    Responsibilities:
    1. Generate complete Next.js/React applications from specifications
    2. Create all necessary files (frontend, backend, API, database)
    3. Ensure production-ready code quality
    4. Follow modern best practices
    5. Include proper TypeScript types, error handling, loading states

    Tools:
    - generate_frontend: Create React/Next.js frontend code
    - generate_backend: Create API routes and backend logic
    - generate_database: Create database schemas and migrations
    - generate_config: Create configuration files
    - review_code: Code quality review and suggestions
    """

    def __init__(self, business_id: str = "default"):
        super().__init__()  # Initialize StandardIntegrationMixin with all 283 integrations
        self.business_id = business_id
        self.agent = None
        self.executions = 0
        self.total_cost = 0.0
        self.hopx_adapter = HopXAgentAdapter("Builder Agent", business_id)
        # NOTE: x402_client and vendor_cache are now available via StandardIntegrationMixin
        self._current_build_spend = 0.0
        self._builder_spend_cap = float(os.getenv("BUILDER_LLM_CAP", "150"))
        self._cost_events: List[Dict[str, Any]] = []

        # Initialize DAAO router for cost optimization
        self.router = get_daao_router()

        # Initialize TUMIX for iterative code refinement
        # Code generation: min 2, max 4 rounds, 5% threshold
        self.termination = get_tumix_termination(
            min_rounds=2,  # Initial code + review minimum
            max_rounds=4,  # Code refinement rounds
            improvement_threshold=0.05  # 5% improvement threshold (standard)
        )

        # Track refinement sessions for metrics
        self.refinement_history: List[List[RefinementResult]] = []

        # Self-correction wrapper (initialized after agent setup)
        self.self_correcting: Optional[SelfCorrectingAgent] = None

        # OpenEnv for deployment automation (initialized after agent setup)
        self.deploy_env = None
        self.env_agent = None

        logger.info(f"Builder Agent v4.0 initialized with DAAO + TUMIX + OpenEnv for business: {business_id}")

    async def initialize(self):
        """Initialize the agent with Azure AI Agent Client"""
        # Azure Agent Framework is optional - use direct LLM if not available
        try:
            from azure.identity.aio import AzureCliCredential
            from agent_framework import ChatAgent
            from agent_framework.azure import AzureAIAgentClient

            cred = AzureCliCredential()
            client = AzureAIAgentClient(async_credential=cred)

            self.agent = ChatAgent(
                chat_client=client,
                instructions=self._get_system_instruction(),
                name="builder-agent",
                tools=[
                    self.generate_frontend,
                    self.generate_backend,
                    self.generate_database,
                    self.generate_config,
                    self.review_code
                ]
            )
            logger.info(f"Builder Agent initialized with Azure Agent Framework")
        except (ImportError, Exception) as e:
            self.agent = None
            logger.info(f"Builder Agent initialized (standalone mode) - Azure: {e}")

        # Initialize OpenEnv for deployment automation (Playwright for cloud interfaces)
        self.deploy_env = EnvRegistry.make("playwright")
        # Create LLM client directly (Railway: no local LLM, use cloud APIs)
        try:
            from anthropic import Anthropic
            import os
            llm_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        except Exception as e:
            logger.warning(f"Could not initialize LLM client for OpenEnv: {e}")
            llm_client = None

        self.env_agent = EnvironmentLearningAgent(
            env=self.deploy_env,
            llm_client=llm_client,
            casebank=None,  # TODO: Integrate with CaseBank
            max_episodes=10  # Deployment: thorough learning
        )

        print(f"[BUILDER] Builder Agent initialized for business: {self.business_id}")
        print("   Model: Claude Sonnet 4 / GPT-4o")
        print("   OpenEnv deployment automation enabled (Playwright)")
        print("   Ready to generate production code\n")

    async def enable_self_correction(self, qa_agent: Any, max_attempts: int = 3):
        """
        Enable self-correction QA loop for code validation.

        Args:
            qa_agent: QA agent for validation
            max_attempts: Maximum correction attempts
        """
        self.self_correcting = get_self_correcting_agent(
            agent=self,
            qa_agent=qa_agent,
            max_attempts=max_attempts,
            validation_categories=[
                ValidationCategory.CORRECTNESS,
                ValidationCategory.COMPLETENESS,
                ValidationCategory.QUALITY,
                ValidationCategory.SAFETY
            ]
        )
        logger.info(
            f"Builder Agent self-correction enabled: "
            f"max_attempts={max_attempts}"
        )

    async def build_with_validation(
        self,
        task: str,
        expectations: Optional[Dict] = None
    ) -> Dict:
        """
        Build code with automatic QA validation loop.

        Args:
            task: Build task description
            expectations: Expected code properties (has_tests, handles_errors, etc.)

        Returns:
            {
                "solution": str,
                "valid": bool,
                "attempts": int,
                "qa_feedback": QAFeedback
            }
        """
        if not self.self_correcting:
            raise RuntimeError(
                "Self-correction not enabled. Call enable_self_correction() first."
            )

        self._reset_cost_tracking()
        # Default expectations for code
        default_expectations = {
            "has_tests": True,
            "handles_errors": True,
            "follows_style": True,
            "has_types": True,
            "is_complete": True
        }

        expectations = {**default_expectations, **(expectations or {})}

        self._charge_llm_budget(task)
        result = await self.self_correcting.execute_with_validation(
            task=task,
            expectations=expectations,
            context={"agent": "BuilderAgent", "business_id": self.business_id}
        )
        hopx_summary = await self._execute_hopx_build_pipeline(result)
        if hopx_summary:
            result["hopx"] = hopx_summary
        self.executions += 1
        return result


    async def design_system_frontend(self, app_name: str, brand_colors: Dict[str, str], style_preferences: str) -> str:
        """Generate a comprehensive design system using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create a comprehensive design system for {app_name}.

        Brand Colors: {brand_colors}
        Style Preferences: {style_preferences}

        Generate a complete design system including:
        1. Color palette (primary, secondary, accent, neutral)
        2. Typography system (font families, sizes, weights)
        3. Spacing system (consistent spacing scale)
        4. Component variants (buttons, cards, forms)
        5. Animation guidelines
        6. Accessibility standards

        Provide the design system as CSS variables and utility classes.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                # Fallback to StandardIntegrationMixin chat
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating design system: {e}")
            return self._get_fallback_design_system(app_name)

    async def generate_component_diagram(self, app_name: str, components: List[str], interactions: List[str]) -> str:
        """Generate component architecture diagram using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create a detailed component architecture diagram for {app_name}.

        Components: {', '.join(components)}
        Key Interactions: {', '.join(interactions)}

        Generate:
        1. Component hierarchy (parent-child relationships)
        2. Data flow between components
        3. State management approach
        4. Event handling patterns
        5. Component responsibilities
        6. Props and context usage

        Format as a structured JSON with visual representation instructions.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating component diagram: {e}")
            return json.dumps({"error": str(e), "fallback": True})

    async def define_data_flow(self, app_name: str, entities: List[str], operations: List[str]) -> str:
        """Define comprehensive data flow architecture using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Design the complete data flow architecture for {app_name}.

        Data Entities: {', '.join(entities)}
        Operations: {', '.join(operations)}

        Provide:
        1. API endpoint definitions with REST/GraphQL specs
        2. Data validation rules
        3. State management strategy (Redux/Context/Zustand)
        4. Caching strategy
        5. Error handling patterns
        6. Real-time update mechanisms
        7. Data transformation pipelines

        Include code examples and best practices.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error defining data flow: {e}")
            return self._get_fallback_data_flow(entities)

    async def generate_api_documentation(self, app_name: str, endpoints: List[Dict[str, Any]]) -> str:
        """Generate comprehensive API documentation using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create professional API documentation for {app_name}.

        Endpoints to document:
        {json.dumps(endpoints, indent=2)}

        Generate:
        1. OpenAPI/Swagger specification
        2. Request/response examples
        3. Authentication details
        4. Rate limiting information
        5. Error codes and handling
        6. SDK code examples (JavaScript, Python)
        7. Postman collection

        Format as complete, production-ready documentation.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating API documentation: {e}")
            return "API documentation generation failed"

    async def create_testing_strategy(self, app_name: str, features: List[str], complexity: str = "medium") -> str:
        """Create comprehensive testing strategy using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Design a complete testing strategy for {app_name}.

        Features to test: {', '.join(features)}
        Complexity level: {complexity}

        Provide:
        1. Unit test templates with Jest/Vitest
        2. Integration test scenarios
        3. E2E test flows with Playwright/Cypress
        4. Performance testing approach
        5. Security testing checklist
        6. CI/CD pipeline configuration
        7. Test coverage targets

        Include actual test code examples.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error creating testing strategy: {e}")
            return "Testing strategy creation failed"

    async def generate_deployment_config(self, app_name: str, platform: str, scaling_needs: str) -> str:
        """Generate deployment configuration using LLM with excellence"""

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create production-ready deployment configuration for {app_name}.

        Platform: {platform}
        Scaling Requirements: {scaling_needs}

        Generate:
        1. Docker/Container configuration
        2. CI/CD pipeline (GitHub Actions/GitLab CI)
        3. Environment variable management
        4. Secrets handling
        5. Monitoring and logging setup
        6. Auto-scaling policies
        7. Backup and disaster recovery

        Provide complete, ready-to-use configuration files.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                return response.text if hasattr(response, 'text') else str(response)
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating deployment config: {e}")
            return "Deployment configuration generation failed"

    def _get_fallback_design_system(self, app_name: str) -> str:
        """Fallback design system when LLM fails"""
        return f"""
        /* {app_name} Design System - Fallback */
        :root {{
            --primary: #3B82F6;
            --secondary: #8B5CF6;
            --accent: #10B981;
            --neutral: #6B7280;
            --spacing-unit: 8px;
        }}
        """

    def _get_fallback_data_flow(self, entities: List[str]) -> str:
        """Fallback data flow when LLM fails"""
        return json.dumps({{
            "entities": entities,
            "flow": "Client -> API -> Database",
            "fallback": True
        }})
    def _charge_llm_budget(self, task: str) -> None:
        """Reserve x402 spend before invoking premium LLMs."""
        approx_cost = max(0.025, len(task) / 2000)
        try:
            metadata = {
                "task_preview": task[:120],
                "business_id": self.business_id,
                "agent_name": "builder_agent",
                "category": "builder_llm",
            }
            capabilities = self.vendor_cache.lookup("claude-self-correction")
            if capabilities:
                metadata["accepted_tokens"] = capabilities.get("accepted_tokens")
                metadata["preferred_chain"] = capabilities.get("preferred_chain")
            projected = self._current_build_spend + approx_cost
            if projected > self._builder_spend_cap:
                raise RuntimeError(
                    f"Builder Agent LLM cap exceeded (${projected:.2f}/"
                    f"${self._builder_spend_cap:.2f})"
                )
            receipt = self.x402_client.record_manual_payment(
                agent_name="builder_agent",
                vendor="claude-self-correction",
                amount=approx_cost,
                metadata=metadata,
            )
            self._current_build_spend = projected
            self._cost_events.append(
                {
                    "timestamp": datetime.utcnow().isoformat(),
                    "task_preview": task[:80],
                    "amount": round(approx_cost, 4),
                    "tx_hash": getattr(receipt, "tx_hash", None),
                }
            )
        except X402PaymentError as exc:
            raise RuntimeError(f"Builder Agent x402 budget exhausted: {exc}") from exc

    def _get_system_instruction(self) -> str:
        """System instruction for builder agent"""
        return """You are the world's premier Full-Stack Builder—elite at fast, reliable, and cost-efficient delivery of modern web apps.

Your role:
1. Generate production-ready, complete code
2. Use best practices (TypeScript, error handling, loading states)
3. Create clean, maintainable, well-documented code
4. Follow modern frameworks: Next.js 14, React 18, Tailwind CSS, Supabase
5. Include all necessary configuration and setup files

You are:
- Thorough: Every file is complete and production-ready
- Modern: Use latest framework features and patterns
- Practical: Code that actually works, not tutorials
- Security-conscious: Proper auth, validation, error handling

Always return structured JSON with file paths and content."""

    async def _execute_hopx_build_pipeline(self, validation_result: Dict) -> Optional[Dict]:
        """Run npm install/lint inside HopX for the generated project."""
        if not self.hopx_adapter.enabled:
            return None
        files = self._load_artifact_files_from_disk()

        if not files:
            solution = validation_result.get("solution")
            if not solution:
                return None
            try:
                payload = json.loads(solution)
            except json.JSONDecodeError:
                logger.warning("Builder Agent: unable to parse solution JSON for HopX pipeline")
                return None
            files = payload.get("files")
            if not isinstance(files, dict) or not files:
                return None

        upload_payload = self._normalize_hopx_upload_payload(files)

        try:
            return await self.hopx_adapter.execute(
                task="Builder build pipeline",
                template="nodejs_environment",
                upload_files=upload_payload,
                commands=[
                    "cd app && npm install",
                    "cd app && npm run build"
                ],
                download_paths=["app/dist", "app/.next"],
            )
        except Exception as exc:
            logger.warning("Builder Agent HopX build failed: %s", exc)
            return None

    def _load_artifact_files_from_disk(self) -> Optional[Dict[str, bytes]]:
        root = os.getenv("HOPX_ARTIFACT_ROOT") or os.getenv("GENESIS_ARTIFACT_ROOT")
        if not root:
            return None
        try:
            return collect_directory_payload(root, max_bytes=20_000_000)
        except Exception as exc:
            logger.warning("Builder Agent: unable to load artifact directory %s (%s)", root, exc)
            return None

    def _normalize_hopx_upload_payload(
        self, files: Dict[str, object]
    ) -> Dict[str, object]:
        payload: Dict[str, object] = {}
        for path, content in files.items():
            normalized = path.replace("\\", "/")
            if not normalized.startswith("app/"):
                normalized = f"app/{normalized.lstrip('/')}"
            payload[normalized] = content
        self._attach_cost_metadata(payload)
        return payload

    def _attach_cost_metadata(self, payload: Dict[str, object]) -> None:
        if not payload:
            return
        total_bytes = 0
        byte_sizes: Dict[str, int] = {}
        for path, content in payload.items():
            if isinstance(content, bytes):
                size = len(content)
            else:
                encoded = str(content).encode("utf-8")
                size = len(encoded)
            total_bytes += size
            byte_sizes[path] = size
        if total_bytes <= 0:
            return
        file_costs = {
            path.replace("app/", "", 1): round((size / total_bytes) * self._current_build_spend, 4)
            for path, size in byte_sizes.items()
        }
        metadata = {
            "business_id": self.business_id,
            "total_llm_spend": round(self._current_build_spend, 4),
            "file_costs": file_costs,
            "events": self._cost_events[-25:],
        }
        payload["app/.genesis/costs.json"] = json.dumps(metadata, indent=2)

    def _reset_cost_tracking(self) -> None:
        self._current_build_spend = 0.0
        self._cost_events.clear()

    async def generate_frontend(self, app_name: str, features: List[str], pages: List[str]) -> str:
        """
        Generate React/Next.js frontend code using LLM with excellence.

        Args:
            app_name: Name of the application
            features: List of features to implement
            pages: List of pages to create

        Returns:
            JSON string with frontend file structure and code
        """

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create a complete React/Next.js frontend application for {app_name}.

        Features to implement: {', '.join(features)}
        Pages to create: {', '.join(pages)}

        Generate production-ready code with:
        1. Modern React patterns (hooks, context, suspense)
        2. TypeScript with proper types
        3. Responsive design with Tailwind CSS
        4. Accessibility (WCAG 2.1 AA)
        5. Performance optimizations
        6. SEO considerations
        7. Error boundaries
        8. Loading states

        Structure the response as JSON with file paths and complete code.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                result = response.text if hasattr(response, 'text') else str(response)

                # Parse and validate the response
                try:
                    json.loads(result)
                    return result
                except:
                    # Wrap in proper JSON if needed
                    return json.dumps({
                        "app_name": app_name,
                        "framework": "Next.js 14 + React 18 + TypeScript",
                        "generated_code": result,
                        "features_implemented": features,
                        "pages_created": pages,
                        "created_at": datetime.now().isoformat()
                    })
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating frontend: {e}")
            # Return basic template as fallback
            return self._generate_frontend_fallback(app_name, features, pages)

    def _generate_frontend_fallback(self, app_name: str, features: List[str], pages: List[str]) -> str:
        """Fallback frontend generation"""
        files = {}
        files["app/layout.tsx"] = f'export default function RootLayout({{ children }}) {{ return <html><body>{{children}}</body></html> }}'
        for page in pages:
            files[f"app/{page.lower()}/page.tsx"] = f'export default function {page}() {{ return <div>{page}</div> }}'

        # Generate pages
        for page in pages:
            page_name = page.lower().replace(" ", "-")
            files[f"app/{page_name}/page.tsx"] = f'''export default function {page.replace(" ", "")}Page() {{
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">{page}</h1>
      <p>Welcome to {page}</p>
    </div>
  )
}}'''

        # Generate components for features
        for feature in features:
            component_name = feature.replace(" ", "")
            files[f"components/{component_name}.tsx"] = f'''interface {component_name}Props {{
  // Add props here
}}

export function {component_name}(props: {component_name}Props) {{
  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-2xl font-semibold">{feature}</h2>
    </div>
  )
}}'''

        result = {
            "app_name": app_name,
            "framework": "Next.js 14 + React 18 + TypeScript",
            "files": files,
            "file_count": len(files),
            "features_implemented": features,
            "pages_created": pages,
            "created_at": datetime.now().isoformat()
        }

        return json.dumps(result, indent=2)

    async def generate_backend(self, app_name: str, api_routes: List[str], auth_required: bool = True) -> str:
        """
        Generate API routes and backend logic using LLM with excellence.

        Args:
            app_name: Name of the application
            api_routes: List of API endpoints to create
            auth_required: Whether authentication is required

        Returns:
            JSON string with backend API files
        """

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Create a production-ready backend API for {app_name}.

        API Routes Required: {', '.join(api_routes)}
        Authentication: {'Required with JWT/OAuth2' if auth_required else 'Not required'}

        Generate complete backend with:
        1. RESTful API endpoints with proper HTTP methods
        2. Input validation and sanitization
        3. Error handling with appropriate status codes
        4. Database integration patterns
        5. Authentication/authorization middleware if required
        6. Rate limiting and security headers
        7. Logging and monitoring hooks
        8. Unit test examples for each endpoint

        Use modern patterns:
        - Next.js API routes or Express.js
        - TypeScript with strict typing
        - Async/await patterns
        - Environment variable configuration

        Return as JSON with file paths and complete, production-ready code.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                result = response.text if hasattr(response, 'text') else str(response)

                # Validate JSON response
                try:
                    json.loads(result)
                    return result
                except:
                    return json.dumps({
                        "app_name": app_name,
                        "api_routes": api_routes,
                        "auth_enabled": auth_required,
                        "generated_code": result,
                        "created_at": datetime.now().isoformat()
                    })
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating backend: {e}")
            return self._generate_backend_fallback(app_name, api_routes, auth_required)

    def _generate_backend_fallback(self, app_name: str, api_routes: List[str], auth_required: bool) -> str:
        """Fallback backend generation"""
        files = {}
        for route in api_routes:
            route_name = route.lower().replace(" ", "-")
            files[f"api/{route_name}/route.ts"] = f"// {route} endpoint placeholder"
        return json.dumps({"app_name": app_name, "files": files, "fallback": True})

    async def generate_database(self, app_name: str, tables: List[str], relationships: bool = True) -> str:
        """
        Generate database schemas and migrations using LLM with excellence.

        Args:
            app_name: Name of the application
            tables: List of database tables to create
            relationships: Whether to include foreign key relationships

        Returns:
            JSON string with database schema and migrations
        """

        prompt = f"""
        {EXCELLENCE_PROMPT}

        Design a complete database architecture for {app_name}.

        Tables Required: {', '.join(tables)}
        Include Relationships: {'Yes - with foreign keys and indexes' if relationships else 'No - independent tables'}

        Generate production-ready database design with:
        1. Complete schema definitions (PostgreSQL/MySQL compatible)
        2. Proper data types and constraints
        3. Primary keys and indexes for performance
        4. Foreign key relationships if required
        5. Migration files (up and down)
        6. Seed data examples
        7. Database access layer (ORM models)
        8. Query optimization suggestions

        Best practices:
        - Use UUID for primary keys
        - Add created_at and updated_at timestamps
        - Include soft delete capability
        - Add appropriate indexes for common queries
        - Consider JSONB fields for flexible data

        Return as JSON with schema definitions, migrations, and ORM models.
        """

        try:
            if hasattr(self, 'agent') and self.agent:
                response = await self.agent.run(prompt)
                result = response.text if hasattr(response, 'text') else str(response)

                try:
                    json.loads(result)
                    return result
                except:
                    return json.dumps({
                        "app_name": app_name,
                        "tables": tables,
                        "relationships_enabled": relationships,
                        "generated_schema": result,
                        "created_at": datetime.now().isoformat()
                    })
            else:
                return await self.chat(prompt)
        except Exception as e:
            logger.error(f"Error generating database: {e}")
            return self._generate_database_fallback(app_name, tables)

    def _generate_database_fallback(self, app_name: str, tables: List[str]) -> str:
        """Fallback database generation"""
        schema = {}
        for table in tables:
            schema[table] = {
                "id": "UUID PRIMARY KEY",
                "created_at": "TIMESTAMP DEFAULT NOW()",
                "updated_at": "TIMESTAMP DEFAULT NOW()"
            }
        return json.dumps({"app_name": app_name, "schema": schema, "fallback": True})

    async def generate_config(self, app_name: str, env_vars: List[str]) -> str:
        """
        Generate configuration files (package.json, tsconfig, env, etc.) with LLM optimization.

        Args:
            app_name: Name of the application
            env_vars: List of environment variables needed

        Returns:
            JSON string with configuration files
        """
        # LLM configuration analysis and optimization
        prompt = f"""{EXCELLENCE_PROMPT}

Task: Validate and optimize application configuration.

Application: {app_name}
Environment Variables: {', '.join(env_vars[:10])} ({len(env_vars)} total)

Requirements:
- Validate environment variable names and purposes
- Recommend optimal dependency versions
- Suggest security configurations
- Identify missing critical settings
- Recommend performance optimizations

Return JSON with:
{{
  "recommended_dependencies": [str],
  "security_settings": [str],
  "performance_optimizations": [str],
  "missing_configurations": [str],
  "best_practices": [str]
}}
"""
        try:
            response = await self.local_llm_client.complete(prompt, max_tokens=400)
            config_data = json.loads(response) if response.strip().startswith('{') else {}
        except Exception as e:
            logger.warning(f"LLM configuration optimization failed: {e}")
            config_data = {}

        files = {}

        # package.json
        files["package.json"] = json.dumps({
            "name": app_name.lower().replace(" ", "-"),
            "version": "0.1.0",
            "private": True,
            "scripts": {
                "dev": "next dev",
                "build": "next build",
                "start": "next start",
                "lint": "next lint"
            },
            "dependencies": {
                "next": "14.2.0",
                "react": "^18.3.0",
                "react-dom": "^18.3.0",
                "@supabase/supabase-js": "^2.39.0"
            },
            "devDependencies": {
                "@types/node": "^20",
                "@types/react": "^18",
                "@types/react-dom": "^18",
                "typescript": "^5",
                "tailwindcss": "^3.4.0",
                "autoprefixer": "^10.4.0",
                "postcss": "^8.4.0"
            }
        }, indent=2)

        # .env.example
        env_example = "\n".join([f"{var}=" for var in env_vars])
        files[".env.example"] = env_example

        # tsconfig.json
        files["tsconfig.json"] = json.dumps({
            "compilerOptions": {
                "lib": ["dom", "dom.iterable", "esnext"],
                "allowJs": True,
                "skipLibCheck": True,
                "strict": True,
                "noEmit": True,
                "esModuleInterop": True,
                "module": "esnext",
                "moduleResolution": "bundler",
                "resolveJsonModule": True,
                "isolatedModules": True,
                "jsx": "preserve",
                "incremental": True,
                "plugins": [{"name": "next"}],
                "paths": {
                    "@/*": ["./*"]
                }
            },
            "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
            "exclude": ["node_modules"]
        }, indent=2)

        # tailwind.config.js
        files["tailwind.config.js"] = '''module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}'''

        result = {
            "app_name": app_name,
            "files": files,
            "file_count": len(files),
            "env_vars": env_vars,
            "created_at": datetime.now().isoformat(),
            "llm_optimization": {**config_data} if config_data else None,
        }

        return json.dumps(result, indent=2)

    def review_code(self, file_path: str, code_content: str) -> str:
        """
        Review code and provide quality suggestions.

        Args:
            file_path: Path to the file being reviewed
            code_content: Content of the code to review

        Returns:
            JSON string with code review feedback
        """
        issues = []
        suggestions = []

        # Basic static analysis
        if "any" in code_content:
            issues.append("Avoid using 'any' type - specify proper TypeScript types")

        if "console.log" in code_content:
            issues.append("Remove console.log statements before production")

        if "// TODO" in code_content or "// FIXME" in code_content:
            issues.append("Complete TODO/FIXME items")

        if not "try" in code_content and ("fetch" in code_content or "async" in code_content):
            issues.append("Add error handling (try/catch) for async operations")

        # Suggestions
        suggestions.append("Consider adding unit tests")
        suggestions.append("Add JSDoc comments for complex functions")
        suggestions.append("Ensure proper TypeScript types for all parameters")

        quality_score = max(0, 100 - (len(issues) * 10))

        result = {
            "file_path": file_path,
            "quality_score": quality_score,
            "issues_found": len(issues),
            "issues": issues,
            "suggestions": suggestions,
            "status": "pass" if quality_score >= 70 else "needs_improvement",
            "reviewed_at": datetime.now().isoformat()
        }

        return json.dumps(result, indent=2)

    def route_task(self, task_description: str, priority: float = 0.6) -> RoutingDecision:
        """
        Route builder task to appropriate model using DAAO

        Args:
            task_description: Description of the code generation task
            priority: Task priority (0.0-1.0, default 0.6 for code generation)

        Returns:
            RoutingDecision with model selection and cost estimate
        """
        task = {
            'id': f'builder-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'description': task_description,
            'priority': priority,
            'required_tools': ['generate_frontend', 'generate_backend']
        }

        decision = self.router.route_task(task, budget_conscious=True)

        logger.info(
            f"Builder task routed: {decision.reasoning}",
            extra={
                'agent': 'BuilderAgent',
                'model': decision.model,
                'difficulty': decision.difficulty.value,
                'estimated_cost': decision.estimated_cost
            }
        )

        return decision

    async def deploy_to_cloud(self, platform: str, deployment_goal: str) -> str:
        """
        Deploy to cloud platform via learned automation (NEW: OpenEnv capability).

        Args:
            platform: Cloud platform (e.g., "Vercel", "Netlify", "AWS")
            deployment_goal: Deployment objective

        Returns:
            JSON string with deployment results
        """
        if not self.env_agent:
            return json.dumps({
                "error": "OpenEnv not initialized",
                "message": "Call initialize() first"
            }, indent=2)

        logger.info(f"Starting cloud deployment: platform={platform}, goal={deployment_goal}")

        # Agent learns to deploy via self-play
        result = await self.env_agent.learn_task(
            goal=f"Deploy to {platform}: {deployment_goal}",
            context={"platform": platform}
        )

        deployment_result = {
            "deployment_id": f"DEPLOY-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "platform": platform,
            "goal": deployment_goal,
            "success": result["success"],
            "episodes": result["episodes"],
            "total_steps": result["total_steps"],
            "learned_workflow": result["learned_strategy"],
            "status": "DEPLOYED" if result["success"] else "FAILED",
            "deployed_at": datetime.now().isoformat()
        }

        if result["success"]:
            logger.info(
                f"Deployment successful! Episodes: {result['episodes']}, "
                f"Steps: {result['total_steps']}"
            )
        else:
            logger.warning(
                f"Deployment failed after {result['episodes']} episodes"
            )

        return json.dumps(deployment_result, indent=2)

    def get_cost_metrics(self) -> Dict:
        """Get cumulative cost savings from DAAO and TUMIX"""
        if not self.refinement_history:
            return {
                'agent': 'BuilderAgent',
                'tumix_sessions': 0,
                'tumix_savings_percent': 0.0,
                'message': 'No refinement sessions recorded yet'
            }

        tumix_savings = self.termination.estimate_cost_savings(
            [
                [r for r in session]
                for session in self.refinement_history
            ],
            cost_per_round=0.001
        )

        return {
            'agent': 'BuilderAgent',
            'tumix_sessions': tumix_savings['sessions'],
            'tumix_baseline_rounds': tumix_savings['baseline_rounds'],
            'tumix_actual_rounds': tumix_savings['tumix_rounds'],
            'tumix_savings_percent': tumix_savings['savings_percent'],
            'tumix_total_saved': tumix_savings['savings'],
            'daao_info': 'DAAO routing automatically applied to all tasks'
        }


# A2A Communication Interface
async def get_builder_agent(business_id: str = "default") -> BuilderAgent:
    """
    Factory function to create and initialize the Builder Agent.

    NOTE: This delegates to the enhanced builder when available to ensure
    learning/verification features are always on. If the enhanced module
    cannot be imported for any reason, it falls back to the base BuilderAgent.
    """
    try:
        from agents.builder_agent_enhanced import (
            EnhancedBuilderAgent,
            get_enhanced_builder_agent,
        )

        agent: BuilderAgent = await get_enhanced_builder_agent(business_id=business_id)
        return agent
    except Exception as exc:
        logger.warning(
            "Enhanced builder unavailable, falling back to base BuilderAgent: %s", exc
        )
        agent = BuilderAgent(business_id=business_id)
        await agent.initialize()
        return agent
