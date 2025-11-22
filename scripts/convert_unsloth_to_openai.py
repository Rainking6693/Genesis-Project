#!/usr/bin/env python3
"""
Convert Unsloth Format to OpenAI Fine-Tuning Format

The Unsloth format includes extra fields (weight, source_agent, etc.) that OpenAI rejects.
This script strips those fields and keeps only the "messages" array.

Usage:
    python3 scripts/convert_unsloth_to_openai.py

Input: data/unsloth_format/*_training.jsonl
Output: data/openai_format/*_training.jsonl
"""

import json
from pathlib import Path

def convert_file(input_file: Path, output_file: Path):
    """Convert single file from Unsloth to OpenAI format"""
    output_file.parent.mkdir(parents=True, exist_ok=True)

    converted = 0
    with open(input_file, 'r') as inf, open(output_file, 'w') as outf:
        for line in inf:
            example = json.loads(line)

            # Keep only "messages" field
            openai_example = {
                "messages": example["messages"]
            }

            outf.write(json.dumps(openai_example) + '\n')
            converted += 1

    print(f"✅ Converted {input_file.name}: {converted} examples")
    return converted

def main():
    input_dir = Path("data/unsloth_format")
    output_dir = Path("data/openai_format")

    agents = ["qa_agent", "support_agent", "legal_agent", "analyst_agent", "content_agent"]

    total_converted = 0
    for agent in agents:
        input_file = input_dir / f"{agent}_training.jsonl"
        output_file = output_dir / f"{agent}_training.jsonl"

        if input_file.exists():
            converted = convert_file(input_file, output_file)
            total_converted += converted
        else:
            print(f"⚠️  Warning: {input_file} not found")

    print(f"\n✅ Total converted: {total_converted} examples")
    print(f"📂 Output directory: {output_dir}")
    print(f"\n🎯 Next: Update finetune_agent.py to use data/openai_format/")

if __name__ == "__main__":
    main()
