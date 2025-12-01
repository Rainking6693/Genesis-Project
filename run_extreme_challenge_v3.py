#!/usr/bin/env python3
"""
Genesis Extreme Challenge V3 - 50 NEW Hard to Extreme Tests
25 Hard | 25 Extreme (Competitive Programming Level)

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
logger = logging.getLogger("extreme_challenge_v3")

MISTRAL_API_KEY = "xBClmFrEWnHJcdrxjJU65frPPXytIYKK"
GEMINI_API_KEY = "AIzaSyDOYNHjGyhEgvKU0SlfXDGdnqUiWE4_6lE"

from infrastructure.openhands_local import OpenHandsClient


def compute_reward(code: str, result: dict, challenge: dict) -> float:
    passed = result.get("passed", False)
    difficulty = challenge.get("difficulty", "hard")
    difficulty_weights = {"hard": 2.5, "extreme": 4.0}
    base_weight = difficulty_weights.get(difficulty, 2.5)
    if passed:
        return 1.5 * base_weight
    else:
        has_impl = "pass" not in code.lower() or len(code) > len(challenge.get("template", ""))
        return 0.3 * base_weight if has_impl else 0.1 * base_weight


# ============================================================
# HARD CHALLENGES V3 (1-25)
# ============================================================
HARD_CHALLENGES = [
    {"id": 1, "name": "word_pattern_ii", "difficulty": "hard",
     "template": '''def word_pattern_match(pattern, s):
    """Check if s follows pattern with bijection."""
    pass

assert word_pattern_match("abab", "redblueredblue") == True
assert word_pattern_match("aaaa", "asdasdasdasd") == True
assert word_pattern_match("aabb", "xyzabcxzyabc") == False
print("PASS")'''},

    {"id": 2, "name": "count_unique_bst", "difficulty": "hard",
     "template": '''def num_trees(n):
    """Count structurally unique BSTs with n nodes."""
    pass

assert num_trees(3) == 5
assert num_trees(4) == 14
assert num_trees(1) == 1
print("PASS")'''},

    {"id": 3, "name": "longest_substring_k_distinct", "difficulty": "hard",
     "template": '''def length_of_longest_substring_k_distinct(s, k):
    """Longest substring with at most k distinct characters."""
    pass

assert length_of_longest_substring_k_distinct("eceba", 2) == 3
assert length_of_longest_substring_k_distinct("aa", 1) == 2
print("PASS")'''},

    {"id": 4, "name": "alien_dict_derive", "difficulty": "hard",
     "template": '''def alien_order(words):
    """Derive alphabet order from alien dictionary."""
    pass

result = alien_order(["wrt","wrf","er","ett","rftt"])
assert result != ""
assert result.index('w') < result.index('e') < result.index('r')
print("PASS")'''},

    {"id": 5, "name": "range_module", "difficulty": "hard",
     "template": '''class RangeModule:
    def __init__(self):
        pass
    def add_range(self, left, right):
        pass
    def query_range(self, left, right):
        pass
    def remove_range(self, left, right):
        pass

rm = RangeModule()
rm.add_range(10, 20)
rm.remove_range(14, 16)
assert rm.query_range(10, 14) == True
assert rm.query_range(13, 15) == False
assert rm.query_range(16, 17) == True
print("PASS")'''},

    {"id": 6, "name": "max_sum_rectangle_k", "difficulty": "hard",
     "template": '''def max_sum_submatrix(matrix, k):
    """Max sum of rectangle no larger than k."""
    pass

matrix = [[1,0,1],[0,-2,3]]
assert max_sum_submatrix(matrix, 2) == 2
print("PASS")'''},

    {"id": 7, "name": "find_celebrity", "difficulty": "hard",
     "template": '''def find_celebrity(n, knows):
    """Find celebrity (known by all, knows no one)."""
    pass

# knows[i][j] = True means i knows j
knows1 = [[False,True,True],[False,False,False],[False,True,False]]
assert find_celebrity(3, knows1) == 1
print("PASS")'''},

    {"id": 8, "name": "smallest_range_k_lists", "difficulty": "hard",
     "template": '''def smallest_range(nums):
    """Smallest range containing at least one from each list."""
    pass

result = smallest_range([[4,10,15,24,26],[0,9,12,20],[5,18,22,30]])
assert result == [20, 24]
print("PASS")'''},

    {"id": 9, "name": "valid_number", "difficulty": "hard",
     "template": '''def is_number(s):
    """Check if string is valid number."""
    pass

assert is_number("2") == True
assert is_number("0089") == True
assert is_number("-0.1") == True
assert is_number("+3.14") == True
assert is_number("-.9") == True
assert is_number("2e10") == True
assert is_number("-90E3") == True
assert is_number("abc") == False
assert is_number("1a") == False
assert is_number("e3") == False
assert is_number("--6") == False
print("PASS")'''},

    {"id": 10, "name": "binary_tree_postorder", "difficulty": "hard",
     "template": '''def postorder_traversal_iterative(root_vals):
    """Iterative postorder traversal (given as array)."""
    # Build tree from array (level order)
    pass

# [1, null, 2, 3] -> [3, 2, 1]
assert postorder_traversal_iterative([1, None, 2, 3]) == [3, 2, 1]
print("PASS")'''},

    {"id": 11, "name": "max_freq_char_after_k", "difficulty": "hard",
     "template": '''def character_replacement(s, k):
    """Longest substring with same char after k replacements."""
    pass

assert character_replacement("ABAB", 2) == 4
assert character_replacement("AABABBA", 1) == 4
print("PASS")'''},

    {"id": 12, "name": "pacific_atlantic", "difficulty": "hard",
     "template": '''def pacific_atlantic(heights):
    """Find cells that can flow to both oceans."""
    pass

heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]
result = pacific_atlantic(heights)
expected = [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]
assert sorted(result) == sorted(expected)
print("PASS")'''},

    {"id": 13, "name": "zigzag_iterator", "difficulty": "hard",
     "template": '''class ZigzagIterator:
    def __init__(self, v1, v2):
        pass
    def next(self):
        pass
    def has_next(self):
        pass

it = ZigzagIterator([1, 2], [3, 4, 5, 6])
result = []
while it.has_next():
    result.append(it.next())
assert result == [1, 3, 2, 4, 5, 6]
print("PASS")'''},

    {"id": 14, "name": "find_right_interval", "difficulty": "hard",
     "template": '''def find_right_interval(intervals):
    """Find right interval for each interval."""
    pass

assert find_right_interval([[1,2]]) == [-1]
assert find_right_interval([[3,4],[2,3],[1,2]]) == [-1, 0, 1]
assert find_right_interval([[1,4],[2,3],[3,4]]) == [-1, 2, -1]
print("PASS")'''},

    {"id": 15, "name": "split_array_consecutive", "difficulty": "hard",
     "template": '''def is_possible(nums):
    """Split into consecutive subsequences of length >= 3."""
    pass

assert is_possible([1,2,3,3,4,5]) == True
assert is_possible([1,2,3,3,4,4,5,5]) == True
assert is_possible([1,2,3,4,4,5]) == False
print("PASS")'''},

    {"id": 16, "name": "maximum_xor", "difficulty": "hard",
     "template": '''def find_maximum_xor(nums):
    """Maximum XOR of two elements."""
    pass

assert find_maximum_xor([3,10,5,25,2,8]) == 28
assert find_maximum_xor([14,70,53,83,49,91,36,80,92,51,66,70]) == 127
print("PASS")'''},

    {"id": 17, "name": "count_submatrices_k", "difficulty": "hard",
     "template": '''def num_submatrix_sum_target(matrix, target):
    """Count submatrices that sum to target."""
    pass

matrix = [[0,1,0],[1,1,1],[0,1,0]]
assert num_submatrix_sum_target(matrix, 0) == 4
print("PASS")'''},

    {"id": 18, "name": "scramble_string", "difficulty": "hard",
     "template": '''def is_scramble(s1, s2):
    """Check if s2 is scrambled string of s1."""
    pass

assert is_scramble("great", "rgeat") == True
assert is_scramble("abcde", "caebd") == False
assert is_scramble("a", "a") == True
print("PASS")'''},

    {"id": 19, "name": "frog_jump", "difficulty": "hard",
     "template": '''def can_cross(stones):
    """Check if frog can cross the river."""
    pass

assert can_cross([0,1,3,5,6,8,12,17]) == True
assert can_cross([0,1,2,3,4,8,9,11]) == False
print("PASS")'''},

    {"id": 20, "name": "russian_doll_envelopes", "difficulty": "hard",
     "template": '''def max_envelopes(envelopes):
    """Maximum nested envelopes."""
    pass

assert max_envelopes([[5,4],[6,4],[6,7],[2,3]]) == 3
assert max_envelopes([[1,1],[1,1],[1,1]]) == 1
print("PASS")'''},

    {"id": 21, "name": "super_egg_drop", "difficulty": "hard",
     "template": '''def super_egg_drop(k, n):
    """Minimum moves to find critical floor."""
    pass

assert super_egg_drop(1, 2) == 2
assert super_egg_drop(2, 6) == 3
assert super_egg_drop(3, 14) == 4
print("PASS")'''},

    {"id": 22, "name": "candy_distribution", "difficulty": "hard",
     "template": '''def candy(ratings):
    """Minimum candies to give (neighbors comparison)."""
    pass

assert candy([1,0,2]) == 5
assert candy([1,2,2]) == 4
print("PASS")'''},

    {"id": 23, "name": "kth_ancestor_tree", "difficulty": "hard",
     "template": '''class TreeAncestor:
    def __init__(self, n, parent):
        pass
    def get_kth_ancestor(self, node, k):
        pass

ta = TreeAncestor(7, [-1, 0, 0, 1, 1, 2, 2])
assert ta.get_kth_ancestor(3, 1) == 1
assert ta.get_kth_ancestor(5, 2) == 0
assert ta.get_kth_ancestor(6, 3) == -1
print("PASS")'''},

    {"id": 24, "name": "longest_happy_prefix", "difficulty": "hard",
     "template": '''def longest_prefix(s):
    """Longest happy prefix (also suffix but not whole string)."""
    pass

assert longest_prefix("level") == "l"
assert longest_prefix("ababab") == "abab"
assert longest_prefix("leetcodeleet") == "leet"
print("PASS")'''},

    {"id": 25, "name": "minimum_insertion_palindrome", "difficulty": "hard",
     "template": '''def min_insertions(s):
    """Minimum insertions to make palindrome."""
    pass

assert min_insertions("zzazz") == 0
assert min_insertions("mbadm") == 2
assert min_insertions("leetcode") == 5
print("PASS")'''},
]

# ============================================================
# EXTREME CHALLENGES V3 (26-50) - Competitive Programming Level
# ============================================================
EXTREME_CHALLENGES = [
    {"id": 26, "name": "substring_concatenation", "difficulty": "extreme",
     "template": '''def find_substring(s, words):
    """Find starting indices of concatenation of all words."""
    pass

assert sorted(find_substring("barfoothefoobarman", ["foo","bar"])) == [0, 9]
assert find_substring("wordgoodgoodgoodbestword", ["word","good","best","word"]) == []
print("PASS")'''},

    {"id": 27, "name": "perfect_rectangle", "difficulty": "extreme",
     "template": '''def is_rectangle_cover(rectangles):
    """Check if rectangles form perfect rectangle."""
    pass

assert is_rectangle_cover([[1,1,3,3],[3,1,4,2],[3,2,4,4],[1,3,2,4],[2,3,3,4]]) == True
assert is_rectangle_cover([[1,1,2,3],[1,3,2,4],[3,1,4,2],[3,2,4,4]]) == False
print("PASS")'''},

    {"id": 28, "name": "maximum_gap", "difficulty": "extreme",
     "template": '''def maximum_gap(nums):
    """Maximum gap between successive elements when sorted."""
    pass

assert maximum_gap([3,6,9,1]) == 3
assert maximum_gap([10]) == 0
print("PASS")'''},

    {"id": 29, "name": "palindrome_pairs_v2", "difficulty": "extreme",
     "template": '''def palindrome_pairs(words):
    """Find all palindrome pairs."""
    pass

result = palindrome_pairs(["bat","tab","cat"])
expected = [[0,1],[1,0]]
assert sorted(result) == sorted(expected)
print("PASS")'''},

    {"id": 30, "name": "count_smaller_after_self", "difficulty": "extreme",
     "template": '''def count_smaller(nums):
    """Count smaller elements to the right."""
    pass

assert count_smaller([5,2,6,1]) == [2, 1, 1, 0]
assert count_smaller([-1]) == [0]
print("PASS")'''},

    {"id": 31, "name": "remove_boxes", "difficulty": "extreme",
     "template": '''def remove_boxes(boxes):
    """Max points from removing consecutive same-color boxes."""
    pass

assert remove_boxes([1,3,2,2,2,3,4,3,1]) == 23
print("PASS")'''},

    {"id": 32, "name": "self_crossing", "difficulty": "extreme",
     "template": '''def is_self_crossing(distance):
    """Check if path crosses itself."""
    pass

assert is_self_crossing([2,1,1,2]) == True
assert is_self_crossing([1,2,3,4]) == False
assert is_self_crossing([1,1,1,1]) == True
print("PASS")'''},

    {"id": 33, "name": "data_stream_median", "difficulty": "extreme",
     "template": '''class MedianFinder:
    def __init__(self):
        pass
    def add_num(self, num):
        pass
    def find_median(self):
        pass

mf = MedianFinder()
mf.add_num(1)
mf.add_num(2)
assert mf.find_median() == 1.5
mf.add_num(3)
assert mf.find_median() == 2.0
print("PASS")'''},

    {"id": 34, "name": "count_range_sum_v2", "difficulty": "extreme",
     "template": '''def count_range_sum(nums, lower, upper):
    """Count range sums in [lower, upper]."""
    pass

assert count_range_sum([-2, 5, -1], -2, 2) == 3
print("PASS")'''},

    {"id": 35, "name": "subarrays_k_diff", "difficulty": "extreme",
     "template": '''def subarrays_with_k_distinct(nums, k):
    """Count subarrays with exactly k distinct integers."""
    pass

assert subarrays_with_k_distinct([1,2,1,2,3], 2) == 7
assert subarrays_with_k_distinct([1,2,1,3,4], 3) == 3
print("PASS")'''},

    {"id": 36, "name": "sum_distances_tree", "difficulty": "extreme",
     "template": '''def sum_of_distances_in_tree(n, edges):
    """Sum of distances to all nodes for each node."""
    pass

result = sum_of_distances_in_tree(6, [[0,1],[0,2],[2,3],[2,4],[2,5]])
assert result == [8,12,6,10,10,10]
print("PASS")'''},

    {"id": 37, "name": "minimum_cost_tickets", "difficulty": "extreme",
     "template": '''def mincost_tickets(days, costs):
    """Minimum cost to travel on given days."""
    pass

assert mincost_tickets([1,4,6,7,8,20], [2,7,15]) == 11
assert mincost_tickets([1,2,3,4,5,6,7,8,9,10,30,31], [2,7,15]) == 17
print("PASS")'''},

    {"id": 38, "name": "critical_routers", "difficulty": "extreme",
     "template": '''def critical_routers(n, connections):
    """Find articulation points in network."""
    pass

result = critical_routers(5, [[0,1],[1,2],[2,0],[1,3],[3,4]])
assert set(result) == {1, 3}
print("PASS")'''},

    {"id": 39, "name": "binary_tree_codec_bst", "difficulty": "extreme",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def serialize_bst(root):
    pass

def deserialize_bst(data):
    pass

root = TreeNode(2, TreeNode(1), TreeNode(3))
data = serialize_bst(root)
new_root = deserialize_bst(data)
assert new_root.val == 2
assert new_root.left.val == 1
assert new_root.right.val == 3
print("PASS")'''},

    {"id": 40, "name": "max_profit_job_schedule", "difficulty": "extreme",
     "template": '''def job_scheduling(start_time, end_time, profit):
    """Maximum profit from non-overlapping jobs."""
    pass

assert job_scheduling([1,2,3,3], [3,4,5,6], [50,10,40,70]) == 120
assert job_scheduling([1,2,3,4,6], [3,5,10,6,9], [20,20,100,70,60]) == 150
print("PASS")'''},

    {"id": 41, "name": "min_cost_connect_sticks", "difficulty": "extreme",
     "template": '''def connect_sticks(sticks):
    """Minimum cost to connect all sticks."""
    pass

assert connect_sticks([2,4,3]) == 14
assert connect_sticks([1,8,3,5]) == 30
print("PASS")'''},

    {"id": 42, "name": "recover_tree_preorder", "difficulty": "extreme",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def recover_from_preorder(traversal):
    """Recover tree from depth-dash string."""
    pass

root = recover_from_preorder("1-2--3--4-5--6--7")
assert root.val == 1
assert root.left.val == 2
assert root.right.val == 5
print("PASS")'''},

    {"id": 43, "name": "min_refuel_stops", "difficulty": "extreme",
     "template": '''def min_refuel_stops(target, start_fuel, stations):
    """Minimum refuel stops to reach target."""
    pass

assert min_refuel_stops(1, 1, []) == 0
assert min_refuel_stops(100, 10, [[10,60],[20,30],[30,30],[60,40]]) == 2
print("PASS")'''},

    {"id": 44, "name": "shortest_superstring", "difficulty": "extreme",
     "template": '''def shortest_superstring(words):
    """Shortest string containing all words."""
    pass

result = shortest_superstring(["alex","loves","leetcode"])
assert "alex" in result and "loves" in result and "leetcode" in result
assert len(result) <= len("alexlovesleetcode")
print("PASS")'''},

    {"id": 45, "name": "transform_array", "difficulty": "extreme",
     "template": '''def transform_array(arr):
    """Transform array until stable."""
    pass

assert transform_array([6,2,3,4]) == [6,3,3,4]
assert transform_array([1,6,3,4,3,5]) == [1,4,4,4,4,5]
print("PASS")'''},

    {"id": 46, "name": "minimize_malware_spread", "difficulty": "extreme",
     "template": '''def min_malware_spread(graph, initial):
    """Node to remove to minimize malware spread."""
    pass

graph = [[1,1,0],[1,1,0],[0,0,1]]
assert min_malware_spread(graph, [0,1]) == 0
print("PASS")'''},

    {"id": 47, "name": "cherry_pickup_ii", "difficulty": "extreme",
     "template": '''def cherry_pickup(grid):
    """Maximum cherries with two robots."""
    pass

grid = [[3,1,1],[2,5,1],[1,5,5],[2,1,1]]
assert cherry_pickup(grid) == 24
print("PASS")'''},

    {"id": 48, "name": "zuma_game", "difficulty": "extreme",
     "template": '''def find_min_step(board, hand):
    """Minimum balls to clear the board."""
    pass

assert find_min_step("WRRBBW", "RB") == -1
assert find_min_step("WWRRBBWW", "WRBRW") == 2
print("PASS")'''},

    {"id": 49, "name": "count_vowels_permutation", "difficulty": "extreme",
     "template": '''def count_vowel_permutation(n):
    """Count strings of length n following vowel rules."""
    pass

assert count_vowel_permutation(1) == 5
assert count_vowel_permutation(2) == 10
assert count_vowel_permutation(5) == 68
print("PASS")'''},

    {"id": 50, "name": "find_kth_number", "difficulty": "extreme",
     "template": '''def find_kth_number(n, k):
    """Kth number in lexicographical order."""
    pass

assert find_kth_number(13, 2) == 10
assert find_kth_number(1, 1) == 1
print("PASS")'''},
]

ALL_CHALLENGES = HARD_CHALLENGES + EXTREME_CHALLENGES


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


class ExtremeChallengeV3:
    def __init__(self):
        self.openhands = OpenHandsClient()
        self.generator = AgentCodeGenerator()
        self.challenges = ALL_CHALLENGES
        logger.info(f"ExtremeChallengeV3: {len(HARD_CHALLENGES)} hard + {len(EXTREME_CHALLENGES)} extreme = {len(self.challenges)} total")

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
        logger.info("GENESIS EXTREME CHALLENGE V3 - 50 NEW HARD/EXTREME TESTS")
        logger.info("25 Hard | 25 Extreme")
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

            hard_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "hard")
            extreme_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "extreme")
            total_passed = hard_passed + extreme_passed
            total_reward = sum(r["reward"] for r in results)

            logger.info(f"\n--- Iteration {iteration} ---")
            logger.info(f"Hard: {hard_passed}/25 | Extreme: {extreme_passed}/25 | Total: {total_passed}/50 ({total_passed * 2}%)")

            if total_passed > best_passed:
                best_passed = total_passed
                best_results = {"iteration": iteration, "hard_passed": hard_passed, "extreme_passed": extreme_passed, "total_passed": total_passed, "total_reward": total_reward}

        await self.generator.close()

        logger.info("\nFINAL RESULTS")
        logger.info(f"Hard: {best_results['hard_passed']}/25 | Extreme: {best_results['extreme_passed']}/25 | Total: {best_results['total_passed']}/50")

        output = {
            "iterations": iterations,
            "best_passed": best_results["total_passed"],
            "best_reward": best_results["total_reward"],
            "pass_rate": best_results["total_passed"] * 2,
            "breakdown": {"hard": {"passed": best_results["hard_passed"], "total": 25}, "extreme": {"passed": best_results["extreme_passed"], "total": 25}},
            "llm_stats": self.generator.stats
        }

        output_path = Path("data/extreme_results_v3.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"\nResults saved to {output_path}")

        return output


async def main():
    parser = argparse.ArgumentParser(description="Genesis Extreme Challenge V3")
    parser.add_argument("--iterations", type=int, default=1)
    args = parser.parse_args()
    challenge = ExtremeChallengeV3()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
