"""
Script to add EXCELLENCE_PROMPT to agents that are missing it
"""

import os

# Mapping of agent files to their appropriate excellence prompts
AGENT_EXCELLENCE_MAP = {
    'analyst_agent.py': 'ANALYST',
    'billing_agent.py': 'BILLING',
    'builder_agent.py': 'BUILDER',
    'builder_agent_enhanced.py': 'ENHANCED BUILDER',
    'content_agent.py': 'CONTENT',
    'deploy_agent.py': 'DEPLOY',
    'email_agent.py': 'EMAIL',
    'emergency_error_specialist_agent.py': 'EMERGENCY ERROR SPECIALIST',
    'finance_agent.py': 'FINANCE',
    'legal_agent.py': 'LEGAL',
    'maintenance_agent.py': 'MAINTENANCE',
    'marketing_agent.py': 'MARKETING',
    'onboarding_agent.py': 'ONBOARDING',
    'qa_agent.py': 'QA',
    'security_agent.py': 'SECURITY',
    'seo_agent.py': 'SEO',
    'spec_agent.py': 'SPEC',
    'support_agent.py': 'SUPPORT',
}

def add_excellence_to_agent(filepath, agent_type):
    """Add excellence prompt to an agent file"""

    excellence_prompt = f'EXCELLENCE_PROMPT = "YOU ARE THE WORLD\'S PREMIER {agent_type} AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."\n\n'

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Check if already has excellence prompt
    if 'EXCELLENCE_PROMPT' in content:
        print(f"  Skipping {filepath} - already has EXCELLENCE_PROMPT")
        return False

    # Find where to insert the excellence prompt (after imports, before class/functions)
    lines = content.split('\n')
    insert_index = 0

    # Look for the end of imports
    for i, line in enumerate(lines):
        if line.startswith('"""') and i > 0:
            # Found docstring, insert after it
            # Find the end of the docstring
            for j in range(i+1, len(lines)):
                if '"""' in lines[j]:
                    insert_index = j + 1
                    break
            break

    # If no docstring found, insert after imports
    if insert_index == 0:
        for i, line in enumerate(lines):
            if line and not line.startswith('import') and not line.startswith('from') and not line.startswith('#'):
                insert_index = i
                break

    # Insert the excellence prompt
    lines.insert(insert_index, '')
    lines.insert(insert_index + 1, excellence_prompt.rstrip())

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"  Added EXCELLENCE_PROMPT to {filepath}")
    return True

# Process all agents
updated_count = 0
for filename, agent_type in AGENT_EXCELLENCE_MAP.items():
    filepath = os.path.join('agents', filename)
    if os.path.exists(filepath):
        if add_excellence_to_agent(filepath, agent_type):
            updated_count += 1
    else:
        print(f"  Warning: {filepath} not found")

print(f"\nSummary: Updated {updated_count} agents with EXCELLENCE_PROMPT")