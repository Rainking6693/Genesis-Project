# Security & Reliability Audit: Integrations #76-79

**Date:** November 20, 2025  
**Auditor:** Senior DevOps + Security Engineer  
**Scope:** Post-integration security audit of 4 new systems  
**Status:** 🔴 **CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED**

---

## Executive Summary

**Overall Risk Level:** 🔴 **HIGH**

Found **3 P0 (ship-stopping)**, **4 P1 (24h fix)**, and **2 P2 (next sprint)** issues across the 4 new integrations. The most critical vulnerability is **Integration #76 (MCP Client)** which allows **arbitrary SSRF attacks** via unvalidated URLs from environment variables.

**Key Findings:**
- ❌ **P0:** MCP Client accepts arbitrary URLs without allow-listing (SSRF risk)
- ❌ **P0:** MCP Client has no authentication/authorization for tool calls
- ❌ **P0:** Context System file paths vulnerable to directory traversal
- ⚠️ **P1:** MCP Client error messages leak internal URLs
- ⚠️ **P1:** Type-Safe Schemas validate paths but don't check permissions
- ⚠️ **P1:** Context System JSON deserialization without size limits
- ⚠️ **P1:** M-GRPO Trainer file I/O without proper error handling
- ℹ️ **P2:** Missing rate limits on MCP tool calls
- ℹ️ **P2:** No circuit breaker timeout configuration

---

## 1. Integration Inventory

### Integration #76: MCP Client
- **File:** `infrastructure/mcp_client.py` (384 lines)
- **Dependencies:**
  - `aiohttp==3.13.2` (from `requirements_production.txt`)
  - `python-dotenv==1.2.1` (env loading)
- **Credentials Storage:**
  - **Location:** Environment variable `MCP_SERVERS`
  - **Format:** Comma-separated URLs: `http://localhost:3000,http://localhost:3001`
  - **Loading:** `os.getenv('MCP_SERVERS', '').split(',')` (lines 169, 374)
  - **Risk:** ⚠️ **No validation, no allow-listing, stored in plaintext env**

### Integration #77: Type-Safe Schemas
- **File:** `infrastructure/type_safe_schemas.py` (506 lines)
- **Dependencies:**
  - `pydantic==2.12.3` (validation)
- **Credentials Storage:** None (validation-only module)
- **Risk:** ✅ **Low - no external calls**

### Integration #78: Context System
- **File:** `infrastructure/context_system.py` (575 lines)
- **Dependencies:**
  - Standard library only (`json`, `pathlib`, `asyncio`)
- **Credentials Storage:** None
- **Storage Path:** `data/contexts/{context_id}/memory.json` (line 131)
- **Risk:** ⚠️ **File I/O with user-controlled paths**

### Integration #79: M-GRPO Trainer
- **File:** `infrastructure/evolution_strategies/mgrpo_trainer.py` (634 lines)
- **Dependencies:**
  - `numpy==2.3.4` (calculations)
- **Credentials Storage:** None
- **Storage Path:** `metrics/mgrpo_episodes.json` (line 622)
- **Risk:** ⚠️ **File I/O, no size limits**

---

## 2. Network & Egress Security

### 🔴 P0: MCP Client SSRF Vulnerability

**Location:** `infrastructure/mcp_client.py:98-150` (discover_servers), `152-226` (call_tool)

**Issue:**
```python
# Line 169, 374: No validation of URLs
server_urls = os.getenv('MCP_SERVERS', '').split(',')
server_urls = [url.strip() for url in server_urls if url.strip()]

# Line 110, 197: Direct HTTP calls to unvalidated URLs
response = await self._fetch_with_retry(f"{url}/mcp/list", method="GET")
response = await self._fetch_with_retry(f"{tool.server_url}/mcp/call", method="POST", json_data={...})
```

