#!/usr/bin/env python3
"""Quick status check for WaltzRL fine-tuning jobs."""

import os
import json
from mistralai import Mistral

def check_job_status(client, job_id, agent_name):
    """Check status of a single fine-tuning job."""
    try:
        job = client.fine_tuning.jobs.get(job_id=job_id)

        print(f"\n{'='*60}")
        print(f"🔍 {agent_name}")
        print(f"{'='*60}")
        print(f"Job ID: {job.id}")
        print(f"Status: {job.status}")
        print(f"Model: {job.model}")
        print(f"Created: {job.created_at}")

        if hasattr(job, 'fine_tuned_model') and job.fine_tuned_model:
            print(f"✅ Fine-tuned Model: {job.fine_tuned_model}")

        if hasattr(job, 'trained_tokens') and job.trained_tokens:
            print(f"📊 Trained Tokens: {job.trained_tokens:,}")

        return job.status, job.fine_tuned_model if hasattr(job, 'fine_tuned_model') else None

    except Exception as e:
        print(f"❌ Error checking {agent_name}: {e}")
        return "ERROR", None

def main():
    print("🔍 WaltzRL Fine-Tuning Status Check")
    print("="*60)

    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        print("❌ MISTRAL_API_KEY not set!")
        return

    client = Mistral(api_key=api_key)

    # Load job IDs
    conv_job_file = "models/waltzrl_conversation_mistral/job_info.json"
    feedback_job_file = "models/waltzrl_feedback_mistral/job_info.json"

    if not os.path.exists(conv_job_file):
        print(f"❌ {conv_job_file} not found!")
        return

    with open(conv_job_file, 'r') as f:
        conv_info = json.load(f)
    with open(feedback_job_file, 'r') as f:
        feedback_info = json.load(f)

    # Check both jobs
    conv_status, conv_model = check_job_status(client, conv_info['job_id'], "Conversation Agent")
    feedback_status, feedback_model = check_job_status(client, feedback_info['job_id'], "Feedback Agent")

    # Summary
    print(f"\n{'='*60}")
    print("📊 SUMMARY")
    print(f"{'='*60}")
    print(f"Conversation Agent: {conv_status}")
    print(f"Feedback Agent: {feedback_status}")

    if conv_status == "SUCCESS" and feedback_status == "SUCCESS":
        print("\n🎉 Both agents fine-tuned successfully!")
        print(f"\n✅ Conversation Model: {conv_model}")
        print(f"✅ Feedback Model: {feedback_model}")

        # Update job info files
        conv_info['status'] = conv_status
        conv_info['fine_tuned_model'] = conv_model
        with open(conv_job_file, 'w') as f:
            json.dump(conv_info, f, indent=2)

        feedback_info['status'] = feedback_status
        feedback_info['fine_tuned_model'] = feedback_model
        with open(feedback_job_file, 'w') as f:
            json.dump(feedback_info, f, indent=2)

        print("\n💾 Model IDs saved to job_info.json files")
    elif conv_status in ["RUNNING", "QUEUED"] or feedback_status in ["RUNNING", "QUEUED"]:
        print("\n⏳ Training in progress... Check again in a few minutes.")
    else:
        print("\n⚠️ Check job statuses above for details.")

if __name__ == "__main__":
    main()
