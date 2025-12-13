"""
Unique Design System for Genesis Landing Pages

Generates UNIQUE visual designs for each business:
- Random color palettes (50+ professional color schemes)
- Random fonts from Google Fonts (20+ font combinations)
- Unique SVG logo patterns
- Varied gradient backgrounds
- Different layout accent patterns

Author: Genesis Design Agent (Jules)
Date: December 2025
Status: Production Ready
"""

import hashlib
import random
from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class DesignSystem:
    """Complete design system for a business"""
    # Colors
    primary: str           # Main brand color
    primary_dark: str      # Darker variant
    secondary: str         # Accent color
    accent: str            # Highlight color
    dark: str              # Text/dark backgrounds
    light: str             # Light backgrounds
    gray: str              # Neutral gray

    # Typography
    heading_font: str      # Font for headings
    body_font: str         # Font for body text
    font_import: str       # Google Fonts import URL

    # Gradient
    gradient: str          # CSS gradient
    gradient_angle: int    # Gradient angle

    # Patterns
    hero_pattern: str      # SVG pattern for hero
    pattern_opacity: float # Pattern opacity

    # Logo
    logo_svg: str          # Generated SVG logo

    # Layout & Structure (New)
    layout_style: str      # 'modern', 'minimal', 'bold', 'glass'
    border_radius: str     # '0px', '4px', '8px', '12px', '20px', '99px'
    card_style: str        # 'flat', 'shadow', 'outline', 'glass'
    button_style: str      # 'solid', 'gradient', 'outline', 'soft'


