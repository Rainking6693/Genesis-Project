# Genesis Agent System Enhancement Plan


## Current State Analysis

### Check if Exists (Don't build if so)
- [x] Dynamic Agent Creation (`infrastructure/dynamic_agent_creator.py`) - Base creator exists
- [x] Post-Deployment Framework (`infrastructure/genesis_meta_agent.py` lines 2361-2407) - Structure exists, needs implementation
- [x] GitHub Integration (`agents/deploy_agent.py`) - Has `push_to_github()`; GitHub Pages method added
- [x] Agent Selection (`infrastructure/genesis_meta_agent.py` line 1544) - `_select_agent_for_component()` works

### What's Missing (Needs Implementation)
- Chrome DevTools MCP integration (client built; not wired into agents/genesis)
- Post-deployment agent assignment implementation (TODOs exist)
- Day-to-day operations initialization
- Genesis excellence instructions (comprehensive)
- Active oversight/intervention during builds
- Emergency Error Specialist integration (agent built; wired into validation)
- Website-specific agent management system

### Audit Status (2025-11-23)
- Phase 1: Chrome DevTools MCP client created (needs integration)
- Phase 3: Emergency Error Specialist agent implemented (needs registration)
- Phase 4: Excellence instructions added to core agents (marketing, SEO, billing, QA, deploy); others pending
- Phase 7: GitHub Pages support added in Deploy Agent/DeploymentConfig; meta-agent wiring pending
- Phases 2, 5, 6, 8, 9: Not implemented

---

## Implementation Phases

### Phase 8: Genesis Meta Agent Excellence Instructions

**Goal**: Make Genesis believe it's world-class at every aspect of business lifecycle

- [] **8.1** Create comprehensive excellence instruction template covering:
  - [] Idea generation excellence
  - [] Website creation excellence
  - [] Build oversight excellence
  - [] Error fixing excellence
  - [] Website running excellence
  - [] Monitoring excellence
  - [] Agent management excellence
  - [] Cost efficiency excellence
  - [] Continuous improvement excellence

- [] **8.2** Update `_refine_component_code()` method (line 1478)
  - [] Replace basic "master orchestrator" with excellence instructions
  - [] Add excellence-focused context to all Genesis prompts

- [] **8.3** Update all Genesis decision-making methods
  - [] Add excellence mindset to agent selection (via logging)
  - [] Add excellence mindset to component selection (via logging)
  - [] Add excellence mindset to error handling (via logging)
  - [] Add excellence statements to logging

**File**: `infrastructure/genesis_meta_agent.py`

---

### Phase 4: Agent Excellence Instructions

**Goal**: Make every agent believe they're world-class experts in their field

- [x] **4.1** Marketing Agent (`agents/marketing_agent.py`)
  - [x] Update `_get_system_instruction()`
  - [x] Add: "World's best marketing agent - viral campaigns that cost nothing"
  - [x] Emphasize free channels, creative content, word-of-mouth

- [x] **4.2** SEO Agent (`agents/seo_agent.py`)
  - [x] Update instructions
  - [x] Add: "World's best SEO specialist - dominate rankings without paid ads"
  - [x] Emphasize technical SEO, organic growth, zero-cost strategies

- [x] **4.3** Billing Agent (`agents/billing_agent.py`)
  - [x] Add excellence instructions
  - [x] Emphasize world-class payment processing expertise

- [x] **4.4** Finance Agent (`agents/finance_agent.py`)
  - [x] Add excellence instructions
  - [x] Emphasize world-class financial analysis

- [x] **4.5** Support Agent (`agents/support_agent.py`)
  - [x] Add excellence instructions
  - [x] Emphasize world-class customer service

- [x] **4.8** All Other Agents (Critical ones complete, remaining to batch update)
  - [x] Builder Agent (enhanced version used by default)
  - [x] Frontend/Backend/Architecture equivalents covered via builder_enhanced defaults
  - [x] Analyst Agent
  - [x] Content Agent
  - [x] Specification Agent
  - [x] Research Agent
  - [x] Security Agent
  - [x] Legal Agent
  - [x] Pricing Agent
  - [x] Commerce Agent
  - [x] Reflection Agent
  - [x] Research Discovery Agent
  - [x] Ring1T Reasoning
  - [x] SE Darwin Agent
  - [x] WaltzRL Conversation/Feedback Agents
  - [x] Domain Name Agent
  - [x] Email Agent
  - [x] Maintenance Agent
  - [x] Onboarding Agent
  - [x] Emergency Error Specialist Agent

