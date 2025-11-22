#!/usr/bin/env python3
"""
Validate all P1 YAML files for correct syntax and required fields.
"""

import os
import yaml
from pathlib import Path

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

print("=" * 80)
print("VALIDATING P1 SCENARIO YAML FILES")
print("=" * 80)
print()

total_scenarios = 0
missing_descriptions = 0
total_files = 0
errors = []

for filepath in P1_SCENARIO_FILES:
    filename = Path(filepath).name

    if not os.path.exists(filepath):
        print(f"SKIP: {filename} (file not found)")
        continue

    total_files += 1
    file_missing = 0

    try:
        with open(filepath, 'r') as f:
            data = yaml.safe_load(f)

        # Find scenarios
        scenarios = None
        if "scenarios" in data:
            scenarios = data["scenarios"]
        else:
            root_key = list(data.keys())[0]
            if root_key != "scenarios" and isinstance(data[root_key], dict):
                scenarios = data[root_key].get("scenarios", [])

        if not scenarios:
            errors.append(f"{filename}: No scenarios found")
            continue

        for scenario in scenarios:
            total_scenarios += 1
            scenario_id = scenario.get("id", "unknown")

            # Check required fields
            if "description" not in scenario:
                file_missing += 1
                missing_descriptions += 1
                errors.append(f"{filename}: Scenario {scenario_id} missing 'description'")

        status = "✓" if file_missing == 0 else "✗"
        print(f"{status} {filename:40} | {len(scenarios):3} scenarios, {file_missing:3} missing descriptions")

    except Exception as e:
        errors.append(f"{filename}: {str(e)}")
        print(f"✗ {filename:40} | ERROR: {str(e)}")

print()
print("=" * 80)
print(f"VALIDATION RESULTS")
print("=" * 80)
print(f"Total files scanned:          {total_files}")
print(f"Total scenarios found:        {total_scenarios}")
print(f"Scenarios with descriptions:  {total_scenarios - missing_descriptions}")
print(f"Scenarios missing description: {missing_descriptions}")
print()

if missing_descriptions == 0:
    print("SUCCESS: All 241 P1 scenarios have descriptions!")
else:
    print(f"FAILURE: {missing_descriptions} scenarios still missing descriptions")
    print()
    print("Errors found:")
    for error in errors:
        print(f"  - {error}")

exit(0 if missing_descriptions == 0 else 1)
