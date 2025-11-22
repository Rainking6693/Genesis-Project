"""
Repeatable Fine-Tune Loop for DeepSeek-OCR

Tracks document mix over time (receipts, tax forms, contracts) and
automatically triggers retraining when new documents are added.

Features:
- Document mix analysis (receipts, invoices, contracts, tax forms)
- Auto-trigger logic (50+ new documents)
- Training history persistence
- Timestamp-based model versioning
- Integration with Genesis agents

Usage:
    python scripts/ocr_finetune_loop.py
    
    # Or with custom threshold
    python scripts/ocr_finetune_loop.py --threshold 100
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from infrastructure.finetune.deepseek_ocr_unsloth import DeepSeekOCRFineTuner

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OCRFineTuneLoop:
    """
    Repeatable fine-tune loop for DeepSeek-OCR.
    
    Monitors document directory for new documents and automatically
    triggers retraining when threshold is reached.
    """
    
    def __init__(self, base_dir: str = "data/ocr_documents"):
        """
        Initialize fine-tune loop.
        
        Args:
            base_dir: Base directory containing train/val/test splits
        """
        self.base_dir = Path(base_dir)
        self.history_file = self.base_dir / "training_history.json"
        self.annotations_file = self.base_dir / "annotations.json"
        
        self.history = {"runs": []}
        self.load_history()
        
        logger.info(f"Initialized OCR fine-tune loop: {self.base_dir}")
        logger.info(f"Training history: {len(self.history['runs'])} previous runs")
    
    def load_history(self):
        """Load training history to track document mix over time."""
        if self.history_file.exists():
            try:
                with open(self.history_file) as f:
                    self.history = json.load(f)
                logger.info(f"Loaded training history: {len(self.history['runs'])} runs")
            except Exception as e:
                logger.warning(f"Failed to load history: {e}, starting fresh")
                self.history = {"runs": []}
        else:
            logger.info("No training history found, starting fresh")
            self.history = {"runs": []}
    
    def save_history(self):
        """Save training history to disk."""
        try:
            self.history_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.history_file, "w") as f:
                json.dump(self.history, f, indent=2)
            logger.info(f"Saved training history: {len(self.history['runs'])} runs")
        except Exception as e:
            logger.error(f"Failed to save history: {e}")
    
    def analyze_document_mix(self) -> Dict[str, int]:
        """
        Analyze current document distribution.
        
        Returns:
            Dictionary mapping category to count
            Example: {"receipt": 150, "invoice": 80, "contract": 45}
        """
        categories = {}
        
        for split in ["train", "val", "test"]:
            split_dir = self.base_dir / split
            
            if not split_dir.exists():
                logger.warning(f"Split directory not found: {split_dir}")
                continue
            
            # Count files by category (extracted from filename)
            for img_file in split_dir.glob("*"):
                if img_file.is_file() and img_file.suffix in [".jpg", ".jpeg", ".png", ".pdf"]:
                    # Extract category from filename (e.g., "receipt_001.jpg" → "receipt")
                    category = img_file.stem.split("_")[0]
                    categories[category] = categories.get(category, 0) + 1
        
        logger.info(f"Document mix: {categories}")
        return categories
    
    def should_retrain(self, threshold: int = 50) -> bool:
        """
        Check if new documents warrant retraining.
        
        Args:
            threshold: Minimum number of new documents to trigger retraining
        
        Returns:
            True if retraining should be triggered
        """
        # Always retrain if no previous runs
        if not self.history["runs"]:
            logger.info("No previous training runs, retraining recommended")
            return True
        
        # Get last run
        last_run = self.history["runs"][-1]
        current_mix = self.analyze_document_mix()
        last_mix = last_run.get("document_mix", {})
        
        # Calculate new documents
        new_docs = sum(
            current_mix.get(cat, 0) - last_mix.get(cat, 0)
            for cat in current_mix
        )
        
        logger.info(f"New documents since last run: {new_docs}")
        
        if new_docs >= threshold:
            logger.info(f"✅ Threshold reached ({new_docs} >= {threshold}), retraining recommended")
            return True
        else:
            logger.info(f"❌ Threshold not reached ({new_docs} < {threshold}), no retraining needed")
            return False
    
    def train_new_version(
        self,
        num_epochs: int = 3,
        batch_size: int = 8,
        learning_rate: float = 2e-4
    ) -> str:
        """
        Train new fine-tuned version with current documents.
        
        Args:
            num_epochs: Number of training epochs
            batch_size: Training batch size
            learning_rate: Learning rate
        
        Returns:
            Path to fine-tuned model
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"models/deepseek-ocr-genesis-{timestamp}"
        
        logger.info(f"🚀 Starting fine-tuning: {output_dir}")
        
        try:
            # Initialize fine-tuner
            finetuner = DeepSeekOCRFineTuner(
                model_name="unsloth/DeepSeek-OCR",
                load_in_4bit=True
            )
            
            # Prepare dataset
            dataset = finetuner.prepare_dataset(
                image_dir=str(self.base_dir / "train"),
                annotation_file=str(self.annotations_file)
            )
            
            # Fine-tune
            result = finetuner.train(
                dataset=dataset,
                output_dir=output_dir,
                num_train_epochs=num_epochs,
                batch_size=batch_size,
                learning_rate=learning_rate
            )
            
            # Record training run
            self.history["runs"].append({
                "timestamp": timestamp,
                "output_dir": output_dir,
                "document_mix": self.analyze_document_mix(),
                "total_documents": sum(self.analyze_document_mix().values()),
                "training_loss": result.training_loss,
                "training_time_seconds": result.training_time_seconds,
                "peak_memory_mb": result.peak_memory_mb,
                "num_epochs": num_epochs,
                "batch_size": batch_size,
                "learning_rate": learning_rate
            })
            
            # Save history
            self.save_history()
            
            logger.info(f"✅ Fine-tuning complete: {output_dir}")
            logger.info(f"   Training time: {result.training_time_seconds/60:.1f} minutes")
            logger.info(f"   Training loss: {result.training_loss:.4f}")
            logger.info(f"   Peak VRAM: {result.peak_memory_mb:.1f} MB")
            
            return output_dir
            
        except Exception as e:
            logger.error(f"❌ Fine-tuning failed: {e}")
            raise
    
    def run(
        self,
        threshold: int = 50,
        num_epochs: int = 3,
        batch_size: int = 8,
        force: bool = False
    ):
        """
        Main loop: check if retraining needed, train if yes.
        
        Args:
            threshold: Minimum number of new documents to trigger retraining
            num_epochs: Number of training epochs
            batch_size: Training batch size
            force: Force retraining even if threshold not reached
        """
        logger.info("=" * 60)
        logger.info("OCR Fine-Tune Loop - Starting")
        logger.info("=" * 60)
        
        # Check if retraining needed
        if force:
            logger.info("🔄 Force flag set, starting fine-tune...")
            model_path = self.train_new_version(
                num_epochs=num_epochs,
                batch_size=batch_size
            )
            logger.info(f"✅ Fine-tuning complete: {model_path}")
        elif self.should_retrain(threshold=threshold):
            logger.info("📊 New documents detected, starting fine-tune...")
            model_path = self.train_new_version(
                num_epochs=num_epochs,
                batch_size=batch_size
            )
            logger.info(f"✅ Fine-tuning complete: {model_path}")
        else:
            logger.info(f"✅ No retraining needed (< {threshold} new documents)")
        
        logger.info("=" * 60)
        logger.info("OCR Fine-Tune Loop - Complete")
        logger.info("=" * 60)
    
    def print_status(self):
        """Print current status and training history."""
        print("\n" + "=" * 60)
        print("OCR Fine-Tune Loop - Status")
        print("=" * 60)
        
        # Current document mix
        current_mix = self.analyze_document_mix()
        print(f"\n📊 Current Document Mix:")
        for category, count in sorted(current_mix.items()):
            print(f"   {category}: {count}")
        print(f"   TOTAL: {sum(current_mix.values())}")
        
        # Training history
        print(f"\n📜 Training History ({len(self.history['runs'])} runs):")
        for i, run in enumerate(self.history["runs"][-5:], 1):  # Last 5 runs
            print(f"\n   Run {i}: {run['timestamp']}")
            print(f"      Model: {run['output_dir']}")
            print(f"      Documents: {run['total_documents']}")
            print(f"      Training loss: {run.get('training_loss', 'N/A')}")
            print(f"      Training time: {run.get('training_time_seconds', 0)/60:.1f} min")
        
        print("\n" + "=" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Repeatable fine-tune loop for DeepSeek-OCR"
    )
    parser.add_argument(
        "--base-dir",
        type=str,
        default="data/ocr_documents",
        help="Base directory containing OCR documents"
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=50,
        help="Minimum number of new documents to trigger retraining"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Number of training epochs"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=8,
        help="Training batch size"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force retraining even if threshold not reached"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Print status and exit (no training)"
    )
    
    args = parser.parse_args()
    
    # Initialize loop
    loop = OCRFineTuneLoop(base_dir=args.base_dir)
    
    # Print status or run training
    if args.status:
        loop.print_status()
    else:
        loop.run(
            threshold=args.threshold,
            num_epochs=args.epochs,
            batch_size=args.batch_size,
            force=args.force
        )


if __name__ == "__main__":
    main()

