"""
SuperClaude Integration for Genesis Pipeline

Maps SuperClaude slash commands to pipeline stages for enhanced capabilities:
- /sc:research - Deep research with Tavily MCP, adaptive planning
- /sc:brainstorm - Requirements discovery through Socratic dialogue
- /sc:design - Architecture, API, component design
- /sc:implement - Feature implementation with persona coordination
- /sc:test - Testing with Playwright MCP
- /sc:analyze - Code analysis (quality, security, performance)
- /sc:workflow - Implementation workflow generation

Usage:
    from infrastructure.superclaude_integration import SuperClaudeEnhancer

    enhancer = SuperClaudeEnhancer()
    research_prompt = enhancer.get_research_prompt(business_type, target_market)
    design_prompt = enhancer.get_design_prompt(business_spec)
"""

import logging
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class SuperClaudeCommand(Enum):
    """SuperClaude slash commands available for pipeline enhancement."""
    RESEARCH = "/sc:research"
    BRAINSTORM = "/sc:brainstorm"
    DESIGN = "/sc:design"
    IMPLEMENT = "/sc:implement"
    TEST = "/sc:test"
    ANALYZE = "/sc:analyze"
    WORKFLOW = "/sc:workflow"
    TROUBLESHOOT = "/sc:troubleshoot"


@dataclass
class SuperClaudePrompt:
    """A prompt configured for SuperClaude command execution."""
    command: SuperClaudeCommand
    prompt: str
    options: Dict[str, Any]
    expected_output: str
    fallback_strategy: str


