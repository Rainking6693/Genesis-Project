# Fix Vertex AI Permissions Error

**Error:** `403 Permission 'aiplatform.endpoints.predict' denied on 'projects/genesis-api-477821/locations/us-central1/publishers/google/models/gemini-2.0-flash-exp'`

**Service Account:** `genesis-search@genesis-api-477821.iam.gserviceaccount.com`
**Project ID:** `genesis-api-477821`

---

## Quick Fix (Recommended)

### Option 1: Grant Vertex AI User Role (Easiest)

Run this command in Google Cloud Shell or locally with `gcloud` CLI:

```bash
gcloud projects add-iam-policy-binding genesis-api-477821 \
  --member="serviceAccount:genesis-search@genesis-api-477821.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

**What this does:** Grants full Vertex AI access (predict, list models, etc.)

**Time:** 1-2 minutes

---

### Option 2: Grant Minimal Permissions (Most Secure)

If you want to follow the principle of least privilege:

```bash
# Grant only prediction permission
gcloud projects add-iam-policy-binding genesis-api-477821 \
  --member="serviceAccount:genesis-search@genesis-api-477821.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# OR create custom role with only predict permission
gcloud iam roles create VertexAIPredictor \
  --project=genesis-api-477821 \
  --title="Vertex AI Predictor" \
  --description="Allows predicting with Vertex AI models" \
  --permissions=aiplatform.endpoints.predict

gcloud projects add-iam-policy-binding genesis-api-477821 \
  --member="serviceAccount:genesis-search@genesis-api-477821.iam.gserviceaccount.com" \
  --role="projects/genesis-api-477821/roles/VertexAIPredictor"
```

**Time:** 3-5 minutes

---

## Manual Fix via Google Cloud Console (No CLI Required)

If you prefer using the web interface:

### Step 1: Open IAM & Admin
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=genesis-api-477821
2. Make sure you're in project **genesis-api-477821**

### Step 2: Find Your Service Account
1. In the IAM page, look for: `genesis-search@genesis-api-477821.iam.gserviceaccount.com`
2. Click the **pencil icon** (Edit) next to it

### Step 3: Add Vertex AI Role
1. Click **+ ADD ANOTHER ROLE**
2. Search for: `Vertex AI User`
3. Select: `Vertex AI User` (full access) OR `Vertex AI Predictor` (minimal)
4. Click **SAVE**

### Step 4: Wait for Propagation
- IAM changes can take 1-2 minutes to propagate
- No restart required for Genesis

**Time:** 2-3 minutes

---

## Verify the Fix

After granting permissions, test with:

```bash
# Test Vertex AI access
python scripts/test_vertex_ai_access.py
```

Or run a quick business generation to see if Vertex AI is used:

```bash
python scripts/autonomous_fully_integrated.py --count 1 --min-score 70.0
```

**Expected log output:**
```
[08:XX:XX] Routing builder_agent to Vertex AI Base Model (Gemini 2.0 Flash)
[08:XX:XX] ✅ Vertex AI success for builder_agent
```

**Before fix:**
```
[08:XX:XX] ERROR: Base Gemini fallback failed: 403 Permission denied
[08:XX:XX] 🔴 Routing builder_agent to Claude/GPT (expensive fallback)
```

---

## Alternative: Use Google AI Studio Instead (Free Tier)

If you don't want to configure Vertex AI, you can use Google AI Studio API which already works:

### Option A: Disable Vertex AI Routing

In `.env`, change:
```bash
ENABLE_VERTEX_AI=False  # Change from True to False
```

Genesis will use Google AI Studio (`GOOGLE_AI_STUDIO_KEY`) instead, which is already configured and working.

**Pros:**
- No IAM configuration needed
- Free tier available
- Same Gemini models

**Cons:**
- Less control over fine-tuned models
- Lower rate limits than Vertex AI

---

## Expected Cost Impact

### Current (with fallback to Claude/GPT-4):
- **Builder agent:** ~$0.05-0.10 per business (Claude)
- **10 businesses/day:** $0.50-1.00/day = $15-30/month

### After Vertex AI fix:
- **Builder agent:** ~$0.005-0.01 per business (Gemini 2.0 Flash)
- **10 businesses/day:** $0.05-0.10/day = $1.50-3.00/month

**Monthly savings:** $13.50-27.00/month = $162-324/year

---

## Troubleshooting

### Error persists after granting permissions?

**Check 1: Verify role was granted**
```bash
gcloud projects get-iam-policy genesis-api-477821 \
  --flatten="bindings[].members" \
  --filter="bindings.members:genesis-search@genesis-api-477821.iam.gserviceaccount.com"
```

You should see `roles/aiplatform.user` in the output.

**Check 2: Verify service account is being used**
```bash
echo $GOOGLE_APPLICATION_CREDENTIALS
# Should output: C:\Users\Ben\Desktop\Github\Claude-Clean-Code-Genesis\genesis-api.json
```

**Check 3: Restart any running processes**
```bash
# If you have any Genesis processes running, restart them
# No restart needed if using autonomous_fully_integrated.py
```

### Still getting errors?

**Check Vertex AI API is enabled:**
```bash
gcloud services enable aiplatform.googleapis.com --project=genesis-api-477821
```

**Check service account key is valid:**
```bash
gcloud auth activate-service-account --key-file=genesis-api.json
gcloud auth list
```

You should see `genesis-search@genesis-api-477821.iam.gserviceaccount.com` as active.

---

## Quick Command Reference

```bash
# Grant Vertex AI User role (recommended)
gcloud projects add-iam-policy-binding genesis-api-477821 \
  --member="serviceAccount:genesis-search@genesis-api-477821.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Enable Vertex AI API (if not enabled)
gcloud services enable aiplatform.googleapis.com --project=genesis-api-477821

# Verify permissions
gcloud projects get-iam-policy genesis-api-477821 \
  --flatten="bindings[].members" \
  --filter="bindings.members:genesis-search@genesis-api-477821.iam.gserviceaccount.com"

# Test Vertex AI access
python scripts/autonomous_fully_integrated.py --count 1 --min-score 70.0
```

---

## Recommended Solution

**For production use:** Follow **Option 1** (Grant Vertex AI User role via gcloud CLI or Google Cloud Console)

**Estimated time:** 2-3 minutes
**Cost savings:** $162-324/year
**Complexity:** LOW

Once fixed, Genesis will automatically use Vertex AI (Gemini 2.0 Flash) instead of falling back to Claude/GPT-4, reducing costs by ~90% for those operations.

---

**Status:** Ready to implement
**Next action:** Run one of the commands above or follow the manual console steps
