# Chrome DevTools MCP Server Setup Guide

## Overview

The Chrome DevTools MCP (Model Context Protocol) server allows Genesis agents to interact with Chrome browser for web automation, testing, and scraping tasks. This integration is used by the `infrastructure/mcp_chrome_devtools_client.py` module.

## Prerequisites

1. **Google Chrome** or **Chromium** browser installed
2. **Node.js** (version 16 or higher) installed
3. **Chrome DevTools Protocol** enabled

## Installation Steps

### Step 1: Install Chrome DevTools MCP Server

```bash
# Install globally via npm
npm install -g @modelcontextprotocol/server-chrome-devtools

# Or install locally in the project
npm install @modelcontextprotocol/server-chrome-devtools
```

### Step 2: Start Chrome with Remote Debugging

```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

### Step 3: Start the MCP Server

```bash
# Start the Chrome DevTools MCP server
npx @modelcontextprotocol/server-chrome-devtools --port 3001

# Or with custom configuration
npx @modelcontextprotocol/server-chrome-devtools \
  --port 3001 \
  --chrome-port 9222 \
  --timeout 30000
```

## Environment Variables

Add these to your `.env` file:

```env
# Chrome DevTools MCP Configuration
MCP_CHROME_ENABLED=true
MCP_CHROME_SERVER_URL=http://localhost:3001
MCP_CHROME_DEBUG_PORT=9222
MCP_CHROME_TIMEOUT=30000

# Optional: Chrome executable path (if not in PATH)
CHROME_EXECUTABLE=C:\Program Files\Google\Chrome\Application\chrome.exe

# MCP Servers list (include Chrome DevTools)
MCP_SERVERS=http://localhost:3000,http://localhost:3001
```

## Testing the Connection

### 1. Verify Chrome is Running with Debugging

```bash
# Check if Chrome DevTools is accessible
curl http://localhost:9222/json/version
```

Expected response:
```json
{
  "Browser": "Chrome/120.0.0.0",
  "Protocol-Version": "1.3",
  "User-Agent": "...",
  "WebKit-Version": "..."
}
```

### 2. Test MCP Server

```python
# Test script: test_chrome_mcp.py
import asyncio
from infrastructure.mcp_chrome_devtools_client import ChromeDevToolsMCPClient

async def test():
    client = ChromeDevToolsMCPClient()

    # Navigate to a page
    result = await client.navigate("https://example.com")
    print(f"Navigation result: {result}")

    # Take a screenshot
    screenshot = await client.screenshot()
    print(f"Screenshot saved: {len(screenshot)} bytes")

    # Execute JavaScript
    title = await client.evaluate("document.title")
    print(f"Page title: {title}")

if __name__ == "__main__":
    asyncio.run(test())
```

## Available MCP Tools

When the Chrome DevTools MCP server is running, these tools become available:

### Navigation Tools
- `chrome_navigate` - Navigate to URL
- `chrome_reload` - Reload current page
- `chrome_back` - Go back in history
- `chrome_forward` - Go forward in history

### Page Interaction
- `chrome_click` - Click an element (by selector)
- `chrome_type` - Type text into an element
- `chrome_select` - Select dropdown option
- `chrome_scroll` - Scroll the page

### Content Extraction
- `chrome_get_text` - Get text content
- `chrome_get_html` - Get HTML content
- `chrome_get_attribute` - Get element attribute
- `chrome_screenshot` - Take screenshot

### JavaScript Execution
- `chrome_evaluate` - Execute JavaScript code
- `chrome_wait_for` - Wait for element/condition

### Network Monitoring
- `chrome_intercept` - Intercept network requests
- `chrome_get_cookies` - Get browser cookies
- `chrome_set_cookie` - Set browser cookie

## Usage in Genesis Agents

Agents can use Chrome DevTools via the StandardIntegrationMixin:

```python
from infrastructure.standard_integration_mixin import StandardIntegrationMixin

class MyAgent(StandardIntegrationMixin):
    async def scrape_website(self, url: str):
        # Chrome DevTools client is available via mixin
        chrome = self.chrome_devtools_client

        # Navigate and extract content
        await chrome.navigate(url)
        await chrome.wait_for("body")
        content = await chrome.get_text("body")

        return content
