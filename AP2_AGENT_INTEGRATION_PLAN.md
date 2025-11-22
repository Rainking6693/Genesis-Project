# AP2 Agent Integration Plan

**Date:** November 14, 2025
**Analyst:** Claude Code
**Purpose:** Identify all Genesis agents that make purchases or incur costs requiring AP2 payment consent

---

## Executive Summary

After analyzing all 21 Genesis agents, **9 agents require AP2 integration** for autonomous payment operations. Two agents (Billing, Domain Name) are already integrated with AP2. **7 additional agents** need AP2 payment consent capabilities.

---

## Analysis Criteria

An agent requires AP2 integration if it:
1. **Makes purchases** on behalf of the user (domains, ads, services, hosting)
2. **Incurs recurring costs** (subscriptions, hosting, API usage)
3. **Manages budgets** for user resources
4. **Deploys paid services** (cloud hosting, CDN, email platforms)

---

## Agents Requiring AP2 Integration

### ✅ Already Integrated (2 agents)

#### 1. Billing Agent
- **Status:** ✅ COMPLETE (Shane, Nov 14, 2025)
- **Score:** 88/100 (Production Ready with Conditions)
- **Purchases:** General payment processing, Stripe subscriptions
- **AP2 Features:**
  - Intent/Cart/Payment mandate system
  - Multi-method payments (cards, crypto, bank, wallet)
  - Cryptographic signatures (HMAC-SHA256)
  - Audit trail logging
  - Cost threshold enforcement

#### 2. Domain Name Agent
- **Status:** ✅ COMPLETE (Nova, Nov 14, 2025)
- **Score:** 94/100 (Production Ready)
- **Purchases:** Domain registration ($10-50/domain), domain renewals
- **AP2 Features:**
  - Intent mandate for domain purchases
  - Cart mandate per domain registration
  - Payment consent verification
  - DNS configuration automation
  - Cost threshold enforcement ($100/month)

---

### 🔴 HIGH PRIORITY (Require AP2 Integration)

#### 3. Marketing Agent ⚠️ **CRITICAL**
- **File:** `agents/marketing_agent.py` (16,701 bytes)
- **Purchases:**
  - **Ad campaigns:** Google Ads, Facebook Ads, LinkedIn Ads ($100-10,000/month)
  - **Email marketing:** Mailchimp, SendGrid, Customer.io ($50-500/month)
  - **Social media automation:** Buffer, Hootsuite ($15-99/month)
  - **Analytics tools:** Google Analytics 360, Mixpanel ($150-1,000/month)
  - **Influencer payments:** Sponsored content ($500-10,000/campaign)
- **Current Cost Tracking:** `self.total_cost` (line 65)
- **Budget Management:** `self.campaigns_created` (line 64)
- **Why AP2 Needed:**
  - Autonomous ad spend requires user consent
  - Campaign budgets can exceed $10K/month
  - Recurring subscriptions for marketing tools
  - Influencer payments need audit trail

**AP2 Integration Requirements:**
- Intent mandate for monthly marketing budget ($1,000-50,000)
- Cart mandate per campaign launch (Google Ads, Facebook Ads)
- Cart mandate per tool subscription (Mailchimp, SendGrid)
- Cart mandate per influencer payment
- Audit trail for all marketing spend
- Cost threshold alerts (>$1,000/day)

---

#### 4. Deploy Agent ⚠️ **CRITICAL**
- **File:** `agents/deploy_agent.py` (54,729 bytes)
- **Purchases:**
  - **Cloud hosting:** Vercel, Netlify, Railway ($10-500/month per app)
  - **CDN services:** Cloudflare Pro ($20-200/month)
  - **Serverless functions:** AWS Lambda, Vercel Functions ($5-100/month)
  - **Database hosting:** MongoDB Atlas, PlanetScale ($0-100/month)
  - **CI/CD services:** GitHub Actions minutes ($0-50/month)
- **Current Deployment:** Vercel REST API (lines 95-100)
- **Why AP2 Needed:**
  - Autonomous deployment incurs hosting costs
  - Multiple apps × hosting = significant monthly costs
  - Vercel Pro plan = $20/user/month
  - Database upgrades can jump from $0 to $100/month

**AP2 Integration Requirements:**
- Intent mandate for monthly hosting budget ($100-1,000)
- Cart mandate per deployment (app-specific hosting)
- Cart mandate for database upgrades
- Cart mandate for CDN plan upgrades
- Audit trail for all deployment costs
- Cost threshold alerts (>$200/month per app)

---

