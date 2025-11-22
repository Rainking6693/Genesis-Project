#!/usr/bin/env python3
"""
Fix P1 scenario YAML files by adding missing 'description' field.
Generates descriptions from scenario names and input prompts.
"""

import os
import sys
import yaml
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Scenario files to fix
P1_SCENARIO_FILES = [
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/orchestration_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/qa_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/support_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/legal_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/analyst_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/content_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/security_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/builder_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/deploy_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/spec_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/reflection_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/se_darwin_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/waltzrl_conversation_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/waltzrl_feedback_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/marketing_agent_p1.yaml",
    "/home/genesis/genesis-rebuild/tests/rogue/scenarios/email_agent_p1.yaml",
]


def generate_description(scenario: Dict[str, Any], scenario_id: str) -> str:
    """
    Generate a description for a scenario based on its name and prompt.
    """
    name = scenario.get("name", "")
    prompt = scenario.get("input", {}).get("prompt", "")
    category = scenario.get("category", "unknown")

    # Build description from name and prompt
    description = name

    if prompt and len(prompt) > 0:
        # Extract first sentence from prompt
        prompt_snippet = prompt.split(".")[0].strip()
        if prompt_snippet and prompt_snippet != name:
            description = f"{name}. {prompt_snippet}"

    # Ensure description is reasonable length (50-200 chars)
    if len(description) < 50:
        description = f"{name}. Tests {category} behavior and validation."

    if len(description) > 250:
        description = description[:250].rsplit(" ", 1)[0] + "."

    return description


def fix_scenario_file(filepath: str) -> Tuple[int, int, List[str]]:
    """
    Fix a single scenario file by adding descriptions to all scenarios.
    Returns: (total_scenarios, scenarios_fixed, errors)
    """
    errors = []
    total_scenarios = 0
    scenarios_fixed = 0

    try:
        # Read file
        with open(filepath, 'r') as f:
            content = f.read()

        # Parse YAML
        data = yaml.safe_load(content)

        if not data:
            errors.append(f"File is empty: {filepath}")
            return total_scenarios, scenarios_fixed, errors

        # Find scenarios list - can be at root level or nested
        scenarios = None
        if "scenarios" in data:
            scenarios = data["scenarios"]
        else:
            # Check if it's nested in first key
            root_key = list(data.keys())[0]
            if root_key != "scenarios" and isinstance(data[root_key], dict):
                scenarios = data[root_key].get("scenarios", [])

        if not scenarios:
            errors.append(f"No scenarios found in {filepath}")
            return total_scenarios, scenarios_fixed, errors

        total_scenarios = len(scenarios)

        # Fix each scenario
        for scenario in scenarios:
            if "description" not in scenario:
                scenario_id = scenario.get("id", "unknown")
                description = generate_description(scenario, scenario_id)
                scenario["description"] = description
                scenarios_fixed += 1

        # Write back using custom representer to preserve formatting
        class CustomDumper(yaml.SafeDumper):
            pass

        def str_representer(dumper, data):
            if '\n' in data:
                return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
            return dumper.represent_scalar('tag:yaml.org,2002:str', data)

        CustomDumper.add_representer(str, str_representer)

        # Write file
        with open(filepath, 'w') as f:
            yaml.dump(data, f, Dumper=CustomDumper, default_flow_style=False, sort_keys=False, allow_unicode=True)

    except Exception as e:
        errors.append(f"Error processing {filepath}: {str(e)}")

    return total_scenarios, scenarios_fixed, errors


def main():
    """Main entry point."""
    print("=" * 80)
    print("FIXING P1 SCENARIO YAML FILES - Adding Missing Descriptions")
    print("=" * 80)
    print()

    total_all = 0
    fixed_all = 0
    all_errors = []

    for filepath in P1_SCENARIO_FILES:
        filename = Path(filepath).name

        if not os.path.exists(filepath):
            print(f"SKIP: {filename} (file not found)")
            continue

        total, fixed, errors = fix_scenario_file(filepath)
        total_all += total
        fixed_all += fixed
        all_errors.extend(errors)

        status = "✓" if not errors else "✗"
        print(f"{status} {filename:40} | {fixed:3}/{total:3} scenarios fixed")

        if errors:
            for error in errors:
                print(f"    ERROR: {error}")

    print()
    print("=" * 80)
    print(f"SUMMARY: {fixed_all}/{total_all} scenarios fixed")
    print("=" * 80)

    if all_errors:
        print("\nERRORS FOUND:")
        for error in all_errors:
            print(f"  - {error}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
