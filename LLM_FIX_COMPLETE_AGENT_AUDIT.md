# Complete Agent Audit - Methods Needing Async Conversion + LLM Integration
**Date:** 2025-01-XX  
**Scope:** All 28 agents listed by user

## Categories
- **NEEDS CONVERSION**: Business logic methods that need async + LLM integration
- **INFRASTRUCTURE**: Methods that should stay sync (__init__, shutdown, AP2 loops, etc.)
- **UTILITY**: Simple utility methods that don't need LLM (getters, validators, simple helpers)
- **SYNTAX ERROR**: Methods with syntax errors that must be fixed
- **ALREADY COMPLETE**: Methods already async with LLM integration

---

## 1. analyst_agent.py

### NEEDS CONVERSION (1 method)
1. `_request_analytics_service` (line 2206) - **SYNTAX ERROR**: Uses `await` in sync function (line 2214)
   - **Action**: Convert to async, add LLM integration

### INFRASTRUCTURE (Skip)
- `__init__`, `_start_ap2_loop`, `_run_ap2_loop`, `_stop_ap2_loop`, `_execute_ap2_coro`

### UTILITY (Skip)
- `_generate_ap2_secret`

**Total to Convert: 1**

---

## 2. billing_agent.py

### INFRASTRUCTURE (Skip)
- `__init__`, `__del__`

### UTILITY (Skip)
- `validate_amount`, `validate_customer_id`, `amount` (property), `_get_system_instruction`

**Total to Convert: 0** (All are infrastructure/utility)

---

## 3. builder_agent_enhanced.py

### NEEDS CONVERSION (2 methods)
1. `_record_action` (line 314) - Records trajectory actions, could benefit from LLM analysis
2. `_finalize_trajectory` (line 346) - Finalizes trajectory, could benefit from LLM analysis

### INFRASTRUCTURE (Skip)
- `__init__`

### UTILITY (Skip)
- `_get_system_instruction`

**Total to Convert: 2**

---

## 4. commerce_agent.py

### NEEDS CONVERSION (6 methods)
1. `_charge_x402` (line 65) - Payment recording, should be async with LLM
2. `_prepare_x402_metadata` (line 77) - Metadata prep, should be async with LLM
3. `_authorize_staged_payment` (line 355) - Payment authorization, should be async
4. `_capture_staged_payment` (line 373) - Payment capture, should be async
5. `_sign_payload` (line 470) - Security signing, should be async with LLM validation
6. `_verify_signature` (line 478) - Security verification, should be async with LLM validation

### INFRASTRUCTURE (Skip)
- `__init__`, `shutdown`, `_run_ap2_loop`, `_execute_ap2_coro`

### UTILITY (Skip)
- `_get_commerce_budget`, `_reset_budget_if_needed`, `_ensure_commerce_budget` (if sync)

**Total to Convert: 6**

---

## 5. content_agent.py

### NEEDS CONVERSION (4 methods)
1. `_init_memory` (line 358) - Memory initialization, should be async for consistency
2. `_reset_content_budget_if_needed` (line 1260) - Budget management, should be async
3. `_sign_content_payload` (line 1438) - Security signing, should be async with LLM validation
4. `_verify_content_signature` (line 1446) - Security verification, should be async with LLM validation

### INFRASTRUCTURE (Skip)
- `__init__`, `_run_ap2_loop`, `_execute_ap2_coro`

**Total to Convert: 4**

---

## 6. darwin_agent.py

### INFRASTRUCTURE (Skip)
- `__init__`

**Total to Convert: 0** (All async already or infrastructure)

---

## 7. deploy_agent.py

### NEEDS CONVERSION (9 methods)
1. `list_projects` (line 512) - Project listing, should be async with LLM analysis
2. `delete_project` (line 522) - Project deletion, should be async with LLM validation
3. `prepare_deployment_files` (line 1141) - File preparation, should be async with LLM
4. `push_to_github` (line 1199) - GitHub operations, should be async with LLM
5. `deploy_to_github_pages` (line 1299) - Deployment, should be async with LLM
6. `verify_deployment` (line 2001) - Verification, should be async with LLM
7. `_resolve_user_identifier` (line 2323) - User ID resolution, should be async
8. `_sign_infra_payload` (line 2665) - Security signing, should be async with LLM validation
9. `_verify_infra_signature` (line 2673) - Security verification, should be async with LLM validation

