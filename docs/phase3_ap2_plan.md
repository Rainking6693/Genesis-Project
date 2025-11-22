## Phase 3 AP2 Roadmap

### Overview
- **Goal:** take the frictionless approvals unlocked by batch mandates and extend them across end-to-end business tests, fault-tolerant payment handling, and a consolidated observability surface.
- **Prereqs:** batch approvals shipping ✅, shared QA harness ✅, Phase 2 agents aligned on AP2 receipts ✅.

### Workstream 1 – End-to-End Business Test Suite (Checklist §3.2)
1. **Harness alignment (Day 1):**
   - Use `tests/fixtures/ap2_harness.py` to build common fixtures for the Genesis Meta + Domain + Deploy + Marketing agents.
   - Add factory fixtures in `tests/conftest.py` for “approved purchase” vs “manual required” flows.
2. **Full-business happy path (Day 2):**
   - Create `tests/test_e2e_business_with_ap2.py::test_full_business_generation_with_ap2` that stitches the Genesis Meta Agent, Domain Name Agent, Deploy Agent, Marketing Agent, and Commerce Agent via stubbed connectors.
   - Validate combined receipts, batch approval metadata, and cost aggregation.
3. **Failure + exhaustion scenarios (Day 3):**
   - Marketing budget exhaustion fallback.
   - Domain/hosting success + marketing failure rollback.
   - Ten-business batch run verifying single user prompt and ledger accuracy.
4. **Artifacts:**
   - doc section in `docs/phase3_ap2_plan.md` referencing coverage.
   - Additional checklist ticks under §3.2 once tests land.

### Workstream 2 – AP2 Circuit Breaker (Checklist §3.3)
**Status:** ✅ COMPLETE
- `infrastructure/ap2_circuit_breaker.py` now exposes OPEN/HALF-OPEN/CLOSED states, failure counters, and metrics snapshots per agent.
- `AP2Service` integrates the breaker (`CircuitRegistry`) so repeated connector failures halt further calls until the half-open window elapses; batch events still emit to the monitor.
- Tests:
  - `tests/test_ap2_circuit_breaker.py` exercises state transitions.
  - `tests/test_ap2_service.py::test_circuit_breaker_blocks_after_failures` proves AP2Service short-circuits future requests.

### Workstream 3 – AP2 Observability / Dashboards (Checklist §3.x future)
**Status:** ✅ COMPLETE (baseline exporter)
- `scripts/ap2_dashboard_export.py` now aggregates batch mandate summaries + breaker states into `artifacts/ap2_dashboard.json` for Grafana/PowerBI ingestion.
- Export script handles repo-root imports and writes structured JSON.
- Dashboard payload consumes `AP2BatchApprovalManager.get_summary()` and `AP2CircuitRegistry.summary()`. Additional visual layers (monitor integration, live dashboards) can build on this JSON feed.
- `scripts/ap2_dashboard_server.py` serves the same payload at `http://127.0.0.1:8080/api/ap2/dashboard` so local dashboards can live-update without manual exports.

### Sequencing / Dependencies
| Workstream | Depends On | Target Timeline |
| --- | --- | --- |
| WS1 End-to-End Tests | Batch approvals + QA harness (done) | Week 1 |
| WS2 Circuit Breaker | WS1 fixtures (shared monitor assertions) | Week 2 |
| WS3 Dashboards | WS1 data + WS2 breaker metrics | Week 3 |

### Next Actions
- ✅ Batch approvals + QA harness delivered.
- ▶️ Kick off WS1 by scaffolding `tests/test_e2e_business_with_ap2.py` using the new fixtures.
- Queue WS2/WS3 tasks into the backlog once WS1 structure is in place.*** End Patch

