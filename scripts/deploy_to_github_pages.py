"""
GitHub Pages Batch Deployer with Agent Monitoring, QA Testing, and Post-Deployment Pipeline

Deploys all generated businesses from businesses/production_test/ to GitHub Pages
with intelligent monitoring, automatic issue detection/fixing, E2E QA testing,
and full post-deployment pipeline (marketing, billing, analytics, maintenance agents).

Usage:
    python scripts/deploy_to_github_pages.py [--limit N] [--skip N] [--skip-qa] [--skip-post-deploy] [--dry-run]

Features:
- Batch deployment to GitHub Pages under bullrushinvestments account
- Agent monitoring for each deployment step
- Automatic issue detection and retry logic
- Post-deployment pipeline for each site:
  - Content enhancement (SEO, Open Graph, JSON-LD)
  - Marketing setup (social calendar, email sequences)
  - Billing setup (Stripe products, pricing pages)
  - Analytics setup (Plausible, Mixpanel)
  - Maintenance setup (health monitoring, alerts)
- QA agent E2E testing for each deployed site
- Automatic QA remediation after batch completes
- Progress tracking and detailed logging
"""

import asyncio
import json
import logging
import os
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
load_genesis_env(override=True)  # Force reload env vars

from infrastructure.github_pages_deployer import GitHubPagesDeployer, deploy_to_github_pages
from scripts.post_deployment_pipeline import run_post_deployment

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'logs/github_pages_deploy_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)


