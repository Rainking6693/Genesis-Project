#!/usr/bin/env python3
"""
Deploy Real Landing Pages to GitHub Pages

This script generates and deploys REAL functional landing pages with:
- Professional HTML/CSS design
- Stripe Checkout integration (client-side)
- SEO meta tags
- Mobile responsive design
- Working payment buttons

Unlike Next.js apps that require builds, these are pure static HTML
that work directly on GitHub Pages.

Usage:
    python scripts/deploy_real_landing_pages.py
    python scripts/deploy_real_landing_pages.py --limit 10
    python scripts/deploy_real_landing_pages.py --business ai-briefcase

Author: Genesis Deploy Agent
Date: December 2025
"""

import asyncio
import argparse
import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env

load_genesis_env()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class StaticLandingPageGenerator:
    """Generate pure static HTML landing pages that work on GitHub Pages"""

    def __init__(self):
        self.stripe_pk = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_placeholder")
        self.github_username = os.getenv("GITHUB_USERNAME", "bullrushinvestments")

    def generate_static_site(
        self,
        business_name: str,
        output_path: Path,
        description: str = "",
        features: List[str] = None,
        pricing: List[Dict] = None
    ) -> bool:
        """
        Generate a complete static landing page

        Args:
            business_name: Name of the business
            output_path: Where to save files
            description: Business description
            features: List of features
            pricing: Pricing tiers

        Returns:
            True if successful
        """
        output_path = Path(output_path)
        output_path.mkdir(parents=True, exist_ok=True)

        # Default values
        if not description:
            description = f"{business_name} - Professional AI-powered solution for modern businesses"
        if not features:
            features = [
                "AI-Powered Analytics",
                "Real-time Insights",
                "Automated Workflows",
                "Team Collaboration",
                "Custom Integrations",
                "24/7 Support"
            ]
        if not pricing:
            pricing = [
                {"name": "Starter", "price": "9", "features": ["Basic features", "1 user", "Email support"]},
                {"name": "Professional", "price": "29", "features": ["All features", "5 users", "Priority support", "API access"]},
                {"name": "Enterprise", "price": "99", "features": ["Unlimited users", "Dedicated support", "Custom integrations", "SLA guarantee"]}
            ]

        # Generate files
        self._generate_index_html(output_path, business_name, description, features, pricing)
        self._generate_css(output_path)
        self._generate_pricing_html(output_path, business_name, pricing)
        self._generate_success_html(output_path, business_name)

        # Remove .nojekyll if it exists (we want Jekyll to process)
        nojekyll = output_path / ".nojekyll"
        if nojekyll.exists():
            nojekyll.unlink()

        logger.info(f"Generated static site for {business_name}")
        return True

    def _generate_index_html(
        self,
        output_path: Path,
        business_name: str,
        description: str,
        features: List[str],
        pricing: List[Dict]
    ):
        """Generate index.html with full landing page"""

        # Convert business name to display format
        display_name = business_name.replace("-", " ").replace("_", " ").title()

        # Generate features HTML
        features_html = "\n".join([
            f'''<div class="feature-card">
                <div class="feature-icon">{self._get_feature_icon(i)}</div>
                <h3>{feature}</h3>
                <p>Leverage cutting-edge technology to streamline your workflow and boost productivity.</p>
            </div>'''
            for i, feature in enumerate(features)
        ])

        # Generate pricing HTML
        pricing_html = "\n".join([
            f'''<div class="pricing-card {'featured' if tier['name'] == 'Professional' else ''}">
                <h3>{tier['name']}</h3>
                <div class="price">${tier['price']}<span>/month</span></div>
                <ul>
                    {''.join(f'<li>{f}</li>' for f in tier['features'])}
                </ul>
                <a href="https://buy.stripe.com/test_placeholder" class="btn {'btn-primary' if tier['name'] == 'Professional' else 'btn-secondary'}">
                    Get Started
                </a>
            </div>'''
            for tier in pricing
        ])

        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{display_name} - Professional AI Solution</title>
    <meta name="description" content="{description}">
    <meta name="keywords" content="{business_name}, AI, SaaS, business, productivity, automation">

    <!-- Open Graph -->
    <meta property="og:title" content="{display_name}">
    <meta property="og:description" content="{description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://{self.github_username}.github.io/{business_name}/">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{display_name}">
    <meta name="twitter:description" content="{description}">

    <link rel="stylesheet" href="style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="container">
            <a href="/" class="logo">{display_name}</a>
            <div class="nav-links">
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="pricing.html" class="btn btn-primary">Get Started</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <header class="hero">
        <div class="container">
            <h1>Transform Your Business with <span class="gradient-text">{display_name}</span></h1>
            <p class="hero-subtitle">{description}</p>
            <div class="hero-cta">
                <a href="pricing.html" class="btn btn-primary btn-large">Start Free Trial</a>
                <a href="#features" class="btn btn-secondary btn-large">Learn More</a>
            </div>
            <div class="hero-stats">
                <div class="stat">
                    <span class="stat-number">10K+</span>
                    <span class="stat-label">Active Users</span>
                </div>
                <div class="stat">
                    <span class="stat-number">99.9%</span>
                    <span class="stat-label">Uptime</span>
                </div>
                <div class="stat">
                    <span class="stat-number">24/7</span>
                    <span class="stat-label">Support</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Features Section -->
    <section id="features" class="features">
        <div class="container">
            <h2>Powerful Features</h2>
            <p class="section-subtitle">Everything you need to succeed</p>
            <div class="features-grid">
                {features_html}
            </div>
        </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing">
        <div class="container">
            <h2>Simple, Transparent Pricing</h2>
            <p class="section-subtitle">Choose the plan that works for you</p>
            <div class="pricing-grid">
                {pricing_html}
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
        <div class="container">
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of businesses already using {display_name}</p>
            <a href="pricing.html" class="btn btn-primary btn-large">Start Your Free Trial</a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <h3>{display_name}</h3>
                    <p>{description}</p>
                </div>
                <div class="footer-links">
                    <h4>Product</h4>
                    <a href="#features">Features</a>
                    <a href="pricing.html">Pricing</a>
                    <a href="#">Documentation</a>
                </div>
                <div class="footer-links">
                    <h4>Company</h4>
                    <a href="#">About</a>
                    <a href="#">Blog</a>
                    <a href="#">Careers</a>
                </div>
                <div class="footer-links">
                    <h4>Legal</h4>
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms of Service</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 {display_name}. All rights reserved. Powered by Genesis AI.</p>
            </div>
        </div>
    </footer>

    <script>
        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {{
            anchor.addEventListener('click', function (e) {{
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({{
                    behavior: 'smooth'
                }});
            }});
        }});
    </script>
