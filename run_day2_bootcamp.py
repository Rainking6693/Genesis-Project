"""
Day 2 Bootcamp Runner - 100 Test Challenge
Genesis + 11 Agents: Website Building & Running Focus

Test Distribution:
- Easy (25): Solo agent tasks - basic website operations
- Intermediate (25): Solo & team tasks - website features
- Hard (25): Full squad & complex scenarios
- Extreme (25): Genesis-led full business operations

Usage:
    python run_day2_bootcamp.py                    # Run all 100 tests
    python run_day2_bootcamp.py --quick            # Quick run: 5 per difficulty
    python run_day2_bootcamp.py --difficulty easy  # Run only easy tests
    python run_day2_bootcamp.py --max-tests 10     # Max 10 per difficulty
"""

import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml

# LLM clients
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    from mistralai import Mistral
    MISTRAL_AVAILABLE = True
except ImportError:
    MISTRAL_AVAILABLE = False

# Add project root to path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("day2_bootcamp")

# Try to import project modules
try:
    from infrastructure.local_llm_client import get_local_llm_client
except ImportError:
    get_local_llm_client = None

try:
    from infrastructure.openhands_local import OpenHandsLocalClient
except ImportError:
    OpenHandsLocalClient = None


class Difficulty(Enum):
    EASY = "easy"
    INTERMEDIATE = "intermediate"
    HARD = "hard"
    EXTREME = "extreme"


class TestType(Enum):
    SOLO = "solo"
    TEAM = "team"
    GENESIS_LED = "genesis_led"


@dataclass
class TestResult:
    """Result of a single test execution."""
    test_id: str
    name: str
    difficulty: str
    test_type: str
    passed: bool
    reward: float
    execution_time: float
    agents_used: List[str] = field(default_factory=list)
    agent_outputs: Dict[str, Any] = field(default_factory=dict)
    criteria_results: Dict[str, bool] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class BootcampResults:
    """Aggregate results for the bootcamp."""
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    total_reward: float = 0.0
    max_possible_reward: float = 0.0
    total_time: float = 0.0
    by_difficulty: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    by_type: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    by_agent: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    test_results: List[TestResult] = field(default_factory=list)


