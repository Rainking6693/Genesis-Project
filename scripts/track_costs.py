#!/usr/bin/env python3
"""
Cost Tracking Script for Genesis Fine-Tuning & Inference

Tracks Mistral API usage and costs in real-time.
Logs to CSV for historical tracking and generates cost reports.

Usage:
    # Check current usage
    python3 scripts/track_costs.py

    # Generate cost report
    python3 scripts/track_costs.py --report

Author: Claude Code (Lead)
Date: November 1, 2025
"""

import os
import csv
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from dataclasses import dataclass, asdict

try:
    from mistralai import Mistral
    MISTRAL_AVAILABLE = True
except ImportError:
    MISTRAL_AVAILABLE = False


@dataclass
class CostEntry:
    """Single cost tracking entry"""
    timestamp: str
    agent: str
    operation: str  # fine-tuning, inference, etc.
    tokens_used: int
    cost_usd: float
    model_id: str
    notes: str = ""


class CostTracker:
    """Track and report on API costs"""

    def __init__(self, budget_usd: float = 30.0):
        self.budget_usd = budget_usd
        self.cost_file = Path("data/cost_tracking.csv")
        self.cost_file.parent.mkdir(parents=True, exist_ok=True)

        # Initialize CSV if it doesn't exist
        if not self.cost_file.exists():
            self._init_csv()

    def _init_csv(self):
        """Initialize CSV file with headers"""
        with open(self.cost_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['timestamp', 'agent', 'operation', 'tokens_used', 'cost_usd', 'model_id', 'notes'])

    def log_cost(self, entry: CostEntry):
        """Log a cost entry to CSV"""
        with open(self.cost_file, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                entry.timestamp,
                entry.agent,
                entry.operation,
                entry.tokens_used,
                entry.cost_usd,
                entry.model_id,
                entry.notes
            ])

    def get_total_spent(self) -> float:
        """Get total amount spent"""
        if not self.cost_file.exists():
            return 0.0

        total = 0.0
        with open(self.cost_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    total += float(row['cost_usd'])
                except (ValueError, KeyError):
                    continue

        return total

    def get_spending_by_agent(self) -> Dict[str, float]:
        """Get spending breakdown by agent"""
        if not self.cost_file.exists():
            return {}

        spending = {}
        with open(self.cost_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    agent = row['agent']
                    cost = float(row['cost_usd'])
                    spending[agent] = spending.get(agent, 0.0) + cost
                except (ValueError, KeyError):
                    continue

        return spending

    def get_spending_by_operation(self) -> Dict[str, float]:
        """Get spending breakdown by operation type"""
        if not self.cost_file.exists():
            return {}

        spending = {}
        with open(self.cost_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    operation = row['operation']
                    cost = float(row['cost_usd'])
                    spending[operation] = spending.get(operation, 0.0) + cost
                except (ValueError, KeyError):
                    continue

        return spending

    def check_mistral_jobs(self) -> List[Dict]:
        """Check Mistral API for fine-tuning job status"""
        if not MISTRAL_AVAILABLE:
            print("⚠️  mistralai package not installed")
            return []

        api_key = os.environ.get("MISTRAL_API_KEY")
        if not api_key:
            print("⚠️  MISTRAL_API_KEY not set")
            return []

        client = Mistral(api_key=api_key)

        try:
            jobs = client.fine_tuning.jobs.list()
            return [
                {
                    "job_id": job.id,
                    "status": job.status,
                    "model": getattr(job, 'fine_tuned_model', 'N/A'),
                    "created_at": getattr(job, 'created_at', 'N/A')
                }
                for job in jobs.data[:10]  # Last 10 jobs
            ]
        except Exception as e:
            print(f"⚠️  Error fetching Mistral jobs: {e}")
            return []

    def generate_report(self) -> str:
        """Generate cost report"""
        total_spent = self.get_total_spent()
        remaining = self.budget_usd - total_spent
        percent_used = (total_spent / self.budget_usd) * 100 if self.budget_usd > 0 else 0

        by_agent = self.get_spending_by_agent()
        by_operation = self.get_spending_by_operation()

        report = f"""# Cost Tracking Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

## Budget Status

- **Total Budget:** ${self.budget_usd:.2f}
- **Total Spent:** ${total_spent:.2f}
- **Remaining:** ${remaining:.2f}
- **Used:** {percent_used:.1f}%

"""

        # Alert level
        if percent_used >= 83:
            report += "🚨 **EMERGENCY:** Budget >83% used!\n\n"
        elif percent_used >= 50:
            report += "⚠️  **CRITICAL:** Budget >50% used!\n\n"
        elif percent_used >= 25:
            report += "⚡ **WARNING:** Budget >25% used\n\n"
        else:
            report += "✅ **HEALTHY:** Budget usage normal\n\n"

        report += "## Spending by Agent\n\n"
        report += "| Agent | Cost (USD) | % of Total |\n"
        report += "|-------|------------|------------|\n"
        for agent, cost in sorted(by_agent.items(), key=lambda x: x[1], reverse=True):
            pct = (cost / total_spent * 100) if total_spent > 0 else 0
            report += f"| {agent} | ${cost:.2f} | {pct:.1f}% |\n"

        report += "\n## Spending by Operation\n\n"
        report += "| Operation | Cost (USD) | % of Total |\n"
        report += "|-----------|------------|------------|\n"
        for operation, cost in sorted(by_operation.items(), key=lambda x: x[1], reverse=True):
            pct = (cost / total_spent * 100) if total_spent > 0 else 0
            report += f"| {operation} | ${cost:.2f} | {pct:.1f}% |\n"

        report += "\n## Recent Mistral Jobs\n\n"
        jobs = self.check_mistral_jobs()
        if jobs:
            report += "| Job ID (last 8 chars) | Status | Model ID (last 8 chars) |\n"
            report += "|----------------------|--------|-------------------------|\n"
            for job in jobs:
                job_id_short = str(job['job_id'])[-8:] if job['job_id'] != 'N/A' else 'N/A'
                model_short = str(job['model'])[-8:] if job['model'] != 'N/A' else 'N/A'
                report += f"| {job_id_short} | {job['status']} | {model_short} |\n"
        else:
            report += "*No recent jobs found or API unavailable*\n"

        report += f"\n---\n**Data source:** `{self.cost_file}`\n"

        return report


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Track Genesis API costs")
    parser.add_argument('--report', action='store_true', help='Generate cost report')
    parser.add_argument('--budget', type=float, default=30.0, help='Total budget in USD')
    parser.add_argument('--log', action='store_true', help='Log a manual cost entry')
    parser.add_argument('--agent', type=str, help='Agent name for manual log')
    parser.add_argument('--operation', type=str, help='Operation type for manual log')
    parser.add_argument('--cost', type=float, help='Cost in USD for manual log')

    args = parser.parse_args()

    tracker = CostTracker(budget_usd=args.budget)

    if args.log:
        if not all([args.agent, args.operation, args.cost]):
            print("Error: --agent, --operation, and --cost required for manual logging")
            return

        entry = CostEntry(
            timestamp=datetime.now().isoformat(),
            agent=args.agent,
            operation=args.operation,
            tokens_used=0,  # Unknown for manual entries
            cost_usd=args.cost,
            model_id="manual",
            notes="Manual entry"
        )
        tracker.log_cost(entry)
        print(f"✅ Logged ${args.cost:.2f} for {args.agent} ({args.operation})")

    elif args.report:
        report = tracker.generate_report()
        print(report)

        # Save to file
        report_file = Path("reports/cost_dashboard.md")
        report_file.parent.mkdir(parents=True, exist_ok=True)
        with open(report_file, 'w') as f:
            f.write(report)
        print(f"\n✅ Report saved to: {report_file}")

    else:
        # Quick status
        total_spent = tracker.get_total_spent()
        remaining = args.budget - total_spent
        percent_used = (total_spent / args.budget) * 100 if args.budget > 0 else 0

        print(f"💰 Budget Status:")
        print(f"   Total: ${args.budget:.2f}")
        print(f"   Spent: ${total_spent:.2f}")
        print(f"   Remaining: ${remaining:.2f}")
        print(f"   Used: {percent_used:.1f}%")

        if percent_used >= 83:
            print("\n🚨 EMERGENCY: Budget >83% used!")
        elif percent_used >= 50:
            print("\n⚠️  CRITICAL: Budget >50% used!")


if __name__ == "__main__":
    main()
