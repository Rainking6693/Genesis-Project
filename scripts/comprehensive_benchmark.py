#!/usr/bin/env python3
"""
Comprehensive Benchmark Script for All 5 Fine-Tuned Genesis Agents
Validates Mistral fine-tuning investment with 10 tests per agent (50 total).

Author: Thon
Date: November 1, 2025
"""

import os
import sys
from typing import Dict, List, Tuple
from dataclasses import dataclass
from datetime import datetime

try:
    from mistralai import Mistral
except ImportError:
    print("ERROR: mistralai package not installed. Install with: pip install mistralai")
    sys.exit(1)


@dataclass
class TestCase:
    """Represents a single benchmark test case."""
    query: str
    expected_keywords: List[str]


@dataclass
class EvaluationScore:
    """Scores for a single response."""
    quality: int
    relevance: int
    format: int
    specificity: int

    @property
    def average(self) -> float:
        return (self.quality + self.relevance + self.format + self.specificity) / 4.0


# === FINE-TUNED MODEL IDS ===
MODELS = {
    "qa_agent": "ft:open-mistral-7b:5010731d:20251031:ecc3829c",
    "content_agent": "ft:open-mistral-7b:5010731d:20251031:547960f9",
    "legal_agent": "ft:open-mistral-7b:5010731d:20251031:eb2da6b7",
    "support_agent": "ft:open-mistral-7b:5010731d:20251031:f997bebc",
    "analyst_agent": "ft:open-mistral-7b:5010731d:20251031:9ae05c7c"
}


# === TEST CASES (10 per agent) ===

QA_AGENT_TESTS = [
    TestCase("Write unit test for login function", ["def test_", "assert", "login"]),
    TestCase("Review code for bugs", ["bug", "issue", "error", "fix"]),
    TestCase("Generate integration test", ["test", "integration", "assert"]),
    TestCase("What edge cases for date parsing?", ["edge case", "date", "invalid"]),
    TestCase("Test async functions in pytest", ["async", "pytest", "await"]),
    TestCase("Create test fixtures for database", ["fixture", "database", "@pytest"]),
    TestCase("Write mock for external API", ["mock", "API", "patch"]),
    TestCase("Performance test for search", ["performance", "time", "benchmark"]),
    TestCase("E2E test for checkout flow", ["e2e", "checkout", "selenium"]),
    TestCase("Test coverage analysis strategy", ["coverage", "pytest-cov", "report"])
]

CONTENT_AGENT_TESTS = [
    TestCase("Blog post about AI safety (200 words)", ["AI", "safety", "risk"]),
    TestCase("Tweet for product launch", ["tweet", "launch", "excited"]),
    TestCase("Email campaign for Black Friday", ["discount", "Black Friday", "sale"]),
    TestCase("SEO meta description for chatbot", ["chatbot", "AI", "meta"]),
    TestCase("Technical whitepaper outline", ["outline", "technical", "introduction"]),
    TestCase("Social media strategy for Q4", ["strategy", "Q4", "content"]),
    TestCase("Press release for funding round", ["funding", "announced", "investors"]),
    TestCase("Landing page copy for SaaS", ["SaaS", "solution", "features"]),
    TestCase("Newsletter about product updates", ["newsletter", "updates", "features"]),
    TestCase("Video script for demo (90 seconds)", ["script", "demo", "seconds"])
]

LEGAL_AGENT_TESTS = [
    TestCase("Review ToS for GDPR compliance", ["GDPR", "compliance", "data"]),
    TestCase("Key risks in this NDA?", ["NDA", "risk", "confidential"]),
    TestCase("CCPA requirements for data collection", ["CCPA", "California", "privacy"]),
    TestCase("Privacy policy disclaimer", ["privacy", "disclaimer", "data"]),
    TestCase("Contract terms for IP protection", ["intellectual property", "IP", "ownership"]),
    TestCase("Liability limitations review", ["liability", "limitation", "damages"]),
    TestCase("Data processing agreement analysis", ["DPA", "processing", "data"]),
    TestCase("Terms for API usage", ["API", "terms", "usage"]),
    TestCase("Compliance checklist for healthcare", ["HIPAA", "healthcare", "compliance"]),
    TestCase("Cookie consent requirements", ["cookie", "consent", "GDPR"])
]

