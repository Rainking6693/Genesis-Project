# VPS-Style Implementation Plan

**Status:** Ready to deploy once 1-hour test completes (currently 45/100)
**Approach:** Parallel implementation using Shane + Nova with Haiku 4.5
**Audit:** Hudson + Cora using Audit Protocol V2

---

## Implementation Strategy

### Phase 1: Parallel Implementation (Shane + Nova)

**Shane (Haiku 4.5):** Integrations #1-2
- Task 1: Multi-Agent Attribution into Inclusive Fitness Swarm
- Task 2: Dual-Thread Planning into HTDAG

**Nova (Haiku 4.5):** Integrations #3-4
- Task 3: DeepResearch Pipeline with OpenRouter
- Task 4: Restart Mechanisms into PSO Optimizer

### Phase 2: Parallel Audits (Hudson + Cora)

**Hudson:** Audit Shane's work (Standard Code Review)
- Review swarm attribution integration
- Review HTDAG dual-threading
- Fix any issues found

**Cora:** Audit Nova's work (Audit Protocol V2)
- Review DeepResearch pipeline
- Review PSO restart mechanisms
- Fix any issues found

---

## Task #1: Multi-Agent Attribution (Shane)

### Target File
`infrastructure/inclusive_fitness_swarm.py`

### Changes Required

1. **Add Causal Influence Tracking**
   ```python
   class InclusiveFitnessSwarm:
       def __init__(self):
           # Add new tracking
           self.causal_influence_ledger: Dict[str, List[float]] = {}
           self.participation_credits: Dict[str, float] = {}
           self.influence_weight = float(os.getenv('SWARM_CAUSAL_INFLUENCE_WEIGHT', '0.3'))
   ```

2. **Record Counterfactual Impact**
   ```python
   def evaluate_team(self, team: List[str], task: str) -> Dict[str, Any]:
       # Existing evaluation
       outcome = self._run_team_evaluation(team, task)

       # NEW: Compute counterfactual impact per agent
       for agent in team:
           counterfactual_team = [a for a in team if a != agent]
           counterfactual_outcome = self._run_team_evaluation(counterfactual_team, task)

           # Agent's causal influence = outcome with agent - outcome without agent
           influence = outcome['score'] - counterfactual_outcome['score']

           # Store in ledger
           if agent not in self.causal_influence_ledger:
               self.causal_influence_ledger[agent] = []
           self.causal_influence_ledger[agent].append(influence)

           # Update participation credits
           if agent not in self.participation_credits:
               self.participation_credits[agent] = 0.0
           self.participation_credits[agent] += influence

       # Store influence in outcome metadata
       outcome['causal_influence'] = {
           agent: self.causal_influence_ledger[agent][-1]
           for agent in team
       }

       return outcome
   ```

3. **Fold into Inclusive Fitness Rewards**
   ```python
   def compute_fitness(self, agent: str, team_outcome: Dict[str, Any]) -> float:
       # Existing fitness calculation
       base_fitness = self._compute_base_fitness(agent, team_outcome)

       # NEW: Apply causal influence modifier
       if 'causal_influence' in team_outcome:
           influence = team_outcome['causal_influence'].get(agent, 0.0)

           # Detect free-riders (chronic low contributors)
           avg_influence = np.mean(self.causal_influence_ledger.get(agent, [0.0]))

           if avg_influence < 0.1 and len(self.causal_influence_ledger.get(agent, [])) > 5:
               # Penalize free-riders
               fairness_penalty = 0.5
           else:
               fairness_penalty = 1.0

           # Blend influence into fitness
           fitness = (
               base_fitness * (1 - self.influence_weight) +
               influence * self.influence_weight
           ) * fairness_penalty
       else:
           fitness = base_fitness

       return fitness
   ```

4. **Add Credit Ledger Methods**
   ```python
   def get_agent_credit_balance(self, agent: str) -> float:
       """Get long-term participation credit for agent."""
       return self.participation_credits.get(agent, 0.0)

   def get_free_riders(self, threshold: float = 0.1) -> List[str]:
       """Identify chronic low contributors."""
       free_riders = []
       for agent, influences in self.causal_influence_ledger.items():
           if len(influences) >= 5:
               avg_influence = np.mean(influences)
               if avg_influence < threshold:
                   free_riders.append(agent)
       return free_riders
   ```

### Expected Impact
- Swarm decisions factor long-term participation
- Free-riders automatically penalized
- Causal influence stored in all outcomes

---

## Task #2: Dual-Thread Planning (Shane)

### Target File
`infrastructure/htdag_planner.py`

### Changes Required

1. **Add DualPlanResult Class**
   ```python
   @dataclass
   class DualPlanResult:
       """Result from dual-thread planning."""
       reactive_dag: TaskDAG
       reactive_latency_ms: float
       deep_dag: Optional[TaskDAG] = None
       deep_latency_ms: Optional[float] = None
       used_fallback: bool = False
   ```