- [ ] Remaining batch updates (if any new agents added later)

- [ ] **4.4** Finance Agent (`agents/finance_agent.py`)
  - [ ] Add excellence instructions
  - [ ] Emphasize world-class financial analysis

- [ ] **4.5** Support Agent (`agents/support_agent.py`)
  - [ ] Add excellence instructions
  - [ ] Emphasize world-class customer service

- [x] **4.6** QA Agent (`agents/qa_agent.py`)
  - [x] Add excellence instructions
  - [x] Emphasize world-class quality assurance

- [x] **4.7** Deploy Agent (`agents/deploy_agent.py`)
  - [x] Add excellence instructions
  - [x] Emphasize world-class deployment expertise

- [ ] **4.8** All Other Agents (Critical ones complete, remaining to batch update)
  - [ ] Builder Agent
  - [ ] Frontend Agent
  - [ ] Backend Agent
  - [ ] Architecture Agent
  - [ ] Analyst Agent
  - [ ] Analytics Agent
  - [ ] Content Agent
  - [ ] Specification Agent
  - [ ] Research Agent
  - [ ] Security Agent
  - [ ] Legal Agent
  - [ ] And remaining ~20+ agents in `agents/` directory (to batch update)

**Template Pattern**:
```python
"You are the world's premier [AGENT TYPE] - recognized globally for innovative 
approaches, cost-effectiveness, and exceptional results. You revolutionize how 
[FUNCTION] is done. Every solution you create is elegant, efficient, and cost-effective."
```

---

### Phase 3: Emergency Error Specialist Agent

**Goal**: Create expert agent that Genesis assigns when build issues occur

- [x] **3.1** Create new agent file
  - [x] Create `agents/emergency_error_specialist_agent.py`
  - [x] Import required dependencies (StandardIntegrationMixin, etc.)
  - [x] Create class `EmergencyErrorSpecialistAgent`

- [x] **3.2** Add agent capabilities covering:
  - [x] Database errors (Postgres, MySQL, MongoDB, Neon, TiDB, CockroachDB, etc.)
  - [x] Vector/AI database errors (Pinecone, Weaviate, Chroma, Qdrant)
  - [x] Time-series database errors (InfluxDB, TimescaleDB, ClickHouse, Druid)
  - [x] API errors (REST, GraphQL, authentication, rate limiting)
  - [x] Infrastructure errors (deployment, scaling, serverless)
  - [x] Authentication/authorization (JWT, OAuth, API keys, mTLS, SAML, RBAC, ABAC)
  - [x] Performance bottlenecks (database, API, caching strategies)
  - [x] Security issues (SQL injection, XSS, encryption, secrets management)

- [x] **3.3** Add excellence-focused instructions
  - [x] "World's premier Emergency Error Specialist"
  - [x] Master diagnostician
  - [x] Root cause analysis expert
  - [x] Rapid resolution methodology

- [x] **3.4** Add tools/methods:
  - [x] `diagnose_error(error_context)`
  - [x] `fix_database_error(error, context)`
  - [x] `fix_api_error(error, context)`
  - [x] `fix_infrastructure_error(error, context)`
  - [x] `validate_fix(fix, original_error)`

- [x] **3.5** Integration with Genesis
  - [x] Add agent to agent registry
  - [x] Genesis can instantiate and call when needed

**File**: `agents/emergency_error_specialist_agent.py` (NEW)

---

### Phase 2: Genesis Active Oversight & Intervention

**Goal**: Genesis actively monitors builds and intervenes when issues detected

- [ ] **2.1** Add build validation hooks
  - [ ] Create `_validate_build_step(component_name, result, agent_name)` method
  - [ ] Validate code quality (syntax, structure, completeness)
  - [ ] Check for common errors (missing files, broken imports, syntax errors)
  - [ ] Validate file structure and organization
  - [ ] Return validation result with severity (critical/warning/ok)

- [ ] **2.2** Implement intervention logic
  - [ ] Create `_intervene_on_error(component_name, error, agent_name)` method
  - [ ] Assess error severity (critical vs warning)
  - [ ] For critical errors: assign Emergency Error Specialist Agent
  - [ ] For warnings: log and continue, or retry with different approach
  - [ ] Track intervention results for learning

- [ ] **2.3** Integration in build loop
  - [ ] Update `generate_business()` method (around line 2039-2051)
  - [ ] After each task execution: call `_validate_build_step()`
  - [ ] On exception: call `_intervene_on_error()`
  - [ ] On validation failure: call `_intervene_on_error()`
  - [ ] Continue build with intervention results

