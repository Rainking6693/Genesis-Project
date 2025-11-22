"""
Fine-Tune Analyst Agent with Socratic-Zero Data

Compares baseline vs. Socratic-Zero bootstrapped data for Analyst agent fine-tuning.
Uses Unsloth for efficient fine-tuning.
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AnalystFineTuner:
    """
    Fine-tune Analyst agent with baseline or Socratic-Zero data.
    
    Comparison:
    - Baseline: Standard business reasoning dataset
    - Socratic-Zero: Bootstrapped data from 100 seeds (5,000+ examples)
    
    Expected: ≥10% improvement with Socratic-Zero data
    """
    
    def __init__(
        self,
        data_dir: Path = None,
        output_dir: Path = None,
        model_name: str = "unsloth/llama-3-8b-bnb-4bit"
    ):
        """
        Initialize fine-tuner.
        
        Args:
            data_dir: Directory containing training data
            output_dir: Directory for fine-tuned models
            model_name: Base model to fine-tune
        """
        self.data_dir = data_dir or PROJECT_ROOT / "data" / "socratic_zero"
        self.output_dir = output_dir or PROJECT_ROOT / "models" / "analyst"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.model_name = model_name
        
        # Check for Unsloth availability
        try:
            from unsloth import FastLanguageModel
            self.unsloth_available = True
            logger.info("Unsloth available - using efficient fine-tuning")
        except ImportError:
            self.unsloth_available = False
            logger.warning("Unsloth not available - using standard fine-tuning")
    
    def convert_to_unsloth_format(
        self,
        input_file: Path,
        output_file: Path,
        format_type: str = "alpaca"
    ):
        """
        Convert JSONL data to Unsloth training format.
        
        Args:
            input_file: Input JSONL file
            output_file: Output JSONL file in Unsloth format
            format_type: Format type (alpaca, sharegpt, etc.)
        """
        logger.info(f"Converting {input_file} to Unsloth format")
        
        examples = []
        with open(input_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    examples.append(json.loads(line))
        
        logger.info(f"Loaded {len(examples)} examples")
        
        # Convert to Alpaca format
        converted = []
        for ex in examples:
            if format_type == "alpaca":
                alpaca_ex = {
                    "instruction": ex.get("instruction", ex.get("question", "")),
                    "input": ex.get("input", ""),
                    "output": ex.get("output", ex.get("answer", "")),
                }
                converted.append(alpaca_ex)
            elif format_type == "sharegpt":
                sharegpt_ex = {
                    "conversations": [
                        {"from": "human", "value": ex.get("question", "")},
                        {"from": "gpt", "value": ex.get("answer", "")}
                    ]
                }
                converted.append(sharegpt_ex)
        
        # Save converted data
        with open(output_file, 'w', encoding='utf-8') as f:
            for ex in converted:
                f.write(json.dumps(ex, ensure_ascii=False) + "\n")
        
        logger.info(f"Converted {len(converted)} examples to {output_file}")
        return output_file
    
    def fine_tune_baseline(
        self,
        baseline_file: Path = None,
        epochs: int = 3,
        batch_size: int = 4,
        learning_rate: float = 2e-4
    ) -> Path:
        """
        Fine-tune with baseline data.
        
        Args:
            baseline_file: Path to baseline training data
            epochs: Number of training epochs
            batch_size: Training batch size
            learning_rate: Learning rate
            
        Returns:
            Path to fine-tuned model
        """
        if baseline_file is None:
            baseline_file = self.data_dir / "analyst_seeds.jsonl"
        
        logger.info(f"Fine-tuning BASELINE model from {baseline_file}")
        
        # Convert to Unsloth format
        unsloth_file = self.output_dir / "baseline_unsloth.jsonl"
        self.convert_to_unsloth_format(baseline_file, unsloth_file)
        
        # Fine-tune
        model_output = self.output_dir / "analyst_baseline"
        
        if self.unsloth_available:
            self._fine_tune_with_unsloth(
                unsloth_file, model_output, epochs, batch_size, learning_rate
            )
        else:
            self._fine_tune_standard(
                unsloth_file, model_output, epochs, batch_size, learning_rate
            )
        
        logger.info(f"Baseline model saved to {model_output}")
        return model_output
    
    def fine_tune_socratic_zero(
        self,
        socratic_file: Path = None,
        epochs: int = 3,
        batch_size: int = 4,
        learning_rate: float = 2e-4
    ) -> Path:
        """
        Fine-tune with Socratic-Zero bootstrapped data.
        
        Args:
            socratic_file: Path to Socratic-Zero training data
            epochs: Number of training epochs
            batch_size: Training batch size
            learning_rate: Learning rate
            
        Returns:
            Path to fine-tuned model
        """
        if socratic_file is None:
            socratic_file = self.data_dir / "analyst_bootstrap.jsonl"
        
        logger.info(f"Fine-tuning SOCRATIC-ZERO model from {socratic_file}")
        
        # Convert to Unsloth format
        unsloth_file = self.output_dir / "socratic_zero_unsloth.jsonl"
        self.convert_to_unsloth_format(socratic_file, unsloth_file)
        
        # Fine-tune
        model_output = self.output_dir / "analyst_socratic_zero"
        
        if self.unsloth_available:
            self._fine_tune_with_unsloth(
                unsloth_file, model_output, epochs, batch_size, learning_rate
            )
        else:
            self._fine_tune_standard(
                unsloth_file, model_output, epochs, batch_size, learning_rate
            )
        
        logger.info(f"Socratic-Zero model saved to {model_output}")
        return model_output
    
    def _fine_tune_with_unsloth(
        self,
        data_file: Path,
        output_dir: Path,
        epochs: int,
        batch_size: int,
        learning_rate: float
    ):
        """Fine-tune using Unsloth (efficient)."""
        from unsloth import FastLanguageModel
        from trl import SFTTrainer
        from transformers import TrainingArguments
        from datasets import load_dataset
        
        logger.info("Loading model with Unsloth")
        
        # Load model
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=self.model_name,
            max_seq_length=2048,
            dtype=None,
            load_in_4bit=True,
        )
        
        # Configure LoRA
        model = FastLanguageModel.get_peft_model(
            model,
            r=16,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                          "gate_proj", "up_proj", "down_proj"],
            lora_alpha=16,
            lora_dropout=0,
            bias="none",
            use_gradient_checkpointing=True,
            random_state=3407,
        )
        
        # Load dataset
        dataset = load_dataset("json", data_files=str(data_file), split="train")
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=str(output_dir),
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            learning_rate=learning_rate,
            fp16=True,
            logging_steps=10,
            save_strategy="epoch",
            optim="adamw_8bit",
        )
        
        # Trainer
        trainer = SFTTrainer(
            model=model,
            tokenizer=tokenizer,
            train_dataset=dataset,
            args=training_args,
            max_seq_length=2048,
        )
        
        # Train
        logger.info("Starting training with Unsloth")
        trainer.train()
        
        # Save
        model.save_pretrained(str(output_dir))
        tokenizer.save_pretrained(str(output_dir))
        
        logger.info(f"Model saved to {output_dir}")
    
    def _fine_tune_standard(
        self,
        data_file: Path,
        output_dir: Path,
        epochs: int,
        batch_size: int,
        learning_rate: float
    ):
        """Fine-tune using standard transformers (fallback)."""
        logger.warning("Using standard fine-tuning (slower than Unsloth)")
        
        # Placeholder for standard fine-tuning
        # In production, this would use transformers Trainer
        logger.info(f"Would fine-tune with: epochs={epochs}, batch_size={batch_size}, lr={learning_rate}")
        logger.info(f"Data: {data_file}")
        logger.info(f"Output: {output_dir}")
        
        # Create placeholder output
        output_dir.mkdir(parents=True, exist_ok=True)
        metadata = {
            "model_name": self.model_name,
            "data_file": str(data_file),
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "method": "standard"
        }
        
        with open(output_dir / "training_metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info("Standard fine-tuning complete (placeholder)")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Fine-tune Analyst agent")
    parser.add_argument(
        "--data",
        choices=["baseline", "socratic_zero", "both"],
        default="both",
        help="Which data to use for fine-tuning"
    )
    parser.add_argument("--epochs", type=int, default=3, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--learning-rate", type=float, default=2e-4, help="Learning rate")
    
    args = parser.parse_args()
    
    # Initialize fine-tuner
    fine_tuner = AnalystFineTuner()
    
    # Fine-tune based on selection
    if args.data in ["baseline", "both"]:
        logger.info("=== Fine-tuning BASELINE model ===")
        baseline_model = fine_tuner.fine_tune_baseline(
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate
        )
        logger.info(f"Baseline model: {baseline_model}")
    
    if args.data in ["socratic_zero", "both"]:
        logger.info("=== Fine-tuning SOCRATIC-ZERO model ===")
        socratic_model = fine_tuner.fine_tune_socratic_zero(
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate
        )
        logger.info(f"Socratic-Zero model: {socratic_model}")
    
    logger.info("Fine-tuning complete!")
    logger.info("Next step: Run benchmarking to compare models")
    logger.info("Command: python scripts/socratic_zero/benchmark_analyst.py")


if __name__ == "__main__":
    main()

