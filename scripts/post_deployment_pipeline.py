"""
Post-Deployment Agent Pipeline

Runs specialized agents after a business is deployed to make it operational:
1. MarketingAgent - SEO, social content, launch plan
2. BillingAgent - Stripe setup, pricing pages
3. ContentAgent - Quality content generation
4. AnalystAgent - Analytics setup
5. MaintenanceAgent - Health monitoring setup

Usage:
    # Called automatically by deploy_to_github_pages.py
    # Or run manually:
    python scripts/post_deployment_pipeline.py --business-path businesses/production_test/content/mybusiness
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import argparse

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.load_env import load_genesis_env
load_genesis_env(override=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PostDeploymentPipeline:
    """
    Orchestrates post-deployment agents to make a business operational.

    Pipeline stages:
    1. Content Enhancement - Improve landing page, add SEO metadata
    2. Marketing Setup - Generate social content, email sequences
    3. Billing Setup - Configure Stripe, create pricing page
    4. Analytics Setup - Add tracking codes
    5. Maintenance Setup - Configure health monitoring
    """

    def __init__(self, business_path: Path, deployment_url: str, business_name: str):
        self.business_path = Path(business_path)
        self.deployment_url = deployment_url
        self.business_name = business_name
        self.business_id = business_name.lower().replace(" ", "-").replace("_", "-")

        # Load business spec if available
        self.business_spec = self._load_business_spec()

        # Track results
        self.results = {
            "business_name": business_name,
            "deployment_url": deployment_url,
            "started_at": datetime.now().isoformat(),
            "stages": {},
            "assets_generated": [],
            "errors": []
        }

        # Agent instances (lazy loaded)
        self._marketing_agent = None
        self._billing_agent = None
        self._content_agent = None
        self._analyst_agent = None
        self._maintenance_agent = None

    def _load_business_spec(self) -> Dict:
        """Load business specification from README or spec file"""
        spec = {
            "name": self.business_name,
            "type": "content",  # Default
            "description": "",
            "target_audience": "",
            "value_proposition": ""
        }

        # Try README.md
        readme_path = self.business_path / "README.md"
        if readme_path.exists():
            content = readme_path.read_text(encoding='utf-8', errors='ignore')
            spec["description"] = content[:500]  # First 500 chars

        # Try business_spec.json
        spec_path = self.business_path / "business_spec.json"
        if spec_path.exists():
            try:
                with open(spec_path) as f:
                    loaded = json.load(f)
                    spec.update(loaded)
            except:
                pass

        # Infer type from parent directory
        parent_name = self.business_path.parent.name
        if parent_name in ["saas", "content", "marketplace", "ecommerce", "ai", "fintech"]:
            spec["type"] = parent_name

        return spec

    async def _get_marketing_agent(self):
        """Lazy load marketing agent"""
        if self._marketing_agent is None:
            try:
                from agents.marketing_agent import MarketingAgent
                self._marketing_agent = MarketingAgent(business_id=self.business_id)
                await self._marketing_agent.initialize()
            except Exception as e:
                logger.warning(f"Could not load MarketingAgent: {e}")
                self._marketing_agent = False  # Mark as unavailable
        return self._marketing_agent if self._marketing_agent else None

    async def _get_billing_agent(self):
        """Lazy load billing agent"""
        if self._billing_agent is None:
            try:
                from agents.billing_agent import BillingAgent
                self._billing_agent = BillingAgent(business_id=self.business_id)
                await self._billing_agent.initialize()
            except Exception as e:
                logger.warning(f"Could not load BillingAgent: {e}")
                self._billing_agent = False
        return self._billing_agent if self._billing_agent else None

    async def _get_content_agent(self):
        """Lazy load content agent"""
        if self._content_agent is None:
            try:
                from agents.content_agent import ContentAgent
                self._content_agent = ContentAgent(business_id=self.business_id)
                await self._content_agent.initialize()
            except Exception as e:
                logger.warning(f"Could not load ContentAgent: {e}")
                self._content_agent = False
        return self._content_agent if self._content_agent else None

    async def _get_analyst_agent(self):
        """Lazy load analyst agent"""
        if self._analyst_agent is None:
            try:
                from agents.analyst_agent import AnalystAgent
                self._analyst_agent = AnalystAgent(business_id=self.business_id)
                await self._analyst_agent.initialize()
            except Exception as e:
                logger.warning(f"Could not load AnalystAgent: {e}")
                self._analyst_agent = False
        return self._analyst_agent if self._analyst_agent else None

    async def _get_maintenance_agent(self):
        """Lazy load maintenance agent"""
        if self._maintenance_agent is None:
            try:
                from agents.maintenance_agent import MaintenanceAgent
                self._maintenance_agent = MaintenanceAgent(business_id=self.business_id)
                await self._maintenance_agent.initialize()
            except Exception as e:
                logger.warning(f"Could not load MaintenanceAgent: {e}")
                self._maintenance_agent = False
        return self._maintenance_agent if self._maintenance_agent else None

    async def run_content_enhancement(self) -> Dict:
        """Stage 1: Enhance content with SEO and better copy"""
        logger.info(f"[1/5] Running Content Enhancement for {self.business_name}")

        stage_result = {
            "stage": "content_enhancement",
            "started_at": datetime.now().isoformat(),
            "actions": [],
            "success": False
        }

        try:
            # Add SEO metadata to index.html
            index_path = self.business_path / "index.html"
            if index_path.exists():
                content = index_path.read_text(encoding='utf-8', errors='ignore')

                # Add meta description if missing
                if 'name="description"' not in content.lower():
                    description = self.business_spec.get("description", f"{self.business_name} - AI-Powered Business Solution")[:160]
                    meta_tag = f'<meta name="description" content="{description}">'

                    if "<head>" in content:
                        content = content.replace("<head>", f"<head>\n    {meta_tag}")
                        index_path.write_text(content, encoding='utf-8')
                        stage_result["actions"].append("Added meta description")

                # Add Open Graph tags if missing
                if 'property="og:' not in content.lower():
                    og_tags = f'''
    <meta property="og:title" content="{self.business_name}">
    <meta property="og:description" content="{self.business_spec.get("description", "AI-Powered Business")[:200]}">
    <meta property="og:url" content="{self.deployment_url}">
    <meta property="og:type" content="website">'''

                    if "<head>" in content:
                        content = index_path.read_text(encoding='utf-8', errors='ignore')
                        content = content.replace("<head>", f"<head>{og_tags}")
                        index_path.write_text(content, encoding='utf-8')
                        stage_result["actions"].append("Added Open Graph tags")

                # Add structured data (JSON-LD)
                if '"@type"' not in content:
                    structured_data = {
                        "@context": "https://schema.org",
                        "@type": "WebApplication",
                        "name": self.business_name,
                        "url": self.deployment_url,
                        "description": self.business_spec.get("description", ""),
                        "applicationCategory": "BusinessApplication"
                    }
                    script_tag = f'<script type="application/ld+json">{json.dumps(structured_data)}</script>'

                    if "</head>" in content:
                        content = index_path.read_text(encoding='utf-8', errors='ignore')
                        content = content.replace("</head>", f"    {script_tag}\n</head>")
                        index_path.write_text(content, encoding='utf-8')
                        stage_result["actions"].append("Added structured data (JSON-LD)")

            stage_result["success"] = True

        except Exception as e:
            stage_result["error"] = str(e)
            self.results["errors"].append(f"Content enhancement: {e}")

        stage_result["completed_at"] = datetime.now().isoformat()
        self.results["stages"]["content_enhancement"] = stage_result
        return stage_result

    async def run_marketing_setup(self) -> Dict:
        """Stage 2: Generate marketing assets"""
        logger.info(f"[2/5] Running Marketing Setup for {self.business_name}")

        stage_result = {
            "stage": "marketing_setup",
            "started_at": datetime.now().isoformat(),
            "actions": [],
            "assets": [],
            "success": False
        }

        try:
            marketing_agent = await self._get_marketing_agent()

            if marketing_agent:
                # Generate social media content calendar
                try:
                    social_content = await marketing_agent.generate_social_content(
                        business_name=self.business_name,
                        description=self.business_spec.get("description", ""),
                        days=7  # 7 days of content for now
                    )

                    # Save social content
                    social_path = self.business_path / "marketing" / "social_calendar.json"
                    social_path.parent.mkdir(exist_ok=True)
                    with open(social_path, "w") as f:
                        json.dump(social_content, f, indent=2)

                    stage_result["actions"].append("Generated 7-day social calendar")
                    stage_result["assets"].append(str(social_path))
                    self.results["assets_generated"].append("social_calendar.json")
                except Exception as e:
                    logger.warning(f"Social content generation failed: {e}")

                # Generate email welcome sequence
                try:
                    email_sequence = await marketing_agent.create_email_sequence(
                        business_name=self.business_name,
                        sequence_type="welcome",
                        emails=3
                    )

                    email_path = self.business_path / "marketing" / "email_welcome_sequence.json"
                    with open(email_path, "w") as f:
                        json.dump(email_sequence, f, indent=2)

                    stage_result["actions"].append("Generated 3-email welcome sequence")
                    stage_result["assets"].append(str(email_path))
                    self.results["assets_generated"].append("email_welcome_sequence.json")
                except Exception as e:
                    logger.warning(f"Email sequence generation failed: {e}")

            else:
                # Fallback: Create basic marketing assets without agent
                marketing_dir = self.business_path / "marketing"
                marketing_dir.mkdir(exist_ok=True)

                # Basic social content template
                social_template = {
                    "business": self.business_name,
                    "generated_at": datetime.now().isoformat(),
                    "posts": [
                        {
                            "day": 1,
                            "platform": "twitter",
                            "content": f"Introducing {self.business_name}! Your new AI-powered solution. #AI #startup"
                        },
                        {
                            "day": 2,
                            "platform": "linkedin",
                            "content": f"We're excited to launch {self.business_name}. Learn how we can help your business grow."
                        }
                    ]
                }

                with open(marketing_dir / "social_calendar.json", "w") as f:
                    json.dump(social_template, f, indent=2)

                stage_result["actions"].append("Created basic social content template")
                self.results["assets_generated"].append("social_calendar.json")

            stage_result["success"] = True

        except Exception as e:
            stage_result["error"] = str(e)
            self.results["errors"].append(f"Marketing setup: {e}")

        stage_result["completed_at"] = datetime.now().isoformat()
        self.results["stages"]["marketing_setup"] = stage_result
        return stage_result

    async def run_billing_setup(self) -> Dict:
        """Stage 3: Set up billing and pricing"""
        logger.info(f"[3/5] Running Billing Setup for {self.business_name}")

        stage_result = {
            "stage": "billing_setup",
            "started_at": datetime.now().isoformat(),
            "actions": [],
            "success": False
        }

        try:
            # Check if Stripe is configured
            stripe_key = os.getenv("STRIPE_SECRET_KEY")

            if stripe_key and stripe_key.startswith("sk_"):
                billing_agent = await self._get_billing_agent()

                if billing_agent:
                    try:
                        # Create Stripe product
                        product_result = await billing_agent.create_product(
                            name=self.business_name,
                            description=self.business_spec.get("description", "AI-Powered Solution")[:500]
                        )
                        stage_result["actions"].append(f"Created Stripe product: {product_result.get('id', 'unknown')}")
                    except Exception as e:
                        logger.warning(f"Stripe product creation failed: {e}")

            # Create pricing page template
            pricing_path = self.business_path / "pricing.html"
            if not pricing_path.exists():
                pricing_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pricing - {self.business_name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }}
        .pricing-container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }}
        h1 {{ text-align: center; margin-bottom: 3rem; }}
        .pricing-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }}
        .pricing-card {{
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }}
        .pricing-card.featured {{
            border: 2px solid #667eea;
            transform: scale(1.05);
        }}
        .plan-name {{ font-size: 1.5rem; margin-bottom: 1rem; }}
        .plan-price {{ font-size: 3rem; font-weight: bold; margin-bottom: 1rem; }}
        .plan-price span {{ font-size: 1rem; color: #666; }}
        .plan-features {{ list-style: none; margin: 2rem 0; text-align: left; }}
        .plan-features li {{ padding: 0.5rem 0; border-bottom: 1px solid #eee; }}
        .plan-features li:before {{ content: "✓ "; color: #667eea; }}
        .cta-button {{
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            transition: transform 0.2s;
        }}
        .cta-button:hover {{ transform: translateY(-2px); }}
    </style>
</head>
<body>
    <div class="pricing-container">
        <h1>Simple, Transparent Pricing</h1>
        <div class="pricing-grid">
            <div class="pricing-card">
                <h2 class="plan-name">Starter</h2>
                <div class="plan-price">$29<span>/month</span></div>
                <ul class="plan-features">
                    <li>Core features</li>
                    <li>Email support</li>
                    <li>1 user</li>
                </ul>
                <a href="#" class="cta-button">Get Started</a>
            </div>
            <div class="pricing-card featured">
                <h2 class="plan-name">Professional</h2>
                <div class="plan-price">$79<span>/month</span></div>
                <ul class="plan-features">
                    <li>All Starter features</li>
                    <li>Priority support</li>
                    <li>5 users</li>
                    <li>Advanced analytics</li>
                </ul>
                <a href="#" class="cta-button">Get Started</a>
            </div>
            <div class="pricing-card">
                <h2 class="plan-name">Enterprise</h2>
                <div class="plan-price">$199<span>/month</span></div>
                <ul class="plan-features">
                    <li>All Professional features</li>
                    <li>Dedicated support</li>
                    <li>Unlimited users</li>
                    <li>Custom integrations</li>
                </ul>
                <a href="#" class="cta-button">Contact Sales</a>
            </div>
        </div>
    </div>
</body>
</html>'''
                pricing_path.write_text(pricing_html, encoding='utf-8')
                stage_result["actions"].append("Created pricing page template")
                self.results["assets_generated"].append("pricing.html")

            stage_result["success"] = True

        except Exception as e:
            stage_result["error"] = str(e)
            self.results["errors"].append(f"Billing setup: {e}")

        stage_result["completed_at"] = datetime.now().isoformat()
        self.results["stages"]["billing_setup"] = stage_result
        return stage_result

    async def run_analytics_setup(self) -> Dict:
        """Stage 4: Set up analytics tracking"""
        logger.info(f"[4/5] Running Analytics Setup for {self.business_name}")

        stage_result = {
            "stage": "analytics_setup",
            "started_at": datetime.now().isoformat(),
            "actions": [],
            "success": False
        }

        try:
            index_path = self.business_path / "index.html"
            if index_path.exists():
                content = index_path.read_text(encoding='utf-8', errors='ignore')

                # Add Plausible Analytics (privacy-friendly)
                plausible_domain = self.deployment_url.replace("https://", "").replace("http://", "")

                if "plausible.io" not in content:
                    analytics_script = f'''
    <!-- Analytics - Plausible (Privacy-friendly) -->
    <script defer data-domain="{plausible_domain}" src="https://plausible.io/js/script.js"></script>'''

                    if "</head>" in content:
                        content = content.replace("</head>", f"{analytics_script}\n</head>")
                        index_path.write_text(content, encoding='utf-8')
                        stage_result["actions"].append("Added Plausible Analytics script")

                # Add Mixpanel if configured
                mixpanel_token = os.getenv("MIXPANEL_TOKEN")
                if mixpanel_token and "mixpanel" not in content.lower():
                    mixpanel_script = f'''
    <!-- Mixpanel Analytics -->
    <script>
    (function(f,b){{if(!b.__SV){{var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){{function g(a,d){{var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){{a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){{var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d}};a.people.toString=function(){{return a.toString(1)+".people (stub)"}};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){{function b(c){{d[c]=function(){{call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}}}for(var d={{}},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d}};b._i.push([e,f,c])}};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===f.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\\/\\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}}}})(document,window.mixpanel||[]);
    mixpanel.init("{mixpanel_token}", {{track_pageview: true}});
    </script>'''

                    if "</head>" in content:
                        content = index_path.read_text(encoding='utf-8', errors='ignore')
                        content = content.replace("</head>", f"{mixpanel_script}\n</head>")
                        index_path.write_text(content, encoding='utf-8')
                        stage_result["actions"].append("Added Mixpanel Analytics")

            stage_result["success"] = True

        except Exception as e:
            stage_result["error"] = str(e)
            self.results["errors"].append(f"Analytics setup: {e}")

        stage_result["completed_at"] = datetime.now().isoformat()
        self.results["stages"]["analytics_setup"] = stage_result
        return stage_result

    async def run_maintenance_setup(self) -> Dict:
        """Stage 5: Set up monitoring and maintenance"""
        logger.info(f"[5/5] Running Maintenance Setup for {self.business_name}")

        stage_result = {
            "stage": "maintenance_setup",
            "started_at": datetime.now().isoformat(),
            "actions": [],
            "success": False
        }

        try:
            # Create monitoring config
            monitoring_config = {
                "business_id": self.business_id,
                "business_name": self.business_name,
                "deployment_url": self.deployment_url,
                "created_at": datetime.now().isoformat(),
                "health_checks": {
                    "enabled": True,
                    "interval_minutes": 30,
                    "endpoints": [
                        {"path": "/", "expected_status": 200},
                        {"path": "/pricing.html", "expected_status": 200}
                    ]
                },
                "alerts": {
                    "email": os.getenv("ALERT_EMAIL", ""),
                    "slack_webhook": os.getenv("SLACK_WEBHOOK", ""),
                    "on_downtime": True,
                    "on_slow_response": True,
                    "slow_threshold_ms": 5000
                },
                "maintenance_windows": {
                    "enabled": False,
                    "schedule": "0 3 * * 0"  # Sundays at 3 AM
                }
            }

            # Save monitoring config
            config_dir = self.business_path / ".genesis"
            config_dir.mkdir(exist_ok=True)

            config_path = config_dir / "monitoring.json"
            with open(config_path, "w") as f:
                json.dump(monitoring_config, f, indent=2)

            stage_result["actions"].append("Created monitoring configuration")
            self.results["assets_generated"].append(".genesis/monitoring.json")

            # Register with maintenance agent if available
            maintenance_agent = await self._get_maintenance_agent()
            if maintenance_agent:
                try:
                    await maintenance_agent.register_site(
                        url=self.deployment_url,
                        business_id=self.business_id
                    )
                    stage_result["actions"].append("Registered with maintenance agent")
                except Exception as e:
                    logger.warning(f"Could not register with maintenance agent: {e}")

            stage_result["success"] = True

        except Exception as e:
            stage_result["error"] = str(e)
            self.results["errors"].append(f"Maintenance setup: {e}")

        stage_result["completed_at"] = datetime.now().isoformat()
        self.results["stages"]["maintenance_setup"] = stage_result
        return stage_result

    async def run(self) -> Dict:
        """Run the full post-deployment pipeline"""
        logger.info(f"\n{'='*60}")
        logger.info(f"POST-DEPLOYMENT PIPELINE: {self.business_name}")
        logger.info(f"{'='*60}")
        logger.info(f"URL: {self.deployment_url}")
        logger.info(f"Path: {self.business_path}")
        logger.info(f"{'='*60}\n")

        # Run all stages
        await self.run_content_enhancement()
        await self.run_marketing_setup()
        await self.run_billing_setup()
        await self.run_analytics_setup()
        await self.run_maintenance_setup()

        # Calculate summary
        self.results["completed_at"] = datetime.now().isoformat()

        stages_passed = sum(1 for s in self.results["stages"].values() if s.get("success"))
        total_stages = len(self.results["stages"])

        self.results["summary"] = {
            "stages_passed": stages_passed,
            "total_stages": total_stages,
            "assets_generated": len(self.results["assets_generated"]),
            "errors": len(self.results["errors"]),
            "success": stages_passed == total_stages
        }

        # Log summary
        logger.info(f"\n{'='*60}")
        logger.info("POST-DEPLOYMENT SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Stages completed: {stages_passed}/{total_stages}")
        logger.info(f"Assets generated: {len(self.results['assets_generated'])}")
        if self.results["errors"]:
            logger.warning(f"Errors: {len(self.results['errors'])}")
            for err in self.results["errors"]:
                logger.warning(f"  - {err}")
        logger.info(f"{'='*60}\n")

        return self.results


async def run_post_deployment(business_path: Path, deployment_url: str, business_name: str) -> Dict:
    """
    Convenience function to run post-deployment pipeline.
    Called by deploy_to_github_pages.py after successful deployment.
    """
    pipeline = PostDeploymentPipeline(
        business_path=business_path,
        deployment_url=deployment_url,
        business_name=business_name
    )
    return await pipeline.run()


async def main():
    parser = argparse.ArgumentParser(description="Run post-deployment pipeline for a business")
    parser.add_argument("--business-path", type=str, required=True, help="Path to business directory")
    parser.add_argument("--url", type=str, help="Deployment URL (optional, will be inferred)")
    parser.add_argument("--name", type=str, help="Business name (optional, will be inferred)")
    args = parser.parse_args()

    business_path = Path(args.business_path)
    if not business_path.exists():
        logger.error(f"Business path not found: {business_path}")
        sys.exit(1)

    business_name = args.name or business_path.name
    github_username = os.getenv("GITHUB_USERNAME", "bullrushinvestments")
    deployment_url = args.url or f"https://{github_username}.github.io/{business_name}"

    results = await run_post_deployment(business_path, deployment_url, business_name)

    # Save results
    results_path = Path("logs") / f"post_deploy_{business_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    results_path.parent.mkdir(exist_ok=True)
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)

    logger.info(f"Results saved to: {results_path}")

    if not results["summary"]["success"]:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
