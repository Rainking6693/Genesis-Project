"""Re-run the 51 tests that failed with 'coroutine' object is not iterable error."""

import asyncio
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

from infrastructure.genesis_meta_agent import GenesisMetaAgent, BusinessSpec

async def run_generation_tests():
    print("=" * 60)
    print("RE-RUNNING 51 TESTS (previously failed with coroutine error)")
    print("=" * 60)

    # Initialize Genesis Meta Agent once
    print("Initializing Genesis Meta Agent...")
    meta = GenesisMetaAgent(use_local_llm=True)

    results = []
    passed = 0
    failed = 0
    errors = 0

    # The 50 Generation tests + 1 weakness test that failed
    tests = [
        # G01-G10: Landing pages
        {"id": "G01", "name": "Single page landing", "type": "landing", "components": ["hero", "features"]},
        {"id": "G02", "name": "Landing with contact", "type": "landing", "components": ["hero", "contact"]},
        {"id": "G03", "name": "Product showcase", "type": "landing", "components": ["hero", "product"]},
        {"id": "G04", "name": "Service landing", "type": "landing", "components": ["hero", "services"]},
        {"id": "G05", "name": "Newsletter landing", "type": "landing", "components": ["hero", "newsletter"]},
        {"id": "G06", "name": "Multi-section", "type": "landing", "components": ["hero", "features", "pricing"]},
        {"id": "G07", "name": "Animated landing", "type": "landing", "components": ["hero", "animations"]},
        {"id": "G08", "name": "Responsive landing", "type": "landing", "components": ["hero", "responsive"]},
        {"id": "G09", "name": "SEO landing", "type": "landing", "components": ["hero", "seo"]},
        {"id": "G10", "name": "Dark mode landing", "type": "landing", "components": ["hero", "darkmode"]},
        # G11-G20: Dashboards
        {"id": "G11", "name": "Basic dashboard", "type": "dashboard", "components": ["sidebar", "main"]},
        {"id": "G12", "name": "Charts dashboard", "type": "dashboard", "components": ["charts", "stats"]},
        {"id": "G13", "name": "User management", "type": "dashboard", "components": ["users", "permissions"]},
        {"id": "G14", "name": "Analytics dashboard", "type": "dashboard", "components": ["metrics", "charts"]},
        {"id": "G15", "name": "Project management", "type": "dashboard", "components": ["projects", "tasks"]},
        {"id": "G16", "name": "Notifications", "type": "dashboard", "components": ["notifications", "feed"]},
        {"id": "G17", "name": "Multi-tenant", "type": "dashboard", "components": ["tenant", "dashboard"]},
        {"id": "G18", "name": "Real-time", "type": "dashboard", "components": ["live", "streaming"]},
        {"id": "G19", "name": "RBAC dashboard", "type": "dashboard", "components": ["rbac", "admin"]},
        {"id": "G20", "name": "Full SaaS", "type": "dashboard", "components": ["auth", "billing", "support"]},
        # G21-G30: E-commerce
        {"id": "G21", "name": "Product catalog", "type": "ecommerce", "components": ["catalog", "filters"]},
        {"id": "G22", "name": "Shopping cart", "type": "ecommerce", "components": ["cart", "checkout"]},
        {"id": "G23", "name": "Checkout flow", "type": "ecommerce", "components": ["checkout", "payment"]},
        {"id": "G24", "name": "User account", "type": "ecommerce", "components": ["account", "orders"]},
        {"id": "G25", "name": "Product search", "type": "ecommerce", "components": ["search", "filters"]},
        {"id": "G26", "name": "Inventory", "type": "ecommerce", "components": ["inventory", "stock"]},
        {"id": "G27", "name": "Order management", "type": "ecommerce", "components": ["orders", "tracking"]},
        {"id": "G28", "name": "Multi-currency", "type": "ecommerce", "components": ["currency", "pricing"]},
        {"id": "G29", "name": "Subscription", "type": "ecommerce", "components": ["subscription", "billing"]},
        {"id": "G30", "name": "Full e-commerce", "type": "ecommerce", "components": ["catalog", "cart", "checkout"]},
        # G31-G40: Full-stack
        {"id": "G31", "name": "REST API", "type": "fullstack", "components": ["api", "crud"]},
        {"id": "G32", "name": "Auth API", "type": "fullstack", "components": ["auth", "jwt"]},
        {"id": "G33", "name": "Database API", "type": "fullstack", "components": ["db", "models"]},
        {"id": "G34", "name": "File upload API", "type": "fullstack", "components": ["upload", "storage"]},
        {"id": "G35", "name": "Frontend + API", "type": "fullstack", "components": ["frontend", "api"]},
        {"id": "G36", "name": "GraphQL API", "type": "fullstack", "components": ["graphql", "resolvers"]},
        {"id": "G37", "name": "WebSocket API", "type": "fullstack", "components": ["websocket", "realtime"]},
        {"id": "G38", "name": "Microservices", "type": "fullstack", "components": ["services", "gateway"]},
        {"id": "G39", "name": "Event-driven", "type": "fullstack", "components": ["events", "queue"]},
        {"id": "G40", "name": "CI/CD stack", "type": "fullstack", "components": ["ci", "deploy"]},
        # G41-G50: Complex architecture
        {"id": "G41", "name": "Shared auth", "type": "architecture", "components": ["auth", "sso"]},
        {"id": "G42", "name": "Service mesh", "type": "architecture", "components": ["mesh", "proxy"]},
        {"id": "G43", "name": "CQRS pattern", "type": "architecture", "components": ["cqrs", "events"]},
        {"id": "G44", "name": "Saga pattern", "type": "architecture", "components": ["saga", "transactions"]},
        {"id": "G45", "name": "Multi-region", "type": "architecture", "components": ["regions", "sync"]},
        {"id": "G46", "name": "AI/ML integration", "type": "architecture", "components": ["ml", "inference"]},
        {"id": "G47", "name": "Analytics platform", "type": "architecture", "components": ["analytics", "dashboard"]},
        {"id": "G48", "name": "Multi-tenant SaaS", "type": "architecture", "components": ["tenant", "isolation"]},
        {"id": "G49", "name": "Serverless", "type": "architecture", "components": ["lambda", "api"]},
        {"id": "G50", "name": "Enterprise platform", "type": "architecture", "components": ["enterprise", "full"]},
        # W49: The one weakness test that failed with coroutine error
        {"id": "W49", "name": "Genesis oversight", "type": "saas", "components": ["oversight", "coordination"]},
    ]

    print(f"Running {len(tests)} tests...")
    print()

    for i, test in enumerate(tests):
        test_id = test["id"]
        start = time.time()

        try:
            spec = BusinessSpec(
                name=f"Test_{test_id}",
                business_type=test["type"],
                description=f"Test: {test['name']}",
                components=test["components"],
                output_dir=Path(f"tests/output/rerun/{test_id}"),
                metadata={"test_id": test_id}
            )

            # This is where the coroutine error was happening
            result = await meta.generate_business(spec)

            duration = (time.time() - start) * 1000
            status = "PASS" if result.success else "FAIL"

            if result.success:
                passed += 1
            else:
                failed += 1

            print(f"[{i+1:02d}/51] {test_id}: {status} ({duration:.0f}ms) - {test['name']}")
            results.append({"id": test_id, "status": status, "duration_ms": duration})

        except Exception as e:
            duration = (time.time() - start) * 1000
            errors += 1
            error_msg = str(e)[:50]
            print(f"[{i+1:02d}/51] {test_id}: ERROR ({duration:.0f}ms) - {error_msg}")
            results.append({"id": test_id, "status": "ERROR", "error": str(e), "duration_ms": duration})

    print()
    print("=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total:  {len(tests)}")
    print(f"Passed: {passed} ({passed/len(tests)*100:.1f}%)")
    print(f"Failed: {failed}")
    print(f"Errors: {errors}")

    # Check specifically for coroutine errors
    coroutine_errors = [r for r in results if "coroutine" in r.get("error", "")]
    print()
    print(f"Coroutine errors: {len(coroutine_errors)} (was 51 before fix)")

    # Save results
    with open("tests/genesis_51_rerun_results.json", "w") as f:
        json.dump({
            "total": len(tests),
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "coroutine_errors": len(coroutine_errors),
            "results": results
        }, f, indent=2)

    print()
    print("Results saved to: tests/genesis_51_rerun_results.json")

if __name__ == "__main__":
    asyncio.run(run_generation_tests())
