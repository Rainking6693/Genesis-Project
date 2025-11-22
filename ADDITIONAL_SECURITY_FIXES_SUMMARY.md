# Additional Security Fixes - Implementation Summary

**Date:** November 20, 2025  
**Status:** ✅ **CRITICAL & HIGH PRIORITY FIXES IMPLEMENTED**

---

## ✅ Implemented Fixes

### 🔴 Critical Fixes

#### 1. Access Control for MCP ✅

**Implemented:**
- ✅ Per-agent/role tool allowlist (`allowed_tools` parameter)
- ✅ Per-request auth headers validation
- ✅ Separate client instances per user/tenant (removed global singleton)
- ✅ Rate limiting per tool (`_check_rate_limit()`)
- ✅ Configurable timeouts (`MCP_CONNECT_TIMEOUT`, `MCP_CALL_TIMEOUT`)

**Code Changes:**
- `MCPClient.__init__()` now accepts `user_id`, `agent_role`, `allowed_tools`
- `call_tool()` checks `allowed_tools` before execution
- `_check_rate_limit()` enforces per-minute limits
- `asyncio.wait_for()` wraps all tool calls with timeout
- `get_mcp_client()` creates per-user instances (no singleton)

**Environment Variables:**
```bash
MCP_RATE_LIMIT_PER_MINUTE=60  # Default: 60 calls/minute
MCP_CONNECT_TIMEOUT=10.0       # Default: 10 seconds
MCP_CALL_TIMEOUT=30.0          # Default: 30 seconds
```

---

#### 2. Filesystem Safety ✅

**Implemented:**
- ✅ Safe root path validation (`SAFE_CONTEXT_ROOT = data/contexts`)
- ✅ Path normalization (`.resolve()`)
- ✅ Extension allowlist (only `.json` allowed)
- ✅ Blocks absolute writes outside safe root

**Code Changes:**
- `SAFE_CONTEXT_ROOT` constant defined
- `ALLOWED_EXTENSIONS = {'.json'}`
- `Context.__init__()` validates storage path is within safe root
- `Context.save()` validates file extension and path

---

### ⚠️ High Priority Fixes

#### 3. Timeouts & Retries ✅

**Implemented:**
- ✅ `asyncio.wait_for()` wraps MCP calls
- ✅ Configurable retry with exponential backoff + jitter
- ✅ Fail-fast if server not connected (timeout on `discover_servers`)
- ✅ Non-blocking init paths (async with timeout)

**Code Changes:**
- `call_tool()` uses `asyncio.wait_for()` with `_call_timeout`
- `_fetch_with_retry()` adds jitter: `wait_time = base_wait + random.uniform(0, 1)`
- `initialize_mcp_from_env()` has timeout on `discover_servers()`

---

#### 4. Multi-Tenant Isolation ✅

**Implemented:**
- ✅ `user_id` parameter on `Context.__init__()` and `get_or_create_context()`
- ✅ MCP clients namespaced per user (no global singleton)
- ✅ Per-user rate limiting

**Code Changes:**
- `Context.__init__()` accepts `user_id` (warns if missing)
- `ContextManager.get_or_create_context()` accepts `user_id`
- `get_mcp_client()` creates new instance per user (no singleton)
- Rate limits keyed by `user_id:tool_name`

---

#### 5. Content Sanitization ✅

**Implemented:**
- ✅ `sanitize_content()` function strips secrets
- ✅ Content filters for text fields
- ✅ Secret patterns removed from logs

**Code Changes:**
- `sanitize_content()` function added to `type_safe_schemas.py`
- `SECRET_PATTERNS` regex list for common secret formats
- `BusinessGenerationSchema.validate_description()` sanitizes content
- HTML tags stripped

---

#### 6. Input Size Limits ✅

**Implemented:**
- ✅ `MAX_STRING_LENGTH = 10000` (10KB)
- ✅ `MAX_LIST_LENGTH = 100`
- ✅ `MAX_DICT_SIZE = 50`
- ✅ Validation in `BusinessGenerationSchema`

**Code Changes:**
- Constants defined in `type_safe_schemas.py`
- `validate_description()` enforces `MAX_STRING_LENGTH`

---

#### 7. Audit Logging ✅

**Implemented:**
- ✅ Structured audit logs for MCP tool calls
- ✅ Includes: tool_name, user_id, agent_role, success, timestamp

**Code Changes:**
- `call_tool()` logs audit event after successful call
- Structured logging with `extra={}` for parsing

---

## ⏳ Remaining Fixes (Medium Priority)

### 8. Network/Tool Spend Guardrails

**Status:** ⏳ Pending

**Needed:**
- [ ] Integrate with `AP2CircuitBreaker` for budget tracking
- [ ] Add approval hooks before expensive operations
- [ ] Track token/cost per tool call

**Files to Modify:**
- `infrastructure/mcp_client.py` - Add AP2 integration
- `infrastructure/ap2_service.py` - Add tool call tracking

---

### 9. Prompt & Content Sanitization (Complete)

