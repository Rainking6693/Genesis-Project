#!/usr/bin/env python3
"""
Genesis Agent Dependency Analyzer
Analyzes what needs to be copied when extracting agents to a new repo
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def extract_imports(file_path):
    """Extract all imports from a Python file"""
    imports = {
        'infrastructure': [],
        'agents': [],
        'scripts': [],
        'pipelines': [],
        'external': []
    }

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find all imports
        import_patterns = [
            r'from\s+(infrastructure\.[^\s]+)\s+import',
            r'import\s+(infrastructure\.[^\s]+)',
            r'from\s+(agents\.[^\s]+)\s+import',
            r'import\s+(agents\.[^\s]+)',
            r'from\s+(scripts\.[^\s]+)\s+import',
            r'from\s+(pipelines\.[^\s]+)\s+import',
        ]

        for pattern in import_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if match.startswith('infrastructure'):
                    imports['infrastructure'].append(match)
                elif match.startswith('agents'):
                    imports['agents'].append(match)
                elif match.startswith('scripts'):
                    imports['scripts'].append(match)
                elif match.startswith('pipelines'):
                    imports['pipelines'].append(match)

    except Exception as e:
        print(f"Error reading {file_path}: {e}")

    return imports

def analyze_agent(agent_file):
    """Analyze dependencies for a single agent"""
    print(f"\n{'='*80}")
    print(f"AGENT: {agent_file}")
    print(f"{'='*80}\n")

    imports = extract_imports(agent_file)

    # Infrastructure dependencies
    if imports['infrastructure']:
        print("📦 INFRASTRUCTURE DEPENDENCIES:")
        for imp in sorted(set(imports['infrastructure'])):
            module = imp.replace('infrastructure.', '').split('.')[0]
            print(f"   ✅ infrastructure/{module}.py")

    # Agent dependencies
    if imports['agents']:
        print("\n👥 AGENT DEPENDENCIES:")
        for imp in sorted(set(imports['agents'])):
            print(f"   ✅ {imp}")

    # Script dependencies
    if imports['scripts']:
        print("\n📜 SCRIPT DEPENDENCIES:")
        for imp in sorted(set(imports['scripts'])):
            print(f"   ✅ {imp}")

    return imports

def get_full_dependency_tree(agent_file, visited=None):
    """Recursively get all dependencies"""
    if visited is None:
        visited = set()

    if agent_file in visited:
        return set()

    visited.add(agent_file)
    all_deps = {agent_file}

    imports = extract_imports(agent_file)

    # Process infrastructure imports
    for imp in imports['infrastructure']:
        module = imp.replace('infrastructure.', '').split('.')[0]
        module_path = Path(f'infrastructure/{module}.py')
        if module_path.exists():
            all_deps.update(get_full_dependency_tree(str(module_path), visited))

    # Process agent imports
    for imp in imports['agents']:
        module = imp.replace('agents.', '').split('.')[0]
        module_path = Path(f'agents/{module}.py')
        if module_path.exists():
            all_deps.update(get_full_dependency_tree(str(module_path), visited))

    return all_deps

# Analyze key agents
agents_to_analyze = [
    'agents/builder_agent.py',
    'agents/qa_agent.py',
    'agents/deploy_agent.py',
    'agents/marketing_agent.py',
    'agents/genesis_meta_agent.py',
]

print("="*80)
print("GENESIS AGENT DEPENDENCY ANALYSIS")
print("="*80)

for agent_file in agents_to_analyze:
    if Path(agent_file).exists():
        analyze_agent(agent_file)
    else:
        print(f"\n⚠️  Agent not found: {agent_file}")

# Common infrastructure modules
print(f"\n\n{'='*80}")
print("CORE INFRASTRUCTURE MODULES (Always Required)")
print(f"{'='*80}\n")

core_modules = [
    'load_env.py',
    'error_handler.py',
    'local_llm_client.py',
    'halo_router.py',
    'htdag_planner.py',
    'a2a_connector.py',
]

for module in core_modules:
    path = Path(f'infrastructure/{module}')
    if path.exists():
        print(f"✅ infrastructure/{module}")
    else:
        print(f"❌ infrastructure/{module} (missing)")

print(f"\n\n{'='*80}")
print("RECOMMENDED EXTRACTION STRATEGY")
print(f"{'='*80}\n")

print("""
OPTION A: MINIMAL EXTRACT (Single Agent)
├── agents/
│   └── your_agent.py
├── infrastructure/
│   ├── load_env.py (required)
│   ├── error_handler.py (required)
│   ├── local_llm_client.py (if agent uses LLMs)
│   └── [specific dependencies from analysis above]
├── .env.example
├── requirements.txt (filtered)
└── README.md

OPTION B: FULL ECOSYSTEM EXTRACT (All Agents)
├── agents/ (all 21 agents)
├── infrastructure/ (all 68 components)
├── scripts/ (orchestration scripts)
├── config/
├── data/ (for persistence)
├── models/ (for LoRA adapters)
├── .env.example
├── requirements.txt
└── README.md
""")

print("\nRun this script with specific agent to see exact dependencies:")
print("   python analyze_deps.py agents/builder_agent.py")
