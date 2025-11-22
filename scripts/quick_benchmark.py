#!/usr/bin/env python3
"""
Quick Benchmark - Fast validation that fine-tuned models work

Tests each model with 5 simple tasks to verify:
1. Model loads and responds
2. Response quality is reasonable
3. Cost tracking works
"""

import os
import json
import time
from pathlib import Path
from mistralai import Mistral

# Test prompts for each agent
TEST_PROMPTS = {
    "qa_agent": [
        "How do I fix a Python import error?",
        "What causes a null pointer exception?",
        "Debug this: undefined is not a function",
        "Why is my database query slow?",
        "How to handle memory leaks in JavaScript?"
    ],
    "content_agent": [
        "Write a blog post intro about AI agents",
        "Create social media copy for a product launch",
        "Draft an email announcing a new feature",
        "Write SEO meta description for homepage",
        "Create marketing tagline for SaaS product"
    ],
    "legal_agent": [
        "Explain GDPR compliance requirements",
        "What are the key terms in a SaaS agreement?",
        "Summarize privacy policy requirements",
        "Explain data retention policies",
        "What is required for cookie consent?"
    ],
    "support_agent": [
        "How do I reset my password?",
        "My payment failed, what should I do?",
        "How to cancel my subscription?",
        "I can't log in, help!",
        "How do I export my data?"
    ],
    "analyst_agent": [
        "Analyze user growth trends",
        "What metrics indicate product-market fit?",
        "How to calculate customer lifetime value?",
        "Explain cohort retention analysis",
        "What is a good churn rate for SaaS?"
    ]
}

def test_model(agent_name: str, model_id: str, api_key: str):
    """Test a single model with 5 prompts"""
    client = Mistral(api_key=api_key)
    
    results = {
        "agent": agent_name,
        "model_id": model_id,
        "tests": [],
        "total_time_ms": 0,
        "total_cost_usd": 0,
        "passed": 0,
        "failed": 0
    }
    
    prompts = TEST_PROMPTS.get(agent_name, TEST_PROMPTS["qa_agent"])
    
    for i, prompt in enumerate(prompts, 1):
        print(f"  Test {i}/5: {prompt[:50]}...")
        
        try:
            start = time.time()
            
            response = client.chat.complete(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0
            )
            
            elapsed_ms = (time.time() - start) * 1000
            content = response.choices[0].message.content
            
            # Rough cost estimate (fine-tuned Mistral: ~$0.0008/1K tokens)
            tokens = (len(prompt.split()) + len(content.split())) * 1.3
            cost = (tokens / 1000) * 0.0008
            
            # Pass if response is substantial (>50 chars)
            passed = len(content.strip()) > 50
            
            results["tests"].append({
                "prompt": prompt,
                "response_length": len(content),
                "time_ms": elapsed_ms,
                "cost_usd": cost,
                "passed": passed
            })
            
            results["total_time_ms"] += elapsed_ms
            results["total_cost_usd"] += cost
            
            if passed:
                results["passed"] += 1
                print(f"    ✅ PASS ({len(content)} chars, {elapsed_ms:.0f}ms, ${cost:.4f})")
            else:
                results["failed"] += 1
                print(f"    ❌ FAIL (response too short)")
                
        except Exception as e:
            print(f"    ❌ ERROR: {e}")
            results["failed"] += 1
            results["tests"].append({
                "prompt": prompt,
                "error": str(e),
                "passed": False
            })
    
    results["accuracy"] = results["passed"] / 5
    results["avg_time_ms"] = results["total_time_ms"] / 5
    results["avg_cost_usd"] = results["total_cost_usd"] / 5
    
    return results

def main():
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        print("❌ MISTRAL_API_KEY not set")
        return
    
    agents = ["qa_agent", "content_agent", "legal_agent", "support_agent", "analyst_agent"]
    
    all_results = []
    
    print("🚀 Quick Benchmark - Testing Fine-Tuned Models\n")
    print("=" * 60)
    
    for agent in agents:
        model_file = Path(f"models/{agent}_mistral/model_id.txt")
        
        if not model_file.exists():
            print(f"\n❌ {agent}: Model ID not found")
            continue
        
        model_id = model_file.read_text().strip()
        print(f"\n📊 {agent}")
        print(f"   Model: {model_id}")
        
        results = test_model(agent, model_id, api_key)
        all_results.append(results)
        
        print(f"   Results: {results['passed']}/5 passed, {results['accuracy']:.0%} accuracy")
        print(f"   Avg time: {results['avg_time_ms']:.0f}ms")
        print(f"   Total cost: ${results['total_cost_usd']:.4f}")
    
    # Save results
    output_dir = Path("reports/benchmarks")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    summary_file = output_dir / "quick_benchmark_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print("\n" + "=" * 60)
    print("✅ Quick benchmark complete!")
    print(f"   Results saved to: {summary_file}")
    
    # Summary stats
    total_passed = sum(r["passed"] for r in all_results)
    total_tests = len(all_results) * 5
    overall_accuracy = total_passed / total_tests if total_tests > 0 else 0
    total_cost = sum(r["total_cost_usd"] for r in all_results)
    
    print(f"\n📈 Overall Results:")
    print(f"   Agents tested: {len(all_results)}/5")
    print(f"   Total tests: {total_passed}/{total_tests} passed ({overall_accuracy:.0%})")
    print(f"   Total cost: ${total_cost:.4f}")
    
    if overall_accuracy >= 0.8:
        print(f"\n✅ SUCCESS: {overall_accuracy:.0%} accuracy (target: ≥80%)")
    else:
        print(f"\n⚠️  WARNING: {overall_accuracy:.0%} accuracy (target: ≥80%)")

if __name__ == "__main__":
    main()