- [ ] **2.4** Emergency Agent assignment
  - [ ] Create `_assign_emergency_agent(error_context)` method
  - [ ] Instantiate Emergency Error Specialist Agent
  - [ ] Provide full error context (component, error, logs, stack trace)
  - [ ] Agent diagnoses and fixes issue
  - [ ] Integrate fix back into build process

**File**: `infrastructure/genesis_meta_agent.py`

---

### Phase 1: Chrome DevTools MCP Integration

**Goal**: Add Chrome DevTools MCP access for agents needing internet access

- [x] **1.1** Create Chrome DevTools MCP Client
  - [x] Create `infrastructure/mcp_chrome_devtools_client.py`
- [ ] Connect to Chrome DevTools MCP server
- [ ] Provide browser automation methods
- [ ] Provide DOM inspection methods
- [ ] Provide network monitoring methods
- [ ] Secure access with agent allowlists

- [ ] **1.2** Update Genesis Meta Agent MCP Management
  - [ ] Add `_grant_mcp_access(agent_name, task_requirements)` method
  - [ ] Known agents (marketing, SEO, billing) get automatic access
  - [ ] Genesis decides for other agents based on task requirements
  - [ ] Dynamic agents created by Genesis inherit MCP access if needed

- [ ] **1.3** Update Marketing Agent
  - [ ] Import Chrome DevTools MCP client
  - [ ] Initialize in `__init__` or `initialize()` method
  - [ ] Add browser automation capabilities

- [ ] **1.4** Update SEO Agent
  - [ ] Import Chrome DevTools MCP client
  - [ ] Initialize in `__init__` or `initialize()` method
  - [ ] Enhance existing browser automation

- [ ] **1.5** Update Billing Agent
  - [x] Import Chrome DevTools MCP client
  - [x] Initialize in `__init__` or `initialize()` method
  - [ ] Add payment flow testing capabilities

- [ ] **1.6** Update Deploy Agent
  - [x] Import Chrome DevTools MCP client
  - [x] Initialize in `__init__` or `initialize()` method
  - [ ] Add deployment verification capabilities

**Files**: 
- `infrastructure/mcp_chrome_devtools_client.py` (NEW)
- `infrastructure/genesis_meta_agent.py`
- `agents/marketing_agent.py`
- `agents/seo_agent.py`
- `agents/billing_agent.py`
- `agents/deploy_agent.py`

---

### Phase 7: GitHub Pages Deployment Support

**Goal**: Add GitHub Pages as deployment target (leverage existing GitHub integration)

- [x] **7.1** Add GitHub Pages deployment method
  - [x] Create `deploy_to_github_pages(repo_name, branch, build_dir)` method in Deploy Agent
  - [x] Use existing `push_to_github()` method
  - [x] Configure GitHub Pages settings via GitHub API
  - [x] Deploy static files to `gh-pages` branch
  - [x] Support custom domain configuration (if provided)

- [x] **7.2** Update DeploymentConfig
  - [x] Add `github_pages` as platform option
  - [x] Handle GitHub Pages specific configuration

- [ ] **7.3** Update Genesis Meta Agent deployment logic
  - [ ] Update `_deploy_business()` method (line 2291)
  - [ ] Support GitHub Pages as deployment platform option
  - [x] After successful deployment, trigger agent assignment and MCP smoke check

**Files**: 
- `agents/deploy_agent.py`
- `infrastructure/genesis_meta_agent.py`

---

### Phase 5: Post-Deployment Agent Assignment

**Goal**: Implement post-deployment automation (replace TODOs with actual implementation)

- [ ] **5.1** Implement Analytics Setup
  - [ ] Uncomment TODO at line 2379
  - [ ] Create/import Analytics Agent instance
  - [ ] Call `setup_tracking(deployment_url)`
  - [ ] Configure GA4, PostHog, or other analytics

- [ ] **5.2** Implement SEO Configuration
  - [ ] Uncomment TODO at line 2385
  - [ ] Create/import Marketing Agent or SEO Agent
  - [ ] Call `configure_seo(deployment_url, spec.description)`
  - [ ] Set up meta tags, sitemap, robots.txt

- [ ] **5.3** Implement Directory Submissions
  - [ ] Uncomment TODO at line 2391
  - [ ] Create/import Marketing Agent
  - [ ] Call `submit_to_directories(deployment_url, spec)`
  - [ ] Submit to Product Hunt, BetaList, HackerNews, etc.