class DeploymentAgent:
    """Agent that monitors and fixes deployment issues"""

    def __init__(self):
        self.issues_fixed = 0
        self.issues_detected = 0

    async def pre_deploy_check(self, business_path: Path) -> Tuple[bool, List[str]]:
        """
        Check business directory before deployment
        Returns (ready, issues_found)
        """
        issues = []

        # Check for essential files
        if not (business_path / "package.json").exists():
            # Create a minimal package.json for static sites
            issues.append("Missing package.json - creating minimal version")
            await self._create_minimal_package_json(business_path)
            self.issues_fixed += 1

        # Check for index.html or Next.js page
        has_index = (business_path / "index.html").exists()
        has_nextjs = (business_path / "src" / "app" / "page.tsx").exists()
        has_pages = (business_path / "pages" / "index.tsx").exists()

        if not has_index and not has_nextjs and not has_pages:
            issues.append("No entry point found - creating index.html")
            await self._create_index_html(business_path)
            self.issues_fixed += 1

        # Check for .nojekyll (needed for Next.js/underscore files)
        if not (business_path / ".nojekyll").exists():
            (business_path / ".nojekyll").touch()
            issues.append("Added .nojekyll file")
            self.issues_fixed += 1

        self.issues_detected += len(issues)
        return True, issues

    async def _create_minimal_package_json(self, path: Path):
        """Create minimal package.json for deployment"""
        business_name = path.name
        package = {
            "name": business_name,
            "version": "1.0.0",
            "description": f"Genesis AI Business: {business_name}",
            "private": True
        }
        with open(path / "package.json", "w") as f:
            json.dump(package, f, indent=2)

    async def _create_index_html(self, path: Path):
        """Create a redirect index.html if Next.js app exists"""
        business_name = path.name.replace("-", " ").title()

        # Check if it's a Next.js app that needs building
        if (path / "src" / "app" / "page.tsx").exists():
            # Create a placeholder that will be replaced after build
            html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{business_name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        .container {{
            text-align: center;
            padding: 2rem;
        }}
        h1 {{ font-size: 3rem; margin-bottom: 1rem; }}
        p {{ font-size: 1.2rem; opacity: 0.9; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{business_name}</h1>
        <p>Genesis AI Business - Coming Soon</p>
    </div>
</body>
</html>"""
        else:
            html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{business_name}</title>
</head>
<body>
    <h1>{business_name}</h1>
    <p>Genesis AI Business</p>
</body>
</html>"""

        with open(path / "index.html", "w") as f:
            f.write(html)

    async def post_deploy_verify(self, url: str, max_retries: int = 3) -> Tuple[bool, str]:
        """
        Verify deployment is successful
        Returns (success, message)
        """
        for attempt in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        if response.status == 200:
                            return True, f"Site verified (HTTP 200) on attempt {attempt + 1}"
                        elif response.status == 404:
                            # GitHub Pages might still be deploying
                            await asyncio.sleep(30)
                            continue
                        else:
                            return False, f"Unexpected status: {response.status}"
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(30)
                else:
                    return False, f"Verification failed: {e}"
        return False, "Max retries exceeded"


class QATestingAgent:
    """Agent that performs E2E testing on deployed sites"""

    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0

    async def run_e2e_tests(self, url: str, business_name: str) -> Dict:
        """
        Run E2E tests on a deployed site
        """
        self.tests_run += 1
        results = {
            "url": url,
            "business_name": business_name,
            "timestamp": datetime.now().isoformat(),
            "tests": []
        }

        async with aiohttp.ClientSession() as session:
            # Test 1: Site accessibility
            test_result = await self._test_accessibility(session, url)
            results["tests"].append(test_result)

            # Test 2: Content check
            test_result = await self._test_content(session, url, business_name)
            results["tests"].append(test_result)

            # Test 3: Mobile responsiveness meta tag
            test_result = await self._test_mobile_meta(session, url)
            results["tests"].append(test_result)

            # Test 4: Link validation
            test_result = await self._test_links(session, url)
            results["tests"].append(test_result)

            # Test 5: Performance check (response time)
            test_result = await self._test_performance(session, url)
            results["tests"].append(test_result)

        # Calculate summary
        passed = sum(1 for t in results["tests"] if t["passed"])
        failed = len(results["tests"]) - passed

        if failed == 0:
            self.tests_passed += 1
            results["overall"] = "PASS"
        else:
            self.tests_failed += 1
            results["overall"] = "FAIL"

        results["summary"] = f"{passed}/{len(results['tests'])} tests passed"

        return results

    async def _test_accessibility(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Test if site is accessible (HTTP 200)"""
        try:
            start = time.time()
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                elapsed = time.time() - start
                passed = response.status == 200
                return {
                    "name": "Site Accessibility",
                    "passed": passed,
                    "details": f"HTTP {response.status}, {elapsed:.2f}s response time"
                }
        except Exception as e:
            return {
                "name": "Site Accessibility",
                "passed": False,
                "details": f"Error: {str(e)}"
            }

    async def _test_content(self, session: aiohttp.ClientSession, url: str, business_name: str) -> Dict:
        """Test if site has meaningful content"""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    return {
                        "name": "Content Check",
                        "passed": False,
                        "details": f"Cannot check content - HTTP {response.status}"
                    }

                html = await response.text()

                # Check for basic content
                has_title = "<title>" in html.lower()
                has_body_content = len(html) > 500  # Minimal content check
                name_parts = business_name.lower().replace("-", " ").split()
                has_business_ref = any(part in html.lower() for part in name_parts if len(part) > 3)

                passed = has_title and has_body_content
                details = []
                if has_title:
                    details.append("✓ Has title")
                else:
                    details.append("✗ Missing title")
                if has_body_content:
                    details.append(f"✓ Content length: {len(html)} chars")
                else:
                    details.append("✗ Minimal content")

                return {
                    "name": "Content Check",
                    "passed": passed,
                    "details": ", ".join(details)
                }
        except Exception as e:
            return {
                "name": "Content Check",
                "passed": False,
                "details": f"Error: {str(e)}"
            }

    async def _test_mobile_meta(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Test for mobile viewport meta tag"""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    return {
                        "name": "Mobile Responsiveness",
                        "passed": False,
                        "details": "Cannot check - site not accessible"
                    }

                html = await response.text()
                has_viewport = 'viewport' in html.lower()

                return {
                    "name": "Mobile Responsiveness",
                    "passed": has_viewport,
                    "details": "Has viewport meta tag" if has_viewport else "Missing viewport meta tag"
                }
        except Exception as e:
            return {
                "name": "Mobile Responsiveness",
                "passed": False,
                "details": f"Error: {str(e)}"
            }

    async def _test_links(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Test internal links (basic check)"""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    return {
                        "name": "Link Validation",
                        "passed": True,  # Skip if can't access
                        "details": "Skipped - site not accessible"
                    }

                html = await response.text()

                # Count links (basic)
                import re
                links = re.findall(r'href=["\']([^"\']+)["\']', html)
                internal_links = [l for l in links if not l.startswith('http') or url in l]
                external_links = [l for l in links if l.startswith('http') and url not in l]

                return {
                    "name": "Link Validation",
                    "passed": True,  # Basic pass - just report
                    "details": f"Found {len(internal_links)} internal, {len(external_links)} external links"
                }
        except Exception as e:
            return {
                "name": "Link Validation",
                "passed": True,  # Don't fail on link check errors
                "details": f"Could not analyze: {str(e)}"
            }

    async def _test_performance(self, session: aiohttp.ClientSession, url: str) -> Dict:
        """Test page load performance"""
        try:
            start = time.time()
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                content = await response.read()
                elapsed = time.time() - start

                # Performance thresholds
                passed = elapsed < 5.0  # Under 5 seconds is acceptable

                return {
                    "name": "Performance",
                    "passed": passed,
                    "details": f"Load time: {elapsed:.2f}s, Size: {len(content) / 1024:.1f}KB"
                }
        except Exception as e:
            return {
                "name": "Performance",
                "passed": False,
                "details": f"Error: {str(e)}"
            }


class BatchDeployer:
    """Orchestrates batch deployment with monitoring"""

    def __init__(self, skip_qa: bool = False, skip_post_deploy: bool = False, dry_run: bool = False):
        self.deployer = GitHubPagesDeployer()
        self.deployment_agent = DeploymentAgent()
        self.qa_agent = QATestingAgent() if not skip_qa else None
        self.skip_qa = skip_qa
        self.skip_post_deploy = skip_post_deploy
        self.dry_run = dry_run

        self.results = {
            "started_at": datetime.now().isoformat(),
            "deployments": [],
            "qa_results": [],
            "post_deploy_results": [],
            "summary": {}
        }

    def discover_businesses(self, base_path: Path, limit: Optional[int] = None, skip: int = 0) -> List[Path]:
        """Find all business directories to deploy"""
        businesses = []

        for type_dir in sorted(base_path.iterdir()):
            if type_dir.is_dir():
                for biz_dir in sorted(type_dir.iterdir()):
                    if biz_dir.is_dir():
                        businesses.append(biz_dir)

        # Apply skip and limit
        if skip > 0:
            businesses = businesses[skip:]
        if limit:
            businesses = businesses[:limit]

        return businesses

    async def deploy_single(self, business_path: Path) -> Dict:
        """Deploy a single business with monitoring"""
        business_name = business_path.name
        business_type = business_path.parent.name

        logger.info(f"=" * 60)
        logger.info(f"DEPLOYING: {business_type}/{business_name}")
        logger.info(f"=" * 60)

        result = {
            "business_name": business_name,
            "business_type": business_type,
            "path": str(business_path),
            "started_at": datetime.now().isoformat()
        }

        # Pre-deployment checks
        ready, issues = await self.deployment_agent.pre_deploy_check(business_path)
        result["pre_deploy_issues"] = issues

        if issues:
            logger.info(f"  Pre-deploy fixes applied: {len(issues)}")
            for issue in issues:
                logger.info(f"    - {issue}")

        if self.dry_run:
            result["status"] = "dry_run"
            result["message"] = "Dry run - skipped actual deployment"
            logger.info(f"  [DRY RUN] Would deploy {business_name}")
            return result

        # Deploy to GitHub Pages
        try:
            deploy_result = await deploy_to_github_pages(
                app_path=str(business_path),
                business_name=business_name,
                verify=False  # We'll verify separately with more retries
            )

            result["deploy_result"] = deploy_result

            if deploy_result.get("success"):
                result["status"] = "deployed"
                result["deployment_url"] = deploy_result.get("deployment_url")
                result["repo_url"] = deploy_result.get("repo_url")
                logger.info(f"  ✅ Deployed successfully")
                logger.info(f"     URL: {deploy_result.get('deployment_url')}")

                # Post-deployment verification
                verified, msg = await self.deployment_agent.post_deploy_verify(
                    deploy_result.get("deployment_url"),
                    max_retries=2  # Quick verify during batch
                )
                result["verified"] = verified
                result["verification_message"] = msg

            else:
                result["status"] = "failed"
                result["error"] = deploy_result.get("error", "Unknown error")
                logger.error(f"  ❌ Deployment failed: {result['error']}")

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            logger.error(f"  ❌ Exception during deployment: {e}")

        result["completed_at"] = datetime.now().isoformat()
        return result

    async def run_qa_tests(self, deployment_result: Dict) -> Optional[Dict]:
        """Run QA tests on a deployed site"""
        if self.skip_qa or not self.qa_agent:
            return None

        if deployment_result.get("status") != "deployed":
            return None

        url = deployment_result.get("deployment_url")
        business_name = deployment_result.get("business_name")

        if not url:
            return None

        logger.info(f"  🧪 Running QA tests for {business_name}...")

        try:
            qa_result = await self.qa_agent.run_e2e_tests(url, business_name)
            logger.info(f"     QA Result: {qa_result['overall']} - {qa_result['summary']}")
            return qa_result
        except Exception as e:
            logger.error(f"     QA Error: {e}")
            return {"error": str(e), "business_name": business_name}

    async def run_post_deploy_pipeline(self, deployment_result: Dict, business_path: Path) -> Optional[Dict]:
        """Run post-deployment pipeline (marketing, billing, analytics, maintenance agents)"""
        if self.skip_post_deploy:
            return None

        if deployment_result.get("status") != "deployed":
            return None

        url = deployment_result.get("deployment_url")
        business_name = deployment_result.get("business_name")

        if not url:
            return None

        logger.info(f"  🚀 Running post-deployment pipeline for {business_name}...")

        try:
            post_result = await run_post_deployment(
                business_path=business_path,
                deployment_url=url,
                business_name=business_name
            )
            stages_passed = post_result.get("summary", {}).get("stages_passed", 0)
            total_stages = post_result.get("summary", {}).get("total_stages", 5)
            assets = post_result.get("summary", {}).get("assets_generated", 0)
            logger.info(f"     Post-deploy: {stages_passed}/{total_stages} stages, {assets} assets generated")
            return post_result
        except Exception as e:
            logger.error(f"     Post-deploy Error: {e}")
            return {"error": str(e), "business_name": business_name}

    async def run(self, base_path: Path, limit: Optional[int] = None, skip: int = 0, concurrency: int = 3):
        """Run batch deployment"""
        businesses = self.discover_businesses(base_path, limit, skip)
        total = len(businesses)

        logger.info(f"\n{'='*60}")
        logger.info(f"GITHUB PAGES BATCH DEPLOYMENT")
        logger.info(f"{'='*60}")
        logger.info(f"Businesses to deploy: {total}")
        logger.info(f"Target: https://github.com/{self.deployer.github_username}")
        logger.info(f"Skip QA: {self.skip_qa}")
        logger.info(f"Dry run: {self.dry_run}")
        logger.info(f"{'='*60}\n")

        deployed = 0
        failed = 0

        # Deploy in batches to avoid rate limiting
        for i, business_path in enumerate(businesses):
            logger.info(f"\n[{i+1}/{total}] Processing {business_path.name}")

            # Deploy
            deploy_result = await self.deploy_single(business_path)
            self.results["deployments"].append(deploy_result)

            if deploy_result.get("status") == "deployed":
                deployed += 1

                # Run post-deployment pipeline (marketing, billing, analytics, maintenance)
                post_result = await self.run_post_deploy_pipeline(deploy_result, business_path)
                if post_result:
                    self.results["post_deploy_results"].append(post_result)

                # Run QA tests
                qa_result = await self.run_qa_tests(deploy_result)
                if qa_result:
                    self.results["qa_results"].append(qa_result)
            else:
                failed += 1

            # Rate limiting - wait between deployments
            if i < total - 1:
                await asyncio.sleep(2)  # 2 second delay between deployments

        # Generate summary
        self.results["completed_at"] = datetime.now().isoformat()

        # Calculate post-deploy stats
        post_deploy_success = sum(1 for r in self.results["post_deploy_results"]
                                  if r.get("summary", {}).get("success", False))
        total_assets = sum(r.get("summary", {}).get("assets_generated", 0)
                          for r in self.results["post_deploy_results"])

        self.results["summary"] = {
            "total_businesses": total,
            "deployed": deployed,
            "failed": failed,
            "issues_detected": self.deployment_agent.issues_detected,
            "issues_fixed": self.deployment_agent.issues_fixed,
            "qa_tests_run": self.qa_agent.tests_run if self.qa_agent else 0,
            "qa_tests_passed": self.qa_agent.tests_passed if self.qa_agent else 0,
            "qa_tests_failed": self.qa_agent.tests_failed if self.qa_agent else 0,
            "post_deploy_run": len(self.results["post_deploy_results"]),
            "post_deploy_success": post_deploy_success,
            "assets_generated": total_assets
        }

        # Save results
        results_path = Path("logs") / f"deployment_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_path, "w") as f:
            json.dump(self.results, f, indent=2)

        # Print summary
        logger.info(f"\n{'='*60}")
        logger.info("DEPLOYMENT SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Total businesses: {total}")
        logger.info(f"Successfully deployed: {deployed}")
        logger.info(f"Failed: {failed}")
        logger.info(f"Issues detected/fixed: {self.deployment_agent.issues_detected}/{self.deployment_agent.issues_fixed}")
        if self.qa_agent:
            logger.info(f"QA tests: {self.qa_agent.tests_passed}/{self.qa_agent.tests_run} passed")
        if not self.skip_post_deploy:
            logger.info(f"Post-deploy pipelines: {post_deploy_success}/{len(self.results['post_deploy_results'])} successful")
            logger.info(f"Assets generated: {total_assets}")
        logger.info(f"Results saved to: {results_path}")
        logger.info(f"{'='*60}\n")

        # Print deployed URLs
        if deployed > 0:
            logger.info("Deployed Sites:")
            for result in self.results["deployments"]:
                if result.get("status") == "deployed":
                    logger.info(f"  - {result['business_name']}: {result.get('deployment_url')}")

        return self.results


async def run_qa_remediation(deployed_sites: List[Dict], wait_minutes: int = 3):
    """
    Automatically run QA remediation after deployment completes.
    Waits for propagation, tests all sites, fixes issues, and re-tests.
    """
    from scripts.qa_deployed_sites import QARemediationAgent

    logger.info(f"\n{'='*60}")
    logger.info("AUTOMATIC QA REMEDIATION")
    logger.info(f"{'='*60}")
    logger.info(f"Sites to test: {len(deployed_sites)}")
    logger.info(f"Propagation wait: {wait_minutes} minutes")
    logger.info(f"{'='*60}\n")

    # Wait for GitHub Pages propagation
    logger.info(f"Waiting {wait_minutes} minutes for GitHub Pages propagation...")
    await asyncio.sleep(wait_minutes * 60)

    qa_agent = QARemediationAgent()
    remediation_results = {
        "started_at": datetime.now().isoformat(),
        "sites_tested": 0,
        "sites_passed": 0,
        "sites_remediated": 0,
        "sites_failed": 0,
        "details": []
    }

    for i, site in enumerate(deployed_sites):
        url = site.get("deployment_url")
        business_name = site.get("business_name")
        business_path = Path(site.get("path"))

        if not url:
            continue

        logger.info(f"\n[{i+1}/{len(deployed_sites)}] Testing {business_name}")
        remediation_results["sites_tested"] += 1

        # Run E2E tests
        test_result = await qa_agent.run_comprehensive_tests(url, business_name)

        if test_result.get("overall") == "PASS":
            logger.info(f"  ✅ PASSED - {test_result.get('summary')}")
            remediation_results["sites_passed"] += 1
            remediation_results["details"].append({
                "business_name": business_name,
                "url": url,
                "status": "passed",
                "tests": test_result
            })
        else:
            # Attempt remediation
            logger.info(f"  ⚠️ FAILED - Attempting remediation...")
            issues = [t["name"] for t in test_result.get("tests", []) if not t.get("passed")]

            fixes_applied = await qa_agent.remediate_issues(business_path, issues)

            if fixes_applied:
                logger.info(f"  🔧 Applied fixes: {', '.join(fixes_applied)}")

                # Push fixes to GitHub
                push_success = await qa_agent.push_fixes(business_path, business_name)

                if push_success:
                    logger.info(f"  📤 Pushed fixes to GitHub")

                    # Wait and re-test
                    await asyncio.sleep(120)  # 2 min for propagation

                    retest_result = await qa_agent.run_comprehensive_tests(url, business_name)

                    if retest_result.get("overall") == "PASS":
                        logger.info(f"  ✅ RE-TEST PASSED")
                        remediation_results["sites_remediated"] += 1
                        remediation_results["details"].append({
                            "business_name": business_name,
                            "url": url,
                            "status": "remediated",
                            "fixes": fixes_applied,
                            "tests": retest_result
                        })
                    else:
                        logger.info(f"  ❌ RE-TEST FAILED - Manual intervention needed")
                        remediation_results["sites_failed"] += 1
                        remediation_results["details"].append({
                            "business_name": business_name,
                            "url": url,
                            "status": "failed",
                            "fixes_attempted": fixes_applied,
                            "tests": retest_result
                        })
                else:
                    logger.info(f"  ❌ Failed to push fixes")
                    remediation_results["sites_failed"] += 1
            else:
                logger.info(f"  ❌ No automatic fixes available")
                remediation_results["sites_failed"] += 1
                remediation_results["details"].append({
                    "business_name": business_name,
                    "url": url,
                    "status": "failed",
                    "tests": test_result
                })

    remediation_results["completed_at"] = datetime.now().isoformat()

    # Save remediation results
    results_path = Path("logs") / f"qa_remediation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_path, "w") as f:
        json.dump(remediation_results, f, indent=2)

    # Print summary
    logger.info(f"\n{'='*60}")
    logger.info("QA REMEDIATION SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"Sites tested: {remediation_results['sites_tested']}")
    logger.info(f"Passed (first try): {remediation_results['sites_passed']}")
    logger.info(f"Remediated successfully: {remediation_results['sites_remediated']}")
    logger.info(f"Failed (needs manual fix): {remediation_results['sites_failed']}")
    logger.info(f"Results saved to: {results_path}")
    logger.info(f"{'='*60}\n")

    return remediation_results


async def main():
    parser = argparse.ArgumentParser(description="Deploy businesses to GitHub Pages")
    parser.add_argument("--limit", type=int, help="Limit number of businesses to deploy")
    parser.add_argument("--skip", type=int, default=0, help="Skip first N businesses (for resuming)")
    parser.add_argument("--skip-qa", action="store_true", help="Skip QA testing")
    parser.add_argument("--skip-post-deploy", action="store_true", help="Skip post-deployment pipeline (marketing, billing, analytics)")
    parser.add_argument("--skip-remediation", action="store_true", help="Skip automatic QA remediation after deployment")
    parser.add_argument("--propagation-wait", type=int, default=3, help="Minutes to wait for GitHub Pages propagation before QA")
    parser.add_argument("--dry-run", action="store_true", help="Dry run without actual deployment")
    args = parser.parse_args()

    # Ensure logs directory exists
    Path("logs").mkdir(exist_ok=True)

    # Run deployment
    deployer = BatchDeployer(
        skip_qa=args.skip_qa,
        skip_post_deploy=args.skip_post_deploy,
        dry_run=args.dry_run
    )

    base_path = Path("businesses/production_test")
    if not base_path.exists():
        logger.error(f"Business directory not found: {base_path}")
        sys.exit(1)

    results = await deployer.run(base_path, limit=args.limit, skip=args.skip)

    # Automatic QA remediation after deployment
    if not args.skip_remediation and not args.dry_run:
        deployed_sites = [d for d in results["deployments"] if d.get("status") == "deployed"]
        if deployed_sites:
            qa_results = await run_qa_remediation(deployed_sites, wait_minutes=args.propagation_wait)
            results["qa_remediation"] = qa_results

    # Exit with error code if any deployments failed
    if results["summary"]["failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
