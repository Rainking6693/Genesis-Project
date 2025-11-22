# MCP Server Deployment Guide

## Do You Actually Need an MCP Server?

**Short answer:** **MCP is optional** - Genesis works fine without it. MCP just adds extra tools.

**When you need it:**
- You want to use MCP tools (GitHub, Slack, databases, etc.)
- You want to avoid writing custom adapters

**When you don't need it:**
- You're fine with existing Genesis integrations
- You don't need the extra MCP tools
- You can skip MCP entirely

---

## If You Want MCP: Where to Deploy

### Option 1: Google Cloud Run (Recommended - Same as Genesis)

**Why:** You're already using Cloud Run for Genesis, so deploy MCP there too.

**Steps:**

1. **Create MCP Server Project:**
   ```bash
   # Create new directory
   mkdir genesis-mcp-server
   cd genesis-mcp-server
   
   # Initialize Node.js project (MCP servers are typically Node.js)
   npm init -y
   npm install @modelcontextprotocol/server-github
   ```

2. **Create MCP Server (`server.js`):**
   ```javascript
   const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
   const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
   
   const server = new Server({
     name: 'genesis-mcp-server',
     version: '1.0.0',
   }, {
     capabilities: {
       tools: {},
     },
   });
   
   // Add your tools here
   server.setRequestHandler('tools/list', async () => ({
     tools: [
       {
         name: 'github_create_repo',
         description: 'Create a GitHub repository',
         inputSchema: {
           type: 'object',
           properties: {
             name: { type: 'string' },
             description: { type: 'string' },
           },
         },
       },
     ],
   }));
   
   // Start server
   const transport = new StdioServerTransport();
   await server.connect(transport);
   ```

3. **Deploy to Cloud Run:**
   ```bash
   # Create Dockerfile
   cat > Dockerfile << EOF
   FROM node:18-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   CMD ["node", "server.js"]
   EOF
   
   # Deploy
   gcloud run deploy genesis-mcp-server \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000
   ```

4. **Get Your MCP Server URL:**
   ```bash
   gcloud run services describe genesis-mcp-server \
     --region us-central1 \
     --format "value(status.url)"
   # Returns: https://genesis-mcp-server-xxxxx.run.app
   ```

5. **Update Genesis Configuration:**
   ```python
   # In infrastructure/mcp_client.py
   ALLOWED_MCP_DOMAINS = [
       'genesis-mcp-server-xxxxx.run.app',  # Your Cloud Run URL
   ]
   ```

6. **Set Environment Variables:**
   ```bash
   # In Genesis .env
   MCP_SERVERS=https://genesis-mcp-server-xxxxx.run.app
   MCP_API_KEY=your-generated-key
   ENABLE_MCP=true
   ```

---

### Option 2: Railway (If You Prefer Railway)

**Steps:**

1. **Create MCP Server Project** (same as above)

2. **Deploy to Railway:**
   ```bash
   railway init
   railway up
   ```

3. **Get URL:** Railway provides URL like `genesis-mcp-server.railway.app`

4. **Update ALLOWED_MCP_DOMAINS:**
   ```python
   ALLOWED_MCP_DOMAINS = [
       'genesis-mcp-server.railway.app',
   ]
   ```

---

### Option 3: Render.com

**Steps:**

1. **Create MCP Server Project** (same as above)

2. **Deploy to Render:**
   - Create new Web Service
   - Connect GitHub repo
   - Deploy

3. **Get URL:** `genesis-mcp-server.onrender.com`

4. **Update ALLOWED_MCP_DOMAINS:**
   ```python
   ALLOWED_MCP_DOMAINS = [
       'genesis-mcp-server.onrender.com',
   ]
   ```

---

## Answer: Do You Need ALLOWED_MCP_DOMAINS?

### ✅ YES - If Not Using Localhost

**If you deploy MCP server to cloud:**
- ✅ **You MUST add the domain to `ALLOWED_MCP_DOMAINS`**
- ✅ This is a security feature (SSRF protection)
- ✅ Only domains in the list are allowed

**Example:**
```python
# infrastructure/mcp_client.py
ALLOWED_MCP_DOMAINS = [
    'genesis-mcp-server-xxxxx.run.app',  # Your Cloud Run MCP server
    'mcp-api.example.com',                # Another MCP server
]
```

### ❌ NO - If Using Localhost Only

**If you only use `localhost` for development:**
- ❌ You don't need to add it (already allowed via `ALLOW_LOCALHOST`)
- ⚠️ But set `MCP_ALLOW_LOCALHOST=false` in production

---

## Quick Setup Without MCP Server

**If you don't want to set up an MCP server right now:**

1. **Disable MCP:**
   ```bash
   # In .env
   ENABLE_MCP=false
   # Or just don't set MCP_SERVERS
   ```

2. **Genesis will work fine** - MCP is optional

3. **You can add MCP later** when you need it

---

## Recommended Setup (Cloud Run)

### Step 1: Deploy MCP Server to Cloud Run

```bash
# 1. Create MCP server project
mkdir genesis-mcp-server && cd genesis-mcp-server
npm init -y
npm install @modelcontextprotocol/server-github

# 2. Create server.js (see example above)

# 3. Deploy to Cloud Run
gcloud run deploy genesis-mcp-server \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000

# 4. Get URL
MCP_URL=$(gcloud run services describe genesis-mcp-server \
  --region us-central1 \
  --format "value(status.url)")
echo "MCP Server URL: $MCP_URL"
```

### Step 2: Update Genesis Configuration

```python
# infrastructure/mcp_client.py (around line 50)
ALLOWED_MCP_DOMAINS = [
    'genesis-mcp-server-xxxxx.run.app',  # Replace with your actual URL
]
```

### Step 3: Configure Genesis

```bash
# In Genesis .env
MCP_SERVERS=https://genesis-mcp-server-xxxxx.run.app
MCP_API_KEY=$(openssl rand -hex 32)  # Generate key
ENABLE_MCP=true
```

### Step 4: Configure MCP Server to Validate Key

```javascript
// In your MCP server (server.js)
const API_KEY = process.env.MCP_API_KEY;

// Add middleware to validate
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

---

## Summary

**Do you need ALLOWED_MCP_DOMAINS?**
- ✅ **YES** - If deploying MCP server to cloud (not localhost)
- ❌ **NO** - If only using localhost (but disable in production)

**Where to deploy MCP server?**
- ✅ **Cloud Run** (recommended - same platform as Genesis)
- ✅ **Railway** (if you prefer Railway)
- ✅ **Render.com** (alternative)
- ❌ **Not locally** (you said you don't want local)

**Do you actually need MCP?**
- ❌ **NO** - MCP is optional, Genesis works without it
- ✅ **YES** - Only if you want MCP tools (GitHub, Slack, etc.)

---

## Next Steps

1. **Decide:** Do you want MCP? (It's optional)
2. **If yes:** Deploy MCP server to Cloud Run
3. **Add domain** to `ALLOWED_MCP_DOMAINS` in `mcp_client.py`
4. **Set environment variables** in Genesis
5. **Test connection**

**If you don't want MCP right now:**
- Just set `ENABLE_MCP=false` or don't set `MCP_SERVERS`
- Genesis will work perfectly fine without it
- You can add MCP later when needed

