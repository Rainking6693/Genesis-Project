"""
SPICE Challenger Agent - Adversarial testing for agent outputs.

Part of the SPICE framework (Self-Play In Competitive Environments):
- Challenger: Generates adversarial test cases
- Reasoner: Analyzes and improves outputs
- DrGRPO: Gradient-based policy optimization

This agent challenges outputs to find weaknesses before deployment.
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ChallengeResult:
    """Result of a challenge attempt."""
    challenge_id: str
    challenge_type: str
    original_output: Any
    challenge_input: str
    passed: bool
    failure_reason: Optional[str] = None
    severity: str = "medium"  # low, medium, high, critical
    suggested_fix: Optional[str] = None


@dataclass
class ChallengeReport:
    """Complete report of all challenges run."""
    total_challenges: int = 0
    passed: int = 0
    failed: int = 0
    critical_failures: int = 0
    results: List[ChallengeResult] = field(default_factory=list)
    overall_score: float = 0.0
    recommendations: List[str] = field(default_factory=list)


class SPICEChallengerAgent:
    """
    Adversarial challenger agent that stress-tests agent outputs.

    Challenge types:
    - Edge cases: Test boundary conditions
    - Adversarial inputs: Malformed/malicious inputs
    - Semantic drift: Test for meaning preservation
    - Performance stress: Load/latency testing
    - Security probes: Injection attempts
    """

    def __init__(self, llm_client=None):
        """
        Initialize the SPICE Challenger.

        Args:
            llm_client: Optional LLM client for generating challenges
        """
        self.llm_client = llm_client
        self._challenge_counter = 0
        self._challenge_history: List[ChallengeResult] = []

    def challenge(
        self,
        output: Any,
        context: Optional[Dict[str, Any]] = None,
        challenge_types: Optional[List[str]] = None
    ) -> ChallengeReport:
        """
        Challenge an output with adversarial tests.

        Args:
            output: The output to challenge
            context: Additional context about the output
            challenge_types: Specific challenge types to run

        Returns:
            ChallengeReport with all results
        """
        context = context or {}
        challenge_types = challenge_types or ["edge_case", "semantic", "format"]

        report = ChallengeReport()

        for ctype in challenge_types:
            result = self._run_challenge(output, ctype, context)
            report.results.append(result)
            report.total_challenges += 1

            if result.passed:
                report.passed += 1
            else:
                report.failed += 1
                if result.severity == "critical":
                    report.critical_failures += 1

        # Calculate overall score
        if report.total_challenges > 0:
            report.overall_score = (report.passed / report.total_challenges) * 100

        # Generate recommendations
        report.recommendations = self._generate_recommendations(report)

        logger.info(
            f"SPICE Challenge complete: {report.passed}/{report.total_challenges} passed "
            f"(score: {report.overall_score:.1f}%)"
        )

        return report

    def _run_challenge(
        self,
        output: Any,
        challenge_type: str,
        context: Dict[str, Any]
    ) -> ChallengeResult:
        """Run a single challenge."""
        self._challenge_counter += 1
        challenge_id = f"CH-{self._challenge_counter:05d}"

        # Type-specific challenges
        if challenge_type == "edge_case":
            return self._edge_case_challenge(challenge_id, output, context)
        elif challenge_type == "semantic":
            return self._semantic_challenge(challenge_id, output, context)
        elif challenge_type == "format":
            return self._format_challenge(challenge_id, output, context)
        elif challenge_type == "security":
            return self._security_challenge(challenge_id, output, context)
        elif challenge_type == "performance":
            return self._performance_challenge(challenge_id, output, context)
        else:
            return ChallengeResult(
                challenge_id=challenge_id,
                challenge_type=challenge_type,
                original_output=output,
                challenge_input="unknown",
                passed=True,
                failure_reason=None
            )

    def _edge_case_challenge(
        self,
        challenge_id: str,
        output: Any,
        context: Dict[str, Any]
    ) -> ChallengeResult:
        """Test edge cases."""
        passed = True
        failure_reason = None

        # Check for empty output
        if output is None or output == "" or output == []:
            passed = False
            failure_reason = "Output is empty"

        # Check for truncation indicators
        if isinstance(output, str) and output.endswith("..."):
            passed = False
            failure_reason = "Output appears truncated"

        return ChallengeResult(
            challenge_id=challenge_id,
            challenge_type="edge_case",
            original_output=output,
            challenge_input="edge_case_test",
            passed=passed,
            failure_reason=failure_reason,
            severity="medium" if not passed else "low"
        )

    def _semantic_challenge(
        self,
        challenge_id: str,
        output: Any,
        context: Dict[str, Any]
    ) -> ChallengeResult:
        """Test semantic consistency."""
        passed = True
        failure_reason = None

        if isinstance(output, str):
            # Check for contradictions
            if "but" in output.lower() and "however" in output.lower():
                # Multiple contradictions might indicate confused output
                contradictions = output.lower().count("but") + output.lower().count("however")
                if contradictions > 3:
                    passed = False
                    failure_reason = "Output contains many potential contradictions"

        return ChallengeResult(
            challenge_id=challenge_id,
            challenge_type="semantic",
            original_output=output,
            challenge_input="semantic_test",
            passed=passed,
            failure_reason=failure_reason,
            severity="high" if not passed else "low"
        )

    def _format_challenge(
        self,
        challenge_id: str,
        output: Any,
        context: Dict[str, Any]
    ) -> ChallengeResult:
        """Test format correctness."""
        passed = True
        failure_reason = None

        expected_format = context.get("expected_format")

        if expected_format == "json":
            import json
            try:
                if isinstance(output, str):
                    json.loads(output)
            except json.JSONDecodeError:
                passed = False
                failure_reason = "Output is not valid JSON"

        elif expected_format == "code":
            if isinstance(output, str):
                # Basic syntax check
                if output.count("(") != output.count(")"):
                    passed = False
                    failure_reason = "Unbalanced parentheses in code"
                elif output.count("{") != output.count("}"):
                    passed = False
                    failure_reason = "Unbalanced braces in code"

        return ChallengeResult(
            challenge_id=challenge_id,
            challenge_type="format",
            original_output=output,
            challenge_input="format_test",
            passed=passed,
            failure_reason=failure_reason,
            severity="medium" if not passed else "low"
        )

    def _security_challenge(
        self,
        challenge_id: str,
        output: Any,
        context: Dict[str, Any]
    ) -> ChallengeResult:
        """Test for security issues."""
        passed = True
        failure_reason = None
        severity = "low"

        if isinstance(output, str):
            # Check for potential secrets
            secret_patterns = ["api_key=", "password=", "secret=", "token="]
            for pattern in secret_patterns:
                if pattern in output.lower():
                    passed = False
                    failure_reason = f"Potential secret exposure: {pattern}"
                    severity = "critical"
                    break

            # Check for SQL injection patterns
            if "'; DROP" in output or "1=1" in output:
                passed = False
                failure_reason = "Potential SQL injection pattern"
                severity = "critical"

        return ChallengeResult(
            challenge_id=challenge_id,
            challenge_type="security",
            original_output=output,
            challenge_input="security_test",
            passed=passed,
            failure_reason=failure_reason,
            severity=severity
        )

    def _performance_challenge(
        self,
        challenge_id: str,
        output: Any,
        context: Dict[str, Any]
    ) -> ChallengeResult:
        """Test performance characteristics."""
        passed = True
        failure_reason = None

        # Check output size
        if isinstance(output, str) and len(output) > 100000:
            passed = False
            failure_reason = f"Output too large: {len(output)} chars"

        if isinstance(output, (list, dict)):
            import sys
            size = sys.getsizeof(output)
            if size > 10_000_000:  # 10MB
                passed = False
                failure_reason = f"Output memory footprint too large: {size} bytes"

        return ChallengeResult(
            challenge_id=challenge_id,
            challenge_type="performance",
            original_output="[output size checked]",
            challenge_input="performance_test",
            passed=passed,
            failure_reason=failure_reason,
            severity="medium" if not passed else "low"
        )

    def _generate_recommendations(self, report: ChallengeReport) -> List[str]:
        """Generate improvement recommendations based on failures."""
        recommendations = []

        failed_types = {}
        for result in report.results:
            if not result.passed:
                failed_types[result.challenge_type] = result.failure_reason

        if "edge_case" in failed_types:
            recommendations.append("Add input validation and handle empty/null cases")

        if "semantic" in failed_types:
            recommendations.append("Review output for logical consistency")

        if "format" in failed_types:
            recommendations.append("Add format validation before output")

        if "security" in failed_types:
            recommendations.append("CRITICAL: Review and sanitize output for security issues")

        if "performance" in failed_types:
            recommendations.append("Optimize output size and memory usage")

        if report.critical_failures > 0:
            recommendations.insert(0, f"URGENT: {report.critical_failures} critical issues found!")

        return recommendations

    def get_challenge_history(self) -> List[ChallengeResult]:
        """Get history of all challenges run."""
        return self._challenge_history.copy()


# Module-level factory function
def get_spice_challenger(llm_client=None) -> SPICEChallengerAgent:
    """Get a SPICE Challenger instance."""
    return SPICEChallengerAgent(llm_client=llm_client)
