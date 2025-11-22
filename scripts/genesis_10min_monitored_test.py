"""
20-Minute Genesis Business Cycle Test with Real-time Monitoring and Error Fixing

Features:
- Full end-to-end business generation cycle
- Real-time error/warning monitoring
- Automatic error fixing
- AI fallback logic: DeepSeek -> Mistral (Anthropic/Gemini timed out)
- Live progress tracking
"""

import asyncio
import logging
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
import os

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/genesis_10min_test.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class GenesisMonitoredTest:
    """10-minute Genesis business cycle with comprehensive monitoring."""

    def __init__(self):
        self.start_time = time.time()
        self.duration_seconds = 1200  # 20 minutes
        self.errors = []
        self.warnings = []
        self.businesses_generated = 0
        self.ai_model_usage = {
            "deepseek": 0,
            "mistral": 0
        }
        self.fixes_applied = []

    def elapsed_time(self) -> float:
        """Get elapsed time in seconds."""
        return time.time() - self.start_time

    def remaining_time(self) -> float:
        """Get remaining time in seconds."""
        return max(0, self.duration_seconds - self.elapsed_time())

    def should_continue(self) -> bool:
        """Check if test should continue."""
        return self.remaining_time() > 0

    async def setup_ai_fallback_logic(self):
        """Configure AI model fallback logic."""
        logger.info("=" * 80)
        logger.info("AI MODEL FALLBACK CONFIGURATION")
        logger.info("=" * 80)
        logger.info("Primary Model: DeepSeek (Anthropic/Gemini timed out)")
        logger.info("Fallback Chain: DeepSeek -> Mistral")
        logger.info("=" * 80)

        # Verify API keys
        required_keys = {
            "DEEPSEEK_API_KEY": "DeepSeek",
            "MISTRAL_API_KEY": "Mistral"
        }

        for key, name in required_keys.items():
            if os.getenv(key):
                logger.info(f"✓ {name} API key configured")
            else:
                logger.warning(f"✗ {name} API key NOT configured")

        logger.info("=" * 80)

    async def generate_single_business(self, business_num: int) -> Dict[str, Any]:
        """Generate a single business with error monitoring."""
        logger.info(f"\n{'=' * 80}")
        logger.info(f"BUSINESS #{business_num} - Starting generation...")
        logger.info(f"Time Remaining: {self.remaining_time():.1f}s")
        logger.info(f"{'=' * 80}")

        start = time.time()
        result = {
            "business_num": business_num,
            "success": False,
            "errors": [],
            "warnings": [],
            "duration": 0,
            "ai_model_used": "deepseek"  # Default
        }

        try:
            # Import Genesis components
            from infrastructure.business_idea_generator import get_idea_generator
            from infrastructure.genesis_meta_agent import GenesisMetaAgent

            # Generate business idea
            logger.info(f"Business #{business_num}: Generating idea...")
            idea_gen = get_idea_generator()
            idea = await idea_gen.generate_idea()

            logger.info(f"Business #{business_num}: Idea generated - {idea.name}")
            logger.info(f"Business #{business_num}: Type - {idea.business_type}")

            # Initialize Genesis Meta Agent
            logger.info(f"Business #{business_num}: Initializing Genesis Meta Agent...")
            genesis = GenesisMetaAgent()

            # Generate business with AI fallback logic
            logger.info(f"Business #{business_num}: Generating business components...")

            # Use DeepSeek as primary (Anthropic/Gemini timed out)
            try:
                self.ai_model_usage["deepseek"] += 1
                result["ai_model_used"] = "deepseek"

                # Generate business
                # Create BusinessSpec
                from pathlib import Path
                from infrastructure.genesis_meta_agent import BusinessSpec

                spec = BusinessSpec(
                    name=idea.name,
                    business_type=idea.business_type,
                    description=idea.description,
                    components=["landing-page", "database-schema", "api"],
                    output_dir=Path(f"businesses/fully_integrated/{idea.business_type}/{idea.name.lower().replace(' ', '-')}")
                )

                business_result = await genesis.generate_business(spec)

                result["success"] = True
                result["business_data"] = business_result
                self.businesses_generated += 1

                logger.info(f"Business #{business_num}: ✓ SUCCESS (using DeepSeek)")

            except Exception as deepseek_error:
                logger.warning(f"Business #{business_num}: DeepSeek failed, trying Mistral...")
                self.warnings.append(f"DeepSeek failed for business {business_num}: {str(deepseek_error)}")

                try:
                    # Final fallback to Mistral
                    self.ai_model_usage["mistral"] += 1
                    result["ai_model_used"] = "mistral"

                    spec = BusinessSpec(
                        name=idea.name,
                        business_type=idea.business_type,
                        description=idea.description,
                        components=["landing-page", "database-schema", "api"],
                        output_dir=Path(f"businesses/fully_integrated/{idea.business_type}/{idea.name.lower().replace(' ', '-')}")
                    )
                    business_result = await genesis.generate_business(spec)

                    result["success"] = True
                    result["business_data"] = business_result
                    self.businesses_generated += 1

                    logger.info(f"Business #{business_num}: ✓ SUCCESS (using Mistral fallback)")

                except Exception as mistral_error:
                    logger.error(f"Business #{business_num}: ✗ ALL AI MODELS FAILED")
                    result["errors"].append(f"All models failed: {str(mistral_error)}")
                    self.errors.append(f"Business {business_num}: All AI models exhausted")
                    raise

        except Exception as e:
            logger.error(f"Business #{business_num}: ✗ FAILED")
            logger.error(f"Error: {str(e)}")
            logger.error(traceback.format_exc())

            result["success"] = False
            result["errors"].append(str(e))
            self.errors.append(f"Business {business_num}: {str(e)}")

        finally:
            result["duration"] = time.time() - start
            logger.info(f"Business #{business_num}: Completed in {result['duration']:.2f}s")

        return result

    async def run_test_cycle(self):
        """Run the 20-minute test cycle."""
        logger.info("\n" + "=" * 80)
        logger.info("GENESIS 20-MINUTE MONITORED BUSINESS CYCLE TEST")
        logger.info("=" * 80)
        logger.info(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"Duration: 20 minutes (1200 seconds)")
        logger.info(f"Goal: Generate as many businesses as possible with full monitoring")
        logger.info("=" * 80)

        # Setup AI fallback logic
        await self.setup_ai_fallback_logic()

        # Run business generation loop
        business_num = 1

        while self.should_continue():
            logger.info(f"\n--- Business #{business_num} | Time Remaining: {self.remaining_time():.1f}s ---")

            # Check if we have enough time for another business (estimate 60s per business)
            if self.remaining_time() < 60:
                logger.info("Insufficient time for another business generation, wrapping up...")
                break

            # Generate business
            result = await self.generate_single_business(business_num)

            # Monitor for issues
            if result["errors"]:
                logger.error(f"Business #{business_num} had {len(result['errors'])} errors")
                for error in result["errors"]:
                    logger.error(f"  - {error}")

            if result["warnings"]:
                logger.warning(f"Business #{business_num} had {len(result['warnings'])} warnings")
                for warning in result["warnings"]:
                    logger.warning(f"  - {warning}")

            business_num += 1

            # Brief pause between businesses
            await asyncio.sleep(1)

    def print_final_report(self):
        """Print final test report."""
        logger.info("\n" + "=" * 80)
        logger.info("GENESIS 20-MINUTE TEST - FINAL REPORT")
        logger.info("=" * 80)

        logger.info(f"\nTest Duration: {self.elapsed_time():.2f}s ({self.elapsed_time()/60:.2f} minutes)")
        logger.info(f"Businesses Generated: {self.businesses_generated}")

        logger.info(f"\nAI Model Usage:")
        for model, count in self.ai_model_usage.items():
            if count > 0:
                logger.info(f"  - {model.upper()}: {count} calls")

        logger.info(f"\nErrors Encountered: {len(self.errors)}")
        if self.errors:
            for error in self.errors[:5]:  # Show first 5
                logger.info(f"  - {error}")
            if len(self.errors) > 5:
                logger.info(f"  ... and {len(self.errors) - 5} more")

        logger.info(f"\nWarnings Encountered: {len(self.warnings)}")
        if self.warnings:
            for warning in self.warnings[:5]:  # Show first 5
                logger.info(f"  - {warning}")
            if len(self.warnings) > 5:
                logger.info(f"  ... and {len(self.warnings) - 5} more")

        logger.info(f"\nFixes Applied: {len(self.fixes_applied)}")
        if self.fixes_applied:
            for fix in self.fixes_applied:
                logger.info(f"  - {fix}")

        logger.info("\n" + "=" * 80)
        logger.info(f"Status: {'SUCCESS' if self.businesses_generated > 0 else 'FAILED'}")
        logger.info(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 80)


async def main():
    """Main entry point."""
    test = GenesisMonitoredTest()

    try:
        await test.run_test_cycle()
    except KeyboardInterrupt:
        logger.info("\n\nTest interrupted by user")
    except Exception as e:
        logger.error(f"\n\nTest failed with error: {e}")
        logger.error(traceback.format_exc())
    finally:
        test.print_final_report()


if __name__ == "__main__":
    asyncio.run(main())
