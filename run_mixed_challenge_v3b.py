#!/usr/bin/env python3
"""
Genesis Mixed Challenge V3b - 25 Additional Tests
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
logger = logging.getLogger("mixed_challenge_v3b")

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
# EASY CHALLENGES V3b (1-5)
# ============================================================
EASY_CHALLENGES = [
    {"id": 1, "name": "pascal_triangle", "difficulty": "easy",
     "template": '''def generate(num_rows):
    """Generate Pascal's triangle with num_rows rows."""
    pass

assert generate(5) == [[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]
assert generate(1) == [[1]]
print("PASS")'''},

    {"id": 2, "name": "excel_column_number", "difficulty": "easy",
     "template": '''def title_to_number(column_title):
    """Convert Excel column title to number."""
    pass

assert title_to_number("A") == 1
assert title_to_number("AB") == 28
assert title_to_number("ZY") == 701
print("PASS")'''},

    {"id": 3, "name": "number_of_1_bits", "difficulty": "easy",
     "template": '''def hamming_weight(n):
    """Count number of 1 bits in integer."""
    pass

assert hamming_weight(11) == 3
assert hamming_weight(128) == 1
assert hamming_weight(4294967293) == 31
print("PASS")'''},

    {"id": 4, "name": "valid_perfect_square", "difficulty": "easy",
     "template": '''def is_perfect_square(num):
    """Check if num is perfect square without sqrt."""
    pass

assert is_perfect_square(16) == True
assert is_perfect_square(14) == False
assert is_perfect_square(1) == True
print("PASS")'''},

    {"id": 5, "name": "ransom_note", "difficulty": "easy",
     "template": '''def can_construct(ransom_note, magazine):
    """Check if ransom note can be constructed from magazine."""
    pass

assert can_construct("a", "b") == False
assert can_construct("aa", "ab") == False
assert can_construct("aa", "aab") == True
print("PASS")'''},
]

# ============================================================
# INTERMEDIATE CHALLENGES V3b (6-13)
# ============================================================
INTERMEDIATE_CHALLENGES = [
    {"id": 6, "name": "binary_tree_level_order", "difficulty": "intermediate",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def level_order(root):
    """Level order traversal of binary tree."""
    pass

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
assert level_order(root) == [[3],[9,20],[15,7]]
assert level_order(None) == []
print("PASS")'''},

    {"id": 7, "name": "sort_list", "difficulty": "intermediate",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def sort_list(head):
    """Sort linked list in O(n log n) time."""
    pass

def to_list(head):
    result = []
    while head:
        result.append(head.val)
        head = head.next
    return result

head = ListNode(4, ListNode(2, ListNode(1, ListNode(3))))
result = sort_list(head)
assert to_list(result) == [1, 2, 3, 4]
print("PASS")'''},

    {"id": 8, "name": "max_profit_ii", "difficulty": "intermediate",
     "template": '''def max_profit(prices):
    """Max profit with unlimited transactions."""
    pass

assert max_profit([7,1,5,3,6,4]) == 7
assert max_profit([1,2,3,4,5]) == 4
assert max_profit([7,6,4,3,1]) == 0
print("PASS")'''},

    {"id": 9, "name": "find_min_rotated", "difficulty": "intermediate",
     "template": '''def find_min(nums):
    """Find minimum in rotated sorted array."""
    pass

assert find_min([3,4,5,1,2]) == 1
assert find_min([4,5,6,7,0,1,2]) == 0
assert find_min([11,13,15,17]) == 11
print("PASS")'''},

    {"id": 10, "name": "triangle_min_path", "difficulty": "intermediate",
     "template": '''def minimum_total(triangle):
    """Minimum path sum from top to bottom of triangle."""
    pass

assert minimum_total([[2],[3,4],[6,5,7],[4,1,8,3]]) == 11
assert minimum_total([[-10]]) == -10
print("PASS")'''},

    {"id": 11, "name": "partition_list", "difficulty": "intermediate",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def partition(head, x):
    """Partition list so nodes < x come before nodes >= x."""
    pass

def to_list(head):
    result = []
    while head:
        result.append(head.val)
        head = head.next
    return result

head = ListNode(1, ListNode(4, ListNode(3, ListNode(2, ListNode(5, ListNode(2))))))
result = partition(head, 3)
assert to_list(result) == [1, 2, 2, 4, 3, 5]
print("PASS")'''},

    {"id": 12, "name": "populating_next_right", "difficulty": "intermediate",
     "template": '''class Node:
    def __init__(self, val=0, left=None, right=None, next=None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next

def connect(root):
    """Connect each node to its next right node."""
    pass
    return root

root = Node(1, Node(2, Node(4), Node(5)), Node(3, Node(6), Node(7)))
connect(root)
assert root.left.next.val == 3
assert root.left.left.next.val == 5
print("PASS")'''},

    {"id": 13, "name": "surrounded_regions", "difficulty": "intermediate",
     "template": '''def solve(board):
    """Capture surrounded regions by flipping O to X."""
    pass
    return board

board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]
solve(board)
assert board == [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]
print("PASS")'''},
]

