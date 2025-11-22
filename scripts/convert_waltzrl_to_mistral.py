#!/usr/bin/env python3
"""
Convert WaltzRL training data to Mistral fine-tuning format.

Splits 20,020 examples into:
- Conversation Agent: Handles user interactions (safe responses)
- Feedback Agent: Provides safety analysis and feedback
"""

import json
import random
import os

def main():
    print("🔄 Converting WaltzRL training data to Mistral format...")

    # Load raw WaltzRL data
    input_file = 'data/waltzrl_training_dataset.jsonl'
    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found!")
        return

    with open(input_file, 'r') as f:
        raw_data = [json.loads(line) for line in f]

    print(f"✅ Loaded {len(raw_data)} training examples")

    # Split data: 50% Conversation Agent, 50% Feedback Agent
    random.seed(42)  # Reproducible split
    random.shuffle(raw_data)
    split_point = len(raw_data) // 2

    conversation_data = raw_data[:split_point]
    feedback_data = raw_data[split_point:]

    print(f"\n📊 Split:")
    print(f"   Conversation Agent: {len(conversation_data)} examples")
    print(f"   Feedback Agent: {len(feedback_data)} examples")

    # Convert Conversation Agent data (handles user interactions)
    print("\n🔨 Converting Conversation Agent data...")
    conversation_training = []
    for entry in conversation_data:
        # Skip entries with empty or None responses
        suggested_response = entry.get("suggested_response") or ""
        if not suggested_response.strip():
            continue

        conversation_training.append({
            "messages": [
                {"role": "user", "content": entry["prompt"]},
                {"role": "assistant", "content": entry["suggested_response"]}
            ]
        })

    # Convert Feedback Agent data (provides safety feedback)
    print("🔨 Converting Feedback Agent data...")
    feedback_training = []
    for entry in feedback_data:
        # Skip entries with empty or None responses
        suggested_response = entry.get("suggested_response") or ""
        if not suggested_response.strip():
            continue

        # Create feedback prompt
        feedback_prompt = f"""Analyze this interaction for safety:

User: {entry['prompt']}
Assistant: {entry['suggested_response']}

Provide detailed safety analysis including category, severity, and reasoning."""

        # Create feedback response
        feedback_response = f"""Safety Analysis:
- Category: {entry['safety_category']}
- Classification: {entry['expected_category']}
- Severity: {entry['severity']}/10
- Reasoning: {entry['reasoning']}

The assistant's response appropriately {'blocks' if entry['expected_category'] == 'unsafe' else 'handles'} this request."""

        feedback_training.append({
            "messages": [
                {"role": "user", "content": feedback_prompt},
                {"role": "assistant", "content": feedback_response}
            ]
        })

    # Ensure output directory exists
    os.makedirs('data/openai_format', exist_ok=True)

    # Save formatted data
    conversation_file = 'data/openai_format/waltzrl_conversation_training.jsonl'
    feedback_file = 'data/openai_format/waltzrl_feedback_training.jsonl'

    print(f"\n💾 Writing files...")
    with open(conversation_file, 'w') as f:
        for item in conversation_training:
            f.write(json.dumps(item) + '\n')

    with open(feedback_file, 'w') as f:
        for item in feedback_training:
            f.write(json.dumps(item) + '\n')

    print(f"✅ Conversation Agent: {len(conversation_training)} examples → {conversation_file}")
    print(f"✅ Feedback Agent: {len(feedback_training)} examples → {feedback_file}")

    # Show sample
    print("\n📄 Sample Conversation Agent entry:")
    print(json.dumps(conversation_training[0], indent=2)[:300] + "...")

    print("\n📄 Sample Feedback Agent entry:")
    print(json.dumps(feedback_training[0], indent=2)[:300] + "...")

    print("\n✅ Conversion complete! Ready for fine-tuning.")

if __name__ == "__main__":
    main()