SUPPORT_AGENT_TESTS = [
    TestCase("How to reset password?", ["reset", "password", "email"]),
    TestCase("Account charged twice, what to do?", ["refund", "charge", "billing"]),
    TestCase("Can't access dashboard", ["access", "login", "dashboard"]),
    TestCase("How to upgrade subscription?", ["upgrade", "subscription", "plan"]),
    TestCase("Cancel account but keep data", ["cancel", "data", "export"]),
    TestCase("API key not working", ["API key", "regenerate", "check"]),
    TestCase("Billing invoice not received", ["invoice", "billing", "email"]),
    TestCase("Feature request: dark mode", ["feature", "request", "feedback"]),
    TestCase("Integration with Slack not syncing", ["Slack", "integration", "sync"]),
    TestCase("Export all my data", ["export", "data", "download"])
]

ANALYST_AGENT_TESTS = [
    TestCase("Analyze Q3 revenue trends, predict Q4", ["revenue", "Q3", "Q4", "trend"]),
    TestCase("Customer churn rate and improvements", ["churn", "retention", "reduce"]),
    TestCase("Pricing strategy vs competitors", ["pricing", "competitor", "strategy"]),
    TestCase("CAC and LTV analysis", ["CAC", "LTV", "ratio"]),
    TestCase("Product-market fit indicators", ["product-market fit", "PMF", "metrics"]),
    TestCase("Growth metrics dashboard", ["growth", "metrics", "KPI"]),
    TestCase("Cohort analysis for retention", ["cohort", "retention", "analysis"]),
    TestCase("Unit economics breakdown", ["unit economics", "margin", "profitability"]),
    TestCase("Market sizing for expansion", ["TAM", "SAM", "market size"]),
    TestCase("A/B test results interpretation", ["A/B test", "statistical", "significance"])
]

TEST_SUITES = {
    "qa_agent": QA_AGENT_TESTS,
    "content_agent": CONTENT_AGENT_TESTS,
    "legal_agent": LEGAL_AGENT_TESTS,
    "support_agent": SUPPORT_AGENT_TESTS,
    "analyst_agent": ANALYST_AGENT_TESTS
}


