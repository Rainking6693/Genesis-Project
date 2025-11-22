# THON DEPLOYMENT PLAN - PART 2 OF 3
## Agents 10-17 Full Integration Deployment

**Status:** WAITING FOR SHANE (StandardIntegrationMixin)
**Agent:** Thon
**Assignment:** Deploy ALL 283 integrations to agents 10-17

---

## Target Agents (8 total)

### Agent #10: research_discovery_agent.py
- **Current Class:** No explicit class in first 50 lines (functional style)
- **Integration:** Will need to create ResearchDiscoveryAgent class wrapper
- **Current Integrations:** ~15 (LLMFactory, HopX, x402, MemoryOS, VOIX)
- **Target:** 283/283

### Agent #11: se_darwin_agent.py
- **Current Class:** Not visible in first 50 lines
- **Integration:** Will wrap with StandardIntegrationMixin
- **Current Integrations:** ~20 (SE-Agent, Darwin, HGM, TrajectoryPool, OTEL)
- **Target:** 283/283

### Agent #12: finance_agent.py
- **Current Class:** FinanceAgent (implicit from imports)
- **Integration:** Add StandardIntegrationMixin to inheritance
- **Current Integrations:** 83 (AgentEvolver 76-80, DeepEyesV2 81-83, AP2, x402, OTEL, etc.)
- **Target:** 283/283

### Agent #13: pricing_agent.py
- **Current Class:** PricingAgent (implicit from imports)
- **Integration:** Add StandardIntegrationMixin to inheritance
- **Current Integrations:** 83 (AgentEvolver 76-80, DeepEyesV2 81-83, AP2, x402, OTEL, etc.)
- **Target:** 283/283

### Agent #14: commerce_agent.py
- **Current Class:** CommerceAgent
- **Integration:** Add StandardIntegrationMixin to inheritance
- **Current Integrations:** ~10 (AP2, x402, vendor_cache)
- **Target:** 283/283

### Agent #15: email_agent.py
- **Current Class:** EmailAgent
- **Integration:** Add StandardIntegrationMixin to inheritance
- **Current Integrations:** ~20 (DAAO, TUMIX, AP2, x402, Azure Agent Framework)
- **Target:** 283/283

### Agent #16: domain_name_agent.py
- **Current Class:** DomainNameAgent (implicit)
- **Integration:** Add StandardIntegrationMixin to inheritance
- **Current Integrations:** ~5 (NameCom, AP2, load_env)
- **Target:** 283/283

### Agent #17: legal_agent.py
- **Current Class:** LegalAgent
- **Integration:** Add StandardIntegrationMixin to inheritance
- **Current Integrations:** ~15 (DAAO, TUMIX, DeepSeek-OCR, MemoryOS MongoDB, Azure Agent Framework)
- **Target:** 283/283

---

## Implementation Pattern

### For Agents with Existing Class Definition

```python
# BEFORE
class AgentName:
    def __init__(self, business_id: str = "default"):
        self.business_id = business_id
        # ... existing initialization

# AFTER
from infrastructure.standard_integration_mixin import StandardIntegrationMixin

class AgentName(StandardIntegrationMixin):
    def __init__(self, business_id: str = "default"):
        super().__init__()  # Initialize all 283 integrations
        self.business_id = business_id
        # ... existing initialization
```

### For Agents with Functional Style (research_discovery_agent)

```python
# BEFORE
# Module-level functions

# AFTER
from infrastructure.standard_integration_mixin import StandardIntegrationMixin

class ResearchDiscoveryAgent(StandardIntegrationMixin):
    def __init__(self):
        super().__init__()  # Initialize all 283 integrations
        # Wrap existing functionality

    # Convert module functions to methods
```

---

## Verification Plan

### 1. Import Test (All Agents)
```python
import sys
sys.path.insert(0, r'C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis')

# Test each agent
from agents.research_discovery_agent import ResearchDiscoveryAgent
from agents.se_darwin_agent import SEDarwinAgent
from agents.finance_agent import FinanceAgent
from agents.pricing_agent import PricingAgent
from agents.commerce_agent import CommerceAgent
from agents.email_agent import EmailAgent
from agents.domain_name_agent import DomainNameAgent
from agents.legal_agent import LegalAgent

print("All agents imported successfully!")
```

### 2. Integration Count Verification
```python
# For each agent
agent = AgentName()
integration_count = len([attr for attr in dir(agent) if not attr.startswith('_')])
print(f"{agent.__class__.__name__}: {integration_count} integrations")
# Expected: 283+ for each agent
```

### 3. Coverage Report
```markdown
| Agent | Before | After | Status |
|-------|--------|-------|--------|
| research_discovery_agent | 15 | 283 | ✅ |
| se_darwin_agent | 20 | 283 | ✅ |
| finance_agent | 83 | 283 | ✅ |
| pricing_agent | 83 | 283 | ✅ |
| commerce_agent | 10 | 283 | ✅ |
| email_agent | 20 | 283 | ✅ |
| domain_name_agent | 5 | 283 | ✅ |
| legal_agent | 15 | 283 | ✅ |
```

---

## Coordination with Shane & Nova

### Dependencies
- **BLOCKED BY:** Shane creating `infrastructure/standard_integration_mixin.py`
- **PARALLEL:** Nova deploying to agents 18-25 (no dependencies)
- **NEXT:** After completion, all 25 agents will have 283/283 integrations

### Status Updates
- [ ] Shane completes StandardIntegrationMixin (ETA: monitoring)
- [ ] Thon deploys to agents 10-17 (ETA: 15 minutes after Shane)
- [ ] Nova deploys to agents 18-25 (ETA: 15 minutes after Shane)
- [ ] All three agents report completion with coverage reports

---

## Risk Mitigation

### Potential Issues
1. **Import conflicts:** StandardIntegrationMixin may conflict with existing imports
   - **Mitigation:** Use selective import and namespace resolution
2. **Initialization order:** super().__init__() must run before agent-specific init
   - **Mitigation:** Clear documentation in code comments
3. **Circular imports:** Mixin imports may create circular dependencies
   - **Mitigation:** Use lazy imports in mixin where needed
4. **Functional agents:** research_discovery may resist class wrapping
   - **Mitigation:** Create minimal wrapper preserving existing functions

### Rollback Plan
If integration fails:
1. Git revert to pre-deployment state
2. Report specific errors to coordination team
3. Shane fixes StandardIntegrationMixin
4. Retry deployment

---

## Current Status: WAITING FOR SHANE

**Next Action:** Monitor for creation of `infrastructure/standard_integration_mixin.py`
**ETA to Complete:** 15 minutes after Shane's file is available
**Expected Completion:** 100% success rate (8/8 agents)

---

**Prepared by:** Thon (Ben Agent - Full-Stack Developer)
**Date:** 2025-11-18
**Coordination:** Part 2 of 3 (Shane → Thon → Nova)
