# src/rl/r1/r1_reward_functions.py
"""
HARDCORE ENTERPRISE-GRADE REWARD FUNCTIONS

Genesis must EARN every point. No free passes.
- Baseline target: ~0.4 (brutal starting point)
- Enterprise requirements: 7-20 tests must pass
- Penalties for failures, timeouts, errors
- Dynamic difficulty scaling
"""

from typing import Dict, Any, List, Optional
import math
import random


# =============================================================================
# ENTERPRISE CONSTANTS - MAKE GENESIS WORK HARD
# =============================================================================

# Minimum tests required to get any execution reward
MIN_TESTS_REQUIRED = 7
MAX_TESTS_FOR_FULL_CREDIT = 20

# Runtime thresholds (ms) - enterprise SLA requirements
RUNTIME_EXCELLENT = 100    # <100ms = excellent
RUNTIME_GOOD = 500         # <500ms = good
RUNTIME_ACCEPTABLE = 2000  # <2s = acceptable
RUNTIME_TIMEOUT = 5000     # >5s = failure

# Penalty multipliers
PENALTY_NO_TESTS = 0.1          # 90% penalty if no tests
PENALTY_INSUFFICIENT_TESTS = 0.3 # 70% penalty if < MIN_TESTS
PENALTY_TIMEOUT = 0.0           # Zero reward on timeout
PENALTY_ERROR = 0.2             # 80% penalty on errors

# Enterprise quality thresholds
ENTERPRISE_CORRECTNESS_THRESHOLD = 0.85
ENTERPRISE_COVERAGE_THRESHOLD = 0.90
ENTERPRISE_STABILITY_THRESHOLD = 0.95


# =============================================================================
# CORE REWARD FUNCTIONS - BRUTAL BUT FAIR
# =============================================================================

def reward_correctness(metrics: Dict[str, Any]) -> float:
    """
    Reward for correctness - MUST exceed enterprise threshold.

    Scoring:
    - Below 0.5: Returns 0 (unacceptable)
    - 0.5-0.85: Linear scale 0.1-0.5 (struggling)
    - 0.85-0.95: Linear scale 0.5-0.8 (enterprise-ready)
    - 0.95-1.0: Linear scale 0.8-1.0 (exceptional)
    """
    score = float(metrics.get("correctness_score", 0.0))

    if score < 0.5:
        return 0.0
    elif score < ENTERPRISE_CORRECTNESS_THRESHOLD:
        # Linear interpolation: 0.5->0.1, 0.85->0.5
        return 0.1 + (score - 0.5) * (0.4 / 0.35)
    elif score < 0.95:
        # Linear interpolation: 0.85->0.5, 0.95->0.8
        return 0.5 + (score - 0.85) * (0.3 / 0.1)
    else:
        # Linear interpolation: 0.95->0.8, 1.0->1.0
        return 0.8 + (score - 0.95) * (0.2 / 0.05)


def reward_rubric_alignment(metrics: Dict[str, Any]) -> float:
    """
    Reward for rubric coverage - enterprise requires comprehensive rubrics.

    Must cover: correctness, completeness, clarity, security, performance,
    maintainability, testability, documentation, error handling, edge cases
    """
    coverage = float(metrics.get("rubric_coverage_score", 0.0))

    # Require at least 7 dimensions covered
    dimensions_covered = metrics.get("rubric_dimensions", 0)
    if isinstance(dimensions_covered, int) and dimensions_covered < 7:
        coverage *= (dimensions_covered / 7.0)

    if coverage < 0.7:
        return coverage * 0.3  # Heavy penalty for incomplete rubrics
    elif coverage < ENTERPRISE_COVERAGE_THRESHOLD:
        return 0.21 + (coverage - 0.7) * (0.39 / 0.2)
    else:
        return 0.6 + (coverage - 0.9) * (0.4 / 0.1)


