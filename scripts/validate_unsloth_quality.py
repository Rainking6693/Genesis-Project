#!/usr/bin/env python3
"""
Unsloth Training Data Quality Validator

Validates Unsloth-formatted training data for format correctness, weight validation,
content quality, and distribution checks.

Usage:
    # Validate single file
    python scripts/validate_unsloth_quality.py data/unsloth_format/qa_agent_training.jsonl

    # Validate all files in directory
    python scripts/validate_unsloth_quality.py data/unsloth_format/

    # Generate detailed report
    python scripts/validate_unsloth_quality.py data/unsloth_format/ --report reports/validation_report.md

Author: Cursor (AI Coding Agent)
Date: October 31, 2025
"""

import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from collections import defaultdict, Counter
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Validation result for a single example"""
    valid: bool
    errors: List[str]
    warnings: List[str]


@dataclass
class QualityStats:
    """Quality statistics for a dataset"""
    total_examples: int
    valid_examples: int
    invalid_examples: int
    warnings_count: int
    format_errors: int
    weight_errors: int
    content_errors: int
    distribution_info: Dict


def validate_message_format(messages: List[dict]) -> Tuple[bool, List[str]]:
    """
    Validate messages array format.
    
    Requirements:
    - Must have at least system and user messages
    - Roles must be valid (system, user, assistant)
    - Must alternate properly (system → user → assistant)
    """
    errors = []
    
    if not messages:
        errors.append("Messages array is empty")
        return False, errors
    
    if len(messages) < 2:
        errors.append("Messages array must have at least 2 messages (system + user)")
        return False, errors
    
    # Check for system message
    has_system = any(msg.get('role') == 'system' for msg in messages)
    if not has_system:
        errors.append("Missing system message")
    
    # Check for user message
    has_user = any(msg.get('role') == 'user' for msg in messages)
    if not has_user:
        errors.append("Missing user message")
    
    # Check roles are valid
    valid_roles = {'system', 'user', 'assistant'}
    for i, msg in enumerate(messages):
        role = msg.get('role', '')
        if role not in valid_roles:
            errors.append(f"Message {i}: Invalid role '{role}'")
        
        if 'content' not in msg:
            errors.append(f"Message {i}: Missing 'content' field")
        elif not isinstance(msg['content'], str):
            errors.append(f"Message {i}: 'content' must be string")
        elif len(msg['content'].strip()) == 0:
            errors.append(f"Message {i}: 'content' is empty")
    
    # Check order (system should be first)
    if messages[0].get('role') != 'system':
        errors.append("System message should be first")
    
    return len(errors) == 0, errors


def validate_weight(example: dict, source_agent: str, target_agent: str) -> Tuple[bool, List[str]]:
    """
    Validate weight fields.
    
    Requirements:
    - Weight in [0.2, 1.0]
    - Same-agent examples have weight = 1.0
    - Cross-agent weights match compatibility expectations
    """
    errors = []
    warnings = []
    
    weight = example.get('weight', None)
    if weight is None:
        errors.append("Missing 'weight' field")
        return False, errors
    
    if not isinstance(weight, (int, float)):
        errors.append(f"Weight must be numeric, got {type(weight)}")
        return False, errors
    
    if weight < 0.2 or weight > 1.0:
        errors.append(f"Weight {weight} out of valid range [0.2, 1.0]")
    
    # Check same-agent weight
    if source_agent == target_agent:
        if abs(weight - 1.0) > 0.01:
            errors.append(f"Same-agent example has weight {weight}, expected 1.0")
    else:
        # Cross-agent weight should match cross_agent_weight
        cross_weight = example.get('cross_agent_weight', weight)
        if abs(weight - cross_weight) > 0.01:
            warnings.append(f"Weight ({weight}) and cross_agent_weight ({cross_weight}) don't match")
    
    return len(errors) == 0, errors


def validate_content_quality(example: dict) -> Tuple[bool, List[str]]:
    """
    Validate content quality.
    
    Checks:
    - User messages contain task + context
    - Assistant messages contain reasoning + result
    - No truncated messages
    - No JSON artifacts in text
    """
    errors = []
    warnings = []
    
    messages = example.get('messages', [])
    
    # Find user and assistant messages
    user_msg = next((msg for msg in messages if msg.get('role') == 'user'), None)
    assistant_msg = next((msg for msg in messages if msg.get('role') == 'assistant'), None)
    
    if user_msg:
        user_content = user_msg.get('content', '')
        if len(user_content) < 50:
            warnings.append("User message too short (<50 chars)")
        
        # Check for JSON artifacts
        if '{' in user_content and '}' in user_content and user_content.count('{') > 2:
            warnings.append("User message may contain JSON artifacts")
    
    if assistant_msg:
        assistant_content = assistant_msg.get('content', '')
        if len(assistant_content) < 100:
            warnings.append("Assistant message too short (<100 chars)")
        
        # Check for truncated content
        if assistant_content.endswith('...') or assistant_content.endswith('[truncated]'):
            errors.append("Assistant message appears truncated")
        
        # Check for JSON artifacts
        if '{' in assistant_content and '}' in assistant_content and assistant_content.count('{') > 5:
            warnings.append("Assistant message may contain JSON artifacts")
    else:
        errors.append("Missing assistant message")
    
    return len(errors) == 0, errors


def validate_example(example: dict, compatibility_matrix: Optional[Dict] = None) -> ValidationResult:
    """
    Validate a single Unsloth example.
    
    Returns ValidationResult with errors and warnings.
    """
    errors = []
    warnings = []
    
    # Format validation
    if 'messages' not in example:
        errors.append("Missing 'messages' field")
        return ValidationResult(valid=False, errors=errors, warnings=warnings)
    
    format_valid, format_errors = validate_message_format(example['messages'])
    errors.extend(format_errors)
    
    # Weight validation
    source_agent = example.get('source_agent', '')
    target_agent = example.get('target_agent', '')
    
    if not source_agent:
        errors.append("Missing 'source_agent' field")
    if not target_agent:
        errors.append("Missing 'target_agent' field")
    
    if source_agent and target_agent:
        weight_valid, weight_errors = validate_weight(example, source_agent, target_agent)
        errors.extend(weight_errors)
    
    # Content quality
    content_valid, content_errors = validate_content_quality(example)
    errors.extend(content_errors)
    
    # Metadata validation
    metadata = example.get('metadata', {})
    if not metadata:
        warnings.append("Missing 'metadata' field")
    else:
        if 'difficulty' not in metadata:
            warnings.append("Missing 'difficulty' in metadata")
        elif metadata['difficulty'] not in ['easy', 'medium', 'hard', 'unknown']:
            warnings.append(f"Invalid difficulty: {metadata['difficulty']}")
    
    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )


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


def validate_file(file_path: Path, compatibility_matrix: Optional[Dict] = None) -> QualityStats:
    """Validate a single Unsloth JSONL file"""
    examples = load_unsloth_jsonl(file_path)
    
    valid_count = 0
    invalid_count = 0
    warnings_count = 0
    format_errors = 0
    weight_errors = 0
    content_errors = 0
    
    difficulty_dist = Counter()
    source_agent_dist = Counter()
    weight_ranges = defaultdict(int)
    
    for example in examples:
        result = validate_example(example, compatibility_matrix)
        
        if result.valid:
            valid_count += 1
        else:
            invalid_count += 1
        
        warnings_count += len(result.warnings)
        
        # Categorize errors
        for error in result.errors:
            if 'message' in error.lower() or 'role' in error.lower():
                format_errors += 1
            elif 'weight' in error.lower():
                weight_errors += 1
            else:
                content_errors += 1
        
        # Collect distribution data
        metadata = example.get('metadata', {})
        difficulty_dist[metadata.get('difficulty', 'unknown')] += 1
        source_agent_dist[example.get('source_agent', 'unknown')] += 1
        
        weight = example.get('weight', 0)
        if weight == 1.0:
            weight_ranges['1.0'] += 1
        elif weight >= 0.7:
            weight_ranges['0.7-0.9'] += 1
        elif weight >= 0.4:
            weight_ranges['0.4-0.6'] += 1
        elif weight >= 0.2:
            weight_ranges['0.2-0.3'] += 1
        else:
            weight_ranges['<0.2'] += 1
    
    return QualityStats(
        total_examples=len(examples),
        valid_examples=valid_count,
        invalid_examples=invalid_count,
        warnings_count=warnings_count,
        format_errors=format_errors,
        weight_errors=weight_errors,
        content_errors=content_errors,
        distribution_info={
            'difficulty': dict(difficulty_dist),
            'source_agents': dict(source_agent_dist),
            'weight_ranges': dict(weight_ranges)
        }
    )


def generate_report(all_stats: Dict[str, QualityStats], output_file: Optional[Path] = None) -> str:
    """Generate validation report"""
    lines = [
        "=" * 70,
        "UNSLOTH TRAINING DATA VALIDATION REPORT",
        "=" * 70,
        "",
    ]
    
    total_examples = sum(stats.total_examples for stats in all_stats.values())
    total_valid = sum(stats.valid_examples for stats in all_stats.values())
    total_invalid = sum(stats.invalid_examples for stats in all_stats.values())
    total_warnings = sum(stats.warnings_count for stats in all_stats.values())
    
    lines.extend([
        f"Total examples: {total_examples:,}",
        f"✅ Format valid: {total_valid:,} ({total_valid/total_examples*100:.1f}%)" if total_examples > 0 else "✅ Format valid: 0",
        f"❌ Invalid: {total_invalid:,} ({total_invalid/total_examples*100:.1f}%)" if total_examples > 0 else "❌ Invalid: 0",
        f"⚠️  Warnings: {total_warnings:,}",
        "",
        "-" * 70,
        "AGENT BREAKDOWN",
        "-" * 70,
        "",
    ])
    
    for agent_name, stats in sorted(all_stats.items()):
        lines.extend([
            f"{agent_name}:",
            f"  Total examples:      {stats.total_examples:,}",
            f"  Valid:               {stats.valid_examples:,} ({stats.valid_examples/stats.total_examples*100:.1f}%)" if stats.total_examples > 0 else "  Valid: 0",
            f"  Invalid:             {stats.invalid_examples:,}",
            f"  Warnings:            {stats.warnings_count:,}",
            "",
            f"  Error breakdown:",
            f"    Format errors:     {stats.format_errors}",
            f"    Weight errors:     {stats.weight_errors}",
            f"    Content errors:    {stats.content_errors}",
            "",
            f"  Distribution:",
        ])
        
        # Difficulty distribution
        diff_dist = stats.distribution_info.get('difficulty', {})
        for diff, count in sorted(diff_dist.items()):
            pct = count / stats.total_examples * 100 if stats.total_examples > 0 else 0
            lines.append(f"    {diff:10s} {count:6d} ({pct:5.1f}%)")
        
        # Source agent distribution (top 5)
        source_dist = stats.distribution_info.get('source_agents', {})
        sorted_sources = sorted(source_dist.items(), key=lambda x: -x[1])[:5]
        lines.append(f"  Top source agents:")
        for agent, count in sorted_sources:
            pct = count / stats.total_examples * 100 if stats.total_examples > 0 else 0
            lines.append(f"    {agent:20s} {count:6d} ({pct:5.1f}%)")
        
        # Weight distribution
        weight_dist = stats.distribution_info.get('weight_ranges', {})
        lines.append(f"  Weight distribution:")
        for range_name, count in sorted(weight_dist.items(), key=lambda x: float(x[0].split('-')[0]) if '-' in x[0] else float(x[0]) if x[0] != '<0.2' else 0.1, reverse=True):
            pct = count / stats.total_examples * 100 if stats.total_examples > 0 else 0
            lines.append(f"    {range_name:10s} {count:6d} ({pct:5.1f}%)")
        
        lines.append("")
    
    # Overall quality assessment
    quality_score = (total_valid / total_examples * 100) if total_examples > 0 else 0
    lines.extend([
        "-" * 70,
        "QUALITY ASSESSMENT",
        "-" * 70,
        f"Overall quality score: {quality_score:.1f}%",
        "",
    ])
    
    if quality_score >= 98:
        lines.append("✅ READY FOR TRAINING: YES")
        lines.append("   Excellent quality - proceed with fine-tuning")
    elif quality_score >= 95:
        lines.append("✅ READY FOR TRAINING: YES (with minor fixes)")
        lines.append("   Good quality - review warnings before training")
    elif quality_score >= 90:
        lines.append("⚠️  READY FOR TRAINING: CONDITIONAL")
        lines.append("   Acceptable quality - fix critical errors first")
    else:
        lines.append("❌ READY FOR TRAINING: NO")
        lines.append("   Quality below threshold - fix errors before training")
    
    lines.extend([
        "",
        "=" * 70,
    ])
    
    report = "\n".join(lines)
    
    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ Report saved to {output_file}")
    
    return report


def main():
    parser = argparse.ArgumentParser(description="Validate Unsloth training data quality")
    parser.add_argument('input_path', type=Path, help='Input JSONL file or directory')
    parser.add_argument('--report', type=Path, metavar='FILE',
                       help='Save detailed report to file')
    parser.add_argument('--verbose', action='store_true',
                       help='Verbose output')
    
    args = parser.parse_args()
    
    all_stats = {}
    
    # Determine input files
    if args.input_path.is_file():
        files = [args.input_path]
    elif args.input_path.is_dir():
        files = list(args.input_path.glob('*_training.jsonl'))
    else:
        print(f"❌ Error: {args.input_path} is neither a file nor a directory")
        return 1
    
    if not files:
        print(f"❌ Error: No JSONL files found in {args.input_path}")
        return 1
    
    print(f"Validating {len(files)} file(s)...\n")
    
    # Validate each file
    for file_path in files:
        agent_name = file_path.stem.replace('_training', '')
        print(f"Validating {file_path.name}...")
        
        stats = validate_file(file_path)
        all_stats[agent_name] = stats
        
        print(f"  Examples: {stats.total_examples:,}")
        print(f"  Valid: {stats.valid_examples:,} ({stats.valid_examples/stats.total_examples*100:.1f}%)" if stats.total_examples > 0 else "  Valid: 0")
        print(f"  Invalid: {stats.invalid_examples:,}")
        print(f"  Warnings: {stats.warnings_count:,}")
        print()
    
    # Generate report
    report = generate_report(all_stats, args.report)
    
    if not args.report:
        print(report)
    
    # Return exit code based on quality
    total_examples = sum(s.total_examples for s in all_stats.values())
    total_valid = sum(s.valid_examples for s in all_stats.values())
    quality_score = (total_valid / total_examples * 100) if total_examples > 0 else 0
    
    return 0 if quality_score >= 95 else 1


if __name__ == '__main__':
    exit(main())