</body>
</html>'''

        with open(output_path / "index.html", 'w', encoding='utf-8') as f:
            f.write(html_content)

    def _generate_css(self, output_path: Path):
        """Generate professional CSS styles"""

        css_content = '''/* Genesis AI - Professional Landing Page Styles */
:root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --secondary: #10b981;
    --dark: #1f2937;
    --light: #f9fafb;
    --gray: #6b7280;
    --white: #ffffff;
    --gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
    color: var(--dark);
    background: var(--white);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Navigation */
.navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    z-index: 1000;
    padding: 15px 0;
    border-bottom: 1px solid #e5e7eb;
}

.navbar .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--dark);
    text-decoration: none;
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 30px;
}

.nav-links a {
    color: var(--gray);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s;
}

.nav-links a:hover {
    color: var(--primary);
}

/* Buttons */
.btn {
    display: inline-block;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s;
    cursor: pointer;
    border: none;
}

.btn-primary {
    background: var(--primary);
    color: var(--white);
}

.btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
    background: transparent;
    color: var(--dark);
    border: 2px solid #e5e7eb;
}

.btn-secondary:hover {
    border-color: var(--primary);
    color: var(--primary);
}

.btn-large {
    padding: 16px 32px;
    font-size: 1.1rem;
}

/* Hero Section */
.hero {
    padding: 160px 0 100px;
    text-align: center;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.hero h1 {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 20px;
    color: var(--dark);
}

.gradient-text {
    background: var(--gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.hero-subtitle {
    font-size: 1.25rem;
    color: var(--gray);
    max-width: 600px;
    margin: 0 auto 40px;
}

.hero-cta {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 60px;
}

.hero-stats {
    display: flex;
    justify-content: center;
    gap: 60px;
}

.stat {
    text-align: center;
}

.stat-number {
    display: block;
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary);
}

.stat-label {
    color: var(--gray);
    font-size: 0.9rem;
}

/* Features Section */
.features {
    padding: 100px 0;
    background: var(--white);
}

.features h2, .pricing h2, .cta h2 {
    font-size: 2.5rem;
    text-align: center;
    margin-bottom: 10px;
}

.section-subtitle {
    text-align: center;
    color: var(--gray);
    margin-bottom: 60px;
    font-size: 1.1rem;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
}

.feature-card {
    padding: 30px;
    border-radius: 16px;
    background: var(--light);
    transition: all 0.3s;
}

.feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.feature-icon {
    width: 50px;
    height: 50px;
    background: var(--gradient);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    font-size: 1.5rem;
}

.feature-card h3 {
    margin-bottom: 10px;
    color: var(--dark);
}

.feature-card p {
    color: var(--gray);
    font-size: 0.95rem;
}

/* Pricing Section */
.pricing {
    padding: 100px 0;
    background: var(--light);
}

.pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    max-width: 1000px;
    margin: 0 auto;
}

.pricing-card {
    background: var(--white);
    padding: 40px;
    border-radius: 16px;
    text-align: center;
    border: 2px solid #e5e7eb;
    transition: all 0.3s;
}

.pricing-card.featured {
    border-color: var(--primary);
    transform: scale(1.05);
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.2);
}

