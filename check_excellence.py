import os

agents_dir = 'agents'
missing = []
has_excellence = []

for filename in os.listdir(agents_dir):
    if filename.endswith('.py') and filename != '__init__.py':
        filepath = os.path.join(agents_dir, filename)
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            if 'EXCELLENCE_PROMPT' in content:
                has_excellence.append(filename)
            else:
                missing.append(filename)

print("Agents WITH excellence instructions:")
for agent in sorted(has_excellence):
    print(f"  + {agent}")

print(f"\nAgents MISSING excellence instructions ({len(missing)} total):")
for agent in sorted(missing):
    print(f"  - {agent}")

print(f"\nSummary: {len(has_excellence)} have excellence, {len(missing)} missing")