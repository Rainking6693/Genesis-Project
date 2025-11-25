# CLAUDE.md

Genesis autonomous business operating system guidance for Claude Code.

## Context7 MCP - CRITICAL INSTRUCTION

**ALWAYS use Context7 MCP automatically when you need:**
- Code generation or implementation
- Setup or configuration steps
- Library/API documentation
- Framework-specific patterns

**You should automatically:**
1. Resolve library IDs using Context7 tools
2. Fetch up-to-date documentation via Context7
3. Include version-specific code examples from Context7

**Do NOT wait for explicit user requests** - use Context7 proactively whenever generating code or referencing libraries.

**Installation:** Already configured in `~/.claude/mcp_settings.json`
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

## Project Overview

**Genesis** is a fully autonomous business operating system using 79 integrated AI systems. Generates, builds, deploys, monitors, and manages businesses end-to-end with NO HUMAN INTERACTION except bills >$100.

**Lifecycle:** Generate → Build (21 agents) → Deploy (Railway/GitHub Pages) → Track (Stripe/analytics) → Evaluate (30-day cycle) → Shutdown if score <50

**Key Tech:** 79 systems across 6 layers, A2A protocol, Evolution Strategies training, 26 specialized agents

## Development Commands

### Testing
```bash
# Night 1 (15min validation)
RUN_NIGHT1_TESTS.bat

# Night 2 (30-60min production)
RUN_NIGHT2_TESTS.bat

# Full agent test (1 hour, 100+ businesses)
RUN_1HOUR_FULL_AGENT_TEST.bat

# Individual commands
python scripts\nightly_es_training.py --iterations 1 --population 4 --dry-run
python scripts\autonomous_fully_integrated.py --count 1 --min-score 70.0
python scripts\autonomous_scheduler.py
python scripts\verify_all_systems.py
```

### Autonomous Operation
```bash
# Create 3 businesses
RUN_AUTONOMOUS.bat

# Continuous mode (1 business/day)
python scripts\autonomous_business_orchestrator.py --continuous

# Evaluate only
python scripts\autonomous_business_orchestrator.py --evaluate-only
```

### Services
```bash
# A2A Service (Port 8000)
python a2a_fastapi.py

# Dashboard (recommended: Next.js)
START_DASHBOARD_API.bat  # Terminal 1
cd genesis-dashboard && npm run dev  # Terminal 2
# Open: http://localhost:3000

# Production: https://genesis-dashboard-mnm4yrbrf-ben-stones-projects-ff17da1d.vercel.app
```

### Deployment
```bash
# Deploy (Railway default, no Vercel)
python scripts/simple_deploy.py --path businesses/fully_integrated/saas/my-app
python scripts/simple_deploy.py --path [path] --platform github-pages
python scripts/simple_deploy.py --path [path] --platform render

# Env vars required
GENESIS_ENV=production
A2A_API_KEY=<token>
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
DEFAULT_DEPLOY_PLATFORM=railway
```

### Logs & Monitoring
```bash
# View logs
type logs\genesis_agent.log
type logs\infrastructure.log
Get-Content logs\genesis_agent.log -Wait -Tail 20  # PowerShell

# Metrics
type metrics\es_training_metrics.json
```

## Architecture

### System Flow
```
User/Scheduler → GenesisMetaAgent → HTDAG → HALO → AOP → DAAO → 21 Agents → SE-Darwin + TrajectoryPool → Business Output
```

### Core Layers

**Layer 1 - Orchestration (7):**
HTDAG (task decomposition), HALO (agent routing), AOP (validation), DAAO (cost optimization), Policy Cards, Capability Maps, Genesis Orchestrator V2

**Layer 2 - Evolution (11):**
SE-Darwin, TrajectoryPool, SICA, SPICE (Challenger/Reasoner/DrGRPO), Socratic-Zero, ADP, Revision/Recombination/Refinement Operators

**Layer 3 - Communication (2):**
A2A Protocol, OpenEnv

**Layer 5 - Swarm (2):**
Inclusive Fitness, PSO Optimizer

**Layer 6 - Memory (6):**
Memento, CaseBank, TEI Embeddings, ReasoningBank, Memory×Router, LangGraph Store

**Advanced (34):**
WaltzRL, SGLang, vLLM, HGM Oracle, Computer Use, WebVoyager, Agent-S, Pipelex, SLICE, TUMIX, AgentGit, MAPE-K, ToolRM, FlowMesh, etc.

**Monitoring (4):**
Business Monitor, OTEL, Prometheus, Grafana

### Evolution Strategies Training

ES pipeline: Load adapter → Generate population → Evaluate fitness → Select elites → Update adapter → Archive

Files: `scripts/nightly_es_training.py`, `infrastructure/evolution_strategies/model_loader.py`, `infrastructure/evolution_strategies/eval_sandbox.py`

Security: All evaluations run in sandbox with resource limits

### Business Generation Flow

Specification → HTDAG decomposition → HALO routing → AOP validation → DAAO optimization → Generation → HGM grading → TrajectoryPool learning

Output: `businesses/fully_integrated/[type]/[name]/` with README, requirements, package.json, src/

### A2A Service

REST API exposing 21 agents on port 8000. Features: API key auth, CORS, OpenTelemetry, circuit breaker, rate limiting, TOON protocol (97% token reduction), lazy loading (<5s startup)

Endpoints: `/health`, `/agents`, `/invoke`, `/docs`

