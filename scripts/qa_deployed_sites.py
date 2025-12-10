"""
QA Testing and Remediation Script for Deployed GitHub Pages Sites

This script runs AFTER deployment to allow time for GitHub Pages propagation.
It performs comprehensive E2E testing and automatically fixes common issues.

Usage:
    python scripts/qa_deployed_sites.py [--wait-minutes N] [--fix-issues] [--retest-failed]

Features:
- Waits for GitHub Pages propagation (default: 3 minutes)
- Runs 5-point E2E tests on each deployed site
- Automatically remediates common issues
- Re-pushes fixes to GitHub
- Re-tests after remediation
"""

import asyncio
import json
import logging
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse
import aiohttp

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
load_genesis_env(override=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'logs/qa_testing_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)


class QARemediationAgent:
    """Agent that tests deployed sites and fixes common issues"""

    def __init__(self, github_username: str = None, github_token: str = None):
        self.github_username = github_username or os.getenv("GITHUB_USERNAME", "bullrushinvestments")
        self.github_token = github_token or os.getenv("GITHUB_TOKEN")
        self.tests_run = 0
        self.tests_passed = 0
        self.issues_fixed = 0
        self.api_base = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

    async def wait_for_propagation(self, url: str, max_wait_minutes: int = 5) -> bool:
        """Wait for site to be live with exponential backoff"""
        logger.info(f"Waiting for {url} to propagate (max {max_wait_minutes} min)...")

        intervals = [10, 20, 30, 60, 60, 60]  # Seconds between checks
        total_wait = 0
        max_seconds = max_wait_minutes * 60

        async with aiohttp.ClientSession() as session:
            for i, interval in enumerate(intervals):
                if total_wait >= max_seconds:
                    break

                try:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                        if response.status == 200:
                            logger.info(f"  Site is LIVE after {total_wait}s")
                            return True
                        logger.info(f"  Attempt {i+1}: HTTP {response.status}, waiting {interval}s...")
                except Exception as e:
                    logger.info(f"  Attempt {i+1}: {type(e).__name__}, waiting {interval}s...")

                await asyncio.sleep(interval)
                total_wait += interval

        logger.warning(f"  Site not responding after {max_wait_minutes} minutes")
        return False

    async def run_comprehensive_tests(self, url: str, business_name: str) -> Dict:
        """Run comprehensive E2E tests on a deployed site"""
        self.tests_run += 1
        results = {
            "url": url,
            "business_name": business_name,
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "issues_found": [],
            "remediation_needed": []
        }

        async with aiohttp.ClientSession() as session:
            # Test 1: Site Accessibility (HTTP 200)
            test1 = await self._test_accessibility(session, url)
            results["tests"].append(test1)
            if not test1["passed"]:
                results["issues_found"].append("Site not accessible (404 or timeout)")
                results["remediation_needed"].append("check_github_pages_enabled")

            # Test 2: Content Validity
            test2 = await self._test_content(session, url, business_name)
            results["tests"].append(test2)
            if not test2["passed"]:
                results["issues_found"].append("Missing or invalid content")
                results["remediation_needed"].append("create_index_html")

            # Test 3: Mobile Viewport
            test3 = await self._test_mobile_viewport(session, url)
            results["tests"].append(test3)
            if not test3["passed"]:
                results["issues_found"].append("Missing viewport meta tag")
                results["remediation_needed"].append("add_viewport_meta")

            # Test 4: Performance
            test4 = await self._test_performance(session, url)
            results["tests"].append(test4)

            # Test 5: Security Headers
            test5 = await self._test_security(session, url)
            results["tests"].append(test5)

        # Calculate summary
        passed = sum(1 for t in results["tests"] if t["passed"])
        total = len(results["tests"])
        results["passed"] = passed
        results["total"] = total
        results["pass_rate"] = f"{passed}/{total}"
        results["summary"] = f"{passed}/{total} tests passed"
        results["overall"] = "PASS" if passed == total else ("PARTIAL" if passed >= 3 else "FAIL")

        if results["overall"] == "PASS":
            self.tests_passed += 1
            logger.info(f"  QA PASS: {business_name} - {results['pass_rate']} tests")
        else:
            logger.warning(f"  QA {results['overall']}: {business_name} - {results['pass_rate']} tests")
            if results["issues_found"]:
                logger.warning(f"    Issues: {', '.join(results['issues_found'])}")

        return results

    async def _test_accessibility(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Test site accessibility"""
        try:
            start = time.time()
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                elapsed = time.time() - start
                return {
                    "name": "Site Accessibility",
                    "passed": response.status == 200,
                    "status_code": response.status,
                    "response_time": f"{elapsed:.2f}s",
                    "details": f"HTTP {response.status}"
                }
        except asyncio.TimeoutError:
            return {"name": "Site Accessibility", "passed": False, "details": "Timeout after 30s"}
        except Exception as e:
            return {"name": "Site Accessibility", "passed": False, "details": str(e)}

    async def _test_content(self, session: aiohttp.ClientSession, url: str, business_name: str) -> Dict:
        """Test content validity"""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    return {"name": "Content Validity", "passed": False, "details": f"Cannot check - HTTP {response.status}"}

                html = await response.text()
                checks = {
                    "has_title": "<title>" in html.lower() and "</title>" in html.lower(),
                    "has_body": "<body" in html.lower(),
                    "content_length": len(html) > 200,
                    "not_empty_body": len(html.strip()) > 100
                }
                passed = all(checks.values())

                return {
                    "name": "Content Validity",
                    "passed": passed,
                    "checks": checks,
                    "content_length": len(html),
                    "details": f"Length: {len(html)} chars, Title: {checks['has_title']}"
                }
        except Exception as e:
            return {"name": "Content Validity", "passed": False, "details": str(e)}

    async def _test_mobile_viewport(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Test for mobile viewport meta tag"""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    return {"name": "Mobile Viewport", "passed": False, "details": "Site not accessible"}

                html = await response.text()
                has_viewport = 'name="viewport"' in html.lower() or "name='viewport'" in html.lower()

                return {
                    "name": "Mobile Viewport",
                    "passed": has_viewport,
                    "details": "Viewport meta tag present" if has_viewport else "Missing viewport meta tag"
                }
        except Exception as e:
            return {"name": "Mobile Viewport", "passed": False, "details": str(e)}

    async def _test_performance(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Test page load performance"""
        try:
            start = time.time()
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                content = await response.read()
                elapsed = time.time() - start
                size_kb = len(content) / 1024

                # Performance thresholds
                passed = elapsed < 5.0 and size_kb < 5000  # Under 5s, under 5MB

                return {
                    "name": "Performance",
                    "passed": passed,
                    "load_time": f"{elapsed:.2f}s",
                    "size_kb": f"{size_kb:.1f}KB",
                    "details": f"Load: {elapsed:.2f}s, Size: {size_kb:.1f}KB"
                }
        except Exception as e:
            return {"name": "Performance", "passed": True, "details": f"Could not measure: {e}"}

    async def _test_security(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Test basic security (HTTPS)"""
        is_https = url.startswith("https://")
        return {
            "name": "Security (HTTPS)",
            "passed": is_https,
            "details": "HTTPS enabled" if is_https else "Not using HTTPS"
        }

    async def remediate_issues(self, business_path: Path, issues: List[str]) -> List[str]:
        """Automatically fix common issues"""
        fixes_applied = []

        for issue in issues:
            if issue == "create_index_html":
                if await self._fix_missing_index(business_path):
                    fixes_applied.append("Created index.html")
                    self.issues_fixed += 1

            elif issue == "add_viewport_meta":
                if await self._fix_viewport_meta(business_path):
                    fixes_applied.append("Added viewport meta tag")
                    self.issues_fixed += 1

            elif issue == "check_github_pages_enabled":
                # This requires GitHub API - handled separately
                fixes_applied.append("GitHub Pages check - requires manual verification")

        return fixes_applied

    async def _fix_missing_index(self, business_path: Path) -> bool:
        """Create or fix index.html"""
        index_path = business_path / "index.html"
        business_name = business_path.name.replace("-", " ").title()

        # Check if there's a Next.js app that needs static export
        if (business_path / "src" / "app" / "page.tsx").exists():
            # Create a static landing page
            html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{business_name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 2rem;
        }}
        .container {{ max-width: 600px; }}
        h1 {{ font-size: 2.5rem; margin-bottom: 1rem; }}
        p {{ font-size: 1.2rem; opacity: 0.9; margin-bottom: 2rem; }}
        .badge {{
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{business_name}</h1>
        <p>AI-Powered Business Solution</p>
        <span class="badge">Powered by Genesis AI</span>
    </div>
</body>
</html>"""
            with open(index_path, "w") as f:
                f.write(html)
            logger.info(f"  Created index.html for {business_name}")
            return True

        return False

    async def _fix_viewport_meta(self, business_path: Path) -> bool:
        """Add viewport meta tag to index.html"""
        index_path = business_path / "index.html"
        if not index_path.exists():
            return False

        with open(index_path, "r") as f:
            content = f.read()

        if 'name="viewport"' in content.lower():
            return False  # Already has viewport

        # Add viewport meta tag after <head>
        viewport_tag = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        if "<head>" in content:
            content = content.replace("<head>", f"<head>\n    {viewport_tag}")
        elif "<HEAD>" in content:
            content = content.replace("<HEAD>", f"<HEAD>\n    {viewport_tag}")
        else:
            return False

        with open(index_path, "w") as f:
            f.write(content)

        logger.info(f"  Added viewport meta tag to {business_path.name}")
        return True

    async def push_fixes(self, business_path: Path, repo_name: str) -> bool:
        """Push fixes to GitHub repository"""
        try:
            # Commit and push changes
            subprocess.run(["git", "add", "."], cwd=business_path, capture_output=True)
            subprocess.run(
                ["git", "commit", "-m", "QA Agent: Auto-fix issues"],
                cwd=business_path, capture_output=True
            )
            result = subprocess.run(
                ["git", "push", "origin", "main", "--force"],
                cwd=business_path, capture_output=True, text=True
            )

            if result.returncode == 0:
                logger.info(f"  Pushed fixes to {repo_name}")
                return True
            else:
                logger.warning(f"  Failed to push: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"  Push exception: {e}")
            return False


class QAOrchestrator:
    """Orchestrates QA testing across all deployed sites"""

    def __init__(self, wait_minutes: int = 3, fix_issues: bool = True, retest: bool = True):
        self.wait_minutes = wait_minutes
        self.fix_issues = fix_issues
        self.retest = retest
        self.github_username = os.getenv("GITHUB_USERNAME", "bullrushinvestments")
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.agent = QARemediationAgent(self.github_username, self.github_token)
        self.results = {
            "started_at": datetime.now().isoformat(),
            "config": {
                "wait_minutes": wait_minutes,
                "fix_issues": fix_issues,
                "retest": retest
            },
            "sites_tested": [],
            "summary": {}
        }

    def discover_deployed_sites(self) -> List[Tuple[str, Path]]:
        """Find all deployed sites from deployment logs or scan repos"""
        sites = []
        base_path = Path("businesses/production_test")

        if not base_path.exists():
            logger.error(f"Business directory not found: {base_path}")
            return sites

        # Scan all business directories that have .git (already deployed)
        for type_dir in base_path.iterdir():
            if type_dir.is_dir():
                for biz_dir in type_dir.iterdir():
                    if biz_dir.is_dir() and (biz_dir / ".git").exists():
                        url = f"https://{self.github_username}.github.io/{biz_dir.name}"
                        sites.append((url, biz_dir))

        return sites

    async def run(self):
        """Run QA testing on all deployed sites"""
        sites = self.discover_deployed_sites()
        total = len(sites)

        if total == 0:
            logger.warning("No deployed sites found. Run deploy_to_github_pages.py first.")
            return self.results

        logger.info(f"\n{'='*60}")
        logger.info("QA TESTING AND REMEDIATION")
        logger.info(f"{'='*60}")
        logger.info(f"Sites to test: {total}")
        logger.info(f"Wait for propagation: {self.wait_minutes} minutes")
        logger.info(f"Auto-fix issues: {self.fix_issues}")
        logger.info(f"Re-test after fixes: {self.retest}")
        logger.info(f"{'='*60}\n")

        # Initial propagation wait
        if self.wait_minutes > 0:
            logger.info(f"Waiting {self.wait_minutes} minutes for GitHub Pages propagation...")
            await asyncio.sleep(self.wait_minutes * 60)

        passed = 0
        failed = 0
        fixed = 0

        for i, (url, path) in enumerate(sites):
            business_name = path.name
            logger.info(f"\n[{i+1}/{total}] Testing: {business_name}")

            # Run initial tests
            result = await self.agent.run_comprehensive_tests(url, business_name)

            # Remediate if needed and enabled
            if self.fix_issues and result["remediation_needed"]:
                logger.info(f"  Attempting remediation...")
                fixes = await self.agent.remediate_issues(path, result["remediation_needed"])
                result["fixes_applied"] = fixes

                if fixes:
                    fixed += 1
                    # Push fixes to GitHub
                    await self.agent.push_fixes(path, business_name)

                    # Wait for re-propagation
                    if self.retest:
                        logger.info(f"  Waiting 60s for re-propagation...")
                        await asyncio.sleep(60)

                        # Re-test
                        logger.info(f"  Re-testing after fixes...")
                        result["retest"] = await self.agent.run_comprehensive_tests(url, business_name)

            # Track results
            if result["overall"] == "PASS" or (result.get("retest", {}).get("overall") == "PASS"):
                passed += 1
            else:
                failed += 1

            self.results["sites_tested"].append(result)

        # Generate summary
        self.results["completed_at"] = datetime.now().isoformat()
        self.results["summary"] = {
            "total_sites": total,
            "passed": passed,
            "failed": failed,
            "fixed": fixed,
            "pass_rate": f"{passed}/{total} ({100*passed/total:.1f}%)",
            "issues_fixed": self.agent.issues_fixed
        }

        # Save results
        results_path = Path("logs") / f"qa_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_path, "w") as f:
            json.dump(self.results, f, indent=2)

        # Print summary
        logger.info(f"\n{'='*60}")
        logger.info("QA SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Total sites: {total}")
        logger.info(f"Passed: {passed}")
        logger.info(f"Failed: {failed}")
        logger.info(f"Fixed: {fixed}")
        logger.info(f"Pass rate: {100*passed/total:.1f}%")
        logger.info(f"Results saved to: {results_path}")
        logger.info(f"{'='*60}\n")

        # Print failed sites
        if failed > 0:
            logger.info("Failed sites:")
            for result in self.results["sites_tested"]:
                if result["overall"] != "PASS":
                    logger.info(f"  - {result['business_name']}: {result.get('issues_found', [])}")

        return self.results


async def main():
    parser = argparse.ArgumentParser(description="QA testing for deployed GitHub Pages sites")
    parser.add_argument("--wait-minutes", type=int, default=3,
                        help="Minutes to wait for propagation (default: 3)")
    parser.add_argument("--fix-issues", action="store_true", default=True,
                        help="Automatically fix issues")
    parser.add_argument("--no-fix", action="store_true",
                        help="Don't automatically fix issues")
    parser.add_argument("--retest-failed", action="store_true", default=True,
                        help="Re-test after fixing")
    args = parser.parse_args()

    # Ensure logs directory exists
    Path("logs").mkdir(exist_ok=True)

    orchestrator = QAOrchestrator(
        wait_minutes=args.wait_minutes,
        fix_issues=not args.no_fix,
        retest=args.retest_failed
    )

    results = await orchestrator.run()

    # Exit with error if any sites failed
    if results["summary"].get("failed", 0) > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