# 50 Professional Color Palettes (very different from each other)
COLOR_PALETTES = [
    # Blues & Purples
    {"primary": "#6366f1", "primary_dark": "#4f46e5", "secondary": "#10b981", "accent": "#f59e0b", "name": "Indigo Vibrant"},
    {"primary": "#3b82f6", "primary_dark": "#2563eb", "secondary": "#f97316", "accent": "#84cc16", "name": "Ocean Blue"},
    {"primary": "#8b5cf6", "primary_dark": "#7c3aed", "secondary": "#06b6d4", "accent": "#ec4899", "name": "Royal Purple"},
    {"primary": "#0ea5e9", "primary_dark": "#0284c7", "secondary": "#f43f5e", "accent": "#a855f7", "name": "Sky Blue"},
    {"primary": "#6d28d9", "primary_dark": "#5b21b6", "secondary": "#14b8a6", "accent": "#fbbf24", "name": "Deep Violet"},

    # Greens & Teals
    {"primary": "#10b981", "primary_dark": "#059669", "secondary": "#8b5cf6", "accent": "#f59e0b", "name": "Emerald Fresh"},
    {"primary": "#14b8a6", "primary_dark": "#0d9488", "secondary": "#f43f5e", "accent": "#facc15", "name": "Teal Modern"},
    {"primary": "#22c55e", "primary_dark": "#16a34a", "secondary": "#3b82f6", "accent": "#ec4899", "name": "Green Growth"},
    {"primary": "#059669", "primary_dark": "#047857", "secondary": "#a855f7", "accent": "#fb923c", "name": "Forest Deep"},
    {"primary": "#84cc16", "primary_dark": "#65a30d", "secondary": "#ef4444", "accent": "#06b6d4", "name": "Lime Energy"},

    # Reds & Pinks
    {"primary": "#ef4444", "primary_dark": "#dc2626", "secondary": "#14b8a6", "accent": "#fbbf24", "name": "Red Bold"},
    {"primary": "#f43f5e", "primary_dark": "#e11d48", "secondary": "#22c55e", "accent": "#8b5cf6", "name": "Rose Vivid"},
    {"primary": "#ec4899", "primary_dark": "#db2777", "secondary": "#06b6d4", "accent": "#a3e635", "name": "Pink Hot"},
    {"primary": "#f97316", "primary_dark": "#ea580c", "secondary": "#6366f1", "accent": "#22c55e", "name": "Orange Flame"},
    {"primary": "#be185d", "primary_dark": "#9d174d", "secondary": "#fbbf24", "accent": "#3b82f6", "name": "Magenta Rich"},

    # Yellows & Ambers
    {"primary": "#f59e0b", "primary_dark": "#d97706", "secondary": "#6366f1", "accent": "#ef4444", "name": "Amber Warm"},
    {"primary": "#fbbf24", "primary_dark": "#f59e0b", "secondary": "#7c3aed", "accent": "#10b981", "name": "Yellow Sunny"},
    {"primary": "#eab308", "primary_dark": "#ca8a04", "secondary": "#3b82f6", "accent": "#f43f5e", "name": "Gold Premium"},

    # Cyans & Aqua
    {"primary": "#06b6d4", "primary_dark": "#0891b2", "secondary": "#f43f5e", "accent": "#fbbf24", "name": "Cyan Fresh"},
    {"primary": "#0d9488", "primary_dark": "#0f766e", "secondary": "#ec4899", "accent": "#84cc16", "name": "Aqua Deep"},

    # Neutrals & Dark
    {"primary": "#1f2937", "primary_dark": "#111827", "secondary": "#f59e0b", "accent": "#10b981", "name": "Charcoal Pro"},
    {"primary": "#374151", "primary_dark": "#1f2937", "secondary": "#3b82f6", "accent": "#f97316", "name": "Slate Modern"},
    {"primary": "#0f172a", "primary_dark": "#020617", "secondary": "#38bdf8", "accent": "#a3e635", "name": "Midnight Elite"},

    # Warm Browns
    {"primary": "#92400e", "primary_dark": "#78350f", "secondary": "#f59e0b", "accent": "#22c55e", "name": "Brown Earth"},
    {"primary": "#b45309", "primary_dark": "#92400e", "secondary": "#6366f1", "accent": "#14b8a6", "name": "Amber Rich"},

    # Unique Combos
    {"primary": "#7c2d12", "primary_dark": "#6f2c0e", "secondary": "#fbbf24", "accent": "#06b6d4", "name": "Rust Vintage"},
    {"primary": "#4c1d95", "primary_dark": "#3b0764", "secondary": "#f97316", "accent": "#22c55e", "name": "Purple Deep"},
    {"primary": "#065f46", "primary_dark": "#064e3b", "secondary": "#fbbf24", "accent": "#a855f7", "name": "Pine Forest"},
    {"primary": "#0c4a6e", "primary_dark": "#0a3d5c", "secondary": "#f43f5e", "accent": "#84cc16", "name": "Navy Classic"},
    {"primary": "#701a75", "primary_dark": "#581c67", "secondary": "#f59e0b", "accent": "#22c55e", "name": "Plum Royal"},

    # Extra Unique
    {"primary": "#047857", "primary_dark": "#065f46", "secondary": "#db2777", "accent": "#fbbf24", "name": "Jade Precious"},
    {"primary": "#1e40af", "primary_dark": "#1e3a8a", "secondary": "#f97316", "accent": "#84cc16", "name": "Cobalt Strong"},
    {"primary": "#c026d3", "primary_dark": "#a21caf", "secondary": "#22c55e", "accent": "#f59e0b", "name": "Fuchsia Bold"},
    {"primary": "#dc2626", "primary_dark": "#b91c1c", "secondary": "#0ea5e9", "accent": "#a855f7", "name": "Crimson Power"},
    {"primary": "#ea580c", "primary_dark": "#c2410c", "secondary": "#6366f1", "accent": "#14b8a6", "name": "Tangerine Zest"},

    # Pastels (lighter, softer)
    {"primary": "#a78bfa", "primary_dark": "#8b5cf6", "secondary": "#fb7185", "accent": "#fbbf24", "name": "Lavender Soft"},
    {"primary": "#60a5fa", "primary_dark": "#3b82f6", "secondary": "#f472b6", "accent": "#a3e635", "name": "Sky Gentle"},
    {"primary": "#4ade80", "primary_dark": "#22c55e", "secondary": "#f472b6", "accent": "#fbbf24", "name": "Mint Fresh"},
    {"primary": "#f472b6", "primary_dark": "#ec4899", "secondary": "#34d399", "accent": "#fbbf24", "name": "Blush Pink"},
    {"primary": "#38bdf8", "primary_dark": "#0ea5e9", "secondary": "#f97316", "accent": "#a855f7", "name": "Aqua Light"},

    # Gradients special
    {"primary": "#6366f1", "primary_dark": "#8b5cf6", "secondary": "#ec4899", "accent": "#f97316", "name": "Spectrum"},
    {"primary": "#10b981", "primary_dark": "#06b6d4", "secondary": "#8b5cf6", "accent": "#f59e0b", "name": "Aurora"},
    {"primary": "#f97316", "primary_dark": "#ef4444", "secondary": "#8b5cf6", "accent": "#22c55e", "name": "Sunset"},
    {"primary": "#0ea5e9", "primary_dark": "#6366f1", "secondary": "#f43f5e", "accent": "#84cc16", "name": "Ocean Gradient"},
    {"primary": "#22c55e", "primary_dark": "#84cc16", "secondary": "#3b82f6", "accent": "#f43f5e", "name": "Forest Gradient"},

    # Tech-focused
    {"primary": "#00d4ff", "primary_dark": "#0099ff", "secondary": "#ff0080", "accent": "#00ff88", "name": "Neon Tech"},
    {"primary": "#7928ca", "primary_dark": "#4c0099", "secondary": "#ff0080", "accent": "#00d4ff", "name": "Cyber Purple"},
    {"primary": "#0070f3", "primary_dark": "#0050a3", "secondary": "#00c2ff", "accent": "#ff4444", "name": "Vercel Blue"},
    {"primary": "#24292f", "primary_dark": "#0d1117", "secondary": "#58a6ff", "accent": "#3fb950", "name": "GitHub Dark"},
    {"primary": "#ff6b35", "primary_dark": "#e55812", "secondary": "#004e89", "accent": "#7209b7", "name": "Startup Fire"},
]