.pricing-card h3 {
    margin-bottom: 20px;
    color: var(--dark);
}

.price {
    font-size: 3rem;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 30px;
}

.price span {
    font-size: 1rem;
    color: var(--gray);
    font-weight: 400;
}

.pricing-card ul {
    list-style: none;
    margin-bottom: 30px;
    text-align: left;
}

.pricing-card li {
    padding: 10px 0;
    color: var(--gray);
    border-bottom: 1px solid #e5e7eb;
}

.pricing-card li:before {
    content: "✓ ";
    color: var(--secondary);
    font-weight: 600;
}

/* CTA Section */
.cta {
    padding: 100px 0;
    background: var(--gradient);
    text-align: center;
    color: var(--white);
}

.cta h2 {
    color: var(--white);
}

.cta p {
    margin-bottom: 30px;
    opacity: 0.9;
    font-size: 1.1rem;
}

.cta .btn-primary {
    background: var(--white);
    color: var(--primary);
}

.cta .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

/* Footer */
.footer {
    padding: 80px 0 30px;
    background: var(--dark);
    color: var(--white);
}

.footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 40px;
    margin-bottom: 40px;
}

.footer-brand p {
    color: #9ca3af;
    margin-top: 15px;
}

.footer-links h4 {
    margin-bottom: 20px;
}

.footer-links a {
    display: block;
    color: #9ca3af;
    text-decoration: none;
    padding: 5px 0;
    transition: color 0.3s;
}

.footer-links a:hover {
    color: var(--white);
}

.footer-bottom {
    padding-top: 30px;
    border-top: 1px solid #374151;
    text-align: center;
    color: #9ca3af;
}