class SuperClaudeEnhancer:
    """
    Enhances Genesis Pipeline stages with SuperClaude capabilities.

    Maps pipeline stages to appropriate /sc commands:
    - RESEARCH: /sc:research, /sc:brainstorm
    - DESIGN: /sc:design
    - BUILD: /sc:implement, /sc:workflow
    - TEST: /sc:test, /sc:analyze
    - VERIFY: /sc:analyze --focus security|performance
    """

    def __init__(self):
        self.commands_path = Path.home() / ".claude" / "commands" / "sc"
        self.available_commands = self._discover_commands()
        logger.info(f"SuperClaude enhancer initialized with {len(self.available_commands)} commands")

    def _discover_commands(self) -> List[str]:
        """Discover available SuperClaude commands."""
        commands = []
        if self.commands_path.exists():
            for cmd_file in self.commands_path.glob("*.md"):
                cmd_name = cmd_file.stem
                commands.append(f"/sc:{cmd_name}")
        return commands

    def is_available(self, command: SuperClaudeCommand) -> bool:
        """Check if a SuperClaude command is available."""
        return command.value in self.available_commands

    # ========== RESEARCH Stage Prompts ==========

    def get_research_prompt(
        self,
        business_type: str,
        initial_market: str,
        depth: str = "very thorough"
    ) -> SuperClaudePrompt:
        """
        Generate /sc:research prompt for market research.

        Features:
        - Deep web research via Tavily MCP
        - Multi-hop reasoning
        - Evidence-based synthesis
        """
        prompt = f"""Research the {business_type} market for {initial_market}.

Focus areas:
1. Market size and growth trends (2024-2025 data)
2. Key competitors and their offerings
3. Underserved niches and gaps in the market
4. Emerging technologies and trends
5. Pricing models and monetization strategies

Depth: {depth}

Output format:
- Executive summary
- Market analysis with data points
- Competitor matrix
- Recommended niche with justification
- Risk factors and mitigation strategies

Use Tavily MCP for current market data. Cite all sources."""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.RESEARCH,
            prompt=prompt,
            options={"depth": depth, "sources": "tavily,web"},
            expected_output="market_analysis",
            fallback_strategy="use_internal_market_data"
        )

    def get_brainstorm_prompt(
        self,
        business_type: str,
        target_market: str,
        constraints: Optional[List[str]] = None
    ) -> SuperClaudePrompt:
        """
        Generate /sc:brainstorm prompt for requirements discovery.

        Features:
        - Socratic dialogue method
        - Multi-persona coordination
        - Systematic exploration
        """
        constraints_text = "\n".join(f"- {c}" for c in (constraints or []))

        prompt = f"""Brainstorm requirements for a {business_type} targeting {target_market}.

Use Socratic dialogue to explore:
1. Core problem being solved
2. User personas and their pain points
3. Must-have vs nice-to-have features
4. Technical constraints and considerations
5. Differentiation strategy

Constraints:
{constraints_text or "- Budget-conscious deployment (GitHub Pages preferred)"}
- MVP scope (launch in days, not months)
- Single developer operation

Apply multi-persona coordination:
- Product Manager: Feature prioritization
- UX Designer: User journey mapping
- Developer: Technical feasibility
- Business Analyst: Market fit validation

Output: Structured requirements document with prioritized feature list."""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.BRAINSTORM,
            prompt=prompt,
            options={"mode": "socratic", "personas": ["pm", "ux", "dev", "ba"]},
            expected_output="requirements_document",
            fallback_strategy="generate_basic_features"
        )

    # ========== DESIGN Stage Prompts ==========

    def get_design_prompt(
        self,
        business_name: str,
        business_type: str,
        features: List[str],
        design_type: str = "system"
    ) -> SuperClaudePrompt:
        """
        Generate /sc:design prompt for architecture design.

        Features:
        - System architecture design
        - API design
        - Component specifications
        - Database schema design
        """
        features_text = "\n".join(f"- {f}" for f in features)

        prompt = f"""Design the {design_type} architecture for {business_name} ({business_type}).

Features to support:
{features_text}

Design deliverables:
1. System architecture diagram (Mermaid)
2. Component breakdown with responsibilities
3. API design (if applicable)
4. Data model / schema design
5. Technology stack recommendations

Constraints:
- Static site deployment (GitHub Pages compatible)
- No backend required for MVP (use third-party APIs)
- Mobile-responsive design
- WCAG 2.1 AA accessibility

Output formats:
- Architecture diagram (Mermaid syntax)
- Component specifications (JSON)
- API schema (OpenAPI 3.0 if needed)"""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.DESIGN,
            prompt=prompt,
            options={"type": design_type, "output_format": "mermaid,json"},
            expected_output="design_specification",
            fallback_strategy="use_template_design"
        )

    # ========== BUILD Stage Prompts ==========

    def get_implement_prompt(
        self,
        business_name: str,
        design_spec: Dict[str, Any],
        output_path: str
    ) -> SuperClaudePrompt:
        """
        Generate /sc:implement prompt for code generation.

        Features:
        - Persona coordination (architect, frontend, backend, security, qa)
        - MCP tool integration
        - Iterative implementation
        """
        components = design_spec.get("ui_components", [])
        components_text = "\n".join(f"- {c}" for c in components)

        prompt = f"""Implement the {business_name} landing page.

Components to build:
{components_text}

Technical requirements:
- Pure HTML/CSS (no build step required)
- Tailwind CSS via CDN
- Mobile-first responsive design
- SEO-optimized markup
- Fast loading (<3s on 3G)

Output path: {output_path}

Persona coordination:
- Architect: Structure and organization
- Frontend: Component implementation
- Security: Input validation, CSP headers
- QA: Cross-browser testing considerations

Generate production-ready code with:
1. index.html - Main landing page
2. style.css - Custom styles beyond Tailwind
3. pricing.html - Pricing page
4. success.html - Form submission success"""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.IMPLEMENT,
            prompt=prompt,
            options={"personas": ["architect", "frontend", "security", "qa"]},
            expected_output="codebase",
            fallback_strategy="use_static_generator"
        )

    def get_workflow_prompt(
        self,
        business_name: str,
        features: List[str]
    ) -> SuperClaudePrompt:
        """
        Generate /sc:workflow prompt for implementation planning.

        Features:
        - Structured workflow from PRD
        - Task breakdown
        - Dependency mapping
        """
        features_text = "\n".join(f"- {f}" for f in features)

        prompt = f"""Generate implementation workflow for {business_name}.

Features to implement:
{features_text}

Create a structured workflow with:
1. Task breakdown (atomic units of work)
2. Dependencies between tasks
3. Estimated complexity (1-5 scale)
4. Recommended implementation order
5. Validation criteria for each task

Output format:
- Mermaid Gantt chart
- Task list with dependencies
- Validation checklist"""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.WORKFLOW,
            prompt=prompt,
            options={"format": "gantt,tasks"},
            expected_output="implementation_workflow",
            fallback_strategy="generate_basic_workflow"
        )

    # ========== TEST Stage Prompts ==========

    def get_test_prompt(
        self,
        codebase_path: str,
        test_type: str = "e2e"
    ) -> SuperClaudePrompt:
        """
        Generate /sc:test prompt for testing.

        Features:
        - Playwright MCP for E2E testing
        - Coverage analysis
        - Quality reporting
        """
        prompt = f"""Run {test_type} tests on the codebase at {codebase_path}.

Test strategy:
1. HTML validation (W3C compliance)
2. CSS validation
3. Accessibility audit (WCAG 2.1 AA)
4. Mobile responsiveness (320px to 1920px)
5. Performance baseline (Lighthouse)
6. Link validation (no broken links)

Use Playwright MCP to:
- Load each page in headless browser
- Capture screenshots at key breakpoints
- Measure Core Web Vitals
- Check console for errors

Output:
- Test results summary
- Coverage report
- Screenshots of issues
- Performance metrics"""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.TEST,
            prompt=prompt,
            options={"type": test_type, "tool": "playwright"},
            expected_output="test_report",
            fallback_strategy="run_basic_validation"
        )

    def get_analyze_prompt(
        self,
        codebase_path: str,
        focus: str = "all"
    ) -> SuperClaudePrompt:
        """
        Generate /sc:analyze prompt for code analysis.

        Features:
        - Quality analysis
        - Security audit
        - Performance analysis
        - Architecture review
        """
        prompt = f"""Analyze the codebase at {codebase_path}.

Focus: {focus}

Analysis domains:
1. **Quality**: Code style, maintainability, documentation
2. **Security**: XSS prevention, CSP, input validation
3. **Performance**: Asset optimization, loading strategy
4. **Architecture**: Component organization, separation of concerns

For each domain:
- Current state assessment
- Issues found with severity
- Recommendations for improvement
- Code examples for fixes

Output format:
- Executive summary
- Domain-by-domain breakdown
- Priority-ranked issues
- Action items"""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.ANALYZE,
            prompt=prompt,
            options={"focus": focus},
            expected_output="analysis_report",
            fallback_strategy="run_basic_linting"
        )

    # ========== VERIFY Stage Prompts ==========

    def get_security_audit_prompt(
        self,
        live_url: str
    ) -> SuperClaudePrompt:
        """
        Generate /sc:analyze prompt focused on security verification.
        """
        prompt = f"""Security audit for deployed site: {live_url}

OWASP checks:
1. Content Security Policy headers
2. X-Frame-Options
3. X-Content-Type-Options
4. HTTPS enforcement
5. Cookie security flags

Additional checks:
- SSL certificate validity
- Mixed content warnings
- Information disclosure
- Input validation on forms

Output:
- Security score (0-100)
- Critical/High/Medium/Low findings
- Remediation steps"""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.ANALYZE,
            prompt=prompt,
            options={"focus": "security"},
            expected_output="security_audit",
            fallback_strategy="check_http_headers"
        )

    def get_performance_audit_prompt(
        self,
        live_url: str
    ) -> SuperClaudePrompt:
        """
        Generate /sc:analyze prompt focused on performance verification.
        """
        prompt = f"""Performance audit for: {live_url}

Core Web Vitals:
1. Largest Contentful Paint (LCP)
2. First Input Delay (FID)
3. Cumulative Layout Shift (CLS)
4. Time to First Byte (TTFB)

Additional metrics:
- Total page weight
- Number of requests
- Asset optimization
- Caching headers

Targets:
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

Output:
- Performance score (0-100)
- Metric breakdown
- Optimization recommendations"""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.ANALYZE,
            prompt=prompt,
            options={"focus": "performance"},
            expected_output="performance_audit",
            fallback_strategy="run_basic_lighthouse"
        )

    # ========== Troubleshooting ==========

    def get_troubleshoot_prompt(
        self,
        error_message: str,
        context: Dict[str, Any]
    ) -> SuperClaudePrompt:
        """
        Generate /sc:troubleshoot prompt for error diagnosis.
        """
        prompt = f"""Troubleshoot the following error:

Error: {error_message}

Context:
- Stage: {context.get('stage', 'unknown')}
- Business: {context.get('business_name', 'unknown')}
- Platform: {context.get('platform', 'github-pages')}

Diagnose:
1. Root cause analysis
2. Common causes for this error
3. Step-by-step resolution
4. Prevention strategies

Output:
- Diagnosis summary
- Resolution steps
- Verification procedure"""

        return SuperClaudePrompt(
            command=SuperClaudeCommand.TROUBLESHOOT,
            prompt=prompt,
            options={"context": context},
            expected_output="troubleshooting_guide",
            fallback_strategy="log_error_for_review"
        )

    # ========== Stage Enhancement Methods ==========

    def enhance_research_stage(
        self,
        business_type: str,
        target_market: str
    ) -> Dict[str, SuperClaudePrompt]:
        """Get all SuperClaude prompts for RESEARCH stage."""
        return {
            "market_research": self.get_research_prompt(business_type, target_market),
            "requirements_discovery": self.get_brainstorm_prompt(business_type, target_market)
        }

    def enhance_design_stage(
        self,
        business_name: str,
        business_type: str,
        features: List[str]
    ) -> Dict[str, SuperClaudePrompt]:
        """Get all SuperClaude prompts for DESIGN stage."""
        return {
            "system_design": self.get_design_prompt(business_name, business_type, features, "system"),
            "component_design": self.get_design_prompt(business_name, business_type, features, "component")
        }

    def enhance_build_stage(
        self,
        business_name: str,
        design_spec: Dict[str, Any],
        output_path: str,
        features: List[str]
    ) -> Dict[str, SuperClaudePrompt]:
        """Get all SuperClaude prompts for BUILD stage."""
        return {
            "implementation": self.get_implement_prompt(business_name, design_spec, output_path),
            "workflow": self.get_workflow_prompt(business_name, features)
        }

    def enhance_test_stage(
        self,
        codebase_path: str
    ) -> Dict[str, SuperClaudePrompt]:
        """Get all SuperClaude prompts for TEST stage."""
        return {
            "e2e_testing": self.get_test_prompt(codebase_path, "e2e"),
            "code_analysis": self.get_analyze_prompt(codebase_path, "all")
        }

    def enhance_verify_stage(
        self,
        live_url: str
    ) -> Dict[str, SuperClaudePrompt]:
        """Get all SuperClaude prompts for VERIFY stage."""
        return {
            "security_audit": self.get_security_audit_prompt(live_url),
            "performance_audit": self.get_performance_audit_prompt(live_url)
        }


