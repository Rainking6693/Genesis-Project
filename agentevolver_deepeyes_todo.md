# AgentEvolver + DeepEyesV2 Integration TODO

**Last Updated:** November 15, 2025
**Status:** Planning Phase
**Priority:** HIGH (Cost optimization + tool reliability improvements)

---

## AgentEvolver Integration

**Core Mechanisms from Paper:**
1. **Self-Questioning** - Curiosity-driven task generation (reduces manual dataset creation)
2. **Self-Navigating** - Experience reuse + hybrid policy guidance (improves exploration efficiency)
3. **Self-Attributing** - Differentiated rewards based on contribution (enhances sample efficiency)

**Expected Impact:**
- 50% reduction in exploration costs via experience reuse
- Autonomous task generation (no manual scenario creation)
- Faster adaptation to novel business domains
- Better sample utilization in SE-Darwin training

---

### Phase 1: Self-Questioning (Curiosity-Driven Task Generation)

**Goal:** Enable agents to generate novel tasks autonomously without manual dataset construction

- [ ] **Implement self-questioning module** (`infrastructure/agentevolver/self_questioning.py`)
  - [ ] Add curiosity scoring: Rank business ideas by novelty (0-100 score)
  - [ ] Implement exploration frontier: Track unexplored business types/domains
  - [ ] Add question templates: "What if we built X for Y industry?"
  - [ ] Generate 100 novel business ideas per day automatically

- [ ] **Integrate with Business Idea Generator**
  - [ ] Extend `infrastructure/business_idea_generator.py` with curiosity module
  - [ ] Add novelty detection: Compare new ideas to 1,000+ existing businesses
  - [ ] Prioritize unexplored niches (e.g., "AI for agriculture" vs "another SaaS tool")

- [ ] **Connect to HTDAG Planner**
  - [ ] Automatically decompose self-generated tasks into DAG
  - [ ] Validate generated tasks are feasible (not hallucinated)
  - [ ] Filter tasks by complexity (start with simple, progress to complex)

- [ ] **Coverage Tracking**
  - [ ] Measure % of business types explored (SaaS, ecommerce, AI, etc.)
  - [ ] Track domain coverage (healthcare, fintech, education, etc.)
  - [ ] Target: 95% coverage of common business categories in 30 days

**Testing:**
- [ ] Test curiosity scoring generates high-novelty ideas
- [ ] Test exploration frontier prioritizes unexplored domains
- [ ] Test self-generated tasks flow through HTDAG successfully
- [ ] Benchmark: Manual curation time saved (hours per week)

---

### Phase 2: Self-Navigating (Experience Reuse + Hybrid Policy)

**Goal:** Improve exploration efficiency by reusing successful experiences (80% exploit, 20% explore)

- [ ] **Build Experience Replay Buffer** (`infrastructure/agentevolver/experience_buffer.py`)
  - [ ] Index successful agent trajectories by task type
  - [ ] Store state-action sequences with outcomes (quality scores 0-100)
  - [ ] Add semantic similarity search (embed trajectories with TEI)
  - [ ] Size: Store 10,000 trajectories (top 10% by quality)

- [ ] **Implement Hybrid Policy**
  - [ ] 80% EXPLOIT: Reuse experiences from buffer (if similar task exists)
  - [ ] 20% EXPLORE: Try new approaches (even if no match in buffer)
  - [ ] Add experience transfer: Marketing Agent learns from past campaigns
  - [ ] Track hit rate: % of tasks with relevant experience in buffer

- [ ] **Integrate with TrajectoryPool**
  - [ ] Use existing `infrastructure/trajectory_pool.py` as storage backend
  - [ ] Add experience retrieval API: `get_similar_trajectories(task_embedding)`
  - [ ] Rank experiences by similarity + quality score
  - [ ] Return top-5 most relevant experiences for new task

- [ ] **Multi-Agent Experience Sharing**
  - [ ] Deploy Agent learns from previous deployments (Railway, Vercel, etc.)
  - [ ] Marketing Agent reuses successful campaign templates
  - [ ] Content Agent reuses blog post structures
  - [ ] Track cross-business transfer learning success rate

