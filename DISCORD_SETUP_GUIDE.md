# Discord Integration Setup

This guide describes how to configure the new Discord observability layer for
Genesis.  Follow the steps below to provision channels, create webhooks, and
validate notifications.

---

## 1. Create Discord Server

1. Create a new server named **Genesis Control Center**
2. Add the following text channels:
   - `#genesis-dashboard`
   - `#commands`
   - `#alerts`
   - `#deployments`
   - `#metrics`
   - `#revenue`
   - `#errors`
   - `#hopx-environments`
   - `#hopx-errors`

> Dynamic per-business channels will be handled in a later milestone once the
> Discord bot is introduced.

---

## 2. Generate Webhooks

For each channel open *Integrations → Webhooks* and create a webhook called
`GenesisBot`.  Copy the URLs into `config/production.env` using the template:

```env
DISCORD_WEBHOOK_DASHBOARD=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_COMMANDS=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_ALERTS=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_DEPLOYMENTS=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_METRICS=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_REVENUE=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_ERRORS=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_HOPX_ENVIRONMENTS=https://discord.com/api/webhooks/xxx/yyy
DISCORD_WEBHOOK_HOPX_ERRORS=https://discord.com/api/webhooks/xxx/yyy
```

The new `GenesisDiscord` helper automatically loads these environment
variables.

---

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

Key packages:

| Package      | Purpose                       |
| ------------ | ----------------------------- |
| `discord.py` | Rich embeds + future bot APIs |
| `aiohttp`    | Async HTTP client             |

---

## 4. Smoke Test

Run the included test script to post sample notifications to every channel:

```bash
python tests/test_discord_integration.py
```

You should see:

- Startup/shutdown in `#genesis-dashboard`
- Build lifecycle embeds
- HopX lifecycle embeds
- Deployment + error notifications

---

## 5. Daily Analytics

The new `scripts/daily_discord_report.py` job produces KPI summaries:

```bash
python scripts/daily_discord_report.py --dry-run   # preview stdout
python scripts/daily_discord_report.py             # send to Discord
```

Schedule via Windows Task Scheduler or cron to run at 09:00 daily.

---

## 6. Future Enhancements

- Discord bot for two-way commands (`!build`, `!status`, etc.)
- Business-specific channels with auto-archive
- Notification filters per user (reduce noise)

Until then, the webhook-based approach provides complete visibility with zero
operational overhead.

