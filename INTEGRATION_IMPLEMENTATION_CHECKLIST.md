# Integration Implementation Checklist
**Based on:** CORA_AUDIT_INTEGRATION_ROADMAP_NOV8.md
**Timeline:** 4 weeks (Phase 5A-B)
**Status Tracking:** Update this file as tasks complete

---

## P0 BLOCKERS (Must Complete Before Production)

### Week 1: Middleware Foundation

- [ ] **Create Test Infrastructure** (3 days)
  - [ ] `tests/middleware/__init__.py`
  - [ ] `tests/middleware/conftest.py` (shared fixtures)
  - [ ] `tests/middleware/test_base.py` (10 tests)
  - [ ] `tests/middleware/test_policy_middleware.py` (15 tests)
  - [ ] `tests/middleware/test_capability_middleware.py` (12 tests)
  - [ ] `tests/middleware/test_toolrm_middleware.py` (18 tests)
  - [ ] **Target:** 55+ executable tests, 100% pass rate

- [ ] **Implement Middleware Classes** (4 days)
  - [ ] `infrastructure/middleware/policy_middleware.py` (~200 lines)
  - [ ] `infrastructure/middleware/capability_middleware.py` (~180 lines)
  - [ ] `infrastructure/middleware/toolrm_middleware.py` (~250 lines)
  - [ ] `infrastructure/reasoning_bank.py` (~150 lines)
  - [ ] **Validation:** All tests pass, <5ms overhead

- [ ] **Create Integration Directories** (1 day)
  - [ ] `.policy_cards/` directory
  - [ ] `.policy_cards/qa_agent.json`
  - [ ] `.policy_cards/builder_agent.json`
  - [ ] `.policy_cards/deploy_agent.json` (all 15 agents)
  - [ ] `maps/capabilities/` directory
  - [ ] `maps/capabilities/agent_capabilities.json`

### Week 1: Skyvern Setup

- [ ] **Create Docker Configuration** (2 days)
  - [ ] `docker-compose.skyvern.yml` (or merge into existing)
  - [ ] `skyvern_tasks/` directory
  - [ ] `skyvern_tasks/submit_product_hunt.yaml`
  - [ ] `skyvern_tasks/submit_betalist.yaml`
  - [ ] `skyvern_tasks/submit_hackernews.yaml`
  - [ ] `skyvern_workflows/` directory
  - [ ] **Test:** `docker-compose -f docker-compose.skyvern.yml up -d`

- [ ] **Implement Skyvern Client** (2 days)
  - [ ] `infrastructure/browser_automation/__init__.py`
  - [ ] `infrastructure/browser_automation/skyvern_client.py` (~300 lines)
  - [ ] `tests/browser_automation/__init__.py`
  - [ ] `tests/browser_automation/test_skyvern.py` (10 tests)
  - [ ] **Test:** Submit to Product Hunt (staging)

---

## P1 HIGH PRIORITY (Should Complete for Quality)

### Week 2: Integration & Monitoring

- [ ] **HALO Router Integration** (2 days)
  - [ ] Update `infrastructure/halo_router.py` (add middleware support)
  - [ ] Integration tests: `tests/integration/test_middleware_halo.py` (20 tests)
  - [ ] Validate no regressions on existing 4,512 tests
  - [ ] **Validation:** `pytest tests/test_halo_router.py` passes

- [ ] **Add Monitoring Infrastructure** (2 days)
  - [ ] `infrastructure/middleware/prometheus_exporter.py`
  - [ ] `monitoring/grafana/middleware_dashboard.json`
  - [ ] `monitoring/alerts/middleware_alerts.yml`
  - [ ] Update `docker-compose.yml` (add Prometheus/Grafana if missing)
  - [ ] **Test:** Access Grafana at http://localhost:3000

- [ ] **Deployment Automation** (1 day)
  - [ ] `scripts/deploy_skyvern.sh`
  - [ ] `scripts/health_check_skyvern.sh`
  - [ ] Update `railway.toml` (add Skyvern service if deploying to Railway)
  - [ ] Update `render.yaml` (add Skyvern service if deploying to Render)
  - [ ] **Test:** Deploy to staging, validate health checks

- [ ] **MarketingAgent Integration** (2 days)
  - [ ] Update `agents/marketing_agent.py` (integrate SkyvernClient)
  - [ ] Add `submit_to_product_hunt()` method
  - [ ] Add `submit_to_betalist()` method
  - [ ] Integration tests: `tests/agents/test_marketing_agent.py` (10 tests)
  - [ ] **Validation:** Successful submission to 1 directory

---

## Week 3-4: Evolution Strategies (Optional)

### Week 3: ES Implementation

- [ ] **ES Optimizer** (2 days)
  - [ ] `infrastructure/evolution_strategies/__init__.py`
  - [ ] `infrastructure/evolution_strategies/es_optimizer.py` (~400 lines)
  - [ ] `infrastructure/evolution_strategies/fitness.py` (~250 lines)
  - [ ] `tests/evolution_strategies/__init__.py`
  - [ ] `tests/evolution_strategies/test_es_optimizer.py` (15 tests)
  - [ ] **Test:** Run on toy optimization problem

### Week 3: Nightly Training Setup

- [ ] **Training Script** (2 days)
  - [ ] `scripts/nightly_es_training.py` (~150 lines)
  - [ ] Test locally with `--iterations 2 --population 4`
  - [ ] Validate model improvements
  - [ ] **Validation:** Training completes without errors

### Week 4: Production Deployment

