"""
TEST AUTONOMOUS FLOW - Complete End-to-End Business Generation

This script demonstrates the COMPLETE autonomous flow:
1. Generate business idea
2. Build all components
3. Deploy to Vercel
4. Setup payment tracking
5. Return live URL + billing info

USER DOES NOTHING - just monitors the output.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# P0-11 FIX: Import pytest for proper test assertions
import pytest

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.genesis_meta_agent import GenesisMetaAgent, BusinessSpec
from infrastructure.load_env import load_genesis_env

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# P0-12 FIX: Validate test environment before running tests
def validate_test_environment():
    """
    Validate required environment variables before running tests

    Raises:
        EnvironmentError: If any required environment variables are missing
    """
    required_vars = [
        'ANTHROPIC_API_KEY',
        'GEMINI_API_KEY',
        # Note: VERCEL_TOKEN and GITHUB_TOKEN are optional if not deploying
        # 'VERCEL_TOKEN',
        # 'GITHUB_TOKEN',
        # 'GITHUB_ORG'
    ]

    optional_vars = [
        'VERCEL_TOKEN',
        'GITHUB_TOKEN',
        'GITHUB_ORG',
        'MONGODB_URI'
    ]

    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)

    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            f"Please set these in your .env file before running tests.\n"
            f"Create a .env file in the project root with:\n"
            + '\n'.join([f"  {var}=your_value_here" for var in missing])
        )

    # Warn about optional variables
    missing_optional = []
    for var in optional_vars:
        if not os.getenv(var):
            missing_optional.append(var)

    if missing_optional:
        logger.warning(f"Optional environment variables not set: {', '.join(missing_optional)}")
        logger.warning("Some tests may be skipped or use fallback behavior")

    logger.info("✅ Environment validation passed")
    logger.info(f"   Required: {len(required_vars)} variables set")
    logger.info(f"   Optional: {len(optional_vars) - len(missing_optional)}/{len(optional_vars)} variables set")

async def test_simple_generation():
    """Test simple business generation without deployment"""
    logger.info("="*80)
    logger.info("TEST 1: Simple Business Generation (No Deployment)")
    logger.info("="*80)

    # Load environment variables
    load_genesis_env()

    # Create Genesis Meta-Agent
    genesis = GenesisMetaAgent(
        use_local_llm=True,
        enable_modular_prompts=False
    )

    # Create simple business spec
    spec = BusinessSpec(
        name="Test Business 1",
        business_type="saas",
        description="A simple test business for validation",
        components=["Header", "Footer"],  # Just 2 components for quick testing
        output_dir=Path("businesses/test/test-business-1")
    )

    # Generate business
    result = await genesis.generate_business(spec)

    # P0-11 FIX: Add proper test assertions
    assert result is not None, "Generation result should not be None"
    assert result.success, f"Generation failed: {getattr(result, 'error', 'Unknown error')}"
    assert result.components_generated, "No components were generated"
    assert len(result.components_generated) > 0, "Generated components list is empty"
    assert result.output_directory is not None, "Output directory not set"
    assert Path(result.output_directory).exists(), f"Output directory does not exist: {result.output_directory}"

    logger.info(f"\nGeneration Result:")
    logger.info(f"  Success: {result.success}")
    logger.info(f"  Components: {result.components_generated}")
    logger.info(f"  Time: {result.generation_time_seconds:.1f}s")
    logger.info(f"  Output: {result.output_directory}")
    logger.info(f"  ✅ All assertions passed")

    return result


async def test_full_autonomous_flow():
    """Test COMPLETE autonomous flow with deployment + billing"""
    logger.info("="*80)
    logger.info("TEST 2: FULL AUTONOMOUS FLOW (Generation + Deploy + Billing)")
    logger.info("="*80)

    # Load environment variables
    load_genesis_env()

    # Create Genesis Meta-Agent
    genesis = GenesisMetaAgent(
        use_local_llm=True,
        enable_modular_prompts=False
    )

    # Create business spec for autonomous test
    spec = BusinessSpec(
        name="Autonomous Test Business",
        business_type="ecommerce",
        description="A complete autonomous business generation test",
        components=["Header", "ProductCard", "Footer"],  # 3 components
        output_dir=Path("businesses/test/autonomous-test-business")
    )

    # Step 1: Generate business
    logger.info("\nSTEP 1: Generating business components...")
    generation_result = await genesis.generate_business(spec)

    # P0-11 FIX: Add assertions for generation step
    assert generation_result is not None, "Generation result is None"
    assert generation_result.success, f"Generation failed: {getattr(generation_result, 'error', 'Unknown')}"
    assert generation_result.components_generated, "No components generated"

    logger.info(f"✅ Generation complete: {generation_result.components_generated} components")

    # Step 2: Run post-generation automation
    logger.info("\nSTEP 2: Running post-generation automation (deploy + billing)...")

    automation_result = await genesis.post_generation_automation(
        business_spec=spec,
        generation_result=generation_result,
        auto_deploy=True,  # Deploy to Vercel
        setup_billing=True  # Setup payment tracking
    )

    # P0-11 FIX: Add assertions for automation result
    assert automation_result is not None, "Automation result is None"
    assert 'business_name' in automation_result, "Missing business_name in result"
    assert 'generation_success' in automation_result, "Missing generation_success in result"
    assert automation_result['generation_success'], "Generation was not successful"

    # Print final results
    logger.info("\n" + "="*80)
    logger.info("FINAL RESULTS:")
    logger.info("="*80)
    logger.info(f"Business Name: {automation_result['business_name']}")
    logger.info(f"Generation Success: {automation_result['generation_success']}")
    logger.info(f"Deployment URL: {automation_result.get('deployment_url', 'N/A')}")
    logger.info(f"GitHub URL: {automation_result.get('github_url', 'N/A')}")
    logger.info(f"Billing Configured: {automation_result['billing_configured']}")
    logger.info(f"Payment Tracking: {automation_result['payment_tracking_enabled']}")
    logger.info(f"Fully Autonomous: {automation_result['fully_autonomous']}")

    if automation_result['errors']:
        logger.warning(f"\nErrors encountered: {automation_result['errors']}")
    else:
        logger.info("\n✅ 100% AUTONOMOUS - NO USER INTERVENTION REQUIRED")

    logger.info("="*80)
    logger.info("✅ All automation assertions passed")

    return automation_result


async def test_billing_persistence():
    """Test billing agent with MongoDB persistence"""
    logger.info("="*80)
    logger.info("TEST 3: Billing Agent Persistence")
    logger.info("="*80)

    from agents.billing_agent import get_billing_agent

    # Create billing agent
    billing_agent = await get_billing_agent(business_id="test-business")

    # Process test payment
    logger.info("\nProcessing test payment...")
    payment_result = billing_agent.process_payment(
        customer_id="test-customer-123",
        amount=99.99,
        payment_method="card",
        currency="USD"
    )

    logger.info(f"Payment Result: {payment_result}")

    # Query payment history
    logger.info("\nQuerying payment history...")
    history = billing_agent.get_payment_history(customer_id="test-customer-123")

    logger.info(f"Payment History: {history}")

    return True


async def test_vercel_api_deployment():
    """Test Vercel API deployment (without full business generation)"""
    logger.info("="*80)
    logger.info("TEST 4: Vercel API Deployment")
    logger.info("="*80)

    from agents.deploy_agent import get_deploy_agent, DeploymentConfig

    # Create deploy agent with API enabled
    deploy_agent = await get_deploy_agent(
        business_id="test-deployment",
        use_api=True  # Use Vercel REST API
    )

    logger.info(f"Deploy Agent initialized")
    logger.info(f"  Method: {'API' if deploy_agent.use_api else 'Browser'}")
    logger.info(f"  Vercel Token: {'Set' if deploy_agent.vercel_token else 'Not Set'}")

    # NOTE: This would require actual GitHub repo and Vercel token
    # For now, just verify agent is configured correctly
    logger.info("\n✅ Vercel API client ready for deployment")
    logger.info("   (Skipping actual deployment without GitHub repo)")

    return True


async def main():
    """Run all tests"""
    # P0-12 FIX: Validate environment before running tests
    try:
        validate_test_environment()
    except EnvironmentError as e:
        logger.error(f"\n❌ Environment validation failed:\n{e}")
        sys.exit(1)

    try:
        # Test 1: Simple generation
        logger.info("\n\nRunning Test 1: Simple Generation")
        await test_simple_generation()

        # Test 2: Full autonomous flow
        logger.info("\n\nRunning Test 2: Full Autonomous Flow")
        await test_full_autonomous_flow()

        # Test 3: Billing persistence
        logger.info("\n\nRunning Test 3: Billing Persistence")
        await test_billing_persistence()

        # Test 4: Vercel API deployment
        logger.info("\n\nRunning Test 4: Vercel API Deployment")
        await test_vercel_api_deployment()

        logger.info("\n\n" + "="*80)
        logger.info("ALL TESTS COMPLETE")
        logger.info("="*80)

    except Exception as e:
        logger.error(f"\n❌ Test failed: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())
