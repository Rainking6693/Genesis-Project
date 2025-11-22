# 🚨 SECURITY BREACH - IMMEDIATE CREDENTIAL ROTATION REQUIRED

**Date:** November 18, 2025
**Severity:** CRITICAL
**Status:** ACTIVE BREACH

## Executive Summary

The file `config/production.env` containing production credentials was committed to git on **November 15-16, 2025** and has been in the public repository for **3 days**. All credentials in this file are now **PERMANENTLY COMPROMISED** and must be rotated immediately.

## Compromised Credentials

### 1. Discord Webhooks (9 URLs) - CRITICAL

**Impact:** Attackers can:
- Send fake alerts to your Discord channels
- Spam your monitoring systems
- Impersonate the Genesis system
- Disrupt operations

**Action Required:**
1. Go to Discord Server Settings → Integrations → Webhooks
2. Delete ALL existing webhooks:
   - DISCORD_WEBHOOK_DASHBOARD
   - DISCORD_WEBHOOK_COMMANDS
   - DISCORD_WEBHOOK_ALERTS
   - DISCORD_WEBHOOK_DEPLOYMENTS
   - DISCORD_WEBHOOK_METRICS
   - DISCORD_WEBHOOK_REVENUE
   - DISCORD_WEBHOOK_ERRORS
   - DISCORD_WEBHOOK_HOPX_ENVIRONMENTS
   - DISCORD_WEBHOOK_HOPX_ERRORS
3. Create NEW webhooks with different URLs
4. Update `config/production.env` (NOT in git!)
5. Update environment variables in production deployment

**Timeline:** Rotate IMMEDIATELY (within 1 hour)

---

### 2. HOPX API Key - CRITICAL

**Exposed Key:** `hopx_live_0P9XWheLckQM.wFP6woXlecV6UzZomLUoxh7hjO1QQsRosuiksNau2kI`

**Impact:** Attackers can:
- Use your HOPX API quota
- Incur charges on your account
- Execute code in your sandboxed environments
- Access your business artifacts
- Potentially pivot to other systems

**Action Required:**
1. Login to HOPX dashboard: https://hopx.ai/dashboard
2. Navigate to API Keys section
3. REVOKE the exposed key immediately
4. Generate a NEW API key
5. Update `config/production.env` (NOT in git!)
6. Update environment variables in production deployment
7. Monitor HOPX usage for the past 3 days for suspicious activity

**Timeline:** Rotate IMMEDIATELY (within 1 hour)

---

### 3. Name.com API Username - MEDIUM

**Exposed Username:** `rainking6693@gmail.com` (in CLAUDE.md - now fixed)

**Impact:**
- Account enumeration
- Targeted phishing attacks
- Social engineering

**Action Required:**
1. Consider rotating the Name.com API token as a precaution
2. Enable 2FA on Name.com account if not already enabled
3. Monitor account for suspicious domain registration attempts

**Timeline:** Rotate within 24 hours (precautionary)

---

### 4. x402 Wallet Configuration - MEDIUM

**Note:** The exposed values are placeholders:
- `X402_WALLET_KEY=<generate-secure-key>` (placeholder, not real)
- `X402_WALLET_ADDRESS=<hot-wallet-address>` (placeholder, not real)
- `X402_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY` (placeholder)

**Impact:** LOW - These are template values, not actual credentials

**Action Required:**
1. Verify that production x402 wallet keys are NOT in git
2. Ensure real wallet keys are in secure secrets manager
3. Rotate RPC endpoint API key if it was ever real

**Timeline:** Verify within 24 hours

---

## Git History Cleanup

The file `config/production.env` must be removed from git history to prevent future exposure.

### Option 1: BFG Repo-Cleaner (Recommended)

```bash
# Install BFG
# macOS: brew install bfg
# Linux: apt-get install bfg

# Clone a fresh copy
git clone --mirror <repo-url> genesis-mirror.git
cd genesis-mirror.git

# Remove the file from all commits
bfg --delete-files production.env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push --force
```

### Option 2: git filter-branch (Alternative)

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch config/production.env" \
  --prune-empty --tag-name-filter cat -- --all

git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### Option 3: Start Fresh Repository (Most Secure)

If the repository is relatively new (only a few days old), consider:
1. Create a new empty repository
2. Copy all files EXCEPT git history
3. Ensure `.gitignore` is correct
4. Make initial commit
5. Push to new repository
6. Update all references to new repository URL

---

## Fixed Issues

✅ **Fixed:** `.gitignore` now properly excludes `config/*.env` files
✅ **Fixed:** Email address removed from `CLAUDE.md`
✅ **Fixed:** RCE vulnerability in `infrastructure/agent_s_backend.py`

---

## Prevention Measures Implemented

1. ✅ Updated `.gitignore` with explicit `config/*.env` exclusion
2. ✅ Created this security alert document
3. ✅ Fixed RCE vulnerability (exec → safe_pyautogui_executor)
4. ✅ Removed PII from documentation

## Additional Recommendations

### 1. Secrets Management (Implement ASAP)

Move ALL production credentials to a secrets manager:
- **AWS Secrets Manager** (if using AWS)
- **Google Secret Manager** (if using GCP)
- **Azure Key Vault** (if using Azure)
- **HashiCorp Vault** (self-hosted)
- **1Password/LastPass for Teams** (small teams)

### 2. Pre-Commit Hooks

Install `git-secrets` or `detect-secrets`:

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
apt-get install git-secrets  # Linux

# Setup
cd /home/user/Claude-Clean-Code-Genesis
git secrets --install
git secrets --register-aws
git secrets --add 'DISCORD_WEBHOOK_[A-Z_]*=https://discord'
git secrets --add 'HOPX_API_KEY=[a-zA-Z0-9_.-]+'
git secrets --add '[a-zA-Z0-9_]*_API_KEY=[a-zA-Z0-9-]+'
```

### 3. Environment Variable Validation

Add startup validation to detect missing or placeholder credentials:

```python
# In infrastructure/load_env.py
def validate_production_secrets():
    """Validate that production secrets are set and not placeholders"""
    if os.getenv("GENESIS_ENV") == "production":
        required = [
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
            "HOPX_API_KEY",
            "DISCORD_WEBHOOK_DASHBOARD",
        ]

        for key in required:
            value = os.getenv(key, "")
            if not value or value.startswith("<") or "YOUR_KEY" in value:
                raise ValueError(f"Production secret {key} is missing or placeholder!")
```

### 4. Regular Security Audits

- **Weekly:** Scan git history for accidentally committed secrets
- **Monthly:** Rotate API keys as a best practice
- **Quarterly:** Full security audit of all credentials

---

## Incident Timeline

- **Nov 15, 2025:** `config/production.env` first committed with real secrets
- **Nov 16, 2025:** Additional commits with updated secrets
- **Nov 18, 2025:** Security breach discovered during comprehensive audit
- **Nov 18, 2025:** `.gitignore` fixed, email removed from docs, RCE patched

---

## Contact

If you have questions about this security incident or need assistance with credential rotation:

1. Rotate credentials FIRST (don't wait)
2. Review git history for any other exposures
3. Monitor all services for suspicious activity for the next 7 days
4. Consider implementing secrets manager before redeploying

---

**PRIORITY:** This is a CRITICAL security incident. Rotate credentials NOW before continuing development.
