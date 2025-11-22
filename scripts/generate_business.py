#!/usr/bin/env python3
"""
Business Generation CLI Script

Usage:
    python scripts/generate_business.py --business ecommerce
    python scripts/generate_business.py --business content
    python scripts/generate_business.py --business saas
    python scripts/generate_business.py --all  # Generate all 3
"""
import asyncio
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# CRITICAL: Load .env file FIRST
from infrastructure.load_env import load_genesis_env
load_genesis_env()

from infrastructure.genesis_meta_agent import GenesisMetaAgent, BusinessSpec

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

BUSINESS_SPECS = {
    "ecommerce": {
        "name": "TechGear Store",
        "type": "ecommerce",
        "description": "Complete e-commerce store for tech accessories",
        "components": []
    },
    "content": {
        "name": "DevInsights Blog",
        "type": "content",
        "description": "Content platform for software development insights",
        "components": []
    },
    "saas": {
        "name": "TaskFlow Pro",
        "type": "saas",
        "description": "SaaS project management tool for small teams",
        "components": []
    }
}

async def generate_single_business(business_type: str, output_dir: str = "businesses"):
    """Generate a single business."""
    if business_type not in BUSINESS_SPECS:
        print(f"Error: Unknown business type '{business_type}'")
        print(f"Valid types: {', '.join(BUSINESS_SPECS.keys())}")
        return None
    
    spec_data = BUSINESS_SPECS[business_type]
    
    spec = BusinessSpec(
        name=spec_data["name"],
        business_type=spec_data["type"],
        description=spec_data["description"],
        components=spec_data["components"],
        output_dir=Path(output_dir) / business_type
    )
    
    meta_agent = GenesisMetaAgent(use_local_llm=True)
    
    print(f"\n{'='*60}")
    print(f"Generating Business: {spec.name}")
    print(f"Type: {spec.business_type}")
    print(f"Output: {spec.output_dir}")
    print(f"{'='*60}\n")
    
    result = await meta_agent.generate_business(spec)
    
    print(f"\n{'='*60}")
    print(f"GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"Business: {result.business_name}")
    print(f"Success: {'✅ YES' if result.success else '❌ NO'}")
    print(f"Tasks Completed: {result.tasks_completed}")
    print(f"Tasks Failed: {result.tasks_failed}")
    print(f"Time: {result.generation_time_seconds:.1f}s ({result.generation_time_seconds/60:.1f} minutes)")
    print(f"Output Directory: {result.output_directory}")
    cost = result.metrics.get('cost_usd', 0.0)
    cost_source = "Vertex AI" if cost > 0.0 else "local LLM"
    print(f"Cost: ${cost:.4f} ({cost_source})")
    
    if result.errors:
        print(f"\nErrors:")
        for error in result.errors:
            print(f"  - {error}")
    
    print(f"{'='*60}\n")
    
    return result

async def generate_all_businesses(output_dir: str = "businesses", parallel: bool = True):
    """Generate all 3 businesses."""
    print(f"\n{'='*70}")
    print(f"GENERATING ALL 3 BUSINESSES")
    print(f"Mode: {'PARALLEL' if parallel else 'SEQUENTIAL'}")
    print(f"{'='*70}\n")
    
    if parallel:
        # Generate all 3 in parallel
        tasks = [
            generate_single_business("ecommerce", output_dir),
            generate_single_business("content", output_dir),
            generate_single_business("saas", output_dir)
        ]
        results = await asyncio.gather(*tasks)
    else:
        # Generate sequentially
        results = []
        for business_type in ["ecommerce", "content", "saas"]:
            result = await generate_single_business(business_type, output_dir)
            results.append(result)
    
    # Summary
    print(f"\n{'='*70}")
    print(f"ALL BUSINESSES GENERATED")
    print(f"{'='*70}")
    
    total_time = sum(r.generation_time_seconds for r in results if r)
    successful = sum(1 for r in results if r and r.success)
    total_cost = sum(r.metrics.get('cost_usd', 0.0) for r in results if r)
    cost_source = "Vertex AI" if total_cost > 0.0 else "local LLM"
    
    print(f"Total Time: {total_time:.1f}s ({total_time/60:.1f} minutes)")
    print(f"Successful: {successful}/3")
    print(f"Total Cost: ${total_cost:.4f} ({cost_source})")
    print(f"Output: {output_dir}/")
    print(f"{'='*70}\n")
    
    return results

def main():
    parser = argparse.ArgumentParser(description="Generate businesses with Genesis Meta-Agent")
    parser.add_argument("--business", type=str, choices=["ecommerce", "content", "saas"],
                       help="Business type to generate")
    parser.add_argument("--all", action="store_true",
                       help="Generate all 3 businesses")
    parser.add_argument("--parallel", action="store_true", default=True,
                       help="Generate all businesses in parallel (default: True)")
    parser.add_argument("--output-dir", type=str, default="businesses",
                       help="Output directory (default: businesses)")
    
    args = parser.parse_args()
    
    if args.all:
        asyncio.run(generate_all_businesses(args.output_dir, args.parallel))
    elif args.business:
        asyncio.run(generate_single_business(args.business, args.output_dir))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
