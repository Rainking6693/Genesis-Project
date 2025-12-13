"""
LLM-Driven Market Research Module

Uses Roundtable MCP (Local Claude/Codex) to perform real market discovery.
Provides semantic business naming and niche-specific analysis without external API keys.
"""

import logging
from typing import Dict, Any, List, Optional
import json
import re

from infrastructure.roundtable_interface import get_roundtable

logger = logging.getLogger(__name__)

def _extract_json(text: str) -> Dict:
    """Extract JSON from text response"""
    try:
        # Try to find JSON block
        match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        
        match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
            
        # Try to find dict structure
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
            
        return json.loads(text)
    except Exception as e:
        logger.warning(f"Failed to parse JSON: {e}")
        return {}


async def discover_market_with_claude(
    business_type: str,
    target_hint: str
) -> Dict[str, Any]:
    """
    Use Local Claude (via Roundtable) to discover real market opportunity.
    """
    
    research_prompt = f"""You are a market research analyst discovering underserved opportunities.

Business Type: {business_type}
Target Market Hint: {target_hint}

Conduct deep market research:

1. **Specific Niche Discovery**
   - Find a SPECIFIC underserved sub-segment within "{target_hint}"
   - NOT generic like "developers" - be specific like "indie game developers using Unity who struggle with multiplayer testing"
   - Consider pain points, workflows, tools they currently use

2. **Unique Value Proposition**
   - What specific problem does this niche face daily?
   - Why existing solutions fall short
   - What would make them switch to a new tool?

3. **Competitor Gap Analysis**
   - Identify 3-5 existing competitors/alternatives
   - For each: what do they do well? what gaps exist?
   - What opportunity exists in the gaps?

4. **Market Validation**
   - Estimated market size (small/medium/large)
   - How urgent is the need? (low/medium/high)
   - Willingness to pay (low/medium/high)

Return ONLY a JSON object (no markdown, no explanation):
{{
    "niche": "specific target description",
    "value_proposition": "clear benefit statement",
    "refined_market": "detailed target market description",
    "competitors": [
        {{"name": "CompetitorA", "strength": "...", "gap": "..."}}
    ],
    "market_size": "small|medium|large",
    "urgency": "low|medium|high",
    "willingness_to_pay": "low|medium|high",
    "opportunity_score": 75-95
}}"""

    try:
        # Use Roundtable to invoke Claude
        result = await get_roundtable().invoke_claude(
            instruction=research_prompt
        )
        
        if not result.success:
            logger.error(f"Roundtable market research failed: {result.errors}")
            return {"discovery_method": "failed", "niche": None}
            
        data = _extract_json(result.output)
        
        if not data:
            logger.error("Failed to parse market research JSON")
            return {"discovery_method": "failed", "niche": None}
            
        # Add metadata
        data["discovery_method"] = "claude_research"
        data["business_type"] = business_type
        
        logger.info(f"✅ Claude discovered niche: {data.get('niche')}")
        logger.info(f"✅ Value proposition: {data.get('value_proposition')}")
        
        return data
        
    except Exception as e:
        logger.error(f"Market research failed: {e}")
        return {"discovery_method": "failed", "niche": None}


async def generate_semantic_business_name(
    niche: str,
    value_proposition: str,
    business_type: str
) -> str:
    """
    Generate a semantic, brandable business name using Local Claude.
    """
    
    naming_prompt = f"""You are a brand naming expert creating memorable business names.

Niche: {niche}
Value: {value_proposition}
Type: {business_type}

Create a brandable business name that:
- Is memorable and easy to spell
- Directly relates to the niche or value proposition
- Sounds professional and trustworthy
- Is 5-15 characters
- Has NO random numbers or hashes
- Could realistically have .com available
- Follows modern SaaS naming patterns

Return ONLY a JSON object:
{{
    "name": "BrandName",
    "reasoning": "why this name works",
    "alternatives": ["Alt1", "Alt2"]
}}"""

    try:
        result = await get_roundtable().invoke_claude(
            instruction=naming_prompt
        )
        
        if not result.success:
            return _fallback_name(business_type, value_proposition)
            
        data = _extract_json(result.output)
        name = data.get("name")
        
        if not name:
            return _fallback_name(business_type, value_proposition)
            
        clean_name = name.lower().replace(" ", "").replace("-", "")
        logger.info(f"✅ Claude generated name: {clean_name}")
        
        return clean_name
        
    except Exception as e:
        logger.error(f"Claude naming failed: {e}")
        return _fallback_name(business_type, value_proposition)