**Testing:**
- [ ] Test experience buffer stores 10,000 trajectories
- [ ] Test semantic search retrieves relevant experiences (>80% accuracy)
- [ ] Test hybrid policy reduces redundant exploration
- [ ] Benchmark: % reduction in LLM calls via experience reuse (target: 50%)

---

### Phase 3: Self-Attributing (Contribution-Based Rewards)

**Goal:** Assign differentiated rewards to states/actions based on their contribution to success

- [ ] **Implement State-Action Attribution** (`infrastructure/agentevolver/attribution.py`)
  - [ ] Calculate contribution score for each agent action (0-100)
  - [ ] Use counterfactual reasoning: "What if we skipped this action?"
  - [ ] Example: Domain registration contributes 20%, marketing 30%, SEO 15%, etc.

- [ ] **Credit Assignment System**
  - [ ] Track which agent actions led to high-quality businesses (score >90)
  - [ ] Identify bottlenecks: Which agent actions cause failures?
  - [ ] Rank actions by impact: prioritize high-contribution experiences

- [ ] **Integrate with Business Monitor**
  - [ ] Add attribution logging to `infrastructure/business_monitor.py`
  - [ ] Expose attribution metrics in dashboard (which agents add most value?)
  - [ ] Track attribution over time (are agents improving?)

- [ ] **Feed to SE-Darwin for Targeted Improvement**
  - [ ] Prioritize high-impact experiences in training data
  - [ ] Focus ES training on actions with low attribution scores (need improvement)
  - [ ] Measure: Does attribution-based training improve faster than random sampling?

**Testing:**
- [ ] Test attribution assigns credit correctly (manual validation on 10 businesses)
- [ ] Test counterfactual reasoning identifies critical actions
- [ ] Test SE-Darwin performance with attribution-weighted training
- [ ] Benchmark: Convergence speed with vs without attribution (target: 30% faster)

---

### Phase 4: Integration with Existing Genesis Systems

- [ ] **Evaluate AgentEvolver Codebase**
  - [ ] Clone AgentEvolver repository
  - [ ] Identify reusable components (self-questioning, attribution, hybrid policy)
  - [ ] Map AgentEvolver APIs to Genesis infrastructure

- [ ] **Build Ingestion Pipeline**
  - [ ] Convert AgentEvolver outputs to TrajectoryPool format
  - [ ] Add schema validation (ensure compatibility)
  - [ ] Handle edge cases (malformed scenarios, invalid tasks)

- [ ] **Scheduling and Refresh**
  - [ ] Add daily job: Generate 100 new scenarios via self-questioning
  - [ ] Push scenarios to DreamGym/Hybrid buffer
  - [ ] Archive old scenarios (keep last 10,000)

- [ ] **Quality Filter**
  - [ ] Validate scenarios meet minimum diversity threshold (>70% novelty)
  - [ ] Validate scenarios meet minimum difficulty threshold (not too easy/hard)
  - [ ] Reject hallucinated or infeasible scenarios

- [ ] **Baseline Metrics**
  - [ ] Measure business generation success rate: Manual vs auto-generated scenarios
  - [ ] Measure cost: LLM tokens used for exploration
  - [ ] Measure quality: Average business score (0-100)

- [ ] **Monitoring and Tracking**
  - [ ] Extend BusinessMonitor to track benchmark coverage
  - [ ] Add GENESIS_TASKS dashboard for scenario generation metrics
  - [ ] Alert when scenario diversity drops below 70%

- [ ] **Integration with SE-Darwin**
  - [ ] Connect to `infrastructure/se_darwin_agent.py:120` (BenchmarkScenarioLoader)
  - [ ] Validate AgentEvolver scenarios flow through ES training
  - [ ] Compare performance: ES training with/without AgentEvolver scenarios

**Testing:**
- [ ] Test ingestion pipeline handles 100 scenarios per day
- [ ] Test quality filter rejects <30% of low-quality scenarios
- [ ] Test SE-Darwin training improves with AgentEvolver scenarios
- [ ] E2E test: Self-question → scenario → SE-Darwin → improved agent

---

### Phase 5: Cost Optimization via Efficient Exploration

**Goal:** Reduce wasted LLM calls by reusing experiences instead of random exploration

