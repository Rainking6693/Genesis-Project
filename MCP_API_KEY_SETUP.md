# MCP API Key Setup Guide

## What is the MCP API Key?

The MCP API key is an authentication token used to authenticate requests to your MCP (Model Context Protocol) servers. It's similar to API keys for other services like OpenAI or Anthropic.

---

## Where to Get the MCP API Key

### Option 1: Your Own MCP Server

If you're running your own MCP server, you need to:

1. **Generate an API key** in your MCP server configuration
2. **Store it securely** (environment variable, secret manager)
3. **Configure your MCP server** to validate the Bearer token

**Example MCP Server Setup:**
```bash
# Generate a secure API key
export MCP_SERVER_API_KEY=$(openssl rand -hex 32)

# Your MCP server should validate:
# Authorization: Bearer <MCP_SERVER_API_KEY>
```

### Option 2: Third-Party MCP Servers

If you're using a third-party MCP server (e.g., hosted MCP service):

1. **Sign up** for the MCP service
2. **Go to API Keys** section in dashboard
3. **Generate a new API key**
4. **Copy the key** (you won't see it again!)

**Common MCP Server Providers:**
- Custom self-hosted servers
- Managed MCP services (if available)
- Local development servers (may not require auth)

### Option 3: Local Development (No Key Required)

For **local development** with MCP servers running on `localhost`:

- **You can skip authentication** (set empty key)
- Only works for `localhost` and `127.0.0.1`
- **NOT recommended for production**

---

## How to Set the MCP API Key

### Method 1: Environment Variable (Recommended)

**Windows PowerShell:**
```powershell
$env:MCP_API_KEY = "your-api-key-here"
```

**Windows CMD:**
```cmd
set MCP_API_KEY=your-api-key-here
```

**Linux/macOS:**
```bash
export MCP_API_KEY="your-api-key-here"
```

**Permanent (Add to `.env` file):**
```env
# .env
MCP_API_KEY=your-api-key-here
MCP_SERVERS=http://localhost:3000,http://localhost:3001
ENABLE_MCP=true
```

### Method 2: Cloud Run Secrets (Production)

If deploying to Google Cloud Run:

```powershell
# Create secret
gcloud secrets create mcp-api-key --data-file=- <<< "your-api-key-here"

# Mount in Cloud Run deployment
# Add to deploy_cloudrun.ps1:
--set-secrets MCP_API_KEY=mcp-api-key:latest
```

### Method 3: Secret Manager (Other Platforms)

**Railway:**
- Add `MCP_API_KEY` in Railway dashboard → Variables

**Render:**
- Add `MCP_API_KEY` in Render dashboard → Environment

**Fly.io:**
```bash
fly secrets set MCP_API_KEY="your-api-key-here"
```

---

## MCP Server Configuration

### If You're Running Your Own MCP Server

Your MCP server needs to validate the Bearer token. Example (Node.js):

```javascript
// MCP server middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization' });
  }
  
  const token = authHeader.substring(7);
  const validKey = process.env.MCP_SERVER_API_KEY;
  
  if (token !== validKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
});
```

### If Using Standard MCP Servers

Most standard MCP servers (like `@modelcontextprotocol/server-github`) may not require authentication for local use. Check the server's documentation.

---

## Testing Your API Key

### Test Authentication

```python
# test_mcp_auth.py
import os
import asyncio
from infrastructure.mcp_client import get_mcp_client, initialize_mcp_from_env

async def test():
    # Set API key
    os.environ['MCP_API_KEY'] = 'test-key'
    os.environ['MCP_SERVERS'] = 'http://localhost:3000'
    
    client = await initialize_mcp_from_env()
    
    # Check if client has API key
    if client._api_key:
        print(f"✅ API key configured: {client._api_key[:10]}...")
    else:
        print("⚠️  No API key configured")
    
    # Try to call a tool
    try:
        result = await client.call_tool('test_tool', {})
        print("✅ Authentication successful")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")

asyncio.run(test())
```

---

## Security Best Practices

### ✅ DO:

1. **Store in environment variables** (never commit to git)
2. **Use different keys** for dev/staging/production
3. **Rotate keys regularly** (every 90 days)
4. **Use secret managers** in production (AWS Secrets Manager, Google Secret Manager, etc.)
5. **Restrict key permissions** (read-only if possible)

### ❌ DON'T:

1. **Commit keys to git** (use `.env` and add to `.gitignore`)
2. **Share keys** in chat/email
3. **Use same key** for all environments
4. **Log keys** in error messages (already fixed in our code)
5. **Hardcode keys** in source code

---

## Troubleshooting

### "No API key configured" Warning

**Issue:** MCP client works but no authentication headers sent

**Fix:**
```bash
export MCP_API_KEY="your-key-here"
```

### "Invalid API key" Error

**Issue:** MCP server rejects requests

**Possible Causes:**
1. Wrong API key
2. Key not set in MCP server
3. Key expired/revoked

**Fix:**
- Verify key matches server configuration
- Check MCP server logs
- Regenerate key if needed

### "MCP server not in allow-list"

**Issue:** URL validation fails

**Fix:**
- Add server domain to `ALLOWED_MCP_DOMAINS` in `mcp_client.py`
- Or set `MCP_ALLOW_LOCALHOST=true` for localhost

---

## Quick Start Checklist

- [ ] Decide: Own server or third-party?
- [ ] Generate/obtain API key
- [ ] Set `MCP_API_KEY` environment variable
- [ ] Configure MCP server to validate Bearer token (if own server)
- [ ] Test authentication
- [ ] Add to production secrets manager
- [ ] Document key location for team

---

## Example: Complete Setup

```bash
# 1. Generate API key (for your own server)
export MCP_SERVER_API_KEY=$(openssl rand -hex 32)
echo "MCP_SERVER_API_KEY=$MCP_SERVER_API_KEY" >> .env.server

# 2. Set client API key
export MCP_API_KEY=$MCP_SERVER_API_KEY
echo "MCP_API_KEY=$MCP_API_KEY" >> .env

# 3. Configure MCP servers
export MCP_SERVERS="http://localhost:3000"
echo "MCP_SERVERS=$MCP_SERVERS" >> .env

# 4. Enable MCP
export ENABLE_MCP=true
echo "ENABLE_MCP=true" >> .env

# 5. Test
python -c "from infrastructure.mcp_client import get_mcp_client; print('✅ MCP configured')"
```

---

## Summary

**Where to get it:**
- **Your own server:** Generate it yourself
- **Third-party service:** Get from their dashboard
- **Local dev:** Optional (can skip)

**How to set it:**
- Environment variable: `MCP_API_KEY=your-key`
- Or add to `.env` file
- Or use secret manager in production

**Next steps:**
1. Get/generate your API key
2. Set it as environment variable
3. Configure your MCP server to validate it
4. Test the connection

---

**Need help?** Check your MCP server's documentation for authentication setup.

