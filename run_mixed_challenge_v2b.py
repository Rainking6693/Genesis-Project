#!/usr/bin/env python3
"""
Genesis Mixed Challenge V2b - 25 Additional Tests
5 Easy | 8 Intermediate | 12 Hard

Uses Mistral (primary) with Gemini fallback for LLM code generation.
"""

import asyncio
import json
import logging
import time
import argparse
import httpx
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("mixed_challenge_v2b")

MISTRAL_API_KEY = "xBClmFrEWnHJcdrxjJU65frPPXytIYKK"
GEMINI_API_KEY = "AIzaSyDOYNHjGyhEgvKU0SlfXDGdnqUiWE4_6lE"

from infrastructure.openhands_local import OpenHandsClient


def compute_reward(code: str, result: dict, challenge: dict) -> float:
    passed = result.get("passed", False)
    difficulty = challenge.get("difficulty", "intermediate")
    difficulty_weights = {"easy": 1.0, "intermediate": 1.5, "hard": 2.5}
    base_weight = difficulty_weights.get(difficulty, 1.5)
    if passed:
        return 1.5 * base_weight
    else:
        has_impl = "pass" not in code.lower() or len(code) > len(challenge.get("template", ""))
        return 0.3 * base_weight if has_impl else 0.1 * base_weight


# ============================================================
# EASY CHALLENGES V2b (1-5)
# ============================================================
EASY_CHALLENGES = [
    {"id": 1, "name": "reverse_string", "difficulty": "easy",
     "template": '''def reverse_string(s):
    """Reverse a string in-place."""
    pass

s = list("hello")
reverse_string(s)
assert s == ['o', 'l', 'l', 'e', 'h']
print("PASS")'''},

    {"id": 2, "name": "array_intersection_ii", "difficulty": "easy",
     "template": '''def intersect(nums1, nums2):
    """Find intersection with duplicates."""
    pass

assert sorted(intersect([1,2,2,1], [2,2])) == [2,2]
assert sorted(intersect([4,9,5], [9,4,9,8,4])) == [4,9]
print("PASS")'''},

    {"id": 3, "name": "third_maximum", "difficulty": "easy",
     "template": '''def third_max(nums):
    """Find third distinct maximum or max if not exists."""
    pass

assert third_max([3, 2, 1]) == 1
assert third_max([1, 2]) == 2
assert third_max([2, 2, 3, 1]) == 1
print("PASS")'''},

    {"id": 4, "name": "add_strings", "difficulty": "easy",
     "template": '''def add_strings(num1, num2):
    """Add two numbers as strings without converting."""
    pass

assert add_strings("11", "123") == "134"
assert add_strings("456", "77") == "533"
assert add_strings("0", "0") == "0"
print("PASS")'''},

    {"id": 5, "name": "longest_common_prefix", "difficulty": "easy",
     "template": '''def longest_common_prefix(strs):
    """Find longest common prefix among strings."""
    pass

assert longest_common_prefix(["flower","flow","flight"]) == "fl"
assert longest_common_prefix(["dog","racecar","car"]) == ""
print("PASS")'''},
]