**Attack Vector:**
1. Attacker sets `MCP_SERVERS=http://169.254.169.254/latest/meta-data/` (AWS metadata)
2. Attacker sets `MCP_SERVERS=http://localhost:22` (internal SSH)
3. Attacker sets `MCP_SERVERS=file:///etc/passwd` (file protocol)
4. Attacker sets `MCP_SERVERS=http://internal-api.company.com/admin` (internal API)

**Impact:**
- **SSRF:** Access to internal services (metadata, databases, admin panels)
- **Information Disclosure:** Internal network topology
- **Privilege Escalation:** Access to cloud metadata endpoints

**Fix:**
```python
# Add to mcp_client.py
ALLOWED_MCP_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'mcp.example.com',  # Your trusted MCP servers
]

def validate_mcp_url(url: str) -> bool:
    """Validate MCP server URL against allow-list"""
    from urllib.parse import urlparse
    parsed = urlparse(url.strip())
    
    # Only allow http/https
    if parsed.scheme not in ('http', 'https'):
        raise ValueError(f"Invalid scheme: {parsed.scheme}")
    
    # Block private IP ranges
    host = parsed.hostname
    if host in ('localhost', '127.0.0.1'):
        return True  # Allow localhost
    
    # Check allow-list
    if host not in ALLOWED_MCP_DOMAINS:
        raise ValueError(f"MCP server not in allow-list: {host}")
    
    # Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
    # ... (add IP validation)
    
    return True
```

**Priority:** 🔴 **P0 - Fix immediately before production**

---

### 🔴 P0: No Authentication/Authorization for MCP Tool Calls

**Location:** `infrastructure/mcp_client.py:269-307` (_fetch_with_retry)

**Issue:**
```python
# Line 291-295: No authentication headers
async with self._session.request(
    method,
    url,
    json=json_data,
    timeout=aiohttp.ClientTimeout(total=30)
) as response:
```

**Attack Vector:**
- If MCP server is compromised or malicious, it can execute arbitrary tools
- No API key validation
- No request signing

**Fix:**
```python
# Add authentication
headers = {}
if os.getenv('MCP_API_KEY'):
    headers['Authorization'] = f"Bearer {os.getenv('MCP_API_KEY')}"

async with self._session.request(
    method,
    url,
    json=json_data,
    headers=headers,  # Add auth headers
    timeout=aiohttp.ClientTimeout(total=30)
) as response:
```

**Priority:** 🔴 **P0 - Add authentication before production**

---

### ⚠️ P1: Error Messages Leak Internal URLs

**Location:** `infrastructure/mcp_client.py:225, 307`

**Issue:**
```python
# Line 225: Error message includes tool name (may leak internal structure)
logger.error(f"MCP tool '{tool_name}' failed: {e}")

# Line 307: Error includes full URL
raise last_error or RuntimeError(f"Failed to fetch {url} after {self._max_retries} attempts")
```

**Impact:** Information disclosure about internal tool names and server URLs

**Fix:**
```python
# Sanitize error messages
def sanitize_error_message(error: Exception, tool_name: str) -> str:
    """Remove sensitive info from error messages"""
    msg = str(error)
    # Remove URLs
    import re
    msg = re.sub(r'https?://[^\s]+', '[REDACTED_URL]', msg)
    return f"MCP tool '{tool_name}' failed: {msg}"

logger.error(sanitize_error_message(e, tool_name))
```

**Priority:** ⚠️ **P1 - Fix within 24h**

---

## 3. Input Validation & Injection Risks

### ✅ Integration #77: Type-Safe Schemas - GOOD

**Location:** `infrastructure/type_safe_schemas.py`

**Validation:**
- ✅ Pydantic validation with field validators (lines 97-115, 145-154)
- ✅ Path validation checks existence (line 101: `os.path.isdir(v)`)
- ✅ Enum validation for platforms (line 38-44)
- ✅ Length limits on strings (line 139: `min_length=3, max_length=100`)

