"""
Test script for functional verification system

Demonstrates how functional verification catches Jekyll/wrong content vs. real apps.
"""

import asyncio
import logging

from infrastructure.functional_verifier import verify_deployment_functional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_verification():
    """Test functional verification on various deployment scenarios"""

    test_cases = [
        {
            "name": "Next.js Production App (should PASS)",
            "url": "https://vercel.com",  # Real Next.js site
            "app_type": "nextjs",
            "expected_result": True
        },
        {
            "name": "Jekyll/GitHub Pages Default (should FAIL)",
            "url": "https://pages.github.com",  # Jekyll-based
            "app_type": "nextjs",
            "expected_result": False
        },
        {
            "name": "React App (should PASS)",
            "url": "https://react.dev",  # Real React site
            "app_type": "react",
            "expected_result": True
        },
        {
            "name": "404 Page (should FAIL)",
            "url": "https://github.com/this-does-not-exist-12345",  # 404
            "app_type": "nextjs",
            "expected_result": False
        }
    ]

    results = []

    for test_case in test_cases:
        logger.info(f"\n{'='*60}")
        logger.info(f"Test Case: {test_case['name']}")
        logger.info(f"URL: {test_case['url']}")
        logger.info(f"{'='*60}")

        try:
            result = await verify_deployment_functional(
                test_case["url"],
                app_type=test_case["app_type"]
            )

            # Check if result matches expected
            passed = result.functional == test_case["expected_result"]

            logger.info(f"\n📊 RESULTS:")
            logger.info(f"  Functional: {result.functional}")
            logger.info(f"  Score: {result.score:.1f}%")
            logger.info(f"  Expected: {test_case['expected_result']}")
            logger.info(f"  Test: {'✅ PASS' if passed else '❌ FAIL'}")

            # Show check details
            logger.info(f"\n📋 CHECK DETAILS:")
            for check in result.checks:
                status = "✅" if check.passed else "❌"
                critical = " [CRITICAL]" if check.critical else ""
                logger.info(f"  {status} {check.name}{critical}: {check.details}")

            results.append({
                "test_name": test_case["name"],
                "passed": passed,
                "score": result.score,
                "functional": result.functional
            })

        except Exception as e:
            logger.error(f"❌ Test error: {e}")
            results.append({
                "test_name": test_case["name"],
                "passed": False,
                "error": str(e)
            })

    # Summary
    logger.info(f"\n{'='*60}")
    logger.info("📊 TEST SUMMARY")
    logger.info(f"{'='*60}")

    total_tests = len(results)
    passed_tests = sum(1 for r in results if r.get("passed"))

    for result in results:
        status = "✅ PASS" if result.get("passed") else "❌ FAIL"
        score = f" (score: {result.get('score', 0):.1f}%)" if "score" in result else ""
        logger.info(f"{status} - {result['test_name']}{score}")

    logger.info(f"\n{'='*60}")
    logger.info(f"Overall: {passed_tests}/{total_tests} tests passed")
    logger.info(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(test_verification())
