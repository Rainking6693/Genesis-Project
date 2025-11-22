#!/usr/bin/env python3
"""
Unsloth Training Data Sampler

Creates balanced training samples from Unsloth-formatted datasets.
Supports multiple sampling strategies: size-based, difficulty-focused, cross-agent-only.

Usage:
    # Size-based sampling (maintains distributions)
    python scripts/sample_unsloth_data.py \
        --input data/unsloth_format/qa_agent_training.jsonl \
        --output data/unsloth_format/qa_agent_5k.jsonl \
        --size 5000

    # Difficulty-focused sampling (oversample hard examples)
    python scripts/sample_unsloth_data.py \
        --input data/unsloth_format/qa_agent_training.jsonl \
        --output data/unsloth_format/qa_agent_hard_focused.jsonl \
        --focus hard \
        --size 2000

    # Cross-agent-only sampling (exclude native examples)
    python scripts/sample_unsloth_data.py \
        --input data/unsloth_format/qa_agent_training.jsonl \
        --output data/unsloth_format/qa_agent_cross_only.jsonl \
        --cross-agent-only \
        --size 10000

Author: Cursor (AI Coding Agent)
Date: October 31, 2025
"""

import json
import random
import argparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from collections import defaultdict, Counter
from dataclasses import dataclass


@dataclass
class SamplingStats:
    """Statistics about sampled dataset"""
    total_examples: int
    native_count: int
    cross_agent_count: int
    difficulty_distribution: Dict[str, int]
    source_agent_distribution: Dict[str, int]
    weight_distribution: Dict[str, int]  # Weight ranges


def load_unsloth_jsonl(file_path: Path) -> List[dict]:
    """Load Unsloth examples from JSONL file"""
    examples = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, start=1):
            if line.strip():
                try:
                    examples.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"Warning: JSON parse error in {file_path} line {line_num}: {e}")
    return examples


def save_jsonl(examples: List[dict], file_path: Path):
    """Save examples to JSONL file"""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        for example in examples:
            f.write(json.dumps(example, ensure_ascii=False) + '\n')


def get_difficulty(example: dict) -> str:
    """Extract difficulty from example metadata"""
    metadata = example.get('metadata', {})
    difficulty = metadata.get('difficulty', 'unknown')
    return difficulty.lower()


def is_native_example(example: dict, target_agent: Optional[str] = None) -> bool:
    """
    Check if example is native (source_agent == target_agent).

    Supports both formats:
    - Alpaca format: metadata.agent == target_agent
    - Messages format: source_agent == target_agent

    If target_agent not provided, checks if source_agent == target_agent in metadata.
    """
    # Check messages format first
    source_agent = example.get('source_agent', '')
    if source_agent and target_agent:
        return source_agent == target_agent
    
    # Check Alpaca format (metadata.agent)
    metadata = example.get('metadata', {})
    agent = metadata.get('agent', '')
    if agent and target_agent:
        return agent == target_agent
    
    # Fallback: if no target_agent provided, can't determine
    return False


def get_weight(example: dict) -> float:
    """Extract weight from example (supports both formats)"""
    # Messages format: weight field
    if 'weight' in example:
        return example.get('weight', 1.0)
    # Alpaca format: might not have weight, default to 1.0
    return 1.0


def categorize_by_difficulty(examples: List[dict]) -> Dict[str, List[dict]]:
    """Group examples by difficulty"""
    categorized = defaultdict(list)
    for ex in examples:
        difficulty = get_difficulty(ex)
        categorized[difficulty].append(ex)
    return dict(categorized)


def categorize_by_source_agent(examples: List[dict]) -> Dict[str, List[dict]]:
    """Group examples by source agent"""
    categorized = defaultdict(list)
    for ex in examples:
        source = ex.get('source_agent', 'unknown')
        categorized[source].append(ex)
    return dict(categorized)