#### 5. Content Agent ⚠️ **HIGH**
- **File:** `agents/content_agent.py` (18,026 bytes)
- **Purchases:**
  - **Stock images:** Unsplash+, Shutterstock, Getty ($29-249/month)
  - **Video hosting:** Vimeo Pro, Wistia ($20-99/month)
  - **Grammar/proofreading:** Grammarly Business ($12.50-15/user/month)
  - **Content research:** BuzzSumo, Ahrefs ($99-999/month)
  - **Translation services:** DeepL Pro, Google Translate API ($4.99-49.99/month)
- **Why AP2 Needed:**
  - Stock image subscriptions accumulate costs
  - Video hosting scales with usage
  - Content tools often have per-user pricing
  - Translation API usage can spike unexpectedly

**AP2 Integration Requirements:**
- Intent mandate for monthly content budget ($100-500)
- Cart mandate per stock image subscription
- Cart mandate per video hosting plan
- Cart mandate per content tool subscription
- Audit trail for all content resource purchases
- Cost threshold alerts (>$100/month)

---

#### 6. SEO Agent ⚠️ **HIGH**
- **File:** `agents/seo_agent.py` (9,109 bytes)
- **Purchases:**
  - **SEO tools:** Ahrefs, SEMrush, Moz Pro ($99-399/month)
  - **Backlink services:** LinkResearchTools ($499/month)
  - **Keyword research:** KWFinder, Mangools ($29.90-79.90/month)
  - **Rank tracking:** AccuRanker, SERPWatcher ($29-399/month)
  - **Technical SEO:** Screaming Frog SEO Spider Pro ($209/year)
- **Why AP2 Needed:**
  - SEO tools are expensive ($99-399/month each)
  - Autonomous keyword research incurs API costs
  - Backlink analysis tools have usage-based pricing
  - Rank tracking scales with number of keywords

**AP2 Integration Requirements:**
- Intent mandate for monthly SEO budget ($100-500)
- Cart mandate per SEO tool subscription
- Cart mandate for backlink service
- Cart mandate for rank tracking service
- Audit trail for all SEO tool expenses
- Cost threshold alerts (>$500/month)

---

#### 7. Email Agent ⚠️ **MEDIUM**
- **File:** `agents/email_agent.py` (8,132 bytes)
- **Purchases:**
  - **Email providers:** SendGrid, Mailgun, Postmark ($15-80/month)
  - **Email validation:** ZeroBounce, NeverBounce ($0.004-0.01/email)
  - **Transactional email:** Customer.io, Intercom ($50-499/month)
  - **Email templates:** Litmus, Email on Acid ($99-199/month)
- **Why AP2 Needed:**
  - Email send volume = direct costs
  - Email validation charges per email checked
  - Transactional email platforms scale with users
  - Template testing tools are subscription-based

**AP2 Integration Requirements:**
- Intent mandate for monthly email budget ($50-200)
- Cart mandate per email provider subscription
- Cart mandate for email validation credits
- Cart mandate for transactional email plan
- Audit trail for all email service costs
- Cost threshold alerts (>$100/month)

---

### 🟡 MEDIUM PRIORITY (Should Have AP2)

#### 8. Genesis Meta Agent ⚠️ **ORCHESTRATOR**
- **File:** `infrastructure/genesis_meta_agent.py`
- **Purchases:**
  - **LLM API usage:** OpenAI ($0.01-0.06/1K tokens), Anthropic ($0.25-15/1M tokens)
  - **Gemini API:** Google ($0.03-0.15/1M tokens)
  - **Local LLM hosting:** RunPod, Replicate ($0.0002-0.002/token)
  - **Database:** MongoDB Atlas ($0-100/month)
  - **Storage:** S3, GCS ($0.023-0.10/GB/month)
- **Why AP2 Needed:**
  - Genesis generates 10-100 businesses autonomously
  - Each business = 100K-1M tokens = $1-10 in API costs
  - Monthly LLM costs can reach $1,000-10,000
  - Storage scales with number of businesses

**AP2 Integration Requirements:**
- Intent mandate for monthly LLM budget ($500-5,000)
- Cart mandate per business generation (estimated tokens)
- Cart mandate for database upgrades
- Cart mandate for storage expansion
- Audit trail for all infrastructure costs
- Cost threshold alerts (>$1,000/month)

---

#### 9. Analyst Agent ⚠️ **MEDIUM**
- **File:** `agents/analyst_agent.py` (45,406 bytes)
- **Purchases:**
  - **Analytics platforms:** Mixpanel, Amplitude ($25-2,000/month)
  - **Data warehouses:** BigQuery, Snowflake ($50-1,000/month)
  - **BI tools:** Tableau, Looker ($35-75/user/month)
  - **Data sources:** Segment, Fivetran ($120-1,500/month)
