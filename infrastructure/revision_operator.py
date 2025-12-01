"""
Revision Operator - Evolution operator for revising agent outputs.

Part of the Evolution Layer 2 operators:
- Revision: Refine and correct outputs
- Recombination: Combine successful elements
- Refinement: Polish and optimize

This operator focuses on identifying and fixing issues in outputs.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
import difflib

logger = logging.getLogger(__name__)


@dataclass
class Revision:
    """A single revision applied to content."""
    revision_id: str
    original: str
    revised: str
    revision_type: str
    confidence: float
    reason: str


@dataclass
class RevisionResult:
    """Result of revision operation."""
    success: bool
    original_content: Any
    revised_content: Any
    revisions_applied: List[Revision] = field(default_factory=list)
    improvement_score: float = 0.0
    total_changes: int = 0


class RevisionOperator:
    """
    Evolution operator that revises and corrects outputs.

    Revision types:
    - Grammar: Fix grammatical errors
    - Clarity: Improve readability
    - Accuracy: Correct factual issues
    - Completeness: Fill gaps
    - Consistency: Align terminology
    """

    def __init__(self, llm_client=None):
        """
        Initialize the Revision Operator.

        Args:
            llm_client: Optional LLM for advanced revisions
        """
        self.llm_client = llm_client
        self._revision_counter = 0
        self._revision_history: List[RevisionResult] = []

        # Revision rules
        self._grammar_rules = [
            (r"  +", " "),  # Multiple spaces
            (r"\n\n\n+", "\n\n"),  # Multiple newlines
        ]

    def revise(
        self,
        content: Any,
        revision_types: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> RevisionResult:
        """
        Apply revisions to content.

        Args:
            content: Content to revise
            revision_types: Types of revisions to apply
            context: Additional context

        Returns:
            RevisionResult with revised content
        """
        revision_types = revision_types or ["grammar", "clarity", "completeness"]
        context = context or {}

        result = RevisionResult(
            success=True,
            original_content=content,
            revised_content=content
        )

        current_content = content

        for rtype in revision_types:
            revision = self._apply_revision_type(current_content, rtype, context)
            if revision:
                result.revisions_applied.append(revision)
                current_content = revision.revised
                result.total_changes += 1

        result.revised_content = current_content
        result.improvement_score = self._calculate_improvement(
            content, current_content
        )

        logger.info(
            f"Revision complete: {result.total_changes} changes, "
            f"improvement: {result.improvement_score:.2f}"
        )

        self._revision_history.append(result)
        return result

    def _apply_revision_type(
        self,
        content: Any,
        revision_type: str,
        context: Dict[str, Any]
    ) -> Optional[Revision]:
        """Apply a specific revision type."""
        if not isinstance(content, str):
            return None

        self._revision_counter += 1
        revision_id = f"REV-{self._revision_counter:05d}"

        original = content
        revised = content
        reason = ""
        confidence = 0.8

        if revision_type == "grammar":
            revised, reason = self._grammar_revision(content)
        elif revision_type == "clarity":
            revised, reason = self._clarity_revision(content)
        elif revision_type == "completeness":
            revised, reason = self._completeness_revision(content, context)
        elif revision_type == "consistency":
            revised, reason = self._consistency_revision(content, context)
        elif revision_type == "accuracy":
            revised, reason = self._accuracy_revision(content, context)

        if revised != original:
            return Revision(
                revision_id=revision_id,
                original=original,
                revised=revised,
                revision_type=revision_type,
                confidence=confidence,
                reason=reason
            )

        return None

    def _grammar_revision(self, content: str) -> Tuple[str, str]:
        """Apply grammar corrections."""
        import re
        revised = content
        reasons = []

        # Fix multiple spaces
        new_content = re.sub(r"  +", " ", revised)
        if new_content != revised:
            reasons.append("Fixed multiple spaces")
            revised = new_content

        # Fix multiple newlines
        new_content = re.sub(r"\n\n\n+", "\n\n", revised)
        if new_content != revised:
            reasons.append("Fixed multiple newlines")
            revised = new_content

        # Capitalize first letter after period
        sentences = revised.split(". ")
        capitalized = []
        for s in sentences:
            if s and s[0].islower():
                s = s[0].upper() + s[1:]
                reasons.append("Capitalized sentence start")
            capitalized.append(s)
        revised = ". ".join(capitalized)

        return revised, "; ".join(reasons) if reasons else "No changes"

    def _clarity_revision(self, content: str) -> Tuple[str, str]:
        """Improve clarity."""
        revised = content
        reasons = []

        # Replace complex phrases
        simplifications = {
            "in order to": "to",
            "due to the fact that": "because",
            "at this point in time": "now",
            "in the event that": "if",
            "for the purpose of": "to",
        }

        for complex_phrase, simple_phrase in simplifications.items():
            if complex_phrase in revised.lower():
                # Case-insensitive replace
                import re
                revised = re.sub(
                    re.escape(complex_phrase),
                    simple_phrase,
                    revised,
                    flags=re.IGNORECASE
                )
                reasons.append(f"Simplified '{complex_phrase}'")

        return revised, "; ".join(reasons) if reasons else "No changes"

    def _completeness_revision(
        self,
        content: str,
        context: Dict[str, Any]
    ) -> Tuple[str, str]:
        """Check and improve completeness."""
        revised = content
        reasons = []

        # Check for required elements
        required = context.get("required_elements", [])
        for element in required:
            if element.lower() not in content.lower():
                # Add placeholder
                revised += f"\n\n[TODO: Add {element}]"
                reasons.append(f"Added placeholder for {element}")

        # Check minimum length
        min_length = context.get("min_length", 0)
        if len(content) < min_length:
            reasons.append(f"Content below minimum length ({len(content)}/{min_length})")

        return revised, "; ".join(reasons) if reasons else "Content complete"

    def _consistency_revision(
        self,
        content: str,
        context: Dict[str, Any]
    ) -> Tuple[str, str]:
        """Ensure terminology consistency."""
        revised = content
        reasons = []

        # Term standardization
        term_map = context.get("term_map", {
            "user": "user",
            "users": "users",
            "client": "user",
            "customer": "user",
        })

        for variant, standard in term_map.items():
            if variant != standard and variant in revised.lower():
                # Only replace if it's a full word
                import re
                pattern = r"\b" + re.escape(variant) + r"\b"
                new_content = re.sub(pattern, standard, revised, flags=re.IGNORECASE)
                if new_content != revised:
                    revised = new_content
                    reasons.append(f"Standardized '{variant}' to '{standard}'")

        return revised, "; ".join(reasons) if reasons else "Terminology consistent"

    def _accuracy_revision(
        self,
        content: str,
        context: Dict[str, Any]
    ) -> Tuple[str, str]:
        """Check for accuracy issues."""
        revised = content
        reasons = []

        # Check for known inaccuracies (placeholder patterns)
        inaccuracy_patterns = [
            ("TODO", "Contains TODO placeholder"),
            ("FIXME", "Contains FIXME marker"),
            ("XXX", "Contains XXX marker"),
            ("[PLACEHOLDER]", "Contains placeholder"),
        ]

        for pattern, reason in inaccuracy_patterns:
            if pattern in content:
                reasons.append(reason)

        return revised, "; ".join(reasons) if reasons else "No accuracy issues found"

    def _calculate_improvement(self, original: Any, revised: Any) -> float:
        """Calculate improvement score."""
        if original == revised:
            return 0.0

        if isinstance(original, str) and isinstance(revised, str):
            # Use sequence matcher for similarity
            similarity = difflib.SequenceMatcher(None, original, revised).ratio()
            # More changes = higher improvement potential
            change_ratio = 1 - similarity
            return min(change_ratio * 2, 1.0)  # Scale up, cap at 1.0

        return 0.1  # Default improvement for any change

    def diff(self, original: str, revised: str) -> List[str]:
        """
        Get a diff between original and revised content.

        Args:
            original: Original content
            revised: Revised content

        Returns:
            List of diff lines
        """
        differ = difflib.unified_diff(
            original.splitlines(keepends=True),
            revised.splitlines(keepends=True),
            fromfile="original",
            tofile="revised"
        )
        return list(differ)

    def get_revision_history(self) -> List[RevisionResult]:
        """Get history of all revisions."""
        return self._revision_history.copy()


# Module-level factory function
def get_revision_operator(llm_client=None) -> RevisionOperator:
    """Get a Revision Operator instance."""
    return RevisionOperator(llm_client=llm_client)
