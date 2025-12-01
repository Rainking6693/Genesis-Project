#!/usr/bin/env python3
"""
Genesis Mixed Difficulty Challenge V3 - 50 NEW Tests
10 Easy | 15 Intermediate | 25 Hard

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
logger = logging.getLogger("mixed_challenge_v3")

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
# EASY CHALLENGES V3 (1-10)
# ============================================================
EASY_CHALLENGES = [
    {"id": 1, "name": "sum_digits", "difficulty": "easy",
     "template": '''def sum_digits(n):
    """Sum all digits of a non-negative integer."""
    pass

assert sum_digits(123) == 6
assert sum_digits(0) == 0
assert sum_digits(9999) == 36
print("PASS")'''},

    {"id": 2, "name": "count_vowels", "difficulty": "easy",
     "template": '''def count_vowels(s):
    """Count vowels in string (case insensitive)."""
    pass

assert count_vowels("hello") == 2
assert count_vowels("AEIOU") == 5
assert count_vowels("xyz") == 0
print("PASS")'''},

    {"id": 3, "name": "is_palindrome_number", "difficulty": "easy",
     "template": '''def is_palindrome(x):
    """Check if integer is palindrome without converting to string."""
    pass

assert is_palindrome(121) == True
assert is_palindrome(-121) == False
assert is_palindrome(10) == False
assert is_palindrome(12321) == True
print("PASS")'''},

    {"id": 4, "name": "merge_sorted_lists", "difficulty": "easy",
     "template": '''def merge_sorted(list1, list2):
    """Merge two sorted lists into one sorted list."""
    pass

assert merge_sorted([1,3,5], [2,4,6]) == [1,2,3,4,5,6]
assert merge_sorted([], [1,2]) == [1,2]
assert merge_sorted([1], []) == [1]
print("PASS")'''},

    {"id": 5, "name": "remove_duplicates_sorted", "difficulty": "easy",
     "template": '''def remove_duplicates(nums):
    """Remove duplicates from sorted array in-place, return new length."""
    pass

nums1 = [1,1,2]
assert remove_duplicates(nums1) == 2
nums2 = [0,0,1,1,1,2,2,3,3,4]
assert remove_duplicates(nums2) == 5
print("PASS")'''},

    {"id": 6, "name": "find_single_number", "difficulty": "easy",
     "template": '''def single_number(nums):
    """Find element that appears once (others appear twice)."""
    pass

assert single_number([2,2,1]) == 1
assert single_number([4,1,2,1,2]) == 4
assert single_number([1]) == 1
print("PASS")'''},

    {"id": 7, "name": "climb_stairs", "difficulty": "easy",
     "template": '''def climb_stairs(n):
    """Count ways to climb n stairs (1 or 2 steps at a time)."""
    pass

assert climb_stairs(2) == 2
assert climb_stairs(3) == 3
assert climb_stairs(5) == 8
print("PASS")'''},

    {"id": 8, "name": "max_subarray_sum", "difficulty": "easy",
     "template": '''def max_subarray(nums):
    """Find contiguous subarray with largest sum."""
    pass

assert max_subarray([-2,1,-3,4,-1,2,1,-5,4]) == 6
assert max_subarray([1]) == 1
assert max_subarray([5,4,-1,7,8]) == 23
print("PASS")'''},

    {"id": 9, "name": "contains_duplicate", "difficulty": "easy",
     "template": '''def contains_duplicate(nums):
    """Check if array contains any duplicates."""
    pass

assert contains_duplicate([1,2,3,1]) == True
assert contains_duplicate([1,2,3,4]) == False
assert contains_duplicate([1,1,1,3,3,4,3,2,4,2]) == True
print("PASS")'''},

    {"id": 10, "name": "majority_element", "difficulty": "easy",
     "template": '''def majority_element(nums):
    """Find element appearing more than n/2 times."""
    pass

assert majority_element([3,2,3]) == 3
assert majority_element([2,2,1,1,1,2,2]) == 2
print("PASS")'''},
]

# ============================================================
# INTERMEDIATE CHALLENGES V3 (11-25)
# ============================================================
INTERMEDIATE_CHALLENGES = [
    {"id": 11, "name": "rotate_array", "difficulty": "intermediate",
     "template": '''def rotate(nums, k):
    """Rotate array right by k steps in-place."""
    pass
    return nums

assert rotate([1,2,3,4,5,6,7], 3) == [5,6,7,1,2,3,4]
assert rotate([-1,-100,3,99], 2) == [3,99,-1,-100]
print("PASS")'''},

    {"id": 12, "name": "product_except_self", "difficulty": "intermediate",
     "template": '''def product_except_self(nums):
    """Product of array except self without division."""
    pass

assert product_except_self([1,2,3,4]) == [24,12,8,6]
assert product_except_self([-1,1,0,-3,3]) == [0,0,9,0,0]
print("PASS")'''},

    {"id": 13, "name": "find_duplicates", "difficulty": "intermediate",
     "template": '''def find_duplicates(nums):
    """Find all elements appearing twice (values 1 to n)."""
    pass

assert set(find_duplicates([4,3,2,7,8,2,3,1])) == {2, 3}
assert find_duplicates([1,1,2]) == [1]
print("PASS")'''},

    {"id": 14, "name": "spiral_matrix", "difficulty": "intermediate",
     "template": '''def spiral_order(matrix):
    """Return elements in spiral order."""
    pass

assert spiral_order([[1,2,3],[4,5,6],[7,8,9]]) == [1,2,3,6,9,8,7,4,5]
assert spiral_order([[1,2,3,4],[5,6,7,8],[9,10,11,12]]) == [1,2,3,4,8,12,11,10,9,5,6,7]
print("PASS")'''},

    {"id": 15, "name": "set_matrix_zeroes", "difficulty": "intermediate",
     "template": '''def set_zeroes(matrix):
    """Set entire row and column to zero if element is zero."""
    pass
    return matrix

matrix1 = [[1,1,1],[1,0,1],[1,1,1]]
assert set_zeroes(matrix1) == [[1,0,1],[0,0,0],[1,0,1]]
print("PASS")'''},

    {"id": 16, "name": "container_water", "difficulty": "intermediate",
     "template": '''def max_area(height):
    """Container with most water."""
    pass

assert max_area([1,8,6,2,5,4,8,3,7]) == 49
assert max_area([1,1]) == 1
print("PASS")'''},

    {"id": 17, "name": "jump_game", "difficulty": "intermediate",
     "template": '''def can_jump(nums):
    """Check if you can reach last index."""
    pass

assert can_jump([2,3,1,1,4]) == True
assert can_jump([3,2,1,0,4]) == False
print("PASS")'''},

    {"id": 18, "name": "unique_paths", "difficulty": "intermediate",
     "template": '''def unique_paths(m, n):
    """Count unique paths in m x n grid."""
    pass

assert unique_paths(3, 7) == 28
assert unique_paths(3, 2) == 3
print("PASS")'''},

    {"id": 19, "name": "coin_change", "difficulty": "intermediate",
     "template": '''def coin_change(coins, amount):
    """Minimum coins needed for amount."""
    pass

assert coin_change([1,2,5], 11) == 3
assert coin_change([2], 3) == -1
assert coin_change([1], 0) == 0
print("PASS")'''},

    {"id": 20, "name": "longest_increasing_subseq", "difficulty": "intermediate",
     "template": '''def length_of_lis(nums):
    """Length of longest increasing subsequence."""
    pass

assert length_of_lis([10,9,2,5,3,7,101,18]) == 4
assert length_of_lis([0,1,0,3,2,3]) == 4
assert length_of_lis([7,7,7,7,7,7,7]) == 1
print("PASS")'''},

    {"id": 21, "name": "decode_ways", "difficulty": "intermediate",
     "template": '''def num_decodings(s):
    """Count ways to decode string (A=1, B=2, ..., Z=26)."""
    pass

assert num_decodings("12") == 2
assert num_decodings("226") == 3
assert num_decodings("06") == 0
print("PASS")'''},

    {"id": 22, "name": "house_robber", "difficulty": "intermediate",
     "template": '''def rob(nums):
    """Max money robbing non-adjacent houses."""
    pass

assert rob([1,2,3,1]) == 4
assert rob([2,7,9,3,1]) == 12
print("PASS")'''},

    {"id": 23, "name": "subsets", "difficulty": "intermediate",
     "template": '''def subsets(nums):
    """Generate all subsets."""
    pass

result = subsets([1,2,3])
assert len(result) == 8
assert [] in result
assert [1,2,3] in result
print("PASS")'''},

    {"id": 24, "name": "permutations", "difficulty": "intermediate",
     "template": '''def permute(nums):
    """Generate all permutations."""
    pass

result = permute([1,2,3])
assert len(result) == 6
assert [1,2,3] in result
assert [3,2,1] in result
print("PASS")'''},

    {"id": 25, "name": "combination_sum", "difficulty": "intermediate",
     "template": '''def combination_sum(candidates, target):
    """Find combinations summing to target (reuse allowed)."""
    pass

result = combination_sum([2,3,6,7], 7)
assert sorted([sorted(x) for x in result]) == [[2,2,3], [7]]
print("PASS")'''},
]

# ============================================================
# HARD CHALLENGES V3 (26-50)
# ============================================================
HARD_CHALLENGES = [
    {"id": 26, "name": "trapping_rain_water", "difficulty": "hard",
     "template": '''def trap(height):
    """Calculate trapped rain water."""
    pass

assert trap([0,1,0,2,1,0,1,3,2,1,2,1]) == 6
assert trap([4,2,0,3,2,5]) == 9
print("PASS")'''},

    {"id": 27, "name": "merge_k_sorted_lists", "difficulty": "hard",
     "template": '''def merge_k_lists(lists):
    """Merge k sorted lists into one sorted list."""
    pass

assert merge_k_lists([[1,4,5],[1,3,4],[2,6]]) == [1,1,2,3,4,4,5,6]
assert merge_k_lists([]) == []
print("PASS")'''},

    {"id": 28, "name": "median_two_sorted", "difficulty": "hard",
     "template": '''def find_median_sorted_arrays(nums1, nums2):
    """Find median of two sorted arrays."""
    pass

assert find_median_sorted_arrays([1,3], [2]) == 2.0
assert find_median_sorted_arrays([1,2], [3,4]) == 2.5
print("PASS")'''},

    {"id": 29, "name": "word_ladder", "difficulty": "hard",
     "template": '''def ladder_length(begin_word, end_word, word_list):
    """Shortest transformation sequence length."""
    pass

assert ladder_length("hit", "cog", ["hot","dot","dog","lot","log","cog"]) == 5
assert ladder_length("hit", "cog", ["hot","dot","dog","lot","log"]) == 0
print("PASS")'''},

    {"id": 30, "name": "edit_distance", "difficulty": "hard",
     "template": '''def min_distance(word1, word2):
    """Minimum edit operations to convert word1 to word2."""
    pass

assert min_distance("horse", "ros") == 3
assert min_distance("intention", "execution") == 5
print("PASS")'''},

    {"id": 31, "name": "regular_expression", "difficulty": "hard",
     "template": '''def is_match(s, p):
    """Regex matching with . and * support."""
    pass

assert is_match("aa", "a") == False
assert is_match("aa", "a*") == True
assert is_match("ab", ".*") == True
print("PASS")'''},

    {"id": 32, "name": "jump_game_ii", "difficulty": "hard",
     "template": '''def jump(nums):
    """Minimum jumps to reach end."""
    pass

assert jump([2,3,1,1,4]) == 2
assert jump([2,3,0,1,4]) == 2
print("PASS")'''},

    {"id": 33, "name": "longest_valid_parentheses", "difficulty": "hard",
     "template": '''def longest_valid_parentheses(s):
    """Longest valid parentheses substring length."""
    pass

assert longest_valid_parentheses("(()") == 2
assert longest_valid_parentheses(")()())") == 4
assert longest_valid_parentheses("") == 0
print("PASS")'''},

    {"id": 34, "name": "first_missing_positive", "difficulty": "hard",
     "template": '''def first_missing_positive(nums):
    """Find smallest missing positive integer."""
    pass

assert first_missing_positive([1,2,0]) == 3
assert first_missing_positive([3,4,-1,1]) == 2
assert first_missing_positive([7,8,9,11,12]) == 1
print("PASS")'''},

    {"id": 35, "name": "serialize_binary_tree", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def serialize(root):
    pass

def deserialize(data):
    pass

root = TreeNode(1, TreeNode(2), TreeNode(3, TreeNode(4), TreeNode(5)))
data = serialize(root)
new_root = deserialize(data)
assert new_root.val == 1
assert new_root.left.val == 2
assert new_root.right.val == 3
print("PASS")'''},

    {"id": 36, "name": "word_break_ii", "difficulty": "hard",
     "template": '''def word_break(s, word_dict):
    """Return all possible sentences."""
    pass

result = word_break("catsanddog", ["cat","cats","and","sand","dog"])
expected = ["cats and dog", "cat sand dog"]
assert set(result) == set(expected)
print("PASS")'''},

    {"id": 37, "name": "sliding_window_maximum", "difficulty": "hard",
     "template": '''def max_sliding_window(nums, k):
    """Return max in each sliding window of size k."""
    pass

assert max_sliding_window([1,3,-1,-3,5,3,6,7], 3) == [3,3,5,5,6,7]
print("PASS")'''},

    {"id": 38, "name": "min_window_substring", "difficulty": "hard",
     "template": '''def min_window(s, t):
    """Minimum window containing all chars in t."""
    pass

assert min_window("ADOBECODEBANC", "ABC") == "BANC"
assert min_window("a", "a") == "a"
assert min_window("a", "aa") == ""
print("PASS")'''},

    {"id": 39, "name": "maximal_rectangle", "difficulty": "hard",
     "template": '''def maximal_rectangle(matrix):
    """Largest rectangle containing only 1s."""
    pass

matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]
assert maximal_rectangle(matrix) == 6
print("PASS")'''},

    {"id": 40, "name": "palindrome_partitioning_ii", "difficulty": "hard",
     "template": '''def min_cut(s):
    """Minimum cuts for palindrome partitioning."""
    pass

assert min_cut("aab") == 1
assert min_cut("a") == 0
assert min_cut("ab") == 1
print("PASS")'''},

    {"id": 41, "name": "n_queens", "difficulty": "hard",
     "template": '''def solve_n_queens(n):
    """Find all N-Queens solutions."""
    pass

result = solve_n_queens(4)
assert len(result) == 2
print("PASS")'''},

    {"id": 42, "name": "sudoku_solver", "difficulty": "hard",
     "template": '''def solve_sudoku(board):
    """Solve sudoku puzzle in-place."""
    pass

board = [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]
solve_sudoku(board)
assert board[0][2] == "4"
assert board[2][0] == "1"
print("PASS")'''},

    {"id": 43, "name": "word_search_ii", "difficulty": "hard",
     "template": '''def find_words(board, words):
    """Find all words in board."""
    pass

board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]]
words = ["oath","pea","eat","rain"]
result = find_words(board, words)
assert set(result) == {"eat", "oath"}
print("PASS")'''},

    {"id": 44, "name": "burst_balloons", "difficulty": "hard",
     "template": '''def max_coins(nums):
    """Maximum coins from bursting balloons."""
    pass

assert max_coins([3,1,5,8]) == 167
assert max_coins([1,5]) == 10
print("PASS")'''},

    {"id": 45, "name": "split_array_largest_sum", "difficulty": "hard",
     "template": '''def split_array(nums, k):
    """Minimize largest sum when splitting into k parts."""
    pass

assert split_array([7,2,5,10,8], 2) == 18
assert split_array([1,2,3,4,5], 2) == 9
print("PASS")'''},

    {"id": 46, "name": "distinct_subsequences", "difficulty": "hard",
     "template": '''def num_distinct(s, t):
    """Count distinct subsequences of s that equal t."""
    pass

assert num_distinct("rabbbit", "rabbit") == 3
assert num_distinct("babgbag", "bag") == 5
print("PASS")'''},

    {"id": 47, "name": "interleaving_string", "difficulty": "hard",
     "template": '''def is_interleave(s1, s2, s3):
    """Check if s3 is interleaving of s1 and s2."""
    pass

assert is_interleave("aabcc", "dbbca", "aadbbcbcac") == True
assert is_interleave("aabcc", "dbbca", "aadbbbaccc") == False
print("PASS")'''},

    {"id": 48, "name": "best_time_cooldown", "difficulty": "hard",
     "template": '''def max_profit(prices):
    """Max profit with cooldown after selling."""
    pass

assert max_profit([1,2,3,0,2]) == 3
assert max_profit([1]) == 0
print("PASS")'''},

    {"id": 49, "name": "dungeon_game", "difficulty": "hard",
     "template": '''def calculate_minimum_hp(dungeon):
    """Minimum initial HP to reach bottom-right."""
    pass

dungeon = [[-2,-3,3],[-5,-10,1],[10,30,-5]]
assert calculate_minimum_hp(dungeon) == 7
print("PASS")'''},

    {"id": 50, "name": "count_range_sum", "difficulty": "hard",
     "template": '''def count_range_sum(nums, lower, upper):
    """Count range sums within [lower, upper]."""
    pass

assert count_range_sum([-2,5,-1], -2, 2) == 3
assert count_range_sum([0], 0, 0) == 1
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


class MixedChallengeV3:
    def __init__(self):
        self.openhands = OpenHandsClient()
        self.generator = AgentCodeGenerator()
        self.challenges = ALL_CHALLENGES
        logger.info(f"MixedChallengeV3: {len(EASY_CHALLENGES)} easy + {len(INTERMEDIATE_CHALLENGES)} intermediate + {len(HARD_CHALLENGES)} hard = {len(self.challenges)} total")

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
        logger.info("GENESIS MIXED DIFFICULTY CHALLENGE V3 - 50 NEW TESTS")
        logger.info("10 Easy | 15 Intermediate | 25 Hard")
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
            logger.info(f"Easy: {easy_passed}/10 | Intermediate: {inter_passed}/15 | Hard: {hard_passed}/25 | Total: {total_passed}/50 ({total_passed * 2}%)")

            if total_passed > best_passed:
                best_passed = total_passed
                best_results = {"iteration": iteration, "easy_passed": easy_passed, "intermediate_passed": inter_passed, "hard_passed": hard_passed, "total_passed": total_passed, "total_reward": total_reward}

        await self.generator.close()

        logger.info("\nFINAL RESULTS")
        logger.info(f"Easy: {best_results['easy_passed']}/10 | Intermediate: {best_results['intermediate_passed']}/15 | Hard: {best_results['hard_passed']}/25")
        logger.info(f"Total: {best_results['total_passed']}/50 ({best_results['total_passed']*2}%)")

        output = {
            "iterations": iterations,
            "best_passed": best_results["total_passed"],
            "best_reward": best_results["total_reward"],
            "pass_rate": best_results["total_passed"] * 2,
            "breakdown": {
                "easy": {"passed": best_results["easy_passed"], "total": 10},
                "intermediate": {"passed": best_results["intermediate_passed"], "total": 15},
                "hard": {"passed": best_results["hard_passed"], "total": 25}
            },
            "llm_stats": self.generator.stats
        }

        output_path = Path("data/mixed_results_v3.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"\nResults saved to {output_path}")

        return output


async def main():
    parser = argparse.ArgumentParser(description="Genesis Mixed Difficulty Challenge V3")
    parser.add_argument("--iterations", type=int, default=1)
    args = parser.parse_args()
    challenge = MixedChallengeV3()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
