#!/usr/bin/env python3
"""
Test the new autonomous business generation system.

This script tests:
1. Component library (62 components)
2. Intelligent component selection (LLM-based)
3. Team assembly (capability-based)
4. Full autonomous generation flow
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Auto-load environment
from infrastructure.load_env import load_genesis_env
load_genesis_env()

from infrastructure.genesis_meta_agent import GenesisMetaAgent
from infrastructure.component_library import get_component_count
from infrastructure.business_idea_generator import BusinessIdea


async def test_component_library():
    """Test component library."""
    print("\n" + "="*80)
    print(" "*25 + "Testing Component Library" + " "*28)
    print("="*80 + "\n")
    
    count = get_component_count()
    print(f"✅ Component library loaded: {count} components")
    
    if count < 60:
        print(f"⚠️  Warning: Expected 60+ components, found {count}")
    
    return count >= 60


async def test_component_selector():
    """Test intelligent component selection."""
    print("\n" + "="*80)
    print(" "*22 + "Testing Component Selector" + " "*31)
    print("="*80 + "\n")
    
    from infrastructure.component_selector import get_component_selector
    
    selector = get_component_selector()
    
    # Create test business idea
    idea = BusinessIdea(
        name="EcoShop Pro",
        business_type="ecommerce",
        description="Sustainable e-commerce platform for eco-friendly products with carbon offset tracking",
        target_audience="Environmentally conscious consumers aged 25-45",
        monetization_model="Product sales (40% margin) + premium sustainability analytics subscription ($9/mo)",
        mvp_features=[
            "Product catalog with sustainability ratings",
            "Carbon footprint calculator",
            "Shopping cart with eco-score",
            "Stripe checkout",
            "Customer reviews with verified purchases"
        ],
        tech_stack=["Next.js 14", "TypeScript", "Stripe", "Vercel"],
        success_metrics={
            "target_revenue_month_1": "$3,000",
            "target_users_month_1": "200 users",
            "target_conversion_rate": "3%"
        },
        revenue_score=75.0,
        market_trend_score=85.0,
        differentiation_score=80.0,
        overall_score=79.0,
        generated_at="2025-11-06T00:00:00"
    )
    
    print(f"Test Business: {idea.name}")
    print(f"Type: {idea.business_type}")
    print(f"Description: {idea.description[:80]}...\n")
    
    # Select components
    selection = await selector.select_components_for_business(
        business_idea=idea,
        max_components=10,
        min_components=6
    )
    
    print(f"✅ Component selection complete:")
    print(f"   Total selected: {len(selection.components)}")
    print(f"   Required: {selection.required_count}")
    print(f"   Recommended: {selection.recommended_count}")
    print(f"   Dependencies added: {len(selection.dependencies_added)}")
    print(f"   Build time: {selection.total_build_time_minutes} minutes")
    print(f"\nComponents: {', '.join(selection.components)}")
    
    return len(selection.components) >= 6


async def test_team_assembler():
    """Test team assembly."""
    print("\n" + "="*80)
    print(" "*25 + "Testing Team Assembler" + " "*32)
    print("="*80 + "\n")
    
    from infrastructure.team_assembler import get_team_assembler
    
    assembler = get_team_assembler()
    
    test_components = [
        "product_catalog",
        "shopping_cart",
        "stripe_checkout",
        "customer_reviews",
        "analytics_dashboard"
    ]
    
    print(f"Test components: {test_components}\n")
    
    team = assembler.assemble_optimal_team(
        components=test_components,
        business_type="ecommerce",
        team_size=5
    )
    
    print(f"✅ Team assembled:")
    for i, agent_id in enumerate(team, 1):
        print(f"   {i}. {agent_id}")
    
    # Get coverage report
    required_caps = assembler._get_required_capabilities(test_components)
    report = assembler.get_team_coverage_report(team, required_caps)
    
    print(f"\nTeam Coverage:")
    print(f"   Required capabilities: {report['required_capabilities']}")
    print(f"   Covered: {report['covered_capabilities']} ({report['coverage_percentage']:.1f}%)")
    print(f"   Total team capabilities: {report['total_capabilities']}")
    
    return len(team) == 5


async def test_full_autonomous_generation():
    """Test full autonomous generation (DRY RUN - generates idea but doesn't build)."""
    print("\n" + "="*80)
    print(" "*18 + "Testing Full Autonomous Generation" + " "*27)
    print("="*80 + "\n")
    
    agent = GenesisMetaAgent()
    
    # Generate a business idea
    from infrastructure.business_idea_generator import get_idea_generator
    idea_gen = get_idea_generator()
    
    print("Generating business idea...")
    idea = await idea_gen.generate_idea(min_revenue_score=70)
    
    print(f"\n✅ Business idea generated:")
    print(f"   Name: {idea.name}")
    print(f"   Type: {idea.business_type}")
    print(f"   Score: {idea.overall_score:.1f}/100")
    print(f"   Description: {idea.description}")
    
    # Test component selection
    print(f"\nSelecting components...")
    from infrastructure.component_selector import get_component_selector
    selector = get_component_selector()
    
    selection = await selector.select_components_for_business(
        business_idea=idea,
        max_components=10,
        min_components=6
    )
    
    print(f"✅ Selected {len(selection.components)} components:")
    for comp in selection.components:
        print(f"   - {comp}")
    
    # Test team assembly
    print(f"\nAssembling team...")
    from infrastructure.team_assembler import get_team_assembler
    assembler = get_team_assembler()
    
    team = assembler.assemble_optimal_team(
        components=selection.components,
        business_type=idea.business_type,
        team_size=5
    )
    
    print(f"✅ Team assembled: {team}")
    
    print(f"\n{'='*80}")
    print(f"✅ ALL SYSTEMS READY FOR AUTONOMOUS GENERATION")
    print(f"{'='*80}")
    print(f"\nTo generate a real business, run:")
    print(f"  python3 scripts/test_autonomous_system.py --generate")
    
    return True


async def main():
    """Run all tests."""
    print("\n" + "🤖"*40)
    print(" "*20 + "AUTONOMOUS SYSTEM TEST SUITE")
    print("🤖"*40 + "\n")
    
    results = {}
    
    # Test 1: Component Library
    try:
        results['component_library'] = await test_component_library()
    except Exception as e:
        print(f"❌ Component library test failed: {e}")
        results['component_library'] = False
    
    # Test 2: Component Selector
    try:
        results['component_selector'] = await test_component_selector()
    except Exception as e:
        print(f"❌ Component selector test failed: {e}")
        results['component_selector'] = False
    
    # Test 3: Team Assembler
    try:
        results['team_assembler'] = await test_team_assembler()
    except Exception as e:
        print(f"❌ Team assembler test failed: {e}")
        results['team_assembler'] = False
    
    # Test 4: Full Integration
    try:
        results['full_integration'] = await test_full_autonomous_generation()
    except Exception as e:
        print(f"❌ Full integration test failed: {e}")
        import traceback
        traceback.print_exc()
        results['full_integration'] = False
    
    # Summary
    print("\n" + "="*80)
    print(" "*30 + "TEST SUMMARY")
    print("="*80 + "\n")
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:25s}: {status}")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Autonomous system is ready! 🎉")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check errors above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