**Status:** ✅ Implemented (basic)

**Remaining:**
- [ ] More comprehensive content filters (email, code, specification)
- [ ] Redact validation errors more thoroughly

---

### 10. Persistence and GC

**Status:** ⏳ Pending

**Needed:**
- [ ] Implement `cleanup_old_contexts()` (currently TODO)
- [ ] Add max contexts per user
- [ ] Persist context metadata to durable storage

**Files to Modify:**
- `infrastructure/context_system.py` - Implement cleanup logic

---

### 11. Testing Gap

**Status:** ⏳ Pending

**Needed:**
- [ ] Unit tests for schema validation failures
- [ ] Unit tests for path traversal prevention
- [ ] Unit tests for MCP allowlist logic
- [ ] Integration tests with mocked MCP server

---

### 12. Operational Visibility

**Status:** ⏳ Pending

**Needed:**
- [ ] Prometheus counters for tool calls, failures, timeouts
- [ ] Structured audit logs (already started)
- [ ] Metrics dashboard

---

## Usage Examples

### Multi-Tenant MCP Client

```python
# Create per-user MCP client
client = get_mcp_client(
    user_id="user-123",
    agent_role="builder",
    allowed_tools=["github_create_repo", "github_create_pr"]
)

# Tool calls are isolated per user
result = await client.call_tool("github_create_repo", {...})
```

### Context with User ID

```python
# Create context with user_id
ctx = BusinessGenerationContext(
    context_id="biz-001",
    user_id="user-123"
)

# Context manager with user_id
manager = get_context_manager()
ctx = await manager.get_or_create_context(
    "biz-001",
    BusinessGenerationContext,
    user_id="user-123"
)
```

### Rate Limiting

```python
# Set rate limit (default: 60 calls/minute)
os.environ['MCP_RATE_LIMIT_PER_MINUTE'] = '30'

# Set timeouts
os.environ['MCP_CONNECT_TIMEOUT'] = '5.0'  # 5 seconds
os.environ['MCP_CALL_TIMEOUT'] = '20.0'    # 20 seconds
```

---

## Breaking Changes

### ⚠️ API Changes

1. **`get_mcp_client()`** - Now requires parameters (no singleton)
   ```python
   # OLD (broken):
   client = get_mcp_client()  # Global singleton
   
   # NEW (required):
   client = get_mcp_client(user_id="user-123", agent_role="builder")
   ```

2. **`Context.__init__()`** - Now accepts `user_id` (optional but recommended)
   ```python
   # OLD:
   ctx = BusinessGenerationContext(context_id="biz-001")
   
   # NEW (recommended):
   ctx = BusinessGenerationContext(context_id="biz-001", user_id="user-123")
   ```

3. **`initialize_mcp_from_env()`** - Now accepts user parameters
   ```python
   # OLD:
   client = await initialize_mcp_from_env()
   
   # NEW (recommended):
   client = await initialize_mcp_from_env(
       user_id="user-123",
       agent_role="builder"
   )
   ```

---

## Migration Guide

### Step 1: Update MCP Client Usage

**Find all `get_mcp_client()` calls:**
```bash
grep -r "get_mcp_client()" infrastructure/ agents/
```

**Update to include user_id:**
```python
# Before
client = get_mcp_client()

# After
client = get_mcp_client(
    user_id=context.get("user_id") or "default",
    agent_role=agent.__class__.__name__
)
```

### Step 2: Update Context Creation

**Find all `Context` instantiations:**
```bash
grep -r "BusinessGenerationContext\|StripeBillingContext" infrastructure/ agents/
```

**Add user_id parameter:**
```python
# Before
ctx = BusinessGenerationContext(context_id="biz-001")

# After
ctx = BusinessGenerationContext(
    context_id="biz-001",
    user_id=user_id  # Get from request/context
)
```

### Step 3: Set Environment Variables

```bash
# Add to .env
MCP_RATE_LIMIT_PER_MINUTE=60
MCP_CONNECT_TIMEOUT=10.0
MCP_CALL_TIMEOUT=30.0
```

---

## Testing Checklist

- [ ] Test rate limiting (spam tool calls, should hit limit)
- [ ] Test timeout (slow MCP server, should timeout)
- [ ] Test path traversal (try `../../etc/passwd`, should fail)
- [ ] Test file extension validation (try `.exe`, should fail)
- [ ] Test multi-tenant isolation (two users, separate rate limits)
- [ ] Test content sanitization (secrets in description, should be redacted)
- [ ] Test input size limits (10KB+ description, should fail)

---

## Summary

**✅ Implemented:**
- 2 Critical fixes (Access Control, Filesystem Safety)
- 5 High priority fixes (Timeouts, Multi-tenant, Content Sanitization, Input Limits, Audit Logging)

**⏳ Remaining:**
- 4 Medium priority fixes (Spend Guardrails, Enhanced Sanitization, Persistence GC, Testing, Visibility)

**Status:** ✅ **READY FOR TESTING** - Critical and high-priority fixes complete.

