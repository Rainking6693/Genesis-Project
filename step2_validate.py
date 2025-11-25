#!/usr/bin/env python3
"""
Protocol V3 Audit - STEP 2: File Inventory Validation
"""

import os
import json
from pathlib import Path

def count_lines(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return len(f.readlines())
    except:
        return 0

def get_all_infra_files():
    infra_dir = Path("infrastructure")
    files = []
    for py_file in infra_dir.rglob("*.py"):
        files.append(str(py_file))
    return sorted(files)

def validate_inventory():
    print("🔍 PROTOCOL V3 AUDIT - STEP 2: File Inventory Validation")
    print("=" * 70)

    # Get all infrastructure files
    infra_files = get_all_infra_files()
    print(f"📁 Infrastructure files found: {len(infra_files)}")

    results = []
    valid_count = 0
    total_lines = 0

    for file_path in infra_files:
        lines = count_lines(file_path)
        total_lines += lines

        # Protocol V3 size requirements
        min_size = 50 if 'util' in file_path.lower() else 100
        size_ok = lines >= min_size

        result = {
            'file': file_path,
            'lines': lines,
            'size_ok': size_ok,
            'exists': True
        }
        results.append(result)

        if size_ok:
            valid_count += 1
            print("12"        else:
            print("12"
    print("\n" + "=" * 70)
    print("📊 SUMMARY:")
    print(f"✅ Valid files: {valid_count}/{len(infra_files)}")
    print(f"📏 Total lines of code: {total_lines:,}")
    print(".1f"
    # Critical components check
    critical_files = [
        'infrastructure/genesis_meta_agent.py',
        'infrastructure/halo_router.py',
        'infrastructure/htdag_planner.py',
        'infrastructure/a2a_connector.py'
    ]

    print("
🔍 CRITICAL COMPONENTS:")
    critical_ok = 0
    for critical in critical_files:
        exists = os.path.exists(critical)
        lines = count_lines(critical)
        size_ok = lines >= 100

        if exists and size_ok:
            print(f"✅ {critical}")
            critical_ok += 1
        else:
            print(f"❌ {critical} ({lines} lines)")

    # Save results
    with open("STEP2_INVENTORY_VALIDATION.json", 'w') as f:
        json.dump({
            'summary': {
                'total_files': len(infra_files),
                'valid_files': valid_count,
                'total_lines': total_lines,
                'critical_ok': critical_ok,
                'compliance_rate': valid_count / len(infra_files)
            },
            'results': results
        }, indent=2)

    success = valid_count >= len(infra_files) * 0.8 and critical_ok >= len(critical_files) * 0.8

    print("\n" + "=" * 70)
    if success:
        print("🎉 STEP 2 PASSED: Infrastructure meets Protocol V3 requirements!")
    else:
        print("❌ STEP 2 FAILED: Infrastructure does not meet requirements")

    return success

if __name__ == "__main__":
    validate_inventory()