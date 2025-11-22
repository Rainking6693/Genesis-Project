# Genesis Autonomous Business Operation

**Date:** November 12, 2025
**Status:** ✅ **FULLY AUTONOMOUS**
**Human Interaction:** Only for bills >$100

---

## Overview

Genesis operates **completely autonomously** from business creation to shutdown. The system:

1. ✅ Generates business ideas
2. ✅ Builds businesses with specialized agents
3. ✅ Deploys autonomously to Railway
4. ✅ Tracks revenue and metrics
5. ✅ Evaluates performance every 30 days
6. ✅ Shuts down underperforming businesses (score <50/100)

**NO HUMAN INTERACTION** except approving large bills (>$100).

---

## Complete Autonomous Flow

### 1. Business Creation (GenesisMetaAgent)

```
GenesisMetaAgent generates business idea
    ↓
Specialized agents build the business:
  - SEO Agent: Optimizes for search
  - Content Agent: Creates content
  - Marketing Agent: Designs marketing
  - Billing Agent: Integrates Stripe
  - QA Agent: Tests functionality
  - Builder Agent: Implements features
  - Deploy Agent: Prepares deployment
    ↓
Business ready for deployment
```

### 2. Autonomous Deployment

```
autonomous_deploy.py receives business
    ↓
Auto-detects app type (Node.js, Python, static)
    ↓
Creates platform config (railway.toml)
    ↓
Initializes git if needed
    ↓
Deploys to Railway (default)
    ↓
Returns deployment URL
```

### 3. Business Registration

```
business_lifecycle_manager.py registers business
    ↓
Creates monitoring record:
  - Business name
  - Deployment URL
  - Platform
  - Cost estimate
  - Initial metrics (revenue=0, users=0)
    ↓
Schedules first evaluation (30 days)
```

### 4. Metrics Tracking

```
Business runs autonomously
    ↓
Metrics collected:
  - Revenue (via Stripe webhook)
  - Users (via analytics)
  - Uptime (via health checks)
  - Error rate (via logs)
  - Response time (via monitoring)
    ↓
Metrics updated in business record
```

### 5. Performance Evaluation

```
After 30 days (or custom period):
    ↓
Calculate performance score (0-100):
  - Revenue/Profit: 40%
  - Uptime: 25%
  - Error Rate: 15%
  - Response Time: 10%
  - User Growth: 10%
    ↓
Compare to threshold (default: 50/100)
    ↓
Decision:
  - Score >= 50: Continue running
  - Score < 50: Shutdown business
```

### 6. Autonomous Shutdown

```
If score < threshold:
    ↓
Mark business as "shutdown"
    ↓
Record shutdown reason
    ↓
Stop platform deployment
    ↓
Free up resources
```

---

## Usage

### Quick Start - Create 3 Businesses

```bash
RUN_AUTONOMOUS.bat
```

This will:
1. Generate 3 business ideas
2. Build each business with agents
3. Deploy each business autonomously
4. Register for monitoring
5. Print deployment URLs

### Continuous Operation

```bash
python scripts/autonomous_business_orchestrator.py --continuous
```

This runs indefinitely:
- Creates 1 new business per day
- Evaluates all businesses daily
- Shuts down underperforming businesses

### Evaluate Existing Businesses

```bash
python scripts/autonomous_business_orchestrator.py --evaluate-only
```

This evaluates all active businesses without creating new ones.

### Custom Configuration

```bash
# Create 10 businesses
python scripts/autonomous_business_orchestrator.py --count 10

# Continuous mode with 12-hour evaluation cycles
python scripts/autonomous_business_orchestrator.py --continuous --interval 12
```

---

## Configuration

### Environment Variables

```bash
# Deployment (in .env)
DEFAULT_DEPLOY_PLATFORM=railway  # Default platform
DISABLE_VERCEL_DEPLOY=true       # Vercel disabled

# Lifecycle Thresholds
EVALUATION_THRESHOLD=50.0        # Min score to survive (0-100)
EVALUATION_PERIOD_DAYS=30        # Days between evaluations
LARGE_BILL_THRESHOLD=50.0       # Bill amount requiring approval

# Platform Costs (monthly)
RAILWAY_COST=2.50               # Average Railway cost per app
RENDER_COST=0.00                # Render free tier
```

### Performance Score Formula