**Issues Found:**
- ⚠️ **P1:** Path validation doesn't check permissions (line 101)
  - **Fix:** Add `os.access(v, os.R_OK)` check

**Priority:** ⚠️ **P1 - Add permission checks**

---

### 🔴 P0: Context System Directory Traversal

**Location:** `infrastructure/context_system.py:102-131`

**Issue:**
```python
# Line 131: User-controlled context_id used in path
self.storage_path = Path("data/contexts") / context_id

# Line 266: No validation before mkdir
self.storage_path.mkdir(parents=True, exist_ok=True)
```

**Attack Vector:**
```python
# Attacker creates context with path traversal
ctx = BusinessGenerationContext(context_id="../../etc/passwd")
await ctx.save()  # Writes to /etc/passwd (if running as root)
```

**Impact:**
- **Path Traversal:** Write to arbitrary files
- **Information Disclosure:** Read arbitrary files via `load()`
- **Privilege Escalation:** Overwrite system files

**Fix:**
```python
def validate_context_id(context_id: str) -> str:
    """Validate context_id to prevent path traversal"""
    # Block path traversal
    if '..' in context_id or '/' in context_id or '\\' in context_id:
        raise ValueError(f"Invalid context_id: {context_id}")
    
    # Block special characters
    if not re.match(r'^[a-zA-Z0-9_-]+$', context_id):
        raise ValueError(f"Invalid context_id format: {context_id}")
    
    # Limit length
    if len(context_id) > 100:
        raise ValueError(f"context_id too long: {len(context_id)}")
    
    return context_id

# In __init__:
self.context_id = validate_context_id(context_id)
```

**Priority:** 🔴 **P0 - Fix immediately**

---

### ⚠️ P1: Context System JSON Deserialization Without Size Limits

**Location:** `infrastructure/context_system.py:304-317` (load method)

**Issue:**
```python
# Line 304-305: No size limit on JSON file
with open(memory_file, 'r') as f:
    saved_data = json.load(f)  # Can load arbitrarily large files
```

**Attack Vector:**
- Attacker creates 10GB JSON file
- `json.load()` loads entire file into memory → DoS

**Fix:**
```python
# Add size limit
MAX_CONTEXT_FILE_SIZE = 10 * 1024 * 1024  # 10MB

memory_file = self.storage_path / "memory.json"
if memory_file.exists():
    file_size = memory_file.stat().st_size
    if file_size > MAX_CONTEXT_FILE_SIZE:
        raise ValueError(f"Context file too large: {file_size} bytes")
    
    with open(memory_file, 'r') as f:
        saved_data = json.load(f)
```

**Priority:** ⚠️ **P1 - Add size limits**

---

### ✅ Integration #79: M-GRPO Trainer - No Injection Risks

**Location:** `infrastructure/evolution_strategies/mgrpo_trainer.py`

**Validation:**
- ✅ No user input directly flows into SQL/commands
- ✅ File I/O uses fixed paths (line 622: `metrics/mgrpo_episodes.json`)
- ✅ JSON serialization with `json.dump()` (safe)

**Issues Found:**
- ⚠️ **P1:** No error handling for file I/O (line 558-563)
  - **Fix:** Add try/except with proper error messages

**Priority:** ⚠️ **P1 - Add error handling**

---

## 4. Rate Limit & Cost Protection

### ⚠️ P2: No Rate Limits on MCP Tool Calls

**Location:** `infrastructure/mcp_client.py:152-226` (call_tool)

**Issue:**
- No rate limiting per tool
- No rate limiting per server
- No global rate limiting

**Impact:**
- **Cost Explosion:** Malicious agent could spam expensive tools (e.g., LLM calls)
- **DoS:** Overwhelm MCP servers with requests

