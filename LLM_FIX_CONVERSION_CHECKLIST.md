# LLM Fix Conversion Checklist
**Total Methods to Convert: ~70**  
**Status:** In Progress

---

## Critical Syntax Errors (Fix First)

- [x] `analyst_agent._request_analytics_service` (line 2206) - **SYNTAX ERROR**: Uses `await` in sync function
- [x] `seo_agent._charge_x402` (line 109) - **SYNTAX ERROR**: Uses `await` in sync function

---

## analyst_agent.py (1 method)

- [x] `_request_analytics_service` (line 2206)

---

## builder_agent_enhanced.py (2 methods)

- [x] `_record_action` (line 314)
- [x] `_finalize_trajectory` (line 346)

---

## commerce_agent.py (6 methods)

- [x] `_charge_x402` (line 65)
- [x] `_prepare_x402_metadata` (line 77)
- [x] `_authorize_staged_payment` (line 355)
- [x] `_capture_staged_payment` (line 373)
- [x] `_sign_payload` (line 470)
- [x] `_verify_signature` (line 478)

---

## content_agent.py (4 methods)

- [x] `_init_memory` (line 358)
- [x] `_reset_content_budget_if_needed` (line 1260)
- [x] `_sign_content_payload` (line 1438)
- [x] `_verify_content_signature` (line 1446)

---

## deploy_agent.py (9 methods)

- [x] `list_projects` (line 512)
- [x] `delete_project` (line 522)
- [x] `prepare_deployment_files` (line 1141)
- [x] `push_to_github` (line 1199)
- [x] `deploy_to_github_pages` (line 1299)
- [x] `verify_deployment` (line 2001)
- [x] `_resolve_user_identifier` (line 2323)
- [x] `_sign_infra_payload` (line 2665)
- [x] `_verify_infra_signature` (line 2673)

---

## legal_agent.py (1 method)

- [x] `_init_memory` (line 89)

---

## maintenance_agent.py (2 methods)

- [x] `route_task` (line 500)
- [x] `get_cost_metrics` (line 532)

---

## marketing_agent.py (3 methods)

- [x] `_build_asset_signature` (line 289)
- [x] `_sign_payload` (line 1435)
- [x] `_verify_signature` (line 1443)

---

## pricing_agent.py (1 method)

- [x] `_record_experiment_summary` (line 670)

---

## qa_agent.py (1 method)

- [x] `recall_test_facts` (line 312)

---

## research_discovery_agent.py (1 method)

- [x] `_charge_x402` (line 891)

---

## seo_agent.py (2 methods)

- [x] `_charge_x402` (line 109) - **SYNTAX ERROR**
- [x] `_prepare_x402_metadata` (line 149)

---

## support_agent.py (10 methods)

- [x] `_init_memory` (line 177)
- [x] `_init_memori_toolset` (line 193)
- [x] `search_knowledge_base` (line 663)
- [x] `handle_ticket_workflow` (line 745)
- [x] `route_task` (line 951)
- [x] `get_cost_metrics` (line 983)
- [x] `_charge_x402` (line 1125)
- [x] `_prepare_x402_metadata` (line 1148)
- [x] `_sign_payload` (line 1161)
- [x] `_verify_signature` (line 1169)

---

## genesis_meta_agent.py (~25 methods)

- [x] `_install_x402_hooks` (line 337)
- [x] `_maybe_reset_x402_window` (line 340)
- [x] `_append_jsonl` (line 346)
- [x] `_review_x402_payment` (line 350)
- [x] `_load_transactions_for_business` (line 435)
- [x] `_estimate_revenue_potential` (line 462)
- [x] `_load_business_templates` (line 479)
- [x] `_decompose_business_to_tasks` (line 489)
- [x] `_get_builder_prompt` (line 505)
- [x] `_get_qa_prompt` (line 526)
- [x] `_get_deploy_prompt` (line 544)
- [x] `_get_generation_budget_config` (line 604)
- [x] `_maybe_reset_budget_window` (line 612)
- [x] `_estimate_llm_tokens` (line 621)
- [x] `_estimate_generation_cost` (line 631)
- [x] `_record_actual_generation_cost` (line 701)
- [x] `get_daily_cost_alerts` (line 758)
- [x] `get_business_costs` (line 761)
- [x] `get_generation_audit` (line 764)
- [x] `get_generation_alerts` (line 767)
- [x] `get_cost_per_business_report` (line 770)
- [x] `_sign_generation_payload` (line 778)
- [x] `_verify_generation_signature` (line 786)
- [x] `_get_api_prompt` (line 857)
- [x] `_get_marketing_prompt` (line 875)
- [x] `_write_code_to_files` (line 1021)
- [x] `_get_excellence_context` (line 2114)
- [x] `_grant_mcp_access` (line 2558)

---

## Progress

**Completed:** 70/70  
**Remaining:** 0/70
