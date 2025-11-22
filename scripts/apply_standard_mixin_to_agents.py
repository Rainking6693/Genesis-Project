"""
Apply StandardIntegrationMixin to all Genesis agents.
This script modifies agents to inherit from StandardIntegrationMixin,
giving them access to all 283 integrations.
"""

import re
from pathlib import Path

# Define the 8 remaining agents to update (builder_agent already done)
AGENTS_TO_UPDATE = [
    "agents/qa_agent.py",
    "agents/deploy_agent.py",
    "agents/marketing_agent.py",
    "agents/seo_agent.py",
    "agents/content_agent.py",
    "agents/billing_agent.py",
    "agents/support_agent.py",
    "agents/analyst_agent.py",
]

def apply_mixin_to_agent(agent_path: str) -> bool:
    """Apply StandardIntegrationMixin to a single agent file."""
    file_path = Path(agent_path)

    if not file_path.exists():
        print(f"[X] File not found: {agent_path}")
        return False

    # Read the file
    content = file_path.read_text(encoding='utf-8')

    # Check if already has the mixin
    if "StandardIntegrationMixin" in content:
        print(f"[OK] {agent_path} already has StandardIntegrationMixin")
        return True

    # Find the imports section (after docstring, before class definition)
    # Add the mixin import after other infrastructure imports
    import_pattern = r'(from infrastructure\.[^\n]+\n)'

    # Find all infrastructure imports
    imports = re.findall(import_pattern, content)

    if not imports:
        print(f"[WARN] Could not find infrastructure imports in {agent_path}")
        return False

    # Add mixin import after the last infrastructure import
    last_infra_import = imports[-1]
    mixin_import = "\n# Import StandardIntegrationMixin for ALL 283 integrations\nfrom infrastructure.standard_integration_mixin import StandardIntegrationMixin\n"

    content = content.replace(last_infra_import, last_infra_import + mixin_import, 1)

    # Find class definition and add inheritance
    class_pattern = r'(class \w+Agent):'
    match = re.search(class_pattern, content)

    if not match:
        print(f"[WARN] Could not find class definition in {agent_path}")
        return False

    class_def = match.group(1)
    new_class_def = f"{class_def}(StandardIntegrationMixin):"
    content = content.replace(f"{class_def}:", new_class_def, 1)

    # Find __init__ method and add super().__init__() call
    # Look for the first line after def __init__(...):
    init_pattern = r'(def __init__\([^)]+\):)\n(\s+)'
    init_match = re.search(init_pattern, content)

    if not init_match:
        print(f"[WARN] Could not find __init__ method in {agent_path}")
        return False

    indent = init_match.group(2)
    super_call = f"{indent}super().__init__()  # Initialize StandardIntegrationMixin with all 283 integrations\n"

    content = content.replace(
        f"{init_match.group(1)}\n{indent}",
        f"{init_match.group(1)}\n{super_call}{indent}",
        1
    )

    # Write the updated content
    file_path.write_text(content, encoding='utf-8')
    print(f"[OK] Updated {agent_path}")
    return True

def main():
    print("=" * 60)
    print("APPLYING StandardIntegrationMixin TO ALL AGENTS")
    print("=" * 60)
    print()

    success_count = 0
    failed_count = 0

    for agent_path in AGENTS_TO_UPDATE:
        try:
            if apply_mixin_to_agent(agent_path):
                success_count += 1
            else:
                failed_count += 1
        except Exception as e:
            print(f"[X] Error updating {agent_path}: {e}")
            failed_count += 1
        print()

    print("=" * 60)
    print(f"SUMMARY: {success_count} agents updated, {failed_count} failed")
    print("=" * 60)

    # Test import of each agent
    print("\nTESTING AGENT IMPORTS...")
    print("=" * 60)

    for agent_path in AGENTS_TO_UPDATE:
        agent_name = Path(agent_path).stem
        module_path = agent_path.replace("/", ".").replace(".py", "")

        try:
            exec(f"from {module_path} import *")
            print(f"[OK] {agent_name} imports successfully")
        except Exception as e:
            print(f"[X] {agent_name} import failed: {e}")

if __name__ == "__main__":
    main()