def sample_size_based(
    examples: List[dict],
    target_size: int,
    target_agent: Optional[str] = None,
    maintain_distributions: bool = True
) -> List[dict]:
    """
    Sample examples maintaining original distributions.

    Args:
        examples: All available examples
        target_size: Desired sample size
        target_agent: Target agent (for native/cross-agent split)
        maintain_distributions: If True, maintains difficulty and cross-agent distributions

    Returns:
        Sampled examples
    """
    if len(examples) <= target_size:
        return examples

    if not maintain_distributions:
        # Simple random sampling
        return random.sample(examples, target_size)

    # Calculate current distributions
    total = len(examples)
    difficulty_cats = categorize_by_difficulty(examples)
    native_examples = [ex for ex in examples if is_native_example(ex, target_agent)]
    cross_agent_examples = [ex for ex in examples if not is_native_example(ex, target_agent)]

    native_ratio = len(native_examples) / total if total > 0 else 0
    difficulty_ratios = {
        diff: len(cat_examples) / total
        for diff, cat_examples in difficulty_cats.items()
    }

    sampled = []

    # 1. Always include all native examples (if within target size)
    native_target = int(target_size * native_ratio)
    if len(native_examples) <= native_target:
        sampled.extend(native_examples)
        remaining = target_size - len(native_examples)
    else:
        # Sample native examples maintaining difficulty distribution
        native_by_diff = categorize_by_difficulty(native_examples)
        for diff, ratio in difficulty_ratios.items():
            if diff in native_by_diff:
                count = int(native_target * ratio)
                available = native_by_diff[diff]
                sampled.extend(random.sample(available, min(count, len(available))))
        remaining = target_size - len(sampled)

    # 2. Sample cross-agent examples maintaining difficulty distribution
    cross_by_diff = categorize_by_difficulty(cross_agent_examples)
    for diff, ratio in difficulty_ratios.items():
        if diff in cross_by_diff:
            count = int(remaining * ratio)
            available = cross_by_diff[diff]
            sampled.extend(random.sample(available, min(count, len(available))))

    # If we still need more, fill randomly
    if len(sampled) < target_size:
        remaining_examples = [ex for ex in examples if ex not in sampled]
        needed = target_size - len(sampled)
        sampled.extend(random.sample(remaining_examples, min(needed, len(remaining_examples))))

    # Ensure exact count
    return sampled[:target_size]


def sample_difficulty_focused(
    examples: List[dict],
    target_size: int,
    focus_difficulty: str,
    oversample_ratio: float = 0.5
) -> List[dict]:
    """
    Sample examples with focus on specific difficulty level.

    Args:
        examples: All available examples
        target_size: Desired sample size
        focus_difficulty: Difficulty to oversample ('easy', 'medium', 'hard')
        oversample_ratio: Fraction of sample to be focus difficulty (default: 0.5)

    Returns:
        Sampled examples
    """
    categorized = categorize_by_difficulty(examples)
    focus_examples = categorized.get(focus_difficulty.lower(), [])
    other_examples = [ex for ex in examples if ex not in focus_examples]

    focus_count = int(target_size * oversample_ratio)
    other_count = target_size - focus_count

    sampled = []

    # Sample focus difficulty
    if len(focus_examples) >= focus_count:
        sampled.extend(random.sample(focus_examples, focus_count))
    else:
        sampled.extend(focus_examples)
        other_count += (focus_count - len(focus_examples))

    # Sample others maintaining their relative distribution
    if other_count > 0:
        other_categorized = categorize_by_difficulty(other_examples)
        total_other = len(other_examples)
        for diff, cat_examples in other_categorized.items():
            ratio = len(cat_examples) / total_other if total_other > 0 else 0
            count = int(other_count * ratio)
            if count > 0 and cat_examples:
                sampled.extend(random.sample(cat_examples, min(count, len(cat_examples))))

    # Fill remaining randomly if needed
    if len(sampled) < target_size:
        remaining = [ex for ex in examples if ex not in sampled]
        needed = target_size - len(sampled)
        sampled.extend(random.sample(remaining, min(needed, len(remaining))))

    return sampled[:target_size]


def sample_cross_agent_only(
    examples: List[dict],
    target_size: int,
    target_agent: Optional[str] = None
) -> List[dict]:
    """
    Sample only cross-agent examples (exclude native).

    Args:
        examples: All available examples
        target_size: Desired sample size
        target_agent: Target agent (for identifying native examples)

    Returns:
        Sampled cross-agent examples
    """
    cross_agent_examples = [
        ex for ex in examples
        if not is_native_example(ex, target_agent)
    ]

    if len(cross_agent_examples) < target_size:
        print(f"Warning: Only {len(cross_agent_examples)} cross-agent examples available, "
              f"requested {target_size}")

    # Maintain difficulty distribution
    return sample_size_based(
        cross_agent_examples,
        target_size,
        target_agent=target_agent,
        maintain_distributions=True
    )


def calculate_stats(examples: List[dict], target_agent: Optional[str] = None) -> SamplingStats:
    """Calculate statistics about sampled dataset"""
    native_count = sum(1 for ex in examples if is_native_example(ex, target_agent))
    cross_agent_count = len(examples) - native_count

    difficulty_dist = Counter(get_difficulty(ex) for ex in examples)
    # Extract source agent (supports both formats)
    source_agents = []
    for ex in examples:
        source = ex.get('source_agent', '')
        if not source:
            # Try metadata.agent (Alpaca format)
            metadata = ex.get('metadata', {})
            source = metadata.get('agent', 'unknown')
        source_agents.append(source)
    source_agent_dist = Counter(source_agents)

    # Weight distribution (categorize into ranges)
    weights = [get_weight(ex) for ex in examples]
    weight_ranges = {
        '1.0': sum(1 for w in weights if w == 1.0),
        '0.7-0.9': sum(1 for w in weights if 0.7 <= w < 1.0),
        '0.4-0.6': sum(1 for w in weights if 0.4 <= w < 0.7),
        '0.2-0.3': sum(1 for w in weights if 0.2 <= w < 0.4),
        '<0.2': sum(1 for w in weights if w < 0.2),
    }

    return SamplingStats(
        total_examples=len(examples),
        native_count=native_count,
        cross_agent_count=cross_agent_count,
        difficulty_distribution=dict(difficulty_dist),
        source_agent_distribution=dict(source_agent_dist),
        weight_distribution=weight_ranges
    )