# ============================================================
# INTERMEDIATE CHALLENGES V2b (6-13)
# ============================================================
INTERMEDIATE_CHALLENGES = [
    {"id": 6, "name": "find_all_duplicates", "difficulty": "intermediate",
     "template": '''def find_duplicates(nums):
    """Find all elements appearing twice using O(1) extra space."""
    pass

assert sorted(find_duplicates([4,3,2,7,8,2,3,1])) == [2, 3]
assert find_duplicates([1,1,2]) == [1]
print("PASS")'''},

    {"id": 7, "name": "single_number_ii", "difficulty": "intermediate",
     "template": '''def single_number(nums):
    """Find element appearing once (others appear three times)."""
    pass

assert single_number([2,2,3,2]) == 3
assert single_number([0,1,0,1,0,1,99]) == 99
print("PASS")'''},

    {"id": 8, "name": "valid_parenthesis_string", "difficulty": "intermediate",
     "template": '''def check_valid_string(s):
    """Check if string with * (wildcard) is valid parentheses."""
    pass

assert check_valid_string("()") == True
assert check_valid_string("(*)") == True
assert check_valid_string("(*))") == True
assert check_valid_string("((*)") == True
print("PASS")'''},

    {"id": 9, "name": "gas_station", "difficulty": "intermediate",
     "template": '''def can_complete_circuit(gas, cost):
    """Find starting gas station index for circular route."""
    pass

assert can_complete_circuit([1,2,3,4,5], [3,4,5,1,2]) == 3
assert can_complete_circuit([2,3,4], [3,4,3]) == -1
print("PASS")'''},

    {"id": 10, "name": "next_permutation", "difficulty": "intermediate",
     "template": '''def next_permutation(nums):
    """Rearrange to next lexicographically greater permutation."""
    pass
    return nums

assert next_permutation([1,2,3]) == [1,3,2]
assert next_permutation([3,2,1]) == [1,2,3]
assert next_permutation([1,1,5]) == [1,5,1]
print("PASS")'''},

    {"id": 11, "name": "evaluate_rpn", "difficulty": "intermediate",
     "template": '''def eval_rpn(tokens):
    """Evaluate Reverse Polish Notation expression."""
    pass

assert eval_rpn(["2","1","+","3","*"]) == 9
assert eval_rpn(["4","13","5","/","+"]) == 6
assert eval_rpn(["10","6","9","3","+","-11","*","/","*","17","+","5","+"]) == 22
print("PASS")'''},

    {"id": 12, "name": "minimum_path_sum", "difficulty": "intermediate",
     "template": '''def min_path_sum(grid):
    """Minimum path sum from top-left to bottom-right."""
    pass

assert min_path_sum([[1,3,1],[1,5,1],[4,2,1]]) == 7
assert min_path_sum([[1,2,3],[4,5,6]]) == 12
print("PASS")'''},

    {"id": 13, "name": "decode_string", "difficulty": "intermediate",
     "template": '''def decode_string(s):
    """Decode string like 3[a2[c]] -> accaccacc."""
    pass

assert decode_string("3[a]2[bc]") == "aaabcbc"
assert decode_string("3[a2[c]]") == "accaccacc"
assert decode_string("2[abc]3[cd]ef") == "abcabccdcdcdef"
print("PASS")'''},
]

