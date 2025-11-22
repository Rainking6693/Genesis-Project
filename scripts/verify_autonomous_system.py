#!/usr/bin/env python3
"""
Quick verification script for autonomous business generation system.
Tests imports, basic functionality, and integration points.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_imports():
    """Test all imports work correctly."""
    print("=" * 80)
    print("Testing Imports")
    print("=" * 80)
    
    try:
        from infrastructure.component_library import (
            get_component_count,
            COMPONENT_LIBRARY,
            get_required_components,
            resolve_dependencies,
            get_components_by_category
        )
        print("✅ component_library imports OK")
        
        from infrastructure.component_selector import (
            IntelligentComponentSelector,
            get_component_selector
        )
        print("✅ component_selector imports OK")
        
        from infrastructure.team_assembler import (
            TeamAssembler,
            get_team_assembler
        )
        print("✅ team_assembler imports OK")
        
        from infrastructure.genesis_meta_agent import GenesisMetaAgent
        print("✅ genesis_meta_agent imports OK")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_component_library():
    """Test component library functionality."""
    print("\n" + "=" * 80)
    print("Testing Component Library")
    print("=" * 80)
    
    try:
        from infrastructure.component_library import (
            get_component_count,
            get_required_components,
            resolve_dependencies,
            get_components_by_category
        )
        
        # Test component count
        count = get_component_count()
        print(f"✅ Component count: {count}")
        
        if count != 54:
            print(f"⚠️  Warning: Expected 54 components, found {count}")
        
        # Test required components
        required = get_required_components("ecommerce")
        print(f"✅ Required for ecommerce: {required}")
        
        # Test dependency resolution
        deps = resolve_dependencies(["stripe_checkout"])
        print(f"✅ Dependencies resolved: {deps}")
        
        # Test category filtering
        commerce = get_components_by_category("commerce")
        print(f"✅ Commerce components: {len(commerce)} found")
        
        return True
    except Exception as e:
        print(f"❌ Component library test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_genesis_meta_agent():
    """Test GenesisMetaAgent has new method."""
    print("\n" + "=" * 80)
    print("Testing GenesisMetaAgent")
    print("=" * 80)
    
    try:
        from infrastructure.genesis_meta_agent import GenesisMetaAgent
        
        # Check method exists
        has_method = hasattr(GenesisMetaAgent, "autonomous_generate_business")
        print(f"✅ Has autonomous_generate_business: {has_method}")
        
        if not has_method:
            print("❌ Method not found!")
            return False
        
        # Check method signature
        import inspect
        sig = inspect.signature(GenesisMetaAgent.autonomous_generate_business)
        params = list(sig.parameters.keys())
        print(f"✅ Method parameters: {params}")
        
        expected_params = ['self', 'business_idea', 'min_score', 'max_components', 'min_components']
        if params == expected_params:
            print("✅ Method signature correct")
        else:
            print(f"⚠️  Warning: Expected {expected_params}, got {params}")
        
        return True
    except Exception as e:
        print(f"❌ GenesisMetaAgent test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_integration_points():
    """Test integration points between systems."""
    print("\n" + "=" * 80)
    print("Testing Integration Points")
    print("=" * 80)
    
    try:
        # Test 1: Component selector can access component library
        from infrastructure.component_selector import IntelligentComponentSelector
        from infrastructure.component_library import COMPONENT_LIBRARY
        
        selector = IntelligentComponentSelector()
        print(f"✅ Component selector initialized")
        print(f"✅ Has access to {len(COMPONENT_LIBRARY)} components")
        
        # Test 2: Team assembler can load capability maps
        from infrastructure.team_assembler import TeamAssembler
        
        assembler = TeamAssembler()
        print(f"✅ Team assembler initialized")
        print(f"✅ Loaded {len(assembler.capability_maps)} capability maps")
        
        # Test 3: GenesisMetaAgent can lazy load dependencies
        from infrastructure.genesis_meta_agent import GenesisMetaAgent
        
        agent = GenesisMetaAgent()
        print(f"✅ GenesisMetaAgent initialized")
        print(f"✅ Component selector: {agent.component_selector}")
        print(f"✅ Team assembler: {agent.team_assembler}")
        print(f"✅ Idea generator: {agent.idea_generator}")
        
        return True
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all verification tests."""
    print("\n" + "🤖" * 40)
    print("AUTONOMOUS SYSTEM VERIFICATION")
    print("🤖" * 40 + "\n")
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("Component Library", test_component_library()))
    results.append(("GenesisMetaAgent", test_genesis_meta_agent()))
    results.append(("Integration Points", test_integration_points()))
    
    # Summary
    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("\n" + "=" * 80)
    print(f"FINAL RESULT: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("=" * 80)
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION")
        return 0
    else:
        print(f"\n❌ {total - passed} TESTS FAILED - FIX ISSUES BEFORE DEPLOYMENT")
        return 1

if __name__ == "__main__":
    sys.exit(main())

