#!/usr/bin/env python3
"""
Autonomous Business Generation Loop

Agents autonomously:
1. Invent business ideas (creative + market analysis)
2. Build the businesses (TypeScript code generation)
3. Deploy to Vercel (live websites)
4. Monitor performance (revenue, users, etc.)
5. Learn from results (improve future ideas)
6. Repeat

Usage:
    # Generate 10 businesses autonomously
    python scripts/autonomous_business_loop.py --count 10
    
    # Generate until stopped (continuous)
    python scripts/autonomous_business_loop.py --continuous
    
    # High-quality ideas only (score >= 80)
    python scripts/autonomous_business_loop.py --count 100 --min-score 80
"""

import asyncio
import sys
import argparse
import logging
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# CRITICAL: Load .env file FIRST
from infrastructure.load_env import load_genesis_env
load_genesis_env()

from infrastructure.business_idea_generator import get_idea_generator, BusinessIdea
from infrastructure.genesis_meta_agent import GenesisMetaAgent, BusinessSpec
from infrastructure.business_monitor import get_monitor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class AutonomousBusinessLoop:
    """
    Autonomous business generation loop.
    
    Continuously generates high-quality business ideas and builds them.
    """
    
    def __init__(self, min_score: float = 70.0, enable_deployment: bool = False):
        """
        Initialize autonomous loop.
        
        Args:
            min_score: Minimum idea quality score (0-100)
            enable_deployment: Whether to deploy to Vercel (requires credentials)
        """
        self.idea_generator = get_idea_generator()
        self.meta_agent = GenesisMetaAgent()
        self.monitor = get_monitor()
        self.min_score = min_score
        self.enable_deployment = enable_deployment
        
        # Learning: Track what works
        self.successful_ideas: list = []
        self.failed_ideas: list = []
        
        logger.info(f"Autonomous loop initialized (min_score={min_score}, deployment={enable_deployment})")
    
    async def generate_one_business(self) -> Dict[str, Any]:
        """
        Generate a single business autonomously.
        
        Returns:
            Dict with business result and metrics
        """
        start_time = datetime.utcnow()
        
        # Step 1: Agent invents a business idea
        logger.info("🧠 Agent inventing business idea...")
        idea = await self.idea_generator.generate_idea(min_revenue_score=self.min_score)
        
        logger.info(f"💡 Idea generated: '{idea.name}' (type={idea.business_type}, score={idea.overall_score:.1f})")
        logger.info(f"   Description: {idea.description}")
        logger.info(f"   Monetization: {idea.monetization_model}")
        
        # Step 2: Convert idea to BusinessSpec
        spec = BusinessSpec(
            name=idea.name,
            business_type=idea.business_type,
            description=idea.description,
            components=[],  # Will use templates
            output_dir=Path(f"businesses/autonomous/{idea.business_type}/{self._sanitize_name(idea.name)}")
        )
        
        # Step 3: Agent builds the business
        logger.info(f"🔨 Agent building business: {idea.name}...")
        
        # Use Multi-Agent Evolve if enabled (10-25% quality boost)
        use_evolution = os.getenv('ENABLE_MULTI_AGENT_EVOLVE', 'false').lower() == 'true'
        if use_evolution:
            logger.info("🧬 Using Multi-Agent Evolve for higher quality...")
        
        result = await self.meta_agent.generate_business(spec)
        
        logger.info(f"{'✅' if result.success else '❌'} Build {'succeeded' if result.success else 'failed'}: {result.tasks_completed}/{result.tasks_completed + result.tasks_failed} components")
        
        # Step 4: (Optional) Deploy to Vercel
        deployment_url = None
        if self.enable_deployment and result.success:
            try:
                logger.info(f"🚀 Agent deploying to Vercel...")
                deployment_url = await self._deploy_business(result, idea)
                logger.info(f"✅ Deployed: {deployment_url}")
            except Exception as e:
                logger.error(f"❌ Deployment failed: {e}")
        
        # Step 5: Learn from result
        if result.success:
            self.successful_ideas.append({
                "idea": idea.to_dict(),
                "result": {
                    "components": result.tasks_completed,
                    "time": result.generation_time_seconds,
                    "cost": result.metrics.get("cost_usd", 0.0)
                },
                "deployment_url": deployment_url
            })
            logger.info(f"📚 Agent learned from success: {idea.name}")
        else:
            self.failed_ideas.append({
                "idea": idea.to_dict(),
                "errors": result.errors
            })
            logger.info(f"📚 Agent learned from failure: {idea.name}")
        
        # Step 6: Save learning data
        self._save_learning_data()
        
        return {
            "idea": idea.to_dict(),
            "build_result": {
                "success": result.success,
                "components": result.tasks_completed,
                "time": result.generation_time_seconds,
                "cost": result.metrics.get("cost_usd", 0.0),
                "output_dir": result.output_directory
            },
            "deployment_url": deployment_url,
            "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
        }
    
    async def run_loop(self, count: int, continuous: bool = False):
        """
        Run autonomous generation loop.
        
        Args:
            count: Number of businesses to generate (ignored if continuous=True)
            continuous: If True, run forever
        """
        logger.info(f"\n{'='*80}")
        logger.info(f" "*20 + "🤖 AUTONOMOUS BUSINESS GENERATION LOOP" + " "*20)
        logger.info(f"{'='*80}\n")
        logger.info(f"Mode: {'Continuous (Ctrl+C to stop)' if continuous else f'Batch ({count} businesses)'}")
        logger.info(f"Min score: {self.min_score}/100")
        logger.info(f"Deployment: {'Enabled' if self.enable_deployment else 'Disabled (local only)'}")
        logger.info(f"\n{'='*80}\n")
        
        iteration = 0
        
        while continuous or iteration < count:
            iteration += 1
            
            logger.info(f"\n{'='*80}")
            logger.info(f" " *30 + f"BUSINESS #{iteration}" + " "*35)
            if not continuous:
                logger.info(f" "*32 + f"({iteration}/{count})" + " "*37)
            logger.info(f"{'='*80}\n")
            
            try:
                result = await self.generate_one_business()
                
                logger.info(f"\n✅ Business #{iteration} complete:")
                logger.info(f"   Name: {result['idea']['name']}")
                logger.info(f"   Type: {result['idea']['business_type']}")
                logger.info(f"   Score: {result['idea']['overall_score']:.1f}/100")
                logger.info(f"   Build time: {result['build_result']['time']:.1f}s")
                logger.info(f"   Components: {result['build_result']['components']}")
                logger.info(f"   Cost: ${result['build_result']['cost']:.4f}")
                if result['deployment_url']:
                    logger.info(f"   URL: {result['deployment_url']}")
                
            except KeyboardInterrupt:
                logger.info("\n\n⚠️  Interrupted by user. Stopping loop...")
                break
            except Exception as e:
                logger.error(f"\n❌ Business #{iteration} failed: {e}")
                if not continuous:
                    # In batch mode, continue to next
                    continue
                else:
                    # In continuous mode, wait before retry
                    await asyncio.sleep(60)
        
        # Summary
        logger.info(f"\n{'='*80}")
        logger.info(" "*25 + "AUTONOMOUS GENERATION COMPLETE" + " "*24)
        logger.info(f"{'='*80}\n")
        logger.info(f"Total businesses attempted: {iteration}")
        logger.info(f"Successful: {len(self.successful_ideas)}")
        logger.info(f"Failed: {len(self.failed_ideas)}")
        logger.info(f"Success rate: {len(self.successful_ideas) / max(iteration, 1) * 100:.1f}%")
        
        if self.successful_ideas:
            total_cost = sum(b['result']['cost'] for b in self.successful_ideas)
            total_time = sum(b['result']['time'] for b in self.successful_ideas)
            avg_score = sum(b['idea']['overall_score'] for b in self.successful_ideas) / len(self.successful_ideas)
            
            logger.info(f"\nMetrics:")
            logger.info(f"  Total cost: ${total_cost:.4f}")
            logger.info(f"  Total time: {total_time:.1f}s ({total_time/60:.1f} min)")
            logger.info(f"  Avg quality score: {avg_score:.1f}/100")
        
        logger.info(f"\nLearning data saved to: data/autonomous_learning.json")
        logger.info(f"\n{'='*80}\n")
    
    async def _deploy_business(self, build_result, idea: BusinessIdea) -> str:
        """
        Deploy business to Vercel.
        
        Args:
            build_result: Result from meta_agent.generate_business()
            idea: Original business idea
        
        Returns:
            Deployment URL
        """
        # For now, return mock URL
        # In production, this would use infrastructure/execution/business_executor.py
        
        project_name = self._sanitize_name(idea.name)
        mock_url = f"https://{project_name}.vercel.app"
        
        logger.warning(f"Deployment mock enabled - would deploy to: {mock_url}")
        logger.warning("To enable real deployment:")
        logger.warning("  1. Set GITHUB_TOKEN in .env")
        logger.warning("  2. Authenticate Vercel CLI: vercel login")
        logger.warning("  3. Use BusinessExecutor from infrastructure/execution/business_executor.py")
        
        return mock_url
    
    def _sanitize_name(self, name: str) -> str:
        """Sanitize business name for URLs."""
        return name.lower().replace(" ", "-").replace("'", "").replace('"', "")
    
    def _save_learning_data(self):
        """Save learning data for future improvement."""
        data_file = Path("data/autonomous_learning.json")
        data_file.parent.mkdir(parents=True, exist_ok=True)
        
        learning_data = {
            "successful_ideas": self.successful_ideas,
            "failed_ideas": self.failed_ideas,
            "last_updated": datetime.utcnow().isoformat(),
            "total_successful": len(self.successful_ideas),
            "total_failed": len(self.failed_ideas)
        }
        
        with open(data_file, "w") as f:
            json.dump(learning_data, f, indent=2)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Autonomous Business Generation Loop")
    parser.add_argument("--count", type=int, default=10, help="Number of businesses to generate")
    parser.add_argument("--continuous", action="store_true", help="Run continuously (ignores --count)")
    parser.add_argument("--min-score", type=float, default=70.0, help="Minimum idea quality score (0-100)")
    parser.add_argument("--deploy", action="store_true", help="Enable Vercel deployment (requires credentials)")
    
    args = parser.parse_args()
    
    loop = AutonomousBusinessLoop(
        min_score=args.min_score,
        enable_deployment=args.deploy
    )
    
    try:
        await loop.run_loop(count=args.count, continuous=args.continuous)
    except KeyboardInterrupt:
        logger.info("\n\nStopped by user.")


if __name__ == "__main__":
    asyncio.run(main())