# ============================================================
# HARD CHALLENGES V2b (14-25)
# ============================================================
HARD_CHALLENGES = [
    {"id": 14, "name": "longest_increasing_path", "difficulty": "hard",
     "template": '''def longest_increasing_path(matrix):
    """Find longest increasing path in matrix."""
    pass

assert longest_increasing_path([[9,9,4],[6,6,8],[2,1,1]]) == 4
assert longest_increasing_path([[3,4,5],[3,2,6],[2,2,1]]) == 4
print("PASS")'''},

    {"id": 15, "name": "find_kth_smallest_pair", "difficulty": "hard",
     "template": '''def smallest_distance_pair(nums, k):
    """Find kth smallest distance pair."""
    pass

assert smallest_distance_pair([1,3,1], 1) == 0
assert smallest_distance_pair([1,1,1], 2) == 0
assert smallest_distance_pair([1,6,1], 3) == 5
print("PASS")'''},

    {"id": 16, "name": "paint_fence", "difficulty": "hard",
     "template": '''def num_ways(n, k):
    """Number of ways to paint n posts with k colors."""
    pass

assert num_ways(3, 2) == 6
assert num_ways(1, 1) == 1
assert num_ways(7, 2) == 42
print("PASS")'''},

    {"id": 17, "name": "max_product_word", "difficulty": "hard",
     "template": '''def max_product(words):
    """Max product of lengths of words with no common chars."""
    pass

assert max_product(["abcw","baz","foo","bar","xtfn","abcdef"]) == 16
assert max_product(["a","ab","abc","d","cd","bcd","abcd"]) == 4
print("PASS")'''},

    {"id": 18, "name": "count_primes", "difficulty": "hard",
     "template": '''def count_primes(n):
    """Count primes less than n using Sieve."""
    pass

assert count_primes(10) == 4
assert count_primes(0) == 0
assert count_primes(1) == 0
assert count_primes(100) == 25
print("PASS")'''},

    {"id": 19, "name": "kth_smallest_bst", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def kth_smallest(root, k):
    """Find kth smallest element in BST."""
    pass

root = TreeNode(3, TreeNode(1, None, TreeNode(2)), TreeNode(4))
assert kth_smallest(root, 1) == 1
assert kth_smallest(root, 3) == 3
print("PASS")'''},

    {"id": 20, "name": "find_duplicate", "difficulty": "hard",
     "template": '''def find_duplicate(nums):
    """Find duplicate in array of n+1 integers from 1 to n."""
    pass

assert find_duplicate([1,3,4,2,2]) == 2
assert find_duplicate([3,1,3,4,2]) == 3
print("PASS")'''},

    {"id": 21, "name": "longest_substr_k_repeating", "difficulty": "hard",
     "template": '''def longest_substring(s, k):
    """Longest substring where each char appears at least k times."""
    pass

assert longest_substring("aaabb", 3) == 3
assert longest_substring("ababbc", 2) == 5
print("PASS")'''},

    {"id": 22, "name": "valid_square", "difficulty": "hard",
     "template": '''def valid_square(p1, p2, p3, p4):
    """Check if four points form a valid square."""
    pass

assert valid_square([0,0], [1,1], [1,0], [0,1]) == True
assert valid_square([0,0], [1,1], [1,0], [0,12]) == False
assert valid_square([1,0], [-1,0], [0,1], [0,-1]) == True
print("PASS")'''},

    {"id": 23, "name": "decode_ways_ii", "difficulty": "hard",
     "template": '''def num_decodings(s):
    """Count decodings with * wildcard (mod 10^9+7)."""
    pass

assert num_decodings("*") == 9
assert num_decodings("1*") == 18
assert num_decodings("2*") == 15
print("PASS")'''},

    {"id": 24, "name": "max_subarray_circular", "difficulty": "hard",
     "template": '''def max_subarray_sum_circular(nums):
    """Maximum sum circular subarray."""
    pass

assert max_subarray_sum_circular([1,-2,3,-2]) == 3
assert max_subarray_sum_circular([5,-3,5]) == 10
assert max_subarray_sum_circular([-3,-2,-3]) == -2
print("PASS")'''},

    {"id": 25, "name": "minimum_number_refueling", "difficulty": "hard",
     "template": '''def min_refuel_stops(target, start_fuel, stations):
    """Minimum refueling stops to reach target."""
    pass

assert min_refuel_stops(1, 1, []) == 0
assert min_refuel_stops(100, 1, [[10,100]]) == -1
assert min_refuel_stops(100, 10, [[10,60],[20,30],[30,30],[60,40]]) == 2
print("PASS")'''},
]

ALL_CHALLENGES = EASY_CHALLENGES + INTERMEDIATE_CHALLENGES + HARD_CHALLENGES


class AgentCodeGenerator:
    def __init__(self):
        self.mistral_url = "https://api.mistral.ai/v1/chat/completions"
        self.gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={GEMINI_API_KEY}"
        self.client = httpx.AsyncClient(timeout=60.0)
        self.stats = {"mistral": 0, "gemini": 0, "errors": 0}

    async def generate_code(self, template: str, challenge_name: str, difficulty: str) -> str:
        prompt = f"""You are an expert Python programmer. Complete the following code challenge.
Difficulty: {difficulty.upper()}

INSTRUCTIONS:
1. Replace all `pass` statements with working implementations
2. Do NOT change any existing code, assert statements, or print statements
3. Return ONLY the complete Python code, no explanations
4. Make sure all assert statements pass

CHALLENGE:
```python
{template}
```

Return the complete working code:"""

        try:
            response = await self.client.post(
                self.mistral_url,
                headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                json={"model": "mistral-small-latest", "messages": [{"role": "user", "content": prompt}], "temperature": 0.1, "max_tokens": 2000}
            )
            if response.status_code == 200:
                data = response.json()
                code = data["choices"][0]["message"]["content"]
                code = self._extract_code(code)
                self.stats["mistral"] += 1
                return code
        except Exception as e:
            logger.warning(f"Mistral failed: {e}")

        try:
            response = await self.client.post(
                self.gemini_url,
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2000}}
            )
            if response.status_code == 200:
                data = response.json()
                code = data["candidates"][0]["content"]["parts"][0]["text"]
                code = self._extract_code(code)
                self.stats["gemini"] += 1
                return code
        except Exception as e:
            logger.warning(f"Gemini failed: {e}")

        self.stats["errors"] += 1
        return template

    def _extract_code(self, text: str) -> str:
        if "```python" in text:
            start = text.find("```python") + 9
            end = text.find("```", start)
            if end > start:
                return text[start:end].strip()
        if "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end > start:
                return text[start:end].strip()
        return text.strip()

    async def close(self):
        await self.client.aclose()


class MixedChallengeV2b:
    def __init__(self):
        self.openhands = OpenHandsClient()
        self.generator = AgentCodeGenerator()
        self.challenges = ALL_CHALLENGES
        logger.info(f"MixedChallengeV2b: {len(EASY_CHALLENGES)} easy + {len(INTERMEDIATE_CHALLENGES)} intermediate + {len(HARD_CHALLENGES)} hard = {len(self.challenges)} total")

    async def run_challenge(self, challenge: dict) -> dict:
        start_time = time.time()
        name = challenge["name"]
        difficulty = challenge["difficulty"]
        template = challenge["template"]

        generated_code = await self.generator.generate_code(template, name, difficulty)
        result = await self.openhands.execute(instructions=f"Challenge {name}", code=generated_code, run_tests=False)
        elapsed = time.time() - start_time

        passed = result.success and "PASS" in result.output
        reward = compute_reward(generated_code, {"passed": passed}, {"difficulty": difficulty, "template": template})

        return {"id": challenge["id"], "name": name, "difficulty": difficulty, "passed": passed, "reward": reward, "elapsed_ms": int(elapsed * 1000)}

    async def run_all(self, iterations: int = 1) -> dict:
        logger.info("=" * 60)
        logger.info("GENESIS MIXED DIFFICULTY CHALLENGE V2b - 25 NEW TESTS")
        logger.info("5 Easy | 8 Intermediate | 12 Hard")
        logger.info("=" * 60)

        best_results = None
        best_passed = 0

        for iteration in range(1, iterations + 1):
            logger.info(f"\n>>> ITERATION {iteration}/{iterations} <<<\n")
            results = []
            for ch in self.challenges:
                result = await self.run_challenge(ch)
                status = "PASS" if result["passed"] else "FAIL"
                logger.info(f"  [{result['id']:02d}] {result['name']} ({result['difficulty']}): {status} (R={result['reward']:.3f}, {result['elapsed_ms']}ms)")
                results.append(result)

            easy_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "easy")
            inter_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "intermediate")
            hard_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "hard")
            total_passed = easy_passed + inter_passed + hard_passed
            total_reward = sum(r["reward"] for r in results)

            logger.info(f"\n--- Iteration {iteration} ---")
            logger.info(f"Easy: {easy_passed}/5 | Intermediate: {inter_passed}/8 | Hard: {hard_passed}/12 | Total: {total_passed}/25 ({total_passed * 4}%)")

            if total_passed > best_passed:
                best_passed = total_passed
                best_results = {"iteration": iteration, "easy_passed": easy_passed, "intermediate_passed": inter_passed, "hard_passed": hard_passed, "total_passed": total_passed, "total_reward": total_reward}

        await self.generator.close()

        logger.info("\nFINAL RESULTS")
        logger.info(f"Easy: {best_results['easy_passed']}/5 | Intermediate: {best_results['intermediate_passed']}/8 | Hard: {best_results['hard_passed']}/12")
        logger.info(f"Total: {best_results['total_passed']}/25 ({best_results['total_passed']*4}%)")

        output = {
            "iterations": iterations,
            "best_passed": best_results["total_passed"],
            "best_reward": best_results["total_reward"],
            "pass_rate": best_results["total_passed"] * 4,
            "breakdown": {
                "easy": {"passed": best_results["easy_passed"], "total": 5},
                "intermediate": {"passed": best_results["intermediate_passed"], "total": 8},
                "hard": {"passed": best_results["hard_passed"], "total": 12}
            },
            "llm_stats": self.generator.stats
        }

        output_path = Path("data/mixed_results_v2b.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"\nResults saved to {output_path}")

        return output


async def main():
    parser = argparse.ArgumentParser(description="Genesis Mixed Difficulty Challenge V2b")
    parser.add_argument("--iterations", type=int, default=1)
    args = parser.parse_args()
    challenge = MixedChallengeV2b()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
