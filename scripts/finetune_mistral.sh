#!/usr/bin/env bash
# Quick Mistral Fine-Tuning Test (MUCH CHEAPER than OpenAI)
#
# Estimated cost: $5-15 total (vs $100-457 for OpenAI)
# Model: open-mistral-7b (fine-tunable open-source model)

set -euo pipefail

# Configuration
# SECURITY: Do not hardcode API keys. Set via environment variable:
# export MISTRAL_API_KEY="your-key-here"
if [[ -z "${MISTRAL_API_KEY:-}" ]]; then
    echo "ERROR: MISTRAL_API_KEY environment variable not set"
    echo "Set it with: export MISTRAL_API_KEY='your-key-here'"
    exit 1
fi
AGENTS=("qa_agent" "support_agent" "legal_agent" "analyst_agent" "content_agent")
DATA_DIR="data/openai_format_sampled"  # 5k samples per agent
MODEL="open-mistral-7b"

# Activate venv
source venv/bin/activate
echo "✅ Activated virtual environment"

echo "========================================"
echo "MISTRAL FINE-TUNING (Cost-Optimized)"
echo "========================================"
echo "Model: ${MODEL}"
echo "Data: ${DATA_DIR}"
echo "Agents: ${AGENTS[*]}"
echo "Estimated cost: \$5-15 total"
echo "========================================"
echo ""

# Fine-tune each agent
for agent in "${AGENTS[@]}"; do
    echo "🚀 Starting fine-tuning for ${agent}..."

    python3 << EOF
import os
import json
from pathlib import Path
from mistralai import Mistral

api_key = os.environ["MISTRAL_API_KEY"]
client = Mistral(api_key=api_key)

agent = "${agent}"
data_file = Path("${DATA_DIR}") / f"{agent}_training.jsonl"

print(f"  📁 Uploading training file: {data_file}")

# Upload file
with open(data_file, 'rb') as f:
    upload_response = client.files.upload(
        file={
            "file_name": f"{agent}_training.jsonl",
            "content": f,
        }
    )

file_id = upload_response.id
print(f"  ✅ File uploaded: {file_id}")

# Create fine-tuning job
print(f"  🎯 Creating fine-tuning job...")
job = client.fine_tuning.jobs.create(
    model="${MODEL}",
    training_files=[{"file_id": file_id, "weight": 1.0}],
    hyperparameters={
        "training_steps": 10,  # Start with minimal for testing
        "learning_rate": 0.0001,
    },
)

job_id = job.id
print(f"  ✅ Job created: {job_id}")
print(f"  📊 Status: {job.status}")

# Save job info
output_dir = Path("models") / f"{agent}_mistral"
output_dir.mkdir(parents=True, exist_ok=True)

with open(output_dir / "job_info.json", 'w') as f:
    json.dump({
        "job_id": job_id,
        "file_id": file_id,
        "agent": agent,
        "model": "${MODEL}",
        "status": job.status,
    }, f, indent=2)

print(f"  💾 Job info saved to: {output_dir}/job_info.json")
print(f"  ✅ {agent} fine-tuning started!\n")
EOF

done

echo "========================================"
echo "ALL AGENTS STARTED!"
echo "========================================"
echo ""
echo "📊 Monitor jobs with:"
echo "  python3 -c 'from mistralai import Mistral; import os; client = Mistral(api_key=os.environ[\"MISTRAL_API_KEY\"]); jobs = client.fine_tuning.jobs.list(); print(\"\\n\".join([f\"{j.id}: {j.status}\" for j in jobs.data]))'"
echo ""
echo "💰 Estimated total cost: \$5-15"
echo "⏱️  Expected completion: 30-60 minutes"
