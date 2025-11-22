# Middleware Quick Reference Guide

**For:** Developers using Genesis middleware system
**Last Updated:** November 8, 2025

---

## 🚀 Quick Start (30 seconds)

```python
from infrastructure.halo_router import HALORouter

# 1. Create router with default middleware (Policy + Capability + ToolRM)
router = HALORouter()

# 2. Execute tool with middleware protection
result = await router.execute_with_middleware(
    tool_name="Read",
    agent_name="builder_agent",
    arguments={"file_path": "example.py"}
)
```

**That's it!** Middleware automatically:
- ✅ Validates policy cards
- ✅ Checks capabilities
- ✅ Scores execution quality
- ✅ Logs to reasoning bank

---

## 📦 Three Middleware Classes

### 1. PolicyCardMiddleware
**Purpose:** Enforce policy cards (access control, rate limits, safety)

```python
from infrastructure.middleware import PolicyCardMiddleware

middleware = PolicyCardMiddleware(policy_dir=".policy_cards")

# Get statistics
stats = middleware.get_statistics()
# {"total_agents": 5, "total_calls": 127}
```

**What it checks:**
- Tool allowed/denied lists
- Rate limits (calls per hour)
- Safety constraints (max tokens, execution time)
- Compliance requirements (audit logging)

---

### 2. CapabilityMapMiddleware
**Purpose:** Validate agent capabilities before tool execution

```python
from infrastructure.middleware import CapabilityMapMiddleware

middleware = CapabilityMapMiddleware(maps_dir="maps/capabilities")

# Add capability
middleware.add_tool_capability("CustomTool", "custom_capability")
middleware.add_agent_capability("custom_agent", "custom_capability")

# Get statistics
stats = middleware.get_statistics()
# {"total_agents": 3, "total_usage": 45}
```

**What it checks:**
- Does agent have capability for this tool?
- Are argument types correct?
- Are required fields present?

---

### 3. ToolRMMiddleware
**Purpose:** Multi-factor quality scoring with reflection

```python
from infrastructure.middleware import ToolRMMiddleware

middleware = ToolRMMiddleware(
    reasoning_bank_dir="data/reasoning_bank",
    enable_reflection=True
)

# Get tool statistics
stats = middleware.get_tool_statistics("Read")
# {"total_calls": 45, "avg_score": 0.87}

# Get reflection queue (low-quality executions)
queue = middleware.get_reflection_queue()
```

**What it scores:**
- **Correctness (40%):** Did it succeed?
- **Latency (20%):** Was it fast? (<1s = best)
- **Completeness (20%):** Has all expected data?
- **Accuracy (20%):** Is data valid?

**Quality Levels:**
- Excellent: ≥0.9
- Good: ≥0.7
- Acceptable: ≥0.5
- Poor: <0.5 (triggers reflection)

---

## 🔧 Common Use Cases

### Use Case 1: Default Setup (Recommended)

```python
from infrastructure.halo_router import HALORouter

# Auto-loads all 3 middleware
router = HALORouter()
```

---

### Use Case 2: Custom Middleware Stack

```python
from infrastructure.halo_router import HALORouter
from infrastructure.middleware import PolicyCardMiddleware, ToolRMMiddleware

# Only use Policy + ToolRM (skip Capability checks)
router = HALORouter(middlewares=[
    PolicyCardMiddleware(),
    ToolRMMiddleware()
])
```

---

### Use Case 3: Disable All Middleware

```python
from infrastructure.halo_router import HALORouter

# No middleware
router = HALORouter(middlewares=[])
```

---

### Use Case 4: Execute Tool with Middleware

```python
import asyncio
from infrastructure.halo_router import HALORouter

router = HALORouter()

async def execute():
    result = await router.execute_with_middleware(
        tool_name="Bash",
        agent_name="builder_agent",
        arguments={"command": "pytest tests/"},
        context={"estimated_execution_time_seconds": 10}
    )
    return result

result = asyncio.run(execute())
```

---

### Use Case 5: Get Middleware Statistics

```python
from infrastructure.halo_router import HALORouter

router = HALORouter()

# Get policy statistics
policy_stats = router.middlewares[0].get_statistics()
print(f"Total calls: {policy_stats['total_calls']}")

# Get capability statistics
capability_stats = router.middlewares[1].get_statistics()
print(f"Total usage: {capability_stats['total_usage']}")

# Get ToolRM statistics
toolrm_stats = router.middlewares[2].get_tool_statistics()
print(f"Average score: {toolrm_stats['Read']['avg_score']:.2f}")
```

---

## 📁 File Locations

```
├── infrastructure/
│   ├── middleware/
│   │   ├── __init__.py                  - Exports
│   │   ├── base.py                      - Base classes
│   │   ├── policy_middleware.py         - Policy enforcement
│   │   ├── capability_middleware.py     - Capability validation
│   │   └── toolrm_middleware.py         - Quality scoring
│   │
│   └── halo_router.py                   - HALO router (middleware-enabled)
│
├── .policy_cards/                       - Policy card YAML files (optional)
├── maps/capabilities/                   - Capability maps (auto-generated)
│   ├── tool_capabilities.json           - Tool -> Capability mappings
│   └── agent_capabilities.json          - Agent -> Capabilities
│
└── data/reasoning_bank/                 - ToolRM logs (auto-created)
    ├── tool_executions.jsonl            - Execution history
    └── reflection_queue.jsonl           - Low-quality executions
```

