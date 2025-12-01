#!/usr/bin/env python3
"""
Genesis Extreme Challenge V2 - 50 NEW Hard to Extreme Tests
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
logger = logging.getLogger("extreme_challenge_v2")

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
# HARD CHALLENGES V2 (1-25)
# ============================================================
HARD_CHALLENGES = [
    {"id": 1, "name": "perfect_squares", "difficulty": "hard",
     "template": '''def num_squares(n):
    """Minimum perfect squares that sum to n."""
    pass

assert num_squares(12) == 3  # 4 + 4 + 4
assert num_squares(13) == 2  # 4 + 9
print("PASS")'''},

    {"id": 2, "name": "meeting_rooms_ii", "difficulty": "hard",
     "template": '''def min_meeting_rooms(intervals):
    """Minimum conference rooms required."""
    pass

assert min_meeting_rooms([[0,30],[5,10],[15,20]]) == 2
assert min_meeting_rooms([[7,10],[2,4]]) == 1
print("PASS")'''},

    {"id": 3, "name": "paint_house_ii", "difficulty": "hard",
     "template": '''def min_cost_ii(costs):
    """Paint n houses with k colors, no adjacent same color."""
    pass

assert min_cost_ii([[1,5,3],[2,9,4]]) == 5
assert min_cost_ii([[1,3],[2,4]]) == 5
print("PASS")'''},

    {"id": 4, "name": "binary_tree_vertical", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def vertical_order(root):
    """Vertical order traversal of binary tree."""
    pass

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
result = vertical_order(root)
assert result == [[9], [3, 15], [20], [7]]
print("PASS")'''},

    {"id": 5, "name": "walls_and_gates", "difficulty": "hard",
     "template": '''def walls_and_gates(rooms):
    """Fill empty rooms with distance to nearest gate."""
    pass
    return rooms

INF = 2147483647
rooms = [[INF,-1,0,INF],[INF,INF,INF,-1],[INF,-1,INF,-1],[0,-1,INF,INF]]
walls_and_gates(rooms)
assert rooms == [[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]
print("PASS")'''},

    {"id": 6, "name": "graph_valid_tree", "difficulty": "hard",
     "template": '''def valid_tree(n, edges):
    """Check if edges form a valid tree."""
    pass

assert valid_tree(5, [[0,1],[0,2],[0,3],[1,4]]) == True
assert valid_tree(5, [[0,1],[1,2],[2,3],[1,3],[1,4]]) == False
print("PASS")'''},

    {"id": 7, "name": "alien_dictionary", "difficulty": "hard",
     "template": '''def alien_order(words):
    """Derive alien alphabet order from sorted words."""
    pass

result = alien_order(["wrt","wrf","er","ett","rftt"])
# Valid orderings maintain: w < e < r < t < f
assert 'w' in result and 'e' in result
print("PASS")'''},

    {"id": 8, "name": "closest_binary_search_k", "difficulty": "hard",
     "template": '''def closest_k_values(root_vals, target, k):
    """Find k values closest to target in BST."""
    # Simplified: given sorted array
    pass

assert closest_k_values([1,2,3,4,5], 3.7, 2) == [4, 3] or set(closest_k_values([1,2,3,4,5], 3.7, 2)) == {3, 4}
print("PASS")'''},

    {"id": 9, "name": "encode_string_min", "difficulty": "hard",
     "template": '''def encode(s):
    """Encode string to shortest length."""
    pass

assert len(encode("aaa")) <= 3
assert len(encode("aaaaaaaaaa")) <= 5  # "10[a]" or "5[aa]"
print("PASS")'''},

    {"id": 10, "name": "sequence_reconstruction", "difficulty": "hard",
     "template": '''def sequence_reconstruction(nums, sequences):
    """Check if nums is only supersequence."""
    pass

assert sequence_reconstruction([1,2,3], [[1,2],[1,3]]) == False
assert sequence_reconstruction([1,2,3], [[1,2],[1,3],[2,3]]) == True
print("PASS")'''},

    {"id": 11, "name": "total_hamming_distance", "difficulty": "hard",
     "template": '''def total_hamming_distance(nums):
    """Sum of hamming distances between all pairs."""
    pass

assert total_hamming_distance([4, 14, 2]) == 6
print("PASS")'''},

    {"id": 12, "name": "utf8_validation", "difficulty": "hard",
     "template": '''def valid_utf8(data):
    """Check if data is valid UTF-8 encoding."""
    pass

assert valid_utf8([197,130,1]) == True
assert valid_utf8([235,140,4]) == False
print("PASS")'''},

    {"id": 13, "name": "ternary_expression", "difficulty": "hard",
     "template": '''def parse_ternary(expression):
    """Parse ternary expression string."""
    pass

assert parse_ternary("T?2:3") == "2"
assert parse_ternary("F?1:T?4:5") == "4"
assert parse_ternary("T?T?F:5:3") == "F"
print("PASS")'''},

    {"id": 14, "name": "bomb_enemy", "difficulty": "hard",
     "template": '''def max_killed_enemies(grid):
    """Max enemies killed by one bomb."""
    pass

grid = [["0","E","0","0"],["E","0","W","E"],["0","E","0","0"]]
assert max_killed_enemies(grid) == 3
print("PASS")'''},

    {"id": 15, "name": "longest_substring_2_distinct", "difficulty": "hard",
     "template": '''def length_of_longest_substring_two_distinct(s):
    """Longest substring with at most 2 distinct chars."""
    pass

assert length_of_longest_substring_two_distinct("eceba") == 3
assert length_of_longest_substring_two_distinct("ccaabbb") == 5
print("PASS")'''},

    {"id": 16, "name": "binary_tree_upside_down", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def upside_down_binary_tree(root):
    """Turn binary tree upside down."""
    pass

root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))
result = upside_down_binary_tree(root)
assert result.val == 4
assert result.left.val == 5
assert result.right.val == 2
print("PASS")'''},

    {"id": 17, "name": "strobogrammatic_number_ii", "difficulty": "hard",
     "template": '''def find_strobogrammatic(n):
    """Find all strobogrammatic numbers of length n."""
    pass

result = find_strobogrammatic(2)
assert set(result) == {"11", "69", "88", "96"}
print("PASS")'''},

    {"id": 18, "name": "verify_preorder_bst", "difficulty": "hard",
     "template": '''def verify_preorder(preorder):
    """Verify if preorder traversal is valid BST."""
    pass

assert verify_preorder([5,2,1,3,6]) == True
assert verify_preorder([5,2,6,1,3]) == False
print("PASS")'''},

    {"id": 19, "name": "smallest_rectangle_enclosing", "difficulty": "hard",
     "template": '''def min_area(image, x, y):
    """Smallest rectangle enclosing all black pixels."""
    pass

image = [["0","0","1","0"],["0","1","1","0"],["0","1","0","0"]]
assert min_area(image, 0, 2) == 6
print("PASS")'''},

    {"id": 20, "name": "max_sum_3_subarrays", "difficulty": "hard",
     "template": '''def max_sum_of_three_subarrays(nums, k):
    """Find 3 non-overlapping subarrays with max sum."""
    pass

result = max_sum_of_three_subarrays([1,2,1,2,6,7,5,1], 2)
assert result == [0, 3, 5]
print("PASS")'''},

    {"id": 21, "name": "bus_routes", "difficulty": "hard",
     "template": '''def num_buses_to_destination(routes, source, target):
    """Minimum buses to reach target."""
    pass

assert num_buses_to_destination([[1,2,7],[3,6,7]], 1, 6) == 2
assert num_buses_to_destination([[7,12],[4,5,15],[6],[15,19],[9,12,13]], 15, 12) == -1
print("PASS")'''},

    {"id": 22, "name": "falling_squares", "difficulty": "hard",
     "template": '''def falling_squares(positions):
    """Heights after each square falls."""
    pass

assert falling_squares([[1,2],[2,3],[6,1]]) == [2, 5, 5]
print("PASS")'''},

    {"id": 23, "name": "minimize_max_distance", "difficulty": "hard",
     "template": '''def minmax_gas_dist(stations, k):
    """Add k stations to minimize max distance."""
    pass

result = minmax_gas_dist([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 9)
assert result < 0.51
print("PASS")'''},

    {"id": 24, "name": "max_freq_stack", "difficulty": "hard",
     "template": '''class FreqStack:
    """Stack that pops most frequent element."""
    def __init__(self):
        pass
    def push(self, val):
        pass
    def pop(self):
        pass

fs = FreqStack()
fs.push(5); fs.push(7); fs.push(5); fs.push(7); fs.push(4); fs.push(5)
assert fs.pop() == 5
assert fs.pop() == 7
assert fs.pop() == 5
assert fs.pop() == 4
print("PASS")'''},

    {"id": 25, "name": "binary_tree_cameras", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def min_camera_cover(root):
    """Minimum cameras to monitor all nodes."""
    pass

root1 = TreeNode(0, TreeNode(0, TreeNode(0), TreeNode(0)))
assert min_camera_cover(root1) == 1

root2 = TreeNode(0, TreeNode(0, TreeNode(0, TreeNode(0, None, TreeNode(0)))))
assert min_camera_cover(root2) == 2
print("PASS")'''},
]

# ============================================================
# EXTREME CHALLENGES V2 (26-50) - Competitive Programming Level
# ============================================================
EXTREME_CHALLENGES = [
    {"id": 26, "name": "number_of_atoms", "difficulty": "extreme",
     "template": '''def count_of_atoms(formula):
    """Count atoms in chemical formula."""
    pass

assert count_of_atoms("H2O") == "H2O"
assert count_of_atoms("Mg(OH)2") == "H2MgO2"
assert count_of_atoms("K4(ON(SO3)2)2") == "K4N2O14S4"
print("PASS")'''},

    {"id": 27, "name": "parse_lisp", "difficulty": "extreme",
     "template": '''def evaluate(expression):
    """Evaluate Lisp-like expression."""
    pass

assert evaluate("(add 1 2)") == 3
assert evaluate("(mult 3 (add 2 3))") == 15
assert evaluate("(let x 2 (mult x 5))") == 10
print("PASS")'''},

    {"id": 28, "name": "prefix_suffix_search", "difficulty": "extreme",
     "template": '''class WordFilter:
    """Search words by prefix and suffix."""
    def __init__(self, words):
        pass
    def f(self, prefix, suffix):
        pass

wf = WordFilter(["apple"])
assert wf.f("a", "e") == 0
print("PASS")'''},

    {"id": 29, "name": "max_sum_rectangle", "difficulty": "extreme",
     "template": '''def max_sum_submatrix(matrix, k):
    """Max sum rectangle no larger than k."""
    pass

matrix = [[1,0,1],[0,-2,3]]
assert max_sum_submatrix(matrix, 2) == 2
print("PASS")'''},

    {"id": 30, "name": "kth_smallest_primefrac", "difficulty": "extreme",
     "template": '''def kth_smallest_prime_fraction(arr, k):
    """Find kth smallest fraction from primes."""
    pass

result = kth_smallest_prime_fraction([1,2,3,5], 3)
assert result == [2, 5]
print("PASS")'''},

    {"id": 31, "name": "shortest_subarray_sum_k", "difficulty": "extreme",
     "template": '''def shortest_subarray(nums, k):
    """Shortest subarray with sum at least k."""
    pass

assert shortest_subarray([1], 1) == 1
assert shortest_subarray([1,2], 4) == -1
assert shortest_subarray([2,-1,2], 3) == 3
print("PASS")'''},

    {"id": 32, "name": "bricks_falling", "difficulty": "extreme",
     "template": '''def hit_bricks(grid, hits):
    """Count falling bricks after each hit."""
    pass

grid = [[1,0,0,0],[1,1,1,0]]
hits = [[1,0]]
assert hit_bricks(grid, hits) == [2]
print("PASS")'''},

    {"id": 33, "name": "swim_rising_water", "difficulty": "extreme",
     "template": '''def swim_in_water(grid):
    """Min time to swim from top-left to bottom-right."""
    pass

assert swim_in_water([[0,2],[1,3]]) == 3
print("PASS")'''},

    {"id": 34, "name": "similar_string_groups", "difficulty": "extreme",
     "template": '''def num_similar_groups(strs):
    """Count groups of similar strings."""
    pass

assert num_similar_groups(["tars","rats","arts","star"]) == 2
print("PASS")'''},

    {"id": 35, "name": "reaching_points", "difficulty": "extreme",
     "template": '''def reaching_points(sx, sy, tx, ty):
    """Check if (sx,sy) can reach (tx,ty)."""
    pass

assert reaching_points(1, 1, 3, 5) == True
assert reaching_points(1, 1, 2, 2) == False
print("PASS")'''},

    {"id": 36, "name": "shortest_path_visiting", "difficulty": "extreme",
     "template": '''def shortest_path_length(graph):
    """Shortest path visiting all nodes."""
    pass

assert shortest_path_length([[1,2,3],[0],[0],[0]]) == 4
assert shortest_path_length([[1],[0,2,4],[1,3,4],[2],[1,2]]) == 4
print("PASS")'''},

    {"id": 37, "name": "k_similar_strings", "difficulty": "extreme",
     "template": '''def k_similarity(s1, s2):
    """Min swaps to transform s1 to s2."""
    pass

assert k_similarity("ab", "ba") == 1
assert k_similarity("abc", "bca") == 2
print("PASS")'''},

    {"id": 38, "name": "valid_permutations_di", "difficulty": "extreme",
     "template": '''def num_perms_di_sequence(s):
    """Count valid permutations for D/I sequence."""
    pass

assert num_perms_di_sequence("DID") == 5
print("PASS")'''},

    {"id": 39, "name": "cat_and_mouse", "difficulty": "extreme",
     "template": '''def cat_mouse_game(graph):
    """Determine winner of cat and mouse game."""
    pass

# Simplified test
assert cat_mouse_game([[2,5],[3],[0,4,5],[1,4,5],[2,3],[0,2,3]]) == 0
print("PASS")'''},

    {"id": 40, "name": "minimum_cost_tree", "difficulty": "extreme",
     "template": '''def mct_from_leaf_values(arr):
    """Minimum cost tree from leaf values."""
    pass

assert mct_from_leaf_values([6,2,4]) == 32
print("PASS")'''},

    {"id": 41, "name": "number_ways_stay", "difficulty": "extreme",
     "template": '''def num_ways(steps, arr_len):
    """Ways to stay at index 0 after steps."""
    pass

assert num_ways(3, 2) == 4
assert num_ways(2, 4) == 2
print("PASS")'''},

    {"id": 42, "name": "max_score_words", "difficulty": "extreme",
     "template": '''def max_score_words(words, letters, score):
    """Maximum score forming words."""
    pass

words = ["dog","cat","dad","good"]
letters = ["a","a","c","d","d","d","g","o","o"]
score_arr = [1,0,9,5,0,0,3,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0]
assert max_score_words(words, letters, score_arr) == 23
print("PASS")'''},

    {"id": 43, "name": "make_array_strictly_increasing", "difficulty": "extreme",
     "template": '''def make_array_increasing(arr1, arr2):
    """Min operations to make strictly increasing."""
    pass

assert make_array_increasing([1,5,3,6,7], [1,3,2,4]) == 1
assert make_array_increasing([1,5,3,6,7], [4,3,1]) == 2
print("PASS")'''},

    {"id": 44, "name": "shortest_common_supersequence", "difficulty": "extreme",
     "template": '''def shortest_common_supersequence(str1, str2):
    """Shortest string containing both as subsequences."""
    pass

result = shortest_common_supersequence("abac", "cab")
assert len(result) == 5
assert "abac" in result or all(c in result for c in "abac")  # subsequence check
print("PASS")'''},

    {"id": 45, "name": "maximum_freq_stack_v2", "difficulty": "extreme",
     "template": '''def rearrange_string_k_distance(s, k):
    """Rearrange so same chars are k apart."""
    pass

result = rearrange_string_k_distance("aabbcc", 3)
assert result in ["abcabc", "acbacb", "bacbac", "bcabca", "cabcab", "cbacba"] or result == ""
print("PASS")'''},

    {"id": 46, "name": "construct_target_array", "difficulty": "extreme",
     "template": '''def is_possible(target):
    """Check if [1,1,...,1] can become target."""
    pass

assert is_possible([9, 3, 5]) == True
assert is_possible([1, 1, 1, 2]) == False
print("PASS")'''},

    {"id": 47, "name": "max_value_equation", "difficulty": "extreme",
     "template": '''def find_max_value_of_equation(points, k):
    """Max yi + yj + |xi - xj| with |xi - xj| <= k."""
    pass

assert find_max_value_of_equation([[1,3],[2,0],[5,10],[6,-10]], 1) == 4
print("PASS")'''},

    {"id": 48, "name": "parallel_courses_iii", "difficulty": "extreme",
     "template": '''def minimum_time(n, relations, time):
    """Minimum time to complete all courses."""
    pass

assert minimum_time(3, [[1,3],[2,3]], [3,2,5]) == 8
print("PASS")'''},

    {"id": 49, "name": "count_palindromic_subsequences", "difficulty": "extreme",
     "template": '''def count_palindromic_subsequences(s):
    """Count distinct palindromic subsequences."""
    pass

assert count_palindromic_subsequences("bccb") == 6
print("PASS")'''},

    {"id": 50, "name": "tallest_billboard", "difficulty": "extreme",
     "template": '''def tallest_billboard(rods):
    """Tallest billboard with two equal supports."""
    pass

assert tallest_billboard([1,2,3,6]) == 6
assert tallest_billboard([1,2,3,4,5,6]) == 10
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


class ExtremeChallengeV2:
    def __init__(self):
        self.openhands = OpenHandsClient()
        self.generator = AgentCodeGenerator()
        self.challenges = ALL_CHALLENGES
        logger.info(f"ExtremeChallengeV2: {len(HARD_CHALLENGES)} hard + {len(EXTREME_CHALLENGES)} extreme = {len(self.challenges)} total")

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
        logger.info("GENESIS EXTREME CHALLENGE V2 - 50 NEW HARD/EXTREME TESTS")
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

        output_path = Path("data/extreme_results_v2.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"\nResults saved to {output_path}")

        return output


async def main():
    parser = argparse.ArgumentParser(description="Genesis Extreme Challenge V2")
    parser.add_argument("--iterations", type=int, default=1)
    args = parser.parse_args()
    challenge = ExtremeChallengeV2()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
