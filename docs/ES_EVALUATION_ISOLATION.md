# ES Evaluation Isolation Architecture

**Version:** 1.0
**Date:** November 8, 2025
**Owner:** Jackson (DevOps)
**Status:** Production-Ready

---

## Executive Summary

This document describes the **isolated Evolution Strategies (ES) evaluation environment** that prevents perturbed models from accessing production systems during fitness evaluation.

**Critical Security Issue Resolved:**
- **Before:** Perturbed models evaluated on production router → could make real API calls, corrupt data
- **After:** Perturbed models isolated in Docker sandbox → no external access, mock-only evaluation

**Key Security Features:**
1. Isolated Docker network (no internet access)
2. Sandboxed router (mock LLM client only)
3. Resource limits (2 CPU, 4GB RAM)
4. Separate logging (es-eval.log)
5. 20 curated test tasks (deterministic fixtures)

---

## The Security Problem

### Original ES Fitness Implementation (UNSAFE)

From `INTEGRATION_ROADMAP_DEEPAGENTS_SKYVERN_ES.md` (lines 1086-1092):

```python
# infrastructure/evolution_strategies/fitness.py (UNSAFE VERSION)
class AgentTaskFitness:
    def __call__(self, model_path: str) -> float:
        # Load perturbed model
        self.router.load_model(model_path)  # ← PRODUCTION ROUTER!

        # Run test tasks
        for task in self.test_tasks:
            result = await self.router.route_task(task)  # ← REAL API CALLS!
```

**What could go wrong:**
1. **Expensive API calls:** Perturbed model makes 1000 GPT-4o calls → $500 bill
2. **Data corruption:** Perturbed model modifies production database/cache
3. **Malicious prompts:** Perturbed model executes prompt injection attacks
4. **DoS attack:** Perturbed model spawns infinite loops, crashes system
5. **Data exfiltration:** Perturbed model leaks sensitive data to external APIs

### Why This Matters

**Evolution Strategies workflow:**
```
1. Sample 10 perturbed models from base model θ₀
2. Evaluate each on agent tasks → fitness score
3. Select top 5 performers
4. Update base model
5. Repeat nightly
```

**Each perturbed model is UNTESTED:**
- Random parameter perturbations (θᵢ = θ₀ + σεᵢ)
- No guarantee of safety or correctness
- Could behave unpredictably on production systems

**Example attack:**
```
Perturbed Model 3: θ₃ = θ₀ + 0.01 × ε₃
  ↓
Evaluated on production router
  ↓
Makes 10,000 API calls to test "scalability"
  ↓
$5,000 bill + rate limit ban
```

---

## The Solution: Isolated Sandbox

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ HOST MACHINE (Production)                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ES Optimizer (es_optimizer.py)              │   │
│  │                                             │   │
│  │  1. Sample perturbations                   │   │
│  │  2. For each perturbed model:              │   │
│  │     - Save to /tmp/perturbed_model_i.pt    │   │
│  │     - Run Docker container                 │   │
│  │     - Get fitness score                    │   │
│  │  3. Select top-K performers                │   │
│  └─────────────────────────────────────────────┘   │
│                      │                             │
│                      ▼                             │
│  ┌─────────────────────────────────────────────┐   │
│  │ ISOLATED DOCKER NETWORK                    │   │
│  │ (No internet access)                       │   │
│  │                                             │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │ es-evaluation container              │  │   │
│  │  │                                      │  │   │
│  │  │  SandboxedRouter                    │  │   │
│  │  │    ↓                                 │  │   │
│  │  │  MockLLMClient (no external calls)  │  │   │
│  │  │    ↓                                 │  │   │
│  │  │  Fixtures (es_test_tasks.json)      │  │   │
│  │  │    ↓                                 │  │   │
│  │  │  Fitness score: 0.742                │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  │                                             │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │ es-mock-api container                │  │   │
│  │  │                                      │  │   │
│  │  │  FastAPI server                     │  │   │
│  │  │  Mock LLM responses                 │  │   │
│  │  │  (OpenAI-compatible API)            │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Security Layers

