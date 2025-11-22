#!/usr/bin/env python3
"""
Training Cost Estimator

Calculates cost estimates for fine-tuning Genesis agents using Unsloth pipeline.

Supports multiple models (Claude Haiku, GPT-4o-mini, Llama 3.1) and provides
recommendations for cost optimization.

Usage:
    # Estimate cost for default scenario (100k examples, 5 agents)
    python scripts/estimate_training_cost.py

    # Custom scenario
    python scripts/estimate_training_cost.py \
        --examples-per-agent 20000 \
        --num-agents 5 \
        --epochs 3 \
        --model claude-haiku

    # Estimate for all models
    python scripts/estimate_training_cost.py --compare-all-models

Author: Cursor (AI Coding Agent)
Date: October 31, 2025
"""

import argparse
import json
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ModelPricing:
    """Model pricing information"""
    name: str
    input_cost_per_1k_tokens: float
    output_cost_per_1k_tokens: float
    display_name: str


# Model pricing (as of Oct 2025)
MODEL_PRICING = {
    'claude-haiku': ModelPricing(
        name='claude-haiku',
        input_cost_per_1k_tokens=0.00025,
        output_cost_per_1k_tokens=0.00125,
        display_name='Claude 3.5 Haiku'
    ),
    'gpt-4o-mini': ModelPricing(
        name='gpt-4o-mini',
        input_cost_per_1k_tokens=0.00015,
        output_cost_per_1k_tokens=0.0006,
        display_name='GPT-4o-mini'
    ),
    'llama-3.1-8b': ModelPricing(
        name='llama-3.1-8b',
        input_cost_per_1k_tokens=0.0,  # Self-hosted
        output_cost_per_1k_tokens=0.0,
        display_name='Llama 3.1 8B (Self-hosted)'
    ),
}


def estimate_tokens_per_example(
    avg_user_tokens: int = 300,
    avg_assistant_tokens: int = 600,
    system_prompt_tokens: int = 200
) -> int:
    """
    Estimate total tokens per training example.

    Unsloth format includes:
    - System prompt (one-time per conversation)
    - User message (instruction + input)
    - Assistant message (output)
    """
    return system_prompt_tokens + avg_user_tokens + avg_assistant_tokens


def calculate_training_cost(
    num_examples: int,
    tokens_per_example: int,
    epochs: int,
    model: ModelPricing,
    train_plus_inference_factor: float = 1.5
) -> Dict[str, float]:
    """
    Calculate training cost for fine-tuning.

    Args:
        num_examples: Number of training examples
        tokens_per_example: Average tokens per example
        epochs: Number of training epochs
        model: Model pricing information
        train_plus_inference_factor: Multiplier for training overhead (default 1.5x)

    Returns:
        Dict with cost breakdown
    """
    # Total tokens processed
    total_tokens = num_examples * tokens_per_example * epochs * train_plus_inference_factor

    # Estimate input/output split (training typically 90% input, 10% output)
    input_tokens = total_tokens * 0.9
    output_tokens = total_tokens * 0.1

    # Calculate costs
    input_cost = (input_tokens / 1000) * model.input_cost_per_1k_tokens
    output_cost = (output_tokens / 1000) * model.output_cost_per_1k_tokens
    total_cost = input_cost + output_cost

    return {
        'total_tokens': total_tokens,
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
        'input_cost': input_cost,
        'output_cost': output_cost,
        'total_cost': total_cost,
        'cost_per_example': total_cost / num_examples if num_examples > 0 else 0,
    }


def estimate_training_time(
    num_examples: int,
    tokens_per_example: int,
    epochs: int,
    gpu_hours_per_epoch: float = 2.0
) -> Dict[str, float]:
    """
    Estimate training time.

    Args:
        num_examples: Number of training examples
        tokens_per_example: Average tokens per example
        epochs: Number of training epochs
        gpu_hours_per_epoch: GPU hours per epoch (default: 2h for 20k examples on 4x A100)

    Returns:
        Dict with time estimates
    """
    total_gpu_hours = epochs * gpu_hours_per_epoch
    total_wall_hours = total_gpu_hours  # Assuming dedicated GPUs

    return {
        'gpu_hours': total_gpu_hours,
        'wall_hours': total_wall_hours,
        'wall_days': total_wall_hours / 24,
    }


