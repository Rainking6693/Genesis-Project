 ### PHASE 1 – CLAIM VERIFICATION (Zero Trust)
#### Critical Integration Verification

- [ ] #73 Domain Name Agent: agents/domain_name_agent.py exists, >400 LOC, called in business flow
- [ ] #73 Name.com client: infrastructure/namecom_client.py exists and used
- [ ] #74 VOIX Framework: infrastructure/browser_automation/voix_detector.py + voix_executor.py +
hybrid_automation.py exist
- [ ] #74 VOIX <200ms discovery proven on a live VOIX-enabled test page
- [ ] #74 Skyvern fallback works on google.com
- [ ] #76 MCP Client: infrastructure/mcp_client.py exists and can call ≥10 real tools (github_create_repo, stripe_*,
 etc.)
- [ ] #77 Type-Safe Schemas: ≥5 agents use Pydantic validation with real error handling
- [ ] #78 Composable Context System: Context isolation proven (run 2 businesses in parallel → no memory bleed)
- [ ] #79 M-GRPO Trainer: mgrpo_trainer.py exists and hybrid training actually runs
- [ ] DreamGym (#69) & Memori (#70): Explicitly flagged as MISSING if not in repo
- [ ] 26 agents inherit StandardIntegrationMixin (sample 10 randomly and prove inheritance)
- [ ] A2A FastAPI /agents endpoint returns 26 agents, not 21
- [ ] HGM Oracle grades every business 0–100 (show logs for last 5)
- [ ] Business Monitor auto-shutdown: Prove ≥1 business with score <50 was killed
- [ ] Cost controls: Attempt $200 domain → registration blocked
- [ ] ES training: nightly_es_training.py modifies adapter.safetensors (prove diff)### PHASE 2 – END-TO-END AUTONOMY
 TEST (Live Execution Required)
Run these commands and report real results:

- [ ] python -c "from infrastructure.load_env import load_genesis_env; load_genesis_env(); print('ENV OK')" → passes
- [ ] Start A2A service → curl http://localhost:8000/health → 200 OK
- [ ] curl -H "X-API-Key: ..." http://localhost:8000/agents → returns 26 agents
- [ ] python scripts/autonomous_fully_integrated.py --count 1 --min-score 70 --real-deploy → completes
- [ ] Domain auto-registered (real .com via Name.com)
- [ ] Site live on custom domain (not github.io)
- [ ] Stripe test checkout works → $1 test payment succeeds
- [ ] Business appears in dashboard with score ≥70
- [ ] Simulate 30-day evaluation → low-score business auto-shut down
- [ ] python scripts/full_agent_production_test.py --count 50 --mock-external → completes <40min, no OOM, avg
<40s/business after first### PHASE 2 – END-TO-END AUTONOMY TEST (Live Execution Required)

#### Core Generation & Launch (already in place)
- [ ] python -c "from infrastructure.load_env import load_genesis_env; load_genesis_env(); print('ENV OK')" → passes
- [ ] Start A2A service → curl http://localhost:8000/health → 200 OK
- [ ] curl -H "X-API-Key: ..." http://localhost:8000/agents → returns 26 agents
- [ ] python scripts/autonomous_fully_integrated.py --count 1 --min-score 70 --real-deploy → completes successfully
- [ ] Domain auto-registered (real .com via Name.com)
- [ ] Site live on custom domain (not github.io)
- [ ] Stripe test checkout works → $1 test payment succeeds (appears in Stripe dashboard)
- [ ] Business appears in dashboard with score ≥70

#### Post-Launch Agent Autonomy Verification (Live Business Must Stay Alive & Profitable)

**Marketing Agent**
- [ ] Google Ads / Meta Ads account auto-created and linked
- [ ] ≥3 active ad campaigns running with real budget (> $5/day total)
- [ ] Auto-bidding and keyword expansion active (prove new keywords added in last 24h)

**SEO Agent**
- [ ] Sitemap.xml + robots.txt auto-generated and submitted to Google Search Console
- [ ] ≥10 backlinks submitted to directories/indexers via VOIX or Skyvern
- [ ] On-page SEO score (via internal HGM Oracle) ≥85/100 after 24h

**Billing Agent (Stripe)**
- [ ] Webhook endpoint verified and receiving events
- [ ] Subscription plans active and visible on live site
- [ ] Failed payment retry sequence triggered on a test declined card

**Analyst Agent**
- [ ] GA4 + custom events firing correctly
- [ ] Daily analytics report generated and stored in logs/business_generation/events.jsonl
- [ ] Conversion funnel tracked (visit → signup → paid)

**E-commerce Agent (if applicable)**
- [ ] Products auto-listed with images, pricing, variants
- [ ] Inventory sync active (prove stock decreased after test purchase)
- [ ] Abandoned cart recovery email sent after test abandonment

**Email Agent**
- [ ] Resend/Mailgun/Brevo account connected
- [ ] Welcome sequence (3+ emails) sent to test customer
- [ ] Transactional emails (receipt, password reset) working

**Finance Agent**
- [ ] Daily revenue/expense ledger updated in data/x402/transactions.jsonl
- [ ] Tax calculation applied correctly (prove VAT/GST if region requires)
- [ ] Weekly spend summary posted (Discord/email)

**Maintenance Agent**
- [ ] Uptime monitor active (prove ping every 5–15 mins)
- [ ] Auto-restart triggered if site goes down (simulate crash → prove recovery)
- [ ] Dependency/security updates applied weekly

**Onboarding Agent**
- [ ] In-app onboarding tour functional
- [ ] First-run experience (FRE) completed for test user
- [ ] NPS survey sent after 3rd login

**Pricing Agent**
- [ ] Dynamic pricing rules active (e.g., surge, competitor tracking)
- [ ] A/B test of two pricing tiers running
- [ ] Price change automatically deployed and reflected on live site

**Security Agent**
- [ ] SSL auto-renewed (Let’s Encrypt or similar)
- [ ] Rate limiting / WAF rules active
- [ ] Daily security scan runs and logs stored

**WaltzRL Conversational Agent (Live Chat / Support)**
- [ ] Chat widget live on site
- [ ] Handles ≥5 realistic customer queries with <...
- [ ] Escalates to human (or emergency agent) when confidence <60%

**WaltzRL Feedback Agent**
- [ ] Post-interaction CSAT survey sent
- [ ] Negative feedback triggers compensation flow (e.g., discount code)
- [ ] Feedback stored and used to update LoRA via nightly training

**Emergency Specialist Agent**
- [ ] Triggered on critical event (e.g., Stripe dispute, server 500s >10%)
- [ ] Auto-pauses ad spend
- [ ] Sends alert + rollback plan
- [ ] Resumes normal operation after fix

**30-Day Lifecycle Proof**
- [ ] Simulate 30-day evaluation → low-score business (<50) auto-shut down (domain released, ads paused, customers
notified)
- [ ] High-score business auto-scaled (budget increased, new features deployed)

**Scalability Test**
- [ ] python scripts/full_agent_production_test.py --count 50 --mock-external → completes <40min, no OOM, avg
<40s/business after first.  Assign Hudson and Cora to run the audit, testing, and to fix everything they find on the
 spot.  Have them use context7 and catalog-search MCPs and haiku 4.5 where possible.  Adhere to Audit_protocol_v2.
Once they are finished, You will check all of their work for validity.