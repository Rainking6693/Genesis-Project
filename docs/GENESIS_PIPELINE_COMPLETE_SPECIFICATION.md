# Genesis Autonomous Business Pipeline - Complete Specification

> **Version:** 1.0.0
> **Date:** December 10, 2025
> **Status:** Production Ready
> **Purpose:** Complete documentation for rebuilding the Genesis Pipeline from scratch

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Required API Keys](#required-api-keys)
4. [Pipeline Stages (8 Gates)](#pipeline-stages-8-gates)
5. [Core Components](#core-components)
6. [Quality Gates System](#quality-gates-system)
7. [File Structure](#file-structure)
8. [Data Models](#data-models)
9. [Integration Points](#integration-points)
10. [Deployment Platforms](#deployment-platforms)
11. [Open Source Alternatives](#open-source-alternatives)
12. [Running the Pipeline](#running-the-pipeline)
13. [Troubleshooting](#troubleshooting)

---

## Executive Summary

The Genesis Pipeline is a **fully autonomous business generation system** that:

1. **Discovers** a market niche using RAG-based semantic search
2. **Designs** UI/UX and architecture specifications
3. **Builds** complete static websites (HTML/CSS)
4. **Tests** generated code for validity
5. **Deploys** to GitHub Pages (free hosting)
6. **Verifies** the live deployment works
7. **Automates** ongoing operations via n8n workflows
8. **Evolves** using SE-Darwin for continuous improvement

### Key Principles

- **Minimal API dependencies** - Only 4 API keys needed for full automation
- **Open source first** - Uses local/free alternatives wherever possible
- **Gate-controlled** - Every stage must pass quality checks before proceeding
- **Autonomous** - No human intervention required (except billing >$100)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GENESIS AUTONOMOUS PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    CLAUDE (Primary Orchestrator)                         ││
│  │                                                                          ││
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐         ││
│  │  │ RESEARCH  │──▶│  DESIGN   │──▶│   BUILD   │──▶│   TEST    │         ││
│  │  │  Gate 1   │   │  Gate 2   │   │  Gate 3   │   │  Gate 4   │         ││
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘         ││
│  │        │                                               │                 ││
│  │        ▼                                               ▼                 ││
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐         ││
│  │  │  EVOLVE   │◀──│ AUTOMATE  │◀──│  VERIFY   │◀──│  DEPLOY   │         ││
│  │  │  Gate 8   │   │  Gate 7   │   │  Gate 6   │   │  Gate 5   │         ││
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘         ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐         ┌─────────────────┐         ┌─────────────┐        │
│  │ QUALITY     │         │   RESEARCH RAG  │         │   DEPLOYER  │        │
│  │ GATES       │         │   (LlamaIndex)  │         │ (GitHub     │        │
│  │             │         │                 │         │  Pages)     │        │
│  │ -Confidence │         │ -Business Corpus│         │             │        │
│  │ -Self-Check │         │ -HuggingFace    │         │ -Free       │        │
│  │ -Reflexion  │         │  Embeddings     │         │ -Static     │        │
│  └─────────────┘         └─────────────────┘         └─────────────┘        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         EXTERNAL SERVICES                                ││
│  │                                                                          ││
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐         ││
│  │  │  GitHub   │   │  Porkbun  │   │  Stripe   │   │    n8n    │         ││
│  │  │  Pages    │   │  Domains  │   │  Payments │   │ Workflows │         ││
│  │  │  (FREE)   │   │  ($10/yr) │   │  (2.9%)   │   │  (Self)   │         ││
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘         ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Required API Keys

### Tier 1: REQUIRED (Minimum for full automation)

| Key | Service | Purpose | Cost | Where to Get |
|-----|---------|---------|------|--------------|
| `ANTHROPIC_API_KEY` | Claude | Primary AI orchestrator | ~$20-100/mo | https://console.anthropic.com |
| `GITHUB_TOKEN` | GitHub | Deployment to Pages | FREE | https://github.com/settings/tokens |
| `PORKBUN_API_KEY` | Porkbun | Domain registration | ~$10/domain/yr | https://porkbun.com/account/api |
| `PORKBUN_SECRET_KEY` | Porkbun | Domain registration | (included) | https://porkbun.com/account/api |
| `STRIPE_SECRET_KEY` | Stripe | Payment processing | 2.9% + $0.30/txn | https://dashboard.stripe.com/apikeys |

### Tier 2: OPTIONAL (Have open source alternatives)

| Key | Service | Open Source Alternative |
|-----|---------|------------------------|
| `OPENAI_API_KEY` | GPT backup | Ollama (local LLM) |
| `GEMINI_API_KEY` | QA via Roundtable | Local testing |

### Environment File Template

```env
# .env - Copy from .env.example

# REQUIRED (4 keys for full automation)
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
GITHUB_USERNAME=your-username
PORKBUN_API_KEY=pk1_...
PORKBUN_SECRET_KEY=sk1_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# CONFIGURATION
GENESIS_ENV=production
DEFAULT_DEPLOY_PLATFORM=github-pages
LARGE_BILL_THRESHOLD=100.0

# LOCAL LLM (FREE - optional)
OLLAMA_HOST=http://localhost:11434
DEFAULT_LOCAL_MODEL=qwen2.5:7b
```

---

## Pipeline Stages (8 Gates)

### Stage 1: RESEARCH (Gate 1)

**Purpose:** Discover and validate business idea using RAG-based semantic search

**Inputs:**
- `business_type`: Type of business (saas, marketplace, analytics, etc.)
- `target_market`: Initial hint (or "general")

**Process:**
1. Query LlamaIndex RAG with business type
2. Retrieve semantically similar niches from 22-document corpus
3. Extract niche, value proposition, market size
4. Generate unique business name
5. Create MVP feature list

**Outputs:**
```python
{
    "business_idea": {
        "name": "devflowpro",
        "type": "saas",
        "target": "indie game developers who want to save 10+ hours per week",
        "niche": "indie game developers",
        "value_proposition": "save 10+ hours per week"
    },
    "discovered_market": {
        "niche": "indie game developers",
        "value_proposition": "save 10+ hours per week",
        "market_size": "medium",
        "confidence": 0.85,
        "discovery_method": "rag"
    }
}
```

**Gate Criteria:** Score >= 70/100

**Key File:** `infrastructure/research_rag.py`

---

### Stage 2: DESIGN (Gate 2)

**Purpose:** Create UI/UX and architecture specifications

**Inputs:**
- BusinessSpec from RESEARCH stage

**Process:**
1. Define UI components (Header, Hero, Features, Pricing, etc.)
2. Set color scheme and typography
3. Specify architecture (frontend, styling, deployment)

**Outputs:**
```python
{
    "design_spec": {
        "ui_components": ["Header", "Hero", "Features", "Pricing", "CTA", "Footer"],
        "color_scheme": {
            "primary": "#3B82F6",
            "secondary": "#10B981",
            "background": "#FFFFFF",
            "text": "#1F2937"
        },
        "typography": {"heading": "Inter", "body": "Inter"},
        "responsive": True,
        "accessibility": "WCAG 2.1 AA"
    },
    "architecture_spec": {
        "frontend": "html",
        "styling": "tailwind",
        "deployment": "github-pages"
    }
}
```

**Gate Criteria:** Score >= 75/100

---

### Stage 3: BUILD (Gate 3)

**Purpose:** Generate complete static website code

**Inputs:**
- DesignSpec from DESIGN stage
- BusinessSpec with features and pricing

**Process:**
1. Create business directory: `businesses/pipeline/{name}/`
2. Generate `index.html` with responsive design
3. Generate `style.css` with Tailwind-inspired classes
4. Generate `pricing.html` and `success.html`
5. Ensure GitHub Pages compatibility (no build step)

**Outputs:**
```python
{
    "codebase_path": "businesses/pipeline/devflowpro",
    "files_created": ["index.html", "style.css", "pricing.html", "success.html"],
    "generator": "StaticLandingPageGenerator"
}
```

**Gate Criteria:** Score >= 80/100, all files must exist

**Key File:** `scripts/deploy_real_landing_pages.py` (StaticLandingPageGenerator)

---

### Stage 4: TEST (Gate 4)

**Purpose:** Validate generated code quality

**Inputs:**
- Codebase path from BUILD stage

**Process:**
1. Verify all required files exist
2. Validate HTML structure (DOCTYPE, html, head, body, title)
3. Validate CSS has content
4. Check for syntax errors

**Outputs:**
```python
{
    "tests_results": [
        {"test": "File exists: index.html", "passed": True},
        {"test": "File exists: style.css", "passed": True},
        {"test": "HTML: Has DOCTYPE", "passed": True},
        {"test": "HTML: Has html tag", "passed": True},
        {"test": "CSS: Has content", "passed": True}
    ],
    "tests_passed": 5,
    "tests_total": 5,
    "pass_rate": 100.0
}
```

**Gate Criteria:** Pass rate >= 80%, 0 critical errors

---

### Stage 5: DEPLOY (Gate 5)

**Purpose:** Deploy to GitHub Pages

**Inputs:**
- Codebase path from BUILD stage
- Business name

**Process:**
1. Create GitHub repository: `{username}/{business_name}`
2. Initialize git, add files, commit
3. Push to GitHub
4. Enable GitHub Pages (from main branch)
5. Wait for deployment

**Outputs:**
```python
{
    "live_url": "https://username.github.io/devflowpro/",
    "repo_url": "https://github.com/username/devflowpro",
    "repo_name": "devflowpro",
    "verified": True
}
```

**Gate Criteria:** Site must return HTTP 200

**Key File:** `infrastructure/github_pages_deployer.py`

---

### Stage 6: VERIFY (Gate 6)

**Purpose:** Post-deployment verification

**Inputs:**
- Live URL from DEPLOY stage

**Process:**
1. HTTP request to live URL
2. Verify status code is 200
3. Check Content-Type is text/html
4. Verify response has content (>500 bytes)

**Outputs:**
```python
{
    "verification_results": [
        {"check": "HTTP Response", "passed": True, "details": "Status code: 200"},
        {"check": "Content Type", "passed": True, "details": "text/html"},
        {"check": "Has Content", "passed": True, "details": "15432 bytes"}
    ],
    "checks_passed": 3,
    "checks_total": 3
}
```

**Gate Criteria:** Score >= 95%

---

### Stage 7: AUTOMATE (Gate 7)

**Purpose:** Set up n8n workflows for ongoing operations

**Inputs:**
- Live URL
- Business name and details

**Workflows Created:**
1. **SEO Workflow** - Daily sitemap submission, meta optimization
2. **Marketing Workflow** - Social media calendar, email sequences
3. **Billing Workflow** - Stripe product setup, invoice automation
4. **Maintenance Workflow** - Uptime monitoring, auto-alerts

**Outputs:**
```python
{
    "workflows_created": ["seo", "marketing", "billing", "maintenance"],
    "n8n_dashboard": "http://localhost:5678"
}
```

**Gate Criteria:** At least 3 workflows active

**Key File:** `infrastructure/n8n_workflow_builder.py`

---

### Stage 8: EVOLVE (Gate 8)

**Purpose:** Continuous improvement via SE-Darwin

**Inputs:**
- Complete pipeline run data

**Process:**
1. Collect trajectory data (all stage outputs, scores, durations)
2. Store in SE-Darwin trajectory pool
3. Schedule evolution cycle
4. Archive successful patterns

**Outputs:**
```python
{
    "trajectory_stored": True,
    "evolution_scheduled": True
}
```

**Gate Criteria:** No regression in business performance

**Key File:** `infrastructure/se_darwin.py`

---

## Core Components

### 1. GenesisPipeline (`infrastructure/genesis_pipeline.py`)

Main orchestrator class. Key methods:

```python
class GenesisPipeline:
    def __init__(
        self,
        enable_agui: bool = True,      # Real-time visualization
        enable_evolution: bool = True,  # SE-Darwin
        enable_n8n: bool = True,        # Workflow automation
        strict_gates: bool = True,      # Fail on any gate failure
        skip_deploy_verification: bool = False
    )

    async def run(
        self,
        business_type: str,      # saas, marketplace, analytics, etc.
        target_market: str,      # Initial hint or "general"
        name: Optional[str],     # Optional business name
        features: Optional[List[str]],
        **kwargs
    ) -> PipelineRun
```

### 2. ResearchRAG (`infrastructure/research_rag.py`)

LlamaIndex-powered niche discovery:

```python
class ResearchRAG:
    def __init__(self):
        # Uses HuggingFace embeddings (local, free)
        # sentence-transformers/all-MiniLM-L6-v2

    async def discover_niche(
        self,
        business_type: str,
        initial_hint: str = "general"
    ) -> DiscoveredNiche

# Corpus: 22 curated documents covering:
# - SaaS opportunities (5 docs)
# - Marketplace opportunities (3 docs)
# - Analytics opportunities (2 docs)
# - Automation opportunities (2 docs)
# - Education opportunities (2 docs)
# - AI opportunities (2 docs)
# - Fintech opportunities (2 docs)
# - Social opportunities (2 docs)
# - E-commerce opportunities (2 docs)
```

### 3. PipelineQualityGates (`infrastructure/pipeline_quality_gates.py`)

Three-skill quality system:

```python
class PipelineQualityGates:
    async def run_confidence_check(
        self,
        task_description: str,
        context: Dict[str, Any]
    ) -> ConfidenceResult
    # Threshold: >= 90% to proceed

    async def run_self_check(
        self,
        stage_output: Dict[str, Any],
        codebase_path: Optional[str]
    ) -> SelfCheckResult
    # Threshold: >= 94% = ACCEPT, 80-93% = REVISE

    async def run_reflexion(
        self,
        error: Exception,
        context: Dict[str, Any]
    ) -> ReflexionResult
    # Target: <10% error recurrence
```

### 4. GitHubPagesDeployer (`infrastructure/github_pages_deployer.py`)

Free static site deployment:

```python
class GitHubPagesDeployer:
    async def deploy(
        self,
        app_path: str,
        business_name: str,
        verify: bool = True
    ) -> Dict[str, Any]
    # Returns: {success, deployment_url, repo_url, repo_name, verified}
```

### 5. PorkbunClient (`infrastructure/porkbun_client.py`)

Domain registration:

```python
class PorkbunClient:
    def check_availability(self, domain: str) -> DomainAvailability
    def register_domain(self, domain: str, years: int = 1) -> DomainRegistration
    def configure_github_pages(self, domain: str) -> bool
```

---

## Quality Gates System

### Confidence Check (BEFORE implementation)

| Check | Weight | Description |
|-------|--------|-------------|
| No Duplicates | 25% | Similar implementation doesn't already exist |
| Architecture | 25% | Uses approved tech stack |
| Documentation | 20% | Official docs consulted (Context7) |
| OSS References | 15% | Open source alternatives checked |
| Root Cause | 15% | Clear understanding of requirements |

**Decision Thresholds:**
- >= 90%: PROCEED
- 70-89%: CLARIFY (ask questions)
- < 70%: STOP

### Self-Check (AFTER implementation)

| Check | Weight | Description |
|-------|--------|-------------|
| Files/Paths | 25% | All referenced files exist |
| Imports | 20% | All imports resolve |
| Syntax | 20% | Code parses without errors |
| APIs | 20% | Endpoints match documentation |
| Facts | 15% | Claims are accurate |

**Decision Thresholds:**
- >= 94%: ACCEPT
- 80-93%: REVISE
- 60-79%: REVIEW
- < 60%: REJECT

### Reflexion (WHEN errors occur)

Error classification:
- `syntax` - Code structure errors
- `import` - Module not found
- `data` - KeyError, IndexError
- `network` - Connection issues
- `filesystem` - Path not found
- `type` - Type mismatch
- `logic` - Incorrect behavior

**Target:** <10% error recurrence rate

---

## File Structure

```
Genesis-Project/
├── infrastructure/
│   ├── genesis_pipeline.py          # Main orchestrator
│   ├── research_rag.py              # LlamaIndex RAG
│   ├── pipeline_quality_gates.py    # 3-skill quality system
│   ├── github_pages_deployer.py     # Deployment
│   ├── porkbun_client.py            # Domain registration
│   ├── n8n_workflow_builder.py      # Automation workflows
│   ├── se_darwin.py                 # Evolution strategies
│   ├── genesis_meta_agent.py        # Meta agent
│   ├── orchestrator_gate.py         # Gate evaluation
│   ├── agui_emitter.py              # AG-UI events
│   └── load_env.py                  # Environment loading
│
├── scripts/
│   ├── deploy_real_landing_pages.py # StaticLandingPageGenerator
│   └── run_pipeline.py              # Entry point
│
├── agents/
│   └── domain_name_agent.py         # Domain operations
│
├── businesses/
│   └── pipeline/                    # Generated businesses
│       └── {business_name}/
│           ├── index.html
│           ├── style.css
│           ├── pricing.html
│           └── success.html
│
├── data/
│   └── error_memory.json            # Reflexion memory
│
├── .env                             # API keys (from .env.example)
├── .env.example                     # Template
└── requirements.txt                 # Python dependencies
```

---

## Data Models

### BusinessSpec

```python
@dataclass
class BusinessSpec:
    business_id: str           # e.g., "genesis-a1b2c3d4"
    name: str                  # e.g., "devflowpro"
    business_type: str         # e.g., "saas"
    target_market: str         # e.g., "indie game developers who want to save 10+ hours"
    description: str           # Full description
    features: List[str]        # 6 MVP features
    tech_stack: Dict[str, str] # {"frontend": "html", "styling": "tailwind"}
    design_requirements: Dict  # Color scheme, typography, etc.
    deployment_platform: str   # "github-pages"
    metadata: Dict             # Market discovery data
```

### PipelineRun

```python
@dataclass
class PipelineRun:
    run_id: str
    business_spec: BusinessSpec
    status: PipelineStatus          # PENDING, RUNNING, COMPLETED, FAILED
    current_stage: PipelineStage
    stage_outputs: Dict[PipelineStage, StageOutput]
    gate_evaluations: Dict[int, GateEvaluation]
    start_time: float
    end_time: float
    live_url: str
    errors: List[str]
```

### StageOutput

```python
@dataclass
class StageOutput:
    stage: PipelineStage
    success: bool
    data: Dict[str, Any]
    score: float               # 0-100
    errors: List[str]
    duration_seconds: float
    agent_logs: List[str]
```

### GateEvaluation

```python
@dataclass
class GateEvaluation:
    gate: int                  # 1-8
    result: GateResult         # PASS, FAIL, REVISE
    score: float
    feedback: str
    evaluator: str             # "Emily" (orchestrator)
    timestamp: float
```

---

## Integration Points

### LlamaIndex RAG

```python
# Dependencies
pip install llama-index-core llama-index-embeddings-huggingface

# Usage
from infrastructure.research_rag import discover_niche_with_rag

result = await discover_niche_with_rag("saas", "developers")
# Returns dict with: niche, value_proposition, market_size, confidence
```

### GitHub API

```python
# Uses PyGithub or direct REST API
# Requires: GITHUB_TOKEN with repo scope

# Creates repo, pushes code, enables Pages
```

### Porkbun API

```python
# All calls are POST with API key authentication
# Endpoint: https://porkbun.com/api/json/v3

# Key operations:
# - /ping (test connection)
# - /domain/checkAvailability/{domain}
# - /domain/create
# - /dns/create/{domain}
```

### n8n Workflows

```python
# Self-hosted on http://localhost:5678
# Creates workflows via REST API or config files

# Workflow types:
# - SEO: Cron daily 6am, sitemap submission
# - Marketing: Trigger on deploy, social calendar
# - Billing: Trigger on deploy, Stripe products
# - Maintenance: Cron every 5min, health checks
```

---

## Deployment Platforms

### GitHub Pages (PRIMARY - FREE)

**Requirements:**
- Public repository (or Pro account for private)
- Static files only (HTML, CSS, JS)
- No server-side code

**Process:**
1. Create repo: `username/business-name`
2. Push static files to main branch
3. Enable Pages in repo settings
4. URL: `https://username.github.io/business-name/`

### Railway (BACKUP - for backends)

**Requirements:**
- `RAILWAY_TOKEN`
- Dockerfile or supported runtime

**Use for:**
- Sites requiring server-side rendering
- API backends
- Database connections

### Custom Domain Setup

**With Porkbun:**
1. Register domain via PorkbunClient
2. Configure DNS records:
   - 4x A records: 185.199.108-111.153
   - 1x CNAME: www -> domain.com
3. Add custom domain in GitHub Pages settings
4. Wait for SSL certificate (automatic)

---

## Open Source Alternatives

| Function | Paid Service | Open Source Alternative | Savings |
|----------|-------------|------------------------|---------|
| Embeddings | OpenAI ($0.0001/1K) | HuggingFace (FREE) | 100% |
| Local LLM | GPT-4 | Ollama (FREE) | ~$50/mo |
| Analytics | Google Analytics | Plausible (self-host) | FREE |
| Monitoring | Datadog | Prometheus + Grafana | ~$15/host |
| Search | Algolia | MeiliSearch | ~$29/mo |
| Automation | Zapier | n8n (self-host) | ~$19/mo |
| Billing | Stripe Billing | Lago (self-host) | 0.5-0.8%/invoice |
| Email | SendGrid | Mailpit (dev) / SMTP | FREE |

---

## Running the Pipeline

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/Genesis-Project
cd Genesis-Project
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run single business generation
python -c "
import asyncio
from infrastructure.genesis_pipeline import run_pipeline

async def main():
    result = await run_pipeline(
        business_type='saas',
        target_market='developers'
    )
    print(f'Status: {result.status.value}')
    print(f'Live URL: {result.live_url}')

asyncio.run(main())
"
```

### Pipeline Options

```python
pipeline = GenesisPipeline(
    enable_agui=True,           # Real-time dashboard
    enable_evolution=True,       # SE-Darwin learning
    enable_n8n=True,            # Automation workflows
    strict_gates=True,          # Fail on any gate failure
    skip_deploy_verification=False
)

result = await pipeline.run(
    business_type="saas",       # Required
    target_market="developers", # Required (or "general")
    name="my-business",         # Optional
    features=["Feature 1", "Feature 2"],  # Optional
    platform="github-pages"     # Optional
)
```

### Business Types Supported

| Type | Description | Example Niches |
|------|-------------|----------------|
| `saas` | Software as a Service | AI/ML engineers, DevOps teams, startup founders |
| `marketplace` | Two-sided platforms | Freelance designers, content creators |
| `analytics` | Data visualization | E-commerce stores, SaaS companies |
| `automation` | Workflow tools | HR departments, sales teams |
| `education` | Learning platforms | Bootcamp students, career changers |
| `ai` | AI-powered tools | Prompt engineers, data scientists |
| `fintech` | Financial tools | Freelancers, small businesses |
| `social` | Community platforms | Remote teams, online communities |
| `ecommerce` | Online stores | Handmade sellers, subscription boxes |

---

## Troubleshooting

### Common Issues

**1. LlamaIndex not available**
```
LlamaIndex not available: No module named 'llama_index'
```
**Solution:** `pip install llama-index-core llama-index-embeddings-huggingface`

**2. GitHub deployment fails**
```
Deployment failed: Authentication required
```
**Solution:** Check `GITHUB_TOKEN` has `repo` scope

**3. Porkbun API error**
```
Porkbun credentials not found
```
**Solution:** Set both `PORKBUN_API_KEY` and `PORKBUN_SECRET_KEY` in .env

**4. Gate failure**
```
Gate 3 FAILED: Score 75 below threshold 80
```
**Solution:** Check stage output for specific errors, review generated files

**5. RAG returns fallback**
```
RAG discovery unavailable, using fallback
```
**Solution:** This is OK - fallback still works with random selection

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Or for specific module:
logging.getLogger("infrastructure.genesis_pipeline").setLevel(logging.DEBUG)
```

### Health Checks

```python
# Test individual components:

# 1. Test RAG
from infrastructure.research_rag import ResearchRAG
rag = ResearchRAG()
result = await rag.discover_niche("saas", "developers")
print(f"RAG working: {result.source}")  # Should be "rag" or "fallback"

# 2. Test Porkbun
from infrastructure.porkbun_client import PorkbunClient
client = PorkbunClient()
print(f"Porkbun ping: {client.ping()}")  # Should be True

# 3. Test Quality Gates
from infrastructure.pipeline_quality_gates import PipelineQualityGates
gates = PipelineQualityGates()
result = await gates.run_confidence_check("Test task", {})
print(f"Confidence: {result.score:.0%}")  # Should be >= 80%
```

---

## Appendix: Full Code References

### Key Imports

```python
# Main pipeline
from infrastructure.genesis_pipeline import GenesisPipeline, run_pipeline, PipelineStage

# RAG
from infrastructure.research_rag import ResearchRAG, discover_niche_with_rag

# Quality gates
from infrastructure.pipeline_quality_gates import PipelineQualityGates

# Deployment
from infrastructure.github_pages_deployer import GitHubPagesDeployer

# Domains
from infrastructure.porkbun_client import PorkbunClient, get_porkbun_client

# Automation
from infrastructure.n8n_workflow_builder import N8NWorkflowBuilder

# Evolution
from infrastructure.se_darwin import get_se_darwin
```

### Dependencies (requirements.txt additions)

```
# Core
anthropic>=0.18.0

# RAG
llama-index-core>=0.10.0
llama-index-embeddings-huggingface>=0.1.0
sentence-transformers>=2.2.0

# HTTP
aiohttp>=3.9.0
requests>=2.31.0

# GitHub
PyGithub>=2.1.0

# Utils
python-dotenv>=1.0.0
```

---

**Document End**

This specification is complete and self-contained. Any AI assistant or developer should be able to rebuild the Genesis Pipeline exactly as designed using this document.
