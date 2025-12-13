"""
Test A/B Testing Deployer
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO)

async def test_ab_deployer():
    print("=" * 60)
    print("Testing A/B Testing Deployer")
    print("=" * 60)
    
    # Test 1: Import
    print("\n[Test 1] Importing ABTestingDeployer...")
    try:
        from infrastructure.ab_testing_deployer import ABTestingDeployer, get_ab_testing_deployer
        print("✅ Import successful")
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return
    
    # Test 2: Initialize deployer
    print("\n[Test 2] Initializing deployer...")
    try:
        deployer = ABTestingDeployer()
        print(f"✅ Initialization successful")
        print(f"   - Base URL: {deployer.deployment_base_url}")
        print(f"   - Metrics dir: {deployer.metrics_dir}")
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        return
    
    # Test 3: Deploy variants
    print("\n[Test 3] Deploying A/B test variants...")
    try:
        test_result = await deployer.deploy_variants(
            business_id="test-business-123",
            primary_build={
                "output_dir": "businesses/test-123",
                "version": "1.0.0"
            },
            split_ratio=0.5
        )
        print(f"✅ Deployment successful")
        print(f"   - Test ID: {test_result.test_id}")
        print(f"   - Variant A URL: {test_result.variant_a.deployment_url}")
        print(f"   - Variant B URL: {test_result.variant_b.deployment_url}")
        print(f"   - Traffic split: {test_result.traffic_split}")
        print(f"   - Variant A features: {', '.join(test_result.variant_a.features_enabled)}")
        print(f"   - Variant B features: {', '.join(test_result.variant_b.features_enabled)}")
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Test 4: Track metrics
    print("\n[Test 4] Tracking metrics...")
    try:
        await deployer.track_metrics(
            test_id=test_result.test_id,
            variant_name="A",
            metrics={
                "response_time_ms": 250,
                "conversion_rate": 0.12,
                "error_rate": 0.02
            }
        )
        await deployer.track_metrics(
            test_id=test_result.test_id,
            variant_name="B",
            metrics={
                "response_time_ms": 180,
                "conversion_rate": 0.15,
                "error_rate": 0.01
            }
        )
        print(f"✅ Metrics tracking successful")
    except Exception as e:
        print(f"❌ Metrics tracking failed: {e}")
    
    # Test 5: Get test results
    print("\n[Test 5] Getting test results...")
    try:
        results = await deployer.get_test_results(test_result.test_id)
        print(f"✅ Results retrieval successful")
        print(f"   - Variant A metrics: {results['variant_a']['metrics_count']}")
        print(f"   - Variant B metrics: {results['variant_b']['metrics_count']}")
        print(f"   - Test duration: {results['duration_hours']} hours")
        print(f"   - Recommendation: {results['recommendation']}")
    except Exception as e:
        print(f"❌ Results retrieval failed: {e}")
    
    # Test 6: Get active tests
    print("\n[Test 6] Getting active tests...")
    try:
        active_tests = deployer.get_active_tests()
        print(f"✅ Active tests retrieval successful")
        print(f"   - Active tests: {len(active_tests)}")
        print(f"   - Test IDs: {', '.join(active_tests)}")
    except Exception as e:
        print(f"❌ Active tests retrieval failed: {e}")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_ab_deployer())
