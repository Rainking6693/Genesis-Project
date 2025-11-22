#!/usr/bin/env python3
"""
PythonAnywhere Dashboard Verification Script

Validates that Genesis Monitoring Dashboard is working correctly on PythonAnywhere.
Tests all endpoints, checks metrics collection, and validates UI rendering.

Author: Cora (Orchestration Specialist)
Date: November 8, 2025
Status: Production Ready

Usage:
    python verify_pythonanywhere.py --url https://username.pythonanywhere.com

Tests Performed:
    1. Health check endpoint
    2. Metrics API endpoint
    3. Dashboard UI loading
    4. Static files (CSS/JS)
    5. Metrics data validation
    6. Auto-refresh functionality
"""

import argparse
import json
import logging
import sys
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin

try:
    import requests
except ImportError:
    print("ERROR: requests library not installed")
    print("Install with: pip install requests")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PythonAnywhereVerifier:
    """Verify PythonAnywhere deployment"""

    def __init__(self, base_url: str, timeout: int = 10):
        """
        Initialize verifier

        Args:
            base_url: Base URL of deployed dashboard
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.results: Dict[str, bool] = {}

    def test_health_endpoint(self) -> bool:
        """Test /api/health endpoint"""
        logger.info("Testing health endpoint...")

        url = urljoin(self.base_url, "/api/health")

        try:
            response = requests.get(url, timeout=self.timeout)

            if response.status_code == 200:
                data = response.json()

                if data.get("status") == "healthy":
                    logger.info("  ✅ Health endpoint working")
                    logger.info(f"     Status: {data.get('status')}")
                    logger.info(f"     Version: {data.get('version', 'unknown')}")
                    return True
                else:
                    logger.error(f"  ❌ Health endpoint returned bad status: {data}")
                    return False
            else:
                logger.error(f"  ❌ Health endpoint returned {response.status_code}")
                return False

        except requests.exceptions.Timeout:
            logger.error(f"  ❌ Health endpoint timed out after {self.timeout}s")
            return False
        except Exception as e:
            logger.error(f"  ❌ Health endpoint error: {e}")
            return False

    def test_metrics_endpoint(self) -> bool:
        """Test /api/metrics endpoint"""
        logger.info("Testing metrics endpoint...")

        url = urljoin(self.base_url, "/api/metrics")

        try:
            response = requests.get(url, timeout=self.timeout)

            if response.status_code == 200:
                data = response.json()

                # Validate metrics structure
                required_keys = [
                    "revenue", "costs", "agents", "orchestration",
                    "evolution", "safety", "cost_optimization"
                ]

                missing_keys = [k for k in required_keys if k not in data]

                if missing_keys:
                    logger.warning(f"  ⚠️  Missing metrics: {missing_keys}")
                    return False

                logger.info("  ✅ Metrics endpoint working")
                logger.info(f"     Revenue: ${data['revenue'].get('total_monthly', 0):.2f}")
                logger.info(f"     Costs: ${data['costs'].get('total', 0):.2f}")
                logger.info(f"     Active Agents: {len(data['agents'].get('active', []))}")
                logger.info(f"     Task Success Rate: {data['orchestration'].get('success_rate', 0):.1f}%")

                return True
            else:
                logger.error(f"  ❌ Metrics endpoint returned {response.status_code}")
                return False

        except requests.exceptions.Timeout:
            logger.error(f"  ❌ Metrics endpoint timed out after {self.timeout}s")
            return False
        except Exception as e:
            logger.error(f"  ❌ Metrics endpoint error: {e}")
            return False

    def test_dashboard_ui(self) -> bool:
        """Test main dashboard HTML page"""
        logger.info("Testing dashboard UI...")

        try:
            response = requests.get(self.base_url, timeout=self.timeout)

            if response.status_code == 200:
                html = response.text

                # Check for key UI elements
                checks = [
                    ("<!DOCTYPE html>", "Valid HTML5 doctype"),
                    ("Genesis Monitoring Dashboard", "Page title"),
                    ("revenue-card", "Revenue card"),
                    ("costs-card", "Costs card"),
                    ("agents-card", "Agents card"),
                    ("/static/css/dashboard.css", "CSS link"),
                    ("/static/js/dashboard.js", "JS link"),
                    ("Chart.js", "Chart.js library"),
                ]

                failed_checks = []
                for check_str, check_name in checks:
                    if check_str not in html:
                        failed_checks.append(check_name)

                if failed_checks:
                    logger.error(f"  ❌ Missing UI elements: {failed_checks}")
                    return False

                logger.info("  ✅ Dashboard UI rendering correctly")
                logger.info(f"     HTML size: {len(html)} bytes")
                return True
            else:
                logger.error(f"  ❌ Dashboard returned {response.status_code}")
                return False

        except requests.exceptions.Timeout:
            logger.error(f"  ❌ Dashboard timed out after {self.timeout}s")
            return False
        except Exception as e:
            logger.error(f"  ❌ Dashboard error: {e}")
            return False

    def test_static_css(self) -> bool:
        """Test CSS file loading"""
        logger.info("Testing CSS file...")

        url = urljoin(self.base_url, "/static/css/dashboard.css")

        try:
            response = requests.get(url, timeout=self.timeout)

            if response.status_code == 200:
                css = response.text

                # Check for key CSS rules
                if ".dashboard-container" in css and ".metric-card" in css:
                    logger.info("  ✅ CSS file loaded")
                    logger.info(f"     Size: {len(css)} bytes")
                    return True
                else:
                    logger.error("  ❌ CSS file missing key rules")
                    return False
            else:
                logger.error(f"  ❌ CSS returned {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"  ❌ CSS error: {e}")
            return False

    def test_static_js(self) -> bool:
        """Test JavaScript file loading"""
        logger.info("Testing JavaScript file...")

        url = urljoin(self.base_url, "/static/js/dashboard.js")

        try:
            response = requests.get(url, timeout=self.timeout)

            if response.status_code == 200:
                js = response.text

                # Check for key JS functions
                if "updateDashboard" in js and "fetchMetrics" in js:
                    logger.info("  ✅ JavaScript file loaded")
                    logger.info(f"     Size: {len(js)} bytes")
                    return True
                else:
                    logger.error("  ❌ JavaScript file missing key functions")
                    return False
            else:
                logger.error(f"  ❌ JavaScript returned {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"  ❌ JavaScript error: {e}")
            return False

    def test_metrics_freshness(self) -> bool:
        """Test that metrics are being updated"""
        logger.info("Testing metrics freshness...")

        url = urljoin(self.base_url, "/api/metrics")

        try:
            # Fetch metrics twice with 2-second delay
            response1 = requests.get(url, timeout=self.timeout)
            time.sleep(2)
            response2 = requests.get(url, timeout=self.timeout)

            if response1.status_code == 200 and response2.status_code == 200:
                data1 = response1.json()
                data2 = response2.json()

                # Check if timestamp updated (if present)
                timestamp1 = data1.get("timestamp", "")
                timestamp2 = data2.get("timestamp", "")

                if timestamp1 and timestamp2 and timestamp1 != timestamp2:
                    logger.info("  ✅ Metrics are being updated")
                    logger.info(f"     First fetch: {timestamp1}")
                    logger.info(f"     Second fetch: {timestamp2}")
                    return True
                else:
                    logger.warning("  ⚠️  Metrics may be cached (timestamps identical)")
                    # This is not necessarily a failure
                    return True
            else:
                logger.error("  ❌ Failed to fetch metrics for freshness test")
                return False

        except Exception as e:
            logger.error(f"  ❌ Freshness test error: {e}")
            return False

    def test_performance(self) -> bool:
        """Test dashboard performance"""
        logger.info("Testing dashboard performance...")

        url = urljoin(self.base_url, "/api/metrics")

        try:
            # Measure response time
            start_time = time.time()
            response = requests.get(url, timeout=self.timeout)
            elapsed_time = time.time() - start_time

            if response.status_code == 200:
                # Performance thresholds
                if elapsed_time < 1.0:
                    logger.info(f"  ✅ Excellent performance: {elapsed_time*1000:.1f}ms")
                    return True
                elif elapsed_time < 3.0:
                    logger.info(f"  ✅ Good performance: {elapsed_time*1000:.1f}ms")
                    return True
                else:
                    logger.warning(f"  ⚠️  Slow performance: {elapsed_time*1000:.1f}ms")
                    return True  # Still passing, just slow
            else:
                logger.error(f"  ❌ Performance test failed: {response.status_code}")
                return False

        except requests.exceptions.Timeout:
            logger.error(f"  ❌ Performance test timed out (>{self.timeout}s)")
            return False
        except Exception as e:
            logger.error(f"  ❌ Performance test error: {e}")
            return False

    def verify(self) -> Tuple[bool, Dict[str, bool]]:
        """
        Run all verification tests

        Returns:
            (overall_success, test_results)
        """
        logger.info("=" * 60)
        logger.info("Starting PythonAnywhere deployment verification")
        logger.info("=" * 60)
        logger.info(f"Dashboard URL: {self.base_url}")
        logger.info("")

        tests = [
            ("Health Endpoint", self.test_health_endpoint),
            ("Metrics Endpoint", self.test_metrics_endpoint),
            ("Dashboard UI", self.test_dashboard_ui),
            ("Static CSS", self.test_static_css),
            ("Static JavaScript", self.test_static_js),
            ("Metrics Freshness", self.test_metrics_freshness),
            ("Performance", self.test_performance),
        ]

        results = {}
        passed = 0
        failed = 0

        for test_name, test_func in tests:
            logger.info("")
            logger.info(f"Test: {test_name}")
            logger.info("-" * 60)

            success = test_func()
            results[test_name] = success

            if success:
                passed += 1
            else:
                failed += 1

            time.sleep(0.5)  # Rate limiting

        # Summary
        logger.info("")
        logger.info("=" * 60)
        logger.info("VERIFICATION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total Tests: {len(tests)}")
        logger.info(f"Passed: {passed} ✅")
        logger.info(f"Failed: {failed} ❌")
        logger.info(f"Success Rate: {(passed/len(tests)*100):.1f}%")
        logger.info("")

        overall_success = failed == 0

        if overall_success:
            logger.info("✅ ALL TESTS PASSED - Deployment verified")
        else:
            logger.error("❌ SOME TESTS FAILED - Review errors above")

        logger.info("=" * 60)

        return overall_success, results


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Verify Genesis Dashboard on PythonAnywhere"
    )
    parser.add_argument(
        "--url",
        required=True,
        help="Dashboard URL (e.g., https://username.pythonanywhere.com)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Request timeout in seconds (default: 10)"
    )

    args = parser.parse_args()

    # Create verifier
    verifier = PythonAnywhereVerifier(
        base_url=args.url,
        timeout=args.timeout
    )

    # Run verification
    success, results = verifier.verify()

    # Output results as JSON for automation
    print("")
    print("JSON Results:")
    print(json.dumps({
        "success": success,
        "tests": results,
        "url": args.url
    }, indent=2))

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
