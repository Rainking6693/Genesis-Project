"""
Recombination Operator - Evolution operator for combining successful outputs.

Part of the Evolution Layer 2 operators:
- Revision: Refine and correct outputs
- Recombination: Combine successful elements (THIS MODULE)
- Refinement: Polish and optimize

This operator combines successful elements from multiple outputs.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
import random

logger = logging.getLogger(__name__)


@dataclass
class RecombinationCandidate:
    """A candidate for recombination."""
    candidate_id: str
    content: Any
    fitness_score: float
    source: str
    selected_segments: List[str] = field(default_factory=list)


@dataclass
class RecombinationResult:
    """Result of recombination operation."""
    success: bool
    offspring: Any
    parents: List[RecombinationCandidate] = field(default_factory=list)
    crossover_points: List[int] = field(default_factory=list)
    fitness_score: float = 0.0
    inheritance_map: Dict[str, str] = field(default_factory=dict)


class RecombinationOperator:
    """
    Evolution operator that combines successful elements.

    Recombination strategies:
    - Single-point crossover: Split at one point
    - Multi-point crossover: Split at multiple points
    - Uniform crossover: Random selection per element
    - Semantic crossover: Combine by meaning
    """

    def __init__(self, llm_client=None):
        """
        Initialize the Recombination Operator.

        Args:
            llm_client: Optional LLM for semantic recombination
        """
        self.llm_client = llm_client
        self._recombination_counter = 0
        self._recombination_history: List[RecombinationResult] = []

    def recombine(
        self,
        candidates: List[Tuple[Any, float]],
        strategy: str = "multi_point",
        context: Optional[Dict[str, Any]] = None
    ) -> RecombinationResult:
        """
        Recombine candidates to produce offspring.

        Args:
            candidates: List of (content, fitness_score) tuples
            strategy: Recombination strategy
            context: Additional context

        Returns:
            RecombinationResult with offspring
        """
        context = context or {}

        if len(candidates) < 2:
            logger.warning("Need at least 2 candidates for recombination")
            return RecombinationResult(
                success=False,
                offspring=candidates[0][0] if candidates else None
            )

        # Convert to candidate objects
        parent_candidates = []
        for i, (content, fitness) in enumerate(candidates):
            self._recombination_counter += 1
            candidate = RecombinationCandidate(
                candidate_id=f"CAND-{self._recombination_counter:05d}",
                content=content,
                fitness_score=fitness,
                source=f"parent_{i}"
            )
            parent_candidates.append(candidate)

        # Select parents based on fitness
        parents = self._select_parents(parent_candidates)

        # Apply recombination strategy
        if strategy == "single_point":
            offspring, crossover_points = self._single_point_crossover(parents)
        elif strategy == "multi_point":
            offspring, crossover_points = self._multi_point_crossover(parents)
        elif strategy == "uniform":
            offspring, crossover_points = self._uniform_crossover(parents)
        elif strategy == "semantic":
            offspring, crossover_points = self._semantic_crossover(parents, context)
        else:
            offspring, crossover_points = self._multi_point_crossover(parents)

        # Calculate offspring fitness
        offspring_fitness = self._estimate_offspring_fitness(parents, offspring)

        result = RecombinationResult(
            success=True,
            offspring=offspring,
            parents=parents,
            crossover_points=crossover_points,
            fitness_score=offspring_fitness,
            inheritance_map=self._build_inheritance_map(parents, offspring)
        )

        logger.info(
            f"Recombination complete: {len(parents)} parents -> "
            f"offspring with fitness {offspring_fitness:.2f}"
        )

        self._recombination_history.append(result)
        return result

    def _select_parents(
        self,
        candidates: List[RecombinationCandidate],
        num_parents: int = 2
    ) -> List[RecombinationCandidate]:
        """Select parents using tournament selection."""
        if len(candidates) <= num_parents:
            return candidates

        # Tournament selection
        selected = []
        for _ in range(num_parents):
            # Pick 2 random candidates
            tournament = random.sample(candidates, min(2, len(candidates)))
            # Select the one with higher fitness
            winner = max(tournament, key=lambda c: c.fitness_score)
            selected.append(winner)
            # Remove from candidates to avoid duplicates
            candidates = [c for c in candidates if c.candidate_id != winner.candidate_id]

        return selected

    def _single_point_crossover(
        self,
        parents: List[RecombinationCandidate]
    ) -> Tuple[Any, List[int]]:
        """Single-point crossover."""
        if len(parents) < 2:
            return parents[0].content, []

        p1, p2 = parents[0].content, parents[1].content

        if isinstance(p1, str) and isinstance(p2, str):
            # For strings, split at midpoint
            point = min(len(p1), len(p2)) // 2
            offspring = p1[:point] + p2[point:]
            return offspring, [point]

        elif isinstance(p1, list) and isinstance(p2, list):
            point = min(len(p1), len(p2)) // 2
            offspring = p1[:point] + p2[point:]
            return offspring, [point]

        elif isinstance(p1, dict) and isinstance(p2, dict):
            # For dicts, take half keys from each
            all_keys = list(set(p1.keys()) | set(p2.keys()))
            point = len(all_keys) // 2
            offspring = {}
            for i, key in enumerate(all_keys):
                if i < point:
                    offspring[key] = p1.get(key, p2.get(key))
                else:
                    offspring[key] = p2.get(key, p1.get(key))
            return offspring, [point]

        return p1, []

    def _multi_point_crossover(
        self,
        parents: List[RecombinationCandidate],
        num_points: int = 2
    ) -> Tuple[Any, List[int]]:
        """Multi-point crossover."""
        if len(parents) < 2:
            return parents[0].content, []

        p1, p2 = parents[0].content, parents[1].content

        if isinstance(p1, str) and isinstance(p2, str):
            length = min(len(p1), len(p2))
            if length < num_points + 1:
                return self._single_point_crossover(parents)

            # Generate random crossover points
            points = sorted(random.sample(range(1, length), num_points))

            # Build offspring by alternating between parents
            offspring_parts = []
            use_p1 = True
            prev_point = 0

            for point in points + [length]:
                if use_p1:
                    offspring_parts.append(p1[prev_point:point])
                else:
                    offspring_parts.append(p2[prev_point:point])
                use_p1 = not use_p1
                prev_point = point

            return "".join(offspring_parts), points

        elif isinstance(p1, list) and isinstance(p2, list):
            length = min(len(p1), len(p2))
            if length < num_points + 1:
                return self._single_point_crossover(parents)

            points = sorted(random.sample(range(1, length), num_points))
            offspring = []
            use_p1 = True
            prev_point = 0

            for point in points + [length]:
                if use_p1:
                    offspring.extend(p1[prev_point:point])
                else:
                    offspring.extend(p2[prev_point:point])
                use_p1 = not use_p1
                prev_point = point

            return offspring, points

        return self._single_point_crossover(parents)

    def _uniform_crossover(
        self,
        parents: List[RecombinationCandidate]
    ) -> Tuple[Any, List[int]]:
        """Uniform crossover - randomly select from each parent."""
        if len(parents) < 2:
            return parents[0].content, []

        p1, p2 = parents[0].content, parents[1].content

        if isinstance(p1, str) and isinstance(p2, str):
            length = min(len(p1), len(p2))
            offspring = ""
            crossover_points = []

            for i in range(length):
                if random.random() < 0.5:
                    offspring += p1[i]
                else:
                    offspring += p2[i]
                    crossover_points.append(i)

            return offspring, crossover_points

        elif isinstance(p1, list) and isinstance(p2, list):
            length = min(len(p1), len(p2))
            offspring = []
            crossover_points = []

            for i in range(length):
                if random.random() < 0.5:
                    offspring.append(p1[i])
                else:
                    offspring.append(p2[i])
                    crossover_points.append(i)

            return offspring, crossover_points

        elif isinstance(p1, dict) and isinstance(p2, dict):
            offspring = {}
            crossover_points = []
            all_keys = list(set(p1.keys()) | set(p2.keys()))

            for i, key in enumerate(all_keys):
                if random.random() < 0.5:
                    offspring[key] = p1.get(key, p2.get(key))
                else:
                    offspring[key] = p2.get(key, p1.get(key))
                    crossover_points.append(i)

            return offspring, crossover_points

        return p1, []

    def _semantic_crossover(
        self,
        parents: List[RecombinationCandidate],
        context: Dict[str, Any]
    ) -> Tuple[Any, List[int]]:
        """Semantic crossover - combine by meaning (requires LLM)."""
        if len(parents) < 2:
            return parents[0].content, []

        p1, p2 = parents[0].content, parents[1].content

        # Without LLM, fall back to segment-based combination
        if isinstance(p1, str) and isinstance(p2, str):
            # Split by sentences
            sentences1 = p1.split(". ")
            sentences2 = p2.split(". ")

            # Interleave sentences
            offspring_sentences = []
            max_len = max(len(sentences1), len(sentences2))

            for i in range(max_len):
                if i < len(sentences1):
                    offspring_sentences.append(sentences1[i])
                if i < len(sentences2) and sentences2[i] not in offspring_sentences:
                    offspring_sentences.append(sentences2[i])

            # Take unique sentences up to combined length
            offspring = ". ".join(offspring_sentences[:max_len])
            return offspring, list(range(0, max_len, 2))

        return self._multi_point_crossover(parents)

    def _estimate_offspring_fitness(
        self,
        parents: List[RecombinationCandidate],
        offspring: Any
    ) -> float:
        """Estimate fitness of offspring based on parents."""
        if not parents:
            return 0.0

        # Average parent fitness with bonus for successful combination
        avg_fitness = sum(p.fitness_score for p in parents) / len(parents)

        # Bonus for diversity (different parents)
        if len(parents) > 1:
            fitness_variance = sum(
                (p.fitness_score - avg_fitness) ** 2 for p in parents
            ) / len(parents)
            diversity_bonus = min(fitness_variance * 0.1, 0.1)
        else:
            diversity_bonus = 0

        return min(avg_fitness + diversity_bonus, 1.0)

    def _build_inheritance_map(
        self,
        parents: List[RecombinationCandidate],
        offspring: Any
    ) -> Dict[str, str]:
        """Build map showing what was inherited from which parent."""
        inheritance = {}

        for parent in parents:
            if isinstance(parent.content, str) and isinstance(offspring, str):
                # Find common substrings
                common = self._find_common_substrings(parent.content, offspring)
                for substring in common[:3]:  # Top 3 matches
                    inheritance[substring[:30]] = parent.source

        return inheritance

    def _find_common_substrings(self, s1: str, s2: str, min_length: int = 10) -> List[str]:
        """Find common substrings between two strings."""
        common = []
        len1, len2 = len(s1), len(s2)

        for i in range(len1):
            for j in range(len2):
                k = 0
                while (i + k < len1 and j + k < len2 and s1[i + k] == s2[j + k]):
                    k += 1
                if k >= min_length:
                    common.append(s1[i:i + k])

        # Return unique, sorted by length
        return sorted(set(common), key=len, reverse=True)

    def get_recombination_history(self) -> List[RecombinationResult]:
        """Get history of all recombinations."""
        return self._recombination_history.copy()


# Module-level factory function
def get_recombination_operator(llm_client=None) -> RecombinationOperator:
    """Get a Recombination Operator instance."""
    return RecombinationOperator(llm_client=llm_client)
