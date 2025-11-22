# HopX Setup Guide

This guide explains how to configure HopX for the Genesis autonomous business
platform.  It covers both the **official HopX cloud service** and the
**developer-friendly mock mode** that ships with this repository.

---

## 1. Prerequisites

1. HopX account – <https://github.com/hopx-ai/hopx>
2. API token with the `environments:*` scope
3. Python 3.11+

---

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

Important packages:

| Package     | Purpose                                    |
| ----------- | ------------------------------------------ |
| `hopx-sdk`  | Official HopX API bindings (via GitHub)    |
| `httpx`     | HTTP fallback for environments API         |
| `discord.py`| Downstream Discord notifications           |

---

## 3. Environment Variables

Add the following to `config/production.env` (or your local override):

```env
# HopX Cloud
HOPX_API_BASE_URL=https://api.hopx.ai/v1
HOPX_API_KEY=sk-hopx-xxxxxxxxxxxxxxxx

# Optional: force offline mock mode (local temp directories)
HOPX_USE_FAKE=false

# Discord webhooks for HopX alerts
DISCORD_WEBHOOK_HOPX_ENVIRONMENTS=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_HOPX_ERRORS=https://discord.com/api/webhooks/...
```

> **Tip:** When credentials are omitted or `HOPX_USE_FAKE=true`, the new
> `HopXClient` automatically falls back to mock mode.  This is ideal for unit
> tests and CI pipelines.

---

## 4. Quick Start (Hello World)

```python
import asyncio
from infrastructure.hopx_client import HopXClient

async def main():
    hopx = HopXClient()
    env = await hopx.create_environment("demo_business", template="python_environment")
    hopx.upload_files(env.env_id, {"script.py": "print('Hello HopX!')"})
    result = await hopx.execute_command(env.env_id, "python script.py")
    print(result.stdout)
    await hopx.destroy_environment(env.env_id)

asyncio.run(main())
```

Expected output:

```
Hello HopX!
```

---

## 5. Monitoring & Alerts

The `HopXMonitor` module writes JSONL logs to `logs/hopx_environments`.  It
tracks:

- Active environment count
- Environment lifetime
- Stuck environments (>1 hour)
- API errors

These metrics are surfaced in Discord via the new `GenesisDiscord` helper and
soon in the Genesis dashboard (`/api/hopx/metrics` – coming next sprint).

---

## 6. Integration Checklist

- [x] Install SDK and enable mock mode
- [x] Create HopXClient wrapper
- [x] Implement environment templates (Node.js, Python, Fullstack, Test)
- [x] Wire up HopXMonitor for observability
- [x] Document Discord webhook requirements

Next steps (Week 2+ per the integration plan):

1. Update Builder/QA/Deploy/Research agents to call `HopXClient`
2. Emit Discord notifications for every HopX lifecycle event
3. Add dashboard widgets for environment usage

---

## 7. FAQ

**Q: Does HopX replace local execution entirely?**  
A: Yes in production.  Local execution remains available for development by
setting `HOPX_USE_FAKE=true`.

**Q: How expensive is HopX?**  
A: With millisecond-lived sandboxes the cost is typically <$0.02 per business
build (see the integration plan for the full analysis).

**Q: What happens if the HopX API is down?**  
A: The wrapper automatically falls back to mock mode so builds never block.

---

Need help?  Reach out in `#hopx-environments` on Discord once the channel is
enabled.