2. **Implement Reactive Thread**
   ```python
   def _generate_reactive_plan(self, task_desc: str) -> TaskDAG:
       """Generate minimal task DAG in milliseconds using heuristics."""
       start = time.time()

       # Pattern matching for common task types
       if 'implement' in task_desc.lower() or 'build' in task_desc.lower():
           tasks = [
               TaskNode(id='design', description='Design solution'),
               TaskNode(id='implement', description='Implement code'),
               TaskNode(id='test', description='Test implementation')
           ]
       elif 'deploy' in task_desc.lower():
           tasks = [
               TaskNode(id='prepare', description='Prepare deployment'),
               TaskNode(id='deploy', description='Deploy to production'),
               TaskNode(id='verify', description='Verify deployment')
           ]
       else:
           # Generic fallback
           tasks = [
               TaskNode(id='analyze', description='Analyze requirements'),
               TaskNode(id='execute', description='Execute task')
           ]

       dag = TaskDAG(root=tasks[0])
       for i in range(1, len(tasks)):
           dag.add_edge(tasks[i-1].id, tasks[i].id)

       latency_ms = (time.time() - start) * 1000
       logger.info(f"⚡ Reactive plan generated: {len(tasks)} tasks in {latency_ms:.2f}ms")

       return dag
   ```

3. **Enhance plan_task with Dual-Threading**
   ```python
   async def plan_task(
       self,
       task_desc: str,
       dual_thread: bool = None
   ) -> Union[TaskDAG, DualPlanResult]:
       """Plan task with optional dual-threading."""

       # Check env var
       if dual_thread is None:
           dual_thread = os.getenv('HTDAG_DUAL_THREAD', 'true').lower() == 'true'

       if not dual_thread:
           # Original single-thread behavior
           return await self._decompose_task(task_desc)

       # DUAL-THREAD MODE
       reactive_start = time.time()
       reactive_dag = self._generate_reactive_plan(task_desc)
       reactive_latency = (time.time() - reactive_start) * 1000

       # Start deep planning in background
       deep_start = time.time()
       try:
           deep_dag = await asyncio.wait_for(
               self._decompose_task(task_desc),
               timeout=30.0  # 30 second timeout
           )
           deep_latency = (time.time() - deep_start) * 1000
           used_fallback = False
       except (asyncio.TimeoutError, Exception) as e:
           logger.warning(f"Deep planning failed: {e}, using reactive fallback")
           deep_dag = None
           deep_latency = None
           used_fallback = True

       result = DualPlanResult(
           reactive_dag=reactive_dag,
           reactive_latency_ms=reactive_latency,
           deep_dag=deep_dag,
           deep_latency_ms=deep_latency,
           used_fallback=used_fallback
       )

       logger.info(
           f"⚡ Dual-thread HTDAG: reactive={len(reactive_dag.nodes)} tasks "
           f"({reactive_latency:.2f}ms) → "
           f"final={len(deep_dag.nodes) if deep_dag else 'N/A'} tasks "
           f"({deep_latency:.2f}ms if deep_latency else 'N/A'})"
       )

       return result
   ```

### Orchestrator Integration
`infrastructure/autonomous_orchestrator.py`

```python
# In orchestrator's decompose step
plan_result = await self.htdag.plan_task(task_description)

if isinstance(plan_result, DualPlanResult):
    # Start work immediately on reactive plan
    self._start_execution(plan_result.reactive_dag)

    # Upgrade to deep plan when ready (if available)
    if plan_result.deep_dag and not plan_result.used_fallback:
        logger.info(f"Upgrading to deep plan ({len(plan_result.deep_dag.nodes)} tasks)")
        self._upgrade_execution(plan_result.deep_dag)
else:
    # Legacy single-thread mode
    self._start_execution(plan_result)
```

### Expected Impact
- UI proceeds on reactive plan immediately (20-50ms)
- Deep plan polishes in background (1-2s)
- 10-50x latency reduction for user-visible response

---

## Task #3: DeepResearch Pipeline (Nova)

### Target Files
- `pipelines/deepresearch/config.py`
- `pipelines/deepresearch/__init__.py`
- `.env`

### Changes Required