### INFRASTRUCTURE (Skip)
- `__init__`, `__post_init__`, decorator functions

### UTILITY (Skip)
- `_get_system_instruction`, `_get_deploy_budget`, `_validate_infrastructure_amount`, `_reset_infra_budget_if_needed`, `_detect_db_cost_spike`, `_estimate_serverless_cost`, `_estimate_deployment_charge`, `_generate_package_json`, `_make_request`, `_record_api_spend`, `_hash_business_id`, `_load_artifacts_from_disk`

**Total to Convert: 9**

---

## 8. domain_name_agent.py

### INFRASTRUCTURE (Skip)
- `__init__`

**Total to Convert: 0** (All async already or infrastructure)

---

## 9. email_agent.py

### INFRASTRUCTURE (Skip)
- `__init__`, `_start_ap2_loop`, `_run_ap2_loop`, `_stop_ap2_loop`, `_execute_ap2_coro`

### UTILITY (Skip)
- `_generate_ap2_secret`

**Total to Convert: 0** (All async already or infrastructure/utility)

---

## 10. emergency_error_specialist_agent.py

### INFRASTRUCTURE (Skip)
- `__init__`

### UTILITY (Skip)
- `_get_system_instruction`

**Total to Convert: 0** (All async already or infrastructure/utility)

---

## 11. finance_agent.py

### INFRASTRUCTURE (Skip)
- `__init__`, `shutdown`, `_run_ap2_loop`, `_execute_ap2_coro`

### UTILITY (Skip)
- `_get_system_instruction`

**Total to Convert: 0** (All async already or infrastructure/utility)

---

## 12. legal_agent.py

### NEEDS CONVERSION (1 method)
1. `_init_memory` (line 89) - Memory initialization, should be async for consistency

### INFRASTRUCTURE (Skip)
- `__init__`

**Total to Convert: 1**

---

## 13. maintenance_agent.py

### NEEDS CONVERSION (2 methods)
1. `route_task` (line 500) - Task routing, should be async with LLM
2. `get_cost_metrics` (line 532) - Cost metrics, should be async with LLM

### INFRASTRUCTURE (Skip)
- `__init__`

**Total to Convert: 2**

---

## 14. marketing_agent.py

### NEEDS CONVERSION (3 methods)
1. `_build_asset_signature` (line 289) - Asset signature building, should be async with LLM
2. `_sign_payload` (line 1435) - Security signing, should be async with LLM validation
3. `_verify_signature` (line 1443) - Security verification, should be async with LLM validation

### INFRASTRUCTURE (Skip)
- `__init__`, `shutdown`, `_run_ap2_loop`, `_execute_ap2_coro`

### UTILITY (Skip)
- `_get_system_instruction`, `_validate_marketing_budget`

**Total to Convert: 3**

---

## 15. onboarding_agent.py

### INFRASTRUCTURE (Skip)
- `__init__`

**Total to Convert: 0** (All async already or infrastructure)

---

## 16. pricing_agent.py

### NEEDS CONVERSION (1 method)
1. `_record_experiment_summary` (line 670) - Records experiment data, could benefit from LLM analysis

### INFRASTRUCTURE (Skip)
- `__init__`, `shutdown`, `_run_ap2_loop`, `_execute_ap2_coro`

### UTILITY (Skip)
- `_get_pricing_budget` (if sync)

**Total to Convert: 1**

---

## 17. qa_agent.py

### NEEDS CONVERSION (1 method)
1. `recall_test_facts` (line 312) - Memory retrieval, could benefit from LLM enhancement

### INFRASTRUCTURE (Skip)
- `__init__`

### UTILITY (Skip)
- `_get_system_instruction`

**Total to Convert: 1**

---

## 18. reflection_agent.py

### UTILITY (Skip)
- `_calculate_overall_score`, `_generate_summary`

### INFRASTRUCTURE (Skip)
- `__init__`

**Total to Convert: 0** (All are utility/infrastructure)

---

## 19. research_discovery_agent.py

