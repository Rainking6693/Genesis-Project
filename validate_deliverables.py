#!/usr/bin/env python3
"""
Protocol V3 Audit - STEP 1: Deliverables Manifest Check
Validates all files listed in CLAUDE.md against actual filesystem
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Tuple

def extract_all_files_from_claude() -> List[str]:
    """Extract all file paths mentioned in CLAUDE.md"""
    claude_file = Path("CLAUDE.md")

    if not claude_file.exists():
        print("❌ CLAUDE.md not found")
        return []

    with open(claude_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern to match various file path formats
    patterns = [
        r'`?([\w\-\.]+/[\w\-\./]+)`?',  # `infrastructure/file.py`
        r'`?(\w+\.\w+(?:\.\w+)?)`?',    # `file.md`, `file.py`
        r'(\w+/\w+\.\w+)',              # agents/file.py
    ]

    files = []
    for pattern in patterns:
        matches = re.findall(pattern, content)
        files.extend(matches)

    # Filter for actual file paths (exclude URLs, plain words)
    valid_files = []
    for file_path in files:
        # Skip if it looks like a URL or doesn't have proper extension
        if any(skip in file_path.lower() for skip in ['http', 'https', 'www.']):
            continue
        if not any(file_path.endswith(ext) for ext in ['.py', '.md', '.txt', '.json', '.yml', '.yaml', '.bat', '.sh', '.service', '.toml']):
            continue

        # Clean up the path
        clean_path = file_path.strip('`').strip()
        if clean_path and '/' in clean_path:  # Must contain a directory
            valid_files.append(clean_path)

    return sorted(list(set(valid_files)))

def get_actual_files() -> List[str]:
    """Get all files from git ls-files output"""
    actual_files_path = Path("actual_files.txt")
    if not actual_files_path.exists():
        print("❌ actual_files.txt not found (run 'git ls-files > actual_files.txt' first)")
        return []

    with open(actual_files_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Parse the git ls-files output (remove BOM and clean lines)
    files = []
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            # Remove the BOM if present
            line = line.lstrip('\ufeff')
            files.append(line)

    return sorted(files)

def validate_file_exists(file_path: str, actual_files: List[str]) -> Tuple[bool, str]:
    """Check if a file exists in the actual filesystem"""
    if file_path in actual_files:
        return True, "✅ EXISTS"

    # Check for partial matches (in case of formatting differences)
    for actual_file in actual_files:
        if file_path in actual_file or actual_file in file_path:
            return True, f"✅ EXISTS (as {actual_file})"

    return False, "❌ MISSING"

def get_file_size(file_path: str) -> str:
    """Get file size if it exists"""
    try:
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            return f"{size:,} bytes"
        return "N/A"
    except Exception as e:
        return f"Error: {e}"

def validate_deliverables():
    """Main validation function"""
    print("🔍 PROTOCOL V3 AUDIT - STEP 1: Deliverables Manifest Check")
    print("=" * 70)

    # Extract files from CLAUDE.md
    promised_files = extract_all_files_from_claude()
    print(f"📋 Files promised in CLAUDE.md: {len(promised_files)}")

    # Get actual files
    actual_files = get_actual_files()
    print(f"📁 Files in repository: {len(actual_files)}")

    print("\n" + "=" * 70)

    # Validate each file
    results = []
    missing_count = 0
    existing_count = 0

    for file_path in promised_files:
        exists, status = validate_file_exists(file_path, actual_files)
        file_size = get_file_size(file_path)

        result = {
            'file': file_path,
            'exists': exists,
            'status': status,
            'size': file_size
        }
        results.append(result)

        if exists:
            existing_count += 1
            print("12")
        else:
            missing_count += 1
            print("12")

    print("\n" + "=" * 70)
    print("📊 SUMMARY:")
    print(f"✅ Existing files: {existing_count}")
    print(f"❌ Missing files: {missing_count}")
    print(".1f")
    # Save detailed results
    output_file = Path("STEP1_DELIVERABLES_VALIDATION.json")
    with open(output_file, 'w') as f:
        json.dump({
            'summary': {
                'total_promised': len(promised_files),
                'existing': existing_count,
                'missing': missing_count,
                'compliance_rate': existing_count / len(promised_files) if promised_files else 0
            },
            'results': results
        }, indent=2)

    print(f"\n📄 Detailed results saved to: {output_file}")

    # Final verdict
    print("\n" + "=" * 70)
    if missing_count == 0:
        print("🎉 STEP 1 PASSED: All promised deliverables exist!")
        print("✅ Ready to proceed to STEP 2: File Inventory Validation")
    else:
        print("⚠️  STEP 1 PARTIAL: Some deliverables missing")
        print("🔍 Proceed to STEP 2 but note missing files for remediation")

    return missing_count == 0

if __name__ == "__main__":
    validate_deliverables()