**Fix:**
```python
from collections import defaultdict
from datetime import datetime, timedelta

class MCPClient:
    def __init__(self):
        # ... existing code ...
        self._rate_limits: Dict[str, List[datetime]] = defaultdict(list)
        self._max_calls_per_minute = 60
    
    async def call_tool(self, tool_name: str, params: Dict[str, Any]) -> Any:
        # Check rate limit
        now = datetime.utcnow()
        recent_calls = [
            ts for ts in self._rate_limits[tool_name]
            if now - ts < timedelta(minutes=1)
        ]
        
        if len(recent_calls) >= self._max_calls_per_minute:
            raise RuntimeError(f"Rate limit exceeded for tool '{tool_name}'")
        
        self._rate_limits[tool_name].append(now)
        
        # ... rest of call_tool ...
```

**Priority:** ℹ️ **P2 - Add in next sprint**

---

### ✅ Circuit Breaker Exists

**Location:** `infrastructure/mcp_client.py:181-189`

**Status:** ✅ Circuit breaker implemented (5 failures threshold, 5min timeout)

**No issues found.**

---

## 5. Error Handling & Leakage

### ⚠️ P1: MCP Client Error Messages Leak URLs

**Already covered in Section 2.**

---

### ⚠️ P1: Context System Error Messages May Leak Paths

**Location:** `infrastructure/context_system.py:288, 316`

**Issue:**
```python
# Line 288: Error includes full file path
logger.error(f"Failed to save context '{self.context_id}': {e}")

# Line 316: Error includes full file path
logger.error(f"Failed to load context '{self.context_id}': {e}")
```

**Fix:**
```python
# Sanitize paths in error messages
def sanitize_path_in_error(path: Path) -> str:
    """Remove sensitive path info from errors"""
    return str(path).replace(str(Path.home()), '[HOME]')

logger.error(f"Failed to save context '{self.context_id}': {sanitize_path_in_error(memory_file)}")
```

**Priority:** ⚠️ **P1 - Sanitize error messages**

---

## 6. Dependency & Supply-Chain Risks

### ✅ Dependencies Check

**Checked against requirements files:**

| Package | Version | Last Updated | Risk |
|---------|---------|--------------|------|
| `aiohttp` | 3.13.2 | Recent | ✅ Low |
| `pydantic` | 2.12.3 | Recent | ✅ Low |
| `numpy` | 2.3.4 | Recent | ✅ Low |

**No known CVEs found in current versions.**

**Recommendation:**
- ✅ All dependencies are actively maintained
- ✅ Versions are recent (2024-2025)
- ⚠️ **Action:** Run `pip-audit` or `safety check` regularly

---

## 7. Monitoring & Observability Gaps

### ⚠️ P2: Missing Observability

**Issues:**
1. **MCP Client:** No metrics for tool call success/failure rates
2. **Context System:** No metrics for context creation/load/save operations
3. **M-GRPO Trainer:** No metrics for training episode success rates

**Fix:**
```python
# Add Prometheus metrics
from prometheus_client import Counter, Histogram

mcp_tool_calls = Counter('mcp_tool_calls_total', 'Total MCP tool calls', ['tool_name', 'status'])
mcp_tool_duration = Histogram('mcp_tool_duration_seconds', 'MCP tool call duration', ['tool_name'])

# In call_tool:
with mcp_tool_duration.labels(tool_name=tool_name).time():
    try:
        result = await self._fetch_with_retry(...)
        mcp_tool_calls.labels(tool_name=tool_name, status='success').inc()
    except Exception as e:
        mcp_tool_calls.labels(tool_name=tool_name, status='error').inc()
        raise
```

**Priority:** ℹ️ **P2 - Add in next sprint**

---

## 8. Critical Findings & Immediate Actions

### 🔴 P0 Issues (Ship-Stopping - Fix Before Production)

1. **MCP Client SSRF Vulnerability**
   - **File:** `infrastructure/mcp_client.py:98-150, 152-226`
   - **Fix:** Add URL allow-listing and validation (see Section 2)
   - **Timeline:** **IMMEDIATE**