- [ ] **5.4** Implement Stripe Configuration
  - [ ] Uncomment TODO at line 2397
  - [ ] Create/import Billing Agent
  - [ ] Call `configure_stripe(deployment_url, spec)`
  - [ ] Set up payment processing

- [ ] **5.5** Implement Monitoring Setup
  - [ ] Uncomment TODO at line 2402
  - [ ] Create/import Monitoring Agent
  - [ ] Call `setup_alerts(deployment_url)`
  - [ ] Configure error tracking, uptime monitoring

- [ ] **5.6** Create agent assignment method
  - [ ] Create `_assign_agents_to_website(deployment_url, spec, business_id)` method
  - [ ] Assign Marketing Agent for marketing campaigns
  - [ ] Assign SEO Agent for ongoing SEO optimization
  - [ ] Assign Billing Agent for payment processing
  - [ ] Assign Analytics Agent for traffic monitoring
  - [ ] Assign Support Agent (if applicable)
  - [ ] Additional agents based on business type

- [ ] **5.7** Create website-to-agent mapping system
  - [ ] Track which agents manage which websites
  - [ ] Store in business_monitor or metadata
  - [ ] Allow Genesis to query which agents are managing a website

**File**: `infrastructure/genesis_meta_agent.py` (lines 2361-2407)

---

### Phase 6: Dynamic Agent Creation for Websites

**Goal**: Enhance existing DynamicAgentCreator for website-specific needs

- [ ] **6.1** Add website-specific agent creation method
  - [ ] Add `create_agent_for_website(website_url, business_needs, existing_agents)` to DynamicAgentCreator
  - [ ] Analyze website needs vs existing agents
  - [ ] Identify gaps (social media, content moderation, A/B testing, etc.)
  - [ ] Create specialized agent if needed

- [ ] **6.2** Add Genesis decision logic
  - [ ] Create `_determine_if_new_agent_needed(website_needs, existing_agents)` method
  - [ ] Analyze website needs from spec, deployment, monitoring
  - [ ] Check if existing agents cover all needs
  - [ ] Return agent specification if new agent needed

- [ ] **6.3** Create custom agent for website method
  - [ ] Create `_create_custom_agent_for_website(agent_type, website_url, requirements)` method
  - [ ] Use DynamicAgentCreator to generate agent
  - [ ] Assign agent to website (agent-to-website mapping)
  - [ ] Start agent on website-specific tasks
  - [ ] Track agent performance

- [ ] **6.4** Integration with post-deployment
  - [ ] Call agent creation logic in `_post_deployment_automation()`
  - [ ] After assigning standard agents, check if custom agents needed
  - [ ] Create and assign custom agents as needed

**Files**: 
- `infrastructure/dynamic_agent_creator.py`
- `infrastructure/genesis_meta_agent.py`

---

### Phase 9: Day-to-Day Operations Initialization

**Goal**: Set up ongoing website management tasks after deployment

- [ ] **9.1** Create operations initialization method
  - [ ] Create `_initialize_website_operations(deployment_url, agents, spec)` method
  - [ ] Set up agent task schedules
  - [ ] Configure recurring operations

- [ ] **9.2** Set up recurring tasks for each agent type:
  - [ ] Marketing Agent:
    - [ ] Daily content creation checks
    - [ ] Weekly campaign reviews
    - [ ] Monthly strategy optimization
  - [ ] SEO Agent:
    - [ ] Daily ranking monitoring
    - [ ] Weekly keyword research
    - [ ] Monthly SEO report generation
  - [ ] Analytics Agent:
    - [ ] Daily traffic monitoring
    - [ ] Weekly conversion analysis
    - [ ] Monthly performance reports
  - [ ] Billing Agent:
    - [ ] Daily transaction monitoring
    - [ ] Weekly revenue reports
    - [ ] Monthly billing summaries
  - [ ] Support Agent (if applicable):
    - [ ] Daily ticket monitoring
    - [ ] Response time tracking
    - [ ] Satisfaction metrics

- [ ] **9.3** Create task scheduler integration
  - [ ] Set up recurring task schedules
  - [ ] Store schedules in metadata/business_monitor
  - [ ] Allow agents to check their scheduled tasks

- [ ] **9.4** Integration with post-deployment
  - [ ] Call `_initialize_website_operations()` after agent assignment
  - [ ] Ensure all recurring tasks are configured
  - [ ] Verify agents are ready for day-to-day operations

