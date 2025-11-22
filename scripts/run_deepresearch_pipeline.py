#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipelines.deepresearch import DeepResearchConfig, DeepResearchPipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the DeepResearch data pipeline")
    parser.add_argument("--output-dir", type=Path, default=DeepResearchConfig.output_dir)
    parser.add_argument("--prompts-dir", type=Path, default=DeepResearchConfig.prompts_dir)
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--max-examples", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = DeepResearchConfig(output_dir=args.output_dir, prompts_dir=args.prompts_dir)
    pipeline = DeepResearchPipeline(config)
    output = pipeline.run(batch_size=args.batch_size, max_examples=args.max_examples)
    print(f"DeepResearch dataset written to {output}")


if __name__ == "__main__":
    main()
