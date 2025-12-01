"""
Insight Deduplication Module for Genesis RL Training

Provides functions to deduplicate insights before adding to prompts,
using simple word overlap similarity (no embeddings required).

This ensures the training process doesn't accumulate redundant or
near-duplicate insights that would bloat the context and reduce
training efficiency.
"""

import re
from typing import List, Set, Tuple


def tokenize(text: str) -> Set[str]:
    """
    Tokenize text into a set of lowercase words.

    Args:
        text: Input string to tokenize

    Returns:
        Set of lowercase word tokens
    """
    # Remove punctuation and split into words
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    return set(words)


def word_overlap_similarity(text1: str, text2: str) -> float:
    """
    Compute word overlap similarity between two strings.

    Uses Jaccard similarity: |intersection| / |union|

    Args:
        text1: First string
        text2: Second string

    Returns:
        Similarity score between 0.0 and 1.0
    """
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)

    if not tokens1 or not tokens2:
        return 0.0

    intersection = tokens1 & tokens2
    union = tokens1 | tokens2

    return len(intersection) / len(union) if union else 0.0


def is_too_similar(
    new_insight: str,
    existing_insights: List[str],
    threshold: float = 0.7
) -> Tuple[bool, float, str]:
    """
    Check if a new insight is too similar to any existing insight.

    Args:
        new_insight: The new insight to check
        existing_insights: List of existing insights
        threshold: Similarity threshold (default 0.7)

    Returns:
        Tuple of (is_similar, max_similarity, most_similar_insight)
    """
    max_similarity = 0.0
    most_similar = ""

    for existing in existing_insights:
        similarity = word_overlap_similarity(new_insight, existing)
        if similarity > max_similarity:
            max_similarity = similarity
            most_similar = existing

    return (max_similarity >= threshold, max_similarity, most_similar)


def deduplicate_insights(
    new_insights: List[str],
    existing_insights: List[str],
    threshold: float = 0.7
) -> List[str]:
    """
    Return only insights that are sufficiently different from existing ones.

    Uses simple word overlap similarity (Jaccard) to determine if insights
    are too similar. This avoids the need for embedding models while still
    providing effective deduplication.

    Args:
        new_insights: List of new insights to filter
        existing_insights: List of existing insights to compare against
        threshold: Similarity threshold (0.0 to 1.0). Insights with similarity
                   >= threshold are considered duplicates. Default is 0.7.

    Returns:
        List of unique insights that passed the deduplication check

    Example:
        >>> existing = ["Use explicit numeric scores in evaluations"]
        >>> new = [
        ...     "Always use numeric scores for evaluation",  # Similar to existing
        ...     "Include code examples in feedback",         # Unique
        ... ]
        >>> deduplicate_insights(new, existing, threshold=0.7)
        ['Include code examples in feedback']
    """
    unique_insights = []

    # Combine existing insights with already-accepted new insights
    # to prevent duplicates within the new batch as well
    all_existing = list(existing_insights)

    for insight in new_insights:
        # Skip empty insights
        if not insight or not insight.strip():
            continue

        is_similar, similarity, similar_to = is_too_similar(
            insight, all_existing, threshold
        )

        if not is_similar:
            unique_insights.append(insight)
            # Add to existing to prevent intra-batch duplicates
            all_existing.append(insight)

    return unique_insights


def deduplicate_with_details(
    new_insights: List[str],
    existing_insights: List[str],
    threshold: float = 0.7
) -> Tuple[List[str], List[dict]]:
    """
    Deduplicate insights with detailed information about filtering decisions.

    Args:
        new_insights: List of new insights to filter
        existing_insights: List of existing insights to compare against
        threshold: Similarity threshold (default 0.7)

    Returns:
        Tuple of:
        - List of unique insights that passed deduplication
        - List of dicts with details about each insight's filtering decision

    Example:
        >>> unique, details = deduplicate_with_details(new, existing)
        >>> for d in details:
        ...     print(f"{d['insight'][:30]}... -> {d['status']}")
    """
    unique_insights = []
    details = []
    all_existing = list(existing_insights)

    for insight in new_insights:
        if not insight or not insight.strip():
            details.append({
                "insight": insight,
                "status": "skipped",
                "reason": "empty_insight",
                "similarity": 0.0,
                "similar_to": None,
            })
            continue

        is_similar, similarity, similar_to = is_too_similar(
            insight, all_existing, threshold
        )

        if is_similar:
            details.append({
                "insight": insight,
                "status": "filtered",
                "reason": "too_similar",
                "similarity": round(similarity, 3),
                "similar_to": similar_to,
            })
        else:
            unique_insights.append(insight)
            all_existing.append(insight)
            details.append({
                "insight": insight,
                "status": "accepted",
                "reason": "unique",
                "similarity": round(similarity, 3),
                "similar_to": similar_to if similarity > 0 else None,
            })

    return unique_insights, details


def merge_similar_insights(
    insights: List[str],
    threshold: float = 0.7
) -> List[str]:
    """
    Merge similar insights within a list, keeping the longer/more detailed one.

    Useful for consolidating insights from multiple sources.

    Args:
        insights: List of insights to merge
        threshold: Similarity threshold (default 0.7)

    Returns:
        List of merged/deduplicated insights
    """
    if not insights:
        return []

    # Sort by length (longer first) so we keep more detailed versions
    sorted_insights = sorted(insights, key=len, reverse=True)

    merged = []
    for insight in sorted_insights:
        if not insight or not insight.strip():
            continue

        is_similar, _, _ = is_too_similar(insight, merged, threshold)
        if not is_similar:
            merged.append(insight)

    return merged
