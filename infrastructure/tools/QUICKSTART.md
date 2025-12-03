# Tools Integration Quick Start

This guide gets you up and running with Playwright and CrewAI in under 5 minutes.

## Installation Status

**Already Installed:**
- Playwright 1.56.0 (with Chromium, Firefox, WebKit browsers)
- CrewAI 1.6.1

**Location:**
- `C:\Users\Administrator\AppData\Roaming\Python\Python312\site-packages`

**Browsers:**
- Chromium 141.0.7390.37 at `C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1194`
- Firefox 142.0.1 at `C:\Users\Administrator\AppData\Local\ms-playwright\firefox-1495`
- WebKit 26.0 at `C:\Users\Administrator\AppData\Local\ms-playwright\webkit-2215`

## 30-Second Test

Verify everything works:

```bash
python infrastructure/tools/test_tools_integration.py
```

Expected output:
```
Total: 6/6 tests passed (100.0%)
```

## Playwright in 60 Seconds

```python
from infrastructure.tools import get_playwright_client

# Get client
client = get_playwright_client()

# Automate browser
with client.browser_context() as context:
    page = context.new_page()

    # Navigate
    result = client.navigate(page, "https://example.com")
    print(f"Navigated: {result.success}, Status: {result.status_code}")

    # Screenshot
    client.capture_screenshot(page, "screenshot.png")

    # Wait for element
    client.wait_for_selector(page, "h1", timeout=5000)

    # Execute JavaScript
    title = client.execute_script(page, "document.title")
    print(f"Title: {title}")

client.stop()
```

## CrewAI in 60 Seconds

```python
from infrastructure.tools import get_crewai_orchestrator

orchestrator = get_crewai_orchestrator()

# Create agents
agent1 = orchestrator.create_agent(
    role="Researcher",
    goal="Research topics",
    backstory="Expert researcher"
)

agent2 = orchestrator.create_agent(
    role="Writer",
    goal="Write content",
    backstory="Expert writer"
)

# Create tasks
task1 = orchestrator.create_task(
    description="Research AI trends for 2024",
    expected_output="List of top 5 trends with descriptions",
    agent=agent1
)

task2 = orchestrator.create_task(
    description="Write blog post about trends",
    expected_output="1000-word blog post",
    agent=agent2,
    context=[task1]  # Depends on task1
)

# Execute
result = orchestrator.run_crew(
    agents=[agent1, agent2],
    tasks=[task1, task2],
    crew_id="blog_crew"
)

if result.success:
    print(result.output)
```

## Common Use Cases

### 1. Automated Testing (Playwright)

```python
from infrastructure.tools import get_playwright_client, BrowserConfig

config = BrowserConfig(
    browser_type="chromium",
    headless=True,
    viewport={"width": 1920, "height": 1080}
)

client = get_playwright_client(config)

with client.browser_context() as context:
    page = context.new_page()

    # Test login flow
    client.navigate(page, "https://myapp.com/login")
    page.fill("#username", "testuser")
    page.fill("#password", "testpass")
    page.click("button[type=submit]")

    # Verify redirect
    client.wait_for_selector(page, ".dashboard", timeout=5000)
    assert "dashboard" in page.url

    # Screenshot for proof
    client.capture_screenshot(page, "test_login_success.png")

client.stop()
```

### 2. Multi-Agent Business Generation (CrewAI)

```python
from infrastructure.tools import get_crewai_orchestrator

orchestrator = get_crewai_orchestrator()

# Define specialized agents
market_researcher = orchestrator.create_agent(
    role="Market Researcher",
    goal="Identify profitable SaaS opportunities",
    backstory="10 years experience analyzing SaaS markets"
)

business_analyst = orchestrator.create_agent(
    role="Business Analyst",
    goal="Evaluate business viability",
    backstory="Expert in startup validation and metrics"
)

strategist = orchestrator.create_agent(
    role="Business Strategist",
    goal="Create go-to-market strategy",
    backstory="Serial entrepreneur with 5 successful exits"
)

# Define workflow
research = orchestrator.create_task(
    description="Research top 10 SaaS niches with TAM > $100M",
    expected_output="Ranked list with market data",
    agent=market_researcher
)

analysis = orchestrator.create_task(
    description="Analyze top 3 niches for profitability and competition",
    expected_output="Detailed analysis with scores",
    agent=business_analyst,
    context=[research]
)

strategy = orchestrator.create_task(
    description="Create 90-day launch strategy for top niche",
    expected_output="Detailed roadmap with milestones",
    agent=strategist,
    context=[research, analysis]
)

# Execute crew
result = orchestrator.run_crew(
    agents=[market_researcher, business_analyst, strategist],
    tasks=[research, analysis, strategy],
    crew_id="saas_ideation",
    process="sequential"
)

print(result.output)
```

### 3. Hybrid Automation (VOIX + Playwright)