### NEEDS CONVERSION (1 method)
1. `_charge_x402` (line 891) - Payment recording, should be async with LLM analysis

### INFRASTRUCTURE (Skip)
- `__init__`, `ArxivCrawler.__init__`, `ResearchFilteringEngine.__init__`, `ResearchAnalysisEngine.__init__`

### UTILITY (Skip)
- `ResearchPaper.to_dict`, `ResearchPaper.from_dict`, `ArxivCrawler._load_sample_papers`

**Total to Convert: 1**

---

## 20. ring1t_reasoning.py

### INFRASTRUCTURE (Skip)
- `__init__`

### UTILITY (Skip)
- `_topological_sort`

**Total to Convert: 0** (All async already or utility)

---

## 21. se_darwin_agent.py

### INFRASTRUCTURE (Skip)
- `BenchmarkLoader.__init__`, `SEDarwinAgent.__init__`, `_init_openhands`, `_init_hgm_cmp`, `_init_spice`

### UTILITY (Skip)
- `get_scenarios_for_agent`, `find_matching_scenario`, `get_all_scenarios`, `CodeQualityValidator.validate_code` and all static validation methods, `_create_baseline_trajectory`, `_create_trajectory_from_operator`, `_convert_spice_to_se_trajectory`, `_check_convergence`, `_record_iteration`

**Total to Convert: 0** (All are infrastructure/utility)

---

## 22. security_agent.py

### UTILITY (Skip)
- `_calculate_security_score`

### INFRASTRUCTURE (Skip)
- `__init__`, `_record_step`

**Total to Convert: 0** (All async already or utility/infrastructure)

---

## 23. seo_agent.py

### NEEDS CONVERSION (2 methods) - **CRITICAL SYNTAX ERRORS**
1. `_charge_x402` (line 109) - **SYNTAX ERROR**: Uses `await` on line 115 in sync function
   - **Action**: Convert to async, add LLM integration
2. `_prepare_x402_metadata` (line 149) - Payment metadata prep, should be async with LLM

### INFRASTRUCTURE (Skip)
- `__init__`, `_run_ap2_loop`, `_execute_ap2_coro`

### UTILITY (Skip)
- `_get_system_instruction`

**Total to Convert: 2** (1 has syntax error)

---

## 24. spec_agent.py

### INFRASTRUCTURE (Skip)
- `__post_init__`, `__init__`

### UTILITY (Skip)
- `_tool_create_spec` (if sync)

**Total to Convert: 0** (All async already or infrastructure/utility)

---

## 25. support_agent.py

### NEEDS CONVERSION (8 methods)
1. `_init_memory` (line 177) - Memory initialization, should be async for consistency
2. `_init_memori_toolset` (line 193) - Toolset initialization, should be async
3. `search_knowledge_base` (line 663) - Knowledge search, should be async with LLM
4. `handle_ticket_workflow` (line 745) - Ticket workflow, should be async with LLM
5. `route_task` (line 951) - Task routing, should be async with LLM
6. `get_cost_metrics` (line 983) - Cost metrics, should be async with LLM
7. `_charge_x402` (line 1125) - Payment recording, should be async with LLM
8. `_prepare_x402_metadata` (line 1148) - Metadata prep, should be async with LLM
9. `_sign_payload` (line 1161) - Security signing, should be async with LLM validation
10. `_verify_signature` (line 1169) - Security verification, should be async with LLM validation

### INFRASTRUCTURE (Skip)
- `__init__`, `shutdown`, `_run_ap2_loop`, `_execute_ap2_coro`

### UTILITY (Skip)
- `_get_support_budget`, `_reset_support_budget_if_needed`, `_ensure_support_budget` (if sync), `get_budget_metrics`, `get_audit_log`, `get_alerts`

**Total to Convert: 10**

---

## 26. waltzrl_conversation_agent.py

**Status:** Wrapper file only - re-exports from `infrastructure.safety.waltzrl_conversation_agent`

**Total to Convert: 0** (No methods in this file)

---

## 27. waltzrl_feedback_agent.py

**Status:** Wrapper file only - re-exports from `infrastructure.safety.waltzrl_feedback_agent`

**Total to Convert: 0** (No methods in this file)

---

