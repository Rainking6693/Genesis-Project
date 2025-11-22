# OmniDaemon Integration Checklist

**Integration #75: Event-Driven Runtime for Genesis Agents**

**Status:** 🚧 In Progress
**Priority:** ⭐⭐⭐⭐⭐ CRITICAL
**Estimated Timeline:** 8-10 days (single engineer)
**Engineer:** TBD
**Start Date:** TBD
**Target Completion:** TBD

---

## Overview

Transform Genesis from synchronous HTTP (A2A FastAPI) to event-driven architecture using OmniDaemon + Redis Streams. This enables:
- 10x throughput (handle 100+ concurrent business generations)
- No timeout failures (tasks can run for hours)
- Horizontal scaling (add workers dynamically)
- Fault tolerance (worker crashes don't lose tasks)
- Multi-tenancy support (Genesis-as-a-Service)

---

## Phase 1: Setup & Infrastructure (Days 1-2)

### Redis Setup
- [ ] **Install Redis locally for development**
  ```bash
  # Option 1: Docker (recommended for dev)
  docker run -d --name redis-omnidaemon -p 6379:6379 redis:7-alpine

  # Option 2: Redis Cloud (free tier, recommended for production)
  # Sign up at https://redis.com/try-free/
  ```

- [ ] **Verify Redis connectivity**
  ```bash
  redis-cli ping
  # Should return: PONG
  ```

- [ ] **Configure Redis in `.env`**
  ```env
  # Add to .env
  REDIS_URL=redis://localhost:6379
  EVENT_BUS_TYPE=redis_stream
  STORAGE_BACKEND=redis
  OMNIDAEMON_API_ENABLED=true
  LOG_LEVEL=INFO
  ```

### OmniDaemon Installation
- [ ] **Install OmniDaemon SDK**
  ```bash
  # Using uv (recommended)
  uv add omnidaemon

  # OR using pip
  pip install omnidaemon
  ```

- [ ] **Add to `requirements.txt`**
  ```txt
  omnidaemon>=0.1.0
  redis>=5.0.0
  ```

- [ ] **Verify installation**
  ```bash
  omnidaemon --version
  python -c "from omnidaemon import OmniDaemonSDK; print('OK')"
  ```

### Test Basic Pub/Sub
- [ ] **Create test script `scripts/test_omnidaemon_basic.py`**
  ```python
  import asyncio
  from omnidaemon import OmniDaemonSDK, AgentConfig

  async def test_callback(message: dict):
      print(f"Received: {message}")
      return {"status": "success", "echo": message.get("content")}

  async def main():
      sdk = OmniDaemonSDK()

      # Register test agent
      await sdk.register_agent(
          AgentConfig(
              topic="genesis.test",
              callback=test_callback
          )
      )

      # Publish test message
      task_id = await sdk.publish_event(
          topic="genesis.test",
          payload={"content": {"message": "Hello OmniDaemon!"}}
      )

      print(f"Published task: {task_id}")

      # Wait for processing
      await asyncio.sleep(2)

      # Get result
      result = await sdk.get_task_result(task_id)
      print(f"Result: {result}")

  if __name__ == "__main__":
      asyncio.run(main())
  ```

- [ ] **Run test and verify pub/sub works**
  ```bash
  python scripts/test_omnidaemon_basic.py
  ```

- [ ] **Monitor Redis Streams**
  ```bash
  # Check streams were created
  redis-cli XINFO STREAMS

  # Inspect test stream
  omnidaemon bus list
  omnidaemon bus inspect --stream genesis.test --limit 5
  ```

---

## Phase 2: OmniDaemon Bridge Module (Days 3-4)

### Create Bridge Infrastructure
- [ ] **Create `infrastructure/omnidaemon_bridge.py`**
  - [ ] Import OmniDaemon SDK
  - [ ] Import Genesis infrastructure (HTDAG, HALO, AOP, DAAO)
  - [ ] Import A2A connector
  - [ ] Import all 21 Genesis agents

- [ ] **Implement `OmniDaemonBridge` class**
  ```python
  class OmniDaemonBridge:
      """
      Bridge between OmniDaemon event-driven runtime and Genesis orchestration

      Wraps Genesis agents as OmniDaemon callbacks with:
      - HTDAG/HALO/AOP/DAAO orchestration
      - AP2/x402 payment integration
      - Session persistence
      - Error handling and retries
      """

      def __init__(self):
          self.sdk = OmniDaemonSDK()
          self.a2a_connector = A2AConnector()
          # ... initialize Genesis infrastructure

      async def register_all_agents(self):
          """Register all 21 Genesis agents with OmniDaemon"""
          pass

      async def create_agent_callback(self, agent_name: str):
          """Create async callback wrapper for Genesis agent"""
          pass
  ```

- [ ] **Implement orchestration integration**
  ```python
  async def orchestrated_callback(self, message: dict) -> dict:
      """
      Execute task through Genesis orchestration pipeline

      Flow:
      1. Extract task from message
      2. HTDAG: Decompose into DAG
      3. HALO: Route to agents
      4. AOP: Validate plan
      5. DAAO: Optimize costs
      6. A2A Connector: Execute
      7. Return result
      """
      # Implementation
  ```

- [ ] **Add AP2/x402 payment support**
  ```python
  async def payment_aware_callback(self, message: dict) -> dict:
      """
      Callback with AP2/x402 payment integration

      Checks if task requires payment:
      - Create payment mandate
      - Request Meta Agent approval
      - Execute payment via x402
      - Proceed with task if payment succeeds
      """
      # Implementation
  ```

- [ ] **Implement error handling and retries**
  - [ ] Circuit breaker integration
  - [ ] Retry configuration per agent
  - [ ] Dead letter queue handling
  - [ ] Error logging to Genesis audit system

### Configuration System
- [ ] **Create `config/omnidaemon.yaml`**
  ```yaml
  storage_backend: redis
  event_bus_type: redis_stream
  redis_url: ${REDIS_URL}

  agents:
    - name: business_idea_generator
      topic: genesis.idea.generate
      max_retries: 3
      retry_delay_seconds: 10
      timeout_seconds: 300

    - name: builder_agent
      topic: genesis.build
      max_retries: 3
      retry_delay_seconds: 5
      timeout_seconds: 600

    # ... configure all 21 agents
  ```

- [ ] **Load configuration in bridge**
  ```python
  def load_agent_configs(self) -> List[AgentConfig]:
      """Load agent configurations from YAML"""
      # Implementation
  ```

---

## Phase 3: Priority Agent Integration (Days 5-6)

### Agent 1: Business Idea Generator
- [ ] **Create callback `_business_idea_callback()`**
  ```python
  async def _business_idea_callback(self, message: dict) -> dict:
      from infrastructure.business_idea_generator import get_idea_generator

      generator = get_idea_generator()
      idea = await generator.generate_idea(
          business_type=message['content'].get('business_type', 'saas'),
          min_score=message['content'].get('min_score', 70.0)
      )

      return {
          "status": "success",
          "idea": idea.to_dict(),
          "score": idea.quality_score
      }
  ```

- [ ] **Register with OmniDaemon**
  ```python
  await self.sdk.register_agent(
      AgentConfig(
          topic="genesis.idea.generate",
          callback=self._business_idea_callback,
          max_retries=3,
          timeout_seconds=300
      )
  )
  ```

- [ ] **Test async execution**
  ```bash
  # Publish event
  omnidaemon task publish --topic genesis.idea.generate --payload '{"business_type":"saas"}'

  # Monitor processing
  omnidaemon metrics --topic genesis.idea.generate

  # Check result
  omnidaemon task result TASK_ID
  ```

### Agent 2: Builder Agent
- [ ] **Create callback `_builder_agent_callback()`**
  - [ ] Integrate with HTDAG for component decomposition
  - [ ] Add payment support for premium LLM calls
  - [ ] Store cost metadata on artifacts
  - [ ] Abort if spend exceeds per-business limit

- [ ] **Register with retry configuration**
  ```python
  AgentConfig(
      topic="genesis.build",
      callback=self._builder_agent_callback,
      max_retries=3,
      retry_delay_seconds=5,
      timeout_seconds=600  # 10 minutes for complex builds
  )
  ```

- [ ] **Test parallel component builds**

### Agent 3: Deploy Agent
- [ ] **Create callback `_deploy_agent_callback()`**
  - [ ] Support Railway, Render, PythonAnywhere, GitHub Pages
  - [ ] Implement staged payments (authorize → deploy → capture)
  - [ ] Add rollback on deployment failure
  - [ ] Request vendor refund if payment succeeded but deploy failed

- [ ] **Register with long timeout**
  ```python
  AgentConfig(
      topic="genesis.deploy",
      callback=self._deploy_agent_callback,
      max_retries=2,
      timeout_seconds=1200  # 20 minutes for deployments
  )
  ```

- [ ] **Test deployment with payment integration**

### Agent 4: QA Agent
- [ ] **Create callback `_qa_agent_callback()`**
  - [ ] Guard GPU/cloud test invocations with x402
  - [ ] Annotate test reports with transaction hashes
  - [ ] Reuse test environments to avoid duplicate charges

- [ ] **Register with moderate timeout**

- [ ] **Test GPU test execution**

### Agent 5: Research Agent
- [ ] **Create callback `_research_agent_callback()`**
  - [ ] Wrap paid API calls with x402
  - [ ] Implement vendor capability cache
  - [ ] Add heuristics for pay vs cache decision

- [ ] **Register with short timeout**

- [ ] **Test paid API calls with fake mode**

---

## Phase 4: Remaining Agent Integration (Days 7-8)

### Core Development Agents (6 agents)
- [ ] **Spec Agent** - `genesis.spec`
- [ ] **Architect Agent** - `genesis.architect`
- [ ] **Frontend Agent** - `genesis.frontend`
- [ ] **Backend Agent** - `genesis.backend`
- [ ] **Security Agent** - `genesis.security`
- [ ] **Monitoring Agent** - `genesis.monitoring`

### Business & Marketing Agents (5 agents)
- [ ] **SEO Agent** - `genesis.seo` (with paid tool APIs)
- [ ] **Content Agent** - `genesis.content` (with stock media payments)
- [ ] **Marketing Agent** - `genesis.marketing` (with ad platform APIs)
- [ ] **Sales Agent** - `genesis.sales`
- [ ] **Support Agent** - `genesis.support` (with helpdesk APIs)

### Finance & Analytics Agents (4 agents)
- [ ] **Finance Agent** - `genesis.finance` (with payroll/invoice APIs)
- [ ] **Pricing Agent** - `genesis.pricing` (with competitive analysis tools)
- [ ] **Analytics Agent** - `genesis.analytics`
- [ ] **Email Agent** - `genesis.email` (with email validation/sending APIs)

### Special Agents (2 agents)
- [ ] **Commerce Agent** - `genesis.commerce` (domain + payment gateway)
- [ ] **Darwin Agent** - `genesis.darwin` (self-improvement)

### For Each Agent:
- [ ] Create async callback wrapper
- [ ] Integrate with Genesis orchestration (HTDAG/HALO)
- [ ] Add payment support if needed (AP2/x402)
- [ ] Configure retry/timeout settings
- [ ] Register with OmniDaemon
- [ ] Write unit test
- [ ] Add to agent registry

---

## Phase 5: Genesis Meta Agent Integration (Day 8)

### Approval Hook Implementation
- [ ] **Add `approve_payment_intent()` to Meta Agent**
  ```python
  async def approve_payment_intent(
      self,
      agent_id: str,
      vendor: str,
      amount_cents: int,
      reason: str,
      mandate_id: str
  ) -> bool:
      """
      Approve/deny payments based on:
      1. Business budget check
      2. Vendor whitelist
      3. Goal alignment (LLM evaluation)
      4. Fraud detection
      """
  ```

- [ ] **Implement auto-approval for <$10 purchases**
- [ ] **Implement daily budget enforcement per agent**
- [ ] **Create vendor whitelist**
- [ ] **Add fraud pattern detection**

### Summarization Hook Implementation
- [ ] **Add `post_business_spend_summary()` to Meta Agent**
  ```python
  async def post_business_spend_summary(self, business_id: str):
      """
      Post spending summary to Discord after business generation

      Summary includes:
      - Total spent
      - Breakdown by agent
      - Breakdown by vendor
      - Cost vs revenue potential
      """
  ```

- [ ] **Integrate with Discord webhook**
  ```python
  async def _send_discord_message(self, channel: str, message: str):
      # Send to #genesis-dashboard
  ```

- [ ] **Format spending summary with emojis/formatting**
- [ ] **Calculate ROI (revenue potential / cost)**
- [ ] **Add dashboard link to message**

### Meta Agent OmniDaemon Integration
- [ ] **Create callback `_meta_agent_callback()`**
  - [ ] Handle business orchestration requests
  - [ ] Coordinate multi-agent workflows
  - [ ] Monitor spend across all agents
  - [ ] Generate summary reports

- [ ] **Register Meta Agent**
  ```python
  AgentConfig(
      topic="genesis.meta.orchestrate",
      callback=self._meta_agent_callback,
      max_retries=1,
      timeout_seconds=3600  # 1 hour for full business generation
  )
  ```

---

## Phase 6: Testing & Validation (Day 9)

### Unit Tests
- [ ] **Create `tests/test_omnidaemon_bridge.py`**
  - [ ] Test callback creation for all 21 agents
  - [ ] Test orchestration integration (HTDAG/HALO/AOP/DAAO)
  - [ ] Test payment integration (AP2/x402)
  - [ ] Test error handling and retries
  - [ ] Test DLQ routing on failure

- [ ] **Create `tests/test_omnidaemon_agents.py`**
  - [ ] Test each agent callback in isolation
  - [ ] Mock Redis Streams
  - [ ] Verify result format
  - [ ] Test timeout handling

### Integration Tests
- [ ] **Create `tests/integration/test_omnidaemon_full_flow.py`**
  - [ ] Test full business generation pipeline
  - [ ] Publish to `genesis.meta.orchestrate`
  - [ ] Verify all agents execute
  - [ ] Check audit trail
  - [ ] Validate spending summary

- [ ] **Test agent chaining**
  ```python
  # Idea → Build → Deploy → Monitor pipeline
  # Each step publishes to next via reply_to
  ```

- [ ] **Test concurrent execution**
  ```bash
  # Publish 10 tasks simultaneously
  # Verify all complete without failures
  ```

### Load Testing
- [ ] **Create `scripts/load_test_omnidaemon.py`**
  ```python
  # Simulate 100 concurrent business generation requests
  # Measure:
  # - Throughput (tasks/second)
  # - Average latency
  # - Failure rate
  # - Queue depth
  ```

- [ ] **Run with 1 worker (baseline)**
- [ ] **Run with 5 workers (horizontal scale test)**
- [ ] **Run with 10 workers (max scale test)**
- [ ] **Compare throughput vs synchronous A2A service**
  - [ ] Target: 10x improvement

### Chaos Testing
- [ ] **Test worker crash recovery**
  ```bash
  # Start 3 workers
  # Kill one worker mid-task
  # Verify task is picked up by another worker
  ```

- [ ] **Test Redis connection failure**
  ```bash
  # Stop Redis mid-execution
  # Verify graceful degradation
  # Restart Redis, verify recovery
  ```

- [ ] **Test payment failure handling**
  ```python
  # Simulate x402 payment failure
  # Verify task retries
  # Verify DLQ routing after max retries
  ```

---

## Phase 7: Production Deployment (Day 10)

### Redis Production Setup
- [ ] **Choose Redis deployment:**
  - [ ] Option 1: Redis Cloud (recommended, managed, $0-200/month)
  - [ ] Option 2: AWS ElastiCache (enterprise, $50-500/month)
  - [ ] Option 3: Self-hosted on VPS (cheapest, requires maintenance)

- [ ] **Configure production Redis**
  ```bash
  # Redis Cloud setup
  # 1. Create account at redis.com/try-free
  # 2. Create database (30MB free tier)
  # 3. Get connection URL
  # 4. Add to production.env
  ```

- [ ] **Update `config/production.env`**
  ```env
  REDIS_URL=rediss://default:password@redis-12345.cloud.redislabs.com:12345
  EVENT_BUS_TYPE=redis_stream
  STORAGE_BACKEND=redis
  OMNIDAEMON_API_ENABLED=true
  GENESIS_ENV=production
  ```

- [ ] **Test connection from production server**
  ```bash
  redis-cli -u $REDIS_URL ping
  ```

### OmniDaemon Worker Deployment
- [ ] **Create startup script `scripts/start_omnidaemon_workers.sh`**
  ```bash
  #!/bin/bash
  # Start 5 OmniDaemon workers in background

  for i in {1..5}; do
      omnidaemon runner start \
          --config config/omnidaemon.yaml \
          --worker-id "worker_$i" \
          --log-file "logs/omnidaemon_worker_$i.log" &
  done

  echo "Started 5 OmniDaemon workers"
  ```

- [ ] **Make executable and test**
  ```bash
  chmod +x scripts/start_omnidaemon_workers.sh
  ./scripts/start_omnidaemon_workers.sh
  ```

- [ ] **Create systemd service (Linux) or PM2 config (Node.js)**
  ```ini
  # /etc/systemd/system/omnidaemon-genesis.service
  [Unit]
  Description=OmniDaemon Workers for Genesis
  After=network.target

  [Service]
  Type=forking
  User=genesis
  WorkingDirectory=/home/genesis/Claude-Clean-Code-Genesis
  ExecStart=/home/genesis/Claude-Clean-Code-Genesis/scripts/start_omnidaemon_workers.sh
  Restart=always

  [Install]
  WantedBy=multi-user.target
  ```

- [ ] **Enable and start service**
  ```bash
  sudo systemctl enable omnidaemon-genesis
  sudo systemctl start omnidaemon-genesis
  sudo systemctl status omnidaemon-genesis
  ```

### Hybrid Deployment (Keep FastAPI Running)
- [ ] **Keep `a2a_fastapi.py` running for backward compatibility**
  ```bash
  # Terminal 1: Existing synchronous API
  python a2a_fastapi.py  # Port 8000
  ```

- [ ] **Add async endpoint to FastAPI**
  ```python
  # a2a_fastapi.py - Add new endpoint

  @app.post("/invoke/async")
  async def invoke_async(request: A2ATaskRequest):
      """
      Async invocation via OmniDaemon
      Returns task_id immediately, client polls for result
      """
      from infrastructure.omnidaemon_bridge import get_bridge

      bridge = get_bridge()
      task_id = await bridge.publish_task(request.dict())

      return {
          "task_id": task_id,
          "status": "queued",
          "poll_url": f"/task/{task_id}",
          "webhook": request.webhook  # Optional callback
      }

  @app.get("/task/{task_id}")
  async def get_task_status(task_id: str):
      """Poll for task result"""
      from infrastructure.omnidaemon_bridge import get_bridge

      bridge = get_bridge()
      result = await bridge.get_task_result(task_id)

      if result is None:
          return {"status": "processing"}

      return {
          "status": "completed",
          "result": result
      }
  ```

- [ ] **Test both endpoints work**
  ```bash
  # Synchronous (existing)
  curl -X POST http://localhost:8000/invoke -d '{...}'

  # Asynchronous (new)
  curl -X POST http://localhost:8000/invoke/async -d '{...}'
  # Returns: {"task_id": "abc123", "poll_url": "/task/abc123"}

  # Poll for result
  curl http://localhost:8000/task/abc123
  ```

### Monitoring Setup
- [ ] **Create monitoring dashboard script**
  ```bash
  # scripts/monitor_omnidaemon.sh
  while true; do
      clear
      echo "=== OmniDaemon Monitoring ==="
      echo ""
      omnidaemon health
      echo ""
      omnidaemon bus stats
      echo ""
      echo "=== Agent Metrics ==="
      omnidaemon metrics --topic genesis.idea.generate
      omnidaemon metrics --topic genesis.build
      omnidaemon metrics --topic genesis.deploy
      echo ""
      sleep 5
  done
  ```

- [ ] **Set up Prometheus metrics export (optional)**
  - [ ] Install Prometheus exporter
  - [ ] Configure scraping
  - [ ] Create Grafana dashboard

- [ ] **Configure alerts**
  - [ ] Alert on worker crashes (no heartbeat for 5 minutes)
  - [ ] Alert on DLQ depth > 10
  - [ ] Alert on task failure rate > 10%
  - [ ] Alert on average latency > 60 seconds

### Gradual Rollout
- [ ] **Week 1: 10% traffic to OmniDaemon**
  ```python
  # a2a_fastapi.py
  import random

  @app.post("/invoke")
  async def invoke(request: A2ATaskRequest):
      if random.random() < 0.10:  # 10% traffic
          return await invoke_async(request)
      else:
          return await invoke_sync(request)
  ```

- [ ] **Monitor metrics for errors/latency**
- [ ] **Week 2: 50% traffic if no issues**
- [ ] **Week 3: 100% traffic**
- [ ] **Week 4: Deprecate synchronous endpoint**

---

## Phase 8: Documentation & Training (Day 10)

### Update CLAUDE.md
- [ ] **Add Integration #75 section**
  ```markdown
  ## Integration #75: OmniDaemon Event-Driven Runtime (December 2025)

  **Status:** ✅ PRODUCTION READY
  **Location:** `infrastructure/omnidaemon_bridge.py`

  Event-driven runtime for Genesis agents using Redis Streams + OmniDaemon.

  ### Capabilities
  - Asynchronous agent execution (no timeouts)
  - Horizontal scaling (10+ workers)
  - Automatic retries + DLQ
  - Multi-tenancy support
  - Built-in observability

  ### Usage
  [Code examples]

  ### Monitoring
  [Commands for health checks, metrics, DLQ inspection]
  ```

- [ ] **Update agent count** (21 agents now event-driven)
- [ ] **Update architecture diagrams**

### Create OmniDaemon Playbook
- [ ] **Create `docs/omnidaemon_playbook.md`**
  ```markdown
  # OmniDaemon Playbook

  ## Starting Workers
  [Commands]

  ## Publishing Tasks
  [Examples for each agent]

  ## Monitoring
  [Health checks, metrics, DLQ]

  ## Troubleshooting
  [Common issues]

  ## Scaling
  [Adding more workers]
  ```

### Create Runbooks
- [ ] **Create `docs/runbooks/omnidaemon_worker_crash.md`**
  - [ ] Detection steps
  - [ ] Recovery procedure
  - [ ] Root cause analysis

- [ ] **Create `docs/runbooks/omnidaemon_dlq_overflow.md`**
  - [ ] Inspect DLQ
  - [ ] Identify failure patterns
  - [ ] Reprocess or discard

- [ ] **Create `docs/runbooks/omnidaemon_scaling.md`**
  - [ ] When to scale up
  - [ ] How to add workers
  - [ ] Load balancing verification

### Update Quick Start Scripts
- [ ] **Update `RUN_AUTONOMOUS.bat`**
  ```batch
  @echo off
  echo Starting OmniDaemon workers...
  start /B scripts\start_omnidaemon_workers.sh

  echo Publishing business generation tasks...
  omnidaemon task publish --topic genesis.meta.orchestrate --payload "{\"count\":3}"

  echo Monitor progress:
  echo   omnidaemon metrics --topic genesis.meta.orchestrate
  ```

- [ ] **Create `MONITOR_OMNIDAEMON.bat`**
  ```batch
  @echo off
  scripts\monitor_omnidaemon.sh
  ```

---

## Success Criteria

### Performance Metrics
- [ ] **Throughput: 10x improvement over synchronous A2A**
  - [ ] Baseline: ~5-10 concurrent requests (A2A FastAPI)
  - [ ] Target: 100+ concurrent requests (OmniDaemon)
  - [ ] Measured: _____ concurrent requests ✅/❌

- [ ] **No timeout failures**
  - [ ] Test 10 business generations (60-70s each)
  - [ ] All complete successfully without timeouts ✅/❌

- [ ] **Horizontal scaling verified**
  - [ ] 1 worker: _____ tasks/minute
  - [ ] 5 workers: _____ tasks/minute (should be ~5x)
  - [ ] 10 workers: _____ tasks/minute (should be ~10x) ✅/❌

- [ ] **Average latency < 100ms for task submission**
  - [ ] Measured: _____ ms ✅/❌

### Reliability Metrics
- [ ] **Failure rate < 1% with retries**
  - [ ] 100 tasks published
  - [ ] Failures: _____
  - [ ] Rate: _____ % ✅/❌

- [ ] **Worker crash recovery working**
  - [ ] Kill worker mid-task
  - [ ] Task completed by another worker ✅/❌

- [ ] **DLQ contains failed tasks**
  - [ ] Force 3 failures
  - [ ] All 3 in DLQ ✅/❌

### Feature Completeness
- [ ] **All 21 agents registered with OmniDaemon** ✅/❌
- [ ] **HTDAG/HALO/AOP/DAAO integration working** ✅/❌
- [ ] **AP2/x402 payment integration working** ✅/❌
- [ ] **Meta Agent approval hooks working** ✅/❌
- [ ] **Discord summaries posting** ✅/❌
- [ ] **Multi-tenancy support enabled** ✅/❌

### Observability
- [ ] **Metrics accessible via CLI**
  ```bash
  omnidaemon metrics --topic genesis.meta.orchestrate
  # Shows: tasks_received, tasks_processed, tasks_failed, avg_time
  ```
  ✅/❌

- [ ] **Health check endpoint working**
  ```bash
  omnidaemon health
  # Returns: status, workers, queue_depth
  ```
  ✅/❌

- [ ] **DLQ inspection working**
  ```bash
  omnidaemon bus dlq --topic genesis.build
  # Shows failed tasks with error messages
  ```
  ✅/❌

### Documentation
- [ ] **CLAUDE.md updated with Integration #75** ✅/❌
- [ ] **OmniDaemon playbook created** ✅/❌
- [ ] **Runbooks created (3 minimum)** ✅/❌
- [ ] **Quick start scripts updated** ✅/❌

---

## Blockers & Questions

### Outstanding Issues
- [ ] **Blocker:** _______________________________________________
  - **Severity:** High/Medium/Low
  - **Owner:** _______________
  - **Resolution:** _______________________________________________

- [ ] **Question:** _______________________________________________
  - **Answer:** _______________________________________________

### Decisions Needed
- [ ] **Redis deployment choice:** Redis Cloud / AWS ElastiCache / Self-hosted
  - **Decision:** _______________
  - **Date:** _______________

- [ ] **Number of production workers:** _______________
  - **Reasoning:** _______________

- [ ] **Gradual rollout schedule:** _______________
  - **Week 1:** _____% traffic
  - **Week 2:** _____% traffic
  - **Week 3:** _____% traffic

---

## Post-Integration Tasks

### Week 1 After Deployment
- [ ] **Monitor error rates daily**
- [ ] **Tune worker count based on load**
- [ ] **Inspect DLQ for patterns**
- [ ] **Gather user feedback on async experience**

### Week 2 After Deployment
- [ ] **Performance optimization**
  - [ ] Identify slow agents
  - [ ] Optimize callbacks
  - [ ] Adjust timeouts

- [ ] **Cost analysis**
  - [ ] Redis usage (memory, connections)
  - [ ] Worker compute costs
  - [ ] Compare to previous A2A costs

### Month 1 After Deployment
- [ ] **Deprecation plan for synchronous A2A**
  - [ ] Announce deprecation timeline
  - [ ] Migrate all clients to async
  - [ ] Remove `/invoke` endpoint, keep only `/invoke/async`

- [ ] **Scale testing**
  - [ ] Test with 1000+ concurrent tasks
  - [ ] Identify bottlenecks
  - [ ] Plan infrastructure upgrades

### Future Enhancements (Optional)
- [ ] **Integration with TrajectoryPool**
  - [ ] Log successful task patterns
  - [ ] Use for agent improvement

- [ ] **Integration with Memori SQL (Integration #70)**
  - [ ] Migrate task results to SQL
  - [ ] Queryable analytics

- [ ] **Webhook support enhancements**
  - [ ] Retry failed webhooks
  - [ ] Signature verification

- [ ] **Multi-region deployment**
  - [ ] Deploy workers in multiple regions
  - [ ] Geo-distributed Redis

---

## Sign-Off

### Engineering Review
- [ ] **Code review completed**
  - Reviewer: _______________
  - Date: _______________
  - Approved: ✅/❌

### QA Review
- [ ] **All tests passing**
  - QA Engineer: _______________
  - Date: _______________
  - Test Results: _____ passed, _____ failed
  - Approved: ✅/❌

### Production Readiness
- [ ] **Infrastructure deployed**
- [ ] **Monitoring configured**
- [ ] **Documentation complete**
- [ ] **Rollback plan ready**
- [ ] **Approved for production:** ✅/❌

### Final Sign-Off
- **Project Lead:** _______________ ✅/❌
- **Date Completed:** _______________
- **Status:** ✅ PRODUCTION READY / 🚧 IN PROGRESS / ❌ BLOCKED

---

**Integration #75 Status: 🚧 NOT STARTED**

**Next Steps:**
1. Schedule kickoff meeting
2. Assign engineer
3. Begin Phase 1: Redis + OmniDaemon setup

---

*Last Updated: 2025-11-16*
*Version: 1.0*
*Owner: TBD*