**Layer 1: Network Isolation**
```yaml
# docker-compose.es-eval.yml
networks:
  es-eval-internal:
    driver: bridge
    internal: true  # ← NO EXTERNAL INTERNET ACCESS
```

**Layer 2: Resource Limits**
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'       # Max 2 CPU cores
      memory: 4G        # Max 4GB RAM
```

**Layer 3: Sandboxed Router**
```python
# infrastructure/evolution_strategies/eval_sandbox.py
class SandboxedRouter:
    def __init__(self, model_path: str, mock_mode: bool = True):
        # SECURITY: Force mock mode in sandbox
        if os.getenv("ES_EVAL_MODE") == "ISOLATED":
            mock_mode = True

        self.llm_client = MockLLMClient()  # NO external API calls
```

**Layer 4: Mock Data Only**
```python
# tests/fixtures/es_test_tasks.json
{
  "test_tasks": [/* 20 curated test tasks */],
  "mock_responses": {/* deterministic LLM responses */}
}
```

**Layer 5: Execution Limits**
```python
class SandboxedRouter:
    def __init__(self):
        self.execution_count = 0
        self.max_executions = 100  # DoS prevention

    async def route_task(self, task):
        self.execution_count += 1
        if self.execution_count > self.max_executions:
            raise RuntimeError("SECURITY: Max execution limit reached")
