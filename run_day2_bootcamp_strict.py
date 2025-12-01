"""
Day 2 Bootcamp Runner - STRICT VERSION
Rigorous evaluation with no stubs, no inflated scores.

Key differences from original:
1. NO stub/simulated responses - LLM required
2. Strict criteria evaluation - must actually contain required elements
3. Higher pass thresholds (80%+ criteria match)
4. No partial credit for failures
5. Actual code/output validation where possible
"""

import asyncio
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml

# LLM clients
try:
    from mistralai import Mistral
    MISTRAL_AVAILABLE = True
except ImportError:
    MISTRAL_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("bootcamp_strict")


@dataclass
class TestResult:
    test_id: str
    name: str
    difficulty: str
    test_type: str
    passed: bool
    reward: float
    max_reward: float
    execution_time: float
    agents_used: List[str] = field(default_factory=list)
    criteria_results: Dict[str, bool] = field(default_factory=dict)
    criteria_details: Dict[str, str] = field(default_factory=dict)
    output_sample: str = ""
    error: Optional[str] = None


@dataclass
class BootcampResults:
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    total_reward: float = 0.0
    max_possible_reward: float = 0.0
    by_difficulty: Dict[str, Dict] = field(default_factory=dict)
    by_agent: Dict[str, Dict] = field(default_factory=dict)
    test_results: List[TestResult] = field(default_factory=list)
    llm_stats: Dict[str, int] = field(default_factory=lambda: {"calls": 0, "errors": 0})


class StrictEvaluator:
    """Strict evaluation of agent outputs."""

    @staticmethod
    def check_html_structure(output: str, required_tags: List[str]) -> Tuple[bool, str]:
        """Check if output contains valid HTML with required tags."""
        output_lower = output.lower()
        missing = []
        for tag in required_tags:
            # Check for opening tag
            if f"<{tag.lower()}" not in output_lower and f"<{tag.lower()}>" not in output_lower:
                missing.append(tag)

        if missing:
            return False, f"Missing HTML tags: {missing}"
        return True, "All required HTML tags present"

    @staticmethod
    def check_css_properties(output: str, required_props: List[str]) -> Tuple[bool, str]:
        """Check if CSS contains required properties."""
        output_lower = output.lower()
        missing = []
        for prop in required_props:
            if prop.lower() not in output_lower:
                missing.append(prop)

        if missing:
            return False, f"Missing CSS properties: {missing}"
        return True, "All required CSS properties present"

    @staticmethod
    def check_code_patterns(output: str, patterns: List[str]) -> Tuple[bool, str]:
        """Check if output contains required code patterns (regex)."""
        missing = []
        for pattern in patterns:
            if not re.search(pattern, output, re.IGNORECASE | re.MULTILINE):
                missing.append(pattern)

        if missing:
            return False, f"Missing patterns: {missing[:3]}..."  # Truncate for readability
        return True, "All required patterns found"

    @staticmethod
    def check_minimum_length(output: str, min_chars: int, min_lines: int) -> Tuple[bool, str]:
        """Check minimum output length."""
        char_count = len(output)
        line_count = output.count('\n') + 1

        issues = []
        if char_count < min_chars:
            issues.append(f"Too short: {char_count} chars (need {min_chars})")
        if line_count < min_lines:
            issues.append(f"Too few lines: {line_count} (need {min_lines})")

        if issues:
            return False, "; ".join(issues)
        return True, f"Length OK: {char_count} chars, {line_count} lines"

    @staticmethod
    def check_no_placeholder_text(output: str) -> Tuple[bool, str]:
        """Check that output doesn't contain obvious placeholder text."""
        placeholders = [
            r'\bTODO\b', r'\bFIXME\b', r'\bXXX\b',
            r'lorem ipsum', r'placeholder', r'example\.com',
            r'\.\.\.$', r'etc\.?\s*$', r'and so on',
            r'insert .* here', r'your .* here',
        ]

        found = []
        for p in placeholders:
            if re.search(p, output, re.IGNORECASE):
                found.append(p)

        if found:
            return False, f"Contains placeholders: {found[:3]}"
        return True, "No placeholder text detected"

    @staticmethod
    def check_json_valid(output: str) -> Tuple[bool, str]:
        """Check if output contains valid JSON."""
        # Try to find JSON in the output
        json_match = re.search(r'\{[\s\S]*\}|\[[\s\S]*\]', output)
        if not json_match:
            return False, "No JSON structure found"

        try:
            json.loads(json_match.group())
            return True, "Valid JSON found"
        except json.JSONDecodeError as e:
            return False, f"Invalid JSON: {str(e)[:50]}"

    @staticmethod
    def check_specific_content(output: str, must_contain: List[str], case_sensitive: bool = False) -> Tuple[bool, str]:
        """Check if output contains specific required content."""
        check_output = output if case_sensitive else output.lower()
        missing = []

        for item in must_contain:
            check_item = item if case_sensitive else item.lower()
            if check_item not in check_output:
                missing.append(item)

        if missing:
            return False, f"Missing required content: {missing}"
        return True, "All required content present"