---

## 🎯 Default Capability Maps

### Tool Capabilities (16 tools)

| Tool | Required Capability |
|------|---------------------|
| Read | file_read |
| Write | file_write |
| Edit | file_edit |
| Glob | file_search |
| Bash | code_execution |
| NotebookEdit | notebook_edit |
| pytest | test_execution |
| WebFetch | web_access |
| WebSearch | web_search |
| ChatCompletion | llm_inference |
| DatabaseQuery | database_read |
| Deploy | deployment |
| DockerBuild | container_management |

### Agent Capabilities (16 agents)

| Agent | Capabilities |
|-------|--------------|
| builder_agent | file_read, file_write, file_edit, code_execution, test_execution |
| qa_agent | file_read, test_execution, code_execution, web_access |
| deploy_agent | file_read, code_execution, deployment, container_management |
| darwin_agent | file_read, file_write, file_edit, code_execution, test_execution, llm_inference |
| security_agent | file_read, code_execution, web_access, database_read |

See `maps/capabilities/agent_capabilities.json` for full list.

---

## 🐛 Troubleshooting

### Issue: "No policy card for agent"

**Cause:** Agent doesn't have a policy card YAML file

**Solution:**
1. Create `.policy_cards/` directory
2. Add YAML file for agent (see existing policy cards)
3. Or ignore warning - middleware allows by default

---

### Issue: "Agent lacks capability"

**Cause:** Agent trying to use tool it doesn't have capability for

**Solution:**
```python
from infrastructure.middleware import CapabilityMapMiddleware

middleware = CapabilityMapMiddleware()
middleware.add_agent_capability("agent_name", "required_capability")
```

---

### Issue: "Tool RM score always low"

**Cause:** Tool execution is slow or returns incomplete data

**Solution:**
1. Check tool latency (should be <1s for best score)
2. Check result completeness (should return expected fields)
3. Review reasoning bank logs: `data/reasoning_bank/tool_executions.jsonl`

---

## 📊 Monitoring

### View Execution History

```python
from infrastructure.middleware import ToolRMMiddleware

toolrm = ToolRMMiddleware()

# Get recent executions
recent = toolrm.get_recent_executions(limit=10, agent_name="builder_agent")

for exec in recent:
    print(f"{exec['tool']}: {exec['score']:.2f} ({exec['quality_level']})")
```

### View Reflection Queue

```python
from infrastructure.middleware import ToolRMMiddleware

toolrm = ToolRMMiddleware()

# Get pending reflections
queue = toolrm.get_reflection_queue()

for item in queue:
    print(f"Agent: {item['agent']}, Tool: {item['tool']}, Score: {item['score']:.2f}")
```

---

## ⚡ Performance

**Middleware Overhead:**
- PolicyCardMiddleware: ~5ms
- CapabilityMapMiddleware: ~3ms
- ToolRMMiddleware: ~2ms
- **Total: ~10ms (<1% for typical tools)**

**Recommended:** Always enable all middleware in production.

---

## 🔗 API Reference

### PolicyCardMiddleware

```python
PolicyCardMiddleware(policy_dir: str = ".policy_cards")

# Methods
.get_statistics() -> Dict
.reset_statistics() -> None
```

### CapabilityMapMiddleware

```python
CapabilityMapMiddleware(maps_dir: str = "maps/capabilities")

# Methods
.add_tool_capability(tool_name: str, capability: str) -> None
.add_agent_capability(agent_name: str, capability: str) -> None
.remove_agent_capability(agent_name: str, capability: str) -> None
.get_statistics() -> Dict
.reset_statistics() -> None
```

### ToolRMMiddleware

```python
ToolRMMiddleware(
    reasoning_bank_dir: str = "data/reasoning_bank",
    enable_reflection: bool = True
)

# Methods
.get_tool_statistics(tool_name: Optional[str] = None) -> Dict
.get_recent_executions(limit: int = 100, agent_name: Optional[str] = None) -> List
.get_reflection_queue() -> List
.clear_reflection_queue() -> None
.reset_statistics() -> None
```

### HALORouter

```python
HALORouter(middlewares: Optional[List] = None)

# Methods
async .execute_with_middleware(
    tool_name: str,
    agent_name: str,
    arguments: Dict[str, Any],
    context: Optional[Dict[str, Any]] = None,
    executor = None
) -> Any
```

---

## 📚 Related Documentation

- **MIDDLEWARE_IMPLEMENTATION_SUMMARY.md** - Full implementation details
- **INTEGRATION_ROADMAP_DEEPAGENTS_SKYVERN_ES.md** - Original task spec
- **infrastructure/middleware/base.py** - Middleware base classes

---

**Questions?** Check the full summary document or review the source code.

**Last Updated:** November 8, 2025
