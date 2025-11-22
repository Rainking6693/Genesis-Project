# Genesis Security Audit - Fix Checklist

**Based on:** GeminiAUDIT11.20.md
**Overall Risk Score:** 6.5/10 (Medium-High Risk)
**Target:** Production-ready in 2-3 weeks

---

## 🔴 CRITICAL (Fix Immediately)

### SSRF Prevention
- [ ] **Implement URL whitelist for PlaywrightEnv.goto()**
  - File: `infrastructure/openenv_wrapper.py`
  - Effort: 2 hours
  - Action: Add `ALLOWED_DOMAINS` whitelist and `validate_url()` function
  - Impact: Prevents access to internal services (localhost, cloud metadata)

### Database Security
- [ ] **Use least-privilege Supabase keys**
  - File: `infrastructure/openenv_wrapper.py`
  - Effort: 4 hours
  - Action: Create agent-specific keys with Row-Level Security (RLS)
  - Action: Restrict to SELECT, INSERT only (no DELETE, UPDATE on critical tables)
  - Impact: Prevents database wipeout by compromised agents

### Authentication Security
- [ ] **Load master_secret from secure vault**
  - File: `infrastructure/agent_auth_registry.py`
  - Effort: 2 hours
  - Action: Load `AGENT_AUTH_MASTER_SECRET` from AWS Secrets Manager or HashiCorp Vault
  - Action: Raise RuntimeError if not set
  - Impact: Prevents auth loss on system restart

---

## 🟠 HIGH

### Plan Validation
- [ ] **Disable AOPValidator "Relaxed Mode" in production**
  - File: `infrastructure/aop_validator.py`
  - Effort: 1 hour
  - Action: Check if registry is empty and `ENVIRONMENT == "production"`, raise RuntimeError
  - Impact: Prevents execution of unvalidated agent plans

### Sandbox Security
- [ ] **Add runtime enforcement for ES_EVAL_MODE**
  - File: `infrastructure/evolution_strategies/eval_sandbox.py`
  - Effort: 2 hours
  - Action: Enforce `ES_EVAL_MODE="ISOLATED"` at runtime, raise RuntimeError if not set
  - Action: Add Docker `--network=none` flag to disable network access
  - Impact: Prevents perturbed models from accessing production systems

### Prompt Injection Defense
- [ ] **Enable WaltzRL blocking mode in production**
  - File: `infrastructure/waltzrl_safety.py`
  - Effort: 2 hours
  - Action: Set `enable_blocking=True` for production environment
  - Impact: Blocks unsafe prompts instead of just logging

- [ ] **Deploy WaltzRL Stage 2 checkpoints**
  - File: `infrastructure/waltzrl_safety.py`
  - Effort: 2 hours
  - Action: Ensure LLM-based collaborative filtering checkpoints are available
  - Action: Monitor that Stage 2 is active (not falling back to Stage 1)
  - Impact: Stronger prompt injection defense beyond regex patterns

---

## 🟡 MEDIUM 

### Advanced Prompt Security
- [ ] **Implement LLM-based guardrail agent**
  - File: New file - `infrastructure/guardrail_agent.py`
  - Effort: 8 hours
  - Action: Pre-screen user inputs with LLM (e.g., Claude with Constitutional AI)
  - Action: Detect novel jailbreak attempts (Unicode encoding, foreign languages, novel phrasing)
  - Impact: Catches prompt injection attempts that bypass regex filters

### Data Leakage Protection
- [ ] **Encrypt agent tokens in memory**
  - File: `infrastructure/agent_auth_registry.py`
  - Effort: 4 hours
  - Action: Use `cryptography.fernet` to encrypt tokens in `self.agent_tokens` dict
  - Action: Decrypt only when needed for verification
  - Impact: Protects against memory dump attacks

### Configuration Management
- [ ] **Move X402_DENY_VENDORS to database**
  - File: `infrastructure/x402_client.py`
  - Effort: 6 hours
  - Action: Migrate from comma-separated env var to database table
  - Action: Create admin UI for vendor blocklist management
  - Impact: Easier vendor management, prevents misconfiguration

### Code Security
- [ ] **Add pickle, marshal, shelve to dangerous imports list**
  - File: `infrastructure/security_utils.py` (in `validate_generated_code`)
  - Effort: 1 hour
  - Action: Block `pickle`, `marshal`, `shelve` imports in generated code
  - Impact: Prevents arbitrary code execution via deserialization attacks

### Credential Redaction
- [ ] **Extend redact_credentials with LLM-based detection**
  - File: `infrastructure/security_utils.py`
  - Effort: 4 hours
  - Action: Add LLM-based pattern detection for non-standard credential formats
  - Impact: Catches credentials that don't match regex patterns

### HTTPS Enforcement
- [ ] **Remove A2A_ALLOW_HTTP override or restrict to localhost**
  - File: `infrastructure/a2a_connector.py`
  - Effort: 1 hour
  - Action: Remove `A2A_ALLOW_HTTP` env var OR restrict to `localhost` only
  - Impact: Prevents accidental HTTP usage in staging/CI

### Token Management
- [ ] **Implement 6-hour token rotation for high-privilege agents**
  - File: `infrastructure/agent_auth_registry.py`
  - Effort: 4 hours
  - Action: Auto-rotate tokens every 6 hours for agents with elevated privileges
  - Action: Notify agents of rotation via A2A protocol
  - Impact: Limits exposure window for compromised tokens

---

## 🟢 LOW (Nice to Have)

### Observability
- [ ] **Add LLM-based log scanning for credentials**
  - Effort: 6 hours
  - Action: Periodically scan logs with LLM to detect leaked credentials
  - Impact: Catches novel credential formats in logs

### Monitoring
- [ ] **Monitor circuit breaker metrics**
  - Effort: 2 hours
  - Action: Track frequency of OPEN state in circuit breakers
  - Action: Alert when threshold exceeded (indicates systemic issues)
  - Impact: Early detection of cascading failures

### Autonomy Safeguards
- [ ] **Audit Memori access controls**
  - File: `infrastructure/memory/memori_sql_engine.py`
  - Effort: 4 hours
  - Action: Ensure agents can't read other agents' trajectory data
  - Impact: Prevents information leakage between agents

- [ ] **Disable DreamGym in production or add validation**
  - File: `infrastructure/evolution_strategies/dreamgym_engine.py`
  - Effort: 2 hours
  - Action: Disable synthetic data generation in production OR add data validation
  - Impact: Prevents biased/poisoned synthetic data from affecting production

---


## Risk Mitigation Strategy

**Before Full Production:**
1. ✅ Fix all CRITICAL issues (3 tasks)
2. ✅ Fix all HIGH issues (4 tasks)
3. ✅ Deploy to staging with human oversight
4. ✅ Monitor for 2 weeks
5. ✅ Re-audit security posture
6. ✅ Fix MEDIUM issues discovered during monitoring
7. ✅ Full production deployment with gradual rollout

**Quarterly Maintenance:**
- Security audit every 3 months
- Review and update blocklists/whitelists
- Rotate all credentials and tokens
- Update WaltzRL checkpoints


