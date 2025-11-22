
Smart Genesis Agent Extractor
Automatically detects and copies agent dependencies


import os
import re
import shutil
import argparse
from pathlib import Path
from collections import defaultdict

def extract_imports(file_path):
    """Extract all imports from a Python file"""
    imports = set()

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find all from/import statements
        patterns = [
            r'from\s+(infrastructure\.[^\s]+)\s+import',
            r'import\s+(infrastructure\.[^\s]+)',
            r'from\s+(agents\.[^\s]+)\s+import',
            r'import\s+(agents\.[^\s]+)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, content)
            imports.update(matches)

    except Exception as e:
        print(f"⚠️  Error reading {file_path}: {e}")

    return imports

def get_dependency_tree(file_path, visited=None):
    """Recursively get all dependencies"""
    if visited is None:
        visited = set()

    file_path = Path(file_path)
    if str(file_path) in visited or not file_path.exists():
        return set()

    visited.add(str(file_path))
    all_deps = {file_path}

    imports = extract_imports(file_path)

    for imp in imports:
        # Convert import to file path
        if imp.startswith('infrastructure.'):
            module = imp.replace('infrastructure.', '').split('.')[0]
            module_path = Path(f'infrastructure/{module}.py')
        elif imp.startswith('agents.'):
            module = imp.replace('agents.', '').split('.')[0]
            module_path = Path(f'agents/{module}.py')
        else:
            continue

        if module_path.exists():
            all_deps.update(get_dependency_tree(module_path, visited))

    return all_deps

def extract_agent(agent_name, target_dir, source_dir='.'):
    """Extract agent and all dependencies to target directory"""
    source_dir = Path(source_dir)
    target_dir = Path(target_dir)


    # Find agent file - check both agents/ and infrastructure/ directories
    agent_file = source_dir / 'agents' / f'{agent_name}.py'
    if not agent_file.exists():
        agent_file = source_dir / 'infrastructure' / f'{agent_name}.py'
    if not agent_file.exists():
        agent_file = source_dir / 'agents' / agent_name
        if not agent_file.exists():
            agent_file = source_dir / 'infrastructure' / agent_name
            if not agent_file.exists():
                print(f"❌ Agent not found: {agent_name}")
                return False

    # Find agent file
    agent_file = source_dir / 'agents' / f'{agent_name}.py'
    if not agent_file.exists():
        agent_file = source_dir / 'agents' / agent_name
        if not agent_file.exists():
            print(f"❌ Agent not found: {agent_name}")
            return False


    print(f"🔍 Analyzing dependencies for {agent_name}...")

    # Get all dependencies
    os.chdir(source_dir)
    all_files = get_dependency_tree(agent_file)

    print(f"\n📦 Found {len(all_files)} files to copy:")
    for f in sorted(all_files):
        print(f"   ✅ {f}")

    # Create target structure
    (target_dir / 'agents').mkdir(parents=True, exist_ok=True)
    (target_dir / 'infrastructure').mkdir(parents=True, exist_ok=True)

    # Copy files
    print(f"\n📂 Copying files to {target_dir}...")
    for src_file in all_files:
        src_path = source_dir / src_file
        target_path = target_dir / src_file

        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_path, target_path)
        print(f"   ✅ Copied {src_file}")

    # Copy core infrastructure (always needed)
    core_files = [
        'infrastructure/__init__.py',
        'infrastructure/load_env.py',
        'infrastructure/error_handler.py',
        'infrastructure/local_llm_client.py',
        'agents/__init__.py',
    ]

    print("\n📦 Copying core infrastructure...")
    for core_file in core_files:
        src_path = source_dir / core_file
        if src_path.exists():
            target_path = target_dir / core_file
            target_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, target_path)
            print(f"   ✅ Copied {core_file}")

    # Copy configuration files
    config_files = [
        '.env.example',
        '.gitignore',
    ]

    print("\n⚙️  Copying configuration...")
    for config_file in config_files:
        src_path = source_dir / config_file
        if src_path.exists():
            shutil.copy2(src_path, target_dir / config_file)
            print(f"   ✅ Copied {config_file}")

    # Create minimal requirements.txt
    print("\n📝 Creating requirements.txt...")
    reqs_content = """# Core dependencies
python-dotenv>=1.0.0
pydantic>=2.0.0
requests>=2.31.0

# LLM clients
openai>=1.0.0
anthropic>=0.18.0
google-generativeai>=0.3.0

# Optional dependencies (uncomment if needed)
# fastapi>=0.104.0
# redis>=5.0.0
# pymongo>=4.6.0
# playwright>=1.40.0
"""
    (target_dir / 'requirements.txt').write_text(reqs_content)

    # Create README
    print("\n📝 Creating README...")
    readme_content = f"""# Genesis Agent: {agent_name}

Extracted from Genesis Clean Code autonomous system.

## Setup

```bash
python -m venv venv
source venv/bin/activate  # or venv\\Scripts\\activate on Windows
pip install -r requirements.txt
```

## Configuration

```bash
cp .env.example .env
# Edit .env with your API keys
```

## Usage

```python
from agents.{agent_name} import *

# Your code here
```

## Files Included

- **Agent:** {agent_file.name}
- **Dependencies:** {len(all_files)} files
- **Infrastructure modules:** {len([f for f in all_files if 'infrastructure' in str(f)])}

## Original Source

Genesis Clean Code: https://github.com/Rainking6693/Claude-Clean-Code-Genesis
"""
    (target_dir / 'README.md').write_text(readme_content)

    print("\n✅ Extraction complete!")
    print(f"\n📊 Summary:")
    print(f"   - Total files copied: {len(all_files) + len(core_files)}")
    print(f"   - Agent files: {len([f for f in all_files if 'agents' in str(f)])}")
    print(f"   - Infrastructure files: {len([f for f in all_files if 'infrastructure' in str(f)])}")
    print(f"\n📂 Target directory: {target_dir.absolute()}")
    print(f"\n🚀 Next steps:")
    print(f"   cd {target_dir}")
    print(f"   python -m venv venv")
    print(f"   source venv/bin/activate")
    print(f"   pip install -r requirements.txt")

    return True

def main():
    parser = argparse.ArgumentParser(
        description="Extract Genesis agent and dependencies to new repo"
    )
    parser.add_argument(
        'agent',
        help='Agent name (e.g., builder_agent, qa_agent)'
    )
    parser.add_argument(
        'target',
        help='Target directory for extraction'
    )
    parser.add_argument(
        '--source',
        default='.',
        help='Source Genesis repo directory (default: current directory)'
    )

    args = parser.parse_args()

    extract_agent(args.agent, args.target, args.source)

if __name__ == '__main__':
    main()
