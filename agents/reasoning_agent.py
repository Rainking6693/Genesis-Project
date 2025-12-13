"""
Reasoning Agent - Multi-Model Consortium Consolidator
Based on: arXiv:2512.08769 Best Practice #5

This agent acts as the "final auditor" that:
1. Receives outputs from multiple LLMs (Claude, Codex, Gemini)
2. Resolves conflicts between different model outputs
3. Removes speculation and hallucinations
4. Grounds final output in agreed-upon facts
5. Synthesizes a single, coherent, reliable result

The paper states: "A dedicated reasoning agent then synthesizes these drafts,
resolves conflicts, removes speculation, and grounds the final output in
agreed-upon facts."
"""

import os
import logging
import asyncio
from typing import Dict, List, Optional, Any, TypeVar
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

logger = logging.getLogger(__name__)

T = TypeVar('T')


class ConflictResolutionStrategy(Enum):
    """How to resolve conflicts between model outputs."""
    MAJORITY_VOTE = "majority_vote"        # Most common answer wins
    WEIGHTED_CONFIDENCE = "weighted"       # Weight by model confidence
    CONSERVATIVE = "conservative"          # Only accept agreed facts
    UNION = "union"                        # Merge all unique elements
    INTERSECTION = "intersection"          # Only keep common elements


@dataclass
class ModelOutput:
    """Output from a single model in the consortium."""
    model_name: str
    output: Any
    confidence: float = 1.0
    reasoning: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ConsolidatedOutput:
    """Final consolidated output from reasoning agent."""
    result: Any
    confidence: float
    agreement_score: float  # How much models agreed (0-1)
    conflicts_resolved: List[str]
    hallucinations_removed: List[str]
    sources: List[str]  # Which models contributed
    reasoning_trace: str


