# VPS Enhancements - Quick Reference

**Implementation Date:** November 12, 2025
**Status:** ✅ Production Ready

---

## Quick Usage Guide

### 1. Multi-Agent Attribution (Inclusive Fitness Swarm)

```python
from infrastructure.inclusive_fitness_swarm import InclusiveFitnessSwarm, Agent, TaskRequirement

# Create swarm
agents = [...]  # Your agents
swarm = InclusiveFitnessSwarm(agents)

# Evaluate team (causal influence tracked automatically)
team = [agent1, agent2]
outcome = swarm.evaluate_team(team, task, simulate=True)

# Access causal influence
influences = outcome.metadata['causal_influence']
print(f"Agent A influence: {influences['agent_a']}")

# Check agent credit balance
balance = swarm.get_agent_credit_balance('agent_a')

# Detect free-riders
free_riders = swarm.get_free_riders(threshold=0.1, min_evaluations=5)
print(f"Free-riders: {free_riders}")
```

**Environment Configuration:**
```bash
# Set influence weight (default: 0.3)
export SWARM_CAUSAL_INFLUENCE_WEIGHT=0.3
```

### 2. Dual-Thread Planning (HTDAG)

```python
from infrastructure.htdag_planner import HTDAGPlanner

# Create planner
planner = HTDAGPlanner()

# Use dual-thread planning
result = await planner.plan_task("Build authentication system")

# Access reactive plan (immediate execution)
reactive_dag = result.reactive_dag
print(f"Reactive: {len(reactive_dag)} tasks in {result.reactive_latency_ms:.1f}ms")

# Access deep plan (refined)
deep_dag = result.deep_dag
print(f"Deep: {len(deep_dag)} tasks in {result.deep_latency_ms:.1f}ms")

# Check if deep plan succeeded
if not result.used_fallback:
    print("Deep plan successfully generated")
```

**Environment Configuration:**
```bash
# Enable/disable dual-threading (default: true)
export HTDAG_DUAL_THREAD=true
```

### 3. Orchestrator Integration

```python
from infrastructure.autonomous_orchestrator import AutonomousOrchestrator

# Create orchestrator (dual-threading enabled by default)
orchestrator = AutonomousOrchestrator()

# Generate business (uses dual-thread planning automatically)
result = await orchestrator.generate_business_autonomous(idea)
```

---

## Key Metrics

### Inclusive Fitness Attribution
- **Free-Rider Detection:** After 5+ evaluations
- **Counterfactual Overhead:** O(n) where n = team size
- **Memory Per Agent:** ~40 bytes per evaluation

### Dual-Thread Planning
- **Reactive Latency:** <50ms (pattern-based)
- **Deep Latency:** 2-10s (LLM-based)
- **Timeout:** 30s (falls back to reactive)

---

## Testing Commands

```bash
# Test inclusive fitness attribution
python -m pytest tests/test_inclusive_fitness_attribution.py -v --no-cov

# Test HTDAG dual-threading
python -m pytest tests/test_htdag_dual_thread.py -v --no-cov

# Run both
python -m pytest tests/test_inclusive_fitness_attribution.py tests/test_htdag_dual_thread.py -v --no-cov
```

**Expected Results:**
- 15 tests pass (inclusive fitness)
- 17 tests pass (HTDAG)
- Total: 32 tests pass

---

## Troubleshooting

### Problem: Free-riders not detected
**Solution:** Ensure at least 5 evaluations have been run per agent
```python
# Check evaluation count
influences = swarm.causal_influence_ledger.get('agent_name', [])
print(f"Evaluations: {len(influences)}")
```

### Problem: Reactive plan latency >50ms
**Solution:** Check system load, pattern matching should be very fast
```python
# Measure latency
import time
start = time.time()
dag = planner._generate_reactive_plan(task_desc)
latency_ms = (time.time() - start) * 1000
print(f"Latency: {latency_ms:.1f}ms")
```

### Problem: Deep plan always times out
**Solution:** Check LLM client configuration and network
```python
# Test LLM connectivity
planner.llm_client  # Should not be None
```

---

## API Reference

### InclusiveFitnessSwarm

**New Methods:**
- `get_agent_credit_balance(agent_name: str) -> float`
- `get_free_riders(threshold: float = 0.1, min_evaluations: int = 5) -> List[str]`

**New Attributes:**
- `causal_influence_ledger: Dict[str, List[float]]`
- `participation_credits: Dict[str, float]`
- `influence_weight: float` (from env var)

### HTDAGPlanner

**New Methods:**
- `plan_task(user_request: str, context: Dict) -> DualPlanResult`
- `_generate_reactive_plan(task_desc: str) -> TaskDAG`

**New DataClass:**
```python
@dataclass
class DualPlanResult:
    reactive_dag: TaskDAG
    reactive_latency_ms: float
    deep_dag: Optional[TaskDAG] = None
    deep_latency_ms: Optional[float] = None
    used_fallback: bool = False
```

### TeamOutcome

**New Attribute:**
- `metadata: Dict[str, Any]` (contains `causal_influence`)

---

## Pattern Categories (Reactive Planning)

1. **Implementation:** "implement", "build", "create", "develop"
   - Pattern: spec → code → test

2. **Deployment:** "deploy", "release", "launch"
   - Pattern: build → test → deploy

3. **Testing:** "test", "qa", "verify"
   - Pattern: setup → execute

4. **Generic:** fallback for all other tasks
   - Pattern: single task

---

## Monitoring

### Prometheus Metrics (if configured)

```python
# Inclusive Fitness
- swarm_free_rider_count (gauge)
- swarm_causal_influence_avg (gauge)

# HTDAG
- htdag_reactive_latency_ms (histogram)
- htdag_deep_latency_ms (histogram)
- htdag_timeout_count (counter)
```

---

## Files Modified

| File | Purpose |
|------|---------|
| `infrastructure/inclusive_fitness_swarm.py` | Multi-agent attribution |
| `infrastructure/htdag_planner.py` | Dual-thread planning |
| `infrastructure/autonomous_orchestrator.py` | Orchestrator integration |
| `tests/test_inclusive_fitness_attribution.py` | Unit tests (15) |
| `tests/test_htdag_dual_thread.py` | Unit tests (17) |

---

## Next Steps

1. **Production Deployment:**
   - Deploy to staging environment
   - Monitor metrics for 24 hours
   - Gradual rollout to production

2. **Optimization:**
   - Tune `SWARM_CAUSAL_INFLUENCE_WEIGHT` based on task types
   - Cache reactive plans for common patterns
   - Implement adaptive timeout for deep planning

3. **Future Enhancements:**
   - Free-rider rehabilitation system
   - Parallel deep planning strategies
   - Adaptive influence weight learning

---

**For detailed information, see:** `VPS_ENHANCEMENTS_SUMMARY.md`