```python
score = (
    (revenue / 100) * 40 +      # Revenue: $100/month = 40 points
    (uptime / 100) * 25 +       # Uptime: 99%+ = 25 points
    (15 - error_rate * 300) +   # Error Rate: 0% = 15 points
    (10 - response_ms / 100) +  # Response: <200ms = 10 points
    (users / 100) * 10          # Users: 100+ = 10 points
)
```

**Maximum Score:** 100
**Default Threshold:** 50

---

## File Structure

### Core Modules

**`infrastructure/autonomous_deploy.py`** (385 lines)
- Autonomous deployment without human interaction
- Auto-detects app type
- Creates platform configs
- Deploys to Railway/Render/PythonAnywhere/GitHub Pages

**`infrastructure/business_lifecycle_manager.py`** (530 lines)
- Complete lifecycle management
- Business registration
- Metrics tracking
- Performance evaluation
- Autonomous shutdown
- Large bill approval workflow

**`scripts/autonomous_business_orchestrator.py`** (282 lines)
- End-to-end orchestration
- Integrates business generation + deployment + monitoring
- Continuous operation mode
- Batch operation mode

### Data Directories

```
data/
├── deployments/          # Deployment records
│   └── {deployment_id}.json
├── businesses/           # Business lifecycle records
│   └── {business_name}.json
└── approvals/            # Large bill approval requests
    └── {business}_{timestamp}.json
```

---

## Business Record Format

```json
{
  "business_name": "invoice-app",
  "app_path": "businesses/fully_integrated/saas/invoice-app",
  "deployment_url": "https://invoice-app.up.railway.app",
  "deployment_id": "railway_invoice-app_1699804800",
  "platform": "railway",
  "created_at": "2025-11-12T12:00:00Z",
  "status": "active",
  "metrics": {
    "revenue": 150.50,
    "users": 45,
    "uptime_percent": 99.2,
    "error_rate": 0.01,
    "avg_response_time_ms": 180.0,
    "days_active": 32,
    "cost": 2.50,
    "profit": 148.00
  },
  "evaluations": [
    {
      "timestamp": "2025-12-12T12:00:00Z",
      "score": 67.5,
      "threshold": 50.0,
      "passed": true,
      "decision": "continue"
    }
  ],
  "next_evaluation": "2026-01-12T12:00:00Z"
}
```

---

## Performance Monitoring

### Real-Time Metrics

Businesses automatically track:
- **Revenue:** Via Stripe webhooks
- **Users:** Via analytics integration
- **Uptime:** Via health check pings
- **Errors:** Via log aggregation
- **Response Time:** Via request monitoring

### Example Metrics Collection

```python
from infrastructure.business_lifecycle_manager import get_lifecycle_manager

manager = get_lifecycle_manager()

# Update metrics (called by monitoring webhooks)
await manager.update_metrics(
    business_name="invoice-app",
    revenue=150.50,
    users=45,
    uptime_percent=99.2,
    error_rate=0.01,
    avg_response_time_ms=180.0
)
```

---

## Evaluation Examples

### High-Performing Business (Score: 85/100)

```
Business: invoice-app
Revenue: $250/month (40 points)
Uptime: 99.8% (25 points)
Error Rate: 0.1% (12 points)
Response: 150ms (8.5 points)
Users: 120 (10 points)

Total Score: 95.5/100 ✅ CONTINUES
```

### Low-Performing Business (Score: 32/100)

```
Business: broken-app
Revenue: $5/month (2 points)
Uptime: 85% (21.25 points)
Error Rate: 5% (0 points)
Response: 800ms (2 points)
Users: 8 (0.8 points)

Total Score: 26.05/100 ❌ SHUTDOWN
Reason: Below threshold (50/100)
```

---

## Large Bill Approval

### Only Human Interaction Point

When a bill exceeds $100, Genesis:

1. **Detects large bill** during cost tracking
2. **Pauses operation** for that business
3. **Creates approval request:**
   ```json
   {
     "business_name": "high-traffic-app",
     "amount": 250.00,
     "description": "Railway usage - 1M requests",
     "requested_at": "2025-11-12T14:30:00Z",
     "status": "pending"
   }
   ```
4. **Saves to:** `data/approvals/{business}_{timestamp}.json`
5. **Logs warning:** `⚠️ LARGE BILL REQUIRES APPROVAL`
6. **Waits for human** to approve/reject

### Approval Process

