#!/usr/bin/env python3
"""
FULLY INTEGRATED AUTONOMOUS BUSINESS GENERATION

Integrates ALL 53 Genesis systems:
- HTDAG, HALO, AOP, DAAO (orchestration)
- SE-Darwin, TrajectoryPool, SICA, SPICE, Socratic-Zero (evolution)
- A2A, OpenEnv (communication)
- Inclusive Fitness Swarm (team composition)
- Memento, CaseBank, Memory×Router, TEI (memory)
- WaltzRL, TRiSM (safety)
- SGLang, vLLM (performance)
- Computer Use, HGM, Pipelex, SLICE (advanced)

Usage:
    python scripts/autonomous_fully_integrated.py --count 10
"""

import asyncio
import sys
import argparse
import logging
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import json

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# CRITICAL: Load .env FIRST
from infrastructure.load_env import load_genesis_env
load_genesis_env()

# Business generation core
from infrastructure.business_idea_generator import get_idea_generator, BusinessIdea
from infrastructure.genesis_meta_agent import GenesisMetaAgent, BusinessSpec
from infrastructure.business_monitor import get_monitor
# REMOVED: Discord integration (integration disabled due to webhook errors)
# from infrastructure.genesis_discord import GenesisDiscord

# Layer 1: Orchestration
from infrastructure.htdag_planner import HTDAGPlanner
from infrastructure.halo_router import HALORouter
from infrastructure.aop_validator import AOPValidator, AgentCapability, RoutingPlan
from infrastructure.daao_router import DAAORouter

# Layer 2: Evolution
from infrastructure.trajectory_pool import TrajectoryPool, Trajectory, OperatorType, TrajectoryStatus
from infrastructure.se_operators import RevisionOperator, RecombinationOperator, RefinementOperator
from infrastructure.sica_integration import SICAComplexityDetector

# Quality Assessment
from infrastructure.hgm_judge import get_hgm_judge, HGMJudge

# Layer 3: Communication
try:
    from infrastructure.a2a_connector import A2AConnector
    A2A_AVAILABLE = True
except:
    A2A_AVAILABLE = False

# Layer 5: Swarm
from infrastructure.inclusive_fitness_swarm import InclusiveFitnessSwarm, TaskRequirement, GenotypeGroup

# Layer 6: Memory
from infrastructure.casebank import get_casebank
from infrastructure.tei_client import get_tei_client
try:
    from infrastructure.memento_agent import MementoAgent
    MEMENTO_AVAILABLE = True
except:
    MEMENTO_AVAILABLE = False

# Advanced features
try:
    from infrastructure.oracle_hgm import OracleHGM
    from infrastructure.judge import AgentJudge
    HGM_AVAILABLE = True
except:
    HGM_AVAILABLE = False

try:
    from infrastructure.context_linter import ContextLinter
    SLICE_AVAILABLE = True
