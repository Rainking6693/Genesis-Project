# Genesis Pipeline Complete Specification

## Executive Summary

Genesis is a **fully autonomous business operating system** that generates, builds, deploys, markets, and manages businesses end-to-end with **NO HUMAN INTERACTION** except for bills >$100.

**Primary LLM**: Claude (Opus 4.5)
**Lead Developer**: Codex (via Roundtable MCP)
**Lead QA**: Gemini (via Roundtable MCP)
**Evolution**: SE-Darwin + Trajectory Pool
**Frontend Deployment**: Piku (self-hosted, git push deploy)
**Backend Deployment**: Conduit Platform (self-hosted BaaS)
**Marketing**: Free Marketing Agent (Reddit, LinkedIn, TikTok, YouTube)

---

## Core Principle: OPEN SOURCE FIRST

**Always use free, open-source, self-hosted solutions before paid services.**

| Need | Open Source Solution | Paid Alternative (avoid) |
|------|---------------------|--------------------------|
| Frontend Deploy | [Piku](https://github.com/piku/piku) | Vercel, Netlify |
| Backend/BaaS | [Conduit Platform](https://github.com/ConduitPlatform/Conduit) | Firebase, Supabase Cloud |
| PaaS (full) | [Coolify](https://coolify.io/) | Heroku, Railway |
| Database | PostgreSQL, SQLite | PlanetScale, Neon |
| Auth | Conduit Auth module | Auth0, Clerk |
| Payments | Stripe (API only) | - |
| Email | [Postal](https://github.com/postalserver/postal) | SendGrid, Mailgun |
| Monitoring | [Uptime Kuma](https://github.com/louislam/uptime-kuma) | Datadog, PagerDuty |
| Analytics | [Plausible](https://github.com/plausible/analytics) | Google Analytics |
| Search | [Meilisearch](https://github.com/meilisearch/meilisearch) | Algolia |
| File Storage | MinIO, local disk | S3, Cloudflare R2 |
| CI/CD | GitHub Actions (free tier) | CircleCI paid |
| Workflow | [n8n](https://github.com/n8n-io/n8n) | Zapier |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GENESIS AUTONOMOUS PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────────────────────────────────────────────┐ │
│  │   AG-UI     │◄───│              REAL-TIME VISUALIZATION                │ │
│  │  Dashboard  │    │  (Events: RUN_STARTED, TOOL_CALL, STATE_SNAPSHOT)   │ │
│  └─────────────┘    └─────────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    CLAUDE (OPUS 4.5) - PRIMARY ORCHESTRATOR             ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                   ORCHESTRATOR AGENT (Emily)                     │   ││
│  │  │            - Reviews EVERY task before proceeding               │   ││
│  │  │            - Gate control: PASS/FAIL/REVISE                     │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐         ┌─────────────────┐         ┌─────────────┐        │
│  │ 16 SUPER-   │         │    ROUNDTABLE   │         │   GENESIS   │        │
│  │ CLAUDE      │         │     MCP         │         │   CORE      │        │
│  │ AGENTS      │         │ ┌─────────────┐ │         │ ┌─────────┐ │        │
│  │             │         │ │ CODEX       │ │         │ │ Meta    │ │        │
│  │ - Morgan    │         │ │ (Dev Lead)  │ │         │ │ Agent   │ │        │
│  │ - Casey     │         │ ├─────────────┤ │         │ ├─────────┤ │        │
│  │ - Riley     │         │ │ GEMINI      │ │         │ │SE-Darwin│ │        │
│  │ - Shane     │         │ │ (QA Lead)   │ │         │ │(Evolution)│        │
│  │ - Taylor    │         │ ├─────────────┤ │         │ └─────────┘ │        │
│  │ - etc...    │         │ │ CURSOR      │ │         └─────────────┘        │
│  └─────────────┘         │ │ (Codebase)  │ │                                │
│                          │ └─────────────┘ │                                │
│                          └─────────────────┘                                │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         n8n + FREE MARKETING                             ││
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐           ││
│  │   │   SEO    │  │ Marketing│  │ Billing  │  │ Maintenance  │           ││
│  │   │ Workflow │  │  Agent   │  │ Workflow │  │   Workflow   │           ││
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────────┘           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Stages (8 Gates)

### Stage 1: RESEARCH (Gate 1)

**Purpose**: Generate and validate business idea
**Minimum Score**: **85/100** (only best-of-the-best ideas proceed)

| Role | Agent | Responsibility |
|------|-------|----------------|
| **Primary** | Genesis Meta Agent | Generate business specification |
| **Market Research** | Bennett | Competitor analysis, market size |
| **Deep Research** | Atlas | Trend analysis, technical feasibility |
| **Product Manager** | Morgan | Scope, prioritize, requirements |

**Process Flow**:
```
1. Bennett: Market research, competitor analysis
2. Atlas: Deep web research, trend analysis
3. Morgan: Scope and prioritize findings
4. Genesis Meta Agent: Generate business specification
```

**Output**: `BusinessSpec` with market validation

**QC Criteria**:
- Market size >$1B or niche <100 competitors
- Clear differentiation from top 5 competitors
- Technical feasibility score >80%
- Target market clearly defined

**Failure Remediation**:
1. Re-run market research with broader scope
2. Pivot to adjacent market if oversaturated
3. Simplify MVP scope to reduce risk
4. Reject idea if score <85 (FAIL threshold)

---

### Stage 2: DESIGN (Gate 2)

**Purpose**: Design UI/UX and architecture
**Minimum Score**: **85/100**

| Role | Agent | Responsibility |
|------|-------|----------------|
| **UX Research** | Casey | User research, wireframes, journey maps |
| **UI Design** | Jules | Visual design, component specs, design system |
| **Backend Architecture** | Shane | API design, database schema |

**Process Flow**:
```
1. Casey: User research, journey maps, wireframes
2. Jules: Visual design, design system, component specs
3. Shane: API design, database schema, architecture
```

**Output**: `DesignSpec` with component breakdown

**QC Criteria**:
- WCAG 2.1 AA accessibility compliance
- Mobile-first responsive design
- <3 second load time target
- Clear CTA hierarchy

**Failure Remediation**:
1. Run accessibility audit and fix violations
2. Simplify design if complexity score too high
3. Add loading states and skeleton screens
4. Revise IA if user flow unclear

---

### Stage 3: BUILD (Gate 3)

**Purpose**: Generate complete website code
**Minimum Score**: **85/100**

| Role | Agent | Responsibility |
|------|-------|----------------|
| **Lead Developer** | **Codex** (via Roundtable) | Full codebase generation |
| **Frontend** | Riley | React/Next.js implementation |
| **Backend** | Shane | API, database, business logic |
| **Full-Stack** | Alex | End-to-end features |
| **Code Review** | Hudson | PR reviews, quality gates |

**Process Flow**:
```
1. CODEX generates full codebase (via roundtable MCP)
2. Riley: Review frontend components
3. Shane: Review backend/API code
4. Hudson: Code review and quality check
```

**Output**: Complete codebase ready for deployment

**QC Criteria**:
- Zero linting errors
- All TypeScript types defined
- No hardcoded secrets
- Build completes successfully

**Failure Remediation**:
1. Fix linting errors automatically
2. Add missing type definitions
3. Extract secrets to environment variables
4. Debug build errors with stack trace analysis

---

### Stage 4: TEST (Gate 4)

**Purpose**: E2E testing and quality assurance
**Minimum Score**: **100% pass rate** (0 critical bugs)

| Role | Agent | Responsibility |
|------|-------|----------------|
| **Lead QA** | **Gemini** (via Roundtable) | Comprehensive E2E tests |
| **Test Strategy** | Taylor | Test planning, coverage analysis |
| **Test Automation** | Nathan | Automated test creation |

**Process Flow**:
```
1. GEMINI: Run comprehensive E2E tests
2. Taylor: Test strategy and coverage analysis
3. Nathan: Automated test creation
4. Accessibility testing (WCAG compliance)
```

**Output**: Test report with pass/fail status

**QC Criteria**:
- 100% critical path coverage
- 0 critical/high severity bugs
- <5% flaky test rate
- Accessibility audit passes

**Failure Remediation**:
1. Fix failing tests immediately
2. Add retry logic for flaky tests
3. Quarantine unstable tests
4. Create bug tickets for non-critical issues

---

### Stage 5: DEPLOY (Gate 5)

**Purpose**: Deploy to production
**Minimum Score**: **100%** (site must be live)

| Role | Agent | Responsibility |
|------|-------|----------------|
| **DevOps** | Quinn | Deployment pipeline configuration |
| **Infrastructure** | Jackson | Server/container setup |

**Deployment Stack (Open Source First)**:

| Type | Primary | Fallback | Website |
|------|---------|----------|---------|
| Frontend | **Piku** | Coolify | https://github.com/piku/piku |
| Backend/API | **Conduit** | Coolify | https://getconduit.dev/ |
| Full-Stack | **Coolify** | - | https://coolify.io/ |

**Why Piku?**
- Tiniest PaaS - runs on Raspberry Pi
- Heroku-style `git push` deployments
- Supports Python, Node, Go, Java, Ruby
- No Docker required (lightweight)
- Free, open source, self-hosted

**Why Conduit?**
- Self-hosted Firebase alternative
- Built-in: Auth, Database, Chat, Storage
- Auto-generated REST/GraphQL APIs
- Free, open source
- Default admin: admin/admin

**Process Flow**:
```
1. Quinn: Configure Piku remote (git remote add piku piku@server:appname)
2. Jackson: Set up Conduit backend services
3. Deploy frontend via: git push piku master
4. Deploy backend via: Conduit admin panel or CLI
5. Verify with health checks
```

**Output**: Live URL

**QC Criteria**:
- Site responding HTTP 200
- SSL certificate valid (Let's Encrypt)
- Health check endpoint passing
- DNS propagated

**Failure Remediation**:
1. Check Piku server SSH connectivity
2. Verify Conduit services are running
3. Review deployment logs (`piku logs appname`)
4. Restart services if needed
5. Fall back to Coolify if Piku/Conduit unavailable

---

### Stage 6: VERIFY (Gate 6)

**Purpose**: Post-deployment verification
**Minimum Score**: **95%**

| Role | Agent | Responsibility |
|------|-------|----------------|
| **Lead QA** | **Gemini** (via Roundtable) | Production E2E tests |
| **Security** | Cora | OWASP security audit |
| **Build Verification** | Blake | Build/production parity check |

**Process Flow**:
```
1. GEMINI: Production E2E tests
2. Cora: Security audit (OWASP top 10)
3. Blake: Build/production parity check
4. SEO baseline check
```

**Output**: Production verification report

**QC Criteria**:
- All production smoke tests pass
- No XSS/SQL injection vulnerabilities
- Lighthouse performance >80
- SEO meta tags present

**Failure Remediation**:
1. Rollback to previous deployment
2. Hot-fix security vulnerabilities
3. Optimize critical rendering path
4. Add missing meta tags

---

### Stage 7: AUTOMATE (Gate 7)

**Purpose**: Set up ongoing automation
**Minimum Score**: **100%** (all workflows active)

**Systems**:
- n8n workflow engine
- Free Marketing Agent

**Workflows Created**:
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| SEO | Daily 6am | Sitemap submission, meta optimization |
| Marketing | On deploy | Social media calendar, content generation |
| Billing | On deploy | Stripe products, invoices |
| Maintenance | Every 5min | Uptime monitoring, alerts |

**Free Marketing Agent**:
| Tactic | Platform | Content Type |
|--------|----------|--------------|
| Short-Form Video | TikTok, Instagram, YouTube | 15-60s videos |
| Community Posts | Reddit | Hero posts, helpful comments |
| Story Posts | LinkedIn | 300-400 word case studies |
| Answer SEO | Multi-platform | Search-optimized answers |

**Output**: ~29 content pieces per campaign

**QC Criteria**:
- All n8n workflows active
- Marketing campaign generated
- At least 20 content pieces created
- No API credential errors

**Failure Remediation**:
1. Check n8n server connectivity
2. Verify API credentials for each platform
3. Run workflows in dry-run mode first
4. Manually activate failed workflows

---

### Stage 8: EVOLVE (Continuous)

**Purpose**: Continuous improvement via SE-Darwin
**System**: Genesis Meta Agent + SE-Darwin

**Process Flow**:
```
1. Collect trajectory data from all stages
2. SE-Darwin evolves strategies based on fitness
3. A/B test improvements on new businesses
4. Archive successful mutations
```

**SE-Darwin Configuration**:
- Population size: 8
- Elite size: 2
- Mutation rate: 0.3
- Crossover rate: 0.5
- Max generations: 10

**Output**: Improved business generation fitness over time

**QC Criteria**:
- Trajectory stored successfully
- No regression vs baseline
- Fitness score improving over generations
- Memory bank updated

**Failure Remediation**:
1. Revert to previous generation
2. Reduce mutation rate
3. Increase elite preservation
4. Manual review of failed mutations

---

## SuperClaude Agent Registry

| Role | Agent | Primary Stage | Backup Stage |
|------|-------|---------------|--------------|
| **Orchestrator** | Emily | All stages | - |
| **Product Manager** | Morgan | RESEARCH | DESIGN |
| **UX Research** | Casey | DESIGN | RESEARCH |
| **UI Design** | Jules | DESIGN | BUILD |
| **Frontend** | Riley | BUILD | TEST |
| **Backend** | Shane | BUILD, DESIGN | - |
| **Full-Stack** | Alex | BUILD | - |
| **DevOps** | Quinn | DEPLOY | AUTOMATE |
| **Infrastructure** | Jackson | DEPLOY | VERIFY |
| **QA Strategy** | Taylor | TEST | VERIFY |
| **QA Automation** | Nathan | TEST | - |
| **Code Review** | Hudson | BUILD | - |
| **Security** | Cora | VERIFY | - |
| **Build Issues** | Blake | VERIFY | DEPLOY |
| **Market Research** | Bennett | RESEARCH | - |
| **Deep Research** | Atlas | RESEARCH | - |

---

## Gate Thresholds

| Gate | Stage | Minimum Score | Critical Criteria |
|------|-------|---------------|-------------------|
| 1 | RESEARCH | **85** | Market viability, uniqueness |
| 2 | DESIGN | 85 | Accessibility, feasibility |
| 3 | BUILD | 85 | Code quality, no errors |
| 4 | TEST | 100% pass | 0 critical bugs |
| 5 | DEPLOY | 100% | Site live, HTTP 200 |
| 6 | VERIFY | 95 | Security, performance |
| 7 | AUTOMATE | 100% | All workflows active |
| 8 | EVOLVE | No regression | Fitness maintained |

---

## Environment Configuration

### Required for Piku (Frontend Deployment)
```bash
# Piku server SSH access
PIKU_SERVER=piku@your-server.com
PIKU_SSH_KEY=~/.ssh/id_rsa

# Setup: https://github.com/piku/piku
# Install on server: curl https://piku.github.io/get | sh
```

### Required for Conduit (Backend/BaaS)
```bash
# Conduit Platform
CONDUIT_URL=http://localhost:3000  # or your server URL
CONDUIT_ADMIN_USER=admin
CONDUIT_ADMIN_PASS=admin  # Change in production!
CONDUIT_API_KEY=your-conduit-api-key

# Setup: https://getconduit.dev/docs/v0.14/overview/intro
# Docker: docker-compose up -d
```

### Fallback: Coolify (Full PaaS)
```bash
COOLIFY_URL=https://your-coolify-instance.com
COOLIFY_API_TOKEN=your-api-token
COOLIFY_SERVER_ID=your-server-id
COOLIFY_TEAM_ID=your-team-id
```

### Required for Free Marketing
```bash
# Reddit API (free)
REDDIT_CLIENT_ID=your-reddit-app-client-id
REDDIT_CLIENT_SECRET=your-reddit-app-client-secret
REDDIT_USERNAME=your-reddit-username
REDDIT_PASSWORD=your-reddit-password

# LinkedIn (free)
LINKEDIN_EMAIL=your-linkedin-email
LINKEDIN_PASSWORD=your-linkedin-password

# RapidAPI for trends (free tier)
RAPIDAPI_KEY=your-rapidapi-key
```

### Roundtable MCP (required)
```bash
# Codex and Gemini subagents configured via MCP
# No additional env vars needed if MCP is set up
```

---

## Running the Pipeline

```bash
# Standard run (Coolify + Evolution + Marketing)
python -c "
from infrastructure.genesis_pipeline import GenesisPipeline
import asyncio

async def main():
    pipeline = GenesisPipeline(
        enable_agui=True,
        enable_evolution=True,  # SE-Darwin enabled
        enable_n8n=True,
        strict_gates=True
    )
    result = await pipeline.run(
        business_type='saas',
        target_market='developers'
    )
    print(f'Status: {result.status}')
    print(f'Live URL: {result.live_url}')

asyncio.run(main())
"

# Quick test run (no verification)
python -c "
from infrastructure.genesis_pipeline import GenesisPipeline
import asyncio

async def main():
    pipeline = GenesisPipeline(
        enable_agui=False,
        enable_evolution=False,
        enable_n8n=False,
        strict_gates=False,
        skip_deploy_verification=True
    )
    result = await pipeline.run(
        business_type='saas',
        target_market='test'
    )
    print(f'Status: {result.status}')

asyncio.run(main())
"
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `infrastructure/genesis_pipeline.py` | Main pipeline orchestrator |
| `infrastructure/orchestrator_gate.py` | Gate control system |
| `infrastructure/piku_deployer.py` | Piku deployment (primary) |
| `infrastructure/coolify_deployer.py` | Coolify deployment (fallback) |
| `infrastructure/se_darwin.py` | Evolution engine |
| `infrastructure/genesis_meta_agent.py` | Business spec generation |
| `agents/free_marketing_agent.py` | Marketing automation |
| `config/mcp_social_media.json` | MCP server configs |

---

## Version History

- **v1.0** (Dec 2025): Initial specification
- **v1.1** (Dec 2025): Raised RESEARCH threshold to 85+
- **v1.2** (Dec 2025): Switched primary deployment to Coolify
- **v1.3** (Dec 2025): Added Free Marketing Agent integration
- **v1.4** (Dec 2025): Added QC criteria and failure remediation
- **v1.5** (Dec 2025): **OPEN SOURCE FIRST** policy
  - Primary deploy: Piku (https://github.com/piku/piku)
  - Backend: Conduit Platform (https://getconduit.dev/)
  - Added Open Source alternatives table
  - Created `infrastructure/piku_deployer.py`