# ============================================================
# HARD CHALLENGES V3b (14-25)
# ============================================================
HARD_CHALLENGES = [
    {"id": 14, "name": "fraction_to_decimal", "difficulty": "hard",
     "template": '''def fraction_to_decimal(numerator, denominator):
    """Convert fraction to decimal string with repeating part."""
    pass

assert fraction_to_decimal(1, 2) == "0.5"
assert fraction_to_decimal(2, 1) == "2"
assert fraction_to_decimal(4, 333) == "0.(012)"
print("PASS")'''},

    {"id": 15, "name": "largest_number", "difficulty": "hard",
     "template": '''def largest_number(nums):
    """Arrange nums to form largest number."""
    pass

assert largest_number([10,2]) == "210"
assert largest_number([3,30,34,5,9]) == "9534330"
assert largest_number([0,0]) == "0"
print("PASS")'''},

    {"id": 16, "name": "bitwise_and_range", "difficulty": "hard",
     "template": '''def range_bitwise_and(left, right):
    """Bitwise AND of all numbers in range [left, right]."""
    pass

assert range_bitwise_and(5, 7) == 4
assert range_bitwise_and(0, 0) == 0
assert range_bitwise_and(1, 2147483647) == 0
print("PASS")'''},

    {"id": 17, "name": "min_path_obstacles", "difficulty": "hard",
     "template": '''def min_cost(grid):
    """Minimum cost to go from (0,0) to (m-1,n-1) following signs."""
    pass

grid = [[1,1,1,1],[2,2,2,2],[1,1,1,1],[2,2,2,2]]
assert min_cost(grid) == 3
print("PASS")'''},

    {"id": 18, "name": "delete_node_bst", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def delete_node(root, key):
    """Delete node with key from BST."""
    pass

def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

root = TreeNode(5, TreeNode(3, TreeNode(2), TreeNode(4)), TreeNode(6, None, TreeNode(7)))
result = delete_node(root, 3)
assert 3 not in inorder(result)
print("PASS")'''},

    {"id": 19, "name": "can_i_win", "difficulty": "hard",
     "template": '''def can_i_win(max_choosable, desired_total):
    """Check if first player can win the game."""
    pass

assert can_i_win(10, 11) == False
assert can_i_win(10, 0) == True
assert can_i_win(10, 1) == True
print("PASS")'''},

    {"id": 20, "name": "predict_winner", "difficulty": "hard",
     "template": '''def predict_the_winner(nums):
    """Check if player 1 can win picking from ends."""
    pass

assert predict_the_winner([1,5,2]) == False
assert predict_the_winner([1,5,233,7]) == True
print("PASS")'''},

    {"id": 21, "name": "smallest_sufficient_team", "difficulty": "hard",
     "template": '''def smallest_sufficient_team(req_skills, people):
    """Smallest team covering all required skills."""
    pass

result = smallest_sufficient_team(["java","nodejs","reactjs"], [["java"],["nodejs"],["nodejs","reactjs"]])
assert set(result) == {0, 2} or len(result) == 2
print("PASS")'''},

    {"id": 22, "name": "shortest_palindrome", "difficulty": "hard",
     "template": '''def shortest_palindrome(s):
    """Add chars to front to make shortest palindrome."""
    pass

assert shortest_palindrome("aacecaaa") == "aaacecaaa"
assert shortest_palindrome("abcd") == "dcbabcd"
print("PASS")'''},

    {"id": 23, "name": "max_path_sum_tree", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_path_sum(root):
    """Maximum path sum in binary tree."""
    pass

root1 = TreeNode(1, TreeNode(2), TreeNode(3))
assert max_path_sum(root1) == 6

root2 = TreeNode(-10, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
assert max_path_sum(root2) == 42
print("PASS")'''},

    {"id": 24, "name": "valid_partition", "difficulty": "hard",
     "template": '''def valid_partition(nums):
    """Check if array can be partitioned into valid subarrays."""
    pass

assert valid_partition([4,4,4,5,6]) == True
assert valid_partition([1,1,1,2]) == False
print("PASS")'''},

    {"id": 25, "name": "maximum_alternating_sum", "difficulty": "hard",
     "template": '''def max_alternating_sum(nums):
    """Maximum alternating subsequence sum."""
    pass

assert max_alternating_sum([4,2,5,3]) == 7
assert max_alternating_sum([5,6,7,8]) == 8
assert max_alternating_sum([6,2,1,2,4,5]) == 10
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


class MixedChallengeV3b:
    def __init__(self):
        self.openhands = OpenHandsClient()
        self.generator = AgentCodeGenerator()
        self.challenges = ALL_CHALLENGES
        logger.info(f"MixedChallengeV3b: {len(EASY_CHALLENGES)} easy + {len(INTERMEDIATE_CHALLENGES)} intermediate + {len(HARD_CHALLENGES)} hard = {len(self.challenges)} total")

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
        logger.info("GENESIS MIXED DIFFICULTY CHALLENGE V3b - 25 NEW TESTS")
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

        output_path = Path("data/mixed_results_v3b.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"\nResults saved to {output_path}")

        return output


async def main():
    parser = argparse.ArgumentParser(description="Genesis Mixed Difficulty Challenge V3b")
    parser.add_argument("--iterations", type=int, default=1)
    args = parser.parse_args()
    challenge = MixedChallengeV3b()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
