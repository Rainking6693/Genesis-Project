## Phase 2 AP2 Coverage Plan

| Agent | Key Purchases | Planned Work | Test Coverage |
| --- | --- | --- | --- |
| SEO Agent (✅ done) | SERP APIs, backlink monitors, keyword databases | AP2 wiring shipped (`seo_agent` now tracks Ahrefs/SEMrush/AccuRanker spend with signatures) | `tests/test_seo_agent_ap2.py` covers approvals, alerts, failure stops |
| Support Agent (✅ done) | Helpdesk seats, voice minutes, QA labeling services | Zendesk/Twilio/PagerDuty flows issue AP2 receipts with alerts + signatures | `tests/test_support_agent_ap2.py` validates seat approvals, voice overages, failure halts |
| Pricing Agent (✅ done) | Benchmark datasets, elasticity experiments | New `pricing_agent` auto-signs dataset + elasticity spend, exposes receipts | `tests/test_pricing_agent_ap2.py` covers dataset, manual flags, cycle receipts |
| Finance Agent (✅ done) | Payroll processors, bank fees | `finance_agent` budgets payroll/vendor/bank fees with audit log exports | `tests/test_finance_agent_ap2.py` checks payroll, vendor manual review, close cycle |
| Commerce Agent (✅ done) | Payment gateways, tax engines | `commerce_agent` enforces AP2 approvals for domains, gateways, fulfillment | `tests/test_commerce_agent_ap2.py` spans domain, gateway, tax, fulfillment receipts |

Deliverables:
1. Instrument each agent with shared `ap2_receipts` helpers + HMAC signatures.
2. Expand `tests/phase2` suite for autop/manual, audit logs, and failure halts per agent.
3. Update `AP2_INTEGRATION_CHECKLIST.md` with Phase 2 rows once implementation starts.