- **Why AP2 Needed:**
  - Analytics platforms charge per user or event volume
  - Data warehouse costs scale with query volume
  - BI tools have per-user licensing
  - Data integration tools charge per source

**AP2 Integration Requirements:**
- Intent mandate for monthly analytics budget ($100-500)
- Cart mandate per analytics platform subscription
- Cart mandate per data warehouse usage
- Cart mandate per BI tool license
- Audit trail for all analytics expenses
- Cost threshold alerts (>$500/month)

---

## Agents NOT Requiring AP2 (12 agents)

### Read-Only / Free Operations

1. **QA Agent** - Runs tests locally, no external costs
2. **Security Agent** - Code scanning locally, no purchases
3. **Builder Agent** - Generates code locally, no costs
4. **Spec Agent** - Creates specifications, no purchases
5. **Support Agent** - Responds to tickets, no external costs
6. **Legal Agent** - Reviews documents, no purchases
7. **Maintenance Agent** - Code updates locally, no costs
8. **Onboarding Agent** - User flows, no external costs
9. **Reflection Agent** - Code review locally, no purchases
10. **Darwin Agent** - Evolution training locally, no costs
11. **SE-Darwin Agent** - Self-improvement locally, no purchases
12. **Research Discovery Agent** - Web research (uses free APIs)

**Note:** Some of these agents may make API calls (e.g., Research Discovery, Security scanning), but they don't initiate purchases or incur significant recurring costs.

---

## Implementation Priority

### Phase 1: Critical Agents (Week 1-2)
1. **Marketing Agent** - Highest spend risk ($10K+/month possible)
2. **Deploy Agent** - Recurring hosting costs ($100-1K/month)
3. **Genesis Meta Agent** - Orchestrates everything, LLM costs ($500-5K/month)

### Phase 2: High-Value Agents (Week 3-4)
4. **Content Agent** - Content tools and subscriptions ($100-500/month)
5. **SEO Agent** - Expensive SEO tools ($100-500/month)

### Phase 3: Medium Priority (Month 2)
6. **Email Agent** - Email service costs ($50-200/month)
7. **Analyst Agent** - Analytics platforms ($100-500/month)

---

## Cost Thresholds Recommendation

| Agent | Monthly Threshold | Per-Transaction Alert | Require Approval If |
|-------|-------------------|----------------------|---------------------|
| Marketing | $5,000 | >$1,000/campaign | Ad spend >$5K |
| Deploy | $1,000 | >$200/app | Hosting >$500/app |
| Genesis Meta | $5,000 | >$500/business | LLM costs >$1K/day |
| Content | $500 | >$100/subscription | Total >$300/month |
| SEO | $500 | >$100/tool | Tool >$200/month |
| Email | $200 | >$50/provider | Volume >10K/day |
| Analyst | $500 | >$100/platform | Query costs >$200 |

---

## AP2 Integration Template

Each agent should implement:

```python
from infrastructure.ap2_connector import (
    AP2Connector,
    CartItem,
    PaymentMethodDetails,
    ConsentStatus
)

class ExampleAgent:
    def __init__(self, ...):
        # Initialize AP2
        self.ap2_connector = AP2Connector()
        self.enable_ap2_consent = True
        self.current_intent_mandate = None
        self.cost_alert_threshold = 500.0  # Agent-specific threshold

    async def create_payment_intent_mandate(self, user_id, max_budget, task_description):
        """Create Intent Mandate for agent's monthly budget"""
        intent = await self.ap2_connector.create_intent_mandate(
            user_id=user_id,
            agent_id="example_agent",
            task_description=task_description,
            max_price_cents=int(max_budget * 100),
            currency="USD",
            valid_for_hours=720,  # 30 days
            allowed_categories=["agent_specific_category"],
            require_approval=True
        )
        self.current_intent_mandate = intent
        return intent

    async def request_payment_consent(self, user_id, service_name, price, subscription_type):
        """Request payment consent for specific purchase"""
        if not self.current_intent_mandate:
            self.current_intent_mandate = await self.create_payment_intent_mandate(...)

        cart_item = CartItem(
            item_id=f"service_{service_name}",
            name=f"{service_name} - {subscription_type}",
            quantity=1,
            unit_price_cents=int(price * 100),
            currency="USD"
        )

        cart = await self.ap2_connector.create_cart_mandate(
            intent_mandate_id=self.current_intent_mandate.mandate_id,
            items=[cart_item],
            user_id=user_id
        )

        # Auto-approve if below threshold (testing only)
        auto_approve = os.getenv("AP2_AUTO_APPROVE", "false").lower() == "true"
        if auto_approve and price <= 50.0:
            await self.ap2_connector.approve_cart_mandate(cart.mandate_id, user_id)
            return True, cart.mandate_id, None
        else:
            return False, cart.mandate_id, "Awaiting user approval"

    async def log_purchase(self, cart_mandate_id, service_name, cost, user_id):
        """Log purchase to audit trail"""
        self.ap2_connector.audit_logger.log_event(
            event_type="service_purchased",
            mandate_id=cart_mandate_id,
            user_id=user_id,
            agent_id="example_agent",
            data={
                "service": service_name,
                "cost_usd": cost,
                "timestamp": datetime.now().isoformat()
            }
        )
```

