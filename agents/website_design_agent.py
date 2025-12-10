"""
WEBSITE DESIGN AGENT - LLM-Powered Unique Website Generator
Version: 1.0
Date: December 2025

This agent uses LLM to generate TRULY UNIQUE websites for each business.
Unlike template-based generators, every site has:
- Unique layout structure
- Unique color schemes based on industry/brand
- Unique copy written for the specific business
- Unique features presentation
- Unique visual elements and icons

The agent can also:
- Analyze existing deployed sites
- Generate improvement recommendations
- Apply iterative enhancements

Author: Genesis Deploy Agent
"""

import asyncio
import hashlib
import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from infrastructure.load_env import load_genesis_env
from infrastructure.standard_integration_mixin import StandardIntegrationMixin

load_genesis_env()

logger = logging.getLogger(__name__)


class WebsiteDesignAgent(StandardIntegrationMixin):
    """
    LLM-powered website design agent that creates truly unique websites.

    Unlike template-based generators, this agent:
    1. Analyzes the business context deeply
    2. Uses LLM to generate unique HTML/CSS
    3. Creates custom copy for each business
    4. Designs unique visual layouts
    5. Can iterate and improve existing sites
    """

    def __init__(self, business_id: str = "default"):
        super().__init__()
        self.business_id = business_id
        self.llm_client = None
        self._initialize_llm()
        logger.info(f"WebsiteDesignAgent initialized for {business_id}")

    def _initialize_llm(self):
        """Initialize LLM client - tries Anthropic first, then OpenAI"""
        self.llm_provider = None

        # Try Anthropic first
        try:
            from anthropic import Anthropic
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                self.llm_client = Anthropic(api_key=api_key)
                self.llm_provider = "anthropic"
                logger.info("WebsiteDesignAgent using Anthropic Claude")
                return
        except ImportError:
            pass

        # Fall back to OpenAI
        try:
            from openai import OpenAI
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.llm_client = OpenAI(api_key=api_key)
                self.llm_provider = "openai"
                logger.info("WebsiteDesignAgent using OpenAI GPT-4")
                return
        except ImportError:
            pass

        logger.warning("No LLM API key available - will use fallback templates")

    def _call_llm(self, prompt: str, max_tokens: int = 1000) -> Optional[str]:
        """Call LLM based on configured provider"""
        if not self.llm_client:
            return None

        try:
            if self.llm_provider == "anthropic":
                response = self.llm_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text

            elif self.llm_provider == "openai":
                response = self.llm_client.chat.completions.create(
                    model="gpt-4o",
                    max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content

        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return None

    async def design_unique_website(
        self,
        business_name: str,
        business_type: str,
        description: str,
        target_audience: str = "",
        unique_value_prop: str = "",
        features: List[str] = None,
        pricing_tiers: List[Dict] = None,
        industry_category: str = "",
        competitors: List[str] = None,
    ) -> Dict[str, str]:
        """
        Generate a completely unique website using LLM.

        Args:
            business_name: Name of the business
            business_type: Type (saas, ecommerce, content)
            description: Business description
            target_audience: Who the business serves
            unique_value_prop: What makes it different
            features: List of features
            pricing_tiers: Pricing information
            industry_category: Industry (health, finance, education, etc.)
            competitors: Known competitors to differentiate from

        Returns:
            Dict with file paths and content: {"index.html": "...", "style.css": "..."}
        """
        features = features or []
        pricing_tiers = pricing_tiers or []
        competitors = competitors or []

        # Generate unique design direction first
        design_direction = await self._generate_design_direction(
            business_name=business_name,
            business_type=business_type,
            description=description,
            target_audience=target_audience,
            industry_category=industry_category,
        )

        # Generate the actual HTML/CSS
        website_files = await self._generate_website_code(
            business_name=business_name,
            business_type=business_type,
            description=description,
            target_audience=target_audience,
            unique_value_prop=unique_value_prop,
            features=features,
            pricing_tiers=pricing_tiers,
            design_direction=design_direction,
        )

        return website_files

    async def _generate_design_direction(
        self,
        business_name: str,
        business_type: str,
        description: str,
        target_audience: str,
        industry_category: str,
    ) -> Dict[str, Any]:
        """Generate unique design direction for the business"""

        prompt = f"""You are a world-class web designer creating a unique brand identity.

BUSINESS CONTEXT:
- Name: {business_name}
- Type: {business_type}
- Description: {description}
- Target Audience: {target_audience or 'General consumers'}
- Industry: {industry_category or 'Technology'}

Create a UNIQUE design direction. DO NOT use generic corporate blue/indigo.
Consider the business personality, industry conventions, and target audience.

Return a JSON object with:
{{
    "primary_color": "#HEXCODE - choose based on industry/brand personality",
    "secondary_color": "#HEXCODE - complementary accent",
    "background_style": "gradient|solid|pattern - describe the style",
    "typography_mood": "modern|playful|professional|elegant|bold",
    "layout_style": "centered|asymmetric|grid|masonry",
    "hero_style": "full-screen|split|minimal|animated",
    "unique_element": "something visually distinctive for this brand",
    "brand_voice": "how copy should sound - friendly/professional/casual/authoritative",
    "icon_style": "outlined|filled|duotone|custom",
    "cta_style": "rounded|sharp|pill|gradient"
}}

Be creative! A health app might use calming greens/teals. A finance tool might use trust-building navy/gold.
An AI tool might use futuristic purples/cyans. A sustainability brand needs earthy greens/browns.
An education platform might use warm oranges/yellows for energy.

Output ONLY the JSON, no other text."""

        content = self._call_llm(prompt, max_tokens=1000)
        if content:
            try:
                # Extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    return json.loads(json_match.group())
            except Exception as e:
                logger.error(f"LLM design direction JSON parse failed: {e}")

        # Fallback: generate based on business name hash for consistency
        return self._generate_fallback_design(business_name, industry_category)

    def _generate_fallback_design(self, business_name: str, industry_category: str) -> Dict:
        """Generate design direction without LLM"""
        # Use hash for consistent but varied colors
        hash_val = int(hashlib.md5(business_name.encode()).hexdigest()[:8], 16)

        # Industry-based color palettes
        industry_palettes = {
            "health": [("#0D9488", "#F0FDFA"), ("#059669", "#ECFDF5"), ("#14B8A6", "#F0FDFA")],
            "finance": [("#0369A1", "#F0F9FF"), ("#1E40AF", "#EFF6FF"), ("#0284C7", "#F0F9FF")],
            "education": [("#EA580C", "#FFF7ED"), ("#C2410C", "#FFEDD5"), ("#F97316", "#FFF7ED")],
            "sustainability": [("#15803D", "#F0FDF4"), ("#166534", "#DCFCE7"), ("#22C55E", "#F0FDF4")],
            "ai": [("#9333EA", "#FAF5FF"), ("#7C3AED", "#EDE9FE"), ("#A855F7", "#FAF5FF")],
            "productivity": [("#4F46E5", "#EEF2FF"), ("#4338CA", "#E0E7FF"), ("#6366F1", "#EEF2FF")],
            "content": [("#7C3AED", "#F5F3FF"), ("#6D28D9", "#EDE9FE"), ("#8B5CF6", "#F5F3FF")],
            "ecommerce": [("#059669", "#ECFDF5"), ("#047857", "#D1FAE5"), ("#10B981", "#ECFDF5")],
            "saas": [("#2563EB", "#EFF6FF"), ("#1D4ED8", "#DBEAFE"), ("#3B82F6", "#EFF6FF")],
        }

        palette = industry_palettes.get(industry_category.lower(), industry_palettes["saas"])
        colors = palette[hash_val % len(palette)]

        hero_styles = ["full-screen", "split", "minimal", "gradient-overlay"]
        layout_styles = ["centered", "asymmetric", "grid-focus"]

        return {
            "primary_color": colors[0],
            "secondary_color": colors[1],
            "background_style": "gradient",
            "typography_mood": "modern",
            "layout_style": layout_styles[hash_val % len(layout_styles)],
            "hero_style": hero_styles[hash_val % len(hero_styles)],
            "unique_element": "custom gradient accent",
            "brand_voice": "professional",
            "icon_style": "outlined",
            "cta_style": "rounded"
        }

    async def _generate_website_code(
        self,
        business_name: str,
        business_type: str,
        description: str,
        target_audience: str,
        unique_value_prop: str,
        features: List[str],
        pricing_tiers: List[Dict],
        design_direction: Dict,
    ) -> Dict[str, str]:
        """Generate the actual HTML/CSS code using LLM"""

        features_str = "\n".join([f"- {f}" for f in features[:6]]) if features else "- Core functionality\n- Easy to use\n- Reliable performance"

        pricing_str = ""
        if pricing_tiers:
            for tier in pricing_tiers[:3]:
                pricing_str += f"- {tier.get('name', 'Plan')}: ${tier.get('price', '0')}/month\n"
        else:
            pricing_str = "- Starter: $9/month\n- Pro: $29/month\n- Enterprise: Custom"

        prompt = f"""You are an expert web developer creating a UNIQUE landing page.

BUSINESS:
- Name: {business_name}
- Type: {business_type}
- Description: {description}
- Target Audience: {target_audience or 'Professionals and businesses'}
- Unique Value: {unique_value_prop or 'Innovative solution for modern challenges'}

FEATURES:
{features_str}

PRICING:
{pricing_str}

DESIGN DIRECTION:
- Primary Color: {design_direction.get('primary_color', '#3B82F6')}
- Secondary Color: {design_direction.get('secondary_color', '#EFF6FF')}
- Hero Style: {design_direction.get('hero_style', 'full-screen')}
- Layout: {design_direction.get('layout_style', 'centered')}
- Brand Voice: {design_direction.get('brand_voice', 'professional')}
- CTA Style: {design_direction.get('cta_style', 'rounded')}

Generate a COMPLETE, UNIQUE landing page. Requirements:
1. Write ALL copy specific to this business - NO placeholder text
2. Use the exact colors specified
3. Create a unique layout that fits the design direction
4. Include: hero, features, pricing, CTA, footer
5. Mobile responsive using CSS media queries
6. Modern CSS (flexbox/grid)
7. Subtle animations for polish
8. Real testimonial placeholders with industry-appropriate names

Output format - return a JSON object with exactly two keys:
{{
    "index.html": "<!DOCTYPE html>... complete HTML with embedded CSS in <style> tag...",
    "readme.md": "# {business_name}\\n\\nGenerated landing page..."
}}

The HTML must be complete and self-contained. Include all CSS in a <style> tag.
Write engaging, specific copy - not generic "Lorem ipsum" or "Your solution here".

Output ONLY the JSON object, nothing else."""

        content = self._call_llm(prompt, max_tokens=8000)
        if content:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                    if "index.html" in result:
                        logger.info(f"LLM generated unique website for {business_name}")
                        return result
                except json.JSONDecodeError:
                    pass

            # If JSON parsing failed but we have HTML content
            if "<!DOCTYPE" in content or "<html" in content:
                html_match = re.search(r'<!DOCTYPE[\s\S]*</html>', content, re.IGNORECASE)
                if html_match:
                    return {
                        "index.html": html_match.group(),
                        "readme.md": f"# {business_name}\n\nLLM-generated unique landing page."
                    }

        # Fallback to enhanced template
        return self._generate_fallback_website(
            business_name, business_type, description, features, pricing_tiers, design_direction
        )

    def _generate_fallback_website(
        self,
        business_name: str,
        business_type: str,
        description: str,
        features: List[str],
        pricing_tiers: List[Dict],
        design_direction: Dict,
    ) -> Dict[str, str]:
        """Generate website without LLM - still uses design direction for uniqueness"""

        primary = design_direction.get("primary_color", "#3B82F6")
        secondary = design_direction.get("secondary_color", "#EFF6FF")
        hero_style = design_direction.get("hero_style", "full-screen")
        cta_style = design_direction.get("cta_style", "rounded")

        display_name = business_name.replace("-", " ").replace("_", " ").title()

        # Generate unique stats based on business name
        hash_val = int(hashlib.md5(business_name.encode()).hexdigest()[:8], 16)
        stats = [
            (f"{(hash_val % 50) + 10}K+", "Active Users"),
            (f"{(hash_val % 40) + 90}%", "Satisfaction"),
            (f"{(hash_val % 100) + 50}+", "Integrations"),
        ]

        # Build features HTML
        feature_icons = ["M13 10V3L4 14h7v7l9-11h-7z", "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                        "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                        "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                        "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"]

        features_html = ""
        for i, feature in enumerate(features[:6]):
            icon = feature_icons[i % len(feature_icons)]
            features_html += f'''
            <div class="feature-card">
                <div class="feature-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{icon}"/>
                    </svg>
                </div>
                <h3>{feature}</h3>
                <p>Designed to help you achieve better results with less effort.</p>
            </div>'''

        # Build pricing HTML
        pricing_html = ""
        for i, tier in enumerate(pricing_tiers[:3]):
            featured = "featured" if i == 1 else ""
            tier_features = tier.get("features", ["Core features", "Email support", "Basic analytics"])
            features_list = "".join([f"<li>{f}</li>" for f in tier_features[:5]])
            pricing_html += f'''
            <div class="pricing-card {featured}">
                <h3>{tier.get('name', 'Plan')}</h3>
                <div class="price">${tier.get('price', '0')}<span>/month</span></div>
                <ul>{features_list}</ul>
                <a href="#" class="btn {'btn-primary' if i == 1 else 'btn-secondary'}">Get Started</a>
            </div>'''

        # CTA button style
        btn_radius = "50px" if cta_style == "pill" else "12px" if cta_style == "rounded" else "4px"

        # Hero background style
        if hero_style == "gradient-overlay":
            hero_bg = f"linear-gradient(135deg, {primary}ee 0%, {primary}99 100%)"
        elif hero_style == "split":
            hero_bg = f"linear-gradient(90deg, {secondary} 50%, {primary}22 50%)"
        else:
            hero_bg = f"linear-gradient(135deg, {secondary} 0%, white 50%, {primary}11 100%)"

        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{display_name} - {description[:50] if description else 'Transform Your Business'}</title>
    <meta name="description" content="{description[:160] if description else 'Professional solution for modern businesses'}">
    <meta property="og:title" content="{display_name}">
    <meta property="og:description" content="{description[:160] if description else 'Professional solution'}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: {primary};
            --primary-dark: {primary}dd;
            --secondary: {secondary};
            --text-dark: #1f2937;
            --text-gray: #6b7280;
            --white: #ffffff;
            --btn-radius: {btn_radius};
        }}

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--text-dark);
            line-height: 1.6;
        }}

        .container {{ max-width: 1200px; margin: 0 auto; padding: 0 24px; }}

        /* Navigation */
        .navbar {{
            position: fixed; top: 0; left: 0; right: 0;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            z-index: 1000;
            padding: 16px 0;
            border-bottom: 1px solid #e5e7eb;
        }}

        .navbar .container {{
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .logo {{
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--primary);
            text-decoration: none;
        }}

        .nav-links {{ display: flex; gap: 32px; align-items: center; }}
        .nav-links a {{
            color: var(--text-gray);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }}
        .nav-links a:hover {{ color: var(--primary); }}

        /* Buttons */
        .btn {{
            display: inline-block;
            padding: 14px 32px;
            border-radius: var(--btn-radius);
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s;
            cursor: pointer;
            border: none;
        }}

        .btn-primary {{
            background: var(--primary);
            color: var(--white);
        }}
        .btn-primary:hover {{
            background: var(--primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }}

        .btn-secondary {{
            background: var(--white);
            color: var(--primary);
            border: 2px solid var(--primary);
        }}
        .btn-secondary:hover {{
            background: var(--secondary);
        }}

        /* Hero */
        .hero {{
            padding: 160px 0 100px;
            background: {hero_bg};
            min-height: 90vh;
            display: flex;
            align-items: center;
        }}

        .hero-content {{
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }}

        .hero h1 {{
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            margin-bottom: 24px;
            line-height: 1.1;
        }}

        .hero h1 span {{ color: var(--primary); }}

        .hero p {{
            font-size: 1.25rem;
            color: var(--text-gray);
            margin-bottom: 40px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }}

        .hero-cta {{
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
        }}

        .hero-stats {{
            display: flex;
            justify-content: center;
            gap: 60px;
            margin-top: 80px;
            padding-top: 40px;
            border-top: 1px solid #e5e7eb;
        }}

        .stat {{ text-align: center; }}
        .stat-value {{
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--primary);
        }}
        .stat-label {{
            color: var(--text-gray);
            font-size: 0.9rem;
        }}

        /* Features */
        .features {{
            padding: 100px 0;
            background: var(--white);
        }}

        .section-header {{
            text-align: center;
            margin-bottom: 60px;
        }}

        .section-header h2 {{
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 16px;
        }}

        .section-header p {{
            color: var(--text-gray);
            font-size: 1.1rem;
        }}

        .features-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 32px;
        }}

        .feature-card {{
            padding: 32px;
            background: var(--secondary);
            border-radius: 16px;
            transition: all 0.3s;
        }}

        .feature-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }}

        .feature-icon {{
            width: 56px;
            height: 56px;
            background: var(--primary);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
        }}

        .feature-icon svg {{
            width: 28px;
            height: 28px;
            color: var(--white);
        }}

        .feature-card h3 {{
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 12px;
        }}

        .feature-card p {{
            color: var(--text-gray);
        }}

        /* Pricing */
        .pricing {{
            padding: 100px 0;
            background: var(--secondary);
        }}

        .pricing-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 32px;
            max-width: 1000px;
            margin: 0 auto;
        }}

        .pricing-card {{
            background: var(--white);
            padding: 40px 32px;
            border-radius: 20px;
            text-align: center;
            border: 2px solid transparent;
            transition: all 0.3s;
        }}

        .pricing-card.featured {{
            border-color: var(--primary);
            transform: scale(1.05);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }}

        .pricing-card h3 {{
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 16px;
        }}

        .price {{
            font-size: 3rem;
            font-weight: 800;
            color: var(--primary);
            margin-bottom: 24px;
        }}

        .price span {{
            font-size: 1rem;
            font-weight: 400;
            color: var(--text-gray);
        }}

        .pricing-card ul {{
            list-style: none;
            margin-bottom: 32px;
            text-align: left;
        }}

        .pricing-card li {{
            padding: 12px 0;
            color: var(--text-gray);
            border-bottom: 1px solid #e5e7eb;
        }}

        .pricing-card li::before {{
            content: "\\2713 ";
            color: var(--primary);
            font-weight: 700;
            margin-right: 8px;
        }}

        /* CTA */
        .cta {{
            padding: 100px 0;
            background: var(--primary);
            text-align: center;
            color: var(--white);
        }}

        .cta h2 {{
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 16px;
        }}

        .cta p {{
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 32px;
        }}

        .cta .btn-primary {{
            background: var(--white);
            color: var(--primary);
        }}

        /* Footer */
        .footer {{
            padding: 60px 0 30px;
            background: #111827;
            color: var(--white);
        }}

        .footer-grid {{
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }}

        .footer-brand p {{
            color: #9ca3af;
            margin-top: 12px;
        }}

        .footer h4 {{
            font-weight: 600;
            margin-bottom: 16px;
        }}

        .footer a {{
            display: block;
            color: #9ca3af;
            text-decoration: none;
            padding: 6px 0;
            transition: color 0.2s;
        }}

        .footer a:hover {{ color: var(--white); }}

        .footer-bottom {{
            padding-top: 30px;
            border-top: 1px solid #374151;
            text-align: center;
            color: #9ca3af;
        }}

        /* Mobile */
        @media (max-width: 768px) {{
            .nav-links {{ display: none; }}
            .hero {{ padding: 120px 0 60px; min-height: auto; }}
            .hero h1 {{ font-size: 2rem; }}
            .hero-stats {{ flex-direction: column; gap: 24px; }}
            .pricing-card.featured {{ transform: none; }}
            .footer-grid {{ grid-template-columns: 1fr; }}
        }}
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <a href="/" class="logo">{display_name}</a>
            <div class="nav-links">
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#contact">Contact</a>
                <a href="#" class="btn btn-primary">Get Started</a>
            </div>
        </div>
    </nav>

    <section class="hero">
        <div class="container">
            <div class="hero-content">
                <h1>Transform Your Business with <span>{display_name}</span></h1>
                <p>{description or f'{display_name} helps you achieve more with less effort. Join thousands of satisfied customers today.'}</p>
                <div class="hero-cta">
                    <a href="#pricing" class="btn btn-primary">Start Free Trial</a>
                    <a href="#features" class="btn btn-secondary">Learn More</a>
                </div>
                <div class="hero-stats">
                    {''.join([f'<div class="stat"><div class="stat-value">{s[0]}</div><div class="stat-label">{s[1]}</div></div>' for s in stats])}
                </div>
            </div>
        </div>
    </section>

    <section class="features" id="features">
        <div class="container">
            <div class="section-header">
                <h2>Powerful Features</h2>
                <p>Everything you need to succeed in one platform</p>
            </div>
            <div class="features-grid">
                {features_html}
            </div>
        </div>
    </section>

    <section class="pricing" id="pricing">
        <div class="container">
            <div class="section-header">
                <h2>Simple, Transparent Pricing</h2>
                <p>Choose the plan that fits your needs</p>
            </div>
            <div class="pricing-grid">
                {pricing_html}
            </div>
        </div>
    </section>

    <section class="cta">
        <div class="container">
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of satisfied customers using {display_name}</p>
            <a href="#pricing" class="btn btn-primary">Start Your Free Trial</a>
        </div>
    </section>

    <footer class="footer" id="contact">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <h3>{display_name}</h3>
                    <p>{description[:100] if description else 'Professional solutions for modern businesses.'}</p>
                </div>
                <div>
                    <h4>Product</h4>
                    <a href="#features">Features</a>
                    <a href="#pricing">Pricing</a>
                    <a href="#">Documentation</a>
                </div>
                <div>
                    <h4>Company</h4>
                    <a href="#">About</a>
                    <a href="#">Blog</a>
                    <a href="#">Careers</a>
                </div>
                <div>
                    <h4>Legal</h4>
                    <a href="#">Privacy</a>
                    <a href="#">Terms</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 {display_name}. All rights reserved. Powered by Genesis AI.</p>
            </div>
        </div>
    </footer>
