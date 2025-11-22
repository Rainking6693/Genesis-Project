# X402 Integration Checklist

**Purpose:** enable every Genesis agent to pay for external resources autonomously using the x402 HTTP payment protocol (stablecoin payments via HTTP 402 challenges). Use AP2 for large, user-visible purchases; use x402 for sub-$10 agent-to-agent spend.

## Quick Facts
- x402 is HTTP-native: server replies with `402 Payment Required`, agent resubmits with `X-PAYMENT`.
- Tokens: USDC (Base/Ethereum/Solana) + ETH/other stablecoins as vendors permit.
- Wallet: each agent signs EIP-712 payloads using the shared x402 hot wallet (`X402_WALLET_KEY`, `X402_WALLET_ADDRESS`).
- Ledger: all payments logged to `data/x402/transactions.jsonl` for reconciliation.
- Scope: Research, Builder, QA, Deploy, SEO, Content, Marketing, Commerce, Finance, Pricing, Support, Email, Analyst, plus Genesis Meta Agent budgeting hooks.

## Global Setup
- [x] Install `x402-python` SDK + add to `requirements*.txt`.
- [ ] Create secure hot wallet (Base network) and fund with 500 USDC buffer.
- [ ] Store wallet key in `config/production.env` (`X402_WALLET_KEY`, `X402_WALLET_ADDRESS`, `X402_RPC_URL`).
- [x] Implement `infrastructure/x402_client.py`:
  - [x] Methods: `parse_402_response`, `sign_payment`, `retry_with_payment`.
  - [x] Handle multiple accepted tokens/chain fallbacks.
  - [x] Persist every transaction to ledger + emit metrics.
- [x] Add `X402_USE_FAKE=true` bypass for local testing.
- [ ] Update Secrets Manager pipelines to inject wallet env vars.

## Core Platform Tasks
- [x] Add `X402PaymentError` and recovery strategies (downgrade to AP2 or free tier).
- [x] Extend `AP2BudgetService` with `x402_autopay_budget` caps per agent.
- [x] Introduce spend guardrails (`max_payment_per_request`, `daily_limit_usdc`).
- [x] Create shared retry helper: exponential backoff on RPC errors, fallback chain if vendor supports multiple.
- [x] Update observability:
  - [x] `metrics/x402_payments_total` (labels: agent, vendor, chain, status).
  - [x] `metrics/x402_spend_usdc` and alert at $100/day.
- [x] Dashboard card showing last 20 transactions + remaining wallet balance.

## Agent Workstreams
### Research Agent
- [x] Route paid data APIs through `x402_client`.
- [x] Cache vendor capabilities (price per call, accepted chains).
- [ ] Add heuristics to decide when to pay vs use cached data.

### Builder Agent
- [x] Wrap premium LLM calls with `with_x402_payment`.
- [ ] Store cost metadata on each code artifact.
- [ ] Abort build if spend exceeds per-business limit.

### QA Agent
- [x] Guard GPU/cloud test invocations with x402.
- [x] Annotate test reports with transaction hashes.
- [ ] Reuse environment artifacts when possible to avoid duplicate charges.

### Deploy Agent
- [x] Pay-per-deploy endpoints (Vercel/Railway dry runs) via x402.
- [x] Rollback path if payment succeeds but deployment fails (request vendor refund).

### SEO + Content + Marketing Agents
- [x] Implement shared helper for pay-per-call marketing/SEO/media APIs.
- [ ] Track creative assets to avoid repurchasing identical stock media.

### Commerce Agent
- [x] Domain registration + gateway setup flows call x402.
- [ ] Support staged payments (authorization + capture) when vendors require confirmation.

### Finance Agent
- [x] Payroll, invoice factoring, reporting APIs integrate with x402.
- [x] Sync ledger entries into Finance Agent’s books nightly.

### Pricing Agent
- [x] Paid competitive analysis + price experiments go through x402.
- [ ] Maintain experiment cost vs uplift summary.

### Support, Email, Analyst Agents
- [x] Paywall-covered APIs (helpdesk escalations, bulk email validation, analytics exports) routed through x402.
- [x] Add “payment context” to every task DAG node for auditing.

### Genesis Meta Agent
- [x] Approve/deny agent payment intents based on strategy + budget.
- [x] Surface spend summaries in Discord (`#genesis-dashboard`) after each business build.

## Testing & Verification
- [x] Unit tests for `x402_client` (parse 402, sign payload, retry).
- [ ] Integration tests using vendor stubs returning 402 → 200 sequence.
- [ ] Smoke tests per agent: simulate paid call with `X402_USE_FAKE=true`.
- [ ] Chaos tests: deliberately fail payment, ensure agent falls back gracefully.
- [ ] Ledger reconciliation script compares on-chain transfers vs local log.

## Monitoring & Incident Response
- [x] Alert if wallet balance < 50 USDC.
- [x] Alert on 5 consecutive payment failures for same vendor.
- [x] Run hourly job to detect stale in-flight payments (402 loop without success).
- [x] Weekly report: spend per agent, top vendors, errors (pipe to Discord metrics channel).

## Success Metrics
- [ ] 100% of sub-$10 external purchases executed through x402.
- [ ] <3 seconds median payment completion (402 → 200).
- [ ] 0 double-charged or orphaned payments per week.
- [ ] Budget adherence: no agent exceeds its daily limit.
- [x] Documentation up to date (`docs/x402_playbook.md`) and onboarding checklist completed.