**Manual approval:**
```bash
# Review pending approvals
ls data/approvals/*.json

# Approve
echo '{"status": "approved"}' > data/approvals/{file}.json

# Reject
echo '{"status": "rejected"}' > data/approvals/{file}.json
```

**Auto-approval for bills <$100:**
All bills under threshold are automatically approved.

---

## Continuous Operation Example

### Day 1
- Genesis creates "invoice-app"
- Agents build the app
- Deployed to Railway: `https://invoice-app.up.railway.app`
- Cost: $2.50/month
- Status: Active, monitoring started

### Day 2-29
- Business runs autonomously
- Revenue: $0 → $50 → $100 → $150
- Users: 0 → 10 → 25 → 45
- Metrics tracked automatically

### Day 30
- **Evaluation triggered**
- Score: 67.5/100 (above threshold)
- Decision: **CONTINUE**
- Next evaluation: Day 60

### Day 60
- **Evaluation triggered**
- Score: 85/100 (strong performance)
- Decision: **CONTINUE**
- Next evaluation: Day 90

### Meanwhile...
- **Day 35:** Genesis creates "broken-app"
- **Day 65:** Evaluation score: 28/100
- **Decision:** ❌ **SHUTDOWN** (below threshold)
- **Resources freed** for new businesses

---

## Cost Analysis

### Per Business

**Monthly Costs:**
- Railway hosting: $2.50/month
- Domain (optional): $0-12/month
- Database (included): $0

**Total:** ~$2.50-15/month per business

### At Scale (100 Businesses)

**Scenario: 50% success rate**
- 100 businesses created
- 50 evaluated after 30 days
- 25 shutdown (score <50)
- 25 continue (score >=50)

**Costs:**
- Active businesses: 75 × $2.50 = $187.50/month
- Revenue (avg $50/business): 75 × $50 = $3,750/month
- **Profit:** $3,562.50/month

---

## API Integration

### For External Systems

```python
# Deploy a business programmatically
from infrastructure.autonomous_deploy import deploy_business

result = await deploy_business(
    app_path="businesses/fully_integrated/saas/my-app",
    business_name="my-app",
    platform="railway"  # optional
)

print(f"Deployed: {result.deployment_url}")
```

### For Monitoring Systems

```python
# Get business summary
from infrastructure.business_lifecycle_manager import get_lifecycle_manager

manager = get_lifecycle_manager()
summary = await manager.get_business_summary()

print(f"Active: {summary['active_businesses']}")
print(f"Revenue: ${summary['total_revenue']}")
print(f"Profit: ${summary['total_profit']}")
```

---

## Safety Features

### Autonomous Safeguards

1. **Cost Caps:**
   - Bills >$100 require approval
   - Per-business cost tracking
   - Shutdown if cost > revenue

2. **Performance Thresholds:**
   - Minimum score: 50/100
   - Evaluation period: 30 days
   - Grace period for new businesses

3. **Error Handling:**
   - Automatic retry on deployment failure
   - Rollback on critical errors
   - Alert on repeated failures

4. **Resource Limits:**
   - Max businesses per account
   - Rate limiting on deployments
   - Bandwidth monitoring

---

## Troubleshooting

### Business Not Deploying

**Check logs:**
```bash
type data\deployments\{deployment_id}.json
```

**Verify platform:**
```bash
railway status  # For Railway
render status   # For Render
```

### Evaluation Not Running

**Manual trigger:**
```bash
python scripts\autonomous_business_orchestrator.py --evaluate-only
```

**Check business record:**
```bash
type data\businesses\{business_name}.json
```

### Large Bill Not Approving

**Check approval requests:**
```bash
dir data\approvals\
type data\approvals\{latest}.json
```

**Approve manually:**
```bash
echo {"status": "approved"} > data\approvals\{file}.json
```

---

## Summary

Genesis operates **100% autonomously** for:
- ✅ Business idea generation
- ✅ Business development
- ✅ Deployment
- ✅ Revenue tracking
- ✅ Performance evaluation
- ✅ Shutdown decisions

**Only human input:** Approve bills >$100

**Launch command:**
```bash
RUN_AUTONOMOUS.bat
```

**Continuous operation:**
```bash
python scripts\autonomous_business_orchestrator.py --continuous
```

---

**Version:** 1.0
**Date:** November 12, 2025
**Status:** ✅ FULLY AUTONOMOUS
**Human Interaction:** <1% (large bills only)
