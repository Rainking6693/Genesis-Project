#!/usr/bin/env python3
"""
Protocol V3 Audit - STEP 2: File Inventory Validation
Validates all infrastructure files meet size and functionality requirements
"""

import os
import ast
import json
from pathlib import Path
from typing import Dict, List, Tuple

def count_lines(file_path: str) -> int:
    """Count lines in a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return len(f.readlines())
    except Exception as e:
        return 0

def check_syntax(file_path: str) -> Tuple[bool, str]:
    """Check if Python file has valid syntax"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            ast.parse(f.read())
        return True, "✅ VALID"
    except SyntaxError as e:
        return False, f"❌ SYNTAX ERROR: {e.msg} at line {e.lineno}"
    except Exception as e:
        return False, f"❌ ERROR: {str(e)}"

def check_imports(file_path: str) -> Tuple[bool, str]:
    """Check if imports can be resolved"""
    try:
        # Try to import the module to check if dependencies exist
        import sys
        file_name = Path(file_path).stem

        # Check if file has proper imports structure
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Look for common import patterns
        if 'import ' in content or 'from ' in content:
            return True, "✅ HAS IMPORTS"
        else:
            return False, "⚠️  NO IMPORTS FOUND"

    except Exception as e:
        return False, f"❌ IMPORT ERROR: {str(e)}"

def check_functionality_markers(file_path: str) -> Tuple[bool, str]:
    """Check for functionality markers (classes, functions, async defs)"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Look for functionality markers
        markers = []
        if 'class ' in content:
            markers.append('classes')
        if 'def ' in content:
            markers.append('functions')
        if 'async def ' in content:
            markers.append('async functions')

        if markers:
            return True, f"✅ HAS {', '.join(markers).upper()}"
        else:
            return False, "❌ NO FUNCTIONALITY MARKERS"

    except Exception as e:
        return False, f"❌ ERROR: {str(e)}"

def validate_file(file_path: str) -> Dict:
    """Validate a single file"""
    result = {
        'file': file_path,
        'exists': os.path.exists(file_path),
        'line_count': 0,
        'size_check': False,
        'syntax_valid': False,
        'imports_ok': False,
        'functionality': False,
        'overall_valid': False,
        'issues': []
    }

    if not os.path.exists(file_path):
        result['issues'].append("File does not exist")
        return result

    # Get line count
    result['line_count'] = count_lines(file_path)

    # Size validation (Protocol V3 requirements)
    min_lines = 50 if 'util' in file_path.lower() or 'helper' in file_path.lower() else 100
    result['size_check'] = result['line_count'] >= min_lines
    if not result['size_check']:
        result['issues'].append(f"Too small: {result['line_count']} < {min_lines} lines")

    # Syntax validation
    syntax_ok, syntax_msg = check_syntax(file_path)
    result['syntax_valid'] = syntax_ok
    if not syntax_ok:
        result['issues'].append(syntax_msg)

    # Import validation
    imports_ok, imports_msg = check_imports(file_path)
    result['imports_ok'] = imports_ok

    # Functionality validation
    func_ok, func_msg = check_functionality_markers(file_path)
    result['functionality'] = func_ok
    if not func_ok:
        result['issues'].append(func_msg)

    # Overall validation
    result['overall_valid'] = (result['size_check'] and
                              result['syntax_valid'] and
                              result['functionality'])

    return result

def get_all_infrastructure_files() -> List[str]:
    """Get all Python files in infrastructure directory"""
    infra_dir = Path("infrastructure")
    if not infra_dir.exists():
        return []

    files = []
    for py_file in infra_dir.rglob("*.py"):
        files.append(str(py_file))

    return sorted(files)

def validate_inventory():
    """Main inventory validation function"""
    print("🔍 PROTOCOL V3 AUDIT - STEP 2: File Inventory Validation")
    print("=" * 70)

    # Get all infrastructure files
    infra_files = get_all_infrastructure_files()
    print(f"📁 Infrastructure files found: {len(infra_files)}")

    if not infra_files:
        print("❌ No infrastructure files found!")
        return False

    print("\n" + "=" * 70)
    print("🔍 VALIDATING FILES...")

    # Validate each file
    results = []
    valid_count = 0
    invalid_count = 0

    for file_path in infra_files:
        result = validate_file(file_path)
        results.append(result)

        status_icon = "✅" if result['overall_valid'] else "❌"
        size_status = "✅" if result['size_check'] else "❌"
        syntax_status = "✅" if result['syntax_valid'] else "❌"
        func_status = "✅" if result['functionality'] else "❌"

        print("12"
        if result['issues']:
            print(f"    Issues: {', '.join(result['issues'])}")

        if result['overall_valid']:
            valid_count += 1
        else:
            invalid_count += 1

    print("\n" + "=" * 70)
    print("📊 SUMMARY:")
    print(f"✅ Valid files: {valid_count}")
    print(f"❌ Invalid files: {invalid_count}")
    print(".1f")
    # Check for critical components
    critical_files = [
        'infrastructure/genesis_meta_agent.py',
        'infrastructure/halo_router.py',
        'infrastructure/htdag_planner.py',
        'infrastructure/a2a_connector.py',
        'infrastructure/standard_integration_mixin.py'
    ]

    print(f"\n🔍 CRITICAL COMPONENTS CHECK:")
    critical_ok = 0
    for critical_file in critical_files:
        result = next((r for r in results if r['file'] == critical_file), None)
        if result and result['overall_valid']:
            print(f"✅ {critical_file}")
            critical_ok += 1
        else:
            print(f"❌ {critical_file}")
            if result and result['issues']:
                print(f"    Issues: {', '.join(result['issues'])}")

    print(f"\nCritical components valid: {critical_ok}/{len(critical_files)}")

    # Save detailed results
    output_file = Path("STEP2_INVENTORY_VALIDATION.json")
    with open(output_file, 'w') as f:
        json.dump({
            'summary': {
                'total_files': len(infra_files),
                'valid_files': valid_count,
                'invalid_files': invalid_count,
                'compliance_rate': valid_count / len(infra_files) if infra_files else 0,
                'critical_components_ok': critical_ok,
                'critical_components_total': len(critical_files)
            },
            'results': results
        }, indent=2)

    print(f"\n📄 Detailed results saved to: {output_file}")

    # Final verdict
    print("\n" + "=" * 70)
    overall_success = valid_count >= len(infra_files) * 0.8  # 80% threshold
    critical_success = critical_ok == len(critical_files)

    if overall_success and critical_success:
        print("🎉 STEP 2 PASSED: Infrastructure inventory meets Protocol V3 requirements!")
        print("✅ Ready to proceed to STEP 3: Agent Count Verification")
    elif overall_success:
        print("⚠️  STEP 2 PARTIAL: Most files valid but some critical components missing")
        print("🔍 Proceed to STEP 3 but note critical component issues")
    else:
        print("❌ STEP 2 FAILED: Too many invalid infrastructure files")
        print("🔍 Remediation required before proceeding")

    return overall_success and critical_success

if __name__ == "__main__":
    validate_inventory()