```python
from infrastructure.tools import get_playwright_client
from infrastructure.browser_automation.voix_detector import get_voix_detector

# Try VOIX first (10-25x faster)
voix = get_voix_detector()
tools = voix.discover_tools("https://example.com")

if tools:
    # Use declarative automation
    print(f"Found {len(tools)} VOIX tools - using fast path")
else:
    # Fall back to Playwright
    print("No VOIX tools - using Playwright")
    client = get_playwright_client()
    with client.browser_context() as context:
        page = context.new_page()
        client.navigate(page, "https://example.com")
        # Manual automation
```

## Integration with Genesis Agents

### HybridQAAgent Example

```python
from infrastructure.tools import get_playwright_client
from infrastructure.standard_integration_mixin import StandardIntegrationMixin

class HybridQAAgent(StandardIntegrationMixin):
    def __init__(self):
        super().__init__()
        self.browser_client = get_playwright_client()

    async def test_business(self, url: str) -> dict:
        """Test generated business with automated QA."""
        results = {
            "passed": [],
            "failed": [],
            "screenshots": []
        }

        with self.browser_client.browser_context() as context:
            page = context.new_page()

            # Test 1: Homepage loads
            nav = self.browser_client.navigate(page, url)
            if nav.success and nav.status_code == 200:
                results["passed"].append("Homepage loads")
            else:
                results["failed"].append(f"Homepage failed: {nav.error}")

            # Test 2: No console errors
            errors = page.evaluate("() => window.consoleErrors || []")
            if not errors:
                results["passed"].append("No console errors")
            else:
                results["failed"].append(f"Console errors: {errors}")

            # Test 3: Accessibility
            a11y_tree = self.browser_client.get_accessibility_tree(page)
            if a11y_tree:
                results["passed"].append("Accessibility tree available")
            else:
                results["failed"].append("Accessibility tree missing")

            # Screenshot for record
            screenshot_path = f"qa_results/{url.split('//')[1]}.png"
            self.browser_client.capture_screenshot(page, screenshot_path)
            results["screenshots"].append(screenshot_path)

        return results
```

### Multi-Agent Orchestration Example

```python
from infrastructure.tools import get_crewai_orchestrator
from infrastructure.a2a_connector import A2AConnector

class GenesisMetaAgent:
    def __init__(self):
        self.orchestrator = get_crewai_orchestrator()
        self.a2a = A2AConnector()

    async def orchestrate_deployment(self, business_spec: dict):
        """Orchestrate multi-agent deployment workflow."""

        # Create specialized agents
        builder = self.orchestrator.create_agent(
            role="Build Engineer",
            goal="Build production-ready application",
            backstory="Expert in modern web frameworks"
        )

        deployer = self.orchestrator.create_agent(
            role="DevOps Engineer",
            goal="Deploy to Railway with zero downtime",
            backstory="Cloud infrastructure specialist"
        )

        monitor = self.orchestrator.create_agent(
            role="Site Reliability Engineer",
            goal="Monitor deployment health",
            backstory="Observability and alerting expert"
        )

        # Define tasks
        build_task = self.orchestrator.create_task(
            description=f"Build {business_spec['name']} with {business_spec['tech_stack']}",
            expected_output="Build artifacts and deployment package",
            agent=builder
        )

        deploy_task = self.orchestrator.create_task(
            description="Deploy to Railway and configure DNS",
            expected_output="Live URL and deployment status",
            agent=deployer,
            context=[build_task]
        )

        monitor_task = self.orchestrator.create_task(
            description="Set up monitoring and health checks",
            expected_output="Monitoring dashboard URL",
            agent=monitor,
            context=[deploy_task]
        )

        # Execute
        result = self.orchestrator.run_crew(
            agents=[builder, deployer, monitor],
            tasks=[build_task, deploy_task, monitor_task],
            crew_id=f"deploy_{business_spec['name']}"
        )

        return result
```

## Next Steps

1. **Read Full Docs:** `infrastructure/tools/README.md`
2. **Run Tests:** `python infrastructure/tools/test_tools_integration.py`
3. **Explore Examples:** See use cases above
4. **Integrate with Agents:** Add to HybridQAAgent, HybridSupportAgent, etc.
5. **Monitor Performance:** Check execution times and success rates

## Troubleshooting

**Issue:** Import errors
**Fix:** Ensure you're in project root: `C:\Users\Administrator\Desktop\Genesis-Project`

**Issue:** Browser launch fails
**Fix:** Reinstall browsers: `python -m playwright install`

**Issue:** CrewAI verbose parameter error
**Fix:** Use boolean not integer: `verbose=True` (already fixed in wrapper)

**Issue:** Test failures
**Fix:** Check logs in `infrastructure/tools/test_tools_integration.py` output

## Support

- **Documentation:** `infrastructure/tools/README.md`
- **Test Suite:** `infrastructure/tools/test_tools_integration.py`
- **Playwright Docs:** https://playwright.dev/python/
- **CrewAI Docs:** https://docs.crewai.com/
- **Genesis Architecture:** `CLAUDE.md`