---

## Additional Engineering Recommendations

1. **Shared AP2 service layer:** Introduce `infrastructure/ap2_service.py` (or similar) that wraps intent/cart creation, HMAC verification, retries, approvals, and webhook callbacks; agents should send a consistent payload (`agent`, `resource`, `cost`, `metadata`, `budget`) so budgets, alerts, and audits are enforced centrally.
2. **Broaden agent coverage:** Extend AP2 consent to Analytics, Research, Support, Security, and Ops/Monitoring agents—all of which trigger paid APIs or provisioning flows and would otherwise bypass future consent when costs grow.
3. **Config-driven thresholds:** Move budgets into env-configurable constants (`MARKETING_MONTHLY_BUDGET`, `DEPLOY_HOSTING_LIMIT`, etc.); agents should compare spend against these before requesting new mandates and warn operators when soft limits are broken.
4. **AP2 QA harness:** Build pytest fixtures that mock AP2 outcomes (approved, budget hold, signature failure, timeout) and assert each agent handles failure paths without bypassing consent.
5. **Telemetry + dashboard alerts:** Stream AP2 intents/carts into `BusinessMonitor` so dashboards surface `ap2_intents`, `ap2_errors`, `budget_alerts`, and pending holds for ops visibility.
6. **Feature flags & kill switch:** Add flags such as `ENABLE_AP2_MARKETING` and a global `AP2_DISABLE_ALL` so spend can be paused per agent or entirely during incidents.
7. **Reconciliation job:** Implement a nightly audit that compares AP2 audit logs with agents’ `total_cost` counters; alert if discrepancies exceed 5% to catch retries or manual overrides going untracked.

## Security Considerations

1. **No Auto-Approval in Production:** `AP2_AUTO_APPROVE=false` for all agents
2. **Cost Thresholds:** Each agent enforces monthly spend limits
3. **Audit Trails:** Every purchase logged with cryptographic signatures
4. **User Consent:** Required for all purchases >$50
5. **Mandate Expiration:** 30-day maximum validity for intent mandates
6. **Signature Verification:** HMAC-SHA256 for all transactions

---

## Estimated Development Timeline

| Phase | Agents | Duration | Engineering Days |
|-------|--------|----------|------------------|
| Phase 1 | Marketing, Deploy, Genesis Meta | 2 weeks | 15 days |
| Phase 2 | Content, SEO | 1 week | 7 days |
| Phase 3 | Email, Analyst | 1 week | 7 days |
| **Total** | **7 agents** | **4 weeks** | **29 days** |

**Assumptions:**
- Each agent integration = 3-5 days (research, implement, test, audit)
- Hudson/Cora audits = 1 day per agent
- Bug fixes = 20% time buffer

---

## Total Cost Impact

**Current State (No AP2):**
- Genesis spends autonomously without user awareness
- No cost tracking or budget enforcement
- No audit trail for compliance
- Risk of runaway spend (>$10K/month possible)

**Future State (With AP2):**
- User approves all purchases >$50
- Monthly budgets enforced per agent
- Complete audit trail for tax/compliance
- Cost alerts prevent unexpected charges

**Estimated Monthly Savings:**
- Prevented unauthorized spend: $2,000-10,000/month
- Subscription optimization: $500-2,000/month
- Tax audit trail: Invaluable for compliance

---

## Conclusion

**9 of 21 agents require AP2 integration:**
- ✅ 2 agents complete (Billing, Domain Name)
- 🔴 5 high-priority agents (Marketing, Deploy, Content, SEO, Genesis Meta)
- 🟡 2 medium-priority agents (Email, Analyst)

**Recommended Action:**
Implement AP2 for all 7 remaining agents over 4 weeks, starting with Marketing Agent (highest spend risk) and Deploy Agent (recurring hosting costs).

**Total Integration Count:**
- AP2 = Integration #74 (completed for 2 agents)
- After full rollout: 9 payment-capable agents with AP2
- Total Genesis ecosystem: 74+ integrations

---

**Report Prepared By:** Claude Code
**Date:** November 14, 2025
**Status:** Ready for Implementation