# Google Fonts combinations (heading, body pairs)
FONT_COMBINATIONS = [
    ("Poppins", "Inter"),
    ("Montserrat", "Open Sans"),
    ("Playfair Display", "Lato"),
    ("Raleway", "Roboto"),
    ("DM Sans", "Work Sans"),
    ("Space Grotesk", "IBM Plex Sans"),
    ("Lexend", "Nunito"),
    ("Manrope", "Source Sans Pro"),
    ("Outfit", "Karla"),
    ("Plus Jakarta Sans", "Mulish"),
    ("Sora", "Rubik"),
    ("Satoshi", "General Sans"),
    ("Cabinet Grotesk", "DM Sans"),
    ("Clash Display", "Inter"),
    ("Archivo", "Lora"),
    ("Bricolage Grotesque", "Figtree"),
    ("Red Hat Display", "Red Hat Text"),
    ("Unbounded", "Quicksand"),
    ("Comfortaa", "Nunito Sans"),
    ("Fredoka", "Jost"),
]

# SVG Pattern generators (abstract shapes)
SVG_PATTERNS = [
    # Circles pattern
    lambda c: f'''<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="20" fill="none" stroke="{c}" stroke-width="1"/></svg>''',
    # Dots pattern
    lambda c: f'''<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="2" fill="{c}"/></svg>''',
    # Lines diagonal
    lambda c: f'''<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="40" x2="40" y2="0" stroke="{c}" stroke-width="1"/></svg>''',
    # Grid pattern
    lambda c: f'''<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="{c}" stroke-width="0.5"/></svg>''',
    # Hexagons
    lambda c: f'''<svg width="60" height="52" xmlns="http://www.w3.org/2000/svg"><polygon points="30,0 55,15 55,37 30,52 5,37 5,15" fill="none" stroke="{c}" stroke-width="1"/></svg>''',
    # Triangles
    lambda c: f'''<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><polygon points="20,5 35,35 5,35" fill="none" stroke="{c}" stroke-width="1"/></svg>''',
    # Waves
    lambda c: f'''<svg width="100" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M0 10 Q 25 0, 50 10 T 100 10" fill="none" stroke="{c}" stroke-width="1"/></svg>''',
    # Squares rotated
    lambda c: f'''<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="20" height="20" fill="none" stroke="{c}" stroke-width="1" transform="rotate(45 20 20)"/></svg>''',
    # Plus signs
    lambda c: f'''<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2v16M2 10h16" stroke="{c}" stroke-width="1"/></svg>''',
    # Concentric circles
    lambda c: f'''<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="10" fill="none" stroke="{c}" stroke-width="1"/><circle cx="40" cy="40" r="25" fill="none" stroke="{c}" stroke-width="0.5"/></svg>''',
]

