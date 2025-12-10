"""
Real Landing Page Generator

Generates production-ready landing pages with:
- Professional design (Tailwind CSS)
- Stripe checkout integration
- SEO meta tags
- Analytics integration
- Mobile responsive
- Call-to-action buttons
- Pricing tables
- Feature sections

Author: Genesis Deploy Agent
Date: December 2025
Status: Production Ready
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

from infrastructure.load_env import load_genesis_env

load_genesis_env()

logger = logging.getLogger(__name__)


class RealLandingPageGenerator:
    """Generate production-ready landing pages with Stripe integration"""

    def __init__(self):
        """Initialize generator"""
        self.stripe_pk = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
        self.ga_id = os.getenv("GOOGLE_ANALYTICS_ID", "")

    def generate_landing_page(
        self,
        business_name: str,
        description: str,
        features: List[str],
        pricing_tiers: List[Dict],
        output_path: Path,
        stripe_price_ids: Optional[Dict[str, str]] = None
    ) -> bool:
        """
        Generate a complete landing page

        Args:
            business_name: Name of the business
            description: Business description
            features: List of feature descriptions
            pricing_tiers: Pricing tier configurations
            output_path: Where to save the generated files
            stripe_price_ids: Optional Stripe price IDs for each tier

        Returns:
            True if generation successful
        """
        output_path = Path(output_path)
        output_path.mkdir(parents=True, exist_ok=True)

        # Generate Next.js pages
        self._generate_layout(output_path, business_name)
        self._generate_home_page(output_path, business_name, description, features)
        self._generate_pricing_page(output_path, business_name, pricing_tiers, stripe_price_ids)
        self._generate_checkout_api(output_path, stripe_price_ids)
        self._generate_success_page(output_path, business_name)
        self._generate_tailwind_config(output_path)
        self._generate_package_json(output_path, business_name)
        self._generate_next_config(output_path)

        logger.info(f"Generated landing page for {business_name}")
        return True

    def _generate_layout(self, output_path: Path, business_name: str):
        """Generate app/layout.tsx"""
        src_app = output_path / "src" / "app"
        src_app.mkdir(parents=True, exist_ok=True)

        layout_content = f'''import type {{ Metadata }} from 'next'
import {{ Inter }} from 'next/font/google'
import './globals.css'

const inter = Inter({{ subsets: ['latin'] }})

export const metadata: Metadata = {{
  title: '{business_name} - Transform Your Business',
  description: 'Professional solution for modern businesses. Start your free trial today.',
  keywords: '{business_name.lower()}, saas, business, productivity',
  openGraph: {{
    title: '{business_name}',
    description: 'Professional solution for modern businesses',
    type: 'website',
  }},
  twitter: {{
    card: 'summary_large_image',
    title: '{business_name}',
    description: 'Professional solution for modern businesses',
  }},
}}

export default function RootLayout({{
  children,
}}: {{
  children: React.ReactNode
}}) {{
  return (
    <html lang="en">
      <head>
        {f'<script async src="https://www.googletagmanager.com/gtag/js?id={self.ga_id}"></script>' if self.ga_id else ''}
        {f'''<script dangerouslySetInnerHTML={{{{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){{dataLayer.push(arguments);}}
          gtag('js', new Date());
          gtag('config', '{self.ga_id}');
        ` }}}} />''' if self.ga_id else ''}
      </head>
      <body className={{inter.className}}>
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0">
                <a href="/" className="text-2xl font-bold text-indigo-600">{business_name}</a>
              </div>
              <div className="hidden md:flex space-x-8">
                <a href="#features" className="text-gray-600 hover:text-indigo-600">Features</a>
                <a href="/pricing" className="text-gray-600 hover:text-indigo-600">Pricing</a>
                <a href="#contact" className="text-gray-600 hover:text-indigo-600">Contact</a>
              </div>
              <div>
                <a href="/pricing" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                  Get Started
                </a>
              </div>
            </div>
          </div>
        </nav>
        {{children}}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">{business_name}</h3>
                <p className="text-gray-400">Professional solution for modern businesses.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#features" className="hover:text-white">Features</a></li>
                  <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
                  <li><a href="#" className="hover:text-white">Documentation</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">About</a></li>
                  <li><a href="#" className="hover:text-white">Blog</a></li>
                  <li><a href="#contact" className="hover:text-white">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2025 {business_name}. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}}
'''
        with open(src_app / "layout.tsx", 'w') as f:
            f.write(layout_content)

        # Generate globals.css
        globals_css = '''@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 255, 255, 255;
  --background-end-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
    to bottom,
    rgb(var(--background-start-rgb)),
    rgb(var(--background-end-rgb))
  );
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
'''
        with open(src_app / "globals.css", 'w') as f:
            f.write(globals_css)

    def _generate_home_page(
        self,
        output_path: Path,
        business_name: str,
        description: str,
        features: List[str]
    ):
        """Generate app/page.tsx (home page)"""
        src_app = output_path / "src" / "app"

        features_jsx = "\n".join([
            f'''        <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={{2}} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">{feature}</h3>
          <p className="text-gray-600">Powerful functionality to help you achieve more.</p>
        </div>'''
            for feature in features[:6]
        ])

        page_content = f'''export default function Home() {{
  return (
    <main>
      {{/* Hero Section */}}
      <section className="bg-gradient-to-br from-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to <span className="gradient-text">{business_name}</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/pricing"
                className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition shadow-lg hover:shadow-xl"
              >
                Start Free Trial
              </a>
              <a
                href="#features"
                className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {{/* Features Section */}}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to succeed
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
{features_jsx}
          </div>
        </div>
      </section>

      {{/* CTA Section */}}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of satisfied customers today.
          </p>
          <a
            href="/pricing"
            className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition inline-block"
          >
            View Pricing
          </a>
        </div>
      </section>

      {{/* Contact Section */}}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600">
              Have questions? We&apos;re here to help.
            </p>
          </div>
          <div className="max-w-xl mx-auto">
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  rows={{4}}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Your message..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}}
'''
        with open(src_app / "page.tsx", 'w') as f:
            f.write(page_content)

    def _generate_pricing_page(
        self,
        output_path: Path,
        business_name: str,
        pricing_tiers: List[Dict],
        stripe_price_ids: Optional[Dict[str, str]] = None
    ):
        """Generate app/pricing/page.tsx"""
        pricing_dir = output_path / "src" / "app" / "pricing"
        pricing_dir.mkdir(parents=True, exist_ok=True)

        tiers_jsx = "\n".join([
            f'''        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition {' ring-2 ring-indigo-600' if tier.get('featured') else ''}">
          {f'<span className="bg-indigo-600 text-white text-sm px-3 py-1 rounded-full">Most Popular</span>' if tier.get('featured') else ''}
          <h3 className="text-2xl font-bold mt-4">{tier['name']}</h3>
          <p className="text-gray-600 mt-2">{tier.get('description', 'Perfect for getting started')}</p>
          <div className="mt-6">
            <span className="text-5xl font-bold">${tier['price']}</span>
            <span className="text-gray-600">/month</span>
          </div>
          <ul className="mt-8 space-y-4">
            {chr(10).join([f'<li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>{feature}</li>' for feature in tier.get('features', ['Feature 1', 'Feature 2', 'Feature 3'])])}
          </ul>
          <button
            onClick={{() => handleCheckout('{tier['name'].lower()}')}}
            className="w-full mt-8 {'bg-indigo-600 text-white hover:bg-indigo-700' if tier.get('featured') else 'bg-gray-100 text-gray-900 hover:bg-gray-200'} px-6 py-3 rounded-lg font-semibold transition"
          >
            Get Started
          </button>
        </div>'''
            for tier in pricing_tiers
        ])

        page_content = f''''use client'

import {{ loadStripe }} from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function PricingPage() {{
  const handleCheckout = async (plan: string) => {{
    try {{
      const response = await fetch('/api/checkout', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ plan }}),
      }})

      const {{ sessionId }} = await response.json()

      const stripe = await stripePromise
      if (stripe) {{
        await stripe.redirectToCheckout({{ sessionId }})
      }}
    }} catch (error) {{
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    }}
  }}

  return (
    <main className="py-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600">
            Choose the plan that&apos;s right for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
{tiers_jsx}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600">
            All plans include 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </main>
  )
}}
'''
        with open(pricing_dir / "page.tsx", 'w') as f:
            f.write(page_content)

    def _generate_checkout_api(
        self,
        output_path: Path,
        stripe_price_ids: Optional[Dict[str, str]] = None
    ):
        """Generate app/api/checkout/route.ts"""
        api_dir = output_path / "src" / "app" / "api" / "checkout"
        api_dir.mkdir(parents=True, exist_ok=True)

        # Default price IDs (can be overridden)
        price_ids = stripe_price_ids or {
            "starter": "price_starter_placeholder",
            "professional": "price_professional_placeholder",
            "enterprise": "price_enterprise_placeholder"
        }

        route_content = f'''import {{ NextRequest, NextResponse }} from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {{
  apiVersion: '2023-10-16',
}})

const PRICE_IDS: Record<string, string> = {{
  starter: '{price_ids.get("starter", "price_starter")}',
  professional: '{price_ids.get("professional", "price_professional")}',
  enterprise: '{price_ids.get("enterprise", "price_enterprise")}',
}}

export async function POST(request: NextRequest) {{
  try {{
    const {{ plan }} = await request.json()

    const priceId = PRICE_IDS[plan]
    if (!priceId) {{
      return NextResponse.json({{ error: 'Invalid plan' }}, {{ status: 400 }})
    }}

    const session = await stripe.checkout.sessions.create({{
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {{
          price: priceId,
          quantity: 1,
        }},
      ],
      success_url: `${{process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}}/success?session_id={{CHECKOUT_SESSION_ID}}`,
      cancel_url: `${{process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}}/pricing`,
    }})

    return NextResponse.json({{ sessionId: session.id }})
  }} catch (error) {{
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      {{ error: 'Failed to create checkout session' }},
      {{ status: 500 }}
    )
  }}
}}
'''
        with open(api_dir / "route.ts", 'w') as f:
            f.write(route_content)

    def _generate_success_page(self, output_path: Path, business_name: str):
        """Generate app/success/page.tsx"""
        success_dir = output_path / "src" / "app" / "success"
        success_dir.mkdir(parents=True, exist_ok=True)

        page_content = f'''export default function SuccessPage() {{
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={{2}} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for subscribing to {business_name}. You&apos;ll receive a confirmation email shortly.
        </p>
        <a
          href="/"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition inline-block"
        >
          Go to Dashboard
        </a>
      </div>
    </main>
  )
}}
'''
        with open(success_dir / "page.tsx", 'w') as f:
            f.write(page_content)

    def _generate_tailwind_config(self, output_path: Path):
        """Generate tailwind.config.js"""
        config_content = '''/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
'''
        with open(output_path / "tailwind.config.js", 'w') as f:
            f.write(config_content)

        postcss_content = '''module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
'''
        with open(output_path / "postcss.config.js", 'w') as f:
            f.write(postcss_content)

    def _generate_package_json(self, output_path: Path, business_name: str):
        """Generate package.json with all dependencies"""
        package = {
            "name": business_name.lower().replace(" ", "-"),
            "version": "1.0.0",
            "private": True,
            "scripts": {
                "dev": "next dev",
                "build": "next build",
                "start": "next start",
                "lint": "next lint"
            },
            "dependencies": {
                "next": "^14.0.0",
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "@stripe/stripe-js": "^2.2.0",
                "stripe": "^14.5.0"
            },
            "devDependencies": {
                "@types/node": "^20.0.0",
                "@types/react": "^18.2.0",
                "@types/react-dom": "^18.2.0",
                "typescript": "^5.0.0",
                "tailwindcss": "^3.4.0",
                "autoprefixer": "^10.4.0",
                "postcss": "^8.4.0"
            }
        }

        with open(output_path / "package.json", 'w') as f:
            json.dump(package, f, indent=2)

    def _generate_next_config(self, output_path: Path):
        """Generate next.config.js"""
        config_content = '''/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
'''
        with open(output_path / "next.config.js", 'w') as f:
            f.write(config_content)

        # Generate tsconfig.json
        tsconfig = {
            "compilerOptions": {
                "target": "es5",
                "lib": ["dom", "dom.iterable", "esnext"],
                "allowJs": True,
                "skipLibCheck": True,
                "strict": True,
                "noEmit": True,
                "esModuleInterop": True,
                "module": "esnext",
                "moduleResolution": "bundler",
                "resolveJsonModule": True,
                "isolatedModules": True,
                "jsx": "preserve",
                "incremental": True,
                "plugins": [{"name": "next"}],
                "paths": {"@/*": ["./src/*"]}
            },
            "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
            "exclude": ["node_modules"]
        }

        with open(output_path / "tsconfig.json", 'w') as f:
            json.dump(tsconfig, f, indent=2)


# Singleton
_generator_instance = None

def get_landing_page_generator() -> RealLandingPageGenerator:
    """Get singleton generator instance"""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = RealLandingPageGenerator()
    return _generator_instance


def generate_landing_page(
    business_name: str,
    description: str,
    features: List[str],
    pricing_tiers: List[Dict],
    output_path: str,
    **kwargs
) -> bool:
    """Generate a landing page (convenience function)"""
    generator = get_landing_page_generator()
    return generator.generate_landing_page(
        business_name=business_name,
        description=description,
        features=features,
        pricing_tiers=pricing_tiers,
        output_path=Path(output_path),
        **kwargs
    )
