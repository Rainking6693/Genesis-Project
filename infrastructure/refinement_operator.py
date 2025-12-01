"""
Refinement Operator - Evolution operator for polishing and optimizing outputs.

Part of the Evolution Layer 2 operators:
- Revision: Refine and correct outputs
- Recombination: Combine successful elements
- Refinement: Polish and optimize (THIS MODULE)

This operator applies final polish to maximize output quality.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class RefinementStep:
    """A single refinement step."""
    step_id: str
    refinement_type: str
    before: Any
    after: Any
    improvement_delta: float
    description: str


@dataclass
class RefinementResult:
    """Result of refinement operation."""
    success: bool
    original: Any
    refined: Any
    steps: List[RefinementStep] = field(default_factory=list)
    total_improvement: float = 0.0
    quality_score: float = 0.0
    iterations: int = 0


class RefinementOperator:
    """
    Evolution operator that polishes and optimizes outputs.

    Refinement types:
    - Structural: Improve organization
    - Stylistic: Enhance style and tone
    - Performance: Optimize for efficiency
    - Precision: Increase accuracy
    - Compression: Reduce redundancy
    """

    def __init__(self, llm_client=None, max_iterations: int = 5):
        """
        Initialize the Refinement Operator.

        Args:
            llm_client: Optional LLM for advanced refinements
            max_iterations: Maximum refinement iterations
        """
        self.llm_client = llm_client
        self.max_iterations = max_iterations
        self._step_counter = 0
        self._refinement_history: List[RefinementResult] = []

    def refine(
        self,
        content: Any,
        refinement_types: Optional[List[str]] = None,
        target_quality: float = 0.9,
        context: Optional[Dict[str, Any]] = None
    ) -> RefinementResult:
        """
        Refine content to maximize quality.

        Args:
            content: Content to refine
            refinement_types: Types of refinements to apply
            target_quality: Target quality score (0-1)
            context: Additional context

        Returns:
            RefinementResult with refined content
        """
        refinement_types = refinement_types or [
            "structural", "stylistic", "compression"
        ]
        context = context or {}

        result = RefinementResult(
            success=True,
            original=content,
            refined=content
        )

        current = content
        current_quality = self._assess_quality(current, context)

        for iteration in range(self.max_iterations):
            if current_quality >= target_quality:
                break

            result.iterations += 1
            improved = False

            for rtype in refinement_types:
                step = self._apply_refinement(current, rtype, context)
                if step and step.improvement_delta > 0:
                    result.steps.append(step)
                    current = step.after
                    result.total_improvement += step.improvement_delta
                    improved = True

            new_quality = self._assess_quality(current, context)
            if not improved or new_quality <= current_quality:
                break

            current_quality = new_quality

        result.refined = current
        result.quality_score = self._assess_quality(current, context)

        logger.info(
            f"Refinement complete: {result.iterations} iterations, "
            f"quality: {result.quality_score:.2f}"
        )

        self._refinement_history.append(result)
        return result

    def _apply_refinement(
        self,
        content: Any,
        refinement_type: str,
        context: Dict[str, Any]
    ) -> Optional[RefinementStep]:
        """Apply a specific refinement type."""
        self._step_counter += 1
        step_id = f"REFINE-{self._step_counter:05d}"

        before = content

        if refinement_type == "structural":
            after, delta, desc = self._structural_refinement(content, context)
        elif refinement_type == "stylistic":
            after, delta, desc = self._stylistic_refinement(content, context)
        elif refinement_type == "performance":
            after, delta, desc = self._performance_refinement(content, context)
        elif refinement_type == "precision":
            after, delta, desc = self._precision_refinement(content, context)
        elif refinement_type == "compression":
            after, delta, desc = self._compression_refinement(content, context)
        else:
            return None

        if delta > 0:
            return RefinementStep(
                step_id=step_id,
                refinement_type=refinement_type,
                before=before,
                after=after,
                improvement_delta=delta,
                description=desc
            )

        return None

    def _structural_refinement(
        self,
        content: Any,
        context: Dict[str, Any]
    ) -> Tuple[Any, float, str]:
        """Improve structural organization."""
        if not isinstance(content, str):
            return content, 0.0, "No structural changes"

        refined = content
        improvements = []

        # Add paragraph breaks if too dense
        if len(refined) > 500 and refined.count("\n\n") < 2:
            sentences = refined.split(". ")
            if len(sentences) > 6:
                # Add paragraph break every 3 sentences
                new_sentences = []
                for i, s in enumerate(sentences):
                    new_sentences.append(s)
                    if (i + 1) % 3 == 0 and i < len(sentences) - 1:
                        new_sentences[-1] += "\n"
                refined = ". ".join(new_sentences)
                improvements.append("Added paragraph breaks")

        # Ensure proper ending
        if refined and refined[-1] not in ".!?":
            refined += "."
            improvements.append("Added ending punctuation")

        delta = 0.05 * len(improvements)
        return refined, delta, "; ".join(improvements) or "No changes"

    def _stylistic_refinement(
        self,
        content: Any,
        context: Dict[str, Any]
    ) -> Tuple[Any, float, str]:
        """Enhance style and tone."""
        if not isinstance(content, str):
            return content, 0.0, "No stylistic changes"

        refined = content
        improvements = []
        target_tone = context.get("tone", "professional")

        # Remove filler words
        fillers = ["very", "really", "quite", "basically", "actually", "literally"]
        for filler in fillers:
            if f" {filler} " in refined.lower():
                import re
                pattern = r"\b" + filler + r"\b\s*"
                new_refined = re.sub(pattern, "", refined, flags=re.IGNORECASE)
                if new_refined != refined:
                    refined = new_refined
                    improvements.append(f"Removed filler word '{filler}'")

        # Strengthen weak verbs
        weak_verbs = {
            " is able to ": " can ",
            " are able to ": " can ",
            " has the ability to ": " can ",
        }
        for weak, strong in weak_verbs.items():
            if weak in refined.lower():
                refined = refined.replace(weak, strong)
                improvements.append("Strengthened weak verb")

        delta = 0.03 * len(improvements)
        return refined, delta, "; ".join(improvements) or "No changes"

    def _performance_refinement(
        self,
        content: Any,
        context: Dict[str, Any]
    ) -> Tuple[Any, float, str]:
        """Optimize for performance."""
        if isinstance(content, str):
            # Remove excessive whitespace for faster processing
            import re
            refined = re.sub(r"\s+", " ", content).strip()
            if refined != content:
                return refined, 0.02, "Normalized whitespace"

        elif isinstance(content, dict):
            # Remove None and empty values
            refined = {
                k: v for k, v in content.items()
                if v is not None and v != "" and v != []
            }
            if len(refined) < len(content):
                return refined, 0.03, "Removed empty values"

        elif isinstance(content, list):
            # Remove duplicates while preserving order
            seen = set()
            refined = []
            for item in content:
                item_key = str(item)
                if item_key not in seen:
                    seen.add(item_key)
                    refined.append(item)
            if len(refined) < len(content):
                return refined, 0.02, "Removed duplicates"

        return content, 0.0, "No performance changes"

    def _precision_refinement(
        self,
        content: Any,
        context: Dict[str, Any]
    ) -> Tuple[Any, float, str]:
        """Increase precision and accuracy."""
        if not isinstance(content, str):
            return content, 0.0, "No precision changes"

        refined = content
        improvements = []

        # Add precision to vague quantities
        vague_terms = {
            "a lot of": "numerous",
            "a few": "several",
            "many": "multiple",
            "some": "certain",
        }

        for vague, precise in vague_terms.items():
            if vague in refined.lower():
                import re
                refined = re.sub(
                    r"\b" + vague + r"\b",
                    precise,
                    refined,
                    flags=re.IGNORECASE
                )
                improvements.append(f"Replaced vague '{vague}'")

        delta = 0.02 * len(improvements)
        return refined, delta, "; ".join(improvements) or "No changes"

    def _compression_refinement(
        self,
        content: Any,
        context: Dict[str, Any]
    ) -> Tuple[Any, float, str]:
        """Reduce redundancy and compress."""
        if not isinstance(content, str):
            return content, 0.0, "No compression changes"

        refined = content
        original_length = len(content)
        improvements = []

        # Remove redundant phrases
        redundancies = [
            ("in my opinion, I think", "I think"),
            ("completely unique", "unique"),
            ("absolutely essential", "essential"),
            ("past history", "history"),
            ("future plans", "plans"),
            ("final outcome", "outcome"),
            ("end result", "result"),
        ]

        for redundant, concise in redundancies:
            if redundant in refined.lower():
                import re
                refined = re.sub(
                    redundant,
                    concise,
                    refined,
                    flags=re.IGNORECASE
                )
                improvements.append(f"Compressed '{redundant}'")

        # Calculate compression ratio
        compression_ratio = 1 - (len(refined) / original_length) if original_length > 0 else 0
        delta = compression_ratio * 0.1 if improvements else 0

        return refined, delta, "; ".join(improvements) or "No compression needed"

    def _assess_quality(self, content: Any, context: Dict[str, Any]) -> float:
        """Assess quality of content."""
        score = 0.5  # Base score

        if isinstance(content, str):
            # Length score
            target_length = context.get("target_length", 500)
            length_ratio = min(len(content) / target_length, 1.5)
            if 0.8 <= length_ratio <= 1.2:
                score += 0.15
            elif 0.5 <= length_ratio <= 1.5:
                score += 0.08

            # Structure score
            has_paragraphs = content.count("\n\n") >= 1
            has_sentences = content.count(". ") >= 2
            if has_paragraphs:
                score += 0.1
            if has_sentences:
                score += 0.1

            # Proper formatting
            if content and content[0].isupper():
                score += 0.05
            if content and content[-1] in ".!?":
                score += 0.05

        elif isinstance(content, dict):
            # Completeness score
            if content:
                non_empty = sum(1 for v in content.values() if v)
                score += 0.2 * (non_empty / len(content))

        elif isinstance(content, list):
            if content:
                score += 0.2

        return min(score, 1.0)

    def iterative_refine(
        self,
        content: Any,
        feedback_fn: callable,
        max_iterations: int = 3
    ) -> RefinementResult:
        """
        Refine with feedback loop.

        Args:
            content: Content to refine
            feedback_fn: Function that returns improvement suggestions
            max_iterations: Maximum iterations

        Returns:
            RefinementResult
        """
        result = RefinementResult(
            success=True,
            original=content,
            refined=content
        )

        current = content

        for i in range(max_iterations):
            try:
                feedback = feedback_fn(current)
                if not feedback or feedback.get("satisfied", True):
                    break

                # Apply suggested refinements
                suggestions = feedback.get("suggestions", [])
                for suggestion in suggestions:
                    step = self._apply_refinement(
                        current,
                        suggestion.get("type", "stylistic"),
                        {"suggestion": suggestion}
                    )
                    if step:
                        result.steps.append(step)
                        current = step.after
                        result.iterations += 1

            except Exception as e:
                logger.warning(f"Feedback iteration failed: {e}")
                break

        result.refined = current
        result.quality_score = self._assess_quality(current, {})

        return result

    def get_refinement_history(self) -> List[RefinementResult]:
        """Get history of all refinements."""
        return self._refinement_history.copy()


# Module-level factory function
def get_refinement_operator(llm_client=None, max_iterations: int = 5) -> RefinementOperator:
    """Get a Refinement Operator instance."""
    return RefinementOperator(llm_client=llm_client, max_iterations=max_iterations)