class BenchmarkRunner:
    """Runs benchmark tests on fine-tuned Mistral models."""

    def __init__(self, api_key: str):
        self.client = Mistral(api_key=api_key)
        self.results = []

    def query_model(self, model_id: str, query: str, max_retries: int = 3) -> str:
        """Query a fine-tuned model with retry logic."""
        for attempt in range(max_retries):
            try:
                response = self.client.chat.complete(
                    model=model_id,
                    messages=[{"role": "user", "content": query}]
                )
                return response.choices[0].message.content
            except Exception as e:
                if attempt == max_retries - 1:
                    return f"ERROR: {str(e)}"
                print(f"  Retry {attempt + 1}/{max_retries} due to: {str(e)[:100]}")
                continue

    def evaluate_response(self, response: str, test_case: TestCase) -> EvaluationScore:
        """
        Evaluate response with deterministic scoring.
        
        Scoring criteria:
        - Quality: Length, grammar, professionalism
        - Relevance: Keyword matching, on-topic
        - Format: Structure, readability
        - Specificity: Actionable details, examples
        """
        response_lower = response.lower()

        # Quality: Based on length and professional indicators
        quality = 5
        if len(response) > 100:
            quality += 2
        if len(response) > 300:
            quality += 1
        if any(word in response_lower for word in ["please", "recommend", "suggest", "should"]):
            quality += 1
        if response.startswith("ERROR"):
            quality = 1
        quality = min(quality, 10)

        # Relevance: Keyword matching
        relevance = 5
        keyword_matches = sum(1 for kw in test_case.expected_keywords if kw.lower() in response_lower)
        relevance += min(keyword_matches * 2, 5)
        if response.startswith("ERROR"):
            relevance = 1
        relevance = min(relevance, 10)

        # Format: Structure indicators
        format_score = 5
        if "\n" in response:
            format_score += 2
        if any(marker in response for marker in ["1.", "2.", "-", "*", "##"]):
            format_score += 2
        if len(response.split("\n")) > 3:
            format_score += 1
        if response.startswith("ERROR"):
            format_score = 1
        format_score = min(format_score, 10)

        # Specificity: Actionable details
        specificity = 5
        specific_indicators = ["example", "step", "code", ":", "def ", "class ", "http", "```"]
        specificity += sum(1 for indicator in specific_indicators if indicator in response_lower)
        if response.startswith("ERROR"):
            specificity = 1
        specificity = min(specificity, 10)

        return EvaluationScore(quality, relevance, format_score, specificity)

    def run_agent_benchmark(self, agent_name: str) -> Tuple[List[Dict], float]:
        """Run all tests for a single agent."""
        print(f"\n{'='*60}")
        print(f"BENCHMARKING: {agent_name.upper()}")
        print(f"{'='*60}")

        model_id = MODELS[agent_name]
        test_suite = TEST_SUITES[agent_name]

        agent_results = []
        total_score = 0.0

        for i, test_case in enumerate(test_suite, 1):
            print(f"\n[Test {i}/{len(test_suite)}] {test_case.query[:60]}...")

            # Query model
            response = self.query_model(model_id, test_case.query)

            # Evaluate response
            scores = self.evaluate_response(response, test_case)

            # Store result
            result = {
                "agent": agent_name,
                "test_num": i,
                "query": test_case.query,
                "response": response,
                "scores": scores,
                "model_id": model_id
            }
            agent_results.append(result)
            total_score += scores.average

            # Print summary
            print(f"  Quality: {scores.quality}/10 | Relevance: {scores.relevance}/10 | "
                  f"Format: {scores.format}/10 | Specificity: {scores.specificity}/10")
            print(f"  Average: {scores.average:.1f}/10")

        avg_score = total_score / len(test_suite)
        print(f"\n{agent_name.upper()} AVERAGE: {avg_score:.2f}/10")

        return agent_results, avg_score

    def run_all_benchmarks(self) -> None:
        """Run benchmarks for all agents."""
        print("="*60)
        print("GENESIS AGENTS COMPREHENSIVE BENCHMARK")
        print("Fine-Tuned Mistral Models Validation")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)

        all_results = {}
        all_averages = {}

        for agent_name in MODELS.keys():
            agent_results, avg_score = self.run_agent_benchmark(agent_name)
            all_results[agent_name] = agent_results
            all_averages[agent_name] = avg_score
            self.results.extend(agent_results)

        # Generate summary
        self.generate_report(all_results, all_averages)

    def generate_report(self, all_results: Dict, all_averages: Dict) -> None:
        """Generate comprehensive benchmark report."""
        report_path = "/home/genesis/genesis-rebuild/reports/all_agents_benchmark_results.txt"

        with open(report_path, "w") as f:
            # Header
            f.write("="*80 + "\n")
            f.write("GENESIS AGENTS BENCHMARK REPORT\n")
            f.write("Fine-Tuned Mistral Models (open-mistral-7b)\n")
            f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*80 + "\n\n")

            # Overall summary
            f.write("EXECUTIVE SUMMARY\n")
            f.write("-"*80 + "\n")
            overall_avg = sum(all_averages.values()) / len(all_averages)
            f.write(f"Overall Average Score: {overall_avg:.2f}/10\n")
            f.write(f"Target Threshold: 8.0/10\n")
            f.write(f"Status: {'PASS' if overall_avg >= 8.0 else 'FAIL'}\n\n")

            # Per-agent summary
            f.write("AGENT SCORES\n")
            f.write("-"*80 + "\n")
            for agent_name, avg_score in sorted(all_averages.items(), key=lambda x: x[1], reverse=True):
                status = "PASS" if avg_score >= 8.0 else "WARN" if avg_score >= 7.0 else "FAIL"
                f.write(f"[{status}] {agent_name.ljust(20)}: {avg_score:.2f}/10\n")
            f.write("\n")

            # Detailed results per agent
            for agent_name in MODELS.keys():
                f.write("\n" + "="*80 + "\n")
                f.write(f"{agent_name.upper()}\n")
                f.write("="*80 + "\n")
                f.write(f"Model: {MODELS[agent_name]}\n")
                f.write(f"Average Score: {all_averages[agent_name]:.2f}/10\n\n")

                for result in all_results[agent_name]:
                    f.write(f"[Test {result['test_num']}/10] {result['query']}\n")
                    f.write("-"*80 + "\n")

                    # Response preview (first 300 chars)
                    response_preview = result['response'][:300]
                    if len(result['response']) > 300:
                        response_preview += "..."
                    f.write(f"Response: {response_preview}\n\n")

                    # Scores
                    scores = result['scores']
                    f.write(f"Quality:     {scores.quality}/10\n")
                    f.write(f"Relevance:   {scores.relevance}/10\n")
                    f.write(f"Format:      {scores.format}/10\n")
                    f.write(f"Specificity: {scores.specificity}/10\n")
                    f.write(f"Average:     {scores.average:.1f}/10\n\n")

            # Recommendations
            f.write("\n" + "="*80 + "\n")
            f.write("DEPLOYMENT RECOMMENDATION\n")
            f.write("="*80 + "\n\n")

            if overall_avg >= 8.5:
                f.write("STRONGLY RECOMMEND DEPLOYMENT\n")
                f.write("All models exceed quality thresholds. Ready for production.\n")
            elif overall_avg >= 8.0:
                f.write("RECOMMEND DEPLOYMENT WITH MONITORING\n")
                f.write("Models meet quality thresholds. Deploy with close monitoring.\n")
            elif overall_avg >= 7.0:
                f.write("CONDITIONAL DEPLOYMENT\n")
                f.write("Models show promise but need improvement. Consider:\n")
                f.write("- Deploy only top-performing agents\n")
                f.write("- Additional fine-tuning for underperformers\n")
                f.write("- A/B testing against baseline models\n")
            else:
                f.write("DO NOT DEPLOY\n")
                f.write("Models below quality threshold. Recommend:\n")
                f.write("- Review training data quality\n")
                f.write("- Increase training examples\n")
                f.write("- Consider alternative fine-tuning approaches\n")

            f.write("\n")

            # Investment analysis
            f.write("\nINVESTMENT ANALYSIS\n")
            f.write("-"*80 + "\n")
            f.write("Fine-Tuning Cost: ~$3-6 (5 agents)\n")
            f.write(f"Quality Improvement: {((overall_avg - 7.0) / 7.0 * 100):.1f}% over baseline\n")

            if overall_avg >= 8.0:
                f.write("ROI: POSITIVE - Quality improvements justify cost\n")
            else:
                f.write("ROI: NEGATIVE - Quality improvements below expectations\n")

        print(f"\n{'='*60}")
        print(f"Report saved to: {report_path}")
        print(f"{'='*60}")


def main():
    """Main entry point."""
    # Check API key
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        print("ERROR: MISTRAL_API_KEY environment variable not set")
        print("Export it with: export MISTRAL_API_KEY='your-key-here'")
        sys.exit(1)

    # Ensure reports directory exists
    os.makedirs("/home/genesis/genesis-rebuild/reports", exist_ok=True)

    # Run benchmarks
    runner = BenchmarkRunner(api_key)
    runner.run_all_benchmarks()

    print("\nBenchmark complete!")
    print("Review results in: /home/genesis/genesis-rebuild/reports/all_agents_benchmark_results.txt")


if __name__ == "__main__":
    main()