def print_stats(stats: SamplingStats, target_agent: Optional[str] = None):
    """Print formatted statistics"""
    print("\n" + "=" * 70)
    print("SAMPLING STATISTICS")
    print("=" * 70)
    print(f"Total examples:        {stats.total_examples:,}")
    print(f"  Native examples:      {stats.native_count:,} ({stats.native_count/stats.total_examples*100:.1f}%)")
    print(f"  Cross-agent examples: {stats.cross_agent_count:,} ({stats.cross_agent_count/stats.total_examples*100:.1f}%)")
    
    print(f"\nDifficulty distribution:")
    for diff, count in sorted(stats.difficulty_distribution.items()):
        pct = count / stats.total_examples * 100 if stats.total_examples > 0 else 0
        print(f"  {diff:10s} {count:6d} ({pct:5.1f}%)")

    print(f"\nSource agent distribution (top 10):")
    sorted_sources = sorted(stats.source_agent_distribution.items(), key=lambda x: -x[1])[:10]
    for agent, count in sorted_sources:
        pct = count / stats.total_examples * 100 if stats.total_examples > 0 else 0
        print(f"  {agent:20s} {count:6d} ({pct:5.1f}%)")

    print(f"\nWeight distribution:")
    for range_name, count in stats.weight_distribution.items():
        if count > 0:
            pct = count / stats.total_examples * 100 if stats.total_examples > 0 else 0
            print(f"  {range_name:10s} {count:6d} ({pct:5.1f}%)")

    print("=" * 70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Sample Unsloth training data")
    parser.add_argument('--input', type=Path, required=True,
                       help='Input Unsloth JSONL file')
    parser.add_argument('--output', type=Path, required=True,
                       help='Output JSONL file')
    parser.add_argument('--size', type=int, required=True,
                       help='Target sample size')
    parser.add_argument('--target-agent', type=str,
                       help='Target agent name (for native/cross-agent identification)')
    parser.add_argument('--focus', type=str, choices=['easy', 'medium', 'hard'],
                       help='Focus on specific difficulty (oversample)')
    parser.add_argument('--cross-agent-only', action='store_true',
                       help='Sample only cross-agent examples (exclude native)')
    parser.add_argument('--seed', type=int, default=42,
                       help='Random seed for reproducibility')
    parser.add_argument('--stats', action='store_true',
                       help='Print sampling statistics')
    parser.add_argument('--verbose', action='store_true',
                       help='Verbose output')

    args = parser.parse_args()

    # Set random seed
    random.seed(args.seed)

    # Load examples
    if not args.input.exists():
        print(f"❌ Error: Input file not found: {args.input}")
        return 1

    print(f"Loading examples from {args.input}...")
    examples = load_unsloth_jsonl(args.input)
    print(f"✅ Loaded {len(examples):,} examples")

    if len(examples) == 0:
        print("❌ Error: No examples found in input file")
        return 1

    # Determine sampling strategy
    if args.cross_agent_only:
        print(f"Sampling {args.size:,} cross-agent-only examples...")
        sampled = sample_cross_agent_only(
            examples,
            target_size=args.size,
            target_agent=args.target_agent
        )
    elif args.focus:
        print(f"Sampling {args.size:,} examples with focus on '{args.focus}' difficulty...")
        sampled = sample_difficulty_focused(
            examples,
            target_size=args.size,
            focus_difficulty=args.focus
        )
    else:
        print(f"Sampling {args.size:,} examples (maintaining distributions)...")
        sampled = sample_size_based(
            examples,
            target_size=args.size,
            target_agent=args.target_agent,
            maintain_distributions=True
        )

    print(f"✅ Sampled {len(sampled):,} examples")

    # Save output
    print(f"Saving to {args.output}...")
    save_jsonl(sampled, args.output)
    print(f"✅ Saved {len(sampled):,} examples to {args.output}")

    # Print statistics
    if args.stats or args.verbose:
        stats = calculate_stats(sampled, target_agent=args.target_agent)
        print_stats(stats, target_agent=args.target_agent)

    return 0


if __name__ == '__main__':
    exit(main())

