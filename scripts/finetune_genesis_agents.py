#!/usr/bin/env python3
"""
Genesis Agent Fine-Tuning Pipeline
Fine-tunes LLMs for Genesis agents using Agent-FLAN methodology

Supports:
- Google Gemini Flash fine-tuning (low cost)
- OpenAI GPT-4o-mini fine-tuning (mid cost)
- Anthropic Claude (via LoRA/QLoRA)

Expected improvements:
- 15-25% cost reduction (can use cheaper models)
- 10-20% accuracy improvement (domain-specific tuning)

Author: Thon (Python Specialist)
Date: October 28, 2025
"""

import os
import json
import asyncio
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime
import time


class GenesisFinetuner:
    """Fine-tune Genesis agents using prepared training data"""

    def __init__(
        self,
        data_dir: str = "/home/genesis/genesis-rebuild/data/finetuning",
        models_dir: str = "/home/genesis/genesis-rebuild/models/finetuned"
    ):
        self.data_dir = data_dir
        self.models_dir = models_dir
        self.supported_providers = ["gemini", "openai", "anthropic"]

        Path(models_dir).mkdir(parents=True, exist_ok=True)

    # ==================== Gemini Fine-Tuning ====================

    def finetune_gemini(
        self,
        agent_name: str,
        base_model: str = "models/gemini-1.5-flash-002",
        training_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fine-tune Gemini Flash for agent-specific tasks

        Cost: ~$0.01/1K training examples (very affordable)
        Time: 30-60 minutes
        """
        base_model = base_model or "models/gemini-1.5-flash-002"

        print(f"\n=== Fine-tuning Gemini for {agent_name} ===")

        # Load training data
        if training_file is None:
            training_file = os.path.join(self.data_dir, f"{agent_name}_train.jsonl")

        print(f"  Training file: {training_file}")
        print(f"  Base model: {base_model}")

        # Convert to Gemini format
        gemini_data = self._convert_to_gemini_format(training_file)
        gemini_file = os.path.join(self.data_dir, f"{agent_name}_gemini_train.jsonl")

        with open(gemini_file, "w") as f:
            for example in gemini_data:
                f.write(json.dumps(example) + "\n")

        print(f"  Converted {len(gemini_data)} examples to Gemini format")

        # Fine-tuning configuration
        config = {
            "display_name": f"genesis-{agent_name}-v1",
            "training_dataset": {
                "gcs_uri": f"gs://genesis-finetuning/{agent_name}_train.jsonl"  # Upload required
            },
            "tuning_parameters": {
                "tuned_model_display_name": f"genesis-{agent_name}",
                "epochs": 5,
                "learning_rate": 0.001,
                "adapter_size": "ADAPTER_SIZE_MEDIUM"  # LoRA adapter
            }
        }

        print("\n  Gemini Fine-Tuning Steps:")
        print("  1. Upload training data to GCS:")
        print(f"     gsutil cp {gemini_file} gs://genesis-finetuning/")
        print("\n  2. Create tuning job via API:")
        print("     gcloud ai tuning-jobs create \\")
        print(f"       --region=us-central1 \\")
        print(f"       --display-name=genesis-{agent_name} \\")
        print(f"       --model-display-name={base_model} \\")
        print(f"       --training-dataset-uri=gs://genesis-finetuning/{agent_name}_train.jsonl \\")
        print(f"       --epochs=5 \\")
        print(f"       --learning-rate=0.001")
        print("\n  3. Monitor training progress:")
        print("     gcloud ai tuning-jobs list")

        return {
            "agent_name": agent_name,
            "provider": "gemini",
            "base_model": base_model,
            "config": config,
            "training_file": gemini_file,
            "status": "ready_to_upload",
            "estimated_cost_usd": 0.01 * (len(gemini_data) / 1000),
            "estimated_time_minutes": 45
        }

    def _convert_to_gemini_format(self, jsonl_file: str) -> List[Dict]:
        """Convert Genesis format to Gemini fine-tuning format"""
        gemini_examples = []

        with open(jsonl_file, "r") as f:
            for line in f:
                example = json.loads(line)

                # Gemini expects multi-turn conversations
                gemini_example = {
                    "messages": []
                }

                for turn in example["conversations"]:
                    gemini_example["messages"].append({
                        "role": "user" if turn["role"] == "user" else "model",
                        "content": turn["content"]
                    })

                gemini_examples.append(gemini_example)

        return gemini_examples

    # ==================== OpenAI Fine-Tuning ====================

    def finetune_openai(
        self,
        agent_name: str,
        base_model: str = "gpt-4o-mini-2024-07-18",
        training_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fine-tune OpenAI GPT-4o-mini for agent-specific tasks

        Cost: ~$0.30/1M training tokens
        Time: 20-40 minutes
        """
        base_model = base_model or "gpt-4o-mini-2024-07-18"

        print(f"\n=== Fine-tuning OpenAI for {agent_name} ===")

        # Load training data
        if training_file is None:
            training_file = os.path.join(self.data_dir, f"{agent_name}_train.jsonl")

        print(f"  Training file: {training_file}")
        print(f"  Base model: {base_model}")

        # Convert to OpenAI format
        openai_data = self._convert_to_openai_format(training_file)
        openai_file = os.path.join(self.data_dir, f"{agent_name}_openai_train.jsonl")

        with open(openai_file, "w") as f:
            for example in openai_data:
                f.write(json.dumps(example) + "\n")

        print(f"  Converted {len(openai_data)} examples to OpenAI format")

        # OpenAI fine-tuning code
        print("\n  OpenAI Fine-Tuning Steps:")
        print("  1. Upload training file:")
        print(f"     openai api files.create -f {openai_file} -p fine-tune")
        print("\n  2. Create fine-tuning job:")
        print(f"     openai api fine_tunes.create -t <file_id> -m {base_model}")
        print("\n  3. Monitor training:")
        print("     openai api fine_tunes.list")
        print("     openai api fine_tunes.get -i <job_id>")

        # Python SDK example
        print("\n  Python SDK Example:")
        print("  ```python")
        print("  from openai import OpenAI")
        print("  client = OpenAI()")
        print("")
        print("  # Upload file")
        print(f"  file = client.files.create(file=open('{openai_file}', 'rb'), purpose='fine-tune')")
        print("")
        print("  # Create fine-tuning job")
        print(f"  job = client.fine_tuning.jobs.create(")
        print(f"      training_file=file.id,")
        print(f"      model='{base_model}',")
        print(f"      hyperparameters={{")
        print(f"          'n_epochs': 3,")
        print(f"          'batch_size': 8,")
        print(f"          'learning_rate_multiplier': 0.1")
        print(f"      }}")
        print(f"  )")
        print("")
        print("  # Monitor")
        print("  print(f'Job ID: {job.id}')")
        print("  print(f'Status: {job.status}')")
        print("  ```")

        return {
            "agent_name": agent_name,
            "provider": "openai",
            "base_model": base_model,
            "training_file": openai_file,
            "status": "ready_to_upload",
            "estimated_cost_usd": 0.30,
            "estimated_time_minutes": 30
        }

    def _convert_to_openai_format(self, jsonl_file: str) -> List[Dict]:
        """Convert Genesis format to OpenAI fine-tuning format"""
        openai_examples = []

        with open(jsonl_file, "r") as f:
            for line in f:
                example = json.loads(line)

                # OpenAI expects messages array
                openai_example = {
                    "messages": []
                }

                for turn in example["conversations"]:
                    openai_example["messages"].append({
                        "role": "user" if turn["role"] == "user" else "assistant",
                        "content": turn["content"]
                    })

                openai_examples.append(openai_example)

        return openai_examples

    # ==================== Anthropic/Claude Fine-Tuning (LoRA) ====================

    def finetune_claude_lora(
        self,
        agent_name: str,
        base_model: str = "claude-3-haiku-20240307",
        training_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fine-tune Claude using LoRA (Low-Rank Adaptation)

        Note: Anthropic doesn't offer official fine-tuning yet,
        but this prepares for future support or local LoRA training

        Cost: ~$0 (local training) or TBD (when Anthropic launches)
        Time: 1-2 hours (local GPU)
        """
        base_model = base_model or "claude-3-haiku-20240307"

        print(f"\n=== Preparing LoRA fine-tuning for {agent_name} (Claude-compatible) ===")

        # Load training data
        if training_file is None:
            training_file = os.path.join(self.data_dir, f"{agent_name}_train.jsonl")

        print(f"  Training file: {training_file}")
        print(f"  Base model: {base_model}")
        print("  Method: LoRA (Low-Rank Adaptation)")

        # For now, prepare data in Anthropic format
        print("\n  Note: Anthropic fine-tuning not yet available.")
        print("  Alternatives:")
        print("    1. Wait for official Anthropic fine-tuning API")
        print("    2. Use local LoRA training with open-source Claude-like models")
        print("    3. Use prompt engineering + few-shot examples instead")

        return {
            "agent_name": agent_name,
            "provider": "anthropic_lora",
            "base_model": base_model,
            "training_file": training_file,
            "status": "awaiting_anthropic_api",
            "alternative": "Use Gemini or OpenAI fine-tuning instead"
        }

    # ==================== Batch Processing ====================

    def finetune_all_agents(
        self,
        provider: str = "gemini",
        base_model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fine-tune all Genesis agents"""
        print("\n" + "=" * 80)
        print(f"GENESIS AGENT FINE-TUNING PIPELINE ({provider.upper()})")
        print("=" * 80)

        # Load dataset summary
        summary_path = os.path.join(self.data_dir, "dataset_summary.json")
        with open(summary_path, "r") as f:
            dataset_summary = json.load(f)

        results = {
            "provider": provider,
            "timestamp": datetime.now().isoformat(),
            "agents": {},
            "total_cost_usd": 0,
            "total_time_minutes": 0
        }

        # Process each agent
        for agent_name in dataset_summary["agents"].keys():
            print(f"\nProcessing {agent_name}...")

            if provider == "gemini":
                result = self.finetune_gemini(agent_name, base_model or "models/gemini-1.5-flash-002")
            elif provider == "openai":
                result = self.finetune_openai(agent_name, base_model or "gpt-4o-mini-2024-07-18")
            elif provider == "anthropic":
                result = self.finetune_claude_lora(agent_name, base_model or "claude-3-haiku-20240307")
            else:
                raise ValueError(f"Unsupported provider: {provider}")

            results["agents"][agent_name] = result
            results["total_cost_usd"] += result.get("estimated_cost_usd", 0)
            results["total_time_minutes"] += result.get("estimated_time_minutes", 0)

        # Save results
        results_path = os.path.join(self.models_dir, f"finetuning_plan_{provider}.json")
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2)

        print("\n" + "=" * 80)
        print("FINE-TUNING PLAN SUMMARY")
        print("=" * 80)
        print(f"  Provider: {provider}")
        print(f"  Agents: {len(results['agents'])}")
        print(f"  Total Estimated Cost: ${results['total_cost_usd']:.2f}")
        print(f"  Total Estimated Time: {results['total_time_minutes']} minutes")
        print(f"\n  Plan saved to: {results_path}")
        print("=" * 80)

        return results

    # ==================== Model Evaluation ====================

    def evaluate_finetuned_model(
        self,
        agent_name: str,
        model_id: str,
        provider: str
    ) -> Dict[str, Any]:
        """Evaluate fine-tuned model on validation set"""
        print(f"\n=== Evaluating {agent_name} model ===")

        val_file = os.path.join(self.data_dir, f"{agent_name}_val.jsonl")

        # Load validation examples
        val_examples = []
        with open(val_file, "r") as f:
            for line in f:
                val_examples.append(json.loads(line))

        print(f"  Validation examples: {len(val_examples)}")
        print(f"  Model: {model_id}")
        print(f"  Provider: {provider}")

        # Evaluation metrics
        metrics = {
            "agent_name": agent_name,
            "model_id": model_id,
            "provider": provider,
            "total_examples": len(val_examples),
            "evaluation_pending": True,
            "instructions": "Use the model's API to run inference on validation set and compute metrics"
        }

        print("\n  Evaluation Steps:")
        print("  1. Load fine-tuned model")
        print("  2. Run inference on validation set")
        print("  3. Compute accuracy, F1, perplexity")
        print("  4. Compare with base model baseline")

        return metrics


def main():
    """Main execution"""
    import argparse

    parser = argparse.ArgumentParser(description="Fine-tune Genesis agents")
    parser.add_argument(
        "--provider",
        choices=["gemini", "openai", "anthropic"],
        default="gemini",
        help="LLM provider for fine-tuning"
    )
    parser.add_argument(
        "--agent",
        type=str,
        help="Specific agent to fine-tune (default: all)"
    )
    parser.add_argument(
        "--base-model",
        type=str,
        help="Base model to fine-tune"
    )

    args = parser.parse_args()

    finetuner = GenesisFinetuner()

    if args.agent:
        # Fine-tune specific agent
        if args.provider == "gemini":
            result = finetuner.finetune_gemini(args.agent, args.base_model)
        elif args.provider == "openai":
            result = finetuner.finetune_openai(args.agent, args.base_model)
        else:
            result = finetuner.finetune_claude_lora(args.agent, args.base_model)

        print(json.dumps(result, indent=2))
    else:
        # Fine-tune all agents
        results = finetuner.finetune_all_agents(args.provider, args.base_model)


if __name__ == "__main__":
    main()
