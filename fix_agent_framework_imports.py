"""
Fix missing agent_framework imports in all agent files
"""
import os
import re

def fix_file(filepath):
    """Fix agent_framework imports in a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Comment out agent_framework imports
    patterns = [
        (r'^from agent_framework import .*$', r'# \g<0>  # Commented out - missing module'),
        (r'^from agent_framework\..*$', r'# \g<0>  # Commented out - missing module'),
        (r'^from azure\.identity\.aio import .*$', r'# \g<0>  # Commented out - missing module'),
        (r'^setup_observability\(.*\)$', r'# \g<0>  # Commented out - missing import'),
    ]

    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
        return True
    return False

def main():
    agents_dir = r"C:\Users\Administrator\Desktop\Genesis-Project\agents"

    agent_files = [
        'builder_agent.py',
        'support_agent.py',
        'spec_agent.py',
        'seo_agent.py',
        'security_agent.py',
        'qa_agent.py',
        'onboarding_agent.py',
        'maintenance_agent.py',
        'legal_agent.py',
        'email_agent.py',
        'deploy_agent.py',
        'content_agent.py',
        'billing_agent.py',
        'analyst_agent.py',
    ]

    fixed_count = 0
    for filename in agent_files:
        filepath = os.path.join(agents_dir, filename)
        if os.path.exists(filepath):
            if fix_file(filepath):
                fixed_count += 1

    print(f"\nFixed {fixed_count} files")

if __name__ == "__main__":
    main()