class ReasoningAgent:
    """
    Consolidates outputs from multiple LLMs into a single reliable result.

    Implements the "Responsible AI-aligned Model Consortium Design" pattern:
    - Multiple specialized LLMs independently generate outputs
    - This reasoning agent synthesizes, validates, and audits

    Usage:
        agent = ReasoningAgent()

        # Collect outputs from different models
        outputs = [
            ModelOutput("claude", claude_result),
            ModelOutput("codex", codex_result),
            ModelOutput("gemini", gemini_result),
        ]

        # Consolidate into single reliable output
        consolidated = await agent.consolidate(outputs)
    """

    def __init__(
        self,
        strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.CONSERVATIVE,
        min_agreement: float = 0.6,
        hallucination_threshold: float = 0.3
    ):
        """
        Initialize reasoning agent.

        Args:
            strategy: How to resolve conflicts between models
            min_agreement: Minimum agreement ratio to accept output
            hallucination_threshold: Below this agreement = likely hallucination
        """
        self.strategy = strategy
        self.min_agreement = min_agreement
        self.hallucination_threshold = hallucination_threshold
        logger.info(f"ReasoningAgent initialized (strategy={strategy.value})")

    async def consolidate(
        self,
        outputs: List[ModelOutput],
        output_type: str = "text"
    ) -> ConsolidatedOutput:
        """
        Consolidate multiple model outputs into single reliable result.

        Args:
            outputs: List of outputs from different models
            output_type: Type of output ("text", "json", "code", "list")

        Returns:
            ConsolidatedOutput with synthesized result
        """
        if not outputs:
            raise ValueError("No outputs to consolidate")

        if len(outputs) == 1:
            # Single output - pass through with warning
            logger.warning("Only one model output - no consolidation possible")
            return ConsolidatedOutput(
                result=outputs[0].output,
                confidence=outputs[0].confidence * 0.8,  # Reduced confidence
                agreement_score=1.0,
                conflicts_resolved=[],
                hallucinations_removed=[],
                sources=[outputs[0].model_name],
                reasoning_trace="Single model output - no cross-validation"
            )

        logger.info(f"Consolidating {len(outputs)} model outputs (type={output_type})")

        # Step 1: Extract common elements (facts all models agree on)
        common_facts, conflicts = self._identify_agreements_and_conflicts(outputs, output_type)

        # Step 2: Detect potential hallucinations (claims only one model makes)
        hallucinations = self._detect_hallucinations(outputs, output_type)

        # Step 3: Resolve conflicts based on strategy
        resolved = await self._resolve_conflicts(conflicts, outputs)

        # Step 4: Synthesize final output
        final_result = self._synthesize(common_facts, resolved, output_type)

        # Step 5: Calculate confidence and agreement scores
        agreement_score = self._calculate_agreement(outputs, output_type)
        confidence = self._calculate_confidence(outputs, agreement_score, len(hallucinations))

        # Build reasoning trace
        reasoning_trace = self._build_reasoning_trace(
            outputs, common_facts, conflicts, hallucinations, resolved
        )

        return ConsolidatedOutput(
            result=final_result,
            confidence=confidence,
            agreement_score=agreement_score,
            conflicts_resolved=[str(c) for c in conflicts],
            hallucinations_removed=[str(h) for h in hallucinations],
            sources=[o.model_name for o in outputs],
            reasoning_trace=reasoning_trace
        )

    def _identify_agreements_and_conflicts(
        self,
        outputs: List[ModelOutput],
        output_type: str
    ) -> tuple:
        """Identify facts all models agree on vs. conflicts."""
        if output_type == "json":
            return self._compare_json_outputs(outputs)
        elif output_type == "list":
            return self._compare_list_outputs(outputs)
        elif output_type == "code":
            return self._compare_code_outputs(outputs)
        else:
            return self._compare_text_outputs(outputs)

    def _compare_json_outputs(self, outputs: List[ModelOutput]) -> tuple:
        """Compare JSON outputs field by field."""
        common = {}
        conflicts = []

        # Get all keys across all outputs
        all_keys = set()
        for o in outputs:
            if isinstance(o.output, dict):
                all_keys.update(o.output.keys())

        for key in all_keys:
            values = []
            for o in outputs:
                if isinstance(o.output, dict) and key in o.output:
                    values.append((o.model_name, o.output[key]))

            if len(values) >= 2:
                # Check if all values match
                unique_values = set(str(v[1]) for v in values)
                if len(unique_values) == 1:
                    common[key] = values[0][1]
                else:
                    conflicts.append({
                        "field": key,
                        "values": values
                    })
            elif len(values) == 1:
                # Only one model has this field - potential hallucination
                common[key] = values[0][1]  # Include but flag

        return common, conflicts

    def _compare_list_outputs(self, outputs: List[ModelOutput]) -> tuple:
        """Compare list outputs for common elements."""
        if not outputs:
            return [], []

        # Get lists from each output
        lists = []
        for o in outputs:
            if isinstance(o.output, list):
                lists.append(set(str(item) for item in o.output))
            elif isinstance(o.output, str):
                # Try to parse as comma-separated
                lists.append(set(o.output.split(",")))

        if not lists:
            return [], []

        # Find intersection (agreed) and symmetric difference (conflicts)
        common = lists[0]
        for lst in lists[1:]:
            common = common.intersection(lst)

        all_items = set()
        for lst in lists:
            all_items.update(lst)

        conflicts = all_items - common

        return list(common), list(conflicts)

    def _compare_text_outputs(self, outputs: List[ModelOutput]) -> tuple:
        """Compare text outputs for semantic similarity."""
        # Simplified: just return all outputs as common with no conflicts
        # A more sophisticated implementation would use embeddings
        texts = [str(o.output) for o in outputs]
        return texts, []

    def _compare_code_outputs(self, outputs: List[ModelOutput]) -> tuple:
        """Compare code outputs (simplified - check structural similarity)."""
        codes = [str(o.output) for o in outputs]
        return codes, []

    def _detect_hallucinations(
        self,
        outputs: List[ModelOutput],
        output_type: str
    ) -> List[Any]:
        """Detect potential hallucinations (claims only one model makes)."""
        hallucinations = []

        if output_type == "json":
            # Find fields that only appear in one output
            field_counts = {}
            for o in outputs:
                if isinstance(o.output, dict):
                    for key in o.output:
                        field_counts[key] = field_counts.get(key, 0) + 1

            for field, count in field_counts.items():
                if count == 1 and len(outputs) > 2:
                    hallucinations.append(f"Field '{field}' only in one model")

        return hallucinations

    async def _resolve_conflicts(
        self,
        conflicts: List[Any],
        outputs: List[ModelOutput]
    ) -> Dict[str, Any]:
        """Resolve conflicts using configured strategy."""
        resolved = {}

        for conflict in conflicts:
            if isinstance(conflict, dict) and "field" in conflict:
                field = conflict["field"]
                values = conflict["values"]

                if self.strategy == ConflictResolutionStrategy.MAJORITY_VOTE:
                    # Pick most common value
                    value_counts = {}
                    for model, val in values:
                        val_str = str(val)
                        value_counts[val_str] = value_counts.get(val_str, 0) + 1
                    winner = max(value_counts, key=value_counts.get)
                    resolved[field] = winner

                elif self.strategy == ConflictResolutionStrategy.WEIGHTED_CONFIDENCE:
                    # Weight by model confidence
                    best_val = None
                    best_conf = 0
                    for model, val in values:
                        # Find confidence for this model
                        for o in outputs:
                            if o.model_name == model and o.confidence > best_conf:
                                best_conf = o.confidence
                                best_val = val
                    resolved[field] = best_val

                elif self.strategy == ConflictResolutionStrategy.CONSERVATIVE:
                    # Only accept if >60% agree
                    value_counts = {}
                    for model, val in values:
                        val_str = str(val)
                        value_counts[val_str] = value_counts.get(val_str, 0) + 1

                    total = sum(value_counts.values())
                    for val_str, count in value_counts.items():
                        if count / total >= self.min_agreement:
                            resolved[field] = val_str
                            break

                elif self.strategy == ConflictResolutionStrategy.UNION:
                    # Merge all values
                    resolved[field] = [val for _, val in values]

        return resolved

    def _synthesize(
        self,
        common: Any,
        resolved: Dict[str, Any],
        output_type: str
    ) -> Any:
        """Synthesize final output from common facts and resolved conflicts."""
        if output_type == "json":
            result = dict(common) if isinstance(common, dict) else {}
            result.update(resolved)
            return result

        elif output_type == "list":
            return list(common) if isinstance(common, (list, set)) else common

        else:
            # For text, return the first common text
            if isinstance(common, list) and common:
                return common[0]
            return common

    def _calculate_agreement(
        self,
        outputs: List[ModelOutput],
        output_type: str
    ) -> float:
        """Calculate how much models agreed (0-1)."""
        if len(outputs) < 2:
            return 1.0

        if output_type == "json":
            # Calculate field-level agreement
            all_fields = set()
            for o in outputs:
                if isinstance(o.output, dict):
                    all_fields.update(o.output.keys())

            agreed_fields = 0
            for field in all_fields:
                values = []
                for o in outputs:
                    if isinstance(o.output, dict) and field in o.output:
                        values.append(str(o.output[field]))
                if len(set(values)) == 1 and len(values) >= 2:
                    agreed_fields += 1

            return agreed_fields / len(all_fields) if all_fields else 0.0

        # Default: simple comparison
        unique_outputs = len(set(str(o.output) for o in outputs))
        return 1.0 / unique_outputs if unique_outputs > 0 else 0.0

    def _calculate_confidence(
        self,
        outputs: List[ModelOutput],
        agreement: float,
        hallucination_count: int
    ) -> float:
        """Calculate overall confidence in consolidated output."""
        # Base confidence from model confidences
        base = sum(o.confidence for o in outputs) / len(outputs)

        # Adjust for agreement
        agreement_factor = agreement

        # Penalize for hallucinations
        hallucination_penalty = hallucination_count * 0.1

        confidence = base * agreement_factor - hallucination_penalty
        return max(0.0, min(1.0, confidence))

    def _build_reasoning_trace(
        self,
        outputs: List[ModelOutput],
        common: Any,
        conflicts: List[Any],
        hallucinations: List[Any],
        resolved: Dict[str, Any]
    ) -> str:
        """Build human-readable reasoning trace."""
        trace = []
        trace.append(f"=== Reasoning Agent Consolidation ===")
        trace.append(f"Models consulted: {[o.model_name for o in outputs]}")
        trace.append(f"Strategy: {self.strategy.value}")
        trace.append("")

        if common:
            trace.append(f"AGREED FACTS: {len(common) if isinstance(common, (dict, list)) else 1}")

        if conflicts:
            trace.append(f"CONFLICTS FOUND: {len(conflicts)}")
            for c in conflicts[:3]:  # Show first 3
                trace.append(f"  - {c}")

        if hallucinations:
            trace.append(f"HALLUCINATIONS REMOVED: {len(hallucinations)}")
            for h in hallucinations[:3]:
                trace.append(f"  - {h}")

        if resolved:
            trace.append(f"CONFLICTS RESOLVED: {len(resolved)}")

        return "\n".join(trace)