def generate_report(
    num_agents: int,
    examples_per_agent: int,
    epochs: int,
    model: ModelPricing,
    tokens_per_example: int,
    output_file: Optional[Path] = None
) -> str:
    """Generate cost estimate report"""
    total_examples = num_agents * examples_per_agent

    # Calculate per-agent cost
    per_agent_cost = calculate_training_cost(
        num_examples=examples_per_agent,
        tokens_per_example=tokens_per_example,
        epochs=epochs,
        model=model
    )

    # Calculate total cost
    total_cost = per_agent_cost['total_cost'] * num_agents

    # Estimate training time
    per_agent_time = estimate_training_time(
        num_examples=examples_per_agent,
        tokens_per_example=tokens_per_example,
        epochs=epochs
    )
    total_time = {
        'gpu_hours': per_agent_time['gpu_hours'] * num_agents,
        'wall_hours': per_agent_time['wall_hours'] * num_agents,
        'wall_days': per_agent_time['wall_days'] * num_agents,
    }

    # Generate report
    report_lines = [
        "=" * 70,
        "UNSLOTH TRAINING COST ESTIMATE",
        "=" * 70,
        "",
        f"Model: {model.display_name}",
        f"Dataset: {total_examples:,} examples ({num_agents} agents × {examples_per_agent:,} examples)",
        f"Training: {epochs} epochs",
        f"Avg tokens per example: {tokens_per_example:,}",
        "",
        "-" * 70,
        "PER-AGENT BREAKDOWN",
        "-" * 70,
        f"Examples:              {examples_per_agent:,}",
        f"Total tokens:          {per_agent_cost['total_tokens']:,.0f}",
        f"  Input tokens:        {per_agent_cost['input_tokens']:,.0f} (90%)",
        f"  Output tokens:       {per_agent_cost['output_tokens']:,.0f} (10%)",
        f"",
        f"Cost breakdown:",
        f"  Input cost:          ${per_agent_cost['input_cost']:.2f}",
        f"  Output cost:        ${per_agent_cost['output_cost']:.2f}",
        f"  Total per agent:    ${per_agent_cost['total_cost']:.2f}",
        f"  Cost per example:   ${per_agent_cost['cost_per_example']:.4f}",
        f"",
        f"Training time:",
        f"  GPU hours:          {per_agent_time['gpu_hours']:.1f}h",
        f"  Wall time:          {per_agent_time['wall_hours']:.1f}h ({per_agent_time['wall_days']:.2f} days)",
        "",
        "-" * 70,
        "TOTAL PROJECT COST",
        "-" * 70,
        f"Total examples:        {total_examples:,}",
        f"Total cost:            ${total_cost:.2f}",
        f"Total GPU hours:       {total_time['gpu_hours']:.1f}h",
        f"Total wall time:       {total_time['wall_hours']:.1f}h ({total_time['wall_days']:.2f} days)",
        "",
    ]

    # Add recommendations
    report_lines.extend([
        "-" * 70,
        "RECOMMENDATIONS",
        "-" * 70,
    ])

    # Cost optimization suggestions
    if total_cost > 100:
        reduced_examples = int(examples_per_agent * 0.5)
        reduced_cost = calculate_training_cost(
            num_examples=reduced_examples,
            tokens_per_example=tokens_per_example,
            epochs=epochs,
            model=model
        )['total_cost'] * num_agents
        savings = total_cost - reduced_cost
        report_lines.append(
            f"💡 Consider reducing to {reduced_examples:,} examples per agent: "
            f"${reduced_cost:.2f} (save ${savings:.2f}, {savings/total_cost*100:.0f}%)"
        )

    if model.name == 'claude-haiku':
        gpt_mini_cost = calculate_training_cost(
            num_examples=examples_per_agent,
            tokens_per_example=tokens_per_example,
            epochs=epochs,
            model=MODEL_PRICING['gpt-4o-mini']
        )['total_cost'] * num_agents
        savings = total_cost - gpt_mini_cost
        report_lines.append(
            f"💡 Consider GPT-4o-mini for cheaper training: "
            f"${gpt_mini_cost:.2f} (save ${savings:.2f}, {savings/total_cost*100:.0f}%)"
        )

    if epochs > 3:
        reduced_epochs_cost = calculate_training_cost(
            num_examples=examples_per_agent,
            tokens_per_example=tokens_per_example,
            epochs=3,
            model=model
        )['total_cost'] * num_agents
        savings = total_cost - reduced_epochs_cost
        report_lines.append(
            f"💡 Consider reducing to 3 epochs: "
            f"${reduced_epochs_cost:.2f} (save ${savings:.2f}, {savings/total_cost*100:.0f}%)"
        )

    report_lines.extend([
        "",
        "=" * 70,
    ])

    report = "\n".join(report_lines)

    # Save to file if requested
    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ Report saved to {output_file}")

    return report


