#!/usr/bin/env python3
"""
ADP → Unsloth Training Format Converter

Converts Agent Data Protocol (ADP) examples to Unsloth fine-tuning format with
cross-agent learning weighted by compatibility matrix.

Unsloth Format (Messages-style):
{
  "messages": [
    {
      "role": "system",
      "content": "You are a QA Agent specialized in debugging and quality assurance."
    },
    {
      "role": "user",
      "content": "Debug authentication error in user login\n\nContext: User reports 401 errors..."
    },
    {
      "role": "assistant",
      "content": "I'll debug this systematically:\n\n1. Check auth token expiration...\n2. Verify HMAC signature...\n\nResult: Fixed by extending token window."
    }
  ],
  "weight": 1.0,
  "source_agent": "qa_agent",
  "target_agent": "qa_agent",
  "cross_agent_weight": 1.0
}

Usage:
    # Generate cross-agent training for all 5 agents (20k examples each)
    python scripts/convert_adp_to_unsloth.py \
        data/adp_format/ \
        data/unsloth_format/ \
        --target-agents qa_agent support_agent legal_agent analyst_agent content_agent

Author: Cursor (AI Coding Agent)
Date: October 31, 2025
"""

import json
import random
import re
from pathlib import Path
from typing import List, Dict, Optional, Set
from collections import defaultdict

# Import compatibility matrix manager
try:
    from scripts.manage_compatibility_matrix import CompatibilityMatrix
    MATRIX_AVAILABLE = True
except ImportError:
    MATRIX_AVAILABLE = False
    print("Warning: Compatibility matrix manager not available, using hardcoded matrix")

# 15×15 Cross-Agent Learning Matrix (full matrix from docs/ADP_CROSS_AGENT_LEARNING_MATRIX.md)
AGENT_COMPATIBILITY_MATRIX = {
    "qa_agent": {
        "qa_agent": 1.0, "support_agent": 0.6, "legal_agent": 0.2, "analyst_agent": 0.4,
        "content_agent": 0.3, "builder_agent": 0.8, "deploy_agent": 0.5, "marketing_agent": 0.2,
        "sales_agent": 0.2, "finance_agent": 0.3, "research_agent": 0.4, "vision_agent": 0.5,
        "se_darwin_agent": 0.9, "memory_agent": 0.4, "security_agent": 0.7
    },
    "support_agent": {
        "qa_agent": 0.6, "support_agent": 1.0, "legal_agent": 0.7, "analyst_agent": 0.5,
        "content_agent": 0.4, "builder_agent": 0.5, "deploy_agent": 0.7, "marketing_agent": 0.3,
        "sales_agent": 0.4, "finance_agent": 0.5, "research_agent": 0.4, "vision_agent": 0.3,
        "se_darwin_agent": 0.4, "memory_agent": 0.4, "security_agent": 0.6
    },
    "legal_agent": {
        "qa_agent": 0.3, "support_agent": 0.7, "legal_agent": 1.0, "analyst_agent": 0.8,
        "content_agent": 0.6, "builder_agent": 0.2, "deploy_agent": 0.4, "marketing_agent": 0.5,
        "sales_agent": 0.6, "finance_agent": 0.8, "research_agent": 0.7, "vision_agent": 0.3,
        "se_darwin_agent": 0.3, "memory_agent": 0.4, "security_agent": 0.7
    },
    "analyst_agent": {
        "qa_agent": 0.4, "support_agent": 0.6, "legal_agent": 0.7, "analyst_agent": 1.0,
        "content_agent": 0.6, "builder_agent": 0.4, "deploy_agent": 0.5, "marketing_agent": 0.8,
        "sales_agent": 0.8, "finance_agent": 0.9, "research_agent": 0.8, "vision_agent": 0.5,
        "se_darwin_agent": 0.4, "memory_agent": 0.5, "security_agent": 0.5
    },
    "content_agent": {
        "qa_agent": 0.3, "support_agent": 0.5, "legal_agent": 0.5, "analyst_agent": 0.6,
        "content_agent": 1.0, "builder_agent": 0.3, "deploy_agent": 0.3, "marketing_agent": 0.9,
        "sales_agent": 0.8, "finance_agent": 0.5, "research_agent": 0.8, "vision_agent": 0.6,
        "se_darwin_agent": 0.3, "memory_agent": 0.4, "security_agent": 0.4
    }
}