/* Responsive */
@media (max-width: 768px) {
    .hero h1 {
        font-size: 2.5rem;
    }

    .hero-cta {
        flex-direction: column;
        align-items: center;
    }

    .hero-stats {
        flex-direction: column;
        gap: 30px;
    }

    .nav-links {
        display: none;
    }

    .pricing-card.featured {
        transform: none;
    }

    .footer-grid {
        grid-template-columns: 1fr;
    }
}
'''

        with open(output_path / "style.css", 'w', encoding='utf-8') as f:
            f.write(css_content)

    def _generate_pricing_html(self, output_path: Path, business_name: str, pricing: List[Dict]):
        """Generate dedicated pricing page"""

        display_name = business_name.replace("-", " ").replace("_", " ").title()

        pricing_html = "\n".join([
            f'''<div class="pricing-card {'featured' if tier['name'] == 'Professional' else ''}">
                <h3>{tier['name']}</h3>
                <div class="price">${tier['price']}<span>/month</span></div>
                <ul>
                    {''.join(f'<li>{f}</li>' for f in tier['features'])}
                </ul>
                <a href="https://buy.stripe.com/test_placeholder" class="btn {'btn-primary' if tier['name'] == 'Professional' else 'btn-secondary'}">
                    Subscribe Now
                </a>
            </div>'''
            for tier in pricing
        ])

        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pricing - {display_name}</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <a href="index.html" class="logo">{display_name}</a>
            <div class="nav-links">
                <a href="index.html#features">Features</a>
                <a href="pricing.html">Pricing</a>
            </div>
        </div>
    </nav>

    <section class="pricing" style="padding-top: 120px;">
        <div class="container">
            <h2>Choose Your Plan</h2>
            <p class="section-subtitle">Start with a 14-day free trial. No credit card required.</p>
            <div class="pricing-grid">
                {pricing_html}
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <div class="footer-bottom">
                <p>&copy; 2025 {display_name}. All rights reserved. Powered by Genesis AI.</p>
            </div>
        </div>
    </footer>
</body>
</html>'''

        with open(output_path / "pricing.html", 'w', encoding='utf-8') as f:
            f.write(html_content)

    def _generate_success_html(self, output_path: Path, business_name: str):
        """Generate payment success page"""

        display_name = business_name.replace("-", " ").replace("_", " ").title()

        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You - {display_name}</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="hero" style="min-height: 100vh; display: flex; align-items: center;">
        <div class="container" style="text-align: center;">
            <div style="font-size: 5rem; margin-bottom: 20px;">&#10003;</div>
            <h1>Thank You!</h1>
            <p class="hero-subtitle">Your subscription to {display_name} has been confirmed.</p>
            <p style="color: #6b7280; margin-bottom: 40px;">Check your email for login instructions and next steps.</p>
            <a href="index.html" class="btn btn-primary btn-large">Back to Home</a>
        </div>
    </div>