# ========== Pipeline Integration ==========

class SuperClaudePipelineIntegration:
    """
    Integrates SuperClaude commands into the Genesis Pipeline.

    This class provides the bridge between pipeline stages and
    SuperClaude slash commands, enabling enhanced capabilities
    when SuperClaude is available.
    """

    def __init__(self):
        self.enhancer = SuperClaudeEnhancer()
        self.enabled = len(self.enhancer.available_commands) > 0
        logger.info(f"SuperClaude pipeline integration: {'enabled' if self.enabled else 'disabled'}")

    def get_stage_prompts(
        self,
        stage: str,
        **kwargs
    ) -> Optional[Dict[str, SuperClaudePrompt]]:
        """
        Get SuperClaude prompts for a pipeline stage.

        Args:
            stage: Pipeline stage name (RESEARCH, DESIGN, BUILD, TEST, VERIFY)
            **kwargs: Stage-specific parameters

        Returns:
            Dictionary of prompt name to SuperClaudePrompt, or None if unavailable
        """
        if not self.enabled:
            return None

        stage_upper = stage.upper()

        if stage_upper == "RESEARCH":
            return self.enhancer.enhance_research_stage(
                kwargs.get("business_type", "saas"),
                kwargs.get("target_market", "general")
            )

        elif stage_upper == "DESIGN":
            return self.enhancer.enhance_design_stage(
                kwargs.get("business_name", "business"),
                kwargs.get("business_type", "saas"),
                kwargs.get("features", [])
            )

        elif stage_upper == "BUILD":
            return self.enhancer.enhance_build_stage(
                kwargs.get("business_name", "business"),
                kwargs.get("design_spec", {}),
                kwargs.get("output_path", "."),
                kwargs.get("features", [])
            )

        elif stage_upper == "TEST":
            return self.enhancer.enhance_test_stage(
                kwargs.get("codebase_path", ".")
            )

        elif stage_upper == "VERIFY":
            return self.enhancer.enhance_verify_stage(
                kwargs.get("live_url", "")
            )

        return None

    def format_for_claude(self, prompt: SuperClaudePrompt) -> str:
        """
        Format a SuperClaude prompt for Claude execution.

        Returns a string that can be used with the SlashCommand tool.
        """
        return f"{prompt.command.value}\n\n{prompt.prompt}"


# ========== Convenience Functions ==========

def get_superclaude_enhancer() -> SuperClaudeEnhancer:
    """Get a SuperClaude enhancer instance."""
    return SuperClaudeEnhancer()


def get_pipeline_integration() -> SuperClaudePipelineIntegration:
    """Get a SuperClaude pipeline integration instance."""
    return SuperClaudePipelineIntegration()


if __name__ == "__main__":
    # Test the integration
    enhancer = SuperClaudeEnhancer()

    print("SuperClaude Integration Test")
    print("=" * 50)
    print(f"Available commands: {len(enhancer.available_commands)}")
    for cmd in enhancer.available_commands:
        print(f"  - {cmd}")

    print("\n" + "=" * 50)
    print("Sample RESEARCH prompt:")
    print("=" * 50)
    research = enhancer.get_research_prompt("saas", "developers")
    print(f"Command: {research.command.value}")
    print(f"Prompt:\n{research.prompt[:500]}...")

    print("\n" + "=" * 50)
    print("Sample DESIGN prompt:")
    print("=" * 50)
    design = enhancer.get_design_prompt("TestApp", "saas", ["Dashboard", "Analytics", "API"])
    print(f"Command: {design.command.value}")
    print(f"Prompt:\n{design.prompt[:500]}...")