def reward_clarity_and_structure(metrics: Dict[str, Any]) -> float:
    """
    Reward for clarity and structured output - enterprise documentation standards.

    Requirements:
    - Clear section headers
    - Numbered/bulleted lists
    - Code examples where applicable
    - Unambiguous criteria
    - Actionable feedback
    """
    clarity = float(metrics.get("clarity_score", 0.0))
    structure = float(metrics.get("structure_score", 0.0))

    # Check for required elements
    has_sections = metrics.get("has_sections", False)
    has_lists = metrics.get("has_lists", False)
    has_examples = metrics.get("has_code_examples", False)
    has_actionable = metrics.get("has_actionable_items", False)

    # Bonus/penalty based on structural elements
    structure_bonus = sum([
        0.1 if has_sections else -0.1,
        0.1 if has_lists else -0.05,
        0.15 if has_examples else -0.1,
        0.1 if has_actionable else -0.1,
    ])

    base_score = 0.5 * clarity + 0.5 * structure
    final_score = max(0.0, min(1.0, base_score + structure_bonus))

    # Apply enterprise threshold
    if final_score < 0.6:
        return final_score * 0.4  # Heavy penalty
    return final_score


def reward_stability(metrics: Dict[str, Any]) -> float:
    """
    Reward for consistency - enterprise requires deterministic behavior.

    Measures variance in scores across similar inputs.
    Enterprise threshold: 95% consistency required.
    """
    stability = float(metrics.get("stability_score", 0.0))
    variance = metrics.get("score_variance", 0.1)

    # Penalize high variance
    if variance > 0.1:
        stability *= max(0.3, 1.0 - variance)

    if stability < ENTERPRISE_STABILITY_THRESHOLD:
        # Harsh penalty below enterprise threshold
        return stability * 0.5
    return 0.475 + (stability - 0.95) * (0.525 / 0.05)


def reward_efficiency(metrics: Dict[str, Any]) -> float:
    """
    Reward for token/step efficiency - enterprise cost optimization.

    Penalizes verbose responses that don't add value.
    Target: Same quality with fewer tokens.
    """
    efficiency = float(metrics.get("efficiency_score", 0.0))
    token_count = metrics.get("token_count", 1000)
    quality = metrics.get("quality_score", 0.5)

    # Calculate efficiency ratio: quality per 100 tokens
    if token_count > 0:
        efficiency_ratio = (quality * 100) / token_count
    else:
        efficiency_ratio = 0.0

    # Penalize bloated responses
    if token_count > 2000:
        efficiency *= max(0.3, 1.0 - (token_count - 2000) / 3000)

    return min(1.0, efficiency * (1 + efficiency_ratio * 0.1))


# =============================================================================
# EXECUTION REWARD FUNCTIONS - THE REAL TEST
# =============================================================================

def reward_execution_success(oph_result: Dict[str, Any]) -> float:
    """
    Reward for test execution - ENTERPRISE REQUIREMENTS.

    Minimum 7 tests must pass to get any credit.
    Full credit requires 20+ tests passing.
    Zero tests = 10% of base reward only.
    """
    tests_passed = oph_result.get("tests_passed", 0) or 0
    tests_failed = oph_result.get("tests_failed", 0) or 0
    total_tests = tests_passed + tests_failed

    # No tests at all = brutal penalty
    if total_tests == 0:
        return PENALTY_NO_TESTS

    # Insufficient tests = significant penalty
    if tests_passed < MIN_TESTS_REQUIRED:
        # Scale from 0.1 (0 tests) to 0.3 (6 tests)
        return PENALTY_NO_TESTS + (tests_passed / MIN_TESTS_REQUIRED) * (PENALTY_INSUFFICIENT_TESTS - PENALTY_NO_TESTS)

    # Calculate pass rate with enterprise scaling
    pass_rate = tests_passed / total_tests if total_tests > 0 else 0

    # Scale based on number of tests (more tests = harder to get high score)
    test_difficulty_multiplier = min(1.0, tests_passed / MAX_TESTS_FOR_FULL_CREDIT)

    # Apply enterprise threshold
    if pass_rate < 0.8:
        return 0.3 + (pass_rate * 0.2) * test_difficulty_multiplier
    elif pass_rate < 0.95:
        return 0.5 + ((pass_rate - 0.8) / 0.15) * 0.3 * test_difficulty_multiplier
    else:
        return 0.8 + ((pass_rate - 0.95) / 0.05) * 0.2 * test_difficulty_multiplier


