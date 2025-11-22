# Quick Reference: Fallback Chain & Cost Optimization

**Last Updated:** November 12, 2025

---

## Current Fallback Order

```
1. 🔷 Vertex AI (Gemini 2.0 Flash)
   Cost: $0.075/$0.30 per 1M tokens
   Status: Waiting for IAM permissions

2. 🟢 DeepSeek Chat ← ACTIVE NOW
   Cost: $0.14/$0.28 per 1M tokens
   Status: ✅ Ready (key configured)

3. 🟡 Mistral 7B
   Cost: $0.25/$0.75 per 1M tokens
   Status: ✅ Ready (key configured)

4. 🔴 Claude Sonnet 4
   Cost: $3/$15 per 1M tokens
   Status: ✅ Ready (last resort)

5. 🔴 GPT-4o
   Cost: $2.50/$10 per 1M tokens
   Status: ✅ Ready (last resort)
```

---

## Cost Per Business Generation

| Scenario | Model Used | Cost/Business | Daily Cost (100) | Monthly Cost |
|----------|-----------|---------------|------------------|--------------|
| **Ideal (Vertex AI working)** | Gemini 2.0 Flash | $0.0005 | $0.05 | $1.50 |
| **Current (using DeepSeek)** | DeepSeek Chat | $0.001 | $0.10 | $3.00 |
| **Previous (Claude fallback)** | Claude Sonnet 4 | $0.05 | $5.00 | $150.00 |

**Current savings vs. previous:** **$147/month** (98% reduction)

---

## How to Check Which Model Is Being Used

### Method 1: Watch Logs During Generation

```bash
# Run a business generation
python scripts/autonomous_fully_integrated.py --count 1 --min-score 70.0

# Watch for these log messages:
🔷 Routing builder_agent to Vertex AI Base Model (Gemini 2.0 Flash)
🟢 Routing builder_agent to DeepSeek (cheap fallback)
🟡 Routing builder_agent to Mistral (mid-cost fallback)
🔴 Routing builder_agent to Claude/GPT (expensive fallback)
```

### Method 2: Check Recent Logs

```bash
# Windows
findstr "Routing.*to" logs\genesis_agent.log | tail -20

# PowerShell
Get-Content logs\genesis_agent.log | Select-String "Routing.*to" | Select-Object -Last 20
```

### Method 3: Run Test Script

```bash
python scripts/test_fallback_chain.py
```

---

## Tongyi-DeepResearch Configuration

```bash
# Current .env settings
USE_TONGYI_RESEARCH=True
HF_TOKEN=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
```

**Status:** ✅ Active for Research Discovery Agent

**What it does:**
- Handles research queries 70% cheaper than Claude
- Specialized 30B parameter model (3B active via MoE)
- Two modes:
  - `react` (fast, 2000 tokens) - default
  - `heavy` (quality, 8000 tokens) - for complex research

**Savings:** $0.40-0.80 per research query vs. Claude

---

## Quick Commands

### Test Fallback Chain
```bash
python scripts/test_fallback_chain.py
```

### Generate Business (Watch Fallbacks)
```bash
python scripts/autonomous_fully_integrated.py --count 1 --min-score 70.0
```

### Check Logs for Fallback Usage
```bash
# See which model was used
type logs\genesis_agent.log | findstr "✅.*fallback success"

# Count DeepSeek uses
type logs\genesis_agent.log | findstr "DeepSeek.*success" | find /c "✅"

# Count Claude uses (should be 0 with new fallback)
type logs\genesis_agent.log | findstr "Claude.*success" | find /c "✅"
```

### Check API Key Configuration
```bash
python -c "import os; from infrastructure.load_env import load_genesis_env; load_genesis_env(); print('DeepSeek:', '✅' if os.getenv('DEEPSEEK_API_KEY') else '❌'); print('Mistral:', '✅' if os.getenv('MISTRAL_API_KEY') else '❌'); print('Tongyi:', '✅' if os.getenv('HF_TOKEN') else '❌')"
```

---

## Troubleshooting

### "DeepSeek fallback failed"

**Possible causes:**
1. API key expired/invalid
2. Rate limit exceeded
3. Network issues

**Solution:**
System will automatically fall back to Mistral, then Claude/GPT-4. No action needed unless all fallbacks fail.

### "All inference options exhausted"

**This means:**
All 5 models failed (very rare)

**Solution:**
1. Check internet connection
2. Verify all API keys are valid
3. Check API service status:
   - DeepSeek: https://platform.deepseek.com/
   - Mistral: https://console.mistral.ai/
   - Anthropic: https://console.anthropic.com/
   - OpenAI: https://platform.openai.com/

### Vertex AI Still Failing After IAM Grant

**Wait time:** IAM changes take 1-2 minutes to propagate

**Verify permissions:**
```bash
gcloud projects get-iam-policy genesis-api-477821 \
  --flatten="bindings[].members" \
  --filter="bindings.members:genesis-search@genesis-api-477821.iam.gserviceaccount.com"
```

Look for: `roles/aiplatform.user`

**If still failing after 5 minutes:**
1. Check service account file exists: `genesis-api.json`
2. Verify `GOOGLE_APPLICATION_CREDENTIALS` in .env points to correct path
3. Restart any running Genesis processes

---

## Expected Behavior

### First Business Generation (Cold Start)

```
[08:XX:XX] 🔷 Routing builder_agent to Vertex AI Base Model (Gemini 2.0 Flash)
[08:XX:XX] ERROR: Base Gemini fallback failed: 403 Permission denied
[08:XX:XX] 🟢 Routing builder_agent to DeepSeek (cheap fallback)
[08:XX:XX] ✅ DeepSeek fallback success for builder_agent
```

### Subsequent Generations (After Vertex AI Fixed)

```
[08:XX:XX] 🔷 Routing builder_agent to Vertex AI Base Model (Gemini 2.0 Flash)
[08:XX:XX] ✅ Vertex AI success for builder_agent
```

No fallback needed! ✅

---

## Cost Tracking

Genesis automatically tracks costs per model. Check usage stats:

```python
from infrastructure.halo_router import HALORouter

router = HALORouter.create_with_integrations()
stats = router.get_usage_stats()  # All agents
builder_stats = router.get_usage_stats("builder_agent")  # Single agent
```

**Stats include:**
- Total requests
- Success rate
- Fallback rate
- Total cost
- Average latency

---

## Summary

**What changed:** Added DeepSeek/Mistral to fallback chain before Claude/GPT-4

**Why it matters:** 95-98% cost reduction on fallbacks

**Current status:**
- ✅ DeepSeek active (cheapest fallback)
- ✅ Mistral ready (mid-cost)
- ✅ Claude/GPT-4 as last resort
- ✅ Tongyi-DeepResearch for research (70% cheaper)
- ⏳ Vertex AI waiting for IAM permissions (will be cheapest when fixed)

**No action needed:** Everything configured automatically from .env

**Next generation will use:** DeepSeek (saves $0.049 vs. Claude)

---

**For detailed information, see:**
- `FALLBACK_CHAIN_UPDATE.md` - Complete technical details
- `FIX_VERTEX_AI_PERMISSIONS.md` - Vertex AI IAM fix guide
- `scripts/test_fallback_chain.py` - Test all fallbacks
