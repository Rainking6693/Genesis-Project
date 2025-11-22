"""
Real-time monitoring for 1-hour business generation test.
Tracks progress, errors, and model usage.
"""

import time
import sys
from pathlib import Path
from collections import Counter
import re

log_file = Path("logs/1hour_test_output.log")

def count_pattern(pattern):
    """Count occurrences of pattern in log file."""
    if not log_file.exists():
        return 0
    content = log_file.read_text(encoding='utf-8', errors='ignore')
    return len(re.findall(pattern, content))

def get_last_lines(n=20):
    """Get last N lines from log."""
    if not log_file.exists():
        return []
    lines = log_file.read_text(encoding='utf-8', errors='ignore').splitlines()
    return lines[-n:]

def main():
    print("\n" + "="*80)
    print("1-HOUR BUSINESS GENERATION TEST - LIVE MONITOR")
    print("="*80 + "\n")

    start_time = time.time()

    while True:
        elapsed = time.time() - start_time
        elapsed_min = int(elapsed / 60)

        # Count metrics
        completed = count_pattern(r"Business #\d+/\d+ Complete")
        vertex_ai_success = count_pattern(r"Vertex AI success")
        deepseek_success = count_pattern(r"DeepSeek fallback success")
        mistral_success = count_pattern(r"Mistral fallback success")
        claude_success = count_pattern(r"Claude fallback success")
        gpt_success = count_pattern(r"GPT fallback success")

        errors = count_pattern(r"ERROR")
        warnings = count_pattern(r"WARNING")

        # Calculate totals
        total_llm_calls = vertex_ai_success + deepseek_success + mistral_success + claude_success + gpt_success

        # Print status
        print(f"\r[{elapsed_min:02d} min] Businesses: {completed}/100 | LLM Calls: {total_llm_calls} | "
              f"Models: V={vertex_ai_success} D={deepseek_success} M={mistral_success} C={claude_success} G={gpt_success} | "
              f"Errors: {errors} Warnings: {warnings}", end="", flush=True)

        # Check if test is complete
        if completed >= 100:
            print("\n\n" + "="*80)
            print("TEST COMPLETE!")
            print("="*80)
            break

        # Check if process crashed
        last_lines = get_last_lines(5)
        if any("Traceback" in line for line in last_lines):
            print("\n\n" + "="*80)
            print("ERROR: Process crashed! Check logs for details.")
            print("="*80)
            for line in last_lines:
                print(line)
            break

        time.sleep(5)  # Update every 5 seconds

    # Final summary
    print(f"\n\nFinal Summary:")
    print(f"  Businesses completed: {completed}")
    print(f"  Total time: {elapsed_min} minutes")
    print(f"  Model usage:")
    print(f"    - Vertex AI: {vertex_ai_success}")
    print(f"    - DeepSeek: {deepseek_success}")
    print(f"    - Mistral: {mistral_success}")
    print(f"    - Claude: {claude_success}")
    print(f"    - GPT-4: {gpt_success}")
    print(f"  Errors: {errors}")
    print(f"  Warnings: {warnings}")

    # Cost estimate
    mistral_cost = mistral_success * 0.002
    claude_cost = claude_success * 0.05
    gpt_cost = gpt_success * 0.04
    total_cost = mistral_cost + claude_cost + gpt_cost

    print(f"\n  Estimated cost: ${total_cost:.3f}")
    print(f"    - Mistral: ${mistral_cost:.3f}")
    print(f"    - Claude: ${claude_cost:.3f}")
    print(f"    - GPT-4: ${gpt_cost:.3f}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped by user.")
        sys.exit(0)
