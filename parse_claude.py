#!/usr/bin/env python3
import re
from pathlib import Path

def extract_infrastructure_files():
    """Extract all infrastructure/*.py files mentioned in CLAUDE.md"""
    claude_file = Path("CLAUDE.md")

    if not claude_file.exists():
        print("CLAUDE.md not found")
        return []

    with open(claude_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern to match infrastructure/*.py files
    pattern = r'infrastructure/([^\s]+\.py)'
    matches = re.findall(pattern, content)

    # Clean up the matches and make unique
    files = []
    for match in matches:
        # Remove any trailing punctuation or formatting
        clean_match = re.sub(r'[()`\[\]]*$', '', match)
        files.append(f"infrastructure/{clean_match}")

    unique_files = sorted(list(set(files)))
    return unique_files

if __name__ == "__main__":
    files = extract_infrastructure_files()
    print("Infrastructure files found in CLAUDE.md:")
    for file in files:
        print(f"  {file}")

    print(f"\nTotal unique infrastructure files: {len(files)}")