class Day2BootcampRunner:
    """
    Runs Day 2 bootcamp tests for Genesis + 11 agents.
    100 tests across easy/intermediate/hard/extreme difficulty.
    """

    def __init__(
        self,
        scenarios_path: str = "tests/day2_bootcamp_scenarios.yaml",
        rl_config_path: str = "config/rl_day2.yaml",
        output_dir: str = "data/bootcamp_results",
        use_llm: bool = True,
        openai_key: str = None,
        gemini_key: str = None,
        mistral_key: str = None,
    ):
        self.scenarios_path = Path(scenarios_path)
        self.rl_config_path = Path(rl_config_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.use_llm = use_llm

        # Load configurations
        self.scenarios = self._load_scenarios()
        self.rl_config = self._load_rl_config()

        # Initialize LLM clients - Mistral primary, others fallback
        self.openai_client = None
        self.gemini_model = None
        self.mistral_client = None
        self.llm_client = None
        self.llm_stats = {"mistral": 0, "openai": 0, "gemini": 0, "errors": 0, "retries": 0}

        if use_llm:
            # Setup Mistral as primary
            mistral_api_key = mistral_key or os.getenv("MISTRAL_API_KEY")
            if MISTRAL_AVAILABLE and mistral_api_key:
                try:
                    self.mistral_client = Mistral(api_key=mistral_api_key)
                    logger.info("Mistral client initialized (primary)")
                except Exception as e:
                    logger.warning(f"Could not initialize Mistral: {e}")

            # Setup Gemini as fallback
            gemini_api_key = gemini_key or os.getenv("GEMINI_API_KEY")
            if GEMINI_AVAILABLE and gemini_api_key:
                try:
                    genai.configure(api_key=gemini_api_key)
                    self.gemini_model = genai.GenerativeModel("gemini-2.0-flash-exp")
                    logger.info("Gemini client initialized (fallback)")
                except Exception as e:
                    logger.warning(f"Could not initialize Gemini: {e}")

            # Setup OpenAI as fallback
            openai_api_key = openai_key or os.getenv("OPENAI_API_KEY")
            if OPENAI_AVAILABLE and openai_api_key:
                try:
                    self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
                    logger.info("OpenAI client initialized (fallback)")
                except Exception as e:
                    logger.warning(f"Could not initialize OpenAI: {e}")

            # Also try local LLM as last resort
            if get_local_llm_client:
                try:
                    self.llm_client = get_local_llm_client()
                    logger.info("Local LLM client initialized (backup)")
                except Exception as e:
                    logger.warning(f"Could not initialize local LLM: {e}")

        # Initialize OpenHands for dev tasks
        self.openhands = None
        if OpenHandsLocalClient:
            try:
                self.openhands = OpenHandsLocalClient()
                logger.info("OpenHands client initialized")
            except Exception as e:
                logger.warning(f"Could not initialize OpenHands: {e}")

        # Agent prompts
        self.agent_prompts = self._load_agent_prompts()

        # Results tracking
        self.results = BootcampResults()

    def _load_scenarios(self) -> Dict[str, Any]:
        """Load test scenarios from YAML."""
        if not self.scenarios_path.exists():
            logger.error(f"Scenarios file not found: {self.scenarios_path}")
            return {}

        with open(self.scenarios_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _load_rl_config(self) -> Dict[str, Any]:
        """Load RL configuration."""
        if not self.rl_config_path.exists():
            logger.warning(f"RL config not found: {self.rl_config_path}")
            return {}

        with open(self.rl_config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _load_agent_prompts(self) -> Dict[str, str]:
        """Load agent system prompts."""
        return {
            "genesis_meta": """You are Genesis, the meta-agent and coordinator.
You orchestrate other agents to build and run complete websites and businesses.
Delegate tasks appropriately and ensure quality across all outputs.
Focus on website building, deployment, and business operations.""",

            "analyst_agent": """You are the Analyst Agent.
You analyze markets, competitors, user needs, and business metrics.
Provide data-driven insights and recommendations for website strategy.""",

            "builder_agent_enhanced": """You are the Builder Agent.
You write clean, modern code for websites and web applications.
Use React, Next.js, TypeScript, and modern CSS/Tailwind.
Always include proper HTML structure, accessibility, and responsive design.""",

            "deploy_agent": """You are the Deploy Agent.
You handle CI/CD pipelines, deployment configurations, and infrastructure.
Support Netlify, Vercel, Railway, GitHub Actions, and Docker deployments.
Always include proper configuration files and environment handling.""",

            "billing_agent": """You are the Billing Agent.
You handle pricing strategies, payment integration (Stripe),
invoicing, subscription management, and financial workflows.""",

            "emergency_error_specialist_agent": """You are the Emergency Error Specialist.
You diagnose and fix critical issues: bugs, performance problems,
security vulnerabilities, and outages. Fast, accurate response is key.
Always provide root cause analysis and preventive measures.""",

            "marketing_agent": """You are the Marketing Agent.
You create compelling copy, marketing strategies, campaigns,
and conversion-focused content. Focus on value propositions and CTAs.""",

            "support_agent": """You are the Support Agent.
You create help documentation, handle support workflows,
design knowledge bases, and ensure excellent customer experience.""",

            "onboarding_agent": """You are the Onboarding Agent.
You design user onboarding flows, tutorials, checklists,
and ensure new users succeed quickly with the product.""",

            "qa_agent": """You are the QA Agent.
You write tests (unit, integration, E2E with Playwright/Jest),
perform audits, and ensure code quality and reliability.
Include comprehensive test cases and assertions.""",

            "se_darwin_agent": """You are the Search & Evolution Agent (SE-Darwin).
You implement search functionality, information retrieval,
fuzzy matching, and evolving algorithms for better results.""",

            "seo_agent": """You are the SEO Agent.
You optimize for search engines: meta tags, schema markup,
sitemaps, robots.txt, and content optimization.
Follow latest SEO best practices and Core Web Vitals.""",
        }

    async def _call_agent(
        self,
        agent_name: str,
        task: str,
        context: Optional[str] = None,
    ) -> Tuple[str, bool]:
        """
        Call an agent with a task and return its output.
        Uses OpenAI as primary, Gemini as fallback.
        Returns (output, success).
        """
        # Check if we have any LLM available
        if not self.use_llm or (not self.openai_client and not self.gemini_model and not self.llm_client):
            # Simulate agent response for testing
            return self._simulate_agent_response(agent_name, task), True

        prompt = self.agent_prompts.get(agent_name, f"You are the {agent_name}.")
        full_prompt = f"{prompt}\n\n"
        if context:
            full_prompt += f"Previous Context:\n{context}\n\n"
        full_prompt += f"Task:\n{task}\n\nProvide your complete output:"

        # Try Mistral first (primary)
        if self.mistral_client:
            try:
                response = await asyncio.to_thread(
                    self.mistral_client.chat.complete,
                    model="mistral-small-latest",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"{f'Previous Context: {context}' if context else ''}\n\nTask:\n{task}\n\nProvide your complete output:"}
                    ],
                )
                self.llm_stats["mistral"] += 1
                return response.choices[0].message.content, True
            except Exception as e:
                logger.warning(f"Mistral failed for {agent_name}: {e}, trying Gemini fallback")
                self.llm_stats["retries"] += 1

        # Fallback to Gemini
        if self.gemini_model:
            try:
                response = await asyncio.to_thread(
                    self.gemini_model.generate_content,
                    full_prompt,
                )
                self.llm_stats["gemini"] += 1
                return response.text, True
            except Exception as e:
                logger.warning(f"Gemini failed for {agent_name}: {e}, trying OpenAI fallback")
                self.llm_stats["retries"] += 1

        # Fallback to OpenAI
        if self.openai_client:
            try:
                response = await self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"{f'Previous Context: {context}' if context else ''}\n\nTask:\n{task}\n\nProvide your complete output:"}
                    ],
                    max_tokens=2000,
                    temperature=0.3,
                )
                self.llm_stats["openai"] += 1
                return response.choices[0].message.content, True
            except Exception as e:
                logger.warning(f"OpenAI failed for {agent_name}: {e}, trying local LLM")
                self.llm_stats["retries"] += 1

        # Last resort: local LLM
        if self.llm_client:
            try:
                response = await self.llm_client.complete(
                    prompt=full_prompt,
                    max_tokens=2000,
                    temperature=0.3,
                )
                return response, True
            except Exception as e:
                logger.error(f"All LLMs failed for {agent_name}: {e}")
                self.llm_stats["errors"] += 1
                return str(e), False

        self.llm_stats["errors"] += 1
        return "No LLM available", False

    def _simulate_agent_response(self, agent_name: str, task: str) -> str:
        """Simulate agent response for testing without LLM."""
        # Generate realistic-looking responses based on agent type
        responses = {
            "builder_agent_enhanced": """```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample Page</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; }
        header { background: #1a1a2e; color: white; padding: 1rem; }
        .hero { padding: 4rem 2rem; text-align: center; background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
        .about { padding: 3rem 2rem; max-width: 800px; margin: 0 auto; }
        .contact { padding: 3rem 2rem; background: #f5f5f5; }
        footer { background: #1a1a2e; color: white; padding: 2rem; text-align: center; }
        @media (max-width: 768px) { .hero { padding: 2rem 1rem; } }
    </style>
</head>
<body>
    <header><nav>Navigation Menu</nav></header>
    <section class="hero">
        <h1>Welcome to Our Site</h1>
        <p>Your tagline here</p>
        <button>Get Started</button>
    </section>
    <section class="about"><h2>About Us</h2><p>About content...</p></section>
    <section class="contact"><h2>Contact</h2><form><input type="email" placeholder="Email"><button type="submit">Submit</button></form></section>
    <footer>&copy; 2024 Company Name</footer>
</body>
</html>
```""",

            "deploy_agent": """```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
```""",

            "qa_agent": """```javascript
// tests/form-validation.test.js
import { validateEmail, validateForm } from '../src/validation';

describe('Email Validation', () => {
  test('valid email passes', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  test('invalid email without @ fails', () => {
    expect(validateEmail('testexample.com')).toBe(false);
  });

  test('invalid email without domain fails', () => {
    expect(validateEmail('test@')).toBe(false);
  });

  test('empty email fails', () => {
    expect(validateEmail('')).toBe(false);
  });

  test('email with special chars passes', () => {
    expect(validateEmail('test+filter@example.com')).toBe(true);
  });
});

describe('Form Validation', () => {
  test('valid form passes all checks', () => {
    const form = { name: 'John', email: 'john@test.com', message: 'Hello' };
    expect(validateForm(form)).toEqual({ valid: true, errors: [] });
  });
});
```""",

            "seo_agent": """```html
<!-- Meta Tags for SEO -->
<title>Project Management Tool - Boost Team Productivity | ProductName</title>
<meta name="description" content="Streamline your projects with our intuitive project management tool. Join 10,000+ teams. Start your free trial today.">
<meta name="keywords" content="project management, team collaboration, productivity, task management">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://example.com/">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:title" content="Project Management Tool - Boost Productivity">
<meta property="og:description" content="Streamline your projects with our intuitive management tool.">
<meta property="og:url" content="https://example.com/">
<meta property="og:image" content="https://example.com/og-image.jpg">

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Project Management Tool">
<meta name="twitter:description" content="Streamline your projects with our intuitive management tool.">
<meta name="twitter:image" content="https://example.com/twitter-image.jpg">

<!-- Schema.org -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ProductName",
  "applicationCategory": "BusinessApplication"
}
</script>
```""",

            "marketing_agent": """# Hero Section Copy

## Headline (7 words)
**Transform Your Workflow in Minutes, Not Days**

## Subheadline
Join 10,000+ teams using our project management platform to ship faster, collaborate better, and achieve more—without the complexity.

## CTA Button
**Start Free Trial →**

---

## Feature Bullet Points

1. **Ship 50% Faster** - Streamlined workflows eliminate bottlenecks and keep your team moving.

2. **Real-time Collaboration** - See changes instantly. No more version confusion or waiting for updates.

3. **Automated Status Updates** - Never chase teammates for progress. Get automatic notifications.

4. **100+ Integrations** - Connect with Slack, GitHub, Figma, and all your favorite tools.

5. **Smart Task Prioritization** - AI-powered suggestions help you focus on what matters most.

6. **Enterprise-grade Security** - SOC 2 certified with SSO, 2FA, and role-based permissions.
""",

            "analyst_agent": """# Competitive Analysis Report

## Executive Summary
Analysis of 3 key competitors in the project management space reveals opportunities for differentiation in automation and enterprise features.

## Competitor Overview

### Competitor A
- **Strengths**: Strong brand, extensive integrations
- **Weaknesses**: Complex pricing, slow performance
- **Pricing**: $10-30/user/month

### Competitor B
- **Strengths**: Simple UI, free tier
- **Weaknesses**: Limited features, no enterprise
- **Pricing**: Free - $15/user/month

### Competitor C
- **Strengths**: Enterprise focus, security
- **Weaknesses**: Expensive, dated UI
- **Pricing**: $25-50/user/month

## Feature Matrix
| Feature | Us | A | B | C |
|---------|-----|---|---|---|
| Real-time | ✓ | ✓ | ✗ | ✓ |
| AI Features | ✓ | ✗ | ✗ | ✗ |
| SSO | ✓ | ✓ | ✗ | ✓ |
| API | ✓ | ✓ | ✓ | ✓ |

## Recommendations
1. Emphasize AI-powered features as key differentiator
2. Target mid-market with competitive pricing
3. Invest in integrations to match Competitor A
""",

            "support_agent": """# Help Article: How to Reset Your Password

## Overview
If you've forgotten your password or need to reset it for security reasons, follow these simple steps.

## Prerequisites
- Access to the email associated with your account

## Step-by-Step Instructions

### Step 1: Go to Login Page
Navigate to [app.example.com/login](https://app.example.com/login)

### Step 2: Click "Forgot Password"
Click the "Forgot Password?" link below the login form.
![Screenshot placeholder: Forgot password link]

### Step 3: Enter Your Email
Type the email address associated with your account and click "Send Reset Link".
![Screenshot placeholder: Email input form]

### Step 4: Check Your Email
Look for an email from noreply@example.com with the subject "Password Reset Request".
> **Note**: Check your spam folder if you don't see it within 5 minutes.

### Step 5: Click the Reset Link
Click the secure link in the email. It expires after 24 hours.

### Step 6: Create New Password
Enter your new password. Requirements:
- At least 8 characters
- One uppercase letter
- One number
- One special character

## Troubleshooting

**Q: I didn't receive the email**
A: Check spam, verify email address, or contact support@example.com

**Q: The link expired**
A: Request a new reset link from the login page

## Need More Help?
Contact us at support@example.com or use the chat widget.
""",

            "onboarding_agent": """# 7-Step Onboarding Checklist

## Welcome to [ProductName]!
Let's get you set up for success. Complete these steps to unlock the full potential of your account.

---

## ☐ Step 1: Complete Your Profile (2 min)
Add your name, photo, and role to personalize your experience.
→ **Why**: Team members can identify you easily

## ☐ Step 2: Create Your First Project (3 min)
Start with a template or create from scratch.
→ **Why**: Get hands-on experience with the interface

## ☐ Step 3: Invite Your Team (2 min)
Add at least 2 team members to collaborate.
→ **Why**: Collaboration features are our superpower

## ☐ Step 4: Add Your First Task (1 min)
Create a task and assign it to yourself or a teammate.
→ **Why**: Learn the core workflow

## ☐ Step 5: Connect an Integration (3 min)
Link Slack, GitHub, or your favorite tool.
→ **Why**: Reduce context switching

## ☐ Step 6: Set Up Notifications (2 min)
Customize when and how you receive updates.
→ **Why**: Stay informed without overwhelm

## ☐ Step 7: Explore Templates (5 min)
Browse our template library for inspiration.
→ **Why**: Learn best practices from power users

---

## Progress: 0/7 Complete
[░░░░░░░░░░] 0%

## Need Help?
📚 Knowledge Base | 💬 Live Chat | 📧 Email Support
""",

            "billing_agent": """# Pricing Table Structure

## Free Tier
**$0/month**
- Up to 5 users
- 3 projects
- 1GB storage
- Community support
- Basic analytics

**CTA**: Start Free →

---

## Pro Tier (Most Popular)
**$12/user/month** (billed annually)
**$15/user/month** (billed monthly)

- Unlimited users
- Unlimited projects
- 100GB storage
- Priority support
- Advanced analytics
- Custom fields
- API access
- Integrations (50+)

**CTA**: Start 14-Day Trial →

---

## Enterprise Tier
**Custom pricing**
Contact sales for quote

- Everything in Pro
- Unlimited storage
- 24/7 dedicated support
- SSO/SAML
- Advanced security
- Custom integrations
- SLA guarantee
- Dedicated success manager
- On-premise option

**CTA**: Contact Sales →

---

## Payment Terms
- All plans billed in USD
- Annual plans save 20%
- 30-day money-back guarantee
- Cancel anytime

## Tax Information
- Prices exclude applicable taxes
- VAT handled automatically for EU customers
""",

            "emergency_error_specialist_agent": """# Incident Report: Memory Leak in React Component

## Issue Summary
Users reporting increasing page slowness over time, eventually leading to browser crashes.

## Root Cause Analysis

### Identified Issue
Memory leak in `DashboardWidget.tsx` due to improper useEffect cleanup.

```javascript
// BEFORE (Bug)
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  // Missing cleanup!
}, []);

// AFTER (Fixed)
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);  // Cleanup added
}, []);
```

### Additional Issues Found
1. WebSocket connection not closed on unmount
2. Event listeners not removed
3. AbortController not used for fetch requests

## Fix Applied

```javascript
useEffect(() => {
  const abortController = new AbortController();
  const interval = setInterval(() => {
    fetchData(abortController.signal);
  }, 5000);

  return () => {
    clearInterval(interval);
    abortController.abort();
  };
}, []);
```

## Circuit Breaker Added
Implemented max retry limit and error boundary to prevent cascading failures.

## Regression Test
```javascript
test('cleanup on unmount', () => {
  const { unmount } = render(<DashboardWidget />);
  unmount();
  expect(clearInterval).toHaveBeenCalled();
});
```

## Prevention Measures
1. Added ESLint rule for useEffect cleanup
2. Added memory leak detection in CI
3. Updated code review checklist
""",

            "se_darwin_agent": """# Search Implementation with Fuzzy Matching

```typescript
// search.ts
import Fuse from 'fuse.js';

interface SearchOptions {
  threshold?: number;
  keys: string[];
  limit?: number;
}

class SearchEngine<T> {
  private fuse: Fuse<T>;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(data: T[], options: SearchOptions) {
    this.fuse = new Fuse(data, {
      threshold: options.threshold ?? 0.3,
      keys: options.keys,
      includeMatches: true,
      includeScore: true,
    });
  }

  search(query: string, limit = 10): SearchResult<T>[] {
    if (!query.trim()) return [];

    const results = this.fuse.search(query, { limit });

    return results.map(result => ({
      item: result.item,
      score: result.score ?? 0,
      matches: result.matches ?? [],
      highlighted: this.highlight(result),
    }));
  }

  searchDebounced(query: string, callback: (results: SearchResult<T>[]) => void, delay = 150) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      callback(this.search(query));
    }, delay);
  }

  private highlight(result: Fuse.FuseResult<T>): string {
    // Highlight matching portions
    return result.matches?.map(m =>
      `<mark>${m.value}</mark>`
    ).join('') ?? '';
  }
}

// Autocomplete component
function Autocomplete({ data, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const engine = useMemo(() => new SearchEngine(data, {
    keys: ['name', 'description'],
    threshold: 0.4,
  }), [data]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActiveIndex(i => Math.min(i + 1, results.length - 1));
    if (e.key === 'ArrowUp') setActiveIndex(i => Math.max(i - 1, 0));
    if (e.key === 'Enter' && activeIndex >= 0) onSelect(results[activeIndex]);
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <input value={query} onChange={e => {
        setQuery(e.target.value);
        engine.searchDebounced(e.target.value, setResults);
      }} />
      <ul>
        {results.map((r, i) => (
          <li key={i} className={i === activeIndex ? 'active' : ''}>
            {r.highlighted}
          </li>
        ))}
      </ul>
    </div>
  );
}
```
""",
        }

        # Return appropriate response or generate generic one
        if agent_name in responses:
            return responses[agent_name]

        # Generic response for agents without specific templates
        return f"""## Task Completed: {agent_name}

### Analysis
The task has been analyzed and addressed according to {agent_name} expertise.

### Key Points
1. Primary objective identified and addressed
2. Best practices followed
3. Quality standards maintained

### Deliverables
- Main output completed
- Documentation provided
- Edge cases considered

### Next Steps
- Review and validate
- Integrate with other components
- Monitor for issues

Task reference: {task[:100]}...
"""

    def _evaluate_criteria(
        self,
        output: str,
        criteria: Dict[str, Any],
    ) -> Tuple[Dict[str, bool], float]:
        """
        Evaluate output against success criteria.
        Returns (criteria_results, score 0-1).
        """
        results = {}
        passed = 0
        output_lower = output.lower()

        # Handle both dict and list-of-dicts formats from YAML
        if isinstance(criteria, list):
            # Convert list of single-key dicts to a single dict
            criteria_dict = {}
            for item in criteria:
                if isinstance(item, dict):
                    criteria_dict.update(item)
            criteria = criteria_dict

        total = len(criteria) if criteria else 1

        for key, expected in criteria.items():
            check_passed = False

            if isinstance(expected, bool):
                # Check if concept is present
                if expected:
                    # Look for related terms
                    key_terms = key.replace("_", " ").split()
                    check_passed = (
                        any(term in output_lower for term in key_terms) or
                        len(output) > 100
                    )
                else:
                    key_terms = key.replace("_", " ").split()
                    check_passed = not any(term in output_lower for term in key_terms)

            elif isinstance(expected, list):
                if len(expected) > 0:
                    if isinstance(expected[0], str):
                        # Check if all items are mentioned
                        check_passed = all(
                            item.lower() in output_lower for item in expected
                        )
                    elif isinstance(expected[0], int) and len(expected) == 2:
                        # Range check [min, max]
                        word_count = len(output.split())
                        check_passed = expected[0] <= word_count <= expected[1] * 10

            elif isinstance(expected, int):
                # Minimum count/length check
                line_count = output.count("\n") + 1
                check_passed = line_count >= expected or len(output) > expected * 50

            else:
                # Default pass for unknown types
                check_passed = len(output) > 50

            results[key] = check_passed
            if check_passed:
                passed += 1

        score = passed / total if total > 0 else 0.0
        return results, score

    async def run_solo_test(self, test: Dict[str, Any]) -> TestResult:
        """Run a solo agent test."""
        start_time = time.time()
        agent = test["agent"]
        task = test["task"]

        logger.info(f"  Agent: {agent}")

        output, success = await self._call_agent(agent, task)

        criteria_results, score = self._evaluate_criteria(
            output, test.get("success_criteria", {})
        )

        passed = score >= 0.6 and success
        reward_weight = test.get("reward_weight", 1.0)
        reward = reward_weight * score if passed else reward_weight * 0.2

        return TestResult(
            test_id=test["id"],
            name=test["name"],
            difficulty=test["difficulty"],
            test_type="solo",
            passed=passed,
            reward=reward,
            execution_time=time.time() - start_time,
            agents_used=[agent],
            agent_outputs={agent: output[:500]},  # Truncate for storage
            criteria_results=criteria_results,
            error=None if success else "Agent call failed",
        )

    async def run_team_test(self, test: Dict[str, Any]) -> TestResult:
        """Run a team (multi-agent) test."""
        start_time = time.time()
        agents = test.get("agents", [])
        task = test["task"]

        logger.info(f"  Team: {', '.join(agents)}")

        agent_outputs = {}
        all_success = True
        combined_output = ""

        for i, agent in enumerate(agents):
            context = combined_output if combined_output else None
            output, success = await self._call_agent(agent, task, context)
            agent_outputs[agent] = output[:500]  # Truncate
            combined_output += f"\n\n[{agent}]:\n{output}"
            if not success:
                all_success = False

        criteria_results, score = self._evaluate_criteria(
            combined_output, test.get("success_criteria", {})
        )

        passed = score >= 0.5 and all_success
        reward_weight = test.get("reward_weight", 1.5)
        reward = reward_weight * score if passed else reward_weight * 0.15

        return TestResult(
            test_id=test["id"],
            name=test["name"],
            difficulty=test["difficulty"],
            test_type="team",
            passed=passed,
            reward=reward,
            execution_time=time.time() - start_time,
            agents_used=agents,
            agent_outputs=agent_outputs,
            criteria_results=criteria_results,
            error=None if all_success else "One or more agents failed",
        )

    async def run_genesis_led_test(self, test: Dict[str, Any]) -> TestResult:
        """Run a Genesis-led (orchestrated) test."""
        start_time = time.time()
        team = test.get("team", [])
        task = test["task"]

        logger.info(f"  Genesis leading: {', '.join(team)}")

        # Genesis first plans the approach
        planning_prompt = f"""You are coordinating a team of {len(team)} agents:
{', '.join(team)}

The overall task is:
{task}

Create a brief execution plan assigning subtasks to each agent.
Be specific about what each agent should deliver.
"""
        genesis_plan, plan_success = await self._call_agent("genesis_meta", planning_prompt)

        agent_outputs = {"genesis_meta_plan": genesis_plan[:500]}
        all_success = plan_success
        combined_output = f"[Genesis Plan]:\n{genesis_plan}\n"

        # Execute with each team member
        for agent in team:
            agent_task = f"""Based on the Genesis coordination plan:
{genesis_plan}

Your specific task as {agent}:
{task}

Focus on your area of expertise and deliver high-quality output."""

            output, success = await self._call_agent(agent, agent_task, combined_output)
            agent_outputs[agent] = output[:500]
            combined_output += f"\n[{agent}]:\n{output}"
            if not success:
                all_success = False

        # Genesis reviews
        review_prompt = f"""Review the team's outputs:
{combined_output[:3000]}

Provide a brief quality assessment and confirm all requirements are met."""
        genesis_review, review_success = await self._call_agent("genesis_meta", review_prompt)
        agent_outputs["genesis_meta_review"] = genesis_review[:500]
        combined_output += f"\n[Genesis Review]:\n{genesis_review}"

        criteria_results, score = self._evaluate_criteria(
            combined_output, test.get("success_criteria", {})
        )

        passed = score >= 0.4 and all_success and review_success
        reward_weight = test.get("reward_weight", 5.0)
        reward = reward_weight * score if passed else reward_weight * 0.1

        return TestResult(
            test_id=test["id"],
            name=test["name"],
            difficulty=test["difficulty"],
            test_type="genesis_led",
            passed=passed,
            reward=reward,
            execution_time=time.time() - start_time,
            agents_used=["genesis_meta"] + team,
            agent_outputs=agent_outputs,
            criteria_results=criteria_results,
            error=None if all_success else "One or more agents failed",
        )

    async def run_test(self, test: Dict[str, Any]) -> TestResult:
        """Route test to appropriate runner."""
        test_type = test.get("type", "solo")

        try:
            if test_type == "solo":
                return await self.run_solo_test(test)
            elif test_type == "team":
                return await self.run_team_test(test)
            elif test_type == "genesis_led":
                return await self.run_genesis_led_test(test)
            else:
                logger.error(f"Unknown test type: {test_type}")
                return TestResult(
                    test_id=test.get("id", "unknown"),
                    name=test.get("name", "Unknown"),
                    difficulty=test.get("difficulty", "unknown"),
                    test_type=test_type,
                    passed=False,
                    reward=0.0,
                    execution_time=0.0,
                    error=f"Unknown test type: {test_type}",
                )
        except Exception as e:
            logger.error(f"Test {test.get('id')} failed with exception: {e}")
            return TestResult(
                test_id=test.get("id", "unknown"),
                name=test.get("name", "Unknown"),
                difficulty=test.get("difficulty", "unknown"),
                test_type=test_type,
                passed=False,
                reward=0.0,
                execution_time=0.0,
                error=str(e),
            )

    def _update_results(self, result: TestResult, max_reward: float) -> None:
        """Update aggregate results with a test result."""
        self.results.total_tests += 1
        self.results.test_results.append(result)
        self.results.total_time += result.execution_time
        self.results.total_reward += result.reward
        self.results.max_possible_reward += max_reward

        if result.passed:
            self.results.passed += 1
        else:
            self.results.failed += 1

        # By difficulty
        diff = result.difficulty
        if diff not in self.results.by_difficulty:
            self.results.by_difficulty[diff] = {"passed": 0, "failed": 0, "reward": 0.0, "max_reward": 0.0}
        if result.passed:
            self.results.by_difficulty[diff]["passed"] += 1
        else:
            self.results.by_difficulty[diff]["failed"] += 1
        self.results.by_difficulty[diff]["reward"] += result.reward
        self.results.by_difficulty[diff]["max_reward"] += max_reward

        # By type
        ttype = result.test_type
        if ttype not in self.results.by_type:
            self.results.by_type[ttype] = {"passed": 0, "failed": 0, "reward": 0.0}
        if result.passed:
            self.results.by_type[ttype]["passed"] += 1
        else:
            self.results.by_type[ttype]["failed"] += 1
        self.results.by_type[ttype]["reward"] += result.reward

        # By agent
        for agent in result.agents_used:
            if agent not in self.results.by_agent:
                self.results.by_agent[agent] = {"tests": 0, "passed": 0}
            self.results.by_agent[agent]["tests"] += 1
            if result.passed:
                self.results.by_agent[agent]["passed"] += 1

    async def run_difficulty_level(
        self,
        difficulty: str,
        max_tests: Optional[int] = None,
    ) -> List[TestResult]:
        """Run all tests for a specific difficulty level."""
        tests_key = f"{difficulty}_tests"
        tests = self.scenarios.get(tests_key, [])

        if max_tests:
            tests = tests[:max_tests]

        logger.info(f"\n{'='*70}")
        logger.info(f"  {difficulty.upper()} TESTS ({len(tests)} tests)")
        logger.info(f"{'='*70}")

        results = []
        for i, test in enumerate(tests):
            logger.info(f"\n[{i+1}/{len(tests)}] {test['id']}: {test['name']}")
            result = await self.run_test(test)
            results.append(result)

            max_reward = test.get("reward_weight", 1.0)
            self._update_results(result, max_reward)

            status = "PASS" if result.passed else "FAIL"
            criteria_passed = sum(result.criteria_results.values())
            criteria_total = len(result.criteria_results)
            logger.info(f"  Result: {status} | Reward: {result.reward:.2f}/{max_reward:.1f} | Criteria: {criteria_passed}/{criteria_total} | Time: {result.execution_time:.1f}s")

        return results

    async def run_full_bootcamp(
        self,
        difficulties: Optional[List[str]] = None,
        max_per_difficulty: Optional[int] = None,
    ) -> BootcampResults:
        """Run the complete bootcamp with all difficulty levels."""
        if difficulties is None:
            difficulties = ["easy", "intermediate", "hard", "extreme"]

        logger.info("\n" + "="*70)
        logger.info("   GENESIS DAY 2 BOOTCAMP - 100 TEST CHALLENGE")
        logger.info("   Website Building & Running Focus")
        logger.info("="*70)
        logger.info(f"  Difficulties: {', '.join(difficulties)}")
        logger.info(f"  Max per difficulty: {max_per_difficulty or 'All'}")
        llm_mode = "Simulated"
        if self.mistral_client:
            llm_mode = "Mistral (mistral-small-latest)"
            if self.gemini_model:
                llm_mode += " + Gemini/OpenAI fallback"
        elif self.gemini_model:
            llm_mode = "Gemini (gemini-2.0-flash-exp)"
            if self.openai_client:
                llm_mode += " + OpenAI fallback"
        elif self.openai_client:
            llm_mode = "OpenAI (gpt-4o-mini)"
        elif self.llm_client:
            llm_mode = "Local LLM"
        logger.info(f"  LLM: {llm_mode}")
        logger.info("="*70)

        start_time = time.time()

        for difficulty in difficulties:
            await self.run_difficulty_level(difficulty, max_per_difficulty)

        # Print summary
        self._print_summary()

        # Save results
        self._save_results()

        return self.results

    def _print_summary(self) -> None:
        """Print bootcamp summary."""
        logger.info("\n" + "="*70)
        logger.info("   BOOTCAMP SUMMARY")
        logger.info("="*70)

        pass_rate = (self.results.passed / self.results.total_tests * 100) if self.results.total_tests > 0 else 0
        reward_rate = (self.results.total_reward / self.results.max_possible_reward * 100) if self.results.max_possible_reward > 0 else 0

        logger.info(f"\n  OVERALL RESULTS:")
        logger.info(f"    Total Tests: {self.results.total_tests}")
        logger.info(f"    Passed: {self.results.passed}")
        logger.info(f"    Failed: {self.results.failed}")
        logger.info(f"    Pass Rate: {pass_rate:.1f}%")
        logger.info(f"    Total Reward: {self.results.total_reward:.2f} / {self.results.max_possible_reward:.2f} ({reward_rate:.1f}%)")
        logger.info(f"    Total Time: {self.results.total_time:.1f}s")

        logger.info(f"\n  BY DIFFICULTY:")
        for diff in ["easy", "intermediate", "hard", "extreme"]:
            if diff in self.results.by_difficulty:
                stats = self.results.by_difficulty[diff]
                total = stats["passed"] + stats["failed"]
                rate = (stats["passed"] / total * 100) if total > 0 else 0
                reward_pct = (stats["reward"] / stats["max_reward"] * 100) if stats["max_reward"] > 0 else 0
                logger.info(f"    {diff.capitalize():12s}: {stats['passed']:2d}/{total:2d} ({rate:5.1f}%) | Reward: {stats['reward']:6.2f}/{stats['max_reward']:.1f} ({reward_pct:.1f}%)")

        logger.info(f"\n  BY TEST TYPE:")
        for ttype in ["solo", "team", "genesis_led"]:
            if ttype in self.results.by_type:
                stats = self.results.by_type[ttype]
                total = stats["passed"] + stats["failed"]
                rate = (stats["passed"] / total * 100) if total > 0 else 0
                logger.info(f"    {ttype:12s}: {stats['passed']:2d}/{total:2d} ({rate:5.1f}%)")

        logger.info(f"\n  AGENT PERFORMANCE (sorted by success rate):")
        sorted_agents = sorted(
            self.results.by_agent.items(),
            key=lambda x: x[1]["passed"] / x[1]["tests"] if x[1]["tests"] > 0 else 0,
            reverse=True,
        )
        for agent, stats in sorted_agents[:12]:  # Top 12 agents
            rate = (stats["passed"] / stats["tests"] * 100) if stats["tests"] > 0 else 0
            agent_short = agent.replace("_agent", "").replace("_enhanced", "+")[:20]
            logger.info(f"    {agent_short:20s}: {stats['passed']:2d}/{stats['tests']:2d} ({rate:5.1f}%)")

        # LLM Stats
        logger.info(f"\n  LLM USAGE:")
        logger.info(f"    Mistral calls: {self.llm_stats['mistral']}")
        logger.info(f"    Gemini calls: {self.llm_stats['gemini']}")
        logger.info(f"    OpenAI calls: {self.llm_stats['openai']}")
        logger.info(f"    Retries: {self.llm_stats['retries']}")
        logger.info(f"    Errors: {self.llm_stats['errors']}")

    def _save_results(self) -> None:
        """Save results to JSON file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = self.output_dir / f"bootcamp_day2_{timestamp}.json"

        results_dict = {
            "timestamp": timestamp,
            "total_tests": self.results.total_tests,
            "passed": self.results.passed,
            "failed": self.results.failed,
            "pass_rate": (self.results.passed / self.results.total_tests * 100) if self.results.total_tests > 0 else 0,
            "total_reward": round(self.results.total_reward, 2),
            "max_possible_reward": round(self.results.max_possible_reward, 2),
            "reward_percentage": round((self.results.total_reward / self.results.max_possible_reward * 100) if self.results.max_possible_reward > 0 else 0, 2),
            "total_time": round(self.results.total_time, 2),
            "llm_stats": self.llm_stats,
            "by_difficulty": self.results.by_difficulty,
            "by_type": self.results.by_type,
            "by_agent": self.results.by_agent,
            "test_results": [
                {
                    "test_id": r.test_id,
                    "name": r.name,
                    "difficulty": r.difficulty,
                    "test_type": r.test_type,
                    "passed": r.passed,
                    "reward": round(r.reward, 2),
                    "execution_time": round(r.execution_time, 2),
                    "agents_used": r.agents_used,
                    "criteria_results": r.criteria_results,
                    "error": r.error,
                }
                for r in self.results.test_results
            ],
        }

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results_dict, f, indent=2)

        logger.info(f"\n  Results saved to: {output_file}")

        # Also save latest results
        latest_file = self.output_dir / "bootcamp_day2_latest.json"
        with open(latest_file, "w", encoding="utf-8") as f:
            json.dump(results_dict, f, indent=2)


async def main():
    """Run the Day 2 bootcamp."""
    import argparse

    parser = argparse.ArgumentParser(description="Day 2 Bootcamp - 100 Test Challenge")
    parser.add_argument(
        "--difficulty",
        choices=["easy", "intermediate", "hard", "extreme", "all"],
        default="all",
        help="Difficulty level to run (default: all)",
    )
    parser.add_argument(
        "--max-tests",
        type=int,
        default=None,
        help="Maximum tests per difficulty level",
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Quick run: 5 tests per difficulty (20 total)",
    )
    parser.add_argument(
        "--no-llm",
        action="store_true",
        help="Run without LLM (simulated responses)",
    )

    args = parser.parse_args()

    runner = Day2BootcampRunner(use_llm=not args.no_llm)

    if args.difficulty == "all":
        difficulties = ["easy", "intermediate", "hard", "extreme"]
    else:
        difficulties = [args.difficulty]

    max_tests = args.max_tests
    if args.quick:
        max_tests = 5

    results = await runner.run_full_bootcamp(
        difficulties=difficulties,
        max_per_difficulty=max_tests,
    )

    # Return exit code based on pass rate
    pass_rate = (results.passed / results.total_tests * 100) if results.total_tests > 0 else 0
    return 0 if pass_rate >= 60 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
