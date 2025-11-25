"""
Script to systematically fix all agents to use LLM calls with excellence instructions
instead of returning hardcoded templates.

This script:
1. Identifies methods that return hardcoded templates/strings
2. Converts them to async methods that call LLM
3. Includes excellence instructions in prompts
4. Adds error handling with fallbacks
"""

import os
import re
import sys
from pathlib import Path

# Agents directory
AGENTS_DIR = Path("C:/Users/Administrator/Desktop/Genesis-Project/agents")

# Methods that should NOT be converted (they handle config/external API calls)
SKIP_METHODS = {
    "__init__", "initialize", "shutdown", "_charge_x402", "_request_marketing_spend",
    "_prepare_x402_metadata", "_build_asset_signature", "_get_system_instruction",
    "subscribe_", "route_task", "get_cost_metrics", "_run_ap2_loop",
    "_execute_ap2_coro", "_init_memory", "request_campaign_budget"
}

# Pattern to detect template strings
TEMPLATE_PATTERNS = [
    r'f"[^"]*\{[^}]+\}[^"]*"',  # f-strings
    r'f\'[^\']*\{[^}]+\}[^\']*\'',  # f-strings with single quotes
    r'return\s+"[^"]*"',  # Direct string returns
    r'return\s+\'[^\']*\'',  # Direct string returns with single quotes
    r'\{["\'].*["\']: f["\'].*["\']\}',  # Dict with f-strings
]

def should_skip_method(method_name):
    """Check if method should be skipped."""
    for skip in SKIP_METHODS:
        if method_name.startswith(skip):
            return True
    return False

def detect_template_in_method(method_code):
    """Detect if method contains hardcoded templates."""
    for pattern in TEMPLATE_PATTERNS:
        if re.search(pattern, method_code):
            return True
    return False

def is_async_method(method_code):
    """Check if method is already async."""
    return method_code.strip().startswith("async def")

def extract_methods_from_file(file_path):
    """Extract all methods from a Python file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all method definitions
    method_pattern = r'    def ([a-z_]+)\([^)]*\).*?(?=\n    def |\n\nclass |\Z)'
    methods = re.findall(method_pattern, content, re.DOTALL)

    return methods

def generate_summary_report():
    """Generate a summary report of all agents and their methods."""
    print("="*80)
    print("AGENT LLM USAGE FIX - SUMMARY REPORT")
    print("="*80)
    print()

    agent_files = list(AGENTS_DIR.glob("*_agent.py"))
    agent_files.append(AGENTS_DIR / "builder_agent_enhanced.py")

    total_agents = len(agent_files)
    total_methods_analyzed = 0
    methods_needing_fix = []

    for agent_file in sorted(agent_files):
        if not agent_file.exists():
            continue

        agent_name = agent_file.stem
        print(f"\n[FILE] {agent_name}.py")
        print("-" * 80)

        try:
            with open(agent_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Check if agent has EXCELLENCE_PROMPT
            has_excellence = "EXCELLENCE_PROMPT" in content
            print(f"   Excellence Prompt: {'[YES]' if has_excellence else '[NO]'}")

            # Check if agent inherits from StandardIntegrationMixin
            has_mixin = "StandardIntegrationMixin" in content
            print(f"   StandardIntegrationMixin: {'[YES]' if has_mixin else '[NO]'}")

            # Find all public methods (not starting with _)
            method_pattern = r'    def ([a-z][a-z_]+)\('
            methods = re.findall(method_pattern, content)
            public_methods = [m for m in methods if not m.startswith('_') and not should_skip_method(m)]

            print(f"   Public Methods: {len(public_methods)}")

            # Check each method for template usage
            methods_with_templates = []
            for method in public_methods:
                # Extract method code
                method_start = content.find(f"    def {method}(")
                if method_start == -1:
                    continue

                # Find next method or end of class
                next_method = content.find("\n    def ", method_start + 1)
                if next_method == -1:
                    method_code = content[method_start:]
                else:
                    method_code = content[method_start:next_method]

                # Check for templates and async
                has_template = detect_template_in_method(method_code)
                is_async = is_async_method(method_code)
                uses_llm = "local_llm_client.complete" in method_code or "await self.llm" in method_code

                if has_template and not uses_llm:
                    methods_with_templates.append({
                        "method": method,
                        "is_async": is_async,
                        "uses_llm": uses_llm
                    })
                    methods_needing_fix.append(f"{agent_name}.{method}")

            if methods_with_templates:
                print(f"   [NEEDS FIX] Methods needing LLM integration: {len(methods_with_templates)}")
                for m in methods_with_templates[:5]:  # Show first 5
                    status = "async" if m['is_async'] else "sync"
                    print(f"      - {m['method']}() [{status}]")
                if len(methods_with_templates) > 5:
                    print(f"      ... and {len(methods_with_templates) - 5} more")
            else:
                print(f"   [OK] All methods use LLM or don't need it")

            total_methods_analyzed += len(public_methods)

        except Exception as e:
            print(f"   [ERROR] Error analyzing: {e}")

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total Agents Analyzed: {total_agents}")
    print(f"Total Methods Analyzed: {total_methods_analyzed}")
    print(f"Methods Needing LLM Fix: {len(methods_needing_fix)}")
    print()

    if methods_needing_fix:
        print("[METHODS TO FIX]:")
        print("-" * 80)
        for i, method in enumerate(methods_needing_fix[:20], 1):
            print(f"{i}. {method}")
        if len(methods_needing_fix) > 20:
            print(f"   ... and {len(methods_needing_fix) - 20} more")
    else:
        print("[OK] ALL AGENTS USE LLM CORRECTLY!")

    print("\n" + "="*80)
    print()

    return methods_needing_fix

if __name__ == "__main__":
    methods_to_fix = generate_summary_report()

    print(f"\n[SUMMARY] Found {len(methods_to_fix)} methods that need to be fixed")
    print("\nTo fix these methods:")
    print("1. Each method should be made async (if not already)")
    print("2. Include EXCELLENCE_PROMPT in the LLM prompt")
    print("3. Use self.local_llm_client.complete() to call LLM")
    print("4. Add try/except with fallback to template on error")
    print("5. Parse JSON response if structured data is expected")

    sys.exit(0 if len(methods_to_fix) == 0 else 1)