- [ ] **Railway/Render Cron** (1 day)
  - [ ] Update `railway.toml` (add ES training cron)
  - [ ] Update `render.yaml` (add ES training cron)
  - [ ] Configure environment variables (model paths, API keys)
  - [ ] **Test:** Trigger cron manually, validate execution

- [ ] **Monitoring & Alerting** (1 day)
  - [ ] `monitoring/alerts/es_training_alerts.yml`
  - [ ] Grafana dashboard for training progress
  - [ ] Slack/email notifications on training failures
  - [ ] **Test:** Trigger alert manually

---

## P2 IMPROVEMENTS (Nice to Have)

### Week 3-4: Optimizations

- [ ] **Middleware Optimizations**
  - [ ] Middleware dependency ordering validation
  - [ ] Context propagation between middleware
  - [ ] Parallel execution with `asyncio.gather()`
  - [ ] Benchmark overhead reduction

- [ ] **Structured Logging**
  - [ ] JSON logging schema
  - [ ] Log aggregation (Loki/CloudWatch)
  - [ ] Log retention policies

- [ ] **Documentation**
  - [ ] API documentation (middleware classes)
  - [ ] Deployment runbooks
  - [ ] Troubleshooting guides

---

## VALIDATION CHECKLIST (Before Production)

### Testing
- [ ] Unit tests: 70+ tests passing (100% pass rate)
- [ ] Integration tests: 20+ tests passing
- [ ] E2E tests: 10+ tests passing
- [ ] Regression tests: 4,512 existing tests still passing (no regressions)
- [ ] Performance benchmarks: Middleware overhead <5ms

### Deployment
- [ ] Skyvern Docker service running (health check passing)
- [ ] Middleware integrated into HALO router
- [ ] Prometheus/Grafana dashboards operational
- [ ] Alerting rules configured (Alertmanager)
- [ ] Railway/Render deployments successful

### Integration
- [ ] PolicyCardMiddleware loading `.policy_cards/` correctly
- [ ] CapabilityMapMiddleware loading `maps/capabilities/` correctly
- [ ] ToolRMMiddleware logging OTEL traces
- [ ] SkyvernClient submitting to Product Hunt successfully
- [ ] MarketingAgent using Skyvern for directory submissions

### Monitoring
- [ ] Middleware overhead metrics visible in Grafana
- [ ] Skyvern success rate metrics visible
- [ ] ES training progress tracked
- [ ] Alerts triggering correctly (test manually)

---

## SUCCESS METRICS (Week 4 Validation)

### Middleware
- ✅ 100% of tool calls go through middleware
- ✅ 0 policy violations in production
- ✅ <5ms middleware overhead (P95)
- ✅ 100% audit trail coverage (OTEL traces)

### Skyvern
- ✅ ≥90% directory submission success rate
- ✅ ≥5 directory submission flows automated
- ✅ <2 minutes average submission time
- ✅ Zero manual retries needed

### Evolution Strategies (if implemented)
- ✅ 5-10% task performance improvement per week
- ✅ <8GB VRAM for nightly training
- ✅ Successful rollback if model degrades
- ✅ Automated nightly runs (zero manual intervention)

---

## RISK MITIGATION

### Feature Flags
- [ ] Middleware can be disabled per agent (feature flag)
- [ ] Skyvern can be disabled (fallback to Playwright)
- [ ] ES training can be paused (manual override)

### Rollback Plan
- [ ] Middleware rollback: Remove from HALORouter initialization
- [ ] Skyvern rollback: Stop Docker container
- [ ] ES rollback: Revert to previous model checkpoint

### Health Checks
- [ ] Skyvern health check: `curl http://localhost:8000/health`
- [ ] Middleware health: Check OTEL traces, Prometheus metrics
- [ ] ES health: Check training logs, model performance

---

## WEEKLY STATUS UPDATES

### Week 1 Status (Target: 50% P0 Complete)
- [ ] Middleware foundation: ___/4 files created
- [ ] Test infrastructure: ___/55 tests passing
- [ ] Skyvern Docker: ___/5 files created

### Week 2 Status (Target: 100% P0 Complete, 50% P1 Complete)
- [ ] HALO integration: ___/20 integration tests passing
- [ ] Monitoring: ___/3 dashboards operational
- [ ] Deployment automation: ___/3 scripts created

### Week 3 Status (Target: ES Implementation)
- [ ] ES optimizer: ___/2 files created
- [ ] ES tests: ___/15 tests passing
- [ ] Training script: ___/1 script created

### Week 4 Status (Target: Production Deployment)
- [ ] Cron jobs: ___/2 jobs scheduled
- [ ] Monitoring: ___/2 alert rules configured
- [ ] Validation: ___/5 success metrics met

---

## SIGN-OFF CHECKLIST

### Before Merging to Main
- [ ] All P0 blockers resolved
- [ ] Code review by Hudson (8.0+ score)
- [ ] Integration testing by Alex (9.0+ score)
- [ ] E2E validation by Forge (9.0+ score)
- [ ] No regressions on existing tests (4,512 tests passing)

### Before Production Deployment
- [ ] All P1 high priority items resolved
- [ ] Performance benchmarks meet targets
- [ ] Monitoring dashboards operational
- [ ] Alerting rules configured
- [ ] Rollback plan tested

### Post-Deployment (Week 5+)
- [ ] Monitor middleware overhead (target <5ms)
- [ ] Monitor Skyvern success rate (target ≥90%)
- [ ] Monitor ES training improvements (target 5-10%/week)
- [ ] User feedback collected
- [ ] Incident response tested

---

**Last Updated:** 2025-11-08
**Next Review:** After Week 1 completion
**Owner:** Implementation team (assigned per AGENT_PROJECT_MAPPING.md)
