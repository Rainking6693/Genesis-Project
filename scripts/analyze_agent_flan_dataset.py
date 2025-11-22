#!/usr/bin/env python3
"""
Agent-FLAN Dataset Analysis Script
Analyzes the 34.3K instruction dataset for Genesis agent fine-tuning

Author: Thon (Python Specialist)
Date: October 28, 2025
"""

import os
import json
from typing import Dict, List, Tuple, Any
from collections import Counter, defaultdict
from datasets import load_dataset
import pandas as pd


class AgentFLANAnalyzer:
    """Analyze Agent-FLAN dataset for Genesis integration"""

    # Genesis agent types for categorization
    GENESIS_AGENTS = [
        "qa_agent",          # QA/Testing Agent
        "support_agent",     # Customer Support Agent
        "analyst_agent",     # Data Analyst Agent
        "legal_agent",       # Legal/Compliance Agent
        "content_agent",     # Marketing/Content Agent
        "security_agent",    # Security Agent
        "darwin_agent",      # SE-Darwin (Self-Improvement)
        "deploy_agent",      # Deployment Agent
        "spec_agent",        # Specification Agent
        "reflection_agent",  # Reflection Agent
        "builder_agent",     # Builder Agent
        "orchestrator",      # Genesis Orchestrator
    ]

    # Keywords for categorizing instructions by agent type
    AGENT_KEYWORDS = {
        "qa_agent": [
            "test", "verify", "validate", "check", "bug", "error",
            "debug", "quality", "assert", "selenium", "pytest"
        ],
        "support_agent": [
            "customer", "support", "help", "issue", "ticket", "troubleshoot",
            "resolve", "user", "problem", "service", "chat"
        ],
        "analyst_agent": [
            "analyze", "data", "report", "metrics", "dashboard", "chart",
            "visualization", "statistics", "trend", "insight", "kpi"
        ],
        "legal_agent": [
            "legal", "compliance", "contract", "terms", "privacy", "gdpr",
            "policy", "regulation", "agreement", "clause", "license"
        ],
        "content_agent": [
            "write", "content", "blog", "article", "copy", "marketing",
            "social", "seo", "post", "email", "campaign"
        ],
        "security_agent": [
            "security", "authentication", "authorization", "encrypt", "vulnerability",
            "attack", "protect", "firewall", "ssl", "threat", "password"
        ],
        "darwin_agent": [
            "improve", "optimize", "refactor", "evolve", "enhance", "code quality",
            "performance", "benchmark", "iterate", "self-improvement"
        ],
        "deploy_agent": [
            "deploy", "build", "ci/cd", "docker", "kubernetes", "container",
            "pipeline", "release", "production", "infrastructure"
        ],
        "spec_agent": [
            "specification", "requirement", "design", "architecture", "api",
            "interface", "schema", "model", "definition", "document"
        ],
        "reflection_agent": [
            "review", "reflect", "evaluate", "critique", "feedback",
            "retrospective", "lesson", "learn", "assess"
        ],
        "builder_agent": [
            "build", "create", "develop", "implement", "code", "function",
            "class", "module", "component", "feature"
        ],
        "orchestrator": [
            "orchestrate", "coordinate", "manage", "delegate", "route",
            "plan", "decompose", "task", "workflow", "schedule"
        ],
    }

    def __init__(self, output_dir: str = "/home/genesis/genesis-rebuild/data/agent_flan"):
        self.output_dir = output_dir
        self.dataset = None
        self.analysis_results = {}

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

    def load_dataset(self) -> None:
        """Load Agent-FLAN dataset from HuggingFace"""
        print("Loading Agent-FLAN dataset from HuggingFace...")

        # List of known splits (some may have schema issues)
        known_splits = [
            "agent_instruct_react",
            "agent_instruct_tflan",
            "toolbench_instruct_j1s1_3k",
            "toolbench_negative",
            "toolbench_react_10p",
            "toolbench_tflan_60p_r10r5u7",
            "toolbench_tflan_cot_30p",
        ]

        self.dataset = {}
        loaded_splits = []
        failed_splits = []

        for split_name in known_splits:
            try:
                print(f"  Loading {split_name}...", end=" ")
                split_data = load_dataset("internlm/Agent-FLAN", split=split_name)
                self.dataset[split_name] = split_data
                loaded_splits.append(split_name)
                print(f"✓ ({len(split_data):,} examples)")
            except Exception as e:
                failed_splits.append((split_name, str(e)))
                print(f"✗ Schema error, skipping")

        print(f"\n✓ Successfully loaded {len(loaded_splits)} splits")
        if failed_splits:
            print(f"⚠ Skipped {len(failed_splits)} splits due to schema issues:")
            for split_name, error in failed_splits:
                print(f"    - {split_name}")

    def analyze_splits(self) -> Dict[str, Any]:
        """Analyze all dataset splits"""
        print("\n=== DATASET SPLITS ANALYSIS ===")

        split_stats = {}
        total_examples = 0

        for split_name in self.dataset.keys():
            split_data = self.dataset[split_name]
            num_examples = len(split_data)
            total_examples += num_examples

            # Sample first example for structure analysis
            sample = split_data[0] if num_examples > 0 else None

            split_stats[split_name] = {
                "num_examples": num_examples,
                "sample_keys": list(sample.keys()) if sample else [],
                "sample_structure": self._analyze_structure(sample) if sample else {}
            }

            print(f"\n{split_name}:")
            print(f"  Examples: {num_examples:,}")
            print(f"  Keys: {split_stats[split_name]['sample_keys']}")

        print(f"\nTotal examples across all splits: {total_examples:,}")

        self.analysis_results["splits"] = split_stats
        self.analysis_results["total_examples"] = total_examples

        return split_stats

    def _analyze_structure(self, example: Dict) -> Dict[str, Any]:
        """Analyze structure of a single example"""
        structure = {}

        if "conversations" in example:
            convs = example["conversations"]
            structure["num_turns"] = len(convs)
            structure["roles"] = [turn.get("role", "unknown") for turn in convs]
            structure["avg_content_length"] = sum(
                len(turn.get("content", "")) for turn in convs
            ) / len(convs) if convs else 0

        return structure

    def categorize_by_agent_type(self) -> Dict[str, List[Dict]]:
        """Categorize examples by Genesis agent type"""
        print("\n=== CATEGORIZING BY AGENT TYPE ===")

        categorized = defaultdict(list)
        uncategorized = []

        for split_name in self.dataset.keys():
            split_data = self.dataset[split_name]

            for idx, example in enumerate(split_data):
                # Extract text content
                text_content = self._extract_text(example)

                # Categorize by keywords
                matched_agents = self._match_agent_types(text_content)

                example_data = {
                    "split": split_name,
                    "index": idx,
                    "example": example,
                    "text_length": len(text_content),
                    "matched_agents": matched_agents
                }

                if matched_agents:
                    for agent_type in matched_agents:
                        categorized[agent_type].append(example_data)
                else:
                    uncategorized.append(example_data)

        # Print statistics
        print("\nCategorization Results:")
        for agent_type in sorted(categorized.keys()):
            count = len(categorized[agent_type])
            print(f"  {agent_type}: {count:,} examples")

        print(f"\n  uncategorized: {len(uncategorized):,} examples")

        self.analysis_results["categorized"] = {
            k: len(v) for k, v in categorized.items()
        }
        self.analysis_results["uncategorized_count"] = len(uncategorized)

        return dict(categorized)

    def _extract_text(self, example: Dict) -> str:
        """Extract all text content from example"""
        text_parts = []

        if "conversations" in example:
            for turn in example["conversations"]:
                content = turn.get("content", "")
                text_parts.append(content)
        elif "text" in example:
            text_parts.append(example["text"])
        elif "content" in example:
            text_parts.append(example["content"])

        return " ".join(text_parts).lower()

    def _match_agent_types(self, text: str) -> List[str]:
        """Match text to Genesis agent types using keywords"""
        matched = []

        for agent_type, keywords in self.AGENT_KEYWORDS.items():
            # Count keyword matches
            matches = sum(1 for keyword in keywords if keyword in text)

            # Require at least 2 keyword matches for assignment
            if matches >= 2:
                matched.append(agent_type)

        return matched

    def extract_genesis_relevant_subset(
        self,
        max_per_agent: int = 1000
    ) -> Dict[str, List[Dict]]:
        """Extract most relevant examples for Genesis agents"""
        print(f"\n=== EXTRACTING GENESIS-RELEVANT SUBSET (max {max_per_agent} per agent) ===")

        categorized = self.categorize_by_agent_type()

        relevant_subset = {}
        total_relevant = 0

        for agent_type, examples in categorized.items():
            # Sort by text length (prefer more detailed examples)
            sorted_examples = sorted(
                examples,
                key=lambda x: x["text_length"],
                reverse=True
            )

            # Take top N most detailed examples
            subset = sorted_examples[:max_per_agent]
            relevant_subset[agent_type] = subset
            total_relevant += len(subset)

            print(f"  {agent_type}: {len(subset):,} examples selected (from {len(examples):,})")

        print(f"\nTotal relevant examples: {total_relevant:,}")

        self.analysis_results["relevant_subset_size"] = total_relevant

        return relevant_subset

    def analyze_instruction_types(self) -> Dict[str, int]:
        """Analyze types of instructions in dataset"""
        print("\n=== ANALYZING INSTRUCTION TYPES ===")

        instruction_patterns = {
            "search": ["search", "find", "lookup", "query"],
            "click": ["click", "select", "choose"],
            "navigation": ["go to", "navigate", "visit", "open"],
            "extraction": ["extract", "get", "retrieve", "fetch"],
            "reasoning": ["think", "reason", "analyze", "consider"],
            "planning": ["plan", "decompose", "break down", "steps"],
            "tool_use": ["use tool", "call function", "api", "tool"],
            "code": ["code", "function", "class", "implement"],
        }

        instruction_counts = defaultdict(int)

        for split_name in self.dataset.keys():
            split_data = self.dataset[split_name]

            for example in split_data:
                text = self._extract_text(example)

                for instr_type, patterns in instruction_patterns.items():
                    if any(pattern in text for pattern in patterns):
                        instruction_counts[instr_type] += 1

        # Print results
        print("\nInstruction Type Distribution:")
        for instr_type, count in sorted(
            instruction_counts.items(),
            key=lambda x: x[1],
            reverse=True
        ):
            percentage = (count / self.analysis_results["total_examples"]) * 100
            print(f"  {instr_type}: {count:,} ({percentage:.1f}%)")

        self.analysis_results["instruction_types"] = dict(instruction_counts)

        return dict(instruction_counts)

    def save_analysis_results(self) -> None:
        """Save analysis results to JSON"""
        output_path = os.path.join(self.output_dir, "analysis_results.json")

        with open(output_path, "w") as f:
            json.dump(self.analysis_results, f, indent=2)

        print(f"\n✓ Analysis results saved to: {output_path}")

    def generate_summary_report(self) -> str:
        """Generate human-readable summary report"""
        report = []
        report.append("=" * 80)
        report.append("AGENT-FLAN DATASET ANALYSIS SUMMARY")
        report.append("=" * 80)
        report.append("")

        # Dataset overview
        report.append("DATASET OVERVIEW:")
        report.append(f"  Total Examples: {self.analysis_results.get('total_examples', 0):,}")
        report.append(f"  Number of Splits: {len(self.analysis_results.get('splits', {}))}")
        report.append("")

        # Split details
        report.append("SPLITS:")
        for split_name, stats in self.analysis_results.get("splits", {}).items():
            report.append(f"  {split_name}: {stats['num_examples']:,} examples")
        report.append("")

        # Categorization
        report.append("GENESIS AGENT CATEGORIZATION:")
        categorized = self.analysis_results.get("categorized", {})
        for agent_type, count in sorted(categorized.items(), key=lambda x: x[1], reverse=True):
            report.append(f"  {agent_type}: {count:,} examples")
        report.append(f"  uncategorized: {self.analysis_results.get('uncategorized_count', 0):,}")
        report.append("")

        # Relevant subset
        report.append("GENESIS-RELEVANT SUBSET:")
        report.append(f"  Total Selected: {self.analysis_results.get('relevant_subset_size', 0):,}")
        report.append("")

        # Instruction types
        report.append("INSTRUCTION TYPE DISTRIBUTION:")
        instr_types = self.analysis_results.get("instruction_types", {})
        for instr_type, count in sorted(instr_types.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / self.analysis_results.get("total_examples", 1)) * 100
            report.append(f"  {instr_type}: {count:,} ({percentage:.1f}%)")
        report.append("")

        report.append("=" * 80)

        return "\n".join(report)

    def run_full_analysis(self) -> None:
        """Run complete analysis pipeline"""
        print("\n" + "=" * 80)
        print("AGENT-FLAN DATASET ANALYSIS")
        print("=" * 80)

        # Load dataset
        self.load_dataset()

        # Run analyses
        self.analyze_splits()
        self.analyze_instruction_types()
        self.extract_genesis_relevant_subset(max_per_agent=1000)

        # Save results
        self.save_analysis_results()

        # Generate and print report
        report = self.generate_summary_report()
        print("\n" + report)

        # Save report
        report_path = os.path.join(self.output_dir, "analysis_summary.txt")
        with open(report_path, "w") as f:
            f.write(report)

        print(f"\n✓ Summary report saved to: {report_path}")


def main():
    """Main execution"""
    analyzer = AgentFLANAnalyzer()
    analyzer.run_full_analysis()


if __name__ == "__main__":
    main()