def reward_runtime_efficiency(oph_result: Dict[str, Any]) -> float:
    """
    Reward for runtime performance - ENTERPRISE SLA.

    Thresholds:
    - <100ms: Excellent (0.9-1.0)
    - <500ms: Good (0.6-0.9)
    - <2000ms: Acceptable (0.3-0.6)
    - <5000ms: Poor (0.1-0.3)
    - >5000ms: Timeout (0.0)
    """
    runtime = oph_result.get("runtime_ms", RUNTIME_TIMEOUT) or RUNTIME_TIMEOUT

    if runtime >= RUNTIME_TIMEOUT:
        return PENALTY_TIMEOUT
    elif runtime >= RUNTIME_ACCEPTABLE:
        # Poor performance: 0.1-0.3
        return 0.1 + ((RUNTIME_TIMEOUT - runtime) / (RUNTIME_TIMEOUT - RUNTIME_ACCEPTABLE)) * 0.2
    elif runtime >= RUNTIME_GOOD:
        # Acceptable: 0.3-0.6
        return 0.3 + ((RUNTIME_ACCEPTABLE - runtime) / (RUNTIME_ACCEPTABLE - RUNTIME_GOOD)) * 0.3
    elif runtime >= RUNTIME_EXCELLENT:
        # Good: 0.6-0.9
        return 0.6 + ((RUNTIME_GOOD - runtime) / (RUNTIME_GOOD - RUNTIME_EXCELLENT)) * 0.3
    else:
        # Excellent: 0.9-1.0
        return 0.9 + ((RUNTIME_EXCELLENT - runtime) / RUNTIME_EXCELLENT) * 0.1


def reward_error_free(oph_result: Dict[str, Any]) -> float:
    """
    Reward for error-free execution - enterprise reliability.

    Any error = significant penalty.
    Warning count also affects score.
    """
    errors = oph_result.get("errors", "")
    warnings = oph_result.get("warnings", [])
    error_count = oph_result.get("error_count", 0)

    # Check for actual errors
    has_errors = bool(errors) or error_count > 0
    warning_count = len(warnings) if isinstance(warnings, list) else 0

    if has_errors:
        # Scale penalty based on error severity
        if "critical" in str(errors).lower() or "fatal" in str(errors).lower():
            return 0.0
        elif "exception" in str(errors).lower():
            return PENALTY_ERROR * 0.5
        else:
            return PENALTY_ERROR

    # Penalize warnings
    if warning_count > 0:
        return max(0.5, 1.0 - (warning_count * 0.1))

    return 1.0


# =============================================================================
# ENTERPRISE BONUS REWARDS
# =============================================================================

def reward_test_coverage(oph_result: Dict[str, Any]) -> float:
    """
    Bonus reward for comprehensive test coverage.

    Enterprise requirement: 80%+ code coverage.
    """
    coverage = oph_result.get("coverage_percent", 0) or 0

    if coverage < 50:
        return 0.0
    elif coverage < 80:
        return (coverage - 50) / 30 * 0.5
    elif coverage < 95:
        return 0.5 + (coverage - 80) / 15 * 0.3
    else:
        return 0.8 + (coverage - 95) / 5 * 0.2


def reward_edge_cases(oph_result: Dict[str, Any]) -> float:
    """
    Bonus reward for handling edge cases.

    Enterprise requirement: All edge cases tested.
    """
    edge_cases_tested = oph_result.get("edge_cases_tested", 0) or 0
    edge_cases_total = oph_result.get("edge_cases_total", 10) or 10

    if edge_cases_total == 0:
        return 0.5  # No edge cases defined

    ratio = edge_cases_tested / edge_cases_total
    return ratio * 0.8 + 0.2 if ratio > 0.5 else ratio * 0.4


def reward_security_checks(metrics: Dict[str, Any]) -> float:
    """
    Bonus reward for security considerations.

    Enterprise requirement: All security checks pass.
    """
    security_score = metrics.get("security_score", 0.5)
    vulnerabilities = metrics.get("vulnerabilities_found", 0)

    if vulnerabilities > 0:
        return max(0.0, security_score * 0.3 - vulnerabilities * 0.1)

    return security_score