</body>
</html>'''

        return {
            "index.html": html,
            "readme.md": f"# {display_name}\n\nGenerated by WebsiteDesignAgent with unique design direction.\n\n- Primary Color: {primary}\n- Hero Style: {hero_style}\n- Generated: {datetime.now().isoformat()}"
        }

    async def analyze_existing_site(self, site_url: str) -> Dict[str, Any]:
        """
        Analyze an existing deployed site and generate improvement recommendations.

        Args:
            site_url: URL of the deployed site

        Returns:
            Analysis with improvement recommendations
        """
        prompt = f"""Analyze this website URL and provide improvement recommendations: {site_url}

Consider:
1. Visual design uniqueness
2. Copy effectiveness
3. Call-to-action clarity
4. Mobile responsiveness
5. Loading performance
6. SEO optimization
7. Conversion optimization

Return a JSON object with:
{{
    "current_score": 1-10,
    "issues": ["list of issues"],
    "improvements": [
        {{"area": "design", "suggestion": "...", "priority": "high/medium/low"}},
        ...
    ],
    "recommended_changes": {{
        "colors": "new color scheme if needed",
        "copy": "specific copy improvements",
        "layout": "layout changes",
        "cta": "CTA improvements"
    }}
}}"""

        if self.llm_client:
            try:
                response = self.llm_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                content = response.content[0].text
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    return json.loads(json_match.group())
            except Exception as e:
                logger.error(f"Site analysis failed: {e}")

        return {
            "current_score": 5,
            "issues": ["Unable to analyze - LLM not available"],
            "improvements": [],
            "recommended_changes": {}
        }

    async def improve_site(
        self,
        business_name: str,
        current_html: str,
        improvements: List[Dict],
    ) -> Dict[str, str]:
        """
        Apply improvements to an existing site.

        Args:
            business_name: Business name
            current_html: Current HTML content
            improvements: List of improvements to apply

        Returns:
            Updated website files
        """
        improvements_str = "\n".join([
            f"- {imp.get('area', 'general')}: {imp.get('suggestion', '')}"
            for imp in improvements
        ])

        prompt = f"""Improve this website HTML based on the following recommendations:

IMPROVEMENTS NEEDED:
{improvements_str}

CURRENT HTML (first 5000 chars):
{current_html[:5000]}

Apply the improvements while:
1. Maintaining the existing structure
2. Keeping the business branding
3. Making the site more unique and engaging
4. Improving conversion elements

Return the improved HTML as a JSON object:
{{
    "index.html": "<!DOCTYPE html>... improved HTML..."
}}"""

        if self.llm_client:
            try:
                response = self.llm_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=8000,
                    messages=[{"role": "user", "content": prompt}]
                )
                content = response.content[0].text
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    result = json.loads(json_match.group())
                    if "index.html" in result:
                        return result
            except Exception as e:
                logger.error(f"Site improvement failed: {e}")

        # Return original if improvement failed
        return {"index.html": current_html}


# Singleton instance
_agent_instance = None


def get_website_design_agent(business_id: str = "default") -> WebsiteDesignAgent:
    """Get singleton WebsiteDesignAgent instance"""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = WebsiteDesignAgent(business_id)
    return _agent_instance


async def design_unique_website(
    business_name: str,
    business_type: str = "saas",
    description: str = "",
    **kwargs
) -> Dict[str, str]:
    """Convenience function to design a unique website"""
    agent = get_website_design_agent()
    return await agent.design_unique_website(
        business_name=business_name,
        business_type=business_type,
        description=description,
        **kwargs
    )
