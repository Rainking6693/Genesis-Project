#!/usr/bin/env python3
"""
Fix eval() RCE Vulnerabilities in DeepSeek-OCR

This script automatically replaces unsafe eval() calls with safe ast.literal_eval()
in DeepSeek-OCR codebase to mitigate CVSS 8.6 RCE vulnerability.

Vulnerability: eval() allows arbitrary code execution via malicious OCR outputs
Mitigation: ast.literal_eval() only evaluates Python literals (safe)

Author: Cursor (Testing & Documentation Lead)
Date: November 4, 2025
Based on: Sentinel's security assessment (SECURITY_ASSESSMENT_SAE_PII_WEEK2.md)
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

# Files to fix (identified by Sentinel's security assessment)
FILES_TO_FIX = [
    "DeepSeek-OCR/DeepSeek-OCR-master/DeepSeek-OCR-vllm/run_dpsk_ocr_image.py",
    "DeepSeek-OCR/DeepSeek-OCR-master/DeepSeek-OCR-hf/run_dpsk_ocr.py",
    "DeepSeek-OCR/DeepSeek-OCR-master/DeepSeek-OCR-vllm/run_dpsk_ocr_pdf.py",
]


def add_ast_import(content: str) -> str:
    """
    Add 'import ast' to file if not already present.
    
    Args:
        content: File content
        
    Returns:
        Modified content with ast import
    """
    # Check if ast is already imported
    if re.search(r'^import ast\s*$', content, re.MULTILINE):
        return content
    
    if re.search(r'^from ast import', content, re.MULTILINE):
        return content
    
    # Find first import statement
    import_match = re.search(r'^import ', content, re.MULTILINE)
    if import_match:
        # Insert 'import ast' before first import
        insert_pos = import_match.start()
        return content[:insert_pos] + "import ast\n" + content[insert_pos:]
    
    # No imports found, add at top after docstring/comments
    lines = content.split('\n')
    insert_line = 0
    
    # Skip shebang, docstrings, and comments
    in_docstring = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Skip shebang
        if i == 0 and stripped.startswith('#!'):
            insert_line = i + 1
            continue
        
        # Track docstrings
        if stripped.startswith('"""') or stripped.startswith("'''"):
            if in_docstring:
                in_docstring = False
                insert_line = i + 1
            else:
                in_docstring = True
            continue
        
        # Skip comments
        if stripped.startswith('#'):
            insert_line = i + 1
            continue
        
        # Found first non-comment/docstring line
        if not in_docstring and stripped:
            break
    
    lines.insert(insert_line, "import ast")
    return '\n'.join(lines)


def replace_eval_with_literal_eval(content: str) -> Tuple[str, int]:
    """
    Replace eval() calls with ast.literal_eval() with error handling.

    Only replaces standalone eval() calls, NOT method calls like model.eval()

    Args:
        content: File content

    Returns:
        Tuple of (modified content, number of replacements)
    """
    # Pattern to match eval() calls
    # Negative lookbehind to exclude method calls like model.eval()
    # Matches: eval(expression) but NOT object.eval()
    pattern = r'(?<!\.)(?<!\w)\beval\s*\('

    replacements = 0
    lines = content.split('\n')
    modified_lines = []

    for line_num, line in enumerate(lines, 1):
        if re.search(pattern, line):
            # Replace eval( with ast.literal_eval(
            # Use negative lookbehind to avoid replacing method calls
            modified_line = re.sub(r'(?<!\.)(?<!\w)\beval\s*\(', 'ast.literal_eval(', line)

            # Only count as replacement if line actually changed
            if modified_line != line:
                modified_lines.append(modified_line)
                replacements += 1
                print(f"  Line {line_num}: {line.strip()}")
                print(f"  →         {modified_line.strip()}")
            else:
                modified_lines.append(line)
        else:
            modified_lines.append(line)

    return '\n'.join(modified_lines), replacements