## Platform Considerations

**Windows:** Use `\` in batch scripts, set `PYTHONPATH=%CD%;%PYTHONPATH%`, logs in `logs\`

**Required dirs:** `logs/`, `metrics/`, `models/lora_adapters/current/`, `models/lora_adapters/archive/`, `fixtures/`

## Key Integration Points

### Adding Agent
1. Define in `infrastructure/halo_router.py` capability registry
2. Add routing rules
3. Implement in `infrastructure/[agent]_agent.py`
4. Register in `infrastructure/a2a_connector.py`

### Adding Component
1. Create `infrastructure/[component].py`
2. Use `load_genesis_env()` pattern
3. Add error handling via `infrastructure/error_handler.py`
4. Integrate with HTDAG/HALO

### ES Training Config
`ESConfig` in `scripts/nightly_es_training.py`: population 8, lr 0.001, sigma 0.01, sandbox in `eval_sandbox.py`

### Business Types
Defined in `infrastructure/genesis_business_types.py`: SaaS, marketplace, content, analytics, automation, education, social, ecommerce, AI, fintech

## Common Patterns

**Error Handling:**
```python
from infrastructure.error_handler import retry_with_backoff, log_error_with_context

@retry_with_backoff(max_retries=3)
async def risky_op():
    try:
        # operation
    except Exception as e:
        log_error_with_context(logger, e, context=ErrorContext(...))
```

**Environment:**
```python
from infrastructure.load_env import load_genesis_env
load_genesis_env()
```

**Agent Routing:**
```python
from infrastructure.halo_router import HALORouter
router = HALORouter.create_with_integrations()
agent = router.route_task(task_type="deploy", requirements={"platform": "cloud"})
```

**LLM Client:**
```python
from infrastructure.local_llm_client import get_local_llm_client
client = get_local_llm_client()
response = await client.complete(prompt, max_tokens=1000)
```

## Security

- **VULN-001:** Input validation in HTDAGPlanner (max lengths, sanitization)
- **VULN-002:** Agent authentication via AgentAuthRegistry
- **VULN-003:** Task decomposition limited to MAX_RECURSION_DEPTH=5
- Never commit `.env`, use `secrets.token_urlsafe(32)` for A2A keys
- ES evaluations sandboxed with resource limits

## Debugging

**ES failures:** Check Python 3.12.4, verify `models\lora_adapters\current\`, run `--dry-run`

**Business gen:** `type logs\genesis_agent.log | findstr ERROR`, verify infrastructure loads

**A2A:** `curl http://localhost:8000/health`, check auth headers

**Dependencies:** `pip install -r requirements.txt`

## Latest Integrations

### #73: Domain Name Agent
Status: Production-ready (82/100 audit score)
- Auto domain generation with 5-factor scoring
- Name.com API integration
- GitHub Pages DNS auto-config
- $50 monthly threshold
Files: `agents/domain_name_agent.py`, `infrastructure/namecom_client.py`

### #74: VOIX Framework
10-25x faster web automation vs Skyvern (50-200ms discovery, 99% success)
Files: `infrastructure/browser_automation/voix_detector.py`, `voix_executor.py`, `hybrid_automation.py`

### #76: MCP Client - Universal Tool Access
Priority: CRITICAL, Annual savings: $40-50K
- 50+ MCP servers without custom adapters
- `infrastructure/mcp_client.py` (421 lines)
- Auto discovery, schema validation, circuit breaker
- StandardIntegrationMixin: `self.mcp_client`

### #77: Type-Safe Action Schemas
Priority: HIGH, Annual savings: $60-80K
- Pydantic validation for all agent actions
- 60% reduction in runtime errors
- `infrastructure/type_safe_schemas.py` (689 lines)
- StandardIntegrationMixin: `self.type_safe_schemas`

### #78: Composable Context System
Priority: HIGH, Annual savings: $30-40K
- Isolated contexts with dual-tier memory (persistent + working)
- 50% context efficiency improvement
- `infrastructure/context_system.py` (512 lines)
- StandardIntegrationMixin: `self.context_system`

### #79: M-GRPO Trainer - Multi-Agent RL
Priority: MEDIUM, Annual savings: $20-30K
- Group-level policy optimization
- 20-30% multi-agent performance improvement
- `infrastructure/evolution_strategies/mgrpo_trainer.py` (538 lines)
- Complements ES training

**Combined #76-79:** 2,160 LOC, $150-200K annual savings, 4-6 month break-even

## Future Roadmap

### Integration #69: DreamGym (Priority: CRITICAL)
- Synthetic RL for 5x training efficiency
- ES training 30min → 6-10min/cycle
- 80% data reduction, +30% success rate
- Annual savings: ~$6K

### Integration #70: Memori (Priority: CRITICAL)
- SQL-native memory replacing vector DBs
- 80-90% cost reduction ($10K → $1-2K per 10M queries)
- 2-4x faster queries, 94% recall accuracy
- Annual savings: ~$100K

## Version Info

- **Last Update:** Nov 20, 2025 (Daydreams & M-GRPO)
- **Python:** 3.12.4
- **Total Systems:** 79 integrations (6 layers)
- **Total Agents:** 26 with StandardIntegrationMixin (459 integrations each)
- **Deployment:** GitHub Pages, Railway, Render, Fly.io
- **Git Branch:** main
- always use Context7 MCP