def compare_models(
    num_agents: int,
    examples_per_agent: int,
    epochs: int,
    tokens_per_example: int
) -> str:
    """Compare costs across all models"""
    comparison_lines = [
        "=" * 70,
        "MODEL COMPARISON",
        "=" * 70,
        "",
        f"Dataset: {num_agents * examples_per_agent:,} examples ({num_agents} agents × {examples_per_agent:,})",
        f"Training: {epochs} epochs",
        "",
        f"{'Model':<25} {'Total Cost':<15} {'Per Agent':<15} {'Per Example':<15}",
        "-" * 70,
    ]

    costs = []
    for model_key, model in MODEL_PRICING.items():
        per_agent_cost = calculate_training_cost(
            num_examples=examples_per_agent,
            tokens_per_example=tokens_per_example,
            epochs=epochs,
            model=model
        )
        total_cost = per_agent_cost['total_cost'] * num_agents

        costs.append((model.display_name, total_cost, per_agent_cost['total_cost'], per_agent_cost['cost_per_example']))

    # Sort by cost
    costs.sort(key=lambda x: x[1] if x[1] > 0 else float('inf'))

    for model_name, total, per_agent, per_example in costs:
        if total == 0:
            cost_str = "Free (self-hosted)"
            per_agent_str = "Free"
            per_example_str = "Free"
        else:
            cost_str = f"${total:.2f}"
            per_agent_str = f"${per_agent:.2f}"
            per_example_str = f"${per_example:.4f}"

        comparison_lines.append(
            f"{model_name:<25} {cost_str:<15} {per_agent_str:<15} {per_example_str:<15}"
        )

    comparison_lines.extend([
        "",
        "=" * 70,
    ])

    return "\n".join(comparison_lines)


def main():
    parser = argparse.ArgumentParser(description="Estimate training costs for Unsloth pipeline")
    parser.add_argument('--examples-per-agent', type=int, default=20000,
                       help='Number of examples per agent (default: 20000)')
    parser.add_argument('--num-agents', type=int, default=5,
                       help='Number of agents to train (default: 5)')
    parser.add_argument('--epochs', type=int, default=3,
                       help='Number of training epochs (default: 3)')
    parser.add_argument('--model', type=str, default='claude-haiku',
                       choices=list(MODEL_PRICING.keys()),
                       help='Model to use (default: claude-haiku)')
    parser.add_argument('--tokens-per-example', type=int, default=1100,
                       help='Average tokens per example (default: 1100)')
    parser.add_argument('--compare-all-models', action='store_true',
                       help='Compare costs across all models')
    parser.add_argument('--output', type=Path, metavar='FILE',
                       help='Save report to file')

    args = parser.parse_args()

    # Validate model
    if args.model not in MODEL_PRICING:
        print(f"❌ Unknown model: {args.model}")
        print(f"Available models: {', '.join(MODEL_PRICING.keys())}")
        return 1

    model = MODEL_PRICING[args.model]

    # Compare all models
    if args.compare_all_models:
        comparison = compare_models(
            num_agents=args.num_agents,
            examples_per_agent=args.examples_per_agent,
            epochs=args.epochs,
            tokens_per_example=args.tokens_per_example
        )
        print(comparison)
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(comparison)
    else:
        # Generate single model report
        report = generate_report(
            num_agents=args.num_agents,
            examples_per_agent=args.examples_per_agent,
            epochs=args.epochs,
            model=model,
            tokens_per_example=args.tokens_per_example,
            output_file=args.output
        )
        print(report)

    return 0


if __name__ == '__main__':
    exit(main())

