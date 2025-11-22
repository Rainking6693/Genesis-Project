#!/usr/bin/env python3
"""
Sample Training Data to Reduce Fine-Tuning Cost

Reduces training data from ~20k to ~5k examples per agent
while maintaining cross-agent learning diversity.

Usage:
    python3 scripts/sample_training_data.py --sample_size 5000
"""

import json
import random
from pathlib import Path
from collections import defaultdict
import argparse

def sample_training_data(input_dir: Path, output_dir: Path, sample_size: int):
    """Sample training data while preserving cross-agent diversity"""

    output_dir.mkdir(parents=True, exist_ok=True)

    agents = ["qa_agent", "support_agent", "legal_agent", "analyst_agent", "content_agent"]

    total_sampled = 0
    for agent in agents:
        input_file = input_dir / f"{agent}_training.jsonl"
        output_file = output_dir / f"{agent}_training.jsonl"

        if not input_file.exists():
            print(f"⚠️  {input_file} not found, skipping")
            continue

        # Load all examples
        examples = []
        with open(input_file, 'r') as f:
            for line in f:
                examples.append(json.loads(line))

        original_count = len(examples)

        # Stratified sampling to preserve weight distribution
        # Group by weight
        by_weight = defaultdict(list)
        for ex in examples:
            # Try to get weight from original Unsloth format if available
            # For OpenAI format (no weight), assume uniform distribution
            weight = ex.get('weight', 1.0)
            by_weight[weight].append(ex)

        # Sample proportionally from each weight bucket
        sampled = []
        for weight, weight_examples in by_weight.items():
            proportion = len(weight_examples) / original_count
            bucket_sample_size = int(sample_size * proportion)

            if len(weight_examples) <= bucket_sample_size:
                # Take all if bucket is smaller than target
                sampled.extend(weight_examples)
            else:
                # Random sample from bucket
                sampled.extend(random.sample(weight_examples, bucket_sample_size))

        # If we're slightly under sample_size due to rounding, add more examples
        if len(sampled) < sample_size and len(examples) > len(sampled):
            remaining = [ex for ex in examples if ex not in sampled]
            needed = min(sample_size - len(sampled), len(remaining))
            sampled.extend(random.sample(remaining, needed))

        # Shuffle to mix weights
        random.shuffle(sampled)

        # Write sampled examples
        with open(output_file, 'w') as f:
            for ex in sampled:
                f.write(json.dumps(ex) + '\n')

        sampled_count = len(sampled)
        total_sampled += sampled_count
        reduction = (1 - sampled_count / original_count) * 100

        print(f"✅ {agent}: {original_count} → {sampled_count} ({reduction:.1f}% reduction)")

    print(f"\n✅ Total sampled: {total_sampled} examples")
    print(f"📂 Output directory: {output_dir}")
    print(f"\n💰 Estimated cost reduction:")
    print(f"   Original (~20k each): ~$457")
    print(f"   Sampled (~5k each): ~$100-120")
    print(f"   Savings: ~$340-360")

def main():
    parser = argparse.ArgumentParser(description="Sample training data to reduce costs")
    parser.add_argument("--input_dir", default="data/openai_format",
                       help="Input directory with full training data")
    parser.add_argument("--output_dir", default="data/openai_format_sampled",
                       help="Output directory for sampled data")
    parser.add_argument("--sample_size", type=int, default=5000,
                       help="Number of examples to sample per agent")
    parser.add_argument("--seed", type=int, default=42,
                       help="Random seed for reproducibility")

    args = parser.parse_args()

    # Set random seed
    random.seed(args.seed)

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)

    if not input_dir.exists():
        print(f"❌ Input directory not found: {input_dir}")
        return 1

    print(f"📊 Sampling training data")
    print(f"   Input: {input_dir}")
    print(f"   Output: {output_dir}")
    print(f"   Sample size: {args.sample_size} per agent")
    print(f"   Random seed: {args.seed}")
    print()

    sample_training_data(input_dir, output_dir, args.sample_size)

    print(f"\n🎯 Next steps:")
    print(f"   1. Add $100-120 to OpenAI quota")
    print(f"   2. Update restart script to use: {output_dir}")
    print(f"   3. Run: bash scripts/restart_full_finetuning.sh")

    return 0

if __name__ == "__main__":
    exit(main())