1. **Restore DeepResearchConfig**
   ```python
   # pipelines/deepresearch/config.py

   @dataclass
   class DeepResearchConfig:
       """Configuration for DeepResearch pipeline using Tongyi."""

       # Model settings
       model_id: str = "alibaba/tongyi-deepresearch-30b-a3b"
       openrouter_endpoint: str = "https://openrouter.ai/api/v1/chat/completions"

       # API keys
       openrouter_api_key: Optional[str] = None
       serper_api_key: Optional[str] = None  # For web search
       jina_api_key: Optional[str] = None    # For web scraping
       dashscope_api_key: Optional[str] = None  # For Alibaba models

       # Pipeline settings
       max_iterations: int = 10
       max_sources: int = 20
       quality_threshold: float = 0.7

       @classmethod
       def from_env(cls) -> 'DeepResearchConfig':
           """Load config from environment variables."""
           return cls(
               openrouter_api_key=os.getenv('OPENROUTER_API_KEY'),
               serper_api_key=os.getenv('SERPER_API_KEY'),
               jina_api_key=os.getenv('JINA_API_KEY'),
               dashscope_api_key=os.getenv('DASHSCOPE_API_KEY'),
           )

       def validate(self) -> List[str]:
           """Validate configuration and return missing keys."""
           missing = []
           if not self.openrouter_api_key:
               missing.append('OPENROUTER_API_KEY')
           if not self.serper_api_key:
               missing.append('SERPER_API_KEY')
           if not self.jina_api_key:
               missing.append('JINA_API_KEY')
           if not self.dashscope_api_key:
               missing.append('DASHSCOPE_API_KEY')
           return missing
   ```

2. **Update __init__.py**
   ```python
   # pipelines/deepresearch/__init__.py

   from .config import DeepResearchConfig

   __all__ = ['DeepResearchConfig']
   ```

3. **Add .env Entries**
   ```bash
   # DeepResearch Pipeline - Tongyi 30B via OpenRouter
   OPENROUTER_API_KEY=
   SERPER_API_KEY=
   JINA_API_KEY=
   DASHSCOPE_API_KEY=

   # DeepResearch Model Selection
   DEEPRESEARCH_MODEL=alibaba/tongyi-deepresearch-30b-a3b
   DEEPRESEARCH_ENDPOINT=https://openrouter.ai/api/v1/chat/completions
   ```

4. **Create Validation Script**
   ```python
   # scripts/validate_deepresearch_api_keys.py

   from pipelines.deepresearch.config import DeepResearchConfig

   def main():
       config = DeepResearchConfig.from_env()
       missing = config.validate()

       print("DeepResearch API Key Status:")
       print(f"  OPENROUTER_API_KEY: {'✅' if config.openrouter_api_key else '❌ MISSING'}")
       print(f"  SERPER_API_KEY: {'✅' if config.serper_api_key else '❌ MISSING'}")
       print(f"  JINA_API_KEY: {'✅' if config.jina_api_key else '❌ MISSING'}")
       print(f"  DASHSCOPE_API_KEY: {'✅' if config.dashscope_api_key else '❌ MISSING'}")

       if missing:
           print(f"\n⚠️  Missing {len(missing)} required keys: {', '.join(missing)}")
           print("\nGet keys from:")
           print("  - OpenRouter: https://openrouter.ai/keys")
           print("  - Serper: https://serper.dev/")
           print("  - Jina: https://jina.ai/")
           print("  - DashScope: https://dashscope.aliyun.com/")
       else:
           print("\n✅ All API keys configured!")

   if __name__ == "__main__":
       main()
   ```

### Expected Impact
- DeepResearch pipeline can use Tongyi 30B
- Validation script shows missing keys
- Documentation updated with new model choice

---

## Task #4: Restart Mechanisms (Nova)

### Target File
`infrastructure/swarm/team_optimizer.py` (PSO optimizer)

### Changes Required

1. **Add Restart Configuration**
   ```python
   class PSOTeamOptimizer:
       def __init__(
           self,
           restart_patience: int = 10,
           restart_fraction: float = 0.3,
           stagnation_threshold: float = 0.001,
           **kwargs
       ):
           self.restart_patience = restart_patience
           self.restart_fraction = restart_fraction
           self.stagnation_threshold = stagnation_threshold

           # Tracking for stagnation detection
           self.best_fitness_history: List[float] = []
           self.stagnation_count = 0
   ```

2. **Implement Stagnation Detection**
   ```python
   def _check_stagnation(self, current_best_fitness: float) -> bool:
       """Detect if optimization is stagnating."""
       self.best_fitness_history.append(current_best_fitness)

       if len(self.best_fitness_history) < self.restart_patience:
           return False

       # Check last N iterations for improvement
       recent = self.best_fitness_history[-self.restart_patience:]
       improvement = max(recent) - min(recent)

       if improvement < self.stagnation_threshold:
           self.stagnation_count += 1
           logger.warning(
               f"Stagnation detected (count={self.stagnation_count}): "
               f"improvement={improvement:.6f} < threshold={self.stagnation_threshold}"
           )
           return True
       else:
           self.stagnation_count = 0
           return False
   ```