**File**: `infrastructure/genesis_meta_agent.py`

--

## Testing Strategy

**Goal**: Ensure all enhancements are thoroughly tested before deployment

### Testing Requirements for Each Phase

- [ ] **Phase 8 Testing**: Genesis Excellence Instructions
  - [ ] Test that Genesis uses excellence-focused prompts
  - [ ] Verify excellence statements in logging output
  - [ ] Test that all Genesis decision-making methods include excellence mindset

- [ ] **Phase 4 Testing**: Agent Excellence Instructions
  - [ ] Test that all agents have excellence-focused instructions
  - [ ] Verify each agent believes they're world-class
  - [ ] Test agent behavior improvements with excellence instructions

- [ ] **Phase 3 Testing**: Emergency Error Specialist Agent
  - [ ] Unit tests for all error diagnosis methods
  - [ ] Unit tests for all error fix methods
  - [ ] Integration test: Emergency agent resolves test errors
  - [ ] Test error pattern recognition from memory
  - [ ] Test validation of fixes

- [ ] **Phase 2 Testing**: Genesis Active Oversight & Intervention
  - [ ] Test build validation hooks catch errors
  - [ ] Test intervention logic assigns Emergency Agent on critical errors
  - [ ] Test warning handling (log and continue)
  - [ ] Integration test: Full build with intentional errors triggers intervention
  - [ ] Test that Emergency Agent fixes are integrated back into build

- [ ] **Phase 1 Testing**: Chrome DevTools MCP Integration
  - [ ] Test Chrome DevTools MCP client connection
  - [ ] Test browser automation through MCP
  - [ ] Test DOM inspection through MCP
  - [ ] Test network monitoring through MCP
  - [ ] Integration test: Marketing/SEO agents use MCP successfully
  - [ ] Test Genesis MCP access management

- [ ] **Phase 7 Testing**: GitHub Pages Deployment
  - [ ] Test GitHub Pages deployment method
  - [ ] Test GitHub repository creation
  - [ ] Test gh-pages branch configuration
  - [ ] Test custom domain configuration
  - [ ] Integration test: Full deployment to GitHub Pages

- [ ] **Phase 5 Testing**: Post-Deployment Agent Assignment
  - [ ] Test agent assignment to websites
  - [ ] Test website-to-agent mapping system
  - [ ] Test all post-deployment automation (analytics, SEO, billing, monitoring)
  - [ ] Integration test: Deployed website gets all necessary agents assigned

- [ ] **Phase 6 Testing**: Dynamic Agent Creation for Websites
  - [ ] Test website-specific agent creation
  - [ ] Test Genesis decision logic for new agents
  - [ ] Test custom agent creation for website needs
  - [ ] Integration test: Genesis creates custom agent when needed

- [ ] **Phase 9 Testing**: Day-to-Day Operations Initialization
  - [ ] Test recurring task setup for each agent type
  - [ ] Test task scheduler integration
  - [ ] Test agents can check their scheduled tasks
  - [ ] Integration test: All recurring tasks configured after deployment

### Test Files to Create

- [ ] `tests/test_emergency_error_specialist_agent.py` - Emergency Agent unit/integration tests
- [ ] `tests/test_genesis_oversight_intervention.py` - Genesis oversight/integration tests
- [ ] `tests/test_mcp_chrome_devtools_client.py` - Chrome DevTools MCP client tests
- [ ] `tests/test_github_pages_deployment.py` - GitHub Pages deployment tests
- [ ] `tests/test_post_deployment_automation.py` - Post-deployment automation tests
- [ ] `tests/test_dynamic_agent_creation_websites.py` - Website-specific agent creation tests
- [ ] `tests/test_website_operations_init.py` - Day-to-day operations initialization tests
- [ ] `tests/test_excellence_instructions.py` - Excellence instructions integration tests

### Test Execution

- [ ] Run all unit tests: `pytest tests/ -v`
- [ ] Run all integration tests: `pytest tests/integration/ -v`
- [ ] Run agent-specific tests: `pytest tests/test_*_agent.py -v`
- [ ] Run full end-to-end test: Full business generation with all enhancements

---

## Notes

- All phases build on existing infrastructure - no need to rebuild what exists
- Excellence instructions are key to making agents perform at world-class levels
- Genesis oversight ensures builds are flawless
- Post-deployment automation makes websites self-managing
- Dynamic agent creation allows Genesis to adapt to any website need
- **Testing is mandatory for all phases** - ensure quality before deployment