- [ ] **Measure Baseline Exploration Costs**
  - [ ] Track LLM tokens per business generation attempt
  - [ ] Measure failure rate: % of attempts that fail or score <70
  - [ ] Calculate cost: Failed attempts × average LLM cost

- [ ] **Implement Efficient Exploration**
  - [ ] Use experience buffer to avoid re-exploring known failures
  - [ ] Use hybrid policy (80% exploit) to reduce random exploration
  - [ ] Use attribution to focus exploration on high-impact areas

- [ ] **Track Cost Savings**
  - [ ] Compare LLM costs: Baseline (random) vs AgentEvolver (efficient)
  - [ ] Measure reduction in failed attempts (via experience reuse)
  - [ ] Calculate ROI: Implementation cost vs monthly savings

- [ ] **Performance Targets**
  - [ ] 50% reduction in exploration costs (LLM tokens)
  - [ ] 30% reduction in failed business generation attempts
  - [ ] 20% improvement in average business quality score

**Testing:**
- [ ] Benchmark baseline: 100 businesses without AgentEvolver
- [ ] Benchmark optimized: 100 businesses with AgentEvolver
- [ ] Compare costs, success rates, quality scores
- [ ] Calculate monthly savings at 100 businesses/month scale

---

## DeepEyesV2 Tool Reliability

**Core Contribution from Paper:**
- **Two-Stage Training:** Cold-start SFT (establish tool-use patterns) → RL refinement (optimize invocation)
- **Key Insight:** RL alone cannot reliably produce tool-use behavior (cold-start problem)

**Expected Impact:**
- Higher tool invocation success rates (target: 95%+)
- Intelligent tool selection based on task requirements
- Complex tool chaining (multiple tools per task)
- Reduced tool failures and retries

---

### Phase 1: Baseline Measurement

- [ ] **Measure Current Tool Invocation Success Rates**
  - [ ] Audit all 21 agents for tool usage (which tools, how often, success rate)
  - [ ] Track failures: timeout, API errors, invalid parameters, wrong tool selected
  - [ ] Calculate baseline success rate per agent:
    - Builder Agent: Code execution tools
    - Research Agent: Web search tools
    - QA Agent: Test execution tools
    - Deploy Agent: Railway/Vercel API tools
    - Marketing Agent: Ad platform APIs
    - SEO Agent: Ahrefs/SEMrush APIs
    - Content Agent: Stock image/video APIs
  - [ ] Target baseline: 60-80% success rate (before enhancement)

**Testing:**
- [ ] Run 1,000 tool invocations per agent type
- [ ] Log all failures with stack traces
- [ ] Categorize failure types (timeout, API error, wrong tool, etc.)
- [ ] Create failure distribution report

---

### Phase 2: Supervised Fine-Tuning (Cold-Start Stage)

**Goal:** Establish reliable tool-use patterns via supervised learning

- [ ] **Collect Supervised Dataset** (`data/tool_invocations/`)
  - [ ] Mine agent logs for successful tool invocations
  - [ ] Extract: (task description, tool selected, parameters, result)
  - [ ] Filter: Keep only successful invocations (status=200, valid output)
  - [ ] Target: 10,000 successful examples per agent type

- [ ] **Implement Cold-Start SFT Fine-Tuning**
  - [ ] File: `infrastructure/tool_reliability/cold_start_sft.py`
  - [ ] Use Unsloth for efficient LoRA fine-tuning
  - [ ] Fine-tune target agents: Builder, Research, QA, Deploy (highest tool usage)
  - [ ] Train model to predict: "Given task X, use tool Y with parameters Z"

- [ ] **Validate SFT Model**
  - [ ] Test on held-out validation set (20% of dataset)
  - [ ] Measure: Tool selection accuracy (correct tool chosen?)
  - [ ] Measure: Parameter accuracy (correct parameters generated?)
  - [ ] Target: 90%+ tool selection accuracy

**Testing:**
- [ ] Test SFT model on 1,000 validation tasks
- [ ] Compare to baseline: % improvement in tool selection
- [ ] Test edge cases: ambiguous tasks, multiple valid tools
- [ ] Measure inference latency (<200ms per prediction)

