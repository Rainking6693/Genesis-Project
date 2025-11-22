#!/usr/bin/env python3
"""Verify component library count."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.component_library import COMPONENT_LIBRARY, get_component_count

# Count total
total = get_component_count()
print(f"📦 Total Components: {total}")

# Count by category
categories = {}
for comp_name, comp_data in COMPONENT_LIBRARY.items():
    cat = comp_data.get('category', 'unknown')
    categories[cat] = categories.get(cat, 0) + 1

print(f"\n📊 By Category:")
for cat, cnt in sorted(categories.items()):
    print(f"  {cat:20s}: {cnt:2d} components")

# Verify agent_infrastructure
agent_infra = [name for name, data in COMPONENT_LIBRARY.items() if data.get('category') == 'agent_infrastructure']
print(f"\n🤖 Agent Infrastructure Components ({len(agent_infra)}):")
for comp in sorted(agent_infra):
    print(f"  - {comp}")

# Summary
print(f"\n{'='*60}")
if total == 65:
    print(f"✅ VERIFIED: 65 components as expected")
elif total == 64:
    print(f"⚠️  WARNING: Found 64 components, expected 65")
    print(f"   Cursor claimed 65, but actual count is 64")
else:
    print(f"❌ ERROR: Found {total} components, expected 65")

if len(agent_infra) == 11:
    print(f"✅ VERIFIED: 11 agent_infrastructure components")
else:
    print(f"❌ ERROR: Found {len(agent_infra)} agent_infrastructure, expected 11")