## 28. Genesis Meta Agent (infrastructure/genesis_meta_agent.py)

### NEEDS CONVERSION (15 methods)
1. `_install_x402_hooks` (line 337) - Hook installation, should be async
2. `_maybe_reset_x402_window` (line 340) - Window reset, should be async
3. `_append_jsonl` (line 346) - File operations, should be async
4. `_review_x402_payment` (line 350) - Payment review, should be async with LLM
5. `_load_transactions_for_business` (line 435) - Transaction loading, should be async
6. `_estimate_revenue_potential` (line 462) - Revenue estimation, should be async with LLM
7. `_load_business_templates` (line 479) - Template loading, should be async
8. `_decompose_business_to_tasks` (line 489) - Task decomposition, should be async with LLM
9. `_get_builder_prompt` (line 505) - Prompt generation, could benefit from LLM
10. `_get_qa_prompt` (line 526) - Prompt generation, could benefit from LLM
11. `_get_deploy_prompt` (line 544) - Prompt generation, could benefit from LLM
12. `_get_generation_budget_config` (line 604) - Budget config, should be async
13. `_maybe_reset_budget_window` (line 612) - Budget reset, should be async
14. `_estimate_llm_tokens` (line 621) - Token estimation, should be async with LLM
15. `_estimate_generation_cost` (line 631) - Cost estimation, should be async with LLM
16. `_record_actual_generation_cost` (line 701) - Cost recording, should be async
17. `get_daily_cost_alerts` (line 758) - Alerts, should be async with LLM
18. `get_business_costs` (line 761) - Cost retrieval, should be async
19. `get_generation_audit` (line 764) - Audit retrieval, should be async
20. `get_generation_alerts` (line 767) - Alerts, should be async
21. `get_cost_per_business_report` (line 770) - Reporting, should be async with LLM
22. `_sign_generation_payload` (line 778) - Security signing, should be async with LLM validation
23. `_verify_generation_signature` (line 786) - Security verification, should be async with LLM validation
24. `_get_api_prompt` (line 857) - Prompt generation, could benefit from LLM
25. `_get_marketing_prompt` (line 875) - Prompt generation, could benefit from LLM
26. `_write_code_to_files` (line 1021) - File operations, should be async
27. `_hash_business_id` (line 1731) - Hashing utility (can stay sync)
28. `_get_excellence_context` (line 2114) - Context generation, should be async with LLM
29. `_get_emergency_agent` (line 2546) - Agent getter (can stay sync)
30. `_get_mcp_client` (line 2552) - Client getter (can stay sync)
31. `_grant_mcp_access` (line 2558) - Access granting, should be async

### INFRASTRUCTURE (Skip)
- `__init__`, fallback functions

### UTILITY (Skip)
- `_hash_business_id`, `_get_emergency_agent`, `_get_mcp_client` (simple getters)

**Total to Convert: ~25 methods** (Some prompt getters may not need LLM, but should be async)

---

## SUMMARY

### Total Methods Needing Conversion: **~70 methods**

**Breakdown by Agent:**
1. analyst_agent: 1
2. builder_agent_enhanced: 2
3. commerce_agent: 6
4. content_agent: 4
5. deploy_agent: 9
6. legal_agent: 1
7. maintenance_agent: 2
8. marketing_agent: 3
9. pricing_agent: 1
10. qa_agent: 1
11. research_discovery_agent: 1
12. seo_agent: 2 (1 syntax error)
13. support_agent: 10
14. genesis_meta_agent: ~25

**Critical Syntax Errors:**
- `seo_agent._charge_x402` - Uses `await` in sync function
- `analyst_agent._request_analytics_service` - Uses `await` in sync function

**Priority Order:**
1. Fix syntax errors first (seo_agent, analyst_agent)
2. Business-critical methods (payment, security signing)
3. Memory initialization methods
4. Task routing and cost metrics
5. Prompt generation and file operations

---

## Notes

- Many methods are already async but may need LLM integration verification
- Infrastructure methods (__init__, shutdown, AP2 loops) should remain sync
- Utility methods (simple getters, validators) don't need LLM integration
- WaltzRL agents are just wrappers - no conversion needed
- Genesis Meta Agent has the most methods needing conversion (~25)


