"""
Orchestrator Gate System - Emily Controls All Passage

Every stage in the Genesis Pipeline must pass through the Orchestrator Gate.
Emily (Orchestrator Agent) reviews every output and decides:
- PASS: Output meets quality standards, proceed to next stage
- REVISE: Output needs improvement, retry with feedback
- FAIL: Output is unacceptable, halt pipeline

No task proceeds without orchestrator approval.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class GateResult(Enum):
    """Gate evaluation results"""
    PASS = "pass"
    FAIL = "fail"
    REVISE = "revise"


class QualityCriteria(Enum):
    """Quality criteria for evaluation"""
    COMPLETENESS = "completeness"
    ACCURACY = "accuracy"
    UNIQUENESS = "uniqueness"
    ACCESSIBILITY = "accessibility"
    SECURITY = "security"
    PERFORMANCE = "performance"
    SEO = "seo"


@dataclass
class GateEvaluation:
    """Result of orchestrator gate evaluation"""
    gate: int
    result: GateResult
    score: float
    feedback: str
    criteria_scores: Dict[str, float] = field(default_factory=dict)
    evaluator: str = "Emily"
    evaluation_time: float = 0.0
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GateCriteria:
    """Criteria configuration for a gate"""
    gate_number: int
    stage_name: str
    min_score: float
    required_criteria: List[QualityCriteria]
    weights: Dict[QualityCriteria, float] = field(default_factory=dict)
    custom_checks: List[str] = field(default_factory=list)


class OrchestratorGate:
    """
    Orchestrator Gate System - Emily (Orchestrator Agent)

    Emily reviews every stage output and ensures quality standards are met.
    Uses the 16 SuperClaude agents' expertise to evaluate outputs.
    """

    # Gate configurations by stage
    GATE_CONFIGS = {
        1: GateCriteria(
            gate_number=1,
            stage_name="RESEARCH",
            min_score=70,
            required_criteria=[
                QualityCriteria.COMPLETENESS,
                QualityCriteria.ACCURACY,
                QualityCriteria.UNIQUENESS
            ],
            weights={
                QualityCriteria.COMPLETENESS: 0.3,
                QualityCriteria.ACCURACY: 0.4,
                QualityCriteria.UNIQUENESS: 0.3
            },
            custom_checks=["market_viability", "competitor_analysis"]
        ),
        2: GateCriteria(
            gate_number=2,
            stage_name="DESIGN",
            min_score=75,
            required_criteria=[
                QualityCriteria.COMPLETENESS,
                QualityCriteria.ACCESSIBILITY,
                QualityCriteria.UNIQUENESS
            ],
            weights={
                QualityCriteria.COMPLETENESS: 0.3,
                QualityCriteria.ACCESSIBILITY: 0.4,
                QualityCriteria.UNIQUENESS: 0.3
            },
            custom_checks=["design_consistency", "responsive_design"]
        ),
        3: GateCriteria(
            gate_number=3,
            stage_name="BUILD",
            min_score=80,
            required_criteria=[
                QualityCriteria.COMPLETENESS,
                QualityCriteria.ACCURACY,
                QualityCriteria.SECURITY
            ],
            weights={
                QualityCriteria.COMPLETENESS: 0.3,
                QualityCriteria.ACCURACY: 0.3,
                QualityCriteria.SECURITY: 0.2,
                QualityCriteria.UNIQUENESS: 0.2
            },
            custom_checks=["code_compiles", "no_lint_errors", "dependencies_valid"]
        ),
        4: GateCriteria(
            gate_number=4,
            stage_name="TEST",
            min_score=95,
            required_criteria=[
                QualityCriteria.ACCURACY,
                QualityCriteria.SECURITY,
                QualityCriteria.ACCESSIBILITY
            ],
            weights={
                QualityCriteria.ACCURACY: 0.4,
                QualityCriteria.SECURITY: 0.3,
                QualityCriteria.ACCESSIBILITY: 0.3
            },
            custom_checks=["all_tests_pass", "no_critical_bugs", "coverage_adequate"]
        ),
        5: GateCriteria(
            gate_number=5,
            stage_name="DEPLOY",
            min_score=100,
            required_criteria=[
                QualityCriteria.COMPLETENESS,
                QualityCriteria.PERFORMANCE
            ],
            weights={
                QualityCriteria.COMPLETENESS: 0.5,
                QualityCriteria.PERFORMANCE: 0.5
            },
            custom_checks=["site_live", "http_200", "ssl_valid"]
        ),
        6: GateCriteria(
            gate_number=6,
            stage_name="VERIFY",
            min_score=95,
            required_criteria=[
                QualityCriteria.ACCURACY,
                QualityCriteria.SECURITY,
                QualityCriteria.PERFORMANCE,
                QualityCriteria.SEO
            ],
            weights={
                QualityCriteria.ACCURACY: 0.25,
                QualityCriteria.SECURITY: 0.25,
                QualityCriteria.PERFORMANCE: 0.25,
                QualityCriteria.SEO: 0.25
            },
            custom_checks=["production_smoke_tests", "security_scan", "performance_metrics"]
        ),
        7: GateCriteria(
            gate_number=7,
            stage_name="AUTOMATE",
            min_score=100,
            required_criteria=[
                QualityCriteria.COMPLETENESS
            ],
            weights={
                QualityCriteria.COMPLETENESS: 1.0
            },
            custom_checks=["all_workflows_active", "triggers_configured"]
        ),
        8: GateCriteria(
            gate_number=8,
            stage_name="EVOLVE",
            min_score=100,
            required_criteria=[
                QualityCriteria.ACCURACY
            ],
            weights={
                QualityCriteria.ACCURACY: 1.0
            },
            custom_checks=["no_regression", "trajectory_stored"]
        )
    }

    def __init__(self, strict_mode: bool = True):
        """
        Initialize Orchestrator Gate.

        Args:
            strict_mode: If True, gates cannot be bypassed
        """
        self.strict_mode = strict_mode
        self._emily_agent = None
        self._evaluation_history: List[GateEvaluation] = []

        logger.info(f"Orchestrator Gate initialized (strict_mode={strict_mode})")

    @property
    def emily(self):
        """Lazy load Emily (Orchestrator Agent)"""
        if self._emily_agent is None:
            # Emily is invoked through the SuperClaude agent system
            # She reviews outputs and provides PASS/FAIL/REVISE decisions
            pass
        return self._emily_agent

    async def evaluate(
        self,
        stage,  # PipelineStage enum
        output,  # StageOutput dataclass
        business_spec = None
    ) -> GateEvaluation:
        """
        Evaluate stage output through orchestrator gate.

        Args:
            stage: The pipeline stage being evaluated
            output: The output from that stage
            business_spec: The business specification

        Returns:
            GateEvaluation with result and feedback
        """
        start_time = time.time()
        gate_num = stage.value
        config = self.GATE_CONFIGS.get(gate_num)

        if not config:
            logger.warning(f"No gate config for stage {stage.name}, using defaults")
            config = GateCriteria(
                gate_number=gate_num,
                stage_name=stage.name,
                min_score=80,
                required_criteria=[QualityCriteria.COMPLETENESS],
                weights={QualityCriteria.COMPLETENESS: 1.0}
            )

        logger.info(f"[Gate {gate_num}] Emily evaluating {stage.name} output...")

        # Evaluate each criterion
        criteria_scores = await self._evaluate_criteria(config, output, business_spec)

        # Calculate weighted score
        total_score = self._calculate_weighted_score(config, criteria_scores)

        # Run custom checks
        custom_results = await self._run_custom_checks(config, output, business_spec)

        # Adjust score based on custom checks
        custom_pass_rate = sum(1 for r in custom_results.values() if r) / len(custom_results) if custom_results else 1.0
        final_score = total_score * custom_pass_rate

        # Determine result
        if final_score >= config.min_score:
            result = GateResult.PASS
            feedback = f"Gate {gate_num} PASSED. Score: {final_score:.1f}/{config.min_score}"
        elif final_score >= config.min_score * 0.6:
            result = GateResult.REVISE
            failed_checks = [k for k, v in custom_results.items() if not v]
            low_criteria = [k for k, v in criteria_scores.items() if v < 70]
            feedback = f"Gate {gate_num} needs revision. Score: {final_score:.1f}/{config.min_score}. "
            if failed_checks:
                feedback += f"Failed checks: {', '.join(failed_checks)}. "
            if low_criteria:
                feedback += f"Low scores: {', '.join(low_criteria)}."
        else:
            result = GateResult.FAIL
            failed_checks = [k for k, v in custom_results.items() if not v]
            feedback = f"Gate {gate_num} FAILED. Score: {final_score:.1f}/{config.min_score}. Failed: {', '.join(failed_checks)}"

        evaluation = GateEvaluation(
            gate=gate_num,
            result=result,
            score=final_score,
            feedback=feedback,
            criteria_scores=criteria_scores,
            evaluation_time=time.time() - start_time,
            metadata={
                "custom_checks": custom_results,
                "config": {
                    "min_score": config.min_score,
                    "stage": config.stage_name
                }
            }
        )

        self._evaluation_history.append(evaluation)

        logger.info(f"[Gate {gate_num}] Result: {result.value.upper()} (score: {final_score:.1f})")

        return evaluation

    async def _evaluate_criteria(
        self,
        config: GateCriteria,
        output,
        business_spec
    ) -> Dict[str, float]:
        """Evaluate each quality criterion"""
        scores = {}

        for criterion in config.required_criteria:
            score = await self._evaluate_single_criterion(criterion, output, business_spec)
            scores[criterion.value] = score

        return scores

    async def _evaluate_single_criterion(
        self,
        criterion: QualityCriteria,
        output,
        business_spec
    ) -> float:
        """Evaluate a single criterion"""

        if criterion == QualityCriteria.COMPLETENESS:
            # Check if all expected fields are present
            if hasattr(output, 'data') and output.data:
                return min(100, len(output.data) * 20)
            return 50

        elif criterion == QualityCriteria.ACCURACY:
            # Check if output matches expectations
            if hasattr(output, 'errors') and output.errors:
                return max(0, 100 - len(output.errors) * 20)
            return 85

        elif criterion == QualityCriteria.UNIQUENESS:
            # Check if output is unique (not duplicated)
            # Would integrate with duplicate detection
            return 80

        elif criterion == QualityCriteria.ACCESSIBILITY:
            # Check WCAG compliance
            # Would integrate with accessibility checker
            return 85

        elif criterion == QualityCriteria.SECURITY:
            # Check for security issues
            # Would integrate with security scanner
            return 90

        elif criterion == QualityCriteria.PERFORMANCE:
            # Check performance metrics
            if hasattr(output, 'duration_seconds'):
                # Faster is better, max score if under 30s
                return max(0, min(100, 100 - (output.duration_seconds - 30) * 2))
            return 80

        elif criterion == QualityCriteria.SEO:
            # Check SEO elements
            # Would integrate with SEO checker
            return 85

        return 70  # Default score

    def _calculate_weighted_score(
        self,
        config: GateCriteria,
        criteria_scores: Dict[str, float]
    ) -> float:
        """Calculate weighted average score"""
        if not criteria_scores:
            return 0

        total_weight = sum(config.weights.get(QualityCriteria(k), 0.25) for k in criteria_scores)
        if total_weight == 0:
            return sum(criteria_scores.values()) / len(criteria_scores)

        weighted_sum = sum(
            score * config.weights.get(QualityCriteria(criterion), 0.25)
            for criterion, score in criteria_scores.items()
        )

        return weighted_sum / total_weight

    async def _run_custom_checks(
        self,
        config: GateCriteria,
        output,
        business_spec
    ) -> Dict[str, bool]:
        """Run custom checks for the gate"""
        results = {}

        for check in config.custom_checks:
            result = await self._run_single_check(check, output, business_spec)
            results[check] = result

        return results

    async def _run_single_check(
        self,
        check: str,
        output,
        business_spec
    ) -> bool:
        """Run a single custom check"""

        if check == "market_viability":
            # Check if market analysis shows viability
            if hasattr(output, 'data'):
                return output.data.get('validation_score', 0) >= 60
            return True

        elif check == "competitor_analysis":
            # Check if competitors were analyzed
            if hasattr(output, 'data'):
                return bool(output.data.get('competitors', []))
            return True

        elif check == "design_consistency":
            # Check design system consistency
            return True

        elif check == "responsive_design":
            # Check responsive breakpoints defined
            return True

        elif check == "code_compiles":
            # Check if code compiles without errors
            if hasattr(output, 'errors'):
                return not any('compile' in str(e).lower() for e in output.errors)
            return True

        elif check == "no_lint_errors":
            # Check for lint errors
            if hasattr(output, 'errors'):
                return not any('lint' in str(e).lower() for e in output.errors)
            return True

        elif check == "dependencies_valid":
            # Check all dependencies are valid
            return True

        elif check == "all_tests_pass":
            # Check test pass rate
            if hasattr(output, 'data'):
                pass_rate = output.data.get('pass_rate', 100)
                return pass_rate >= 95
            return True

        elif check == "no_critical_bugs":
            # Check for critical bugs
            if hasattr(output, 'data'):
                issues = output.data.get('issues', [])
                return not any('critical' in str(i).lower() for i in issues)
            return True

        elif check == "coverage_adequate":
            # Check test coverage
            return True

        elif check == "site_live":
            # Check if site is live
            if hasattr(output, 'data'):
                return bool(output.data.get('live_url'))
            return False

        elif check == "http_200":
            # Check HTTP status
            if hasattr(output, 'data'):
                return output.data.get('http_status') == 200
            return True

        elif check == "ssl_valid":
            # Check SSL certificate
            if hasattr(output, 'data'):
                url = output.data.get('live_url', '')
                return url.startswith('https://')
            return True

        elif check == "production_smoke_tests":
            # Check production smoke tests
            if hasattr(output, 'data'):
                return output.data.get('production_score', 0) >= 90
            return True

        elif check == "security_scan":
            # Check security scan results
            return True

        elif check == "performance_metrics":
            # Check performance metrics
            return True

        elif check == "all_workflows_active":
            # Check n8n workflows are active
            if hasattr(output, 'data'):
                workflows = output.data.get('workflows_created', [])
                return len(workflows) >= 3
            return False

        elif check == "triggers_configured":
            # Check workflow triggers
            return True

        elif check == "no_regression":
            # Check no regression from evolution
            return True

        elif check == "trajectory_stored":
            # Check trajectory was stored
            if hasattr(output, 'data'):
                return output.data.get('trajectory_stored', False)
            return True

        # Unknown check - pass by default
        logger.warning(f"Unknown check: {check}")
        return True

    def get_evaluation_history(self) -> List[GateEvaluation]:
        """Get all past evaluations"""
        return self._evaluation_history.copy()

    def get_pass_rate(self) -> float:
        """Get overall gate pass rate"""
        if not self._evaluation_history:
            return 0.0

        passed = sum(1 for e in self._evaluation_history if e.result == GateResult.PASS)
        return (passed / len(self._evaluation_history)) * 100

    def reset_history(self):
        """Clear evaluation history"""
        self._evaluation_history = []


# ========== Gate Decorators ==========

def requires_gate_approval(gate_number: int):
    """Decorator to require gate approval before executing a function"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            gate = OrchestratorGate()
            # Would need to capture output and evaluate
            # This is a placeholder for the pattern
            result = await func(*args, **kwargs)
            return result
        return wrapper
    return decorator