---

### Phase 3: Reinforcement Learning Refinement

**Goal:** Optimize tool invocation via RL (building on SFT foundation)

- [ ] **Layer RL on Top of SFT Model**
  - [ ] File: `infrastructure/tool_reliability/rl_refinement.py`
  - [ ] Re-use Binary RAR (infrastructure/binary_rar.py) for rewards
  - [ ] Re-use Reflection Agent rewards (quality scoring)
  - [ ] Policy: SFT model + RL policy head

- [ ] **Define Reward Function**
  - [ ] +1.0 for successful tool invocation (status=200, valid output)
  - [ ] -0.5 for failed invocation (retry penalty)
  - [ ] +0.5 bonus for selecting optimal tool (fastest/cheapest)
  - [ ] +0.2 bonus for complex tool chaining (multiple tools)

- [ ] **RL Training Loop**
  - [ ] Sample task from dataset
  - [ ] SFT+RL model predicts tool + parameters
  - [ ] Execute tool invocation (real or simulated)
  - [ ] Compute reward based on outcome
  - [ ] Update policy via PPO/REINFORCE

- [ ] **Convergence Criteria**
  - [ ] Train until validation success rate >95%
  - [ ] Early stopping if no improvement for 1,000 steps
  - [ ] Save best checkpoint (highest validation accuracy)

**Testing:**
- [ ] Test RL model on 1,000 validation tasks
- [ ] Compare to SFT-only baseline (RL should improve by 5-10%)
- [ ] Test complex tool chaining (multiple tools per task)
- [ ] Measure convergence time (target: <24 hours on single GPU)

---

### Phase 4: RealX-Bench Evaluation

**Goal:** Evaluate on multimodal reasoning benchmark introduced in DeepEyesV2 paper

- [ ] **Obtain RealX-Bench Dataset**
  - [ ] Download from DeepEyesV2 repository
  - [ ] Convert to Genesis task format
  - [ ] Split: 80% train, 10% validation, 10% test

- [ ] **Evaluate Baseline (Before Enhancement)**
  - [ ] Run current agents on RealX-Bench test set
  - [ ] Measure: Task completion rate, tool success rate, quality score
  - [ ] Establish baseline metrics

- [ ] **Evaluate Enhanced Model (SFT + RL)**
  - [ ] Run enhanced agents on RealX-Bench test set
  - [ ] Measure: Task completion rate, tool success rate, quality score
  - [ ] Compare to baseline

- [ ] **Performance Targets**
  - [ ] Tool success rate: 60-80% (baseline) → 95%+ (enhanced)
  - [ ] Task completion rate: 50-70% (baseline) → 85%+ (enhanced)
  - [ ] Quality score: 70/100 (baseline) → 85/100 (enhanced)

**Testing:**
- [ ] Run 500 RealX-Bench tasks with baseline agents
- [ ] Run 500 RealX-Bench tasks with enhanced agents
- [ ] Statistical significance test (p < 0.05 for improvements)
- [ ] Create evaluation report with charts

---

### Phase 5: Integration and Deployment

- [ ] **Update Agent Tool Middleware**
  - [ ] File: `infrastructure/agent_tool_middleware.py`
  - [ ] Route tool invocations through SFT+RL model
  - [ ] Add fallback: If enhanced model fails, use original logic

- [ ] **Add Tool Failure Handling**
  - [ ] Implement retry logic with exponential backoff (1s, 2s, 4s, 8s)
  - [ ] Max retries: 3 attempts before giving up
  - [ ] Log all failures to BusinessMonitor for analysis

- [ ] **Regression Tests**
  - [ ] File: `tests/test_tool_reliability.py`
  - [ ] Test suite: 100 tool invocations per agent type
  - [ ] Assert: Success rate >95% (post-enhancement)
  - [ ] Assert: No regression in quality scores

- [ ] **A/B Testing in Production**
  - [ ] Deploy to 10% of traffic (canary release)
  - [ ] Monitor: Tool success rates, error rates, latency
  - [ ] Compare: Control (old) vs Treatment (enhanced)
  - [ ] Rollout to 100% if metrics improve by >10%

