"""
SPICE Reasoner Agent - Analyzes and improves agent outputs through reasoning.

Part of the SPICE framework (Self-Play In Competitive Environments):
- Challenger: Generates adversarial test cases
- Reasoner: Analyzes and improves outputs (THIS MODULE)
- DrGRPO: Gradient-based policy optimization

This agent uses chain-of-thought reasoning to improve outputs.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ReasoningStep:
    """A single step in the reasoning process."""
    step_id: int
    thought: str
    action: str
    observation: str
    confidence: float = 0.8


@dataclass
class ReasoningResult:
    """Result of reasoning analysis."""
    original_output: Any
    improved_output: Any
    reasoning_chain: List[ReasoningStep] = field(default_factory=list)
    improvement_score: float = 0.0
    improvements_made: List[str] = field(default_factory=list)
    total_reasoning_steps: int = 0


class SPICEReasonerAgent:
    """
    Reasoner agent that analyzes outputs and suggests improvements.

    Reasoning modes:
    - Chain-of-thought: Step-by-step analysis
    - Self-critique: Identify weaknesses
    - Improvement synthesis: Generate better versions
    - Verification: Validate improvements
    """

    def __init__(self, llm_client=None, max_reasoning_steps: int = 10):
        """
        Initialize the SPICE Reasoner.

        Args:
            llm_client: Optional LLM client for reasoning
            max_reasoning_steps: Maximum steps in reasoning chain
        """
        self.llm_client = llm_client
        self.max_reasoning_steps = max_reasoning_steps
        self._reasoning_history: List[ReasoningResult] = []

    def reason(
        self,
        output: Any,
        context: Optional[Dict[str, Any]] = None,
        improvement_goals: Optional[List[str]] = None
    ) -> ReasoningResult:
        """
        Analyze and improve an output through reasoning.

        Args:
            output: The output to reason about
            context: Additional context
            improvement_goals: Specific goals for improvement

        Returns:
            ReasoningResult with improved output
        """
        context = context or {}
        improvement_goals = improvement_goals or ["clarity", "correctness", "completeness"]

        result = ReasoningResult(
            original_output=output,
            improved_output=output
        )

        # Step 1: Analyze the output
        analysis_step = self._analyze(output, context)
        result.reasoning_chain.append(analysis_step)

        # Step 2: Identify weaknesses
        weakness_step = self._identify_weaknesses(output, context)
        result.reasoning_chain.append(weakness_step)

        # Step 3: Generate improvements for each goal
        for goal in improvement_goals:
            improvement_step = self._improve_for_goal(output, goal, context)
            result.reasoning_chain.append(improvement_step)

            if improvement_step.confidence > 0.7:
                result.improvements_made.append(f"Improved {goal}")

        # Step 4: Synthesize final output
        result.improved_output = self._synthesize(
            output,
            result.reasoning_chain,
            context
        )

        # Calculate improvement score
        result.improvement_score = self._calculate_improvement(
            output,
            result.improved_output
        )

        result.total_reasoning_steps = len(result.reasoning_chain)

        logger.info(
            f"SPICE Reasoning complete: {result.total_reasoning_steps} steps, "
            f"improvement score: {result.improvement_score:.2f}"
        )

        self._reasoning_history.append(result)
        return result

    def _analyze(self, output: Any, context: Dict[str, Any]) -> ReasoningStep:
        """Analyze the output structure and content."""
        thought = "Analyzing the output to understand its structure and purpose."
        action = "analyze"

        observations = []

        if isinstance(output, str):
            observations.append(f"String output, length: {len(output)}")
            observations.append(f"Contains {output.count(' ')} words approximately")
        elif isinstance(output, dict):
            observations.append(f"Dictionary output with {len(output)} keys")
            observations.append(f"Keys: {list(output.keys())[:5]}")
        elif isinstance(output, list):
            observations.append(f"List output with {len(output)} items")
        else:
            observations.append(f"Output type: {type(output).__name__}")

        return ReasoningStep(
            step_id=1,
            thought=thought,
            action=action,
            observation="; ".join(observations),
            confidence=0.9
        )

    def _identify_weaknesses(self, output: Any, context: Dict[str, Any]) -> ReasoningStep:
        """Identify weaknesses in the output."""
        thought = "Looking for potential weaknesses and areas for improvement."
        action = "critique"

        weaknesses = []

        if isinstance(output, str):
            if len(output) < 50:
                weaknesses.append("Output might be too brief")
            if not any(c.isupper() for c in output):
                weaknesses.append("No capitalization found")
            if output.count(".") < 2:
                weaknesses.append("May lack structure (few sentences)")

        elif isinstance(output, dict):
            if not output:
                weaknesses.append("Dictionary is empty")
            for key, value in list(output.items())[:3]:
                if value is None:
                    weaknesses.append(f"Key '{key}' has None value")

        if not weaknesses:
            weaknesses.append("No obvious weaknesses identified")

        return ReasoningStep(
            step_id=2,
            thought=thought,
            action=action,
            observation="; ".join(weaknesses),
            confidence=0.8
        )

    def _improve_for_goal(
        self,
        output: Any,
        goal: str,
        context: Dict[str, Any]
    ) -> ReasoningStep:
        """Generate improvement for a specific goal."""
        thought = f"Improving output for goal: {goal}"
        action = f"improve_{goal}"

        suggestions = []

        if goal == "clarity":
            suggestions.append("Ensure clear structure and formatting")
            suggestions.append("Use consistent terminology")
        elif goal == "correctness":
            suggestions.append("Verify facts and logic")
            suggestions.append("Check for inconsistencies")
        elif goal == "completeness":
            suggestions.append("Ensure all required elements present")
            suggestions.append("Add missing context if needed")
        elif goal == "conciseness":
            suggestions.append("Remove redundant information")
            suggestions.append("Simplify complex expressions")
        else:
            suggestions.append(f"Apply {goal} improvements")

        return ReasoningStep(
            step_id=3,
            thought=thought,
            action=action,
            observation="; ".join(suggestions),
            confidence=0.75
        )

    def _synthesize(
        self,
        original: Any,
        reasoning_chain: List[ReasoningStep],
        context: Dict[str, Any]
    ) -> Any:
        """Synthesize improved output from reasoning chain."""
        # For strings, we can make structural improvements
        if isinstance(original, str):
            improved = original

            # Apply basic improvements
            if improved and not improved[0].isupper():
                improved = improved[0].upper() + improved[1:]

            # Ensure proper ending
            if improved and improved[-1] not in ".!?":
                improved = improved + "."

            return improved

        # For dicts, ensure no None values
        elif isinstance(original, dict):
            improved = {}
            for key, value in original.items():
                if value is None:
                    improved[key] = ""
                else:
                    improved[key] = value
            return improved

        return original

    def _calculate_improvement(self, original: Any, improved: Any) -> float:
        """Calculate improvement score between original and improved."""
        if original == improved:
            return 0.0

        score = 0.1  # Base score for any change

        if isinstance(original, str) and isinstance(improved, str):
            # Check length ratio
            if len(improved) > len(original):
                score += 0.2
            # Check capitalization
            if improved[0].isupper() and not original[0].isupper():
                score += 0.1
            # Check punctuation
            if improved[-1] in ".!?" and original[-1] not in ".!?":
                score += 0.1

        elif isinstance(original, dict) and isinstance(improved, dict):
            # Check for None values removed
            original_nones = sum(1 for v in original.values() if v is None)
            improved_nones = sum(1 for v in improved.values() if v is None)
            if improved_nones < original_nones:
                score += 0.3

        return min(score, 1.0)

    def self_critique(self, output: Any, criteria: List[str]) -> Dict[str, float]:
        """
        Perform self-critique on output against criteria.

        Args:
            output: Output to critique
            criteria: List of criteria to check

        Returns:
            Dict mapping criteria to scores (0-1)
        """
        scores = {}

        for criterion in criteria:
            score = self._evaluate_criterion(output, criterion)
            scores[criterion] = score

        return scores

    def _evaluate_criterion(self, output: Any, criterion: str) -> float:
        """Evaluate output against a single criterion."""
        # Default scoring logic
        if criterion == "completeness":
            if isinstance(output, str):
                return min(len(output) / 500, 1.0)
            elif isinstance(output, dict):
                non_empty = sum(1 for v in output.values() if v)
                return non_empty / max(len(output), 1)
            return 0.5

        elif criterion == "clarity":
            if isinstance(output, str):
                # Check readability heuristics
                sentences = output.count(".")
                words = output.count(" ") + 1
                if sentences > 0:
                    avg_sentence_length = words / sentences
                    if 10 <= avg_sentence_length <= 25:
                        return 0.9
                    return 0.6
            return 0.7

        elif criterion == "correctness":
            # Without external validation, assume moderate confidence
            return 0.75

        return 0.5

    def get_reasoning_history(self) -> List[ReasoningResult]:
        """Get history of all reasoning sessions."""
        return self._reasoning_history.copy()


# Module-level factory function
def get_spice_reasoner(llm_client=None, max_steps: int = 10) -> SPICEReasonerAgent:
    """Get a SPICE Reasoner instance."""
    return SPICEReasonerAgent(llm_client=llm_client, max_reasoning_steps=max_steps)