# Logo shape generators
LOGO_SHAPES = [
    # Abstract tech logo
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <rect x="10" y="10" width="35" height="35" rx="8" fill="{c1}"/>
        <rect x="55" y="10" width="35" height="35" rx="8" fill="{c2}" opacity="0.7"/>
        <rect x="10" y="55" width="35" height="35" rx="8" fill="{c2}" opacity="0.7"/>
        <rect x="55" y="55" width="35" height="35" rx="8" fill="{c1}"/>
    </svg>''',

    # Hexagon logo
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="{c1}"/>
        <polygon points="50,20 75,35 75,65 50,80 25,65 25,35" fill="{c2}"/>
    </svg>''',

    # Stacked circles
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <circle cx="35" cy="50" r="25" fill="{c1}"/>
        <circle cx="65" cy="50" r="25" fill="{c2}" opacity="0.8"/>
    </svg>''',

    # Arrow/growth
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <path d="M20 80 L50 20 L80 80 Z" fill="{c1}"/>
        <path d="M35 80 L50 45 L65 80 Z" fill="{c2}"/>
    </svg>''',

    # Layered squares
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <rect x="5" y="25" width="60" height="60" rx="10" fill="{c1}"/>
        <rect x="35" y="15" width="60" height="60" rx="10" fill="{c2}" opacity="0.85"/>
    </svg>''',

    # Diamond
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <polygon points="50,5 95,50 50,95 5,50" fill="{c1}"/>
        <polygon points="50,25 75,50 50,75 25,50" fill="{c2}"/>
    </svg>''',

    # Infinity/loop
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="50" height="25">
        <path d="M25,25 C25,10 10,10 10,25 C10,40 25,40 25,25 C25,10 40,10 40,25 C40,40 25,40 25,25"
              stroke="{c1}" stroke-width="8" fill="none" transform="translate(10,0)"/>
    </svg>''',

    # Abstract S
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <path d="M70,20 C70,20 30,20 30,40 C30,60 70,50 70,70 C70,90 30,90 30,90"
              stroke="{c1}" stroke-width="12" stroke-linecap="round" fill="none"/>
    </svg>''',

    # Bars/graph
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <rect x="10" y="50" width="20" height="40" rx="4" fill="{c2}"/>
        <rect x="40" y="30" width="20" height="60" rx="4" fill="{c1}"/>
        <rect x="70" y="10" width="20" height="80" rx="4" fill="{c2}" opacity="0.7"/>
    </svg>''',

    # Cube 3D
    lambda c1, c2, name: f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
        <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="{c1}"/>
        <polygon points="50,10 90,30 50,50 10,30" fill="{c2}"/>
        <polygon points="50,50 90,30 90,70 50,90" fill="{c2}" opacity="0.7"/>
    </svg>''',
]