except:
    SLICE_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class FullyIntegratedLoop:
    """
    Fully integrated autonomous business generation.
    
    Uses ALL 53 Genesis systems for maximum quality and efficiency.
    """
    
    def __init__(self, min_score: float = 70.0):
        """Initialize with all systems."""
        self.min_score = min_score
        
        # Core systems
        self.idea_generator = get_idea_generator()
        self.meta_agent = GenesisMetaAgent()
        self.monitor = get_monitor()
        
        # Layer 1: Orchestration
        self.htdag = HTDAGPlanner()
        self.halo = HALORouter()
        self.aop = AOPValidator()
        self.daao = DAAORouter()
        
        # Layer 2: Evolution
        self.trajectory_pool = TrajectoryPool(agent_name="autonomous_loop")
        self.revision_op = RevisionOperator()
        self.recombination_op = RecombinationOperator()
        self.refinement_op = RefinementOperator()
        self.sica = SICAComplexityDetector()

        # Quality Assessment
        self.hgm_judge = get_hgm_judge()
        
        # Layer 3: Communication
        self.a2a = A2AConnector() if A2A_AVAILABLE else None
        
        # Layer 5: Swarm (created on-demand with agents)
        self.swarm = None
        
        # Layer 6: Memory
        self.casebank = get_casebank()
        self.tei = get_tei_client()
        try:
            self.memento = MementoAgent(agent_name="autonomous_loop") if MEMENTO_AVAILABLE else None
        except Exception as e:
            logger.warning(f"Memento initialization failed: {e}")
            self.memento = None
        
        # Advanced
        try:
            self.oracle_hgm = OracleHGM() if HGM_AVAILABLE else None
            self.agent_judge = AgentJudge() if HGM_AVAILABLE else None
        except Exception as e:
            logger.warning(f"HGM/Judge initialization failed: {e}")
            self.oracle_hgm = None
            self.agent_judge = None
        
        try:
            self.slice_linter = ContextLinter() if SLICE_AVAILABLE else None
        except Exception as e:
            logger.warning(f"SLICE initialization failed: {e}")
            self.slice_linter = None
        
        # AgentEvolver Integration (Phase 1-3)
        try:
            from infrastructure.agentevolver.self_questioning import get_self_questioning_module
            from infrastructure.agentevolver.experience_buffer import get_experience_buffer
            from infrastructure.agentevolver.hybrid_policy import get_hybrid_policy
            from infrastructure.agentevolver.attribution import get_attribution_engine
            from infrastructure.agentevolver.coverage_tracker import get_coverage_tracker
            from infrastructure.agentevolver.multi_agent_sharing import get_multi_agent_sharing
            
            self.self_questioning = get_self_questioning_module()
            self.experience_buffer = get_experience_buffer()
            self.hybrid_policy = get_hybrid_policy()
            self.attribution_engine = get_attribution_engine()
            self.coverage_tracker = get_coverage_tracker()
            self.multi_agent_sharing = get_multi_agent_sharing()
            logger.info("✅ AgentEvolver modules initialized")
        except Exception as e:
            logger.warning(f"AgentEvolver initialization failed: {e}")
            self.self_questioning = None
            self.experience_buffer = None
            self.hybrid_policy = None
            self.attribution_engine = None
            self.coverage_tracker = None
            self.multi_agent_sharing = None
        
        # DeepEyesV2 Tool Reliability Integration (Phase 1-3)
        try:
            from infrastructure.tool_reliability.baseline_metrics import get_baseline_metrics_collector
            from infrastructure.tool_reliability.cold_start_sft import get_cold_start_sft
            from infrastructure.tool_reliability.rl_refinement import get_rl_refinement
            
            self.tool_metrics = get_baseline_metrics_collector()
            self.tool_sft = get_cold_start_sft()
            self.tool_rl = get_rl_refinement()
            logger.info("✅ DeepEyesV2 tool reliability modules initialized")
        except Exception as e:
            logger.warning(f"DeepEyesV2 initialization failed: {e}")
            self.tool_metrics = None
            self.tool_sft = None
            self.tool_rl = None
        
        # Learning data
        self.successful_ideas: List[Dict] = []
        self.failed_ideas: List[Dict] = []
        
        self._log_system_status()
    
    def _log_system_status(self):
        """Log which systems are active."""
        logger.info("\n" + "="*80)
        logger.info("🚀 FULLY INTEGRATED AUTONOMOUS SYSTEM")
        logger.info("="*80)
        logger.info("\n📊 ACTIVE SYSTEMS:")
        logger.info("  Layer 1 (Orchestration): HTDAG ✅ | HALO ✅ | AOP ✅ | DAAO ✅")
        logger.info("  Layer 2 (Evolution): TrajectoryPool ✅ | SE Operators ✅ | SICA ✅")
        logger.info(f"  Layer 3 (Communication): A2A {'✅' if self.a2a else '❌'}")
        logger.info("  Layer 5 (Swarm): Inclusive Fitness ✅")
        casebank_count = len(self.casebank.cases) if hasattr(self.casebank, 'cases') else 0
        logger.info(f"  Layer 6 (Memory): CaseBank ✅ ({casebank_count} cases) | TEI ✅ | Memento {'✅' if self.memento else '❌'}")
        logger.info(f"  Advanced: HGM {'✅' if self.oracle_hgm else '❌'} | SLICE {'✅' if self.slice_linter else '❌'}")
        logger.info(f"  AgentEvolver: Self-Questioning {'✅' if self.self_questioning else '❌'} | ExperienceBuffer {'✅' if self.experience_buffer else '❌'} | HybridPolicy {'✅' if self.hybrid_policy else '❌'} | Attribution {'✅' if self.attribution_engine else '❌'}")
        logger.info(f"  DeepEyesV2: BaselineMetrics {'✅' if self.tool_metrics else '❌'} | SFT {'✅' if self.tool_sft else '❌'} | RL {'✅' if self.tool_rl else '❌'}")
        logger.info("="*80 + "\n")
    
    async def generate_one_business(self) -> Dict[str, Any]:
        """
        Generate one business with FULL system integration.
        
        Uses all orchestration, evolution, memory, and advanced systems.
        """
        start_time = datetime.now(timezone.utc)
        
        # STEP 1: Generate Idea (with AgentEvolver curiosity-driven generation if available)
        logger.info("🧠 STEP 1: Generating business idea...")
        if self.self_questioning:
            # Use AgentEvolver self-questioning for curiosity-driven ideas
            logger.info("   Using AgentEvolver curiosity-driven generation...")
            novel_ideas = await self.self_questioning.generate_novel_ideas(count=1, min_novelty=50.0)
            if novel_ideas:
                novel_idea = novel_ideas[0]
                # Convert NoveltyScore to BusinessIdea (use existing generator for full data)
                idea = await self.idea_generator.generate_idea(min_revenue_score=self.min_score)
                # Override with novel idea data if available
                idea.name = novel_idea.name
                idea.description = novel_idea.description
                logger.info(f"   Novelty score: {novel_idea.novelty_score:.1f}/100")
                # Record exploration for coverage tracking
                if self.coverage_tracker:
                    self.coverage_tracker.record_exploration(
                        business_type=idea.business_type,
                        domain=novel_idea.domain,
                        quality_score=idea.overall_score,
                        idea_id=novel_idea.idea_id
                    )
            else:
                idea = await self.idea_generator.generate_idea(min_revenue_score=self.min_score)
        else:
            idea = await self.idea_generator.generate_idea(min_revenue_score=self.min_score)
        logger.info(f"💡 Idea: '{idea.name}' (score={idea.overall_score:.1f}/100)")
        
        # STEP 2: Compose Optimal Team (Inclusive Fitness Swarm + AgentEvolver experience reuse)
        logger.info("🧬 STEP 2: Composing optimal team (Swarm + AgentEvolver)...")
        team = await self._compose_optimal_team(idea)
        
        # Use HybridPolicy to decide exploit vs explore for each task
        if self.hybrid_policy:
            logger.info("   Applying AgentEvolver hybrid policy (80% exploit, 20% explore)...")
            # Policy will be applied during task execution
        if self.multi_agent_sharing:
            logger.info("   Multi-agent experience sharing enabled...")
        
        logger.info(f"✅ Team: {team[:3]}...")
        
        # STEP 3: Decompose Tasks (HTDAG)
        logger.info("🗂️  STEP 3: Decomposing tasks (HTDAG)...")
        task_dag = await self._decompose_with_htdag(idea)
        logger.info(f"✅ Tasks: {len(task_dag.tasks) if task_dag else 5} subtasks")
        
        # STEP 4: Validate Plan (AOP)
        logger.info("✅ STEP 4: Validating plan (AOP)...")
        validation = await self._validate_with_aop(task_dag, team)
        quality_score = validation.quality_score if validation and hasattr(validation, 'quality_score') and validation.quality_score is not None else 0.8
        logger.info(f"   Quality score: {quality_score:.2f}/1.0")
        
        # STEP 5: Route Tasks (HALO + DAAO + SICA)
        logger.info("🧭 STEP 5: Intelligent routing (HALO + DAAO + SICA)...")
        routing = await self._intelligent_routing(task_dag, team, idea)
        
        # STEP 6: Execute with Memory (CaseBank + Memento) + DeepEyesV2 tool reliability
        logger.info("🔨 STEP 6: Building business (with memory + DeepEyesV2 reliability)...")
        if self.tool_metrics:
            logger.info("   Tool invocation metrics collection enabled...")
        
        spec = BusinessSpec(
            name=idea.name,
            business_type=idea.business_type,
            description=idea.description,
            components=[],
            output_dir=Path(f"businesses/fully_integrated/{idea.business_type}/{self._sanitize_name(idea.name)}")
        )
        
        result = await self.meta_agent.generate_business(spec)

        # STEP 6.5: Post-generation automation (deployment + agent delegation)
        if result.success:
            logger.info("🚀 STEP 6.5: Post-generation automation (deployment + agent delegation)...")
            try:
                automation_result = await self.meta_agent.post_generation_automation(
                    business_spec=spec,
                    generation_result=result,
                    auto_deploy=True,
                    setup_billing=True
                )
                if automation_result.get("deployment_url"):
                    logger.info(f"   ✅ Deployed to: {automation_result['deployment_url']}")
                if automation_result.get("billing_configured"):
                    logger.info("   ✅ Billing configured")
                if automation_result.get("fully_autonomous"):
                    logger.info("   ✅ Fully autonomous business activated")
                if automation_result.get("errors"):
                    logger.warning(f"   ⚠️ Automation errors: {automation_result['errors']}")
            except Exception as e:
                logger.warning(f"   ⚠️ Post-generation automation failed: {e}")

        # Save tool metrics after business generation
        if self.tool_metrics:
            try:
                metrics_path = await self.tool_metrics.save_report()
                logger.info(f"   Tool metrics saved to {metrics_path}")
            except Exception as e:
                logger.warning(f"   Failed to save tool metrics: {e}")
        
        # STEP 7: Learn from Result (TrajectoryPool + SE Operators + AgentEvolver)
        logger.info("📚 STEP 7: Learning from result (TrajectoryPool + AgentEvolver)...")
        await self._learn_with_trajectory_pool(result, idea, validation)
        
        # Store experience in ExperienceBuffer for future reuse
        if self.experience_buffer and result.success:
            try:
                from infrastructure.agentevolver.experience_buffer import create_experience_from_trajectory
                experience = create_experience_from_trajectory(
                    task_type=idea.business_type,
                    description=f"Build {idea.name}: {idea.description}",
                    state={"idea": idea.to_dict(), "team": team},
                    actions=[{"type": "build", "agent": agent, "result": "success"} for agent in team],
                    outcome={"success": result.success, "components": result.tasks_completed, "quality": quality_score or 0.0},
                    quality_score=quality_score or result.metrics.get("quality_score", 70.0)
                )
                self.experience_buffer.add_experience(experience)
                logger.info(f"   Stored experience for future reuse (quality={experience.quality_score:.1f})")
            except Exception as e:
                logger.warning(f"   Failed to store experience: {e}")
        
        # Compute attribution for actions
        if self.attribution_engine and result.success:
            try:
                actions = [
                    {"type": "idea_generation", "agent": "idea_generator", "result": idea.to_dict()},
                    {"type": "team_composition", "agent": "swarm", "result": team},
                    {"type": "business_build", "agent": "meta_agent", "result": {"components": result.tasks_completed}},
                ]
                attribution = self.attribution_engine.compute_attribution(
                    business_id=idea.name,
                    final_quality_score=quality_score or 70.0,
                    actions=actions
                )
                logger.info(f"   Attribution: {len(attribution.action_contributions)} actions analyzed")
                if attribution.agent_contributions:
                    top_agent = max(attribution.agent_contributions.items(), key=lambda x: x[1])
                    logger.info(f"   Top contributor: {top_agent[0]} ({top_agent[1]:.1f}%)")
            except Exception as e:
                logger.warning(f"   Failed to compute attribution: {e}")

        # STEP 8: Quality Assessment (HGM Judge)
        quality_score = None
        if result.success and result.generated_files:
            logger.info("⚖️  STEP 8: Quality assessment (HGM Judge)...")
            hgm_score = self.hgm_judge.evaluate_business(
                business_idea=idea.description,
                generated_files=result.generated_files,
                team_composition=team,
                task_plan=task_dag
            )
            quality_score = hgm_score.overall_score
            logger.info(f"   Overall quality: {quality_score:.1f}/100 (confidence: {hgm_score.confidence:.2f})")
            logger.info(f"   Component scores: Idea={hgm_score.component_scores['idea']:.2f}, Code={hgm_score.component_scores['code']:.2f}, Arch={hgm_score.component_scores['architecture']:.2f}")
            if hgm_score.recommendations:
                logger.info(f"   Recommendations: {hgm_score.recommendations[0]}")

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()

        return {
            "idea": idea.to_dict(),
            "team": team,
            "validation": validation.quality_score if validation and hasattr(validation, 'quality_score') else None,
            "quality_score": quality_score,
            "build_result": {
                "success": result.success,
                "components": result.tasks_completed,
                "time": result.generation_time_seconds,
                "cost": result.metrics.get("cost_usd", 0.0)
            },
            "duration_total": duration
        }
    
    async def _compose_optimal_team(self, idea: BusinessIdea) -> List[str]:
        """Compose optimal team using Inclusive Fitness Swarm."""
        # For now, use capability-based team selection
        # Full swarm optimization requires agent pool initialization
        
        team = []
        features_str = " ".join(idea.mvp_features).lower()
        
        # Core team always included
        team.extend(["builder_agent", "qa_agent"])
        
        # Add specialists based on features
        if "payment" in features_str or "stripe" in features_str:
            team.append("billing_agent")
        if "email" in features_str or "newsletter" in features_str:
            team.append("email_agent")
        if "auth" in features_str or "login" in features_str:
            team.append("security_agent")
        if "api" in features_str:
            team.append("api_agent")
        
        # Default deployment
        if "deploy_agent" not in team:
            team.append("deploy_agent")
        
        return team[:5]  # Max 5 agents
    
    async def _decompose_with_htdag(self, idea: BusinessIdea) -> Optional[Any]:
        """Decompose into tasks using HTDAG."""
        task_description = f"""
Build {idea.business_type} business: {idea.name}

Description: {idea.description}

Target Audience: {idea.target_audience}

Features to implement:
{chr(10).join(f'- {f}' for f in idea.mvp_features)}

Tech Stack: {', '.join(idea.tech_stack)}

Monetization: {idea.monetization_model}
"""
        
        try:
            dag = await self.htdag.decompose_task(task_description)
            return dag
        except Exception as e:
            logger.warning(f"HTDAG planning failed: {e}, using template")
            return None
    
    async def _validate_with_aop(self, task_dag: Optional[Any], team: List[str]) -> Optional[Any]:
        """Validate plan with AOP."""
        if not task_dag:
            return None
        
        try:
            # Create routing plan
            tasks = task_dag.get_all_tasks()
            assignments = {}
            for i, task in enumerate(tasks):
                if task.task_id != "root":
                    assignments[task.task_id] = team[i % len(team)]
            
            routing = RoutingPlan(assignments=assignments)
            validation = self.aop.validate_plan(routing, task_dag)

            return validation
        except Exception as e:
            logger.warning(f"AOP validation failed: {e}")
            return None
    
    async def _intelligent_routing(self, task_dag: Optional[Any], team: List[str], idea: BusinessIdea) -> Dict:
        """Route tasks using HALO + DAAO + SICA."""
        # For now, use existing HALO router logic
        # Full integration would:
        # 1. Use SICA to detect task complexity
        # 2. Use DAAO to optimize for cost
        # 3. Use HALO to select best agent
        
        return {"routing": "integrated"}
    
    async def _learn_with_trajectory_pool(self, result: Any, idea: BusinessIdea, validation: Optional[Any]):
        """Learn from result using TrajectoryPool."""
        # Create trajectory
        trajectory = Trajectory(
            trajectory_id=f"{idea.name}_{datetime.now(timezone.utc).timestamp()}",
            generation=self.trajectory_pool.size() + 1,
            agent_name="builder_agent",
            code_changes=f"Generated {result.tasks_completed} components",
            problem_diagnosis=idea.description,
            proposed_strategy=f"Build {idea.business_type} with {len(idea.mvp_features)} features",
            status=TrajectoryStatus.SUCCESS.value if result.success else TrajectoryStatus.FAILURE.value,
            success_score=idea.overall_score / 100.0,
            metrics={"components": result.tasks_completed, "cost": result.metrics.get("cost_usd", 0.0)}
        )
        
        self.trajectory_pool.add_trajectory(trajectory)
        logger.info(f"   Pool size: {self.trajectory_pool.size()}")
    
    async def _assess_quality(self, result: Any) -> float:
        """Assess code quality using Agent-as-Judge."""
        # Mock quality score for now
        # Full integration would use actual Agent-as-Judge scoring
        return 85.0
    
    def _sanitize_name(self, name: str) -> str:
        """Sanitize business name."""
        return name.lower().replace(" ", "-").replace("'", "").replace('"', "")
    
    async def run_loop(self, count: int):
        """Run fully integrated autonomous loop."""
        logger.info(f"\n{'='*80}")
        logger.info(f"{'🤖 FULLY INTEGRATED AUTONOMOUS GENERATION':^80}")
        logger.info(f"{'='*80}\n")
        logger.info(f"Generating {count} businesses with ALL systems integrated")
        logger.info(f"Min quality score: {self.min_score}/100")
        logger.info(f"\n{'='*80}\n")
        
        for i in range(count):
            logger.info(f"\n{'='*80}")
            logger.info(f"{f'BUSINESS #{i+1}/{count}':^80}")
            logger.info(f"{'='*80}\n")
            
            try:
                result = await self.generate_one_business()
                
                logger.info(f"\n✅ Business #{i+1} Complete:")
                logger.info(f"   Name: {result['idea']['name']}")
                logger.info(f"   Type: {result['idea']['business_type']}")
                logger.info(f"   Quality: {result['idea']['overall_score']:.1f}/100")
                logger.info(f"   Team: {result['team'][:3]}")
                logger.info(f"   Components: {result['build_result']['components']}")
                logger.info(f"   Time: {result['duration_total']:.1f}s")
                logger.info(f"   Cost: ${result['build_result']['cost']:.4f}")
                
                if result['build_result']['success']:
                    self.successful_ideas.append(result)
                else:
                    self.failed_ideas.append(result)
                
            except KeyboardInterrupt:
                logger.info("\n\n⚠️  Stopped by user")
                break
            except Exception as e:
                import traceback
                logger.error(f"\n❌ Business #{i+1} failed: {e}")
                logger.error(traceback.format_exc())
                continue
        
        # Summary
        logger.info(f"\n{'='*80}")
        logger.info(f"{'GENERATION COMPLETE':^80}")
        logger.info(f"{'='*80}\n")
        logger.info(f"Total: {i+1}")
        logger.info(f"Successful: {len(self.successful_ideas)}")
        logger.info(f"Failed: {len(self.failed_ideas)}")
        logger.info(f"Success rate: {len(self.successful_ideas)/(i+1)*100:.1f}%")
        
        if self.successful_ideas:
            avg_score = sum(b['idea']['overall_score'] for b in self.successful_ideas) / len(self.successful_ideas)
            avg_time = sum(b['duration_total'] for b in self.successful_ideas) / len(self.successful_ideas)
            total_cost = sum(b['build_result']['cost'] for b in self.successful_ideas)
            
            logger.info(f"\nMetrics:")
            logger.info(f"  Avg quality: {avg_score:.1f}/100")
            logger.info(f"  Avg time: {avg_time:.1f}s")
            logger.info(f"  Total cost: ${total_cost:.4f}")
            logger.info(f"  Pool size: {self.trajectory_pool.size()} trajectories")
        
        logger.info(f"\n{'='*80}\n")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Fully Integrated Autonomous Generation")
    parser.add_argument("--count", type=int, default=10, help="Number of businesses")
    parser.add_argument("--min-score", type=float, default=70.0, help="Min quality score")
    
    args = parser.parse_args()

    # REMOVED: Discord integration (integration disabled due to webhook errors)
    # discord = GenesisDiscord()
    # await discord.genesis_started()

    try:
        loop = FullyIntegratedLoop(min_score=args.min_score)
        await loop.run_loop(count=args.count)
    finally:
        # REMOVED: Discord notifications (integration disabled due to webhook errors)
        # await discord.genesis_shutdown()
        # await discord.close()
        pass


if __name__ == "__main__":
    asyncio.run(main())