```

---

## Usage Guide

### Running ES Evaluation (Safe Way)

**Step 1: Start isolated environment**
```bash
cd "C:\Users\Ben\OneDrive\Desktop\Ben Projects\Genesis Clean Deploy NEW\Claude Clean Code"
docker-compose -f docker-compose.es-eval.yml up -d
```

**Step 2: Check health**
```bash
docker-compose -f docker-compose.es-eval.yml ps
docker logs genesis-es-eval-sandbox
```

Expected output:
```
ES EVALUATION SANDBOX STARTED
SECURITY: Verified ES_EVAL_MODE=ISOLATED
Loaded 20 test tasks
Evaluating fitness for model: /app/models/perturbed_model_0.pt
Model fitness: 0.742 (mean of 20 tasks)
ES EVALUATION SANDBOX FINISHED
```

**Step 3: View logs**
```bash
docker exec genesis-es-eval-sandbox cat /app/logs/es-eval.log
```

**Step 4: Cleanup**
```bash
docker-compose -f docker-compose.es-eval.yml down -v
```

### Integration with ES Optimizer

**Update `infrastructure/evolution_strategies/es_optimizer.py`:**

```python
class ESOptimizer:
    def _evaluate_population(
        self,
        perturbations: List[np.ndarray],
        fitness_fn: Callable[[str], float]
    ) -> List[float]:
        """Evaluate population in ISOLATED sandbox"""
        rewards = []

        for i, epsilon in enumerate(perturbations):
            # Save perturbed model
            perturbed_params = self.base_params + epsilon
            model_path = f"/tmp/perturbed_model_{i}.pt"
            self._save_perturbed_model(perturbed_params, model_path)

            # Evaluate in ISOLATED Docker container
            reward = self._evaluate_in_sandbox(model_path)
            rewards.append(reward)

        return rewards

    def _evaluate_in_sandbox(self, model_path: str) -> float:
        """Run evaluation in isolated Docker container"""
        import subprocess

        # Mount model as read-only volume
        cmd = [
            "docker", "run", "--rm",
            "--network", "genesis_es-eval-internal",  # Isolated network
            "-v", f"{model_path}:/app/models/perturbed_model.pt:ro",
            "-v", "./tests/fixtures:/app/fixtures:ro",
            "-v", "./infrastructure/evolution_strategies:/app/evolution_strategies:ro",
            "-e", "ES_EVAL_MODE=ISOLATED",
            "genesis-es-eval-sandbox",
            "python", "evolution_strategies/eval_sandbox.py"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        # Parse fitness score from stdout
        for line in result.stdout.split('\n'):
            if "Model fitness:" in line:
                fitness = float(line.split("fitness:")[1].split()[0])
                return fitness

        raise RuntimeError(f"Failed to parse fitness score: {result.stderr}")
```

---

## Test Tasks (20 Scenarios)

All test tasks are defined in `tests/fixtures/es_test_tasks.json`.

**Agent Coverage:**
- QA Agent: 3 tasks (simple → complex testing)
- Builder Agent: 2 tasks (API development, migrations)
- Marketing Agent: 2 tasks (copywriting, campaigns)
- Support Agent: 2 tasks (billing, technical troubleshooting)
- Analyst Agent: 2 tasks (engagement metrics, churn prediction)
- Content Agent: 2 tasks (blog posts, documentation)
- Security Agent: 2 tasks (vulnerability audits, code review)
- Deploy Agent: 2 tasks (staging, blue-green deployment)
- Legal Agent: 2 tasks (GDPR compliance, contracts)
- Spec Agent: 1 task (technical specifications)

**Total:** 20 tasks across 10 agent types.

**Complexity Distribution:**
- Simple: 6 tasks (30%)
- Moderate: 8 tasks (40%)
- Complex: 6 tasks (30%)

**Mock Response Types:**
- Success responses: 11 variations (qa_success, builder_success, etc.)
- Failure responses: 2 variations (qa_failure, generic_error)

---

## Scoring Methodology

**Multi-factor fitness scoring:**

```python
def _score_result(result: RoutingResult, task: Task) -> float:
    score = 0.0

    # Correctness (50%)
    if result.success:
        score += 0.5

    # Latency (25%) - faster is better
    latency_score = max(0, 1 - (result.latency_ms / 1000))
    score += 0.25 * latency_score

    # Cost (25%) - cheaper model is better
    if "flash" in result.model_used:
        cost_score = 1.0
    elif "gpt-4o" in result.model_used:
        cost_score = 0.5
    else:
        cost_score = 0.75
    score += 0.25 * cost_score

    return score  # Range: 0.0 to 1.0
```

**Fitness = Mean score across all 20 test tasks**

**Example:**
```
Task 1: 0.85 (success, fast, cheap model)
Task 2: 0.72 (success, slow, expensive model)
...
Task 20: 0.90 (success, fast, cheap model)

Fitness = mean([0.85, 0.72, ..., 0.90]) = 0.742
```

---

## Monitoring & Logging

### Log Files

**ES Evaluation Logs:**
- Location: `docker volume es-eval-logs`
- File: `/app/logs/es-eval.log`
- Format: `timestamp - [ES-EVAL-SANDBOX] - level - message`

**Mock API Logs:**
- Location: Docker container stdout
- View: `docker logs genesis-es-mock-api`

### Health Checks

**ES Evaluation Container:**
```bash
docker exec genesis-es-eval-sandbox python -c "import sys; sys.exit(0)"
```

**Mock API Container:**
```bash
curl http://localhost:18080/health
```

Expected response:
```json
{"status": "healthy", "service": "mock-llm-api"}
```

### Resource Monitoring

**CPU/Memory Usage:**
```bash
docker stats genesis-es-eval-sandbox
```

Expected:
- CPU: <50% (under 2 cores)
- Memory: <2GB (under 4GB limit)

---

## Security Checklist

**Before running ES evaluation, verify:**

- [ ] Docker Compose file has `internal: true` network
- [ ] Resource limits are configured (2 CPU, 4GB RAM)
- [ ] Environment variable `ES_EVAL_MODE=ISOLATED` is set
- [ ] SandboxedRouter uses `mock_mode=True`
- [ ] No production credentials in environment
- [ ] Fixtures file exists: `tests/fixtures/es_test_tasks.json`
- [ ] Mock API server is running (port 18080)
- [ ] Logs are written to isolated volume (not production)

**After evaluation, verify:**

- [ ] No external API calls logged
- [ ] Execution count ≤ 100 per model
- [ ] Resource usage within limits
- [ ] No error logs indicating security violations
- [ ] Docker containers stopped and volumes cleaned

---

## Troubleshooting

### Issue: Fixtures not found

**Error:**
```
WARNING: Fixtures file not found: /app/fixtures/es_test_tasks.json
```

**Solution:**
```bash
# Check volume mount
docker inspect genesis-es-eval-sandbox | grep Mounts

# Verify file exists
ls -la tests/fixtures/es_test_tasks.json

# Recreate container
docker-compose -f docker-compose.es-eval.yml down
docker-compose -f docker-compose.es-eval.yml up -d
```

### Issue: Mock API unreachable

**Error:**
```
Failed to connect to mock API: Connection refused
```

**Solution:**
```bash
# Check if mock API is running
docker ps | grep es-mock-api

# Check health
curl http://localhost:18080/health

# View logs
docker logs genesis-es-mock-api
```

### Issue: Max execution limit reached

**Error:**
```
SECURITY: Max execution limit reached (100). Possible DoS attack from perturbed model.
```

**Solution:**
This is intentional DoS prevention. The perturbed model is executing too many tasks.

**Options:**
1. Increase `max_executions` limit (if legitimate)
2. Investigate perturbed model for infinite loop
3. Reduce number of test tasks

### Issue: Out of memory

**Error:**
```
Container killed: OOM (Out of Memory)
```

**Solution:**
```bash
# Increase memory limit in docker-compose.es-eval.yml
deploy:
  resources:
    limits:
      memory: 8G  # Increase from 4G
```

---

## Performance Metrics

**Expected Evaluation Time:**
- 20 test tasks × 100ms avg latency = 2 seconds per model
- 10 perturbed models × 2 seconds = 20 seconds per ES iteration
- Nightly training: 100 iterations × 20 seconds = 33 minutes

**Resource Usage:**
- CPU: 30-50% (under 2 cores)
- Memory: 1-2GB (under 4GB limit)
- Disk: 100MB (model checkpoints + logs)
- Network: 0 bytes (fully isolated)

---

## Future Enhancements

### Phase 1 (Complete)
- [x] Isolated Docker network
- [x] Sandboxed router
- [x] Mock LLM client
- [x] 20 test task fixtures
- [x] Resource limits
- [x] Separate logging

### Phase 2 (Planned)
- [ ] Parallel evaluation (10 containers simultaneously)
- [ ] GPU support (for faster model loading)
- [ ] Distributed ES across multiple VPS instances
- [ ] Automated benchmark generation (expand from 20 → 100 tasks)
- [ ] Real-time monitoring dashboard (Grafana integration)

### Phase 3 (Future)
- [ ] Formal verification of sandbox security (fuzzing, penetration testing)
- [ ] Integration with CI/CD (automated nightly ES training)
- [ ] A/B testing framework (compare perturbed models in production)

---

## References

**Implementation Files:**
- `docker-compose.es-eval.yml` - Isolated Docker environment
- `infrastructure/evolution_strategies/eval_sandbox.py` - Sandboxed router
- `tests/fixtures/es_test_tasks.json` - Test tasks and mock responses
- `tests/fixtures/mock_llm_server.py` - Mock LLM API server

**Related Documentation:**
- `INTEGRATION_ROADMAP_DEEPAGENTS_SKYVERN_ES.md` - ES integration roadmap
- `CLAUDE.md` - Project overview and research references

**Research Papers:**
- Evolution Strategies: Salimans et al. (2017) - "Evolution Strategies as a Scalable Alternative to Reinforcement Learning"
- ES for LLM Fine-tuning: Referenced in INTEGRATION_ROADMAP (lines 875-1059)

---

## Contact

**Questions or Issues:**
- Owner: Jackson (DevOps specialist)
- Escalation: Cora (Code review), Hudson (Security audit)
- Documentation: This file (`docs/ES_EVALUATION_ISOLATION.md`)

**Last Updated:** November 8, 2025
**Version:** 1.0
**Status:** Production-Ready ✅
