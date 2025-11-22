#!/usr/bin/env python3
"""
Comprehensive Test Suite for Autonomous Business Operating System

Tests all components of the autonomous business lifecycle:
- AutonomousDeployer
- BusinessLifecycleManager
- AutonomousBusinessOrchestrator
- SimpleDeployWrapper

Author: Cora (QA Audit Specialist)
Date: November 12, 2025
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.autonomous_deploy import (
    AutonomousDeployer,
    DeploymentResult,
    get_autonomous_deployer
)
from infrastructure.business_lifecycle_manager import (
    BusinessLifecycleManager,
    BusinessMetrics,
    get_lifecycle_manager
)
from infrastructure.simple_deploy_wrapper import (
    SimpleDeployWrapper,
    get_deploy_wrapper
)


class TestAutonomousDeployer:
    """Test autonomous deployment system"""

    def test_deployer_initialization(self):
        """Test deployer initializes with correct settings"""
        deployer = AutonomousDeployer()

        assert deployer.platform == "railway", f"Expected 'railway', got {deployer.platform}"
        assert deployer.disable_vercel == True, "Vercel should be disabled"
        assert deployer.deploy_wrapper is not None, "Deploy wrapper should be initialized"

        print("[PASS] Deployer initialization")

    def test_vercel_disabled(self):
        """Test Vercel deployment is blocked"""
        deployer = AutonomousDeployer()

        # Test that Vercel blocking is enforced
        wrapper = deployer.deploy_wrapper
        result = wrapper.deploy_app("/fake/path", platform="vercel")

        assert result["success"] == False, "Vercel deployment should fail"
        assert "disabled" in result["error"].lower(), "Error should mention Vercel is disabled"

        print("[PASS] Vercel deployment blocked")

    def test_cost_estimation(self):
        """Test deployment cost estimation"""
        deployer = AutonomousDeployer()

        # Railway should be $2.50
        cost_railway = deployer._estimate_cost("railway")
        assert cost_railway == 2.50, f"Railway cost should be $2.50, got ${cost_railway}"

        # Render should be free
        cost_render = deployer._estimate_cost("render")
        assert cost_render == 0.00, f"Render cost should be $0.00, got ${cost_render}"

        # GitHub Pages should be free
        cost_github = deployer._estimate_cost("github-pages")
        assert cost_github == 0.00, f"GitHub Pages cost should be $0.00, got ${cost_github}"

        print("[PASS] Cost estimation correct")

    def test_deployment_url_extraction(self):
        """Test deployment URL generation"""
        deployer = AutonomousDeployer()

        # Railway URL format
        url_railway = deployer._extract_deployment_url("", "railway", "test-app")
        assert "railway.app" in url_railway, f"Railway URL should contain 'railway.app', got {url_railway}"

        # Render URL format
        url_render = deployer._extract_deployment_url("", "render", "test-app")
        assert "onrender.com" in url_render, f"Render URL should contain 'onrender.com', got {url_render}"

        print("[PASS] Deployment URL extraction")

    def test_singleton_pattern(self):
        """Test deployer uses singleton pattern"""
        deployer1 = get_autonomous_deployer()
        deployer2 = get_autonomous_deployer()

        assert deployer1 is deployer2, "Deployer should be a singleton"

        print("[PASS] Singleton pattern")


class TestBusinessLifecycleManager:
    """Test business lifecycle management"""

    def test_manager_initialization(self):
        """Test manager initializes with correct thresholds"""
        manager = BusinessLifecycleManager()

        assert manager.evaluation_threshold == 50.0, f"Evaluation threshold should be 50.0, got {manager.evaluation_threshold}"
        assert manager.evaluation_period_days == 30, f"Evaluation period should be 30 days, got {manager.evaluation_period_days}"
        assert manager.large_bill_threshold == 50.0, f"Bill threshold should be $50.0, got ${manager.large_bill_threshold}"

        print("[PASS] Manager initialization")

    def test_bill_approval_threshold(self):
        """Test bill approval logic at $50 threshold"""
        manager = BusinessLifecycleManager(large_bill_threshold=50.0)

        # Test auto-approval for bills <= $50
        result_50 = asyncio.run(
            manager.request_approval_for_large_bill("test-business", 50.0, "Test bill at threshold")
        )
        assert result_50 == True, "Bills at $50.0 should be auto-approved"

        result_49 = asyncio.run(
            manager.request_approval_for_large_bill("test-business", 49.99, "Test bill under threshold")
        )
        assert result_49 == True, "Bills under $50.0 should be auto-approved"

        # Test manual approval for bills > $50
        result_51 = asyncio.run(
            manager.request_approval_for_large_bill("test-business", 50.01, "Test bill over threshold")
        )
        assert result_51 == False, "Bills over $50.0 should require manual approval"

        result_100 = asyncio.run(
            manager.request_approval_for_large_bill("test-business", 100.0, "Large bill")
        )
        assert result_100 == False, "Bills at $100.0 should require manual approval"

        print("[PASS] Bill approval threshold at $50")

    def test_performance_scoring(self):
        """Test business performance score calculation"""
        # Create test metrics
        metrics_good = BusinessMetrics(
            business_name="good-business",
            deployment_url="https://good.railway.app",
            revenue=100.0,  # $100 revenue = 40 points
            users=100,       # 100 users = 10 points
            uptime_percent=99.0,  # 99% uptime = 24.75 points
            error_rate=0.01,      # 1% error = ~12 points
            avg_response_time_ms=200  # 200ms = 8 points
        )

        score_good = metrics_good.performance_score()
        assert score_good >= 50.0, f"Good business should score >= 50, got {score_good}"
        assert metrics_good.meets_threshold(50.0) == True, "Good business should meet threshold"

        # Create underperforming metrics
        metrics_bad = BusinessMetrics(
            business_name="bad-business",
            deployment_url="https://bad.railway.app",
            revenue=10.0,    # $10 revenue = 4 points
            users=5,          # 5 users = 0.5 points
            uptime_percent=80.0,  # 80% uptime = 20 points
            error_rate=0.10,      # 10% error = 0 points
            avg_response_time_ms=1500  # 1500ms = 0 points
        )

        score_bad = metrics_bad.performance_score()
        assert score_bad < 50.0, f"Bad business should score < 50, got {score_bad}"
        assert metrics_bad.meets_threshold(50.0) == False, "Bad business should not meet threshold"

        print("[PASS] Performance scoring calculation")

    def test_business_registration(self):
        """Test business registration"""
        manager = BusinessLifecycleManager()

        # Create mock deployment result
        deployment_result = DeploymentResult(
            success=True,
            app_name="test-app",
            platform="railway",
            deployment_url="https://test-app.railway.app",
            deployment_id="railway_test-app_123456",
            cost_estimate=2.50
        )

        # Register business
        asyncio.run(
            manager.register_business(
                "test-app",
                "/fake/path",
                deployment_result
            )
        )

        # Verify registration
        record_file = Path("data/businesses/test-app.json")
        assert record_file.exists(), "Business record should be created"

        with open(record_file, 'r') as f:
            record = json.load(f)

        assert record["business_name"] == "test-app", "Business name should match"
        assert record["status"] == "active", "Status should be active"
        assert record["deployment_url"] == "https://test-app.railway.app", "URL should match"

        # Cleanup
        record_file.unlink()

        print("[PASS] Business registration")

    def test_singleton_pattern(self):
        """Test manager uses singleton pattern"""
        manager1 = get_lifecycle_manager()
        manager2 = get_lifecycle_manager()

        assert manager1 is manager2, "Manager should be a singleton"

        print("[PASS] Singleton pattern")


class TestSimpleDeployWrapper:
    """Test simple deploy wrapper"""

    def test_wrapper_initialization(self):
        """Test wrapper initializes correctly"""
        wrapper = SimpleDeployWrapper()

        assert wrapper.default_platform == "railway", f"Default platform should be 'railway', got {wrapper.default_platform}"
        assert wrapper.disable_vercel == True, "Vercel should be disabled"

        print("[PASS] Wrapper initialization")

    def test_vercel_blocking(self):
        """Test Vercel deployment is completely blocked"""
        wrapper = SimpleDeployWrapper()

        # Attempt Vercel deployment
        result = wrapper.deploy_app("/fake/path", platform="vercel")

        assert result["success"] == False, "Vercel deployment should fail"
        assert result["platform"] == "vercel", "Platform should be recorded"
        assert "disabled" in result["error"].lower(), "Error should mention disabled"

        print("[PASS] Vercel completely blocked")

    def test_singleton_pattern(self):
        """Test wrapper uses singleton pattern"""
        wrapper1 = get_deploy_wrapper()
        wrapper2 = get_deploy_wrapper()

        assert wrapper1 is wrapper2, "Wrapper should be a singleton"

        print("[PASS] Singleton pattern")


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_empty_business_list(self):
        """Test handling of empty business list"""
        manager = BusinessLifecycleManager()

        summary = asyncio.run(manager.get_business_summary())

        assert summary["total_businesses"] == 0, "Should handle empty business list"
        assert summary["active_businesses"] == 0, "Active count should be 0"
        assert summary["total_revenue"] == 0.0, "Revenue should be 0"

        print("[PASS] Empty business list handling")

    def test_missing_deployment_record(self):
        """Test handling of missing deployment record"""
        deployer = AutonomousDeployer()

        status = asyncio.run(deployer.get_deployment_status("nonexistent_id"))

        assert status is None, "Should return None for missing deployment"

        print("[PASS] Missing deployment record handling")

    def test_invalid_app_path(self):
        """Test handling of invalid app path"""
        wrapper = SimpleDeployWrapper()

        result = wrapper.deploy_app("/completely/fake/path", platform="railway")

        assert result["success"] == False, "Should fail for invalid path"
        assert "does not exist" in result["error"].lower(), "Error should mention path issue"

        print("[PASS] Invalid app path handling")


class TestSecurityVulnerabilities:
    """Test for security vulnerabilities"""

    def test_bill_threshold_not_100(self):
        """CRITICAL: Verify bill threshold is NOT $100"""
        manager = BusinessLifecycleManager()

        # This is CRITICAL - threshold must be $50, not $100
        assert manager.large_bill_threshold == 50.0, f"CRITICAL: Bill threshold is ${manager.large_bill_threshold}, should be $50.00"
        assert manager.large_bill_threshold != 100.0, "CRITICAL: Bill threshold must not be $100"

        print("[PASS] Bill threshold is $50 (not $100)")

    def test_no_vercel_in_any_flow(self):
        """CRITICAL: Verify Vercel is blocked in all flows"""
        deployer = AutonomousDeployer()
        wrapper = SimpleDeployWrapper()

        # Check deployer
        assert deployer.disable_vercel == True, "Vercel must be disabled in deployer"

        # Check wrapper
        assert wrapper.disable_vercel == True, "Vercel must be disabled in wrapper"

        # Check wrapper blocks Vercel
        result = wrapper.deploy_app("/fake/path", platform="vercel")
        assert result["success"] == False, "Vercel deployment must fail"

        print("[PASS] Vercel blocked in all flows")

    def test_railway_is_default(self):
        """CRITICAL: Verify Railway is the default platform"""
        deployer = AutonomousDeployer()
        wrapper = SimpleDeployWrapper()

        assert deployer.platform == "railway", f"Default platform should be 'railway', got {deployer.platform}"
        assert wrapper.default_platform == "railway", f"Wrapper default should be 'railway', got {wrapper.default_platform}"

        print("[PASS] Railway is default platform")


def run_all_tests():
    """Run all test suites"""
    print("\n" + "="*60)
    print("AUTONOMOUS BUSINESS SYSTEM - COMPREHENSIVE TEST SUITE")
    print("="*60 + "\n")

    total_tests = 0
    passed_tests = 0
    failed_tests = []

    test_suites = [
        ("Autonomous Deployer", TestAutonomousDeployer),
        ("Business Lifecycle Manager", TestBusinessLifecycleManager),
        ("Simple Deploy Wrapper", TestSimpleDeployWrapper),
        ("Edge Cases", TestEdgeCases),
        ("Security Vulnerabilities", TestSecurityVulnerabilities)
    ]

    for suite_name, suite_class in test_suites:
        print(f"\n{'='*60}")
        print(f"Test Suite: {suite_name}")
        print(f"{'='*60}\n")

        suite = suite_class()
        test_methods = [m for m in dir(suite) if m.startswith("test_")]

        for test_method in test_methods:
            total_tests += 1
            try:
                getattr(suite, test_method)()
                passed_tests += 1
            except AssertionError as e:
                failed_tests.append((suite_name, test_method, str(e)))
                print(f"[FAIL] {test_method} - {e}")
            except Exception as e:
                failed_tests.append((suite_name, test_method, f"Exception: {e}"))
                print(f"[ERROR] {test_method} - {e}")

    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {len(failed_tests)}")
    print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")

    if failed_tests:
        print("\n" + "="*60)
        print("FAILED TESTS:")
        print("="*60)
        for suite_name, test_name, error in failed_tests:
            print(f"\n{suite_name} -> {test_name}")
            print(f"  Error: {error}")

    print("\n" + "="*60)

    return len(failed_tests) == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