2. **MCP Client No Authentication**
   - **File:** `infrastructure/mcp_client.py:269-307`
   - **Fix:** Add API key authentication headers
   - **Timeline:** **IMMEDIATE**

3. **Context System Directory Traversal**
   - **File:** `infrastructure/context_system.py:102-131`
   - **Fix:** Validate `context_id` to prevent `../` patterns
   - **Timeline:** **IMMEDIATE**

---

### ⚠️ P1 Issues (Fix Within 24h)

4. **MCP Client Error Message Leakage**
   - **File:** `infrastructure/mcp_client.py:225, 307`
   - **Fix:** Sanitize URLs from error messages
   - **Timeline:** **24 hours**

5. **Type-Safe Schemas Missing Permission Checks**
   - **File:** `infrastructure/type_safe_schemas.py:101`
   - **Fix:** Add `os.access()` check for path permissions
   - **Timeline:** **24 hours**

6. **Context System JSON Size Limits**
   - **File:** `infrastructure/context_system.py:304-317`
   - **Fix:** Add 10MB file size limit
   - **Timeline:** **24 hours**

7. **Context System Error Message Leakage**
   - **File:** `infrastructure/context_system.py:288, 316`
   - **Fix:** Sanitize paths in error messages
   - **Timeline:** **24 hours**

8. **M-GRPO Trainer Missing Error Handling**
   - **File:** `infrastructure/evolution_strategies/mgrpo_trainer.py:558-563`
   - **Fix:** Add try/except for file I/O
   - **Timeline:** **24 hours**

---

### ℹ️ P2 Issues (Next Sprint)

9. **MCP Client Rate Limiting**
   - **File:** `infrastructure/mcp_client.py:152-226`
   - **Fix:** Add per-tool and per-server rate limits
   - **Timeline:** **Next sprint**

10. **Missing Observability**
    - **Files:** All integration files
    - **Fix:** Add Prometheus metrics for all operations
    - **Timeline:** **Next sprint**

---

## 9. Security Testing Recommendations

### Immediate Tests to Run

1. **SSRF Test:**
   ```bash
   # Set malicious MCP_SERVERS
   export MCP_SERVERS="http://169.254.169.254/latest/meta-data/"
   python -c "from infrastructure.mcp_client import get_mcp_client; import asyncio; asyncio.run(get_mcp_client().discover_servers(['http://169.254.169.254/latest/meta-data/']))"
   # Should fail with validation error
   ```

2. **Path Traversal Test:**
   ```python
   # Should raise ValueError
   ctx = BusinessGenerationContext(context_id="../../etc/passwd")
   ```

3. **Rate Limit Test:**
   ```python
   # Spam tool calls - should hit rate limit
   for i in range(100):
       await mcp_client.call_tool('test_tool', {})
   ```

---

## 10. Summary & Recommendations

### Overall Assessment

**Risk Level:** 🔴 **HIGH**

The integrations introduce **3 critical vulnerabilities** that must be fixed before production:
1. SSRF via unvalidated MCP server URLs
2. No authentication for MCP tool calls
3. Directory traversal in context system

### Immediate Actions

1. ✅ **Block production deployment** until P0 issues are fixed
2. ✅ **Implement URL allow-listing** for MCP servers
3. ✅ **Add authentication** to MCP client
4. ✅ **Validate context_id** to prevent path traversal
5. ✅ **Fix P1 issues** within 24 hours
6. ✅ **Add security tests** for all vulnerabilities

### Long-Term Recommendations

1. **Security Review Process:** Add mandatory security review for all new integrations
2. **Automated Scanning:** Run `pip-audit` and `bandit` in CI/CD
3. **Penetration Testing:** Schedule quarterly pen tests
4. **Security Training:** Train team on SSRF, path traversal, injection attacks

---

**Audit Complete**  
**Next Review:** After P0 fixes are implemented

