#!/usr/bin/env python3
"""
Simple, reliable training example generator using Claude Haiku 3.5
"""
import json
import sys
import random
from pathlib import Path
from anthropic import Anthropic

# Difficulty distributions
DIFFICULTIES = {
    "easy": 0.30,
    "medium": 0.45,
    "hard": 0.25
}

CATEGORIES = [
    "core_functionality",
    "edge_cases",
    "error_handling",
    "integration",
    "performance"
]

def generate_example(client, agent_name, difficulty, category, index):
    """Generate a single training example"""
    prompt = f"""Generate a realistic training example for a {agent_name}.

Difficulty: {difficulty}
Category: {category}
Example #{index}

Create a training example in this EXACT format:

TASK: [Clear, specific task description for {difficulty} difficulty]

CONTEXT: [Detailed background, requirements, constraints - minimum 100 characters]

EXPECTED OUTPUT: [Expert-level response with specific details - minimum 200 characters]

Guidelines for {difficulty}:
- easy: Straightforward task, single component, standard approach
- medium: Moderate complexity, 2-3 components, requires judgment
- hard: Complex scenario, edge cases, multiple systems, expert thinking

Make it realistic and specific to {agent_name} work."""

    response = client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=1500,
        temperature=0.8,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text

    # Simple parsing
    task = ""
    context = ""
    output = ""

    lines = text.split('\n')
    current_section = None

    for line in lines:
        if line.startswith('TASK:'):
            current_section = 'task'
            task = line.replace('TASK:', '').strip()
        elif line.startswith('CONTEXT:'):
            current_section = 'context'
            context = line.replace('CONTEXT:', '').strip()
        elif line.startswith('EXPECTED OUTPUT:'):
            current_section = 'output'
            output = line.replace('EXPECTED OUTPUT:', '').strip()
        elif current_section == 'task' and line.strip():
            task += ' ' + line.strip()
        elif current_section == 'context' and line.strip():
            context += ' ' + line.strip()
        elif current_section == 'output' and line.strip():
            output += ' ' + line.strip()

    return {
        "task": task.strip(),
        "context": context.strip(),
        "expected_output": output.strip(),
        "difficulty": difficulty,
        "agent_name": agent_name,
        "category": category
    }

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", required=True)
    parser.add_argument("--count", type=int, required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--resume", action="store_true", help="Resume from existing file")
    args = parser.parse_args()

    client = Anthropic(api_key=args.api_key)

    # Calculate counts per difficulty
    easy_count = int(args.count * DIFFICULTIES["easy"])
    medium_count = int(args.count * DIFFICULTIES["medium"])
    hard_count = args.count - easy_count - medium_count

    # Load existing examples if resuming
    examples = []
    total = 0
    if args.resume and Path(args.output).exists():
        with open(args.output, 'r') as f:
            for line in f:
                if line.strip():
                    examples.append(json.loads(line))
        total = len(examples)
        print(f"\n🔄 Resuming {args.agent} from {total} existing examples")
        print(f"   📊 Target: {args.count} total ({args.count - total} remaining)\n")
    else:
        print(f"\n🚀 Generating {args.count} examples for {args.agent}")
        print(f"   📊 Distribution: {easy_count} easy, {medium_count} medium, {hard_count} hard\n")

    for difficulty, count in [("easy", easy_count), ("medium", medium_count), ("hard", hard_count)]:
        for i in range(count):
            # Skip if we already have enough examples
            if total >= args.count:
                break

            category = CATEGORIES[i % len(CATEGORIES)]
            try:
                example = generate_example(client, args.agent, difficulty, category, total + 1)
                examples.append(example)
                total += 1

                # Progress every 10 examples
                if total % 10 == 0:
                    print(f"✅ {total}/{args.count} examples generated...")
                    # Save incrementally
                    with open(args.output, 'w') as f:
                        for ex in examples:
                            f.write(json.dumps(ex) + '\n')

            except Exception as e:
                print(f"❌ Error on example {total + 1}: {e}")
                continue

    # Final save
    with open(args.output, 'w') as f:
        for ex in examples:
            f.write(json.dumps(ex) + '\n')

    print(f"\n✨ Complete! Generated {len(examples)} examples")
    print(f"💾 Saved to: {args.output}")

if __name__ == "__main__":
    main()