def load_adp_jsonl(file_path: Path) -> List[dict]:
    """Load ADP examples from JSONL file"""
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
    """Save to JSONL file"""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        for example in examples:
            f.write(json.dumps(example, ensure_ascii=False) + '\n')


def load_system_prompt(agent_name: str, prompts_dir: Path) -> str:
    """Load system prompt from agent template file"""
    template_file = prompts_dir / f"{agent_name}_template.txt"
    
    if not template_file.exists():
        # Fallback: Generate basic system prompt
        agent_display = agent_name.replace('_', ' ').title()
        return f"You are a {agent_display} specialized in your domain."
    
    with open(template_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract system prompt (usually first paragraph or section)
    # Try to find a clear system prompt section
    lines = content.split('\n')
    system_lines = []
    
    # Look for common patterns: "You are", "System:", etc.
    in_system_section = False
    for line in lines[:50]:  # Check first 50 lines
        if 'you are' in line.lower() or 'system:' in line.lower() or 'role:' in line.lower():
            in_system_section = True
        
        if in_system_section:
            if line.strip() and not line.strip().startswith('#'):
                system_lines.append(line.strip())
            if len(system_lines) > 0 and (line.strip().startswith('#') or len(system_lines) > 5):
                break
    
    if system_lines:
        system_prompt = ' '.join(system_lines[:3])  # Take first 3 meaningful lines
        # Clean up
        system_prompt = re.sub(r'\s+', ' ', system_prompt).strip()
        if len(system_prompt) > 50:
            return system_prompt
    
    # Fallback: Use first paragraph
    first_para = content.split('\n\n')[0] if '\n\n' in content else content.split('\n')[0]
    first_para = re.sub(r'\s+', ' ', first_para).strip()
    if len(first_para) > 20:
        return first_para
    
    # Last resort
    agent_display = agent_name.replace('_', ' ').title()
    return f"You are a {agent_display} specialized in your domain."


def extract_user_message(adp_example: dict) -> str:
    """
    Extract user message from ADP example.
    
    Combines observation content (task description + context).
    """
    content = adp_example.get('content', [])
    
    # Find first observation
    for item in content:
        if item.get('type') == 'observation':
            obs_data = item.get('data', {})
            user_content = obs_data.get('content', '')
            if user_content:
                return user_content.strip()
    
    # Fallback
    return f"Task: {adp_example.get('id', 'unknown')}"


def extract_assistant_message(adp_example: dict) -> str:
    """
    Extract assistant message from ADP example.
    
    Combines reasoning + content/result for comprehensive response.
    """
    content = adp_example.get('content', [])
    
    # Find first action
    for item in content:
        if item.get('type') == 'action':
            action_data = item.get('data', {})
            
            # Combine reasoning + content for full response
            parts = []
            
            # Add reasoning if available
            reasoning = action_data.get('reasoning', '')
            if reasoning:
                parts.append(reasoning.strip())
            
            # Add content/result
            result = action_data.get('content', '') or action_data.get('result_summary', '')
            if result and result != reasoning:
                parts.append(result.strip())
            
            if parts:
                return '\n\n'.join(parts)
            
            # Fallback: just content
            if 'content' in action_data:
                return action_data['content'].strip()
    
    return ""  # No output found


def convert_to_unsloth_messages(
    adp_example: dict,
    source_agent: str,
    target_agent: str,
    compatibility_matrix: Dict[str, Dict[str, float]],
    prompts_dir: Path
) -> Optional[dict]:
    """
    Convert ADP example to Unsloth messages format with cross-agent weighting.

    Args:
        adp_example: ADP format example
        source_agent: Original agent who would handle this task
        target_agent: Agent being trained
        compatibility_matrix: Compatibility matrix dict
        prompts_dir: Directory containing agent prompt templates

    Returns:
        Dict in Unsloth messages format, or None if weight too low
    """
    # Get compatibility weight
    if target_agent not in compatibility_matrix:
        print(f"Warning: {target_agent} not in compatibility matrix")
        return None
    
    if source_agent not in compatibility_matrix[target_agent]:
        print(f"Warning: {source_agent} not found for {target_agent}")
        return None
    
    weight = compatibility_matrix[target_agent][source_agent]
    
    # Skip if weight too low (< 0.2)
    if weight < 0.2:
        return None
    
    # Load system prompt for target agent
    system_prompt = load_system_prompt(target_agent, prompts_dir)
    
    # Extract user and assistant messages
    user_message = extract_user_message(adp_example)
    assistant_message = extract_assistant_message(adp_example)
    
    if not user_message or not assistant_message:
        return None  # Skip invalid examples
    
    # Build messages format
    unsloth_example = {
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_message
            },
            {
                "role": "assistant",
                "content": assistant_message
            }
        ],
        "weight": weight,
        "source_agent": source_agent,
        "target_agent": target_agent,
        "cross_agent_weight": weight if source_agent != target_agent else 1.0
    }
    
    # Add metadata
    genesis_ext = adp_example.get('genesis_extensions', {})
    unsloth_example['metadata'] = {
        "agent": genesis_ext.get('agent_name', source_agent),
        "category": genesis_ext.get('task_category', 'unknown'),
        "difficulty": genesis_ext.get('difficulty', 'unknown'),
        "source_id": adp_example.get('id', 'unknown')
    }
    
    return unsloth_example


