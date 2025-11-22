# Additional Security Fixes - Second Audit Findings

**Date:** November 20, 2025  
**Source:** Additional AI security audit  
**Status:** 🔴 **CRITICAL & HIGH PRIORITY FIXES IN PROGRESS**

---

## Findings Summary

Additional security audit identified **10 categories** of issues beyond initial P0/P1 fixes:

| Priority | Category | Status |
|----------|----------|--------|
| 🔴 **Critical** | Access control for MCP | ⏳ In Progress |
| 🔴 **Critical** | Filesystem safety | ⏳ In Progress |
| ⚠️ **High** | Network/tool spend guardrails | ⏳ In Progress |
| ⚠️ **High** | Prompt & content sanitization | ⏳ In Progress |
| ⚠️ **High** | Timeouts & retries | ⏳ In Progress |
| ⚠️ **High** | Multi-tenant isolation | ⏳ In Progress |
| ℹ️ **Medium** | Input size limits | ⏳ Pending |
| ℹ️ **Medium** | Persistence and GC | ⏳ Pending |
| ℹ️ **Medium** | Testing gap | ⏳ Pending |
| ℹ️ **Medium** | Operational visibility | ⏳ Pending |

---

## 🔴 Critical Fixes

### 1. Access Control for MCP

**Issues:**
- No per-agent/role allowlist
- No per-request auth headers/tokens
- Global singleton client (no per-user/tenant isolation)
- No rate limits on `call_tool`
- No configurable timeouts on `_connect_server` and `call_tool`

**Fixes Needed:**
- [ ] Add per-agent tool allowlist
- [ ] Enforce per-request auth headers
- [ ] Separate client instances per user/tenant
- [ ] Add rate limits to `call_tool`
- [ ] Add configurable timeouts

### 2. Filesystem Safety

**Issues:**
- No blocking of absolute writes outside safe root
- No path normalization
- No extensions allowlist
- No read-only mode option
- Default registration of filesystem/server in prod

**Fixes Needed:**
- [ ] Block absolute writes outside `data/contexts/`
- [ ] Add path normalization
- [ ] Add file extension allowlist (`.json` only)
- [ ] Add optional read-only mode
- [ ] Remove default filesystem tool registration in production

---

## ⚠️ High Priority Fixes

### 3. Network/Tool Spend Guardrails

**Issues:**
- No budget tokens around `call_tool`
- No approval hooks
- Not integrated with existing circuit breaker
- No audit log events for external calls

**Fixes Needed:**
- [ ] Add budget tracking per tool call
- [ ] Add approval hooks before expensive operations
- [ ] Integrate with `AP2CircuitBreaker`
- [ ] Emit audit log events for all external calls

### 4. Prompt & Content Sanitization

**Issues:**
- No content filters for text fields in schemas
- No stripping of secrets before logging
- Validation errors may leak sensitive data

**Fixes Needed:**
- [ ] Add content filters (HTML/email/code/specification)
- [ ] Strip secrets from context metadata
- [ ] Redact validation errors

### 5. Timeouts & Retries

**Issues:**
- No asyncio timeouts on MCP calls
- No configurable retry with jitter
- No fail-fast if server not connected
- Blocking init paths

**Fixes Needed:**
- [ ] Wrap MCP calls in `asyncio.wait_for()`
- [ ] Add configurable retry with exponential backoff + jitter
- [ ] Fail fast if server not connected
- [ ] Make init paths non-blocking

### 6. Multi-Tenant Isolation

**Issues:**
- No `user_id` required on `create_context`
- No namespace for MCP clients per user
- Global singleton pattern (shared state)

**Fixes Needed:**
- [ ] Require `user_id` parameter on `create_context`
- [ ] Namespace MCP clients per user
- [ ] Avoid global singletons (or scope per tenant)

---

## Implementation Plan

### Phase 1: Critical Fixes (Immediate)

1. **Access Control for MCP**
   - Add per-agent tool allowlist
   - Add rate limiting
   - Add configurable timeouts
   - Add per-request auth validation

2. **Filesystem Safety**
   - Add safe root path validation
   - Add path normalization
   - Add extension allowlist
   - Block absolute writes outside safe root

### Phase 2: High Priority Fixes (24h)

3. **Spend Guardrails**
   - Integrate with AP2 circuit breaker
   - Add budget tracking
   - Add approval hooks

4. **Content Sanitization**
   - Add content filters
   - Strip secrets from logs
   - Redact validation errors

5. **Timeouts & Retries**
   - Add asyncio timeouts
   - Add retry with jitter
   - Fail-fast on connection errors

6. **Multi-Tenant Isolation**
   - Add user_id requirement
   - Namespace clients per user
   - Remove global singleton

### Phase 3: Medium Priority (Next Sprint)

7. **Input Size Limits**
8. **Persistence and GC**
9. **Testing Gap**
10. **Operational Visibility**

---

## Files to Modify

- `infrastructure/mcp_client.py` - Access control, timeouts, rate limits, multi-tenant
- `infrastructure/context_system.py` - Filesystem safety, user_id, multi-tenant
- `infrastructure/type_safe_schemas.py` - Content sanitization, input size limits
- `infrastructure/ap2_service.py` - Spend guardrails integration

---

**Status:** Starting implementation of critical and high-priority fixes.

