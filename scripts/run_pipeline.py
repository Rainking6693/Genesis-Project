#!/usr/bin/env python3
"""
Genesis Autonomous Business Pipeline - Entry Point

Run the complete Genesis Pipeline for autonomous business generation:
- Research → Design → Build → Test → Deploy → Verify → Automate → Evolve

Usage:
    python scripts/run_pipeline.py --business-type saas --target-market developers
    python scripts/run_pipeline.py --business-type marketplace --target-market freelancers --name my-marketplace

Features:
    - Claude (Opus 4.5) as Primary LLM orchestrator
    - 16 SuperClaude agents for specialized tasks
    - Codex as Lead Developer (via Roundtable)
    - Gemini as Lead QA (via Roundtable)
    - Genesis Meta Agent + SE-Darwin for evolution
    - AG-UI for real-time visualization
    - n8n for post-deployment automation
    - Orchestrator gate system - no task proceeds without approval
"""

import asyncio
import argparse
import logging
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

from infrastructure.genesis_pipeline import GenesisPipeline, PipelineStatus


def setup_logging(verbose: bool = False):
    """Configure logging"""
    level = logging.DEBUG if verbose else logging.INFO

    # Create logs directory
    log_dir = project_root / "logs"
    log_dir.mkdir(exist_ok=True)

    # Log filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"pipeline_{timestamp}.log"

    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )

    return log_file


def print_banner():
    """Print Genesis Pipeline banner"""
    banner = """
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗                       ║
║  ██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝                       ║
║  ██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗                       ║
║  ██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║                       ║
║  ╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║                       ║
║   ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝                       ║
║                                                                               ║
║              AUTONOMOUS BUSINESS PIPELINE                                     ║
║                                                                               ║
║  Claude (Opus 4.5) • 16 SuperClaude Agents • Codex • Gemini • SE-Darwin      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """
    print(banner)


def print_stage_progress(stage_name: str, gate: int, status: str):
    """Print stage progress indicator"""
    status_icons = {
        "pending": "⏳",
        "running": "🔄",
        "passed": "✅",
        "failed": "❌",
        "revise": "🔁"
    }
    icon = status_icons.get(status, "•")
    print(f"  {icon} Gate {gate}: {stage_name} [{status.upper()}]")


async def run_pipeline(args):
    """Run the Genesis Pipeline"""
    print_banner()

    # Setup logging
    log_file = setup_logging(args.verbose)
    print(f"\n📝 Logging to: {log_file}")

    # Configuration summary
    print("\n" + "=" * 60)
    print("PIPELINE CONFIGURATION")
    print("=" * 60)
    print(f"  Business Type:    {args.business_type}")
    print(f"  Target Market:    {args.target_market}")
    print(f"  Name:             {args.name or 'auto-generated'}")
    print(f"  Platform:         {args.platform}")
    print(f"  AG-UI:            {'enabled' if args.agui else 'disabled'}")
    print(f"  Roundtable:       {'enabled' if args.roundtable else 'disabled'}")
    print(f"  Evolution:        {'enabled' if args.evolution else 'disabled'}")
    print(f"  n8n:              {'enabled' if args.n8n else 'disabled'}")
    print(f"  Strict Gates:     {'yes' if args.strict else 'no'}")
    print("=" * 60)

    if args.agui:
        print("\n🖥️  AG-UI Dashboard: http://localhost:3000")
        print("   Run `cd tools/ag-ui && npm run dev` in another terminal")

    # Confirm before proceeding
    if not args.yes:
        response = input("\n🚀 Start pipeline? [Y/n]: ").strip().lower()
        if response and response != 'y':
            print("Aborted.")
            return

    # Initialize pipeline
    print("\n🔧 Initializing Genesis Pipeline...")
    pipeline = GenesisPipeline(
        enable_agui=args.agui,
        enable_roundtable=args.roundtable,
        enable_evolution=args.evolution,
        enable_n8n=args.n8n,
        strict_gates=args.strict
    )

    # Run pipeline
    print("\n" + "=" * 60)
    print("PIPELINE EXECUTION")
    print("=" * 60)

    start_time = datetime.now()

    try:
        result = await pipeline.run(
            business_type=args.business_type,
            target_market=args.target_market,
            name=args.name,
            features=args.features.split(",") if args.features else None,
            platform=args.platform,
            description=args.description or f"A {args.business_type} for {args.target_market}"
        )

        duration = (datetime.now() - start_time).total_seconds()

        # Print results
        print("\n" + "=" * 60)
        print("PIPELINE RESULTS")
        print("=" * 60)

        if result.status == PipelineStatus.COMPLETED:
            print(f"\n✅ PIPELINE COMPLETED SUCCESSFULLY!")
        else:
            print(f"\n❌ PIPELINE {result.status.value.upper()}")

        print(f"\n📊 Summary:")
        print(f"   Run ID:          {result.run_id}")
        print(f"   Business:        {result.business_spec.name}")
        print(f"   Duration:        {duration:.1f}s")
        print(f"   Stages:          {len(result.stage_outputs)}/8")

        # Gate results
        print(f"\n🚪 Gate Results:")
        for gate_num, evaluation in sorted(result.gate_evaluations.items()):
            status_icon = "✅" if evaluation.result.value == "pass" else "❌"
            print(f"   {status_icon} Gate {gate_num}: {evaluation.result.value.upper()} (score: {evaluation.score:.1f})")

        # Live URL
        if result.live_url:
            print(f"\n🌐 LIVE URL: {result.live_url}")

        # Errors
        if result.errors:
            print(f"\n⚠️  Errors:")
            for error in result.errors[:5]:
                print(f"   • {error}")

        print("\n" + "=" * 60)

        return 0 if result.status == PipelineStatus.COMPLETED else 1

    except KeyboardInterrupt:
        print("\n\n⛔ Pipeline interrupted by user")
        return 130

    except Exception as e:
        logging.exception("Pipeline error")
        print(f"\n💥 Pipeline error: {e}")
        return 1


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Genesis Autonomous Business Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --business-type saas --target-market developers
  %(prog)s --business-type marketplace --target-market freelancers --name my-market
  %(prog)s --business-type saas --target-market startups --no-roundtable --no-n8n