def fix_file(file_path: Path, dry_run: bool = False) -> Tuple[bool, int]:
    """
    Fix eval() vulnerabilities in a single file.
    
    Args:
        file_path: Path to file to fix
        dry_run: If True, don't write changes (just report)
        
    Returns:
        Tuple of (success, number of replacements)
    """
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return False, 0
    
    print(f"\n📄 Processing: {file_path}")
    
    # Read file
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False, 0
    
    # Add ast import
    content = add_ast_import(content)
    
    # Replace eval() with ast.literal_eval()
    modified_content, replacements = replace_eval_with_literal_eval(content)
    
    if replacements == 0:
        print(f"✅ No eval() calls found (already fixed or not present)")
        return True, 0
    
    print(f"\n✅ Found {replacements} eval() calls to replace")
    
    if dry_run:
        print(f"🔍 DRY RUN: Would replace {replacements} eval() calls")
        return True, replacements
    
    # Write modified content
    try:
        # Backup original file
        backup_path = file_path.with_suffix(file_path.suffix + '.backup')
        file_path.rename(backup_path)
        print(f"💾 Backup created: {backup_path}")
        
        # Write fixed file
        file_path.write_text(modified_content, encoding='utf-8')
        print(f"✅ Fixed file written: {file_path}")
        
        return True, replacements
    except Exception as e:
        print(f"❌ Error writing file: {e}")
        # Restore backup if write failed
        if backup_path.exists():
            backup_path.rename(file_path)
            print(f"🔄 Restored from backup")
        return False, 0


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Fix eval() RCE vulnerabilities in DeepSeek-OCR",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Dry run (show what would be changed)
    python scripts/fix_eval_rce_vulnerabilities.py --dry-run
    
    # Apply fixes
    python scripts/fix_eval_rce_vulnerabilities.py
    
    # Fix specific file
    python scripts/fix_eval_rce_vulnerabilities.py --file DeepSeek-OCR/.../run_dpsk_ocr_image.py
        """
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without modifying files"
    )
    
    parser.add_argument(
        "--file",
        type=str,
        help="Fix specific file instead of all known files"
    )
    
    args = parser.parse_args()
    
    # Determine files to fix
    if args.file:
        files_to_fix = [Path(args.file)]
    else:
        # Get repo root
        repo_root = Path(__file__).resolve().parents[1]
        files_to_fix = [repo_root / f for f in FILES_TO_FIX]
    
    print("="*80)
    print("EVAL() RCE VULNERABILITY FIX")
    print("="*80)
    print(f"\nVulnerability: CVSS 8.6 (HIGH) - Remote Code Execution via eval()")
    print(f"Mitigation: Replace eval() with ast.literal_eval()")
    print(f"Files to fix: {len(files_to_fix)}")
    
    if args.dry_run:
        print(f"\n🔍 DRY RUN MODE - No files will be modified")
    
    print("\n" + "="*80 + "\n")
    
    # Fix each file
    total_replacements = 0
    successful_fixes = 0
    
    for file_path in files_to_fix:
        success, replacements = fix_file(file_path, dry_run=args.dry_run)
        if success:
            successful_fixes += 1
            total_replacements += replacements
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"\nFiles processed: {len(files_to_fix)}")
    print(f"Successful fixes: {successful_fixes}")
    print(f"Total eval() replacements: {total_replacements}")
    
    if args.dry_run:
        print(f"\n🔍 DRY RUN COMPLETE - Run without --dry-run to apply fixes")
    else:
        print(f"\n✅ FIXES APPLIED")
        print(f"\n📋 Next steps:")
        print(f"   1. Test OCR functionality: python DeepSeek-OCR/.../run_dpsk_ocr_image.py")
        print(f"   2. Run fuzz tests with malicious inputs")
        print(f"   3. Verify no regressions in OCR accuracy")
        print(f"   4. Commit changes: git add . && git commit -m 'fix: Replace eval() with ast.literal_eval() (CVSS 8.6 RCE)'")
    
    print("\n" + "="*80 + "\n")
    
    # Exit code
    if successful_fixes == len(files_to_fix):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

