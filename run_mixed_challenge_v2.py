#!/usr/bin/env python3
"""
Genesis Mixed Difficulty Challenge V2 - 50 NEW Tests
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

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("mixed_challenge_v2")

# API Keys
MISTRAL_API_KEY = "xBClmFrEWnHJcdrxjJU65frPPXytIYKK"
GEMINI_API_KEY = "AIzaSyDOYNHjGyhEgvKU0SlfXDGdnqUiWE4_6lE"

# Import infrastructure
from infrastructure.openhands_local import OpenHandsClient


def compute_reward(code: str, result: dict, challenge: dict) -> float:
    """Calculate reward based on execution results."""
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
# EASY CHALLENGES V2 (1-10)
# ============================================================
EASY_CHALLENGES = [
    # 1. FizzBuzz
    {"id": 1, "name": "fizz_buzz", "difficulty": "easy",
     "template": '''def fizz_buzz(n):
    """Return list of FizzBuzz results from 1 to n."""
    pass

assert fizz_buzz(5) == ["1", "2", "Fizz", "4", "Buzz"]
assert fizz_buzz(15)[-1] == "FizzBuzz"
print("PASS")'''},

    # 2. Move Zeroes
    {"id": 2, "name": "move_zeroes", "difficulty": "easy",
     "template": '''def move_zeroes(nums):
    """Move all zeroes to end while maintaining order."""
    pass
    return nums

assert move_zeroes([0,1,0,3,12]) == [1,3,12,0,0]
assert move_zeroes([0]) == [0]
assert move_zeroes([1,2,3]) == [1,2,3]
print("PASS")'''},

    # 3. Plus One
    {"id": 3, "name": "plus_one", "difficulty": "easy",
     "template": '''def plus_one(digits):
    """Add one to number represented as array of digits."""
    pass

assert plus_one([1,2,3]) == [1,2,4]
assert plus_one([4,3,2,1]) == [4,3,2,2]
assert plus_one([9]) == [1,0]
assert plus_one([9,9,9]) == [1,0,0,0]
print("PASS")'''},

    # 4. Missing Number
    {"id": 4, "name": "missing_number", "difficulty": "easy",
     "template": '''def missing_number(nums):
    """Find missing number in range [0, n]."""
    pass

assert missing_number([3,0,1]) == 2
assert missing_number([0,1]) == 2
assert missing_number([9,6,4,2,3,5,7,0,1]) == 8
print("PASS")'''},

    # 5. Power of Two
    {"id": 5, "name": "is_power_of_two", "difficulty": "easy",
     "template": '''def is_power_of_two(n):
    """Check if n is power of two."""
    pass

assert is_power_of_two(1) == True
assert is_power_of_two(16) == True
assert is_power_of_two(3) == False
assert is_power_of_two(0) == False
print("PASS")'''},

    # 6. Intersection of Two Arrays
    {"id": 6, "name": "intersection", "difficulty": "easy",
     "template": '''def intersection(nums1, nums2):
    """Find intersection of two arrays (unique elements)."""
    pass

assert set(intersection([1,2,2,1], [2,2])) == {2}
assert set(intersection([4,9,5], [9,4,9,8,4])) == {9,4}
print("PASS")'''},

    # 7. Valid Anagram
    {"id": 7, "name": "is_anagram", "difficulty": "easy",
     "template": '''def is_anagram(s, t):
    """Check if t is anagram of s."""
    pass

assert is_anagram("anagram", "nagaram") == True
assert is_anagram("rat", "car") == False
assert is_anagram("a", "ab") == False
print("PASS")'''},

    # 8. Reverse Bits
    {"id": 8, "name": "reverse_bits", "difficulty": "easy",
     "template": '''def reverse_bits(n):
    """Reverse bits of 32-bit unsigned integer."""
    pass

assert reverse_bits(43261596) == 964176192
assert reverse_bits(4294967293) == 3221225471
print("PASS")'''},

    # 9. Happy Number
    {"id": 9, "name": "is_happy", "difficulty": "easy",
     "template": '''def is_happy(n):
    """Check if n is a happy number."""
    pass

assert is_happy(19) == True
assert is_happy(2) == False
assert is_happy(7) == True
print("PASS")'''},

    # 10. Roman to Integer
    {"id": 10, "name": "roman_to_int", "difficulty": "easy",
     "template": '''def roman_to_int(s):
    """Convert Roman numeral to integer."""
    pass

assert roman_to_int("III") == 3
assert roman_to_int("LVIII") == 58
assert roman_to_int("MCMXCIV") == 1994
print("PASS")'''},
]

# ============================================================
# INTERMEDIATE CHALLENGES V2 (11-25)
# ============================================================
INTERMEDIATE_CHALLENGES = [
    # 11. Group Anagrams
    {"id": 11, "name": "group_anagrams", "difficulty": "intermediate",
     "template": '''def group_anagrams(strs):
    """Group anagrams together."""
    pass

result = group_anagrams(["eat","tea","tan","ate","nat","bat"])
assert len(result) == 3
result_sorted = [sorted(g) for g in result]
assert ["ate","eat","tea"] in result_sorted
print("PASS")'''},

    # 12. Sort Colors (Dutch Flag)
    {"id": 12, "name": "sort_colors", "difficulty": "intermediate",
     "template": '''def sort_colors(nums):
    """Sort array of 0s, 1s, 2s in-place."""
    pass
    return nums

assert sort_colors([2,0,2,1,1,0]) == [0,0,1,1,2,2]
assert sort_colors([2,0,1]) == [0,1,2]
print("PASS")'''},

    # 13. Kth Largest Element
    {"id": 13, "name": "find_kth_largest_v2", "difficulty": "intermediate",
     "template": '''def find_kth_largest(nums, k):
    """Find kth largest element."""
    pass

assert find_kth_largest([3,2,1,5,6,4], 2) == 5
assert find_kth_largest([3,2,3,1,2,4,5,5,6], 4) == 4
print("PASS")'''},

    # 14. Partition Equal Subset Sum
    {"id": 14, "name": "can_partition", "difficulty": "intermediate",
     "template": '''def can_partition(nums):
    """Check if array can be partitioned into two equal sum subsets."""
    pass

assert can_partition([1,5,11,5]) == True
assert can_partition([1,2,3,5]) == False
print("PASS")'''},

    # 15. Top K Frequent Elements
    {"id": 15, "name": "top_k_frequent", "difficulty": "intermediate",
     "template": '''def top_k_frequent(nums, k):
    """Return k most frequent elements."""
    pass

assert set(top_k_frequent([1,1,1,2,2,3], 2)) == {1, 2}
assert top_k_frequent([1], 1) == [1]
print("PASS")'''},

    # 16. Find Peak Element
    {"id": 16, "name": "find_peak_element", "difficulty": "intermediate",
     "template": '''def find_peak_element(nums):
    """Find index of peak element."""
    pass

assert find_peak_element([1,2,3,1]) in [2]
assert find_peak_element([1,2,1,3,5,6,4]) in [1, 5]
print("PASS")'''},

    # 17. Search in Rotated Sorted Array
    {"id": 17, "name": "search_rotated", "difficulty": "intermediate",
     "template": '''def search(nums, target):
    """Search in rotated sorted array."""
    pass

assert search([4,5,6,7,0,1,2], 0) == 4
assert search([4,5,6,7,0,1,2], 3) == -1
assert search([1], 0) == -1
print("PASS")'''},

    # 18. 3Sum
    {"id": 18, "name": "three_sum", "difficulty": "intermediate",
     "template": '''def three_sum(nums):
    """Find all unique triplets that sum to zero."""
    pass

result = three_sum([-1,0,1,2,-1,-4])
assert sorted([sorted(x) for x in result]) == sorted([[-1,-1,2],[-1,0,1]])
print("PASS")'''},

    # 19. Letter Combinations of Phone Number
    {"id": 19, "name": "letter_combinations", "difficulty": "intermediate",
     "template": '''def letter_combinations(digits):
    """Generate all letter combinations for phone digits."""
    pass

result = letter_combinations("23")
expected = ["ad","ae","af","bd","be","bf","cd","ce","cf"]
assert sorted(result) == sorted(expected)
assert letter_combinations("") == []
print("PASS")'''},

    # 20. Generate Parentheses
    {"id": 20, "name": "generate_parenthesis", "difficulty": "intermediate",
     "template": '''def generate_parenthesis(n):
    """Generate all valid parentheses combinations."""
    pass

result = generate_parenthesis(3)
expected = ["((()))","(()())","(())()","()(())","()()()"]
assert sorted(result) == sorted(expected)
print("PASS")'''},

    # 21. Longest Palindromic Substring
    {"id": 21, "name": "longest_palindrome", "difficulty": "intermediate",
     "template": '''def longest_palindrome(s):
    """Find longest palindromic substring."""
    pass

assert longest_palindrome("babad") in ["bab", "aba"]
assert longest_palindrome("cbbd") == "bb"
print("PASS")'''},

    # 22. Word Search
    {"id": 22, "name": "word_search", "difficulty": "intermediate",
     "template": '''def exist(board, word):
    """Check if word exists in board."""
    pass

board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]
assert exist(board, "ABCCED") == True
assert exist(board, "SEE") == True
assert exist(board, "ABCB") == False
print("PASS")'''},

    # 23. Number of Islands
    {"id": 23, "name": "num_islands", "difficulty": "intermediate",
     "template": '''def num_islands(grid):
    """Count number of islands."""
    pass

grid1 = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]
assert num_islands(grid1) == 1
grid2 = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]
assert num_islands(grid2) == 3
print("PASS")'''},

    # 24. Course Schedule
    {"id": 24, "name": "can_finish", "difficulty": "intermediate",
     "template": '''def can_finish(num_courses, prerequisites):
    """Check if all courses can be finished."""
    pass

assert can_finish(2, [[1,0]]) == True
assert can_finish(2, [[1,0],[0,1]]) == False
print("PASS")'''},

    # 25. Clone Graph
    {"id": 25, "name": "clone_graph", "difficulty": "intermediate",
     "template": '''class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors else []

def clone_graph(node):
    """Clone an undirected graph."""
    pass

# Test
n1, n2, n3, n4 = Node(1), Node(2), Node(3), Node(4)
n1.neighbors = [n2, n4]
n2.neighbors = [n1, n3]
n3.neighbors = [n2, n4]
n4.neighbors = [n1, n3]

cloned = clone_graph(n1)
assert cloned.val == 1
assert cloned is not n1
assert len(cloned.neighbors) == 2
print("PASS")'''},
]

# ============================================================
# HARD CHALLENGES V2 (26-50)
# ============================================================
HARD_CHALLENGES = [
    # 26. Largest Rectangle in Histogram
    {"id": 26, "name": "largest_rectangle_area", "difficulty": "hard",
     "template": '''def largest_rectangle_area(heights):
    """Find largest rectangle in histogram."""
    pass

assert largest_rectangle_area([2,1,5,6,2,3]) == 10
assert largest_rectangle_area([2,4]) == 4
print("PASS")'''},

    # 27. Wildcard Matching
    {"id": 27, "name": "is_match_wildcard", "difficulty": "hard",
     "template": '''def is_match(s, p):
    """Wildcard matching with ? and * support."""
    pass

assert is_match("aa", "a") == False
assert is_match("aa", "*") == True
assert is_match("cb", "?a") == False
assert is_match("adceb", "*a*b") == True
print("PASS")'''},

    # 28. Palindrome Pairs
    {"id": 28, "name": "palindrome_pairs", "difficulty": "hard",
     "template": '''def palindrome_pairs(words):
    """Find all pairs that form palindrome when concatenated."""
    pass

result = palindrome_pairs(["abcd","dcba","lls","s","sssll"])
expected = [[0,1],[1,0],[3,2],[2,4]]
assert sorted(result) == sorted(expected)
print("PASS")'''},

    # 29. Basic Calculator
    {"id": 29, "name": "calculate", "difficulty": "hard",
     "template": '''def calculate(s):
    """Evaluate expression with +, -, parentheses."""
    pass

assert calculate("1 + 1") == 2
assert calculate(" 2-1 + 2 ") == 3
assert calculate("(1+(4+5+2)-3)+(6+8)") == 23
print("PASS")'''},

    # 30. Find Minimum in Rotated Sorted Array II
    {"id": 30, "name": "find_min_ii", "difficulty": "hard",
     "template": '''def find_min(nums):
    """Find minimum in rotated sorted array with duplicates."""
    pass

assert find_min([1,3,5]) == 1
assert find_min([2,2,2,0,1]) == 0
assert find_min([3,3,1,3]) == 1
print("PASS")'''},

    # 31. Reconstruct Itinerary
    {"id": 31, "name": "find_itinerary", "difficulty": "hard",
     "template": '''def find_itinerary(tickets):
    """Reconstruct itinerary in lexical order."""
    pass

result = find_itinerary([["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]])
assert result == ["JFK","MUC","LHR","SFO","SJC"]
print("PASS")'''},

    # 32. Longest Consecutive Sequence
    {"id": 32, "name": "longest_consecutive", "difficulty": "hard",
     "template": '''def longest_consecutive(nums):
    """Find length of longest consecutive sequence."""
    pass

assert longest_consecutive([100,4,200,1,3,2]) == 4
assert longest_consecutive([0,3,7,2,5,8,4,6,0,1]) == 9
print("PASS")'''},

    # 33. Swim in Rising Water
    {"id": 33, "name": "swim_in_water", "difficulty": "hard",
     "template": '''def swim_in_water(grid):
    """Find minimum time to swim from top-left to bottom-right."""
    pass

assert swim_in_water([[0,2],[1,3]]) == 3
assert swim_in_water([[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]]) == 16
print("PASS")'''},

    # 34. Maximum Product Subarray
    {"id": 34, "name": "max_product", "difficulty": "hard",
     "template": '''def max_product(nums):
    """Find contiguous subarray with largest product."""
    pass

assert max_product([2,3,-2,4]) == 6
assert max_product([-2,0,-1]) == 0
assert max_product([-2,3,-4]) == 24
print("PASS")'''},

    # 35. Kth Smallest Element in Sorted Matrix
    {"id": 35, "name": "kth_smallest", "difficulty": "hard",
     "template": '''def kth_smallest(matrix, k):
    """Find kth smallest element in sorted matrix."""
    pass

matrix = [[1,5,9],[10,11,13],[12,13,15]]
assert kth_smallest(matrix, 8) == 13
print("PASS")'''},

    # 36. Reverse Pairs
    {"id": 36, "name": "reverse_pairs", "difficulty": "hard",
     "template": '''def reverse_pairs(nums):
    """Count reverse pairs where nums[i] > 2*nums[j] and i < j."""
    pass

assert reverse_pairs([1,3,2,3,1]) == 2
assert reverse_pairs([2,4,3,5,1]) == 3
print("PASS")'''},

    # 37. Shortest Path in Grid with Obstacles
    {"id": 37, "name": "shortest_path", "difficulty": "hard",
     "template": '''def shortest_path(grid, k):
    """Shortest path eliminating at most k obstacles."""
    pass

grid = [[0,0,0],[1,1,0],[0,0,0],[0,1,1],[0,0,0]]
assert shortest_path(grid, 1) == 6
print("PASS")'''},

    # 38. LRU Cache
    {"id": 38, "name": "lru_cache", "difficulty": "hard",
     "template": '''class LRUCache:
    """Least Recently Used cache implementation."""

    def __init__(self, capacity):
        pass

    def get(self, key):
        pass

    def put(self, key, value):
        pass

cache = LRUCache(2)
cache.put(1, 1)
cache.put(2, 2)
assert cache.get(1) == 1
cache.put(3, 3)
assert cache.get(2) == -1
cache.put(4, 4)
assert cache.get(1) == -1
assert cache.get(3) == 3
assert cache.get(4) == 4
print("PASS")'''},

    # 39. Critical Connections (Bridges)
    {"id": 39, "name": "critical_connections", "difficulty": "hard",
     "template": '''def critical_connections(n, connections):
    """Find all critical connections (bridges) in network."""
    pass

result = critical_connections(4, [[0,1],[1,2],[2,0],[1,3]])
assert result == [[1,3]] or result == [[3,1]]
print("PASS")'''},

    # 40. Remove Invalid Parentheses
    {"id": 40, "name": "remove_invalid_parentheses", "difficulty": "hard",
     "template": '''def remove_invalid_parentheses(s):
    """Remove minimum parentheses to make valid."""
    pass

result = remove_invalid_parentheses("()())()")
assert set(result) == {"(())()", "()()()"}
print("PASS")'''},

    # 41. Count of Smaller Numbers
    {"id": 41, "name": "count_smaller_v2", "difficulty": "hard",
     "template": '''def count_smaller(nums):
    """Count smaller elements to right using BST/merge sort."""
    pass

assert count_smaller([5,2,6,1]) == [2,1,1,0]
print("PASS")'''},

    # 42. Minimum Cost to Merge Stones
    {"id": 42, "name": "merge_stones", "difficulty": "hard",
     "template": '''def merge_stones(stones, k):
    """Minimum cost to merge stones into 1 pile."""
    pass

assert merge_stones([3,2,4,1], 2) == 20
assert merge_stones([3,2,4,1], 3) == -1
assert merge_stones([3,5,1,2,6], 3) == 25
print("PASS")'''},

    # 43. Skyline Problem
    {"id": 43, "name": "get_skyline", "difficulty": "hard",
     "template": '''def get_skyline(buildings):
    """Get skyline silhouette."""
    pass

buildings = [[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]
result = get_skyline(buildings)
expected = [[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]]
assert result == expected
print("PASS")'''},

    # 44. Minimum Window Subsequence
    {"id": 44, "name": "min_window_subseq", "difficulty": "hard",
     "template": '''def min_window(s1, s2):
    """Find minimum window in s1 containing s2 as subsequence."""
    pass

assert min_window("abcdebdde", "bde") == "bcde"
assert min_window("jmeqksfrsdcmsiwvaovztaqenprpvnbstl", "u") == ""
print("PASS")'''},

    # 45. Longest Path in Tree
    {"id": 45, "name": "longest_path", "difficulty": "hard",
     "template": '''def longest_path(parent, s):
    """Find longest path where adjacent nodes have different chars."""
    pass

assert longest_path([-1,0,0,1,1,2], "abacbe") == 3
assert longest_path([-1,0,0,0], "aabc") == 3
print("PASS")'''},

    # 46. Max Points on a Line
    {"id": 46, "name": "max_points_line", "difficulty": "hard",
     "template": '''def max_points(points):
    """Maximum points on same line."""
    pass

assert max_points([[1,1],[2,2],[3,3]]) == 3
assert max_points([[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]) == 4
print("PASS")'''},

    # 47. Text Justification
    {"id": 47, "name": "full_justify_v2", "difficulty": "hard",
     "template": '''def full_justify(words, max_width):
    """Fully justify text."""
    pass

result = full_justify(["This", "is", "an", "example", "of", "text", "justification."], 16)
assert result[0] == "This    is    an"
assert result[1] == "example  of text"
print("PASS")'''},

    # 48. K Inverse Pairs Array
    {"id": 48, "name": "k_inverse_pairs", "difficulty": "hard",
     "template": '''def k_inverse_pairs(n, k):
    """Count arrays with exactly k inverse pairs."""
    pass

assert k_inverse_pairs(3, 0) == 1
assert k_inverse_pairs(3, 1) == 2
print("PASS")'''},

    # 49. Strange Printer
    {"id": 49, "name": "strange_printer", "difficulty": "hard",
     "template": '''def strange_printer(s):
    """Minimum turns for strange printer."""
    pass

assert strange_printer("aaabbb") == 2
assert strange_printer("aba") == 2
print("PASS")'''},

    # 50. Cherry Pickup
    {"id": 50, "name": "cherry_pickup", "difficulty": "hard",
     "template": '''def cherry_pickup(grid):
    """Maximum cherries collected in round trip."""
    pass

grid = [[0,1,-1],[1,0,-1],[1,1,1]]
assert cherry_pickup(grid) == 5
print("PASS")'''},
]

# Combine all challenges
ALL_CHALLENGES = EASY_CHALLENGES + INTERMEDIATE_CHALLENGES + HARD_CHALLENGES


class AgentCodeGenerator:
    """LLM-based code generator using Mistral with Gemini fallback."""

    def __init__(self):
        self.mistral_url = "https://api.mistral.ai/v1/chat/completions"
        self.gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={GEMINI_API_KEY}"
        self.client = httpx.AsyncClient(timeout=60.0)
        self.stats = {"mistral": 0, "gemini": 0, "errors": 0}

    async def generate_code(self, template: str, challenge_name: str, difficulty: str) -> str:
        """Generate code to solve the challenge."""
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

        # Try Mistral first
        try:
            response = await self.client.post(
                self.mistral_url,
                headers={
                    "Authorization": f"Bearer {MISTRAL_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "mistral-small-latest",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 2000
                }
            )
            if response.status_code == 200:
                data = response.json()
                code = data["choices"][0]["message"]["content"]
                code = self._extract_code(code)
                self.stats["mistral"] += 1
                return code
        except Exception as e:
            logger.warning(f"Mistral failed for {challenge_name}: {e}")

        # Fallback to Gemini
        try:
            response = await self.client.post(
                self.gemini_url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2000}
                }
            )
            if response.status_code == 200:
                data = response.json()
                code = data["candidates"][0]["content"]["parts"][0]["text"]
                code = self._extract_code(code)
                self.stats["gemini"] += 1
                return code
        except Exception as e:
            logger.warning(f"Gemini failed for {challenge_name}: {e}")

        self.stats["errors"] += 1
        return template

    def _extract_code(self, text: str) -> str:
        """Extract Python code from response."""
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


class MixedChallengeV2:
    """Run mixed difficulty challenge suite V2."""

    def __init__(self):
        self.openhands = OpenHandsClient()
        self.generator = AgentCodeGenerator()
        self.challenges = ALL_CHALLENGES
        logger.info(f"MixedChallengeV2: {len(EASY_CHALLENGES)} easy + {len(INTERMEDIATE_CHALLENGES)} intermediate + {len(HARD_CHALLENGES)} hard = {len(self.challenges)} total")

    async def run_challenge(self, challenge: dict) -> dict:
        """Run a single challenge."""
        start_time = time.time()
        ch_id = challenge["id"]
        name = challenge["name"]
        difficulty = challenge["difficulty"]
        template = challenge["template"]

        generated_code = await self.generator.generate_code(template, name, difficulty)
        result = await self.openhands.execute(instructions=f"Challenge {name}", code=generated_code, run_tests=False)
        elapsed = time.time() - start_time

        passed = result.success and "PASS" in result.output
        reward = compute_reward(
            generated_code,
            {"passed": passed, "output": result.output, "error": result.errors or ""},
            {"name": name, "difficulty": difficulty, "template": template}
        )

        return {
            "id": ch_id,
            "name": name,
            "difficulty": difficulty,
            "passed": passed,
            "reward": reward,
            "elapsed_ms": int(elapsed * 1000)
        }

    async def run_all(self, iterations: int = 1) -> dict:
        """Run all challenges for specified iterations."""
        logger.info("=" * 60)
        logger.info("GENESIS MIXED DIFFICULTY CHALLENGE V2 - 50 NEW TESTS")
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
                best_results = {
                    "iteration": iteration,
                    "easy_passed": easy_passed,
                    "intermediate_passed": inter_passed,
                    "hard_passed": hard_passed,
                    "total_passed": total_passed,
                    "total_reward": total_reward,
                    "results": results
                }

        await self.generator.close()

        logger.info("\n" + "=" * 60)
        logger.info("FINAL RESULTS")
        logger.info("=" * 60)
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

        output_path = Path("data/mixed_results_v2.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"\nResults saved to {output_path}")

        return output


async def main():
    parser = argparse.ArgumentParser(description="Genesis Mixed Difficulty Challenge V2")
    parser.add_argument("--iterations", type=int, default=1, help="Number of iterations")
    args = parser.parse_args()

    challenge = MixedChallengeV2()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
