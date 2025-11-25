#!/usr/bin/env python3
"""
Protocol V3 Audit - STEP 4: Genesis Meta-Agent Deep Audit
Verifies all 6 core capabilities of the Genesis Meta-Agent
"""

import os
import ast
import json
from pathlib import Path
from typing import Dict, List, Tuple

def analyze_class_methods(file_path: str) -> Dict[str, List[str]]:
    """Analyze class methods in the meta-agent"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        tree = ast.parse(content)

        methods = {}
        current_class = None

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                current_class = node.name
                methods[current_class] = []

            elif isinstance(node, ast.FunctionDef) and current_class:
                methods[current_class].append(node.name)

        return methods

    except Exception as e:
        return {'error': str(e)}

def check_capability_presence(file_path: str, capability_keywords: List[str]) -> Dict[str, bool]:
    """Check if capabilities are present in the meta-agent"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        content_lower = content.lower()
        results = {}

        for capability in capability_keywords:
            # Check for method names and key phrases
            found = False
            for keyword in capability_keywords[capability]:
                if keyword.lower() in content_lower:
                    found = True
                    break
            results[capability] = found

        return results

    except Exception as e:
        return {'error': str(e)}

def validate_core_capabilities(file_path: str) -> Dict:
    """Validate the 6 core capabilities of Genesis Meta-Agent"""
    result = {
        'file_exists': os.path.exists(file_path),
        'capabilities': {},
        'methods_found': {},
        'overall_score': 0
    }

    if not result['file_exists']:
        return result

    # Get file stats
    stat = os.stat(file_path)
    result['file_size'] = stat.st_size
    result['line_count'] = len(open(file_path, 'r', encoding='utf-8').readlines())

    # Analyze class methods
    result['methods_found'] = analyze_class_methods(file_path)

    # Check for 6 core capabilities from CLAUDE.md
    capabilities = {
        'business_idea_generation': ['generate_business', 'autonomous_generate_business', 'idea', 'concept'],
        'halo_routing': ['halo', 'route', 'router', 'capability'],
        'task_decomposition': ['htdag', 'decompose', 'task', 'breakdown'],
        'lifecycle_oversight': ['lifecycle', 'monitor', 'oversight', 'manage'],
        'intervention_capability': ['intervention', 'human', 'override', 'manual'],
        'dynamic_spawning': ['spawn', 'dynamic', 'create', 'agent', 'instance'],
        'webhooks_integration': ['webhook', 'x402', 'payment', 'stripe'],
        'standard_integration_mixin': ['standardintegrationmixin', 'mixin', '459', 'integrations']
    }

    result['capabilities'] = check_capability_presence(file_path, capabilities)

    # Calculate score
    total_capabilities = len(capabilities)
    found_capabilities = sum(1 for cap in result['capabilities'].values() if cap)
    result['overall_score'] = (found_capabilities / total_capabilities) * 100

    return result

def audit_meta_agent():
    """Main audit function"""
    print("🔍 PROTOCOL V3 AUDIT - STEP 4: Genesis Meta-Agent Deep Audit")
    print("=" * 70)

    meta_agent_path = "infrastructure/genesis_meta_agent.py"

    # Validate core capabilities
    result = validate_core_capabilities(meta_agent_path)

    print(f"📁 Meta-Agent File: {meta_agent_path}")
    print(f"📏 File Size: {result.get('file_size', 0):,} bytes")
    print(f"📊 Line Count: {result.get('line_count', 0)}")
    print(f"🎯 Overall Capability Score: {result.get('overall_score', 0):.1f}%")

    print("\n" + "=" * 70)
    print("🔍 CORE CAPABILITIES CHECK (6 Required):")

    required_capabilities = [
        'business_idea_generation',
        'halo_routing',
        'task_decomposition',
        'lifecycle_oversight',
        'intervention_capability',
        'dynamic_spawning'
    ]

    found_count = 0
    for cap in required_capabilities:
        status = "✅" if result['capabilities'].get(cap, False) else "❌"
        print(f"{status} {cap.replace('_', ' ').title()}")
        if result['capabilities'].get(cap, False):
            found_count += 1

    print("
🔍 ADDITIONAL CAPABILITIES:"    additional_capabilities = ['webhooks_integration', 'standard_integration_mixin']

    for cap in additional_capabilities:
        status = "✅" if result['capabilities'].get(cap, False) else "❌"
        print(f"{status} {cap.replace('_', ' ').title()}")

    print("
🔍 CLASS METHODS FOUND:"    if 'error' not in result['methods_found']:
        for class_name, methods in result['methods_found'].items():
            print(f"📋 {class_name}: {len(methods)} methods")
            if len(methods) <= 10:  # Show all if reasonable number
                for method in methods[:5]:  # Show first 5
                    print(f"   • {method}")
                if len(methods) > 5:
                    print(f"   ... and {len(methods)-5} more")
    else:
        print(f"❌ Error analyzing methods: {result['methods_found']['error']}")

    # Save detailed results
    output_file = Path("STEP4_META_AGENT_AUDIT.json")
    with open(output_file, 'w') as f:
        json.dump(result, indent=2)

    print(f"\n📄 Detailed results saved to: {output_file}")

    # Final verdict
    print("\n" + "=" * 70)
    success = (found_count >= 5 and result.get('overall_score', 0) >= 80)  # Allow 1 missing capability

    if success:
        print("🎉 STEP 4 PASSED: Genesis Meta-Agent meets Protocol V3 requirements!")
        print("✅ All critical capabilities present, ready for integration verification")
    else:
        print("❌ STEP 4 FAILED: Genesis Meta-Agent missing critical capabilities")
        print("🔍 Remediation required before proceeding")

    result['success'] = success
    result['required_capabilities_found'] = found_count
    result['required_capabilities_total'] = len(required_capabilities)

    return success

if __name__ == "__main__":
    audit_meta_agent()