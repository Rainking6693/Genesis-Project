# x402 Playbook

This playbook documents the governance flow for all HTTP-402 (x402) payments in
Genesis.

## 1. Approval Workflow

1. Every agent calls the shared `X402Client`.
2. Payments above `$10` trigger the Genesis Meta Agent approval hook.
3. The hook verifies:
   - Vendor allow/deny lists (`X402_DENY_VENDORS`)
   - Per-payment auto limit (`X402_AUTO_APPROVE_LIMIT`)
   - Monthly orchestrator budget (`X402_META_MONTHLY_LIMIT`)
   - Suspicious categories (unknown purpose or missing business ID)
4. Decisions are logged to `data/x402/approval_log.jsonl`.
5. Denials raise `X402PaymentError` and surface in the business monitor.

## 2. Vendor Capability Cache

The cache lives in `infrastructure/x402_vendor_cache.py` and persists to
`data/x402/vendor_capabilities.json`.

Agents query the cache before charging via the helper `_prepare_x402_metadata`,
ensuring every payment records:

- `business_id`
- Accepted tokens/chains
- Purpose/category

New observations (tokens, chains, price) are recorded automatically after each
successful payment or HTTP 402 challenge.

## 3. Staged Payments

`X402Client` exposes three new calls:

- `authorize_payment(...)`
- `capture_payment(authorization_id, ...)`
- `cancel_authorization(authorization_id, ...)`

Deploy Agent now authorizes spend before `vercel` deployments and captures or
cancels after success/failure respectively. Authorizations are tracked inside
`BusinessMonitor.pending_authorizations`.

## 4. Ledger Operations

- All transactions stream to `data/x402/transactions.jsonl`.
- `scripts/x402_daily_ledger_sync.py` imports daily entries into the Finance
  Agent ledger, posts optional weekly Discord reports, and flags stale
  authorizations (`--check-stale`).
- Wallet balance warnings trigger when the remaining simulated balance falls
  below `$50`.

## 5. Monitoring & Alerts

- Prometheus counters: `genesis_x402_payments_total{vendor,status}`
- Prometheus gauge: `genesis_x402_spend_usdc`
- Alerts logged when:
  - Wallet < `$50`
  - Five consecutive failures for the same vendor
  - Authorizations exceed one hour (reported via `--check-stale`)
- Weekly spend summary posts to the `#genesis-dashboard` and `#metrics`
  Discord channels via `GenesisDiscord.x402_spend_summary`.

## 6. Testing

- `tests/test_x402_approvals.py`: approval decisions + logging
- `tests/test_x402_staged_payments.py`: authorize/capture/cancel flows
- `tests/test_x402_summary.py`: Discord summary smoke test (fake webhook)

Set `X402_USE_FAKE=true` during tests/smoke scripts to avoid hitting live
webhooks or wallets.