**Testing:**
- [ ] Test middleware routes to enhanced model correctly
- [ ] Test fallback logic activates on model failure
- [ ] Test retry logic with exponential backoff
- [ ] E2E test: Full business generation with enhanced tools

---

### Phase 6: Multimodal Extensions (Future)

**Goal:** Extend to vision tasks (OCR, screenshot analysis, diagram interpretation)

- [ ] **Add Image Perception Tools**
  - [ ] Integrate DeepSeek-OCR (already in Genesis: Integration #48)
  - [ ] Add screenshot analysis for Computer Use agent
  - [ ] Add diagram interpretation for Builder agent (read architecture diagrams)

- [ ] **Add Web Search Tools**
  - [ ] Integrate web search API (Research Agent already uses this)
  - [ ] Add image search (find relevant diagrams, UI examples)
  - [ ] Add video search (find tutorial videos)

- [ ] **Complex Tool Chaining**
  - [ ] Example: Screenshot → OCR → text extraction → code generation
  - [ ] Example: Task → web search → find examples → adapt to Genesis
  - [ ] Track: How often agents chain multiple tools successfully

**Testing:**
- [ ] Test OCR accuracy on 100 screenshots (target: >90%)
- [ ] Test tool chaining: 3+ tools per complex task
- [ ] Benchmark: Task completion rate for multimodal tasks

---

## References

- **AgentEvolver Paper:** https://arxiv.org/abs/2511.10395
  - Title: "Towards Efficient Self-Evolving Agent System"
  - Key Mechanisms: Self-Questioning, Self-Navigating, Self-Attributing

- **DeepEyesV2 Paper:** https://arxiv.org/abs/2511.05271
  - Title: "Toward Agentic Multimodal Model"
  - Key Contribution: Two-stage training (SFT cold-start → RL refinement)
  - Benchmark: RealX-Bench (multimodal reasoning)

---

## Implementation Priority

**HIGH PRIORITY (Implement First):**
1. AgentEvolver Phase 2 (Experience Reuse) - 50% cost reduction
2. DeepEyesV2 Phase 2 (Cold-Start SFT) - 95% tool success rate
3. AgentEvolver Phase 5 (Cost Optimization) - ROI tracking

**MEDIUM PRIORITY (Implement Second):**
4. AgentEvolver Phase 1 (Self-Questioning) - Autonomous scenario generation
5. DeepEyesV2 Phase 3 (RL Refinement) - Optimize tool selection
6. AgentEvolver Phase 3 (Attribution) - Credit assignment

**LOW PRIORITY (Future Work):**
7. DeepEyesV2 Phase 6 (Multimodal) - Vision tasks
8. AgentEvolver Phase 4 (Full Integration) - Polish and monitoring

---

## Success Metrics

**AgentEvolver Success Criteria:**
- [ ] 50% reduction in LLM exploration costs
- [ ] 30% reduction in failed business generation attempts
- [ ] 95% coverage of common business categories
- [ ] 20% improvement in average business quality score

**DeepEyesV2 Success Criteria:**
- [ ] 95%+ tool invocation success rate (from 60-80% baseline)
- [ ] 85%+ task completion rate on RealX-Bench
- [ ] 15-point improvement in quality scores (70 → 85)
- [ ] <200ms tool selection latency

**ROI Targets:**
- **AgentEvolver:** Break-even in 2 months ($10K implementation, $5K/month savings)
- **DeepEyesV2:** Break-even in 1 month ($8K implementation, $8K/month savings from reduced failures)

---

## Integration with Existing Genesis Systems

**AgentEvolver Integrates With:**
- TrajectoryPool (experience storage)
- SE-Darwin (training data generation)
- Business Idea Generator (curiosity-driven tasks)
- HTDAG Planner (task decomposition)
- Business Monitor (attribution tracking)

**DeepEyesV2 Integrates With:**
- All 21 agents (tool middleware)
- Binary RAR (reward function)
- Reflection Agent (quality scoring)
- Unsloth (fine-tuning infrastructure)
- Business Monitor (failure tracking)

---

**Status:** Ready for implementation planning
**Next Steps:** Prioritize Phase 2 tasks for both systems (highest ROI)
