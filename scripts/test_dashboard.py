#!/usr/bin/env python3
"""
Test Genesis Dashboard Setup

Validates that all components are properly configured and accessible.
"""

import sys
import requests
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

def test_prometheus():
    """Test Prometheus connectivity"""
    print("\n🔍 Testing Prometheus...")

    try:
        response = requests.get("http://localhost:9090/-/healthy", timeout=5)
        if response.status_code == 200:
            print("✅ Prometheus is healthy and accessible")
            return True
        else:
            print(f"⚠️ Prometheus responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Prometheus at localhost:9090")
        print("   Start Prometheus: docker start prometheus")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_business_monitor():
    """Test Business Monitor metrics endpoint"""
    print("\n🔍 Testing Business Monitor...")

    try:
        response = requests.get("http://localhost:8000/metrics", timeout=5)
        if response.status_code == 200:
            print("✅ Business Monitor is emitting metrics")
            # Check for genesis metrics
            if "genesis_" in response.text:
                print("✅ Genesis metrics detected")
                return True
            else:
                print("⚠️ No Genesis metrics found in output")
                return False
        else:
            print(f"⚠️ Business Monitor responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Business Monitor at localhost:8000")
        print("   Start Genesis business generation to emit metrics")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_dashboard_files():
    """Test that dashboard files exist"""
    print("\n🔍 Testing Dashboard Files...")

    dashboard_file = PROJECT_ROOT / "dashboard" / "genesis_dashboard.py"
    requirements_file = PROJECT_ROOT / "dashboard" / "requirements.txt"

    if dashboard_file.exists():
        print(f"✅ Dashboard file exists: {dashboard_file}")
    else:
        print(f"❌ Dashboard file not found: {dashboard_file}")
        return False

    if requirements_file.exists():
        print(f"✅ Requirements file exists: {requirements_file}")
    else:
        print(f"❌ Requirements file not found: {requirements_file}")
        return False

    return True

def test_prometheus_config():
    """Test Prometheus configuration"""
    print("\n🔍 Testing Prometheus Configuration...")

    try:
        response = requests.get("http://localhost:9090/api/v1/targets", timeout=5)
        if response.status_code == 200:
            data = response.json()
            targets = data.get('data', {}).get('activeTargets', [])

            genesis_target_found = False
            for target in targets:
                if target.get('labels', {}).get('job') == 'genesis-metrics':
                    health = target.get('health')
                    if health == 'up':
                        print("✅ Genesis metrics target is UP")
                        genesis_target_found = True
                    else:
                        print(f"⚠️ Genesis metrics target is {health}")
                        genesis_target_found = True
                    break

            if not genesis_target_found:
                print("⚠️ Genesis metrics target not configured in Prometheus")
                print("   Add to prometheus.yml scrape_configs:")
                print("   - job_name: 'genesis-metrics'")
                print("     static_configs:")
                print("       - targets: ['localhost:8000']")
                return False

            return True
        else:
            print(f"⚠️ Cannot query Prometheus targets: {response.status_code}")
            return False
    except Exception as e:
        print(f"⚠️ Cannot query Prometheus: {e}")
        return False

def test_prometheus_queries():
    """Test sample Prometheus queries"""
    print("\n🔍 Testing Prometheus Queries...")

    queries = [
        "genesis_revenue_total",
        "genesis_active_businesses",
        "genesis_tasks_total"
    ]

    all_passed = True

    for query in queries:
        try:
            response = requests.get(
                f"http://localhost:9090/api/v1/query?query={query}",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                result = data.get('data', {}).get('result', [])
                if result:
                    print(f"✅ Query '{query}' returned data")
                else:
                    print(f"⚠️ Query '{query}' returned no data (may be normal if no activity yet)")
            else:
                print(f"❌ Query '{query}' failed: {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ Query '{query}' error: {e}")
            all_passed = False

    return all_passed

def main():
    print("=" * 60)
    print("🧪 Genesis Dashboard Test Suite")
    print("=" * 60)

    results = {
        "Dashboard Files": test_dashboard_files(),
        "Prometheus": test_prometheus(),
        "Business Monitor": test_business_monitor(),
        "Prometheus Config": test_prometheus_config(),
        "Prometheus Queries": test_prometheus_queries()
    }

    print("\n" + "=" * 60)
    print("📊 TEST RESULTS:")
    print("=" * 60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:25} {status}")

    print("=" * 60)
    print(f"Tests Passed: {passed}/{total} ({passed/total*100:.1f}%)")
    print("=" * 60)

    if passed == total:
        print("\n✅ All tests passed! Dashboard is ready to use.")
        print("   Start dashboard: python scripts/launch_dashboard.py")
        return 0
    else:
        print("\n⚠️ Some tests failed. See details above.")
        print("   Common fixes:")
        print("   - Start Prometheus: docker start prometheus")
        print("   - Start Genesis: python infrastructure/autonomous_business_generation.py")
        return 1

if __name__ == "__main__":
    sys.exit(main())