Business Types:
  saas, marketplace, content, analytics, automation,
  education, social, ecommerce, ai, fintech
        """
    )

    # Required arguments
    parser.add_argument(
        "--business-type", "-t",
        required=True,
        choices=["saas", "marketplace", "content", "analytics", "automation",
                 "education", "social", "ecommerce", "ai", "fintech"],
        help="Type of business to generate"
    )

    parser.add_argument(
        "--target-market", "-m",
        required=True,
        help="Target market description (e.g., 'developers', 'freelancers')"
    )

    # Optional arguments
    parser.add_argument(
        "--name", "-n",
        help="Business name (auto-generated if not specified)"
    )

    parser.add_argument(
        "--description", "-d",
        help="Business description"
    )

    parser.add_argument(
        "--features", "-f",
        help="Comma-separated list of features"
    )

    parser.add_argument(
        "--platform", "-p",
        default="github-pages",
        choices=["github-pages", "railway", "render", "fly"],
        help="Deployment platform (default: github-pages)"
    )

    # Feature flags
    parser.add_argument(
        "--agui", "--ag-ui",
        action="store_true",
        default=True,
        help="Enable AG-UI real-time visualization (default: enabled)"
    )

    parser.add_argument(
        "--no-agui",
        action="store_false",
        dest="agui",
        help="Disable AG-UI visualization"
    )

    parser.add_argument(
        "--roundtable",
        action="store_true",
        default=True,
        help="Enable Roundtable for Codex/Gemini (default: enabled)"
    )

    parser.add_argument(
        "--no-roundtable",
        action="store_false",
        dest="roundtable",
        help="Disable Roundtable integration"
    )

    parser.add_argument(
        "--evolution",
        action="store_true",
        default=True,
        help="Enable SE-Darwin evolution (default: enabled)"
    )

    parser.add_argument(
        "--no-evolution",
        action="store_false",
        dest="evolution",
        help="Disable evolution"
    )

    parser.add_argument(
        "--n8n",
        action="store_true",
        default=True,
        help="Enable n8n workflow automation (default: enabled)"
    )

    parser.add_argument(
        "--no-n8n",
        action="store_false",
        dest="n8n",
        help="Disable n8n automation"
    )

    parser.add_argument(
        "--strict",
        action="store_true",
        default=True,
        help="Strict gate enforcement - halt on failure (default: enabled)"
    )

    parser.add_argument(
        "--no-strict",
        action="store_false",
        dest="strict",
        help="Non-strict mode - continue on gate failure"
    )

    # Control flags
    parser.add_argument(
        "-y", "--yes",
        action="store_true",
        help="Skip confirmation prompt"
    )

    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )

    args = parser.parse_args()

    # Run pipeline
    exit_code = asyncio.run(run_pipeline(args))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
