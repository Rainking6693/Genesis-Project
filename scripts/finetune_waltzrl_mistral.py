#!/usr/bin/env python3
"""
Launch WaltzRL fine-tuning on Mistral API.
Fine-tunes 2 agents: Conversation Agent + Feedback Agent
"""

import os
import json
import time
from mistralai import Mistral

def finetune_agent(client, agent_name, training_file_path, output_dir):
    """Fine-tune a single WaltzRL agent."""
    print(f"\n{'='*60}")
    print(f"🚀 Fine-tuning {agent_name}")
    print(f"{'='*60}")

    # Upload training file
    print(f"📦 Uploading training data: {training_file_path}")
    with open(training_file_path, "rb") as f:
        uploaded_file = client.files.upload(
            file={
                "file_name": os.path.basename(training_file_path),
                "content": f,
            }
        )
        print(f"✅ File uploaded: {uploaded_file.id}")

    # Create fine-tuning job
    # Note: With ~10k examples, 1 epoch ≈ 3 training steps
    # For 3 epochs: 3 * 3 = 9 training steps (conservative)
    # For 10 epochs: 10 * 3 = 30 training steps
    print(f"🎯 Creating fine-tuning job...")
    job = client.fine_tuning.jobs.create(
        model="open-mistral-7b",
        training_files=[{"file_id": uploaded_file.id, "weight": 1}],
        hyperparameters={
            "training_steps": 30,  # ~10 epochs for 10k examples
            "learning_rate": 0.0001
        }
    )

    print(f"✅ Job created: {job.id}")
    print(f"   Status: {job.status}")
    print(f"   Model: {job.model}")

    # Save job info
    os.makedirs(output_dir, exist_ok=True)
    job_info = {
        "job_id": job.id,
        "file_id": uploaded_file.id,
        "agent": agent_name,
        "model": job.model,
        "status": job.status,
        "created_at": job.created_at,
        "training_file": training_file_path
    }

    job_info_path = os.path.join(output_dir, "job_info.json")
    with open(job_info_path, "w") as f:
        json.dump(job_info, f, indent=2)

    print(f"💾 Job info saved to: {job_info_path}")

    return job.id, uploaded_file.id

def main():
    print("🚀 Starting WaltzRL Mistral Fine-Tuning")
    print("="*60)

    # Check API key
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        print("❌ Error: MISTRAL_API_KEY environment variable not set!")
        return

    client = Mistral(api_key=api_key)

    # Fine-tune Conversation Agent
    try:
        conv_job_id, conv_file_id = finetune_agent(
            client=client,
            agent_name="waltzrl_conversation",
            training_file_path="data/openai_format/waltzrl_conversation_training.jsonl",
            output_dir="models/waltzrl_conversation_mistral"
        )
    except Exception as e:
        print(f"❌ Error fine-tuning Conversation Agent: {e}")
        return

    # Wait 10 seconds before launching second job (avoid rate limits)
    print("\n⏳ Waiting 10 seconds before launching Feedback Agent...")
    time.sleep(10)

    # Fine-tune Feedback Agent
    try:
        feedback_job_id, feedback_file_id = finetune_agent(
            client=client,
            agent_name="waltzrl_feedback",
            training_file_path="data/openai_format/waltzrl_feedback_training.jsonl",
            output_dir="models/waltzrl_feedback_mistral"
        )
    except Exception as e:
        print(f"❌ Error fine-tuning Feedback Agent: {e}")
        return

    # Summary
    print("\n" + "="*60)
    print("✅ Both jobs launched successfully!")
    print("="*60)
    print(f"\nConversation Agent Job: {conv_job_id}")
    print(f"Feedback Agent Job: {feedback_job_id}")

    print("\n📊 Monitor progress with:")
    print(f"   python3 scripts/monitor_waltzrl_training.py")

    print("\n⏱️  Expected completion: 30-60 minutes")
    print("💰 Expected cost: $4-16 total")

if __name__ == "__main__":
    main()
