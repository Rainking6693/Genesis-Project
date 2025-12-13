"""
Test Guardian Remediation & Fixed Pipeline

This script tests the complete pipeline with all fixes:
1. SE-Darwin fallback initialization
2. EVOLVE stage graceful degradation
3. GitHub integration
4. DEPLOY retry logic
5. THANATOS automatic remediation
"""

import asyncio
import logging
from infrastructure.genesis_pipeline import GenesisPipeline
from infrastructure.load_env import load_genesis_env

load_genesis_env()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_full_pipeline_with_fixes():
    """Test the full pipeline with all guardian fixes"""
    print("\n" + "="*80)
    print("TESTING PIPELINE WITH GUARDIAN REMEDIATION")
    print("="*80 + "\n")
    
    # Initialize pipeline with all features enabled
    pipeline = GenesisPipeline(
        enable_agui=True,           # AG-UI for monitoring
        enable_evolution=True,      # SE-Darwin evolution (with fallback)
        enable_n8n=True,           # n8n workflows
        strict_gates=True,         # Strict gate evaluation
        skip_deploy_verification=False  # Full deployment verification
    )
    
    logger.info("✅ Pipeline initialized with all features")
    logger.info(f"   - SE-Darwin available: {pipeline.se_darwin is not None}")
    logger.info(f"   - THANATOS guardian: {pipeline.thanatos is not None}")
    logger.info(f"   - n8n workflows: {pipeline.n8n is not None}")
    
    # Run the complete pipeline
    logger.info("\n🚀 Starting full 8-stage pipeline...")
    logger.info("   Business Type: SaaS")
    logger.info("   Target Market: Developers")
    logger.info("\n")
    
    try:
        result = await pipeline.run(
            business_type="saas",
            target_market="developers"
        )
        
        print("\n" + "="*80)
        print("PIPELINE EXECUTION COMPLETE")
        print("="*80)
        print(f"Status: {result.status.value}")
        print(f"Live URL: {result.live_url or 'Not deployed'}")
        print(f"Duration: {result.duration:.1f}s" if result.duration else "Duration: N/A")
        print(f"\nStages completed: {len(result.stage_outputs)}/8")
        
        # Print stage results
        print("\n" + "-"*80)
        print("STAGE RESULTS:")
        print("-"*80)
        
        from infrastructure.genesis_pipeline import PipelineStage
        for stage in PipelineStage:
            output = result.stage_outputs.get(stage)
            if output:
                status = "✅ PASS" if output.success else "❌ FAIL"
                score = output.score if hasattr(output, 'score') else 0
                print(f"  Gate {stage.value} ({stage.name:10s}): {status} (Score: {score:.1f})")
            else:
                print(f"  Gate {stage.value} ({stage.name:10s}): ⏸️  Not reached")
        
        # Print gate evaluations
        if result.gate_evaluations:
            print("\n" + "-"*80)
            print("GATE EVALUATIONS (Emily + THANATOS):")
            print("-"*80)
            for gate_num, evaluation in sorted(result.gate_evaluations.items()):
                print(f"  Gate {gate_num}: {evaluation.result.value.upper()} (Score: {evaluation.score:.1f})")
                if evaluation.feedback:
                    print(f"    Feedback: {evaluation.feedback}")
        
        # Check for remediation activity
        print("\n" + "-"*80)
        print("GUARDIAN REMEDIATION:")
        print("-"*80)
        
        if pipeline.thanatos:
            status = pipeline.thanatos.get_status()
            print(f"  Businesses watched: {status['watching']}")
            print(f"  Businesses approved: {status['approved']}")
            print(f"  Businesses vetoed: {status['vetoed']}")
            print(f"  Audit chain valid: {status['audit_chain_valid']}")
        
        print("\n" + "-"*80)
        print("DEPLOYMENT INFO:")
        print("-"*80)
        
        deploy_output = result.stage_outputs.get(PipelineStage.DEPLOY)
        if deploy_output and deploy_output.data:
            data = deploy_output.data
            print(f"  Live URL: {data.get('live_url', 'N/A')}")
            print(f"  Platform: {data.get('platform', 'N/A')}")
            print(f"  GitHub URL: {data.get('github_url', 'Not pushed')}")
            print(f"  GitHub pushed: {data.get('github_pushed', False)}")
            print(f"  Attempts: {data.get('attempt', 'N/A')}")
        
        print("\n" + "-"*80)
        print("EVOLUTION INFO:")
        print("-"*80)
        
        evolve_output = result.stage_outputs.get(PipelineStage.EVOLVE)
        if evolve_output and evolve_output.data:
            data = evolve_output.data
            print(f"  SE-Darwin available: {data.get('se_darwin_available', False)}")
            print(f"  Trajectory stored: {data.get('trajectory_stored', False)}")
            print(f"  Evolution scheduled: {data.get('evolution_scheduled', False)}")
            if data.get('evolution_disabled'):
                print(f"  ⚠️  Evolution disabled: {data.get('reason', 'Unknown')}")
        
        print("\n" + "="*80)
        print(f"FINAL STATUS: {result.status.value.upper()}")
        print("="*80 + "\n")
        
        return result
        
    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    result = asyncio.run(test_full_pipeline_with_fixes())
    print(f"\n✅ Pipeline test completed - Status: {result.status.value}")