def load_all_adp_files(adp_dir: Path) -> Dict[str, List[dict]]:
    """Load all ADP files from directory, grouped by agent"""
    agent_examples = defaultdict(list)
    
    for file_path in adp_dir.glob('*_adp.jsonl'):
        # Extract agent name from filename (e.g., qa_agent_adp.jsonl → qa_agent)
        filename = file_path.stem
        agent_name = filename.replace('_adp', '')
        
        examples = load_adp_jsonl(file_path)
        agent_examples[agent_name] = examples
        print(f"  Loaded {len(examples):,} examples from {file_path.name} ({agent_name})")
    
    return agent_examples


def generate_cross_agent_training(
    all_agent_examples: Dict[str, List[dict]],
    target_agent: str,
    total_examples: int,
    compatibility_matrix: Dict[str, Dict[str, float]],
    prompts_dir: Path,
    min_weight: float = 0.2
) -> List[dict]:
    """
    Generate cross-agent training examples for target agent.

    Args:
        all_agent_examples: Dict mapping agent_name → ADP examples
        target_agent: Agent to train
        total_examples: Total training examples to generate (~20k)
        compatibility_matrix: Compatibility matrix
        prompts_dir: Directory with agent prompts
        min_weight: Minimum compatibility weight to include (default: 0.2)

    Returns:
        List of Unsloth format examples
    """
    if target_agent not in compatibility_matrix:
        raise ValueError(f"Target agent {target_agent} not in compatibility matrix")
    
    scores = compatibility_matrix[target_agent]
    
    # Calculate native examples count (~1,333 from 6,665 total)
    native_examples = all_agent_examples.get(target_agent, [])
    native_count = min(len(native_examples), int(total_examples * 0.067))  # ~6.7% native (~1,333)
    
    # Remaining for cross-agent (need to oversample to reach 20k)
    cross_count = total_examples - native_count
    
    converted_examples = []
    
    # 1. Convert native examples (weight = 1.0)
    print(f"  Converting {native_count:,} native examples...")
    native_sample = random.sample(native_examples, native_count) if len(native_examples) > native_count else native_examples
    for adp_ex in native_sample:
        unsloth_ex = convert_to_unsloth_messages(
            adp_ex, target_agent, target_agent, compatibility_matrix, prompts_dir
        )
        if unsloth_ex:
            converted_examples.append(unsloth_ex)
    
    # 2. Convert cross-agent examples (weighted by compatibility)
    print(f"  Converting {cross_count:,} cross-agent examples...")
    
    # Calculate sampling probabilities based on compatibility scores
    other_agents = [a for a in all_agent_examples.keys() if a != target_agent]
    total_score = sum(scores.get(agent, 0.0) for agent in other_agents if scores.get(agent, 0.0) >= min_weight)
    
    if total_score == 0:
        print(f"  Warning: No compatible agents found for {target_agent}")
        return converted_examples
    
    # Sample from each agent proportionally (with replacement if needed)
    for source_agent in other_agents:
        weight = scores.get(source_agent, 0.0)
        if weight < min_weight:
            continue
        
        # Calculate how many examples to sample from this agent
        proportion = weight / total_score
        agent_sample_count = int(cross_count * proportion)
        
        if agent_sample_count > 0 and source_agent in all_agent_examples:
            source_examples = all_agent_examples[source_agent]
            
            # Sample with replacement if we need more examples than available
            if len(source_examples) >= agent_sample_count:
                sampled = random.sample(source_examples, agent_sample_count)
            else:
                # Sample with replacement to reach target count
                sampled = random.choices(source_examples, k=agent_sample_count)
            
            for adp_ex in sampled:
                unsloth_ex = convert_to_unsloth_messages(
                    adp_ex, source_agent, target_agent, compatibility_matrix, prompts_dir
                )
                if unsloth_ex:
                    converted_examples.append(unsloth_ex)
    
    # Shuffle to mix native and cross-agent
    random.shuffle(converted_examples)
    
    return converted_examples[:total_examples]  # Ensure exact count


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert ADP to Unsloth training format")
    parser.add_argument('input_dir', type=Path, help='Input ADP directory')
    parser.add_argument('output_dir', type=Path, help='Output Unsloth directory')
    parser.add_argument('--target-agents', nargs='+', 
                       default=['qa_agent', 'support_agent', 'legal_agent', 'analyst_agent', 'content_agent'],
                       help='Target agents to generate training data for')
    parser.add_argument('--examples-per-agent', type=int, default=20000,
                       help='Target examples per agent (default: 20000)')
    parser.add_argument('--prompts-dir', type=Path, default=Path('data/deepresearch_prompts'),
                       help='Directory containing agent prompt templates')
    parser.add_argument('--min-weight', type=float, default=0.2,
                       help='Minimum compatibility weight to include (default: 0.2)')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    # Set random seed
    random.seed(args.seed)
    
    # Load all ADP files
    print(f"Loading ADP files from {args.input_dir}...")
    all_agent_examples = load_all_adp_files(args.input_dir)
    total_loaded = sum(len(examples) for examples in all_agent_examples.values())
    print(f"✅ Loaded {total_loaded:,} total examples from {len(all_agent_examples)} agents\n")
    
    # Generate training data for each target agent
    for target_agent in args.target_agents:
        if target_agent not in all_agent_examples:
            print(f"⚠️  Skipping {target_agent}: No ADP data found")
            continue
        
        print(f"Generating training data for {target_agent} ({args.examples_per_agent:,} examples)...")
        
        try:
            unsloth_examples = generate_cross_agent_training(
                all_agent_examples=all_agent_examples,
                target_agent=target_agent,
                total_examples=args.examples_per_agent,
                compatibility_matrix=AGENT_COMPATIBILITY_MATRIX,
                prompts_dir=args.prompts_dir,
                min_weight=args.min_weight
            )
            
            # Save output
            output_file = args.output_dir / f"{target_agent}_training.jsonl"
            save_jsonl(unsloth_examples, output_file)
            
            # Print statistics
            native_count = sum(1 for ex in unsloth_examples if ex.get('source_agent') == target_agent)
            cross_count = len(unsloth_examples) - native_count
            avg_weight = sum(ex.get('weight', 0) for ex in unsloth_examples) / len(unsloth_examples) if unsloth_examples else 0
            
            print(f"✅ Generated {len(unsloth_examples):,} examples:")
            print(f"   - Native: {native_count:,} (weight 1.0)")
            print(f"   - Cross-agent: {cross_count:,} (avg weight {avg_weight:.2f})")
            print(f"   - Saved to: {output_file}\n")
            
        except Exception as e:
            print(f"❌ Error generating data for {target_agent}: {e}")
            import traceback
            if args.verbose:
                traceback.print_exc()
            continue
    
    print("=" * 70)
    print("CONVERSION COMPLETE")
    print("=" * 70)


if __name__ == '__main__':
    main()