```

## Docker Setup (Optional)

For containerized deployments:

```dockerfile
# Dockerfile
FROM node:18-slim

# Install Chrome
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver

# Install MCP server
RUN npm install -g @modelcontextprotocol/server-chrome-devtools

# Start script
CMD ["sh", "-c", "chromium --headless --remote-debugging-port=9222 & npx @modelcontextprotocol/server-chrome-devtools --port 3001"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  chrome-mcp:
    build: .
    ports:
      - "9222:9222"  # Chrome DevTools
      - "3001:3001"  # MCP Server
    environment:
      - CHROME_ARGS=--no-sandbox --disable-dev-shm-usage
```

## Troubleshooting

### Issue: Chrome DevTools not accessible

**Solution:**
1. Ensure Chrome is running with `--remote-debugging-port=9222`
2. Check firewall isn't blocking port 9222
3. Try `127.0.0.1` instead of `localhost`

### Issue: MCP server connection refused

**Solution:**
1. Verify MCP server is running: `ps aux | grep chrome-devtools`
2. Check logs: `npx @modelcontextprotocol/server-chrome-devtools --verbose`
3. Ensure ports aren't already in use: `netstat -an | findstr 3001`

### Issue: Timeout errors

**Solution:**
1. Increase timeout in environment: `MCP_CHROME_TIMEOUT=60000`
2. Check Chrome isn't frozen or crashed
3. Restart both Chrome and MCP server

### Issue: Permission denied errors

**Solution (Windows):**
```bash
# Run as Administrator
runas /user:Administrator "cmd /c start chrome.exe --remote-debugging-port=9222"
```

**Solution (Linux/Mac):**
```bash
# Add user to chrome group
sudo usermod -a -G chrome $USER
```

## Security Considerations

1. **Never expose ports publicly** - Use localhost only
2. **Use authentication** in production:
   ```env
   MCP_CHROME_AUTH_TOKEN=your-secure-token
   ```
3. **Run in sandboxed environment** for untrusted sites
4. **Limit JavaScript execution** to trusted code only
5. **Clear cookies/cache** between sessions for privacy

## Performance Tips

1. **Reuse browser instance** instead of launching new ones
2. **Use headless mode** for better performance:
   ```bash
   chrome --headless --remote-debugging-port=9222
   ```
3. **Enable caching** for repeated requests
4. **Limit concurrent tabs** to prevent memory issues
5. **Set reasonable timeouts** to avoid hanging

## Integration with VOIX

Chrome DevTools MCP can work alongside VOIX for enhanced automation:

```python
# Use VOIX when available, fallback to Chrome DevTools
from infrastructure.browser_automation.hybrid_automation import get_hybrid_automation

automation = get_hybrid_automation()
result = await automation.execute_task(
    url="https://example.com",
    task="Extract data",
    mode=AutomationMode.AUTO  # VOIX -> Chrome DevTools -> Skyvern
)
```

## Monitoring and Logging

Enable detailed logging:

```env
# In .env file
MCP_CHROME_LOG_LEVEL=debug
MCP_CHROME_LOG_FILE=logs/chrome_mcp.log
```

Monitor performance:

```python
# Monitor Chrome DevTools MCP performance
from infrastructure.mcp_chrome_devtools_client import ChromeDevToolsMCPClient

client = ChromeDevToolsMCPClient()
metrics = client.get_metrics()
print(f"Requests: {metrics['total_requests']}")
print(f"Avg latency: {metrics['avg_latency_ms']}ms")
print(f"Errors: {metrics['error_count']}")
```

## Additional Resources

- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [MCP Specification](https://github.com/modelcontextprotocol/spec)
- [Puppeteer Documentation](https://pptr.dev/) (underlying library)
- [Chrome Headless Documentation](https://developers.google.com/web/updates/2017/04/headless-chrome)

## Support

For issues specific to Genesis integration:
1. Check `logs/chrome_mcp.log` for errors
2. Run diagnostic: `python scripts/diagnose_chrome_mcp.py`
3. Review this guide's troubleshooting section

For MCP server issues:
1. Check [MCP GitHub Issues](https://github.com/modelcontextprotocol/servers)
2. Review server logs with `--verbose` flag
3. Update to latest version: `npm update -g @modelcontextprotocol/server-chrome-devtools`