# =============================================================================
# MAIN REWARD COMPUTATION - ENTERPRISE WEIGHTED
# =============================================================================

def compute_total_reward(metrics: Dict[str, Any], weights: Dict[str, float]) -> float:
    """
    Combine individual reward components into a single scalar reward.

    ENTERPRISE SCORING:
    - Base rewards are HARD to earn (target ~0.4 baseline)
    - Must pass real tests to get execution rewards
    - Penalties compound for failures
    - Maximum theoretical score: ~5.0 (nearly impossible)
    - Good score: 2.0-3.0
    - Acceptable: 1.0-2.0
    - Poor: <1.0
    """
    oph = metrics.get("oph_result", {}) if isinstance(metrics, dict) else {}

    # Core quality rewards (all using enterprise thresholds)
    r_correctness = weights.get("correctness", 1.0) * reward_correctness(metrics)
    r_clarity = weights.get("clarity", 0.8) * reward_clarity_and_structure(metrics)
    r_structure = weights.get("structure", 0.7) * reward_clarity_and_structure(metrics)
    r_stability = weights.get("stability", 0.6) * reward_stability(metrics)
    r_efficiency = weights.get("efficiency", 0.3) * reward_efficiency(metrics)

    # Execution rewards (require actual passing tests)
    r_exec = weights.get("execution_success", 0.5) * reward_execution_success(oph)
    r_runtime = weights.get("runtime_efficiency", 0.3) * reward_runtime_efficiency(oph)
    r_error = weights.get("error_free", 0.4) * reward_error_free(oph)

    # Bonus rewards (enterprise features)
    r_coverage = weights.get("test_coverage", 0.2) * reward_test_coverage(oph)
    r_edge = weights.get("edge_cases", 0.2) * reward_edge_cases(oph)
    r_security = weights.get("security", 0.3) * reward_security_checks(metrics)

    # Sum all components
    total = (r_correctness + r_clarity + r_structure + r_stability +
             r_efficiency + r_exec + r_runtime + r_error +
             r_coverage + r_edge + r_security)

    # Apply global difficulty multiplier (makes it HARDER)
    difficulty_multiplier = 0.7  # 30% harder than base calculation

    return total * difficulty_multiplier


def compute_enterprise_reward(metrics: Dict[str, Any], weights: Dict[str, float]) -> Dict[str, Any]:
    """
    Full enterprise reward breakdown with detailed scoring.

    Returns dict with individual scores for debugging/logging.
    """
    oph = metrics.get("oph_result", {}) if isinstance(metrics, dict) else {}

    breakdown = {
        "correctness": reward_correctness(metrics),
        "rubric_alignment": reward_rubric_alignment(metrics),
        "clarity_structure": reward_clarity_and_structure(metrics),
        "stability": reward_stability(metrics),
        "efficiency": reward_efficiency(metrics),
        "execution_success": reward_execution_success(oph),
        "runtime_efficiency": reward_runtime_efficiency(oph),
        "error_free": reward_error_free(oph),
        "test_coverage": reward_test_coverage(oph),
        "edge_cases": reward_edge_cases(oph),
        "security": reward_security_checks(metrics),
    }

    weighted_total = compute_total_reward(metrics, weights)

    return {
        "breakdown": breakdown,
        "weighted_total": weighted_total,
        "enterprise_grade": _get_enterprise_grade(weighted_total),
    }


def _get_enterprise_grade(score: float) -> str:
    """Convert numeric score to enterprise grade."""
    if score >= 3.5:
        return "A+ (Exceptional)"
    elif score >= 3.0:
        return "A (Enterprise Ready)"
    elif score >= 2.5:
        return "B+ (Production Ready)"
    elif score >= 2.0:
        return "B (Acceptable)"
    elif score >= 1.5:
        return "C (Needs Improvement)"
    elif score >= 1.0:
        return "D (Below Standards)"
    else:
        return "F (Unacceptable)"