class StrictBootcampRunner:
    """Strict bootcamp test runner - no fake passes."""

    # Strict test scenarios with real validation
    STRICT_TESTS = {
        "easy": [
            {
                "id": "SE01",
                "name": "Create HTML Contact Form",
                "agent": "builder_agent_enhanced",
                "task": """Create a complete HTML contact form with the following requirements:
1. Form fields: name (text), email (email type), subject (text), message (textarea)
2. All fields must have proper labels with 'for' attributes
3. All fields must have 'required' attribute
4. Include a submit button
5. Add basic CSS styling (flexbox or grid layout)
6. Form must have action and method attributes""",
                "validation": {
                    "html_tags": ["form", "input", "label", "textarea", "button"],
                    "patterns": [
                        r'type=["\']email["\']',
                        r'required',
                        r'for=["\'][^"\']+["\']',
                        r'action=["\']',
                        r'method=["\']',
                    ],
                    "min_chars": 500,
                    "min_lines": 20,
                },
                "reward": 1.0,
            },
            {
                "id": "SE02",
                "name": "Create Responsive Navigation",
                "agent": "builder_agent_enhanced",
                "task": """Create a responsive navigation bar with:
1. Logo/brand on the left
2. Navigation links (Home, About, Services, Contact)
3. Hamburger menu icon for mobile (hidden on desktop)
4. CSS media query for mobile breakpoint (max-width: 768px)
5. Flexbox layout
6. Hover effects on links""",
                "validation": {
                    "html_tags": ["nav", "a", "ul", "li"],
                    "css_props": ["display: flex", "@media", "768px"],
                    "patterns": [
                        r'href=["\']#?[^"\']*["\']',
                        r':hover',
                    ],
                    "min_chars": 400,
                    "min_lines": 25,
                },
                "reward": 1.0,
            },
            {
                "id": "SE03",
                "name": "Create Pricing Card Component",
                "agent": "builder_agent_enhanced",
                "task": """Create a pricing card component with:
1. Plan name header
2. Price with currency symbol and billing period
3. Feature list (at least 5 items) with checkmarks
4. Call-to-action button
5. "Most Popular" badge/ribbon option
6. Hover effect (shadow or transform)
7. Responsive design""",
                "validation": {
                    "html_tags": ["div", "h2", "ul", "li", "button"],
                    "patterns": [
                        r'\$\d+',  # Price with dollar sign
                        r'month|year|annual',
                        r':hover',
                    ],
                    "must_contain": ["feature", "plan", "button"],
                    "min_chars": 400,
                    "min_lines": 30,
                },
                "reward": 1.0,
            },
            {
                "id": "SE04",
                "name": "Write Jest Unit Tests",
                "agent": "qa_agent",
                "task": """Write Jest unit tests for an email validation function with these test cases:
1. Valid email (test@example.com) - should return true
2. Email without @ symbol - should return false
3. Email without domain - should return false
4. Email with multiple @ symbols - should return false
5. Empty string - should return false
6. Email with special characters (test+tag@example.com) - should return true
7. Email with subdomain (test@mail.example.com) - should return true

Include proper describe blocks, test descriptions, and expect assertions.""",
                "validation": {
                    "patterns": [
                        r'describe\s*\(',
                        r'(test|it)\s*\(',
                        r'expect\s*\(',
                        r'\.(toBe|toEqual|toBeTruthy|toBeFalsy)',
                        r'@',  # Testing email
                    ],
                    "must_contain": ["true", "false"],
                    "min_chars": 500,
                    "min_lines": 25,
                },
                "reward": 1.0,
            },
            {
                "id": "SE05",
                "name": "Create SEO Meta Tags",
                "agent": "seo_agent",
                "task": """Create complete SEO meta tags for a SaaS project management tool homepage:
1. Title tag (50-60 characters, include primary keyword)
2. Meta description (150-160 characters, include CTA)
3. Open Graph tags (og:title, og:description, og:image, og:url, og:type)
4. Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
5. Canonical URL
6. Robots meta tag
7. Schema.org JSON-LD for SoftwareApplication""",
                "validation": {
                    "html_tags": ["title", "meta", "script"],
                    "patterns": [
                        r'og:title',
                        r'og:description',
                        r'twitter:card',
                        r'canonical',
                        r'application/ld\+json',
                        r'@context.*schema\.org',
                    ],
                    "min_chars": 800,
                    "min_lines": 20,
                },
                "reward": 1.0,
            },
        ],
        "intermediate": [
            {
                "id": "SI01",
                "name": "Build Complete Landing Page",
                "agents": ["builder_agent_enhanced", "seo_agent"],
                "task": """Create a complete landing page for a fitness app with:

BUILDER requirements:
1. Hero section with headline, subheadline, CTA button, and hero image placeholder
2. Features section with 3 feature cards (icon placeholder, title, description)
3. Testimonials section with 2 testimonial cards (avatar, quote, name, role)
4. Pricing section with 3 pricing tiers
5. Footer with links and copyright
6. Fully responsive (mobile-first CSS)
7. CSS animations on scroll or hover

SEO requirements:
1. Complete meta tags
2. Semantic HTML (header, main, section, footer)
3. Alt text placeholders for images
4. Schema.org markup""",
                "validation": {
                    "html_tags": ["header", "main", "section", "footer", "h1", "h2", "button"],
                    "css_props": ["@media", "display: flex", "transition"],
                    "patterns": [
                        r'class=["\'][^"\']*hero[^"\']*["\']',
                        r'class=["\'][^"\']*feature[^"\']*["\']',
                        r'class=["\'][^"\']*testimonial[^"\']*["\']',
                        r'class=["\'][^"\']*pricing[^"\']*["\']',
                        r'alt=["\']',
                    ],
                    "min_chars": 2000,
                    "min_lines": 100,
                },
                "reward": 2.0,
            },
            {
                "id": "SI02",
                "name": "Create REST API Endpoints Spec",
                "agents": ["builder_agent_enhanced", "qa_agent"],
                "task": """Design and document REST API endpoints for a todo list application:

BUILDER requirements - Create Express.js route handlers for:
1. GET /api/todos - list all todos (with pagination: limit, offset)
2. GET /api/todos/:id - get single todo
3. POST /api/todos - create todo (validate: title required, max 200 chars)
4. PUT /api/todos/:id - update todo
5. DELETE /api/todos/:id - delete todo
6. Include error handling middleware
7. Include request validation

QA requirements:
1. Write integration tests for each endpoint
2. Test success and error cases
3. Test validation errors""",
                "validation": {
                    "patterns": [
                        r'(app|router)\.(get|post|put|delete)\s*\(["\']/api/todos',
                        r'req\.(body|params|query)',
                        r'res\.(json|status|send)',
                        r'async|await|Promise',
                        r'(describe|test|it)\s*\(',
                        r'expect\s*\(',
                    ],
                    "must_contain": ["todos", "error", "validation"],
                    "min_chars": 1500,
                    "min_lines": 80,
                },
                "reward": 2.0,
            },
            {
                "id": "SI03",
                "name": "Deployment Configuration",
                "agents": ["deploy_agent", "qa_agent"],
                "task": """Create complete deployment configuration for a Next.js app:

DEPLOY requirements:
1. Dockerfile (multi-stage build, production optimized)
2. docker-compose.yml (app + postgres + redis)
3. GitHub Actions workflow (.github/workflows/deploy.yml):
   - Run on push to main
   - Install dependencies
   - Run tests
   - Build
   - Deploy to production
4. Environment variable handling (.env.example)

QA requirements:
1. Add test step to CI pipeline
2. Add linting step
3. Add build verification""",
                "validation": {
                    "patterns": [
                        r'FROM\s+node',
                        r'COPY|ADD',
                        r'RUN\s+npm',
                        r'services:',
                        r'postgres|postgresql',
                        r'on:\s*\n\s*push:',
                        r'jobs:',
                        r'steps:',
                        r'npm\s+(test|run\s+test)',
                    ],
                    "must_contain": ["dockerfile", "compose", "workflow", "env"],
                    "min_chars": 1200,
                    "min_lines": 60,
                },
                "reward": 2.0,
            },
            {
                "id": "SI04",
                "name": "Error Handling System",
                "agents": ["emergency_error_specialist_agent", "builder_agent_enhanced"],
                "task": """Create a comprehensive error handling system for a Node.js API:

ERROR SPECIALIST requirements:
1. Custom error classes (ValidationError, NotFoundError, AuthError, DatabaseError)
2. Global error handler middleware
3. Error logging with stack traces
4. User-friendly error responses (no stack traces in production)
5. Error codes enum

BUILDER requirements:
1. Implement the error classes in TypeScript
2. Create error handler middleware
3. Example usage in route handlers
4. Circuit breaker pattern for external API calls""",
                "validation": {
                    "patterns": [
                        r'class\s+\w*Error\s+extends\s+(Error|BaseError)',
                        r'(statusCode|status|code)\s*[=:]\s*\d{3}',
                        r'try\s*{',
                        r'catch\s*\(',
                        r'process\.env\.NODE_ENV',
                        r'stack',
                    ],
                    "must_contain": ["validation", "notfound", "middleware", "error"],
                    "min_chars": 1000,
                    "min_lines": 50,
                },
                "reward": 2.0,
            },
            {
                "id": "SI05",
                "name": "User Authentication Flow",
                "agents": ["builder_agent_enhanced", "support_agent"],
                "task": """Create user authentication system documentation and implementation:

BUILDER requirements:
1. Login form component (email, password, remember me, forgot password link)
2. Registration form (name, email, password, confirm password, terms checkbox)
3. Password strength indicator
4. Form validation with error messages
5. JWT token handling (store, refresh, logout)

SUPPORT requirements:
1. User documentation for login process
2. Password requirements explanation
3. Account recovery instructions
4. FAQ section (at least 5 questions)""",
                "validation": {
                    "patterns": [
                        r'type=["\']password["\']',
                        r'type=["\']email["\']',
                        r'(localStorage|sessionStorage|cookie)',
                        r'(jwt|token|bearer)',
                        r'validation|validate',
                    ],
                    "html_tags": ["form", "input", "label"],
                    "must_contain": ["password", "email", "login", "register"],
                    "min_chars": 1500,
                    "min_lines": 70,
                },
                "reward": 2.0,
            },
        ],
        "hard": [
            {
                "id": "SH01",
                "name": "Full E-commerce Product Page",
                "agents": ["builder_agent_enhanced", "seo_agent", "qa_agent", "analyst_agent"],
                "task": """Build a complete e-commerce product detail page:

BUILDER:
1. Product image gallery with thumbnails and zoom
2. Product info (title, price, sale price, rating, reviews count)
3. Variant selector (size, color) with stock status
4. Quantity selector with add to cart button
5. Product description tabs (Description, Specifications, Reviews)
6. Related products carousel
7. Breadcrumb navigation
8. Mobile responsive with touch gestures for gallery

SEO:
1. Product schema markup (JSON-LD)
2. Breadcrumb schema
3. Review schema with aggregate rating

QA:
1. Test add to cart functionality
2. Test variant selection updates price/availability
3. Test image gallery navigation

ANALYST:
1. Conversion optimization recommendations
2. A/B test suggestions for the page""",
                "validation": {
                    "patterns": [
                        r'Product.*schema|@type.*Product',
                        r'(price|Price).*\$?\d+',
                        r'(cart|Cart|addToCart)',
                        r'(variant|size|color)',
                        r'(gallery|carousel|slider)',
                        r'(test|describe|it)\s*\(',
                        r'(conversion|A/B|optimize)',
                    ],
                    "html_tags": ["img", "button", "select", "nav"],
                    "must_contain": ["add to cart", "price", "description", "review"],
                    "min_chars": 3000,
                    "min_lines": 150,
                },
                "reward": 3.0,
            },
            {
                "id": "SH02",
                "name": "Real-time Dashboard",
                "agents": ["builder_agent_enhanced", "deploy_agent", "qa_agent", "analyst_agent"],
                "task": """Create a real-time analytics dashboard:

BUILDER:
1. Dashboard layout with sidebar navigation
2. KPI cards (4 metrics: revenue, users, orders, conversion rate)
3. Line chart for revenue over time (use Chart.js or D3 structure)
4. Bar chart for top products
5. Real-time updates using WebSocket connection
6. Date range picker for filtering
7. Export to CSV functionality
8. Dark mode toggle

DEPLOY:
1. WebSocket server setup
2. Redis for real-time data caching
3. Docker configuration

QA:
1. Test WebSocket connection/reconnection
2. Test data updates in real-time
3. Test date filtering

ANALYST:
1. Define KPI calculations
2. Dashboard metric recommendations""",
                "validation": {
                    "patterns": [
                        r'WebSocket|socket\.io|ws://',
                        r'(Chart|chart|graph|d3)',
                        r'(redis|Redis)',
                        r'(export|CSV|download)',
                        r'(dark.*mode|theme)',
                        r'(KPI|metric|revenue|conversion)',
                    ],
                    "must_contain": ["websocket", "chart", "dashboard", "real-time"],
                    "min_chars": 2500,
                    "min_lines": 120,
                },
                "reward": 3.0,
            },
            {
                "id": "SH03",
                "name": "Multi-step Form Wizard",
                "agents": ["builder_agent_enhanced", "qa_agent", "support_agent", "onboarding_agent"],
                "task": """Create a multi-step form wizard for user onboarding:

BUILDER:
1. Step indicator showing progress (Step 1 of 4)
2. Step 1: Personal Info (name, email, phone)
3. Step 2: Company Info (company name, size, industry dropdown)
4. Step 3: Preferences (checkboxes for features, notification settings)
5. Step 4: Review & Confirm (summary of all inputs)
6. Previous/Next navigation with validation per step
7. Save progress to localStorage
8. Animated transitions between steps
9. Form state management

QA:
1. Test each step validation
2. Test navigation (prev/next)
3. Test localStorage persistence
4. Test form submission

SUPPORT:
1. Help tooltips for each field
2. FAQ for common issues

ONBOARDING:
1. Welcome message copy
2. Step descriptions
3. Completion celebration message""",
                "validation": {
                    "patterns": [
                        r'step|Step',
                        r'(prev|next|back|continue)',
                        r'localStorage\.(get|set)Item',
                        r'validation|validate|isValid',
                        r'(transition|animation|animate)',
                        r'(test|describe|it)\s*\(',
                    ],
                    "must_contain": ["step", "form", "validation", "submit"],
                    "min_chars": 2500,
                    "min_lines": 120,
                },
                "reward": 3.0,
            },
            {
                "id": "SH04",
                "name": "Payment Integration",
                "agents": ["builder_agent_enhanced", "billing_agent", "qa_agent", "support_agent"],
                "task": """Implement Stripe payment integration:

BUILDER:
1. Checkout form with card element (Stripe Elements)
2. Order summary sidebar
3. Billing address form
4. Payment processing with loading states
5. Success/Error handling with appropriate UI feedback
6. Save card for future payments option
7. Promo code input

BILLING:
1. Stripe integration code (client + server)
2. Webhook handler for payment events
3. Invoice generation
4. Subscription handling for recurring payments

QA:
1. Test successful payment flow
2. Test declined card scenarios
3. Test webhook handling

SUPPORT:
1. Payment FAQ
2. Refund policy documentation
3. Troubleshooting guide""",
                "validation": {
                    "patterns": [
                        r'stripe|Stripe',
                        r'(payment|Payment)',
                        r'(card|Card)',
                        r'webhook',
                        r'(invoice|Invoice)',
                        r'(subscription|recurring)',
                    ],
                    "must_contain": ["stripe", "payment", "card", "checkout"],
                    "min_chars": 2500,
                    "min_lines": 100,
                },
                "reward": 3.0,
            },
            {
                "id": "SH05",
                "name": "Search with Filters",
                "agents": ["builder_agent_enhanced", "se_darwin_agent", "qa_agent", "seo_agent"],
                "task": """Build an advanced search interface with filters:

BUILDER:
1. Search input with autocomplete dropdown
2. Filter sidebar (category, price range slider, rating, availability)
3. Results grid with pagination
4. Sort options (relevance, price, rating, date)
5. Active filters display with remove option
6. "No results" state with suggestions
7. Loading skeletons
8. URL state sync (filters in URL params)

SE-DARWIN:
1. Fuzzy search implementation
2. Search ranking algorithm
3. Autocomplete logic with debouncing

QA:
1. Test search returns relevant results
2. Test filter combinations
3. Test URL state persistence

SEO:
1. Search-friendly URLs
2. Pagination SEO (rel prev/next)""",
                "validation": {
                    "patterns": [
                        r'(search|Search)',
                        r'(filter|Filter)',
                        r'(autocomplete|suggestion)',
                        r'(pagination|page)',
                        r'(sort|Sort)',
                        r'(debounce|throttle)',
                        r'(URLSearchParams|query.*param)',
                    ],
                    "must_contain": ["search", "filter", "result", "sort"],
                    "min_chars": 2500,
                    "min_lines": 120,
                },
                "reward": 3.0,
            },
        ],
        "extreme": [
            {
                "id": "SX01",
                "name": "Complete SaaS Application Shell",
                "agents": ["builder_agent_enhanced", "deploy_agent", "qa_agent", "billing_agent", "seo_agent", "support_agent"],
                "task": """Build a complete SaaS application shell:

BUILDER:
1. Authentication pages (login, register, forgot password, reset password)
2. Dashboard layout with sidebar, header, main content area
3. Settings page (profile, notifications, billing, team members)
4. Responsive design for all screen sizes
5. Dark/light theme support
6. Toast notification system
7. Modal system
8. Loading states throughout

DEPLOY:
1. Complete CI/CD pipeline
2. Docker setup with all services
3. Environment configuration
4. Health check endpoints

QA:
1. E2E tests for critical paths (auth, dashboard navigation)
2. Unit tests for utility functions
3. Integration tests for API calls

BILLING:
1. Subscription tiers page
2. Billing history
3. Payment method management
4. Usage tracking

SEO:
1. Marketing pages SEO
2. Dynamic meta tags
3. Sitemap generation

SUPPORT:
1. In-app help center
2. Getting started guide
3. API documentation structure""",
                "validation": {
                    "patterns": [
                        r'(login|Login|auth|Auth)',
                        r'(dashboard|Dashboard)',
                        r'(subscription|billing|Billing)',
                        r'(dark.*mode|theme)',
                        r'(toast|notification|Notification)',
                        r'(modal|Modal|dialog)',
                        r'Dockerfile|docker-compose',
                        r'(test|describe|it)\s*\(',
                        r'(sitemap|robots)',
                    ],
                    "must_contain": ["login", "dashboard", "settings", "subscription", "deploy"],
                    "min_chars": 5000,
                    "min_lines": 250,
                },
                "reward": 5.0,
            },
            {
                "id": "SX02",
                "name": "API Gateway with Rate Limiting",
                "agents": ["builder_agent_enhanced", "deploy_agent", "qa_agent", "emergency_error_specialist_agent", "analyst_agent"],
                "task": """Build an API gateway with advanced features:

BUILDER:
1. Express/Fastify API gateway
2. Route proxying to microservices
3. Request/response transformation
4. API versioning (v1, v2)
5. Request validation middleware
6. Response caching layer

DEPLOY:
1. Kubernetes deployment manifests
2. Service mesh configuration
3. Horizontal pod autoscaling
4. Health and readiness probes

QA:
1. Load testing script
2. Rate limit testing
3. Cache hit/miss testing

ERROR SPECIALIST:
1. Rate limiting implementation (token bucket)
2. Circuit breaker for downstream services
3. Retry logic with exponential backoff
4. Error aggregation and alerting

ANALYST:
1. API usage metrics to track
2. Performance benchmarks
3. Cost optimization recommendations""",
                "validation": {
                    "patterns": [
                        r'(gateway|proxy|route)',
                        r'(rate.*limit|rateLimit|throttle)',
                        r'(circuit.*breaker|CircuitBreaker)',
                        r'(cache|Cache|redis)',
                        r'(kubernetes|k8s|deployment)',
                        r'(retry|backoff|exponential)',
                        r'(metric|analytics|monitoring)',
                    ],
                    "must_contain": ["rate limit", "circuit breaker", "cache", "kubernetes"],
                    "min_chars": 4000,
                    "min_lines": 200,
                },
                "reward": 5.0,
            },
            {
                "id": "SX03",
                "name": "Real-time Collaboration System",
                "agents": ["builder_agent_enhanced", "deploy_agent", "qa_agent", "se_darwin_agent", "support_agent"],
                "task": """Build a real-time collaborative document editor:

BUILDER:
1. Rich text editor with formatting (bold, italic, lists, headings)
2. Real-time cursor positions for multiple users
3. User presence indicators (who's online, who's typing)
4. Document history with undo/redo
5. Comments and mentions (@user)
6. Share dialog with permission levels (view, edit, admin)
7. Offline support with sync on reconnect

DEPLOY:
1. WebSocket server with rooms
2. Operational transformation or CRDT for conflict resolution
3. Redis pub/sub for scaling
4. S3/storage for document persistence

QA:
1. Test concurrent editing
2. Test conflict resolution
3. Test offline/online sync

SE-DARWIN:
1. Document search within content
2. Version comparison diff view

SUPPORT:
1. Collaboration guide
2. Keyboard shortcuts reference
3. Troubleshooting connection issues""",
                "validation": {
                    "patterns": [
                        r'(websocket|WebSocket|socket\.io)',
                        r'(cursor|presence|typing)',
                        r'(CRDT|OT|operational.*transform|conflict)',
                        r'(offline|sync|reconnect)',
                        r'(comment|mention|@)',
                        r'(permission|share|collaborate)',
                        r'(rich.*text|editor|contenteditable)',
                    ],
                    "must_contain": ["real-time", "cursor", "collaboration", "sync"],
                    "min_chars": 4500,
                    "min_lines": 220,
                },
                "reward": 5.0,
            },
            {
                "id": "SX04",
                "name": "Notification System",
                "agents": ["builder_agent_enhanced", "deploy_agent", "qa_agent", "marketing_agent", "support_agent"],
                "task": """Build a comprehensive notification system:

BUILDER:
1. Notification center UI (bell icon with unread count, dropdown)
2. Notification types (info, success, warning, error, action required)
3. In-app notifications with actions (mark read, dismiss, snooze)
4. Push notification support (web push API)
5. Email notification preferences
6. Notification grouping and batching
7. Do not disturb mode

DEPLOY:
1. Notification service architecture
2. Message queue (RabbitMQ/SQS) setup
3. Push notification server (FCM/APNS)
4. Email service integration (SendGrid/SES)

QA:
1. Test notification delivery
2. Test preference enforcement
3. Test batching logic

MARKETING:
1. Notification copy templates
2. Engagement best practices
3. A/B test recommendations for notifications

SUPPORT:
1. Notification settings documentation
2. Troubleshooting push notifications
3. Email deliverability guide""",
                "validation": {
                    "patterns": [
                        r'(notification|Notification)',
                        r'(push|Push|FCM|APNS|web.*push)',
                        r'(email|Email|sendgrid|SES)',
                        r'(queue|RabbitMQ|SQS)',
                        r'(preference|setting)',
                        r'(batch|group)',
                        r'(unread|read|dismiss)',
                    ],
                    "must_contain": ["notification", "push", "email", "preference"],
                    "min_chars": 4000,
                    "min_lines": 200,
                },
                "reward": 5.0,
            },
            {
                "id": "SX05",
                "name": "Analytics Dashboard with ML Insights",
                "agents": ["builder_agent_enhanced", "analyst_agent", "deploy_agent", "qa_agent", "seo_agent"],
                "task": """Build an analytics dashboard with predictive insights:

BUILDER:
1. Dashboard with multiple chart types (line, bar, pie, funnel)
2. Customizable dashboard (drag-drop widgets)
3. Date range comparison (this period vs last period)
4. Drill-down capabilities on charts
5. Report builder with export (PDF, CSV, Excel)
6. Scheduled report emails
7. Dashboard sharing with public links

ANALYST:
1. KPI definitions and calculations
2. Trend analysis methodology
3. Anomaly detection logic
4. Predictive forecasting approach
5. Cohort analysis
6. Funnel analysis

DEPLOY:
1. Data pipeline architecture
2. Analytics database (ClickHouse/TimescaleDB)
3. Background job processing for reports

QA:
1. Test calculation accuracy
2. Test large dataset performance
3. Test export functionality

SEO:
1. Public dashboard SEO
2. Report page meta tags""",
                "validation": {
                    "patterns": [
                        r'(chart|Chart|graph|visualization)',
                        r'(analytics|Analytics|metric)',
                        r'(dashboard|Dashboard)',
                        r'(forecast|predict|trend|anomaly)',
                        r'(export|PDF|CSV|Excel)',
                        r'(cohort|funnel|segment)',
                        r'(drag.*drop|draggable|widget)',
                    ],
                    "must_contain": ["analytics", "chart", "forecast", "report", "dashboard"],
                    "min_chars": 4500,
                    "min_lines": 220,
                },
                "reward": 5.0,
            },
        ],
    }

    def __init__(self, mistral_key: str = None, gemini_key: str = None, openai_key: str = None):
        self.mistral_client = None
        self.gemini_model = None
        self.openai_client = None
        self.results = BootcampResults()
        self.evaluator = StrictEvaluator()

        # Initialize LLM clients
        mistral_api_key = mistral_key or os.getenv("MISTRAL_API_KEY")
        if MISTRAL_AVAILABLE and mistral_api_key:
            try:
                self.mistral_client = Mistral(api_key=mistral_api_key)
                logger.info("Mistral client initialized")
            except Exception as e:
                logger.error(f"Failed to init Mistral: {e}")

        gemini_api_key = gemini_key or os.getenv("GEMINI_API_KEY")
        if GEMINI_AVAILABLE and gemini_api_key:
            try:
                genai.configure(api_key=gemini_api_key)
                self.gemini_model = genai.GenerativeModel("gemini-2.0-flash-exp")
                logger.info("Gemini client initialized")
            except Exception as e:
                logger.error(f"Failed to init Gemini: {e}")

        openai_api_key = openai_key or os.getenv("OPENAI_API_KEY")
        if OPENAI_AVAILABLE and openai_api_key:
            try:
                self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
                logger.info("OpenAI client initialized")
            except Exception as e:
                logger.error(f"Failed to init OpenAI: {e}")

        if not any([self.mistral_client, self.gemini_model, self.openai_client]):
            raise RuntimeError("No LLM client available. Provide at least one API key.")

    async def call_llm(self, agent: str, task: str, context: str = "") -> Tuple[str, bool]:
        """Call LLM with no fallback to stubs."""
        prompt = f"""You are {agent}, a specialized AI agent.

{f"Context from previous agents:{chr(10)}{context}{chr(10)}{chr(10)}" if context else ""}Task:
{task}

Provide a complete, production-ready response. Include actual code, configurations, or content as appropriate.
Do NOT use placeholder text like "TODO", "example.com", or "insert here".
Be thorough and specific."""

        self.results.llm_stats["calls"] += 1

        # Try Mistral
        if self.mistral_client:
            try:
                response = await asyncio.to_thread(
                    self.mistral_client.chat.complete,
                    model="mistral-small-latest",
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.choices[0].message.content, True
            except Exception as e:
                logger.warning(f"Mistral failed: {e}")

        # Try Gemini
        if self.gemini_model:
            try:
                response = await asyncio.to_thread(
                    self.gemini_model.generate_content,
                    prompt,
                )
                return response.text, True
            except Exception as e:
                logger.warning(f"Gemini failed: {e}")

        # Try OpenAI
        if self.openai_client:
            try:
                response = await self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=4000,
                )
                return response.choices[0].message.content, True
            except Exception as e:
                logger.warning(f"OpenAI failed: {e}")

        self.results.llm_stats["errors"] += 1
        return "", False

    def evaluate_output(self, output: str, validation: Dict) -> Tuple[Dict[str, bool], Dict[str, str], float]:
        """Strictly evaluate output against validation criteria."""
        results = {}
        details = {}

        # Check HTML tags
        if "html_tags" in validation:
            passed, detail = self.evaluator.check_html_structure(output, validation["html_tags"])
            results["html_tags"] = passed
            details["html_tags"] = detail

        # Check CSS properties
        if "css_props" in validation:
            passed, detail = self.evaluator.check_css_properties(output, validation["css_props"])
            results["css_props"] = passed
            details["css_props"] = detail

        # Check code patterns
        if "patterns" in validation:
            passed, detail = self.evaluator.check_code_patterns(output, validation["patterns"])
            results["patterns"] = passed
            details["patterns"] = detail

        # Check minimum length
        if "min_chars" in validation or "min_lines" in validation:
            min_chars = validation.get("min_chars", 0)
            min_lines = validation.get("min_lines", 0)
            passed, detail = self.evaluator.check_minimum_length(output, min_chars, min_lines)
            results["length"] = passed
            details["length"] = detail

        # Check for placeholders (always check)
        passed, detail = self.evaluator.check_no_placeholder_text(output)
        results["no_placeholders"] = passed
        details["no_placeholders"] = detail

        # Check specific content
        if "must_contain" in validation:
            passed, detail = self.evaluator.check_specific_content(output, validation["must_contain"])
            results["must_contain"] = passed
            details["must_contain"] = detail

        # Calculate score - strict: must pass ALL criteria
        total = len(results)
        passed_count = sum(results.values())
        score = passed_count / total if total > 0 else 0.0

        return results, details, score

    async def run_test(self, test: Dict, difficulty: str) -> TestResult:
        """Run a single test with strict evaluation."""
        start = time.time()
        test_id = test["id"]
        name = test["name"]
        task = test["task"]
        validation = test["validation"]
        max_reward = test["reward"]

        # Determine agents
        agents = test.get("agents", [test.get("agent")])
        agents = [a for a in agents if a]  # Remove None

        logger.info(f"\n{'='*60}")
        logger.info(f"Test: {test_id} - {name}")
        logger.info(f"Agents: {', '.join(agents)}")
        logger.info(f"{'='*60}")

        # Execute with each agent
        combined_output = ""
        all_success = True

        for agent in agents:
            output, success = await self.call_llm(agent, task, combined_output)
            if not success:
                all_success = False
                logger.error(f"  {agent}: LLM CALL FAILED")
            else:
                output_preview = output[:200].replace('\n', ' ')
                logger.info(f"  {agent}: {len(output)} chars")
            combined_output += f"\n\n=== {agent} ===\n{output}"

        # Evaluate
        criteria_results, criteria_details, score = self.evaluate_output(combined_output, validation)

        # STRICT: Must pass 80%+ of criteria AND have successful LLM calls
        passed = score >= 0.8 and all_success

        # NO partial credit - either pass or fail
        reward = max_reward if passed else 0.0

        execution_time = time.time() - start

        # Log results
        logger.info(f"\nResults for {test_id}:")
        for criterion, result in criteria_results.items():
            status = "PASS" if result else "FAIL"
            logger.info(f"  [{status}] {criterion}: {criteria_details.get(criterion, '')}")

        logger.info(f"\nScore: {score:.1%} | Passed: {passed} | Reward: {reward}/{max_reward}")

        return TestResult(
            test_id=test_id,
            name=name,
            difficulty=difficulty,
            test_type="solo" if len(agents) == 1 else "team",
            passed=passed,
            reward=reward,
            max_reward=max_reward,
            execution_time=execution_time,
            agents_used=agents,
            criteria_results=criteria_results,
            criteria_details=criteria_details,
            output_sample=combined_output[:1000],
            error=None if all_success else "LLM call failed",
        )

    async def run_difficulty(self, difficulty: str, max_tests: int = None) -> List[TestResult]:
        """Run all tests for a difficulty level."""
        tests = self.STRICT_TESTS.get(difficulty, [])
        if max_tests:
            tests = tests[:max_tests]

        logger.info(f"\n{'#'*70}")
        logger.info(f"  {difficulty.upper()} LEVEL - {len(tests)} tests")
        logger.info(f"{'#'*70}")

        results = []
        for test in tests:
            result = await self.run_test(test, difficulty)
            results.append(result)

            # Update stats
            self.results.total_tests += 1
            self.results.max_possible_reward += result.max_reward
            self.results.total_reward += result.reward

            if result.passed:
                self.results.passed += 1
            else:
                self.results.failed += 1

            # By difficulty
            if difficulty not in self.results.by_difficulty:
                self.results.by_difficulty[difficulty] = {"passed": 0, "failed": 0, "reward": 0, "max": 0}
            if result.passed:
                self.results.by_difficulty[difficulty]["passed"] += 1
            else:
                self.results.by_difficulty[difficulty]["failed"] += 1
            self.results.by_difficulty[difficulty]["reward"] += result.reward
            self.results.by_difficulty[difficulty]["max"] += result.max_reward

            # By agent
            for agent in result.agents_used:
                if agent not in self.results.by_agent:
                    self.results.by_agent[agent] = {"tests": 0, "passed": 0}
                self.results.by_agent[agent]["tests"] += 1
                if result.passed:
                    self.results.by_agent[agent]["passed"] += 1

            self.results.test_results.append(result)

        return results

    async def run_bootcamp(self, difficulties: List[str] = None, max_per_difficulty: int = None):
        """Run the complete bootcamp."""
        if difficulties is None:
            difficulties = ["easy", "intermediate", "hard", "extreme"]

        logger.info("\n" + "="*70)
        logger.info("  STRICT DAY 2 BOOTCAMP")
        logger.info("  No stubs. No inflated scores. Real evaluation.")
        logger.info("="*70)

        for diff in difficulties:
            await self.run_difficulty(diff, max_per_difficulty)

        self.print_summary()
        self.save_results()

        return self.results

    def print_summary(self):
        """Print results summary."""
        logger.info("\n" + "="*70)
        logger.info("  BOOTCAMP SUMMARY")
        logger.info("="*70)

        pass_rate = (self.results.passed / self.results.total_tests * 100) if self.results.total_tests > 0 else 0
        reward_rate = (self.results.total_reward / self.results.max_possible_reward * 100) if self.results.max_possible_reward > 0 else 0

        logger.info(f"\nOVERALL:")
        logger.info(f"  Tests: {self.results.passed}/{self.results.total_tests} passed ({pass_rate:.1f}%)")
        logger.info(f"  Reward: {self.results.total_reward:.1f}/{self.results.max_possible_reward:.1f} ({reward_rate:.1f}%)")
        logger.info(f"  LLM Calls: {self.results.llm_stats['calls']} (errors: {self.results.llm_stats['errors']})")

        logger.info(f"\nBY DIFFICULTY:")
        for diff in ["easy", "intermediate", "hard", "extreme"]:
            if diff in self.results.by_difficulty:
                stats = self.results.by_difficulty[diff]
                total = stats["passed"] + stats["failed"]
                rate = (stats["passed"] / total * 100) if total > 0 else 0
                logger.info(f"  {diff:12s}: {stats['passed']}/{total} ({rate:5.1f}%) | Reward: {stats['reward']:.1f}/{stats['max']:.1f}")

        logger.info(f"\nBY AGENT:")
        for agent, stats in sorted(self.results.by_agent.items(), key=lambda x: x[1]["passed"]/max(x[1]["tests"],1), reverse=True):
            rate = (stats["passed"] / stats["tests"] * 100) if stats["tests"] > 0 else 0
            logger.info(f"  {agent[:25]:25s}: {stats['passed']}/{stats['tests']} ({rate:5.1f}%)")

    def save_results(self):
        """Save results to file."""
        output_dir = Path("data/bootcamp_results/strict")
        output_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_dir / f"strict_bootcamp_{timestamp}.json"

        results_dict = {
            "timestamp": timestamp,
            "total_tests": self.results.total_tests,
            "passed": self.results.passed,
            "failed": self.results.failed,
            "pass_rate": round((self.results.passed / self.results.total_tests * 100) if self.results.total_tests > 0 else 0, 2),
            "total_reward": self.results.total_reward,
            "max_reward": self.results.max_possible_reward,
            "reward_rate": round((self.results.total_reward / self.results.max_possible_reward * 100) if self.results.max_possible_reward > 0 else 0, 2),
            "llm_stats": self.results.llm_stats,
            "by_difficulty": self.results.by_difficulty,
            "by_agent": self.results.by_agent,
            "test_results": [
                {
                    "test_id": r.test_id,
                    "name": r.name,
                    "difficulty": r.difficulty,
                    "passed": r.passed,
                    "reward": r.reward,
                    "max_reward": r.max_reward,
                    "criteria_results": r.criteria_results,
                    "criteria_details": r.criteria_details,
                    "execution_time": round(r.execution_time, 2),
                    "agents": r.agents_used,
                }
                for r in self.results.test_results
            ],
        }

        with open(output_file, "w") as f:
            json.dump(results_dict, f, indent=2)

        logger.info(f"\nResults saved to: {output_file}")


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Strict Day 2 Bootcamp")
    parser.add_argument("--difficulty", choices=["easy", "intermediate", "hard", "extreme", "all"], default="all")
    parser.add_argument("--max-tests", type=int, default=None, help="Max tests per difficulty")
    parser.add_argument("--quick", action="store_true", help="Quick run: 2 tests per difficulty")
    args = parser.parse_args()

    difficulties = ["easy", "intermediate", "hard", "extreme"] if args.difficulty == "all" else [args.difficulty]
    max_tests = 2 if args.quick else args.max_tests

    try:
        runner = StrictBootcampRunner()
        await runner.run_bootcamp(difficulties, max_tests)
    except RuntimeError as e:
        logger.error(f"Cannot run: {e}")
        logger.error("Set MISTRAL_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