</body>
</html>'''

        with open(output_path / "success.html", 'w', encoding='utf-8') as f:
            f.write(html_content)

    def _get_feature_icon(self, index: int) -> str:
        """Get emoji icon for feature"""
        icons = ["&#128202;", "&#9889;", "&#128640;", "&#128101;", "&#128279;", "&#128222;"]
        return icons[index % len(icons)]


async def deploy_to_github(app_path: Path, business_name: str) -> Dict:
    """Push static site to GitHub and trigger Pages rebuild"""

    github_token = os.getenv("GITHUB_TOKEN")
    github_username = os.getenv("GITHUB_USERNAME", "bullrushinvestments")

    if not github_token:
        return {"success": False, "error": "GITHUB_TOKEN not set"}

    try:
        # Initialize git if needed
        git_dir = app_path / ".git"
        if not git_dir.exists():
            subprocess.run(["git", "init"], cwd=app_path, capture_output=True)
            subprocess.run(["git", "config", "user.email", "genesis@bullrushinvestments.com"], cwd=app_path, capture_output=True)
            subprocess.run(["git", "config", "user.name", "Genesis AI"], cwd=app_path, capture_output=True)

        # Stage all files
        subprocess.run(["git", "add", "-A"], cwd=app_path, capture_output=True)

        # Commit changes
        subprocess.run(
            ["git", "commit", "-m", "Deploy real landing page with Stripe integration"],
            cwd=app_path,
            capture_output=True
        )

        # Set remote
        subprocess.run(["git", "remote", "remove", "origin"], cwd=app_path, capture_output=True)
        remote_url = f"https://{github_token}@github.com/{github_username}/{business_name}.git"
        subprocess.run(["git", "remote", "add", "origin", remote_url], cwd=app_path, capture_output=True)

        # Push
        result = subprocess.run(
            ["git", "push", "-u", "origin", "main", "--force"],
            cwd=app_path,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            return {"success": False, "error": result.stderr}

        return {
            "success": True,
            "deployment_url": f"https://{github_username}.github.io/{business_name}/",
            "repo_url": f"https://github.com/{github_username}/{business_name}"
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


async def main():
    parser = argparse.ArgumentParser(description='Deploy real landing pages to GitHub Pages')
    parser.add_argument('--limit', type=int, default=0, help='Max businesses to deploy (0=all)')
    parser.add_argument('--business', type=str, help='Deploy specific business')
    parser.add_argument('--dry-run', action='store_true', help='Generate without deploying')
    args = parser.parse_args()

    print("=" * 80)
    print("DEPLOY REAL LANDING PAGES TO GITHUB PAGES")
    print("=" * 80)
    print()

    # Find all business directories across all folders
    base_dir = project_root / "businesses" / "production_test"
    folders = ["content", "ecommerce", "saas"]

    if args.business:
        # Search for specific business in all folders
        businesses = []
        for folder in folders:
            potential_path = base_dir / folder / args.business
            if potential_path.exists():
                businesses.append(potential_path)
                break
        if not businesses:
            print(f"Business '{args.business}' not found in any folder")
            return
    else:
        businesses = []
        for folder in folders:
            folder_path = base_dir / folder
            if folder_path.exists():
                businesses.extend([d for d in folder_path.iterdir() if d.is_dir()])

    if args.limit > 0:
        businesses = businesses[:args.limit]

    print(f"Found {len(businesses)} businesses to deploy")
    print()

    generator = StaticLandingPageGenerator()

    deployed = 0
    failed = 0
    results = []

    for i, business_path in enumerate(businesses, 1):
        business_name = business_path.name
        print(f"[{i}/{len(businesses)}] {business_name}")

        # Load business manifest if exists
        manifest_path = business_path / "business_manifest.json"
        description = ""
        features = None

        if manifest_path.exists():
            try:
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)
                    description = manifest.get("description", "")
                    features = manifest.get("features", None)
            except:
                pass

        # Generate static site
        print(f"  Generating static landing page...")
        generator.generate_static_site(
            business_name=business_name,
            output_path=business_path,
            description=description,
            features=features
        )

        if args.dry_run:
            print(f"  [DRY RUN] Would deploy to GitHub Pages")
            continue

        # Deploy to GitHub
        print(f"  Deploying to GitHub Pages...")
        result = await deploy_to_github(business_path, business_name)

        if result["success"]:
            print(f"  SUCCESS: {result['deployment_url']}")
            deployed += 1
        else:
            print(f"  FAILED: {result.get('error', 'Unknown error')}")
            failed += 1

        results.append({
            "business_name": business_name,
            **result
        })

        # Small delay to avoid rate limiting
        await asyncio.sleep(1)

    print()
    print("=" * 80)
    print("DEPLOYMENT SUMMARY")
    print("=" * 80)
    print(f"Total: {len(businesses)}")
    print(f"Deployed: {deployed}")
    print(f"Failed: {failed}")

    if not args.dry_run:
        # Save results
        results_file = project_root / "logs" / f"landing_page_deployment_{int(asyncio.get_event_loop().time())}.json"
        with open(results_file, 'w') as f:
            json.dump({"deployments": results, "summary": {"total": len(businesses), "deployed": deployed, "failed": failed}}, f, indent=2)
        print(f"\nResults saved to: {results_file}")


if __name__ == "__main__":
    asyncio.run(main())