3. **Implement Partial Particle Reset**
   ```python
   def _issue_restart_token(self, particles: List[Particle]) -> List[Particle]:
       """Reset fraction of particles to escape local minima."""
       num_reset = int(len(particles) * self.restart_fraction)

       # Reset worst-performing particles
       sorted_particles = sorted(particles, key=lambda p: p.fitness)
       particles_to_reset = sorted_particles[:num_reset]

       logger.info(
           f"🔄 Issuing restart token: resetting {num_reset}/{len(particles)} particles"
       )

       for particle in particles_to_reset:
           # Reinitialize position randomly
           particle.position = self._random_position()
           particle.velocity = self._random_velocity()
           particle.best_position = particle.position.copy()
           particle.best_fitness = float('-inf')

       return particles
   ```

4. **Integrate into Optimization Loop**
   ```python
   def optimize(self, objective_func, iterations: int = 100) -> OptimizerResult:
       """PSO optimization with automatic restart on stagnation."""

       particles = self._initialize_particles()

       for iteration in range(iterations):
           # Evaluate fitness
           for particle in particles:
               particle.fitness = objective_func(particle.position)

           # Get current best
           current_best = max(particles, key=lambda p: p.fitness)

           # Check for stagnation
           if self._check_stagnation(current_best.fitness):
               particles = self._issue_restart_token(particles)
               logger.info(f"Restart issued at iteration {iteration}")

           # Update velocities and positions
           self._update_particles(particles)

       return OptimizerResult(
           best_position=current_best.position,
           best_fitness=current_best.fitness,
           iterations=iterations,
           restarts=self.stagnation_count
       )
   ```

### Expected Impact
- Automatic escape from local minima
- Configurable restart cadence
- Logs show restart events for monitoring

---

## Environment Variables

Add to `.env`:

```bash
# VPS-Style Enhancements Configuration

# Multi-Agent Attribution (Task #1)
SWARM_CAUSAL_INFLUENCE_WEIGHT=0.3  # Blend ratio for influence in fitness

# Dual-Thread Planning (Task #2)
HTDAG_DUAL_THREAD=true  # Enable dual-thread HTDAG planning

# DeepResearch Pipeline (Task #3)
OPENROUTER_API_KEY=  # Get from https://openrouter.ai/keys
SERPER_API_KEY=      # Get from https://serper.dev/
JINA_API_KEY=        # Get from https://jina.ai/
DASHSCOPE_API_KEY=   # Get from https://dashscope.aliyun.com/
DEEPRESEARCH_MODEL=alibaba/tongyi-deepresearch-30b-a3b

# Restart Mechanisms (Task #4)
PSO_RESTART_PATIENCE=10      # Iterations before restart check
PSO_RESTART_FRACTION=0.3     # Fraction of particles to reset
PSO_STAGNATION_THRESHOLD=0.001  # Minimum improvement threshold
```

---

## Testing Plan

### Unit Tests (Per Task)

1. **Task #1 (Attribution):**
   ```bash
   python -m pytest tests/test_inclusive_fitness_attribution.py
   ```

2. **Task #2 (Dual-Threading):**
   ```bash
   python -m pytest tests/test_htdag_dual_thread.py
   ```

3. **Task #3 (DeepResearch):**
   ```bash
   python scripts/validate_deepresearch_api_keys.py
   ```

4. **Task #4 (Restart Mechanisms):**
   ```bash
   python -m pytest tests/test_pso_restart.py
   ```

### Integration Test

```bash
# Full business generation with new enhancements
python scripts/autonomous_fully_integrated.py --count 3 --min-score 75.0
```

Expected logs:
```
⚡ Dual-thread HTDAG: reactive=5 tasks (0.03s) → final=12 tasks (1.2s)
🔄 Issuing restart token: resetting 3/10 particles
✅ Causal influence tracked for team: [builder, qa, deploy]
```

---

## Success Criteria

### Task #1: Multi-Agent Attribution
- ✅ Causal influence stored in all team outcomes
- ✅ Free-riders detected and penalized
- ✅ Credit ledger maintained across evaluations

### Task #2: Dual-Thread Planning
- ✅ Reactive plan generated <50ms
- ✅ Deep plan completed in background
- ✅ Logs show dual-thread metrics

### Task #3: DeepResearch Pipeline
- ✅ Config loads from environment
- ✅ Validation script runs successfully
- ✅ Missing keys reported clearly

### Task #4: Restart Mechanisms
- ✅ Stagnation detected automatically
- ✅ Restart tokens issued on threshold
- ✅ Particles reset and re-randomized

---

## Deployment Timeline

**Phase 1:** Wait for 1-hour test to complete (currently 45/100)
**Phase 2:** Deploy Shane + Nova in parallel (2-3 hours)
**Phase 3:** Hudson + Cora audits (1 hour)
**Phase 4:** Final integration test (30 min)
**Phase 5:** Production deployment

**Total Time:** 4-5 hours after test completes

---

**Status:** ✅ READY TO DEPLOY
**Waiting For:** 1-hour test completion (55 businesses remaining)