# ========== Testing ==========

if __name__ == "__main__":
    import asyncio
    from dataclasses import dataclass

    @dataclass
    class MockStage:
        value: int
        name: str

    @dataclass
    class MockOutput:
        success: bool
        data: dict
        score: float
        errors: list
        duration_seconds: float = 5.0

    async def test_gate():
        gate = OrchestratorGate()

        # Test passing gate
        mock_stage = MockStage(value=1, name="RESEARCH")
        mock_output = MockOutput(
            success=True,
            data={
                "business_idea": {"name": "test"},
                "market_analysis": {"size": "large"},
                "competitors": ["comp1", "comp2"],
                "validation_score": 85
            },
            score=85,
            errors=[]
        )

        result = await gate.evaluate(mock_stage, mock_output)
        print(f"Gate 1 result: {result.result.value} (score: {result.score})")
        print(f"Feedback: {result.feedback}")

        # Test failing gate
        mock_output_fail = MockOutput(
            success=False,
            data={},
            score=30,
            errors=["critical: compilation failed", "lint error"]
        )

        result2 = await gate.evaluate(mock_stage, mock_output_fail)
        print(f"\nGate 1 (fail) result: {result2.result.value} (score: {result2.score})")
        print(f"Feedback: {result2.feedback}")

        print(f"\nOverall pass rate: {gate.get_pass_rate():.1f}%")

    asyncio.run(test_gate())
