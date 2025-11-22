Genesis Clean Code - Security Audit Report

Executive Summary

Overall Risk Score: 6.5/10 (Medium-High Risk)



Audit Date: November 20, 2025

Audit Scope: Fully autonomous multi-agent system for unsupervised production operation

Critical Focus: Security, autonomy risks, cost explosion, and data leakage



Key Findings

2 HIGH-severity vulnerabilities requiring immediate attention (SSRF, database permissions)

5 MEDIUM-severity risks related to authentication, prompt injection, and configuration

Strong foundation in error handling, observability, and isolation mechanisms

Defense-in-depth approach with multiple security layers

1\. Architecture Overview

Core Components:



Orchestration: 

GenesisMetaAgent

&nbsp;→ 

HTDAGPlanner

&nbsp;→ 

HALORouter

&nbsp;→ 

AOPValidator

Communication: 

A2AConnector

&nbsp;(TOON Protocol, Agent-to-Agent)

Safety: 

WaltzRL

, SecurityUtils, 

AgentAuthRegistry

Autonomy: AgentEvolver, ES Evaluation Sandbox, 

TrajectoryPool

Financial: 

X402Client

&nbsp;(HTTP 402 payment handling, budget enforcement)

Observability: OpenTelemetry (OTEL) distributed tracing, 

CorrelationContext

2\. Security Audit (Highest Priority)

2.1 Prompt Injection \& Jailbreaking

Risk Level: MEDIUM



Findings:



sanitize\_for\_prompt

&nbsp;uses blacklist-based filtering (removes <|im\_start|>, "ignore previous instructions", etc.)

HTDAGPlanner.\_validate\_llm\_output enforces length limits (10,000 chars) and dangerous pattern detection

WaltzRL Safety: Implements collaborative filtering (Query + Response screening)

Stage 1: Pattern-based (regex)

Stage 2: LLM collaborative (requires checkpoints)

Default: enable\_blocking=False (log-only mode)

Vulnerabilities:



Blacklists are reactive and can be bypassed via:

Unicode encoding (\\u0069gnore previous instructions)

Foreign language equivalents

Novel phrasing ("disregard all prior context")

WaltzRL defaults to Stage 1 if checkpoints missing → weaker protection

No LLM-based guardrail for pre-screening user inputs

Recommendations:



\[HIGH] Implement LLM-based "guardrail agent" to pre-screen prompts (e.g., Anthropic's Claude with Constitutional AI)

\[MEDIUM] Enable WaltzRL.enable\_blocking=True in production

\[MEDIUM] Ensure WaltzRL Stage 2 checkpoints are deployed and monitored

2.2 Tool-Use Escape \& Remote Code Execution (RCE)

Risk Level: HIGH



Findings:



validate\_generated\_code

&nbsp;parses AST and blocks:

Dangerous imports: 

os

, subprocess, 

sys

, shutil

Dangerous calls: 

eval

, 

exec

, compile, \_\_import\_\_

safe\_eval

&nbsp;uses ast.literal\_eval() (safe for literals only)

OpenEnv (Playwright): goto(url) action allows arbitrary URL navigation

OpenEnv (Supabase): Relies on supabase\_key permissions for DB access

Vulnerabilities:



\[HIGH] SSRF via Playwright goto:

Agents can navigate to internal services: http://localhost:8080/admin, http://169.254.169.254/latest/meta-data/ (AWS metadata)

No URL whitelist or validation

\[HIGH] Database Wipeout via Supabase:

If supabase\_key has service\_role privileges, a compromised agent can DELETE FROM users or drop tables

\[LOW] Missing dangerous imports:

pickle, marshal, shelve not explicitly blocked (can execute arbitrary code on deserialization)

Recommendations:



\[CRITICAL] Implement strict URL validation for PlaywrightEnv.goto():

ALLOWED\_DOMAINS = \["example.com", "api.trusted-service.com"]

def validate\_url(url: str) -> bool:

&nbsp;   parsed = urlparse(url)

&nbsp;   return parsed.hostname in ALLOWED\_DOMAINS and parsed.scheme == "https"

\[CRITICAL] Use least-privilege Supabase keys:

Create agent-specific keys with row-level security (RLS)

Restrict to SELECT, INSERT only (no DELETE, UPDATE on critical tables)

\[MEDIUM] Add pickle, marshal, shelve to dangerous imports list in 

validate\_generated\_code

2.3 Data Leakage

Risk Level: MEDIUM



Findings:



redact\_credentials

&nbsp;uses regex for common patterns:

API keys: sk-\[a-zA-Z0-9]{32,}

AWS keys: AKIA\[0-9A-Z]{16}

Tokens: Bearer \[a-zA-Z0-9.\_-]+

AgentAuthRegistry

&nbsp;stores plaintext tokens in memory (self.agent\_tokens: Dict\[str, str])

A2AConnector

&nbsp;enforces HTTPS in production, but A2A\_ALLOW\_HTTP=true env var can bypass this

Vulnerabilities:



\[MEDIUM] Memory Dump Exposure:

If an attacker gains memory access (e.g., via core dump, debugger), all active agent tokens are exposed

\[LOW] Regex Redaction Gaps:

Non-standard credential formats might not be caught (e.g., custom API key formats, JWTs without "Bearer" prefix)

\[LOW] HTTPS Bypass:

A2A\_ALLOW\_HTTP could be misused in staging/CI environments

Recommendations:



\[MEDIUM] Encrypt agent tokens in memory using cryptography.fernet:

from cryptography.fernet import Fernet

self.cipher = Fernet(Fernet.generate\_key())

self.agent\_tokens\[agent\_id] = self.cipher.encrypt(token.encode())

\[LOW] Extend 

redact\_credentials

&nbsp;with LLM-based detection for novel patterns

\[LOW] Remove A2A\_ALLOW\_HTTP override or restrict to localhost only

2.4 Authentication \& Authorization

Risk Level: MEDIUM



Findings:



AgentAuthRegistry

&nbsp;uses HMAC-SHA256 signatures with secrets.token\_urlsafe(32) for tokens

Token expiration: 24 hours

Rate limiting: 10 failed verification attempts → temporary ban

Audit logging: All auth events logged to data/agent\_auth/audit.log

Vulnerabilities:



\[MEDIUM] Master Secret Persistence:

master\_secret is auto-generated on init (secrets.token\_urlsafe(64))

If not persisted, all agents lose authentication on system restart

\[LOW] Token Rotation:

No automatic token rotation (24-hour expiration only)

Recommendations:



\[HIGH] Load master\_secret from secure vault (AWS Secrets Manager, HashiCorp Vault):

self.master\_secret = os.getenv("AGENT\_AUTH\_MASTER\_SECRET")

if not self.master\_secret:

&nbsp;   raise RuntimeError("AGENT\_AUTH\_MASTER\_SECRET not set")

\[MEDIUM] Implement token rotation every 6 hours for high-privilege agents

2.5 Cost Explosion \& Financial Risk

Risk Level: MEDIUM



Findings:



X402Client

&nbsp;implements:

Budget limits: max\_payment\_per\_request, daily\_limit\_usdc

Human-in-the-loop: Payments > $10 require approval

Vendor blocklist: X402\_DENY\_VENDORS env var

GenesisMetaAgent.\_review\_x402\_payment:

Monthly limit: $10,000 (configurable)

Suspicious category detection (e.g., "gambling", "crypto")

AOPValidator

&nbsp;has "Relaxed Mode" if no routing plans in registry

Vulnerabilities:



\[MEDIUM] Environment Variable Dependency:

X402\_DENY\_VENDORS is a comma-separated string → easy to misconfigure

\[MEDIUM] Relaxed Mode Risk:

If 

AOPValidator

&nbsp;registry is empty, validation is skipped → agents can execute unvalidated plans

Recommendations:



\[MEDIUM] Move X402\_DENY\_VENDORS to database with admin UI for management

\[HIGH] Disable "Relaxed Mode" in production:

if not self.registry and os.getenv("ENVIRONMENT") == "production":

&nbsp;   raise RuntimeError("AOPValidator registry is empty in production")

3\. Autonomy Risks

Risk Level: MEDIUM



Findings:



ES Evaluation Sandbox:

Enforces strong isolation (Mock LLM, no network, no DB)

Uses 

MockLLMClient

&nbsp;with deterministic fixtures

Resource limits: 2 CPU, 4GB RAM (via Docker)

Safety check: ES\_EVAL\_MODE="ISOLATED" env var

TrajectoryPool:

Implements 

sanitize\_agent\_name

&nbsp;(path traversal protection)

validate\_storage\_path

&nbsp;ensures writes stay in data/trajectory\_pools/

Credentials redacted via redact\_credentials before storage

DeepEyesV2 (RLRefinement):

Simplified RL implementation (no actual policy network)

Reward function: +1.0 for success, -0.5 for failure

No live policy updates → training is offline only

Vulnerabilities:



\[MEDIUM] ES Sandbox Misconfiguration:

Safety relies entirely on ES\_EVAL\_MODE="ISOLATED" env var

If misconfigured, perturbed models could access production systems

\[LOW] SQLTrajectoryMirror:

Pushes data to Memori (SQL backend) → ensure Memori is secure

\[LOW] DreamGym Integration:

Optional synthetic data generation → could introduce biased/poisoned data if enabled in production

Recommendations:



\[HIGH] Add runtime enforcement for ES Sandbox:

if os.getenv("ES\_EVAL\_MODE") != "ISOLATED":

&nbsp;   raise RuntimeError("ES Sandbox must run in ISOLATED mode")

\# Also: disable network at OS level (Docker --network=none)

\[MEDIUM] Audit Memori access controls (ensure agents can't read other agents' trajectories)

\[LOW] Disable DreamGym in production or add synthetic data validation

4\. Reliability \& Robustness

Risk Level: LOW



Findings:



Circuit Breakers: Implemented in A2AConnector, HTDAGPlanner

Failure threshold: 5 consecutive failures → OPEN state

Recovery timeout: 60 seconds

Retry Logic: error\_handler.py with exponential backoff + jitter

Max retries: 3

Max delay: 60 seconds

Error Recovery Strategies:

Decomposition errors → heuristic fallback

Routing errors → fallback to builder\_agent

LLM errors → use cache or simpler model

Strengths:



Comprehensive error handling with graceful degradation

Circuit breakers prevent cascading failures

Recommendations:



\[LOW] Monitor circuit breaker metrics (OPEN state frequency) to detect systemic issues

5\. Code Quality \& Observability

Risk Level: LOW



Findings:



Observability: OpenTelemetry (OTEL) for distributed tracing

CorrelationContext for end-to-end request tracking

redact\_credentials applied to logs

Metrics: latency, success rates, costs

Error Handling: Structured error classification (ErrorCategory, ErrorSeverity)

Code Quality: Extensive use of dataclasses, type hints, docstrings

Vulnerabilities:



\[LOW] Regex-based Credential Redaction:

Logs rely on regex for redaction → might miss novel patterns

Recommendations:



\[LOW] Add LLM-based log scanning for credential leakage detection

6\. Overall Risk Assessment

Risk Score Calculation

Category	Weight	Score (1-10)	Weighted

Security (Prompt Injection, RCE)	40%	7.5	3.0

Autonomy Risks	25%	6.0	1.5

Financial Risks	20%	6.5	1.3

Reliability	10%	4.0	0.4

Code Quality	5%	3.0	0.15

TOTAL	100%	—	6.35

Overall Risk Score: 6.5/10 (Medium-High)



Risk Interpretation

1-3: Low risk, suitable for production

4-6: Medium risk, requires monitoring and incremental fixes

7-10: High risk, NOT SAFE for unsupervised production operation

Verdict: The system has a solid foundation but contains 2 critical vulnerabilities (SSRF, DB permissions) that must be fixed before unsupervised production deployment.



7\. Prioritized Recommendations

🔴 CRITICAL (Fix Immediately)

\[SSRF] Implement URL whitelist for PlaywrightEnv.goto()



Impact: Prevents access to internal services and cloud metadata

Effort: 2 hours

File: infrastructure/openenv\_wrapper.py

\[DB Security] Use least-privilege Supabase keys



Impact: Prevents database wipeout by compromised agents

Effort: 4 hours (requires key rotation + RLS setup)

File: infrastructure/openenv\_wrapper.py

\[Auth] Load master\_secret from secure vault



Impact: Prevents auth loss on restart

Effort: 2 hours

File: infrastructure/agent\_auth\_registry.py

🟠 HIGH (Fix Within 1 Week)

\[Validation] Disable AOPValidator "Relaxed Mode" in production



Impact: Prevents execution of unvalidated plans

Effort: 1 hour

File: infrastructure/aop\_validator.py

\[Sandbox] Add runtime enforcement for ES\_EVAL\_MODE



Impact: Prevents perturbed models from accessing production

Effort: 2 hours

File: infrastructure/evolution\_strategies/eval\_sandbox.py

\[Safety] Enable WaltzRL blocking mode + deploy Stage 2 checkpoints



Impact: Stronger prompt injection defense

Effort: 4 hours

File: infrastructure/waltzrl\_safety.py

🟡 MEDIUM (Fix Within 1 Month)

\[Prompt Injection] Implement LLM-based guardrail agent



Impact: Catches novel jailbreak attempts

Effort: 8 hours

\[Data Leakage] Encrypt agent tokens in memory



Impact: Protects against memory dump attacks

Effort: 4 hours

\[Config] Move X402\_DENY\_VENDORS to database



Impact: Easier vendor blocklist management

Effort: 6 hours

\[Code Quality] Add pickle, marshal, shelve to dangerous imports



Impact: Prevents deserialization attacks

Effort: 1 hour

🟢 LOW (Nice to Have)

\[Observability] Add LLM-based log scanning for credentials

\[Auth] Implement 6-hour token rotation for high-privilege agents

\[Reliability] Monitor circuit breaker metrics

8\. Conclusion

Genesis Clean Code demonstrates a mature security posture with defense-in-depth, strong isolation mechanisms, and comprehensive error handling. However, 2 critical vulnerabilities (SSRF and database permissions) make it unsafe for fully autonomous production operation until fixed.



Recommended Next Steps:



Fix CRITICAL issues (items 1-3) immediately

Deploy to staging environment with human oversight

Monitor for 2 weeks, then re-audit

Fix HIGH issues before full production deployment

Estimated Time to Production-Ready: 2-3 weeks (assuming dedicated security engineer)



Auditor Notes:



The system shows strong engineering practices (OTEL, circuit breakers, structured errors)

The main risks stem from external tool integration (Playwright, Supabase) and configuration management (env vars)

Recommend quarterly security audits as the system evolves