def _fallback_name(prefix: str, value: str) -> str:
    """Fallback naming logic"""
    words = value.lower().split()
    key_word = next((w for w in words if len(w) > 4), "tool")
    return f"{prefix}{key_word}".replace(" ", "")[:15]


async def generate_niche_specific_features(
    niche: str,
    value_proposition: str,
    competitors: List[Dict[str, str]],
    retry_attempt: int = 0
) -> List[str]:
    """
    Generate niche-specific features using Local Claude.

    Args:
        niche: Target niche description
        value_proposition: Core value proposition
        competitors: List of competitor dicts with name/gap keys
        retry_attempt: Retry attempt number (0 = first attempt). Higher values
                       encourage more creative/different feature suggestions.
    """

    # Add creativity boost on retry to generate different content
    creativity_hint = ""
    if retry_attempt > 0:
        creativity_hints = [
            "\n\nIMPORTANT: Previous features were too generic. Be MORE SPECIFIC and CREATIVE.",
            "\n\nIMPORTANT: Generate COMPLETELY DIFFERENT features than typical SaaS products.",
            "\n\nIMPORTANT: Focus on UNIQUE, INNOVATIVE features that stand out from competitors."
        ]
        creativity_hint = creativity_hints[min(retry_attempt - 1, len(creativity_hints) - 1)]

    features_prompt = f"""You are a product designer creating features for a new {niche} tool.

Value Proposition: {value_proposition}

Competitor Gaps:
{chr(10).join(f"- {c.get('name', 'Comp')}: {c.get('gap', 'Generic')}" for c in competitors)}

Generate 6 SPECIFIC features that:
- Address the competitor gaps
- Solve real problems for {niche}
- Are NOT generic (avoid "analytics", "insights", "24/7 support", "fast integration" unless HIGHLY specific)
- Each feature should be UNIQUE and DESCRIPTIVE (10-20 words each){creativity_hint}

Return ONLY a JSON array:
["Specific Feature 1 with detailed description", "Specific Feature 2 with detailed description", ...]
"""

    try:
        result = await get_roundtable().invoke_claude(
            instruction=features_prompt
        )
        
        if not result.success:
            return _default_features(niche)
            
        features = _extract_json(result.output)
        
        if not isinstance(features, list):
            # Try to parse list from text if JSON failed
            features = [x.strip("- ").strip() for x in result.output.splitlines() if x.strip().startswith("-")]
            
        if not features:
            return _default_features(niche)
            
        logger.info(f"✅ Generated {len(features)} niche-specific features")
        return features[:6]
        
    except Exception as e:
        logger.error(f"Feature generation failed: {e}")
        return _default_features(niche)


async def generate_niche_pricing(
    niche: str,
    business_type: str
) -> List[Dict[str, Any]]:
    """
    Generate niche-appropriate pricing tiers using Local Claude.
    """
    
    pricing_prompt = f"""You are a pricing strategy expert.

Niche: {niche}
Business Type: {business_type}

Create 3 pricing tiers (Starter, Pro, Enterprise) specifically for this niche.
- Prices should reflect the market (high for B2B enterprise, low for consumer)
- Features must be relevant to the niche
- Plan names can be creative

Return ONLY a JSON array:
[
    {{"name": "Tier Name", "price": "49", "features": ["Feature 1", "Feature 2", "Feature 3"]}},
    ...
]
"""

    try:
        result = await get_roundtable().invoke_claude(
            instruction=pricing_prompt
        )
        
        if not result.success:
            return _default_pricing()
            
        pricing = _extract_json(result.output)
        
        if not isinstance(pricing, list) or len(pricing) != 3:
            return _default_pricing()
            
        logger.info(f"✅ Generated niche-specific pricing")
        return pricing
        
    except Exception as e:
        logger.error(f"Pricing generation failed: {e}")
        return _default_pricing()

def _default_pricing() -> List[Dict]:
    return [
        {"name": "Starter", "price": "9", "features": ["Basic features", "1 user", "Email support"]},
        {"name": "Professional", "price": "29", "features": ["All features", "5 users", "Priority support"]},
        {"name": "Enterprise", "price": "99", "features": ["Unlimited users", "Dedicated support", "SLA guarantee"]}
    ]

def _default_features(niche: str) -> List[str]:
    return [
        f"Optimized for {niche}",
        "Fast Integration",
        "24/7 Support",
        "Advanced Analytics",
        "Custom Workflows",
        "Secure Platform"
    ]