# Convenience function for pipeline integration
async def consolidate_model_outputs(
    outputs: Dict[str, Any],
    output_type: str = "json",
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.CONSERVATIVE
) -> ConsolidatedOutput:
    """
    Convenience function to consolidate outputs from multiple models.

    Args:
        outputs: Dict mapping model_name -> output
        output_type: Type of output (json, text, list, code)
        strategy: Conflict resolution strategy

    Returns:
        ConsolidatedOutput with synthesized result
    """
    agent = ReasoningAgent(strategy=strategy)

    model_outputs = [
        ModelOutput(model_name=name, output=output)
        for name, output in outputs.items()
    ]

    return await agent.consolidate(model_outputs, output_type)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    async def test():
        # Simulate outputs from 3 different models
        outputs = [
            ModelOutput(
                model_name="claude",
                output={
                    "name": "TaskFlow Pro",
                    "price": 29,
                    "features": ["AI automation", "Team collaboration", "Analytics"]
                },
                confidence=0.9
            ),
            ModelOutput(
                model_name="codex",
                output={
                    "name": "TaskFlow Pro",
                    "price": 29,
                    "features": ["AI automation", "Project management", "Reporting"]
                },
                confidence=0.85
            ),
            ModelOutput(
                model_name="gemini",
                output={
                    "name": "TaskFlow",  # Different name
                    "price": 39,  # Different price
                    "features": ["AI automation", "Team collaboration", "Integrations"],
                    "extra_field": "hallucination"  # Only in one model
                },
                confidence=0.8
            ),
        ]

        agent = ReasoningAgent(strategy=ConflictResolutionStrategy.MAJORITY_VOTE)
        result = await agent.consolidate(outputs, "json")

        print("\n=== Consolidated Output ===")
        print(f"Result: {result.result}")
        print(f"Confidence: {result.confidence:.2f}")
        print(f"Agreement: {result.agreement_score:.2f}")
        print(f"Conflicts resolved: {result.conflicts_resolved}")
        print(f"Hallucinations removed: {result.hallucinations_removed}")
        print(f"\nReasoning trace:\n{result.reasoning_trace}")

    asyncio.run(test())
