#!/bin/bash
set -e

# Activate venv if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
else
    echo "❌ venv not found"
fi

# SECURITY: Do not hardcode API keys. Set via environment variable:
# export MISTRAL_API_KEY="your-key-here"
if [[ -z "${MISTRAL_API_KEY:-}" ]]; then
    echo "ERROR: MISTRAL_API_KEY environment variable not set"
    echo "Set it with: export MISTRAL_API_KEY='your-key-here'"
    exit 1
fi

echo "========================================"
echo "MISTRAL FINE-TUNING - FINAL 2 AGENTS"
echo "========================================"
echo "Model: open-mistral-7b"
echo "Data: data/openai_format_sampled"
echo "Agents: support_agent analyst_agent"
echo "Credits available: $30"
echo "Estimated cost: $4-6 total"
echo "========================================"
echo ""

# Only the 2 remaining agents
AGENTS=("support_agent" "analyst_agent")
DATA_DIR="data/openai_format_sampled"
MODEL="open-mistral-7b"

for agent in "${AGENTS[@]}"; do
    echo "🚀 Starting fine-tuning for ${agent}..."

    # Upload file
    echo "  📁 Uploading training file: ${DATA_DIR}/${agent}_training.jsonl"

    python3 << EOF
from mistralai import Mistral
import os

client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

# Upload file
with open("${DATA_DIR}/${agent}_training.jsonl", "rb") as f:
    upload_response = client.files.upload(
        file={"file_name": "${agent}_training.jsonl", "content": f}
    )
    file_id = upload_response.id
    print(f"  ✅ File uploaded: {file_id}")

    # Create fine-tuning job
    print(f"  🎯 Creating fine-tuning job...")
    job = client.fine_tuning.jobs.create(
        model="${MODEL}",
        training_files=[{"file_id": file_id, "weight": 1.0}],
        hyperparameters={
            "training_steps": 10,
            "learning_rate": 0.0001,
        },
    )

    print(f"  ✅ Job created: {job.id}")
    print(f"  📊 Status: {job.status}")

    # Save job info
    import json
    job_info = {
        "job_id": job.id,
        "file_id": file_id,
        "agent": "${agent}",
        "model": "${MODEL}",
        "status": job.status,
    }

    os.makedirs("models/${agent}_mistral", exist_ok=True)
    with open("models/${agent}_mistral/job_info.json", "w") as f:
        json.dump(job_info, f, indent=2)

    print(f"  💾 Job info saved to: models/${agent}_mistral/job_info.json")
    print(f"  ✅ ${agent} fine-tuning started!")
    print()
EOF

    # Add delay between jobs to avoid concurrency issues
    if [ "$agent" = "support_agent" ]; then
        echo "⏳ Waiting 5 seconds before starting next job..."
        sleep 5
    fi
done

echo "========================================"
echo "FINAL 2 AGENTS STARTED!"
echo "========================================"
echo ""
echo "📊 Monitor jobs with:"
echo "  bash QUICK_STATUS_CHECK.sh"
echo ""
echo "💰 Estimated cost: $4-6"
echo "⏱️  Expected completion: 30-60 minutes"
echo ""
echo "📈 Progress:"
echo "  - Genesis Agents: 3/5 complete → 5/5 after this"
echo "  - WaltzRL Agents: Ready to start next (2 agents, $4-6)"
echo "  - Total remaining credits: ~$20-22 after this"
