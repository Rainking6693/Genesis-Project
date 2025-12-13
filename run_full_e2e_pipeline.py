"""
Full End-to-End Genesis Business Build Cycle

Runs the complete 8-stage Genesis Pipeline per specification:
1. RESEARCH (Gate 1, score >= 85)
2. DESIGN (Gate 2, score >= 85)
3. BUILD (Gate 3, score >= 85)
4. TEST (Gate 4, 100% pass rate)
5. DEPLOY (Gate 5, 100% site live)
6. VERIFY (Gate 6, score >= 95)
7. AUTOMATE (Gate 7, 100% workflows)
8. EVOLVE (Gate 8, continuous improvement)

Includes:
- 16 SuperClaude agents
- Roundtable MCP (Codex dev lead, Gemini QA lead)
- THANATOS Guardian monitoring all actions
- All 6 new optimizations active:
  * Multi-LLM Routing (63.6% cost reduction)
  * Pipelex Workflows (50% faster builds)
  * MicroAdapt Drift Detection (+12% success)
  * SPICE Integration (+9-11% evolution accuracy)
  * VOIX (10-25x browser speed)
  * A/B Testing (data-driven decisions)
"""

import asyncio
import sys
import logging
from pathlib import Path
from datetime import datetime

# Setup paths
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

# Configure logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/e2e_full_build_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


async def run_full_pipeline():
    """
    Run complete Genesis business build matching specification.
    """
    
    print("="*80)
    print("GENESIS FULL END-TO-END BUSINESS BUILD")
    print("="*80)
    print(f"Start Time: {datetime.now().isoformat()}")
    print()
    print("Pipeline Configuration:")
    print("  - 8 Stages with Guardian oversight (THANATOS)")
    print("  - 16 SuperClaude agents + Roundtable MCP (Codex/Gemini)")
    print("  - Strict gates: RESEARCH(85), DESIGN(85), BUILD(85),")
    print("                  TEST(100%), DEPLOY(100%), VERIFY(95%), AUTOMATE(100%)")
    print("  - All 6 optimizations active")
    print("="*80)
    print()
    
    try:
        from infrastructure.genesis_pipeline import GenesisPipeline, PipelineStatus
        
        # Initialize pipeline with full configuration
        logger.info("Initializing Genesis Pipeline...")
        pipeline = GenesisPipeline(
            enable_agui=True,          # AG-UI dashboard monitoring
            enable_evolution=True,      # SE-Darwin evolution
            enable_n8n=True,            # n8n workflow automation
            strict_gates=True,          # Enforce minimum scores
            skip_deploy_verification=False  # Full verification
        )
        
        logger.info("✅ Pipeline initialized")
        logger.info(f"   - AG-UI: Enabled")
        logger.info(f"   - Evolution (SE-Darwin): Enabled")
        logger.info(f"   - n8n Workflows: Enabled")
        logger.info(f"   - Strict Gates: Enabled")
        logger.info(f"   - Full Verification: Enabled")
        print()
        
        # Execute full business build
        logger.info("Starting full business build cycle...")
        logger.info("Business Type: SaaS")
        logger.info("Target Market: Developers")
        print()
        print("⏳ Running 8-stage pipeline (this may take several minutes)...")
        print()
        
        result = await pipeline.run(
            business_type='saas',
            target_market='developers',
            features=[
                'user_authentication',
                'dashboard',
                'api',
                'billing'
            ]
        )
        
        # Print results
        print()
        print("="*80)
        print("PIPELINE EXECUTION COMPLETE")
        print("="*80)
        print(f"Status: {result.status.value}")
        print(f"Business ID: {result.business_spec.business_id}")
        print(f"Business Name: {result.business_spec.name}")
        print(f"Duration: {result.duration():.1f} seconds")
        print()
        
        # Stage results
        print("Stage Results:")
        for stage_num, output in enumerate(result.stage_outputs, 1):
            status_icon = "✅" if output.success else "❌"
            print(f"  {status_icon} Stage {stage_num} ({output.stage.name}): "
                  f"Score={output.score:.1f}, Duration={output.duration_seconds:.1f}s")
        print()
        
        # Gate evaluations
        if result.gate_evaluations:
            print("Gate Evaluations (Emily - Orchestrator):")
            for gate_eval in result.gate_evaluations:
                result_icon = "✅" if gate_eval.result.value == "pass" else "❌"
                print(f"  {result_icon} Gate {gate_eval.gate}: {gate_eval.result.value.upper()} "
                      f"(Score: {gate_eval.score:.1f})")
                if gate_eval.feedback:
                    print(f"      Feedback: {gate_eval.feedback[:100]}...")
            print()
        
        # Live URL
        if result.live_url:
            print(f"🌐 Live URL: {result.live_url}")
            print()
        
        # Errors
        if result.errors:
            print("⚠️  Errors encountered:")
            for error in result.errors:
                print(f"  - {error}")
            print()
        
        # Check for new optimizations activity
        print("="*80)
        print("CHECKING NEW OPTIMIZATIONS")
        print("="*80)
        
        # Check if enhancements were used
        if hasattr(pipeline, 'genesis_meta') and pipeline.genesis_meta.enhancements:
            stats = pipeline.genesis_meta.enhancements.get_stats()
            print("OrchestratorEnhancements Stats:")
            print(f"  ✅ Pipelex workflows executed: {stats['pipelex']['workflows_executed']}")
            print(f"  ✅ Pipelex fallbacks used: {stats['pipelex']['fallbacks_used']}")
            print(f"  ✅ MicroAdapt tasks recorded: {stats['microadapt']['tasks_recorded']}")
            if 'performance_summary' in stats['microadapt']:
                perf = stats['microadapt']['performance_summary']
                print(f"  ✅ Task success rate: {perf['current_metrics']['task_success_rate']*100:.1f}%")
                print(f"  ✅ Drift events detected: {perf['drift_count']}")
            print()
        
        # Check THANATOS logs
        log_path = Path("logs/THANATOS_AUDIT.log")
        if log_path.exists():
            with open(log_path, 'r') as f:
                lines = f.readlines()
                recent = [l.strip() for l in lines[-5:] if l.strip()]
            if recent:
                print("THANATOS Guardian Activity (last 5 entries):")
                for line in recent:
                    print(f"  📊 {line[:120]}")
                print()
        
        print("="*80)
        
        # Final summary
        if result.status == PipelineStatus.COMPLETED:
            print("🎉 SUCCESS: Full business build completed!")
            print(f"   Business '{result.business_spec.name}' is now live and operational")
            return 0
        else:
            print(f"⚠️  Pipeline ended with status: {result.status.value}")
            return 1
        
    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}", exc_info=True)
        print()
        print("="*80)
        print(f"❌ PIPELINE FAILED: {e}")
        print("="*80)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    start = datetime.now()
    exit_code = asyncio.run(run_full_pipeline())
    duration = (datetime.now() - start).total_seconds()
    
    print()
    print(f"Total Execution Time: {duration:.1f}s ({duration/60:.1f} minutes)")
    print(f"End Time: {datetime.now().isoformat()}")
    
    sys.exit(exit_code)
