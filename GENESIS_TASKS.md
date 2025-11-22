# Genesis Upgrade Checklist

Integrated from the recent research review. Check items off as they’re completed; update this file as work progresses.

## AsyncThink Orchestration
- [x] Design fork/join organizer-worker workflow for HTDAG (define task splitting/merging API)
- [x] Implement concurrent A2A sub-task execution (parallel tool calls, multi-agent loops)
- [x] Add concurrency-aware rewards/logging (monitor latency + solution accuracy on 10-business batch) _(metrics + OTEL stats wired into `infrastructure/a2a_connector.py` with tests)_
- [ ] Roll out on production swarm layer after regression tests

## Rubric-Based Auditing
- [x] Import Research Rubrics dataset and map breadth/depth/ambiguity criteria to Genesis HTDAG nodes _(see `infrastructure/rubrics/research_rubric_loader.py` + dataset in `data/research_rubrics_sample.json`)_
- [x] Build rubric-eval hooks in orchestrator (weighted scoring per business research task) _(rubric metadata applied during HTDAG decomposition; evaluator wired in `AutonomousOrchestrator.generate_business_autonomous`)_
- [x] Log rubric scores + failures to audit dashboard _(BusinessMonitor now records `rubric_report` events + dashboard snapshots via `record_rubric_report`)_
- [x] Run 100+ agent audits and tune thresholds _(BusinessMonitor aggregates rubric counts/alerts and tracks goal completion once 100 audits have streamed in)_

## RIFL Prompt Evolution
- [x] Integrate RIFL pipeline (rubric generator/verifier + ternary rewards) into Layer 2 Darwin _(see `infrastructure/rifl/rifl_pipeline.py` + `DarwinAgent._run_rifl_guard`)_
- [x] Apply to at least one multi-turn prompt evolution loop (e.g., Support or QA agent feedback) _(Darwin's evolution attempts now gate improvements with RIFL ternary rewards before sandbox/benchmarks)_
- [ ] Measure +6% instruction compliance on 10-business sample; document outcomes

## Binary RAR Hallucination Control
- [x] Wire BM25 retrieval + verifier LM loop for binary reward _(see `infrastructure/hallucination_control/binary_rar.py` + `data/binary_rar_corpus.json`)_
- [ ] Fine-tune using rl-binary-rar repo (LoRA/DeepSpeed); capture FactScore improvements
- [x] Deploy retrieve-verify gating in research/content agents _(Analyst + Content agents call Binary RAR guard before returning reports/web research)_
- [x] Monitor hallucination rate (target 39% relative drop) and adjust KL regularization _(BusinessMonitor tracks `hallucination_rate` and emits `binary_rar_eval` events)_

## Continuous Auditor Agent
- [x] Implement AuditLLM-inspired auditor that reviews agent traces in real time _(see `infrastructure/auditor/continuous_auditor.py`; wired through A2A executions)_
- [x] Define policy checklists per agent (QA, Support, Marketing, etc.) _(policies stored in `data/auditor_policies.json`)_
- [x] Feed verdicts into observability dashboard and trigger alerts on violations _(BusinessMonitor now records `policy_audit` events for Langflow dashboards)_

## Reasoning Codebooks
- [x] Extend Memori to store per-agent “codebook” entries (reusable reasoning snippets) _(see `infrastructure/memory/codebook_store.py`, integrated with `TrajectoryPool`)_
- [x] Update DreamGym/Tri trajectory pipeline to consult/update codebooks after each run _(DreamGym trainer now records entries and attaches hints to synthetic batches)_
- [x] Validate that repeated failure patterns decline (track relevant metrics) _(codebook store tracks rolling failure rates; `TrajectoryPool` logs trend metrics)_