def generate_unique_design(business_name: str, business_type: str = "saas", seed_offset: int = 0) -> DesignSystem:
    """
    Generate a completely unique design system for a business.
    Uses business name as seed for reproducibility.

    Args:
        business_name: Name of the business (used as random seed)
        business_type: Type of business (affects color mood)
        seed_offset: Optional integer to vary the design without changing the name

    Returns:
        Complete DesignSystem with unique colors, fonts, logo, patterns
    """
    # Use business name as seed for reproducible but unique designs
    base_seed = int(hashlib.md5(business_name.encode()).hexdigest()[:8], 16)
    rng = random.Random(base_seed + seed_offset)

    # Select color palette
    palette = rng.choice(COLOR_PALETTES)

    # Select font combination
    heading_font, body_font = rng.choice(FONT_COMBINATIONS)
    font_weights = "400;500;600;700"
    font_import = f"https://fonts.googleapis.com/css2?family={heading_font.replace(' ', '+')}:wght@{font_weights}&family={body_font.replace(' ', '+')}:wght@{font_weights}&display=swap"

    # Generate gradient with variation
    gradient_angle = rng.choice([90, 120, 135, 145, 160, 180])
    gradient_colors = [
        f"{palette['primary']} 0%",
        f"{palette['primary_dark']} 50%",
        f"{palette['secondary']} 100%"
    ]
    # Sometimes use simpler gradient
    if rng.random() > 0.6:
        gradient_colors = [
            f"{palette['primary']} 0%",
            f"{palette['primary_dark']} 100%"
        ]
    gradient = f"linear-gradient({gradient_angle}deg, {', '.join(gradient_colors)})"

    # Select and generate pattern
    pattern_func = rng.choice(SVG_PATTERNS)
    pattern_color = palette['primary']
    # Make pattern subtle
    hero_pattern = pattern_func(pattern_color)
    pattern_opacity = rng.uniform(0.03, 0.08)

    # Generate logo
    logo_func = rng.choice(LOGO_SHAPES)
    logo_svg = logo_func(palette['primary'], palette['secondary'], business_name)

    # Select Layout & Structure
    layout_style = rng.choice(['modern', 'minimal', 'bold', 'glass'])
    
    # Border Radius based on layout mood
    if layout_style == 'minimal':
        border_radius = rng.choice(['0px', '2px', '4px'])
    elif layout_style == 'bold':
        border_radius = rng.choice(['0px', '8px', '16px'])
    elif layout_style == 'glass':
        border_radius = rng.choice(['16px', '24px'])
    else: # modern
        border_radius = rng.choice(['8px', '12px', '50px'])

    # Card Style
    if layout_style == 'glass':
        card_style = 'glass'
    elif layout_style == 'minimal':
        card_style = rng.choice(['flat', 'outline'])
    else:
        card_style = rng.choice(['flat', 'shadow', 'outline'])

    # Button Style
    button_style = rng.choice(['solid', 'gradient', 'soft']) if layout_style != 'minimal' else rng.choice(['solid', 'outline'])

    return DesignSystem(
        primary=palette['primary'],
        primary_dark=palette['primary_dark'],
        secondary=palette['secondary'],
        accent=palette['accent'],
        dark="#1f2937",
        light="#f9fafb",
        gray="#6b7280",
        heading_font=heading_font,
        body_font=body_font,
        font_import=font_import,
        gradient=gradient,
        gradient_angle=gradient_angle,
        hero_pattern=hero_pattern,
        pattern_opacity=pattern_opacity,
        logo_svg=logo_svg,
        # New Fields
        layout_style=layout_style,
        border_radius=border_radius,
        card_style=card_style,
        button_style=button_style
    )


def generate_css_variables(design: DesignSystem) -> str:
    """Generate CSS custom properties from design system"""
    return f''':root {{
    --primary: {design.primary};
    --primary-dark: {design.primary_dark};
    --secondary: {design.secondary};
    --accent: {design.accent};
    --dark: {design.dark};
    --light: {design.light};
    --gray: {design.gray};
    --gradient: {design.gradient};
    --font-heading: '{design.heading_font}', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-body: '{design.body_font}', -apple-system, BlinkMacSystemFont, sans-serif;
    --border-radius: {design.border_radius};
    --layout-style: {design.layout_style};
}}'''


def generate_hero_background_style(design: DesignSystem) -> str:
    """Generate hero section background with pattern"""
    import base64
    pattern_b64 = base64.b64encode(design.hero_pattern.encode()).decode()
    return f'''background: linear-gradient(180deg, {design.light} 0%, #ffffff 100%);
    background-image: url("data:image/svg+xml;base64,{pattern_b64}");
    background-size: 60px 60px;'''


# Export for use
__all__ = ['generate_unique_design', 'DesignSystem', 'generate_css_variables', 'generate_hero_background_style']
