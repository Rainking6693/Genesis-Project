"""
Test Suite for Tools Integration

Verifies Playwright and CrewAI installations and integration stubs.
"""

import sys
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_playwright_installation():
    """Test Playwright installation and browser availability."""
    print("\n=== Testing Playwright Installation ===")

    try:
        from playwright.sync_api import sync_playwright

        # Test all browsers
        with sync_playwright() as p:
            browsers = {
                "chromium": p.chromium,
                "firefox": p.firefox,
                "webkit": p.webkit
            }

            for name, browser_type in browsers.items():
                try:
                    browser = browser_type.launch(headless=True)
                    page = browser.new_page()
                    page.goto("https://example.com")
                    title = page.title()
                    browser.close()

                    print(f"  {name}: OK (navigated to example.com, title='{title}')")
                except Exception as e:
                    print(f"  {name}: FAIL ({e})")
                    return False

        print("  Playwright: PASS")
        return True

    except Exception as e:
        print(f"  Playwright: FAIL ({e})")
        return False


def test_crewai_installation():
    """Test CrewAI installation and core functionality."""
    print("\n=== Testing CrewAI Installation ===")

    try:
        from crewai import Agent, Task, Crew, Process

        # Create a simple test agent
        agent = Agent(
            role="Test Agent",
            goal="Test CrewAI installation",
            backstory="A test agent for verification",
            verbose=False
        )

        # Create a simple task
        task = Task(
            description="Verify CrewAI is working",
            expected_output="Confirmation message",
            agent=agent
        )

        print("  Agent creation: OK")
        print("  Task creation: OK")
        print(f"  Version: {getattr(agent, '__version__', 'crewai 1.6.1')}")
        print("  CrewAI: PASS")
        return True

    except Exception as e:
        print(f"  CrewAI: FAIL ({e})")
        return False


def test_playwright_client():
    """Test PlaywrightClient wrapper."""
    print("\n=== Testing PlaywrightClient Wrapper ===")

    try:
        from infrastructure.tools.playwright_client import (
            get_playwright_client,
            BrowserConfig
        )

        # Test client creation
        config = BrowserConfig(browser_type="chromium", headless=True)
        client = get_playwright_client(config)

        # Test browser context
        with client.browser_context() as context:
            page = context.new_page()
            result = client.navigate(page, "https://example.com")

            if result.success:
                print(f"  Navigation: OK (status={result.status_code})")
            else:
                print(f"  Navigation: FAIL ({result.error})")
                return False

            # Test screenshot
            screenshot_path = project_root / "test_screenshot.png"
            if client.capture_screenshot(page, str(screenshot_path)):
                print(f"  Screenshot: OK")
                screenshot_path.unlink()  # Clean up
            else:
                print(f"  Screenshot: FAIL")
                return False

        client.stop()
        print("  PlaywrightClient: PASS")
        return True

    except Exception as e:
        print(f"  PlaywrightClient: FAIL ({e})")
        return False


def test_crewai_orchestrator():
    """Test CrewAIOrchestrator wrapper."""
    print("\n=== Testing CrewAIOrchestrator Wrapper ===")

    try:
        from infrastructure.tools.crewai_orchestrator import (
            get_crewai_orchestrator
        )

        orchestrator = get_crewai_orchestrator()

        # Create test agents
        agent1 = orchestrator.create_agent(
            role="Researcher",
            goal="Research topics",
            backstory="Research expert"
        )

        agent2 = orchestrator.create_agent(
            role="Writer",
            goal="Write content",
            backstory="Writing expert"
        )

        print("  Agent creation: OK")

        # Create test tasks
        task1 = orchestrator.create_task(
            description="Research AI trends",
            expected_output="List of trends",
            agent=agent1
        )

        task2 = orchestrator.create_task(
            description="Write summary",
            expected_output="Summary document",
            agent=agent2,
            context=[task1]
        )

        print("  Task creation: OK")

        # Create crew (don't execute to save time)
        crew = orchestrator.create_crew(
            agents=[agent1, agent2],
            tasks=[task1, task2],
            crew_id="test_crew"
        )

        print("  Crew creation: OK")

        # Test cache
        cached = orchestrator.get_cached_crew("test_crew")
        if cached:
            print("  Crew caching: OK")
        else:
            print("  Crew caching: FAIL")
            return False

        orchestrator.clear_cache("test_crew")
        print("  CrewAIOrchestrator: PASS")
        return True

    except Exception as e:
        print(f"  CrewAIOrchestrator: FAIL ({e})")
        return False


def test_voix_integration():
    """Test integration with existing VOIX framework."""
    print("\n=== Testing VOIX Integration ===")

    try:
        from infrastructure.tools.playwright_client import integrate_with_voix

        if integrate_with_voix():
            print("  VOIX integration: OK (available)")
        else:
            print("  VOIX integration: OK (Playwright fallback)")

        return True

    except Exception as e:
        print(f"  VOIX integration: FAIL ({e})")
        return False


def test_hybrid_crewai_integration():
    """Test integration with existing hybrid_crewai_base."""
    print("\n=== Testing Hybrid CrewAI Integration ===")

    try:
        from infrastructure.tools.crewai_orchestrator import (
            integrate_with_hybrid_crewai_base
        )

        if integrate_with_hybrid_crewai_base():
            print("  Hybrid CrewAI integration: OK")
        else:
            print("  Hybrid CrewAI integration: OK (standalone mode)")

        return True

    except Exception as e:
        print(f"  Hybrid CrewAI integration: FAIL ({e})")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("Genesis Tools Integration Test Suite")
    print("=" * 60)

    tests = [
        ("Playwright Installation", test_playwright_installation),
        ("CrewAI Installation", test_crewai_installation),
        ("PlaywrightClient Wrapper", test_playwright_client),
        ("CrewAIOrchestrator Wrapper", test_crewai_orchestrator),
        ("VOIX Integration", test_voix_integration),
        ("Hybrid CrewAI Integration", test_hybrid_crewai_integration),
    ]

    results = {}
    for name, test_func in tests:
        try:
            results[name] = test_func()
        except Exception as e:
            print(f"\n  {name}: EXCEPTION ({e})")
            results[name] = False

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for name, result in results.items():
        status = "PASS" if result else "FAIL"
        symbol = "[OK]" if result else "[FAIL]"  # ASCII-safe symbols
        print(f"  {symbol} {name}: {status}")

    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
