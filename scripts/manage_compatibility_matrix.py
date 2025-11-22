#!/usr/bin/env python3
"""
Compatibility Matrix Manager

Loads, validates, and visualizes the 15×15 cross-agent learning compatibility matrix.
Provides query interface for compatibility scores and similar agent discovery.

Usage:
    # Load and validate matrix
    python scripts/manage_compatibility_matrix.py --validate

    # Generate heatmap visualization
    python scripts/manage_compatibility_matrix.py --visualize

    # Query compatibility score
    python scripts/manage_compatibility_matrix.py --query qa_agent support_agent

    # Find similar agents
    python scripts/manage_compatibility_matrix.py --similar qa_agent --threshold 0.7

Dependencies:
    pip install pandas numpy matplotlib seaborn

Author: Cursor (AI Coding Agent)
Date: October 31, 2025
"""

import json
import re
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

try:
    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt
    import seaborn as sns
except ImportError as e:
    print(f"❌ Missing dependencies. Install with: pip install pandas numpy matplotlib seaborn")
    print(f"   Error: {e}")
    exit(1)


@dataclass
class CompatibilityMatrix:
    """15×15 cross-agent learning compatibility matrix"""
    matrix: pd.DataFrame
    agents: List[str]

    @classmethod
    def load_from_markdown(cls, md_file: Path) -> 'CompatibilityMatrix':
        """
        Load compatibility matrix from markdown file.

        Parses the markdown table from ADP_CROSS_AGENT_LEARNING_MATRIX.md
        """
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find the matrix table (look for markdown table with "Target ↓ / Source →")
        lines = content.split('\n')
        start_idx = None
        for i, line in enumerate(lines):
            if 'Target ↓ / Source →' in line or '| **Target ↓ / Source →**' in line:
                start_idx = i
                break

        if start_idx is None:
            raise ValueError("Could not find compatibility matrix table in markdown")

        # Parse table rows (skip header separator line)
        matrix_data = {}
        agents = []

        # Get header row (column names)
        header_line = lines[start_idx + 1] if start_idx + 1 < len(lines) else ''
        if '|' in header_line:
            headers = [cell.strip() for cell in header_line.split('|')[1:-1]]
            # Remove empty strings and formatting
            headers = [h for h in headers if h and not h.startswith('**')]
            agents = [h.strip() for h in headers if h and h.strip()]

        # Parse data rows
        for i in range(start_idx + 3, min(start_idx + 20, len(lines))):
            line = lines[i]
            if not line.strip() or not line.startswith('|'):
                break

            cells = [cell.strip() for cell in line.split('|')[1:-1]]
            if len(cells) < 2:
                continue

            # First cell is target agent (row name)
            target_agent = cells[0].strip()
            # Remove markdown formatting
            target_agent = re.sub(r'\*\*', '', target_agent).strip()

            if not target_agent or target_agent == 'Target ↓ / Source →':
                continue

            # Parse scores
            scores = {}
            for j, score_str in enumerate(cells[1:], start=0):
                if j >= len(agents):
                    break

                source_agent = agents[j]
                # Extract numeric value (handle bold formatting)
                score_str = re.sub(r'\*\*', '', score_str).strip()
                try:
                    score = float(score_str)
                    scores[source_agent] = score
                except ValueError:
                    continue

            if scores:
                matrix_data[target_agent] = scores

        # Create DataFrame
        if not agents:
            raise ValueError("Could not parse agent names from markdown table")

        # Ensure all agents are in both rows and columns
        all_agents = sorted(set(list(matrix_data.keys()) + agents))
        matrix_df = pd.DataFrame(index=all_agents, columns=all_agents, dtype=float)

        # Fill matrix
        for target_agent, scores in matrix_data.items():
            for source_agent, score in scores.items():
                matrix_df.loc[target_agent, source_agent] = score

        # Fill diagonal with 1.0 if missing
        for agent in all_agents:
            if pd.isna(matrix_df.loc[agent, agent]):
                matrix_df.loc[agent, agent] = 1.0

        return cls(matrix=matrix_df, agents=all_agents)

    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validate matrix integrity.

        Returns:
            (is_valid, list_of_errors)
        """
        errors = []

        # Check diagonal = 1.0
        for agent in self.agents:
            diagonal_value = self.matrix.loc[agent, agent]
            if pd.isna(diagonal_value):
                errors.append(f"Missing diagonal value for {agent}")
            elif abs(diagonal_value - 1.0) > 0.01:
                errors.append(f"Diagonal value for {agent} is {diagonal_value}, expected 1.0")

        # Check all values in [0.0, 1.0]
        for target_agent in self.agents:
            for source_agent in self.agents:
                value = self.matrix.loc[target_agent, source_agent]
                if pd.isna(value):
                    errors.append(f"Missing value: {target_agent} ← {source_agent}")
                elif value < 0.0 or value > 1.0:
                    errors.append(f"Invalid value {value} for {target_agent} ← {source_agent} (must be [0.0, 1.0])")

        # Check no missing cells
        missing_count = self.matrix.isna().sum().sum()
        if missing_count > 0:
            errors.append(f"Found {missing_count} missing values in matrix")

        return len(errors) == 0, errors

    def get_weight(self, target_agent: str, source_agent: str) -> float:
        """Get compatibility weight between two agents"""
        if target_agent not in self.agents:
            raise ValueError(f"Unknown target agent: {target_agent}")
        if source_agent not in self.agents:
            raise ValueError(f"Unknown source agent: {source_agent}")

        return float(self.matrix.loc[target_agent, source_agent])

    def find_similar(self, target_agent: str, threshold: float = 0.6) -> List[Tuple[str, float]]:
        """
        Find agents with high compatibility to target agent.

        Returns:
            List of (agent_name, compatibility_score) tuples, sorted by score descending
        """
        if target_agent not in self.agents:
            raise ValueError(f"Unknown target agent: {target_agent}")

        scores = self.matrix.loc[target_agent].to_dict()
        # Filter by threshold and exclude self
        similar = [
            (agent, score)
            for agent, score in scores.items()
            if agent != target_agent and score >= threshold
        ]
        similar.sort(key=lambda x: -x[1])  # Sort descending by score

        return similar

    def visualize(self, output_file: Path):
        """Generate heatmap visualization"""
        plt.figure(figsize=(14, 12))
        sns.heatmap(
            self.matrix.astype(float),
            annot=True,
            fmt='.1f',
            cmap='YlOrRd',
            cbar_kws={'label': 'Compatibility Score'},
            square=True,
            linewidths=0.5,
            linecolor='gray'
        )
        plt.title('15×15 Cross-Agent Learning Compatibility Matrix', fontsize=16, pad=20)
        plt.xlabel('Source Agent (whose examples are used)', fontsize=12)
        plt.ylabel('Target Agent (who is learning)', fontsize=12)
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"✅ Heatmap saved to {output_file}")

    def get_stats(self) -> Dict:
        """Get matrix statistics"""
        values = self.matrix.values.flatten()
        values = values[~pd.isna(values)]

        return {
            'total_cells': len(self.agents) ** 2,
            'non_zero': np.sum(values > 0),
            'high_compatibility': np.sum(values >= 0.7),
            'medium_compatibility': np.sum((values >= 0.4) & (values < 0.7)),
            'low_compatibility': np.sum(values < 0.4),
            'mean_score': float(np.mean(values)),
            'std_score': float(np.std(values)),
            'min_score': float(np.min(values)),
            'max_score': float(np.max(values)),
        }

    def save_json(self, output_file: Path):
        """Save matrix as JSON for programmatic access"""
        matrix_dict = self.matrix.to_dict()
        output_data = {
            'agents': self.agents,
            'matrix': matrix_dict
        }
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        print(f"✅ Matrix saved to {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Manage compatibility matrix")
    parser.add_argument('--matrix-file', type=Path, default=Path('docs/ADP_CROSS_AGENT_LEARNING_MATRIX.md'),
                       help='Path to markdown file with matrix')
    parser.add_argument('--validate', action='store_true', help='Validate matrix integrity')
    parser.add_argument('--visualize', action='store_true', help='Generate heatmap visualization')
    parser.add_argument('--query', nargs=2, metavar=('TARGET', 'SOURCE'),
                       help='Query compatibility score between two agents')
    parser.add_argument('--similar', type=str, metavar='AGENT',
                       help='Find similar agents (high compatibility)')
    parser.add_argument('--threshold', type=float, default=0.6,
                       help='Threshold for --similar (default: 0.6)')
    parser.add_argument('--output-dir', type=Path, default=Path('reports'),
                       help='Output directory for visualizations')
    parser.add_argument('--save-json', type=Path, metavar='FILE',
                       help='Save matrix as JSON file')

    args = parser.parse_args()

    # Load matrix
    print(f"Loading compatibility matrix from {args.matrix_file}...")
    try:
        matrix = CompatibilityMatrix.load_from_markdown(args.matrix_file)
        print(f"✅ Loaded {len(matrix.agents)}×{len(matrix.agents)} matrix")
    except Exception as e:
        print(f"❌ Error loading matrix: {e}")
        return 1

    # Validate
    if args.validate:
        print("\nValidating matrix...")
        is_valid, errors = matrix.validate()
        if is_valid:
            print("✅ Matrix validation PASSED")
        else:
            print(f"❌ Matrix validation FAILED ({len(errors)} errors):")
            for error in errors[:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(errors) > 10:
                print(f"  ... and {len(errors) - 10} more errors")
            return 1

    # Query compatibility
    if args.query:
        target, source = args.query
        try:
            weight = matrix.get_weight(target, source)
            print(f"\nCompatibility: {target} ← {source}")
            print(f"  Score: {weight:.2f}")
            if weight >= 0.7:
                print(f"  Interpretation: High compatibility (≥0.7)")
            elif weight >= 0.4:
                print(f"  Interpretation: Medium compatibility (0.4-0.7)")
            else:
                print(f"  Interpretation: Low compatibility (<0.4)")
        except ValueError as e:
            print(f"❌ Error: {e}")
            return 1

    # Find similar agents
    if args.similar:
        try:
            similar = matrix.find_similar(args.similar, threshold=args.threshold)
            print(f"\nAgents similar to {args.similar} (threshold ≥{args.threshold}):")
            if similar:
                for agent, score in similar:
                    print(f"  {agent:20s} {score:.2f}")
            else:
                print(f"  No agents found above threshold {args.threshold}")
        except ValueError as e:
            print(f"❌ Error: {e}")
            return 1

    # Visualize
    if args.visualize:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        output_file = args.output_dir / 'compatibility_matrix_heatmap.png'
        print(f"\nGenerating heatmap visualization...")
        matrix.visualize(output_file)

    # Save JSON
    if args.save_json:
        print(f"\nSaving matrix as JSON...")
        matrix.save_json(args.save_json)

    # Print stats if no specific action
    if not any([args.validate, args.visualize, args.query, args.similar, args.save_json]):
        print("\nMatrix Statistics:")
        stats = matrix.get_stats()
        print(f"  Total cells:          {stats['total_cells']}")
        print(f"  High compatibility:    {stats['high_compatibility']} (≥0.7)")
        print(f"  Medium compatibility:  {stats['medium_compatibility']} (0.4-0.7)")
        print(f"  Low compatibility:    {stats['low_compatibility']} (<0.4)")
        print(f"  Mean score:           {stats['mean_score']:.3f}")
        print(f"  Std deviation:        {stats['std_score']:.3f}")
        print(f"  Score range:          [{stats['min_score']:.2f}, {stats['max_score']:.2f}]")

    return 0


if __name__ == '__main__':
    exit(main())
