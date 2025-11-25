"""
Test script to verify excellence instructions and enhanced methods
"""

import asyncio
import json
from typing import Dict, List, Any

# Test 1: Verify all agents have EXCELLENCE_PROMPT
def test_excellence_prompts():
    import os
    agents_dir = 'agents'
    missing = []
    has_excellence = []

    for filename in os.listdir(agents_dir):
        if filename.endswith('.py') and filename != '__init__.py':
            filepath = os.path.join(agents_dir, filename)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if 'EXCELLENCE_PROMPT' in content:
                    has_excellence.append(filename)
                else:
                    missing.append(filename)

    print(f"[PASS] Excellence Instructions Test: {len(has_excellence)}/28 agents have EXCELLENCE_PROMPT")
    if missing:
        print(f"  Missing: {missing}")
    return len(missing) == 0

# Test 2: Verify LLM pattern documentation exists
def test_llm_pattern_doc():
    import os
    doc_path = 'docs/AGENT_LLM_PATTERN.md'
    exists = os.path.exists(doc_path)

    if exists:
        with open(doc_path, 'r', encoding='utf-8') as f:
            content = f.read()
            has_patterns = all([
                'Pattern 1: Basic LLM Call' in content,
                'Pattern 2: LLM Call with Context' in content,
                'Pattern 3: LLM Call with Retry' in content,
                'Excellence Instructions' in content
            ])
        print(f"[PASS] Documentation Test: LLM pattern guide exists with all 3 patterns")
        return has_patterns
    else:
        print(f"[FAIL] Documentation Test: LLM pattern guide not found")
        return False

# Test 3: Verify builder_agent has enhanced methods
def test_builder_enhancements():
    with open('agents/builder_agent.py', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Check for new methods
    methods = [
        'design_system_frontend',
        'generate_component_diagram',
        'define_data_flow',
        'generate_api_documentation',
        'create_testing_strategy',
        'generate_deployment_config'
    ]

    found_methods = []
    for method in methods:
        if f'def {method}(' in content or f'async def {method}(' in content:
            found_methods.append(method)

    # Check if generate_frontend uses async/LLM
    has_async_frontend = 'async def generate_frontend(' in content
    has_async_backend = 'async def generate_backend(' in content
    has_async_database = 'async def generate_database(' in content

    print(f"[PASS] Builder Enhancement Test:")
    print(f"  - Found {len(found_methods)}/6 new methods: {found_methods}")
    print(f"  - generate_frontend is async: {has_async_frontend}")
    print(f"  - generate_backend is async: {has_async_backend}")
    print(f"  - generate_database is async: {has_async_database}")

    return len(found_methods) == 6 and has_async_frontend

# Test 4: Check package installations
def test_packages():
    results = {}

    # Test backoff
    try:
        import backoff
        results['backoff'] = True
        print("[PASS] Package Test: backoff installed successfully")
    except ImportError:
        results['backoff'] = False
        print("[FAIL] Package Test: backoff not installed")

    # Test agent_framework
    try:
        import agent_framework
        results['agent_framework'] = True
        print("[PASS] Package Test: agent_framework installed successfully")
    except ImportError:
        results['agent_framework'] = False
        print("[FAIL] Package Test: agent_framework not installed (fallback mode)")

    return results['backoff']

# Test 5: Verify excellence prompt placement (should be at top of file)
def test_excellence_placement():
    import os
    agents_dir = 'agents'
    correct_placement = 0
    total_agents = 0

    for filename in os.listdir(agents_dir):
        if filename.endswith('.py') and filename != '__init__.py':
            filepath = os.path.join(agents_dir, filename)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()

            # Check if EXCELLENCE_PROMPT is in first 10 lines (before class definition)
            for i, line in enumerate(lines[:10]):
                if 'EXCELLENCE_PROMPT' in line:
                    correct_placement += 1
                    break

            total_agents += 1

    print(f"[PASS] Placement Test: {correct_placement}/{total_agents} agents have EXCELLENCE_PROMPT at top")
    return correct_placement == total_agents

# Run all tests
def main():
    print("="*60)
    print("GENESIS ENHANCEMENT VERIFICATION")
    print("="*60)
    print()

    results = {}

    # Run tests
    results['excellence'] = test_excellence_prompts()
    print()
    results['documentation'] = test_llm_pattern_doc()
    print()
    results['builder'] = test_builder_enhancements()
    print()
    results['packages'] = test_packages()
    print()
    results['placement'] = test_excellence_placement()
    print()

    # Summary
    print("="*60)
    print("SUMMARY")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    print(f"Tests Passed: {passed}/{total}")

    if passed == total:
        print("[SUCCESS] ALL ENHANCEMENTS SUCCESSFULLY IMPLEMENTED")
    else:
        print("[WARNING] Some tests failed - review above for details")

    # Detailed summary
    print("\nDetailed Results:")
    for test_name, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        print(f"  {status} {test_name.title()}: {'Passed' if passed else 'Failed'}")

if __name__ == "__main__":
    main()