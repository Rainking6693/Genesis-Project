"""
Script to fix EXCELLENCE_PROMPT placement in agent files
"""

import os
import re

# List of agents that were just updated
AGENTS_TO_FIX = [
    'analyst_agent.py',
    'billing_agent.py',
    'builder_agent.py',
    'builder_agent_enhanced.py',
    'content_agent.py',
    'deploy_agent.py',
    'email_agent.py',
    'emergency_error_specialist_agent.py',
    'finance_agent.py',
    'legal_agent.py',
    'maintenance_agent.py',
    'marketing_agent.py',
    'onboarding_agent.py',
    'qa_agent.py',
    'security_agent.py',
    'seo_agent.py',
    'spec_agent.py',
    'support_agent.py',
]

def fix_excellence_placement(filepath):
    """Fix the placement of EXCELLENCE_PROMPT in an agent file"""

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Check if EXCELLENCE_PROMPT is misplaced (inside docstring or class)
    lines = content.split('\n')

    # Find and extract EXCELLENCE_PROMPT
    excellence_line = None
    excellence_index = -1

    for i, line in enumerate(lines):
        if 'EXCELLENCE_PROMPT = ' in line:
            excellence_line = line
            excellence_index = i
            break

    if excellence_index == -1:
        print(f"  No EXCELLENCE_PROMPT found in {filepath}")
        return False

    # Check if it's already at the top (before first docstring)
    first_docstring_index = -1
    for i, line in enumerate(lines):
        if line.strip().startswith('"""'):
            first_docstring_index = i
            break

    if excellence_index < first_docstring_index:
        print(f"  {filepath} - Already correctly placed")
        return False

    # Remove the misplaced EXCELLENCE_PROMPT
    lines.pop(excellence_index)

    # Also remove any empty line that was added with it
    if excellence_index < len(lines) and lines[excellence_index].strip() == '':
        lines.pop(excellence_index)

    # Insert at the top, right before the first docstring
    if first_docstring_index > 0:
        lines.insert(first_docstring_index, '')
        lines.insert(first_docstring_index, excellence_line)
    else:
        # No docstring found, add at the very top
        lines.insert(0, excellence_line)
        lines.insert(1, '')

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"  Fixed placement in {filepath}")
    return True

# Process all agents
fixed_count = 0
for filename in AGENTS_TO_FIX:
    filepath = os.path.join('agents', filename)
    if os.path.exists(filepath):
        if fix_excellence_placement(filepath):
            fixed_count += 1
    else:
        print(f"  Warning: {filepath} not found")

print(f"\nSummary: Fixed placement in {fixed_count} agents")