#!/usr/bin/env python3
"""
Genesis Extreme Challenge - 50 Hard to Extreme Tests
25 Hard | 25 Extreme (LeetCode Hard + Competitive Programming)

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
logger = logging.getLogger("extreme_challenge")

MISTRAL_API_KEY = "xBClmFrEWnHJcdrxjJU65frPPXytIYKK"
GEMINI_API_KEY = "AIzaSyDOYNHjGyhEgvKU0SlfXDGdnqUiWE4_6lE"

from infrastructure.openhands_local import OpenHandsClient


def compute_reward(code: str, result: dict, challenge: dict) -> float:
    """Calculate reward based on execution results."""
    passed = result.get("passed", False)
    difficulty = challenge.get("difficulty", "hard")
    difficulty_weights = {"hard": 2.5, "extreme": 4.0}
    base_weight = difficulty_weights.get(difficulty, 3.0)
    if passed:
        return 1.5 * base_weight
    else:
        has_impl = "pass" not in code.lower() or len(code) > len(challenge.get("template", ""))
        return 0.3 * base_weight if has_impl else 0.1 * base_weight


# ============================================================
# HARD CHALLENGES (1-25)
# ============================================================
HARD_CHALLENGES = [
    # 1. Longest Increasing Path in Matrix
    {"id": 1, "name": "longest_increasing_path", "difficulty": "hard",
     "template": '''def longest_increasing_path(matrix):
    """Find longest increasing path in matrix."""
    pass

assert longest_increasing_path([[9,9,4],[6,6,8],[2,1,1]]) == 4
assert longest_increasing_path([[3,4,5],[3,2,6],[2,2,1]]) == 4
assert longest_increasing_path([[1]]) == 1
print("PASS")'''},

    # 2. Distinct Subsequences
    {"id": 2, "name": "num_distinct", "difficulty": "hard",
     "template": '''def num_distinct(s, t):
    """Count distinct subsequences of s that equal t."""
    pass

assert num_distinct("rabbbit", "rabbit") == 3
assert num_distinct("babgbag", "bag") == 5
assert num_distinct("a", "b") == 0
print("PASS")'''},

    # 3. Interleaving String
    {"id": 3, "name": "is_interleave", "difficulty": "hard",
     "template": '''def is_interleave(s1, s2, s3):
    """Check if s3 is interleaving of s1 and s2."""
    pass

assert is_interleave("aabcc", "dbbca", "aadbbcbcac") == True
assert is_interleave("aabcc", "dbbca", "aadbbbaccc") == False
assert is_interleave("", "", "") == True
print("PASS")'''},

    # 4. Scramble String
    {"id": 4, "name": "is_scramble", "difficulty": "hard",
     "template": '''def is_scramble(s1, s2):
    """Check if s2 is scrambled string of s1."""
    pass

assert is_scramble("great", "rgeat") == True
assert is_scramble("abcde", "caebd") == False
assert is_scramble("a", "a") == True
print("PASS")'''},

    # 5. Recover Binary Search Tree
    {"id": 5, "name": "recover_tree", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def inorder(root):
    if not root: return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def recover_tree(root):
    """Recover BST where two nodes are swapped."""
    pass

root = TreeNode(1, TreeNode(3, None, TreeNode(2)))
recover_tree(root)
assert inorder(root) == [1, 2, 3]
print("PASS")'''},

    # 6. Candy Distribution
    {"id": 6, "name": "candy", "difficulty": "hard",
     "template": '''def candy(ratings):
    """Minimum candies to distribute based on ratings."""
    pass

assert candy([1,0,2]) == 5
assert candy([1,2,2]) == 4
assert candy([1,3,2,2,1]) == 7
print("PASS")'''},

    # 7. Best Time to Buy and Sell Stock III
    {"id": 7, "name": "max_profit_iii", "difficulty": "hard",
     "template": '''def max_profit(prices):
    """Max profit with at most 2 transactions."""
    pass

assert max_profit([3,3,5,0,0,3,1,4]) == 6
assert max_profit([1,2,3,4,5]) == 4
assert max_profit([7,6,4,3,1]) == 0
print("PASS")'''},

    # 8. Palindrome Partitioning II
    {"id": 8, "name": "min_cut_hard", "difficulty": "hard",
     "template": '''def min_cut(s):
    """Minimum cuts for palindrome partitioning."""
    pass

assert min_cut("aab") == 1
assert min_cut("a") == 0
assert min_cut("ab") == 1
assert min_cut("aaabaa") == 1
print("PASS")'''},

    # 9. Jump Game II
    {"id": 9, "name": "jump_ii", "difficulty": "hard",
     "template": '''def jump(nums):
    """Minimum jumps to reach last index."""
    pass

assert jump([2,3,1,1,4]) == 2
assert jump([2,3,0,1,4]) == 2
assert jump([1,2,3]) == 2
print("PASS")'''},

    # 10. First Missing Positive
    {"id": 10, "name": "first_missing_positive", "difficulty": "hard",
     "template": '''def first_missing_positive(nums):
    """Find smallest missing positive integer in O(n) time, O(1) space."""
    pass

assert first_missing_positive([1,2,0]) == 3
assert first_missing_positive([3,4,-1,1]) == 2
assert first_missing_positive([7,8,9,11,12]) == 1
print("PASS")'''},

    # 11. Text Justification
    {"id": 11, "name": "full_justify", "difficulty": "hard",
     "template": '''def full_justify(words, maxWidth):
    """Fully justify text to given width."""
    pass

result = full_justify(["This", "is", "an", "example", "of", "text", "justification."], 16)
assert result[0] == "This    is    an"
assert result[1] == "example  of text"
print("PASS")'''},

    # 12. Substring with Concatenation of All Words
    {"id": 12, "name": "find_substring", "difficulty": "hard",
     "template": '''def find_substring(s, words):
    """Find starting indices of concatenation of all words."""
    pass

assert sorted(find_substring("barfoothefoobarman", ["foo","bar"])) == [0, 9]
assert find_substring("wordgoodgoodgoodbestword", ["word","good","best","word"]) == []
print("PASS")'''},

    # 13. Minimum Window Substring
    {"id": 13, "name": "min_window_v2", "difficulty": "hard",
     "template": '''def min_window(s, t):
    """Minimum window containing all chars of t."""
    pass

assert min_window("ADOBECODEBANC", "ABC") == "BANC"
assert min_window("a", "a") == "a"
assert min_window("a", "aa") == ""
print("PASS")'''},

    # 14. Dungeon Game
    {"id": 14, "name": "calculate_minimum_hp", "difficulty": "hard",
     "template": '''def calculate_minimum_hp(dungeon):
    """Minimum HP to rescue princess."""
    pass

assert calculate_minimum_hp([[-2,-3,3],[-5,-10,1],[10,30,-5]]) == 7
assert calculate_minimum_hp([[0]]) == 1
print("PASS")'''},

    # 15. Best Time Buy Sell Stock IV
    {"id": 15, "name": "max_profit_iv", "difficulty": "hard",
     "template": '''def max_profit(k, prices):
    """Max profit with at most k transactions."""
    pass

assert max_profit(2, [2,4,1]) == 2
assert max_profit(2, [3,2,6,5,0,3]) == 7
print("PASS")'''},

    # 16. Create Maximum Number
    {"id": 16, "name": "max_number", "difficulty": "hard",
     "template": '''def max_number(nums1, nums2, k):
    """Create max number of length k from two arrays."""
    pass

assert max_number([3,4,6,5], [9,1,2,5,8,3], 5) == [9,8,6,5,3]
assert max_number([6,7], [6,0,4], 5) == [6,7,6,0,4]
print("PASS")'''},

    # 17. Count of Range Sum
    {"id": 17, "name": "count_range_sum", "difficulty": "hard",
     "template": '''def count_range_sum(nums, lower, upper):
    """Count range sums within [lower, upper]."""
    pass

assert count_range_sum([-2,5,-1], -2, 2) == 3
assert count_range_sum([0], 0, 0) == 1
print("PASS")'''},

    # 18. Longest Duplicate Substring
    {"id": 18, "name": "longest_dup_substring", "difficulty": "hard",
     "template": '''def longest_dup_substring(s):
    """Find longest duplicate substring using binary search + rolling hash."""
    pass

assert longest_dup_substring("banana") in ["ana", "nan"]
assert longest_dup_substring("abcd") == ""
print("PASS")'''},

    # 19. Shortest Palindrome
    {"id": 19, "name": "shortest_palindrome", "difficulty": "hard",
     "template": '''def shortest_palindrome(s):
    """Make shortest palindrome by adding chars to front."""
    pass

assert shortest_palindrome("aacecaaa") == "aaacecaaa"
assert shortest_palindrome("abcd") == "dcbabcd"
print("PASS")'''},

    # 20. Find Median from Data Stream
    {"id": 20, "name": "median_finder", "difficulty": "hard",
     "template": '''class MedianFinder:
    def __init__(self):
        pass

    def addNum(self, num):
        pass

    def findMedian(self):
        pass

mf = MedianFinder()
mf.addNum(1)
mf.addNum(2)
assert mf.findMedian() == 1.5
mf.addNum(3)
assert mf.findMedian() == 2.0
print("PASS")'''},

    # 21. Range Module
    {"id": 21, "name": "range_module", "difficulty": "hard",
     "template": '''class RangeModule:
    def __init__(self):
        pass

    def addRange(self, left, right):
        pass

    def queryRange(self, left, right):
        pass

    def removeRange(self, left, right):
        pass

rm = RangeModule()
rm.addRange(10, 20)
rm.removeRange(14, 16)
assert rm.queryRange(10, 14) == True
assert rm.queryRange(13, 15) == False
assert rm.queryRange(16, 17) == True
print("PASS")'''},

    # 22. Split Array Largest Sum
    {"id": 22, "name": "split_array", "difficulty": "hard",
     "template": '''def split_array(nums, m):
    """Minimize largest sum when splitting array into m parts."""
    pass

assert split_array([7,2,5,10,8], 2) == 18
assert split_array([1,2,3,4,5], 2) == 9
print("PASS")'''},

    # 23. Frog Jump
    {"id": 23, "name": "can_cross", "difficulty": "hard",
     "template": '''def can_cross(stones):
    """Can frog cross river by jumping on stones?"""
    pass

assert can_cross([0,1,3,5,6,8,12,17]) == True
assert can_cross([0,1,2,3,4,8,9,11]) == False
print("PASS")'''},

    # 24. Russian Doll Envelopes
    {"id": 24, "name": "max_envelopes", "difficulty": "hard",
     "template": '''def max_envelopes(envelopes):
    """Max Russian doll envelopes that can be nested."""
    pass

assert max_envelopes([[5,4],[6,4],[6,7],[2,3]]) == 3
assert max_envelopes([[1,1],[1,1],[1,1]]) == 1
print("PASS")'''},

    # 25. Patching Array
    {"id": 25, "name": "min_patches", "difficulty": "hard",
     "template": '''def min_patches(nums, n):
    """Minimum patches to cover [1, n]."""
    pass

assert min_patches([1,3], 6) == 1
assert min_patches([1,5,10], 20) == 2
assert min_patches([1,2,2], 5) == 0
print("PASS")'''},
]

# ============================================================
# EXTREME CHALLENGES (26-50)
# ============================================================
EXTREME_CHALLENGES = [
    # 26. Regular Expression Matching (Full)
    {"id": 26, "name": "regex_full", "difficulty": "extreme",
     "template": '''def is_match(s, p):
    """Full regex matching with . * + ? support."""
    pass

assert is_match("aa", "a") == False
assert is_match("aa", "a*") == True
assert is_match("ab", ".*") == True
assert is_match("mississippi", "mis*is*ip*.") == True
print("PASS")'''},

    # 27. Wildcard Matching
    {"id": 27, "name": "wildcard_match", "difficulty": "extreme",
     "template": '''def is_match(s, p):
    """Wildcard matching with ? and *."""
    pass

assert is_match("aa", "a") == False
assert is_match("aa", "*") == True
assert is_match("cb", "?a") == False
assert is_match("adceb", "*a*b") == True
print("PASS")'''},

    # 28. N-Queens II (Count Solutions)
    {"id": 28, "name": "total_n_queens", "difficulty": "extreme",
     "template": '''def total_n_queens(n):
    """Count total N-Queens solutions."""
    pass

assert total_n_queens(4) == 2
assert total_n_queens(1) == 1
assert total_n_queens(8) == 92
print("PASS")'''},

    # 29. Sudoku Solver
    {"id": 29, "name": "solve_sudoku_extreme", "difficulty": "extreme",
     "template": '''def solve_sudoku(board):
    """Solve sudoku in-place using backtracking."""
    pass
    return board

board = [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]
solve_sudoku(board)
assert board[0][2] == "4"
assert board[2][0] == "1"
assert board[8][8] == "9"
print("PASS")'''},

    # 30. Word Ladder II
    {"id": 30, "name": "find_ladders", "difficulty": "extreme",
     "template": '''def find_ladders(beginWord, endWord, wordList):
    """Find ALL shortest transformation sequences."""
    pass

result = find_ladders("hit", "cog", ["hot","dot","dog","lot","log","cog"])
assert len(result) == 2
assert ["hit","hot","dot","dog","cog"] in result
print("PASS")'''},

    # 31. Merge K Sorted Lists (Optimal)
    {"id": 31, "name": "merge_k_optimal", "difficulty": "extreme",
     "template": '''import heapq

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __lt__(self, other):
        return self.val < other.val

def to_list(node):
    r = []
    while node: r.append(node.val); node = node.next
    return r

def from_list(arr):
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for v in arr[1:]: curr.next = ListNode(v); curr = curr.next
    return head

def merge_k_lists(lists):
    """Merge k sorted lists using heap in O(N log k)."""
    pass

lists = [from_list([1,4,5]), from_list([1,3,4]), from_list([2,6])]
assert to_list(merge_k_lists(lists)) == [1,1,2,3,4,4,5,6]
print("PASS")'''},

    # 32. Alien Dictionary (Topological Sort)
    {"id": 32, "name": "alien_order_full", "difficulty": "extreme",
     "template": '''def alien_order(words):
    """Derive full alien alphabet order from sorted words."""
    pass

result = alien_order(["wrt","wrf","er","ett","rftt"])
# Valid orderings contain all chars in correct relative order
assert "w" in result and "e" in result and "r" in result
assert result.index("w") < result.index("e")
assert result.index("e") < result.index("r")
print("PASS")'''},

    # 33. Smallest Range Covering K Lists
    {"id": 33, "name": "smallest_range", "difficulty": "extreme",
     "template": '''def smallest_range(nums):
    """Smallest range including at least one from each list."""
    pass

assert smallest_range([[4,10,15,24,26],[0,9,12,20],[5,18,22,30]]) == [20,24]
assert smallest_range([[1,2,3],[1,2,3],[1,2,3]]) == [1,1]
print("PASS")'''},

    # 34. Expression Add Operators
    {"id": 34, "name": "add_operators", "difficulty": "extreme",
     "template": '''def add_operators(num, target):
    """Add +, -, * to get target value."""
    pass

result = add_operators("123", 6)
assert "1+2+3" in result and "1*2*3" in result
result2 = add_operators("232", 8)
assert "2*3+2" in result2 and "2+3*2" in result2
print("PASS")'''},

    # 35. Remove Invalid Parentheses
    {"id": 35, "name": "remove_invalid_parentheses", "difficulty": "extreme",
     "template": '''def remove_invalid_parentheses(s):
    """Remove minimum parentheses to make valid."""
    pass

result = remove_invalid_parentheses("()())()")
assert set(result) == {"(())()", "()()()"}
result2 = remove_invalid_parentheses("(a)())()")
assert "(a)()()" in result2 and "(a())()" in result2
print("PASS")'''},

    # 36. Longest Valid Parentheses (DP)
    {"id": 36, "name": "longest_valid_paren_dp", "difficulty": "extreme",
     "template": '''def longest_valid_parentheses(s):
    """Length of longest valid parentheses using DP."""
    pass

assert longest_valid_parentheses("(()") == 2
assert longest_valid_parentheses(")()())") == 4
assert longest_valid_parentheses("()(()") == 2
assert longest_valid_parentheses("(()(((()") == 2
print("PASS")'''},

    # 37. Max Points on a Line
    {"id": 37, "name": "max_points", "difficulty": "extreme",
     "template": '''def max_points(points):
    """Maximum points on a single line."""
    pass

assert max_points([[1,1],[2,2],[3,3]]) == 3
assert max_points([[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]) == 4
print("PASS")'''},

    # 38. Basic Calculator III
    {"id": 38, "name": "calculate_iii", "difficulty": "extreme",
     "template": '''def calculate(s):
    """Calculator with +, -, *, / and parentheses."""
    pass

assert calculate("1+1") == 2
assert calculate("6-4/2") == 4
assert calculate("2*(5+5*2)/3+(6/2+8)") == 21
assert calculate("(2+6*3+5-(3*14/7+2)*5)+3") == -12
print("PASS")'''},

    # 39. Trapping Rain Water II (3D)
    {"id": 39, "name": "trap_rain_water_ii", "difficulty": "extreme",
     "template": '''def trap_rain_water(heightMap):
    """Trap rain water in 2D elevation map."""
    pass

assert trap_rain_water([[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]]) == 4
assert trap_rain_water([[3,3,3,3,3],[3,2,2,2,3],[3,2,1,2,3],[3,2,2,2,3],[3,3,3,3,3]]) == 10
print("PASS")'''},

    # 40. Cherry Pickup
    {"id": 40, "name": "cherry_pickup", "difficulty": "extreme",
     "template": '''def cherry_pickup(grid):
    """Maximum cherries collected going and returning."""
    pass

assert cherry_pickup([[0,1,-1],[1,0,-1],[1,1,1]]) == 5
assert cherry_pickup([[1,1,-1],[1,-1,1],[-1,1,1]]) == 0
print("PASS")'''},

    # 41. Shortest Path Visiting All Nodes
    {"id": 41, "name": "shortest_path_all_nodes", "difficulty": "extreme",
     "template": '''def shortest_path_length(graph):
    """Shortest path visiting all nodes in graph."""
    pass

assert shortest_path_length([[1,2,3],[0],[0],[0]]) == 4
assert shortest_path_length([[1],[0,2,4],[1,3,4],[2],[1,2]]) == 4
print("PASS")'''},

    # 42. K-th Smallest in Lexicographical Order
    {"id": 42, "name": "find_kth_number", "difficulty": "extreme",
     "template": '''def find_kth_number(n, k):
    """K-th smallest in lexicographical order from 1 to n."""
    pass

assert find_kth_number(13, 2) == 10
assert find_kth_number(1, 1) == 1
assert find_kth_number(100, 10) == 17
print("PASS")'''},

    # 43. Minimum Cost to Merge Stones
    {"id": 43, "name": "merge_stones", "difficulty": "extreme",
     "template": '''def merge_stones(stones, k):
    """Minimum cost to merge stones into one pile."""
    pass

assert merge_stones([3,2,4,1], 2) == 20
assert merge_stones([3,2,4,1], 3) == -1
assert merge_stones([3,5,1,2,6], 3) == 25
print("PASS")'''},

    # 44. Palindrome Pairs
    {"id": 44, "name": "palindrome_pairs", "difficulty": "extreme",
     "template": '''def palindrome_pairs(words):
    """Find all pairs forming palindromes."""
    pass

result = palindrome_pairs(["abcd","dcba","lls","s","sssll"])
expected = [[0,1],[1,0],[3,2],[2,4]]
assert sorted(result) == sorted(expected)
print("PASS")'''},

    # 45. Number of Atoms
    {"id": 45, "name": "count_of_atoms", "difficulty": "extreme",
     "template": '''def count_of_atoms(formula):
    """Parse chemical formula and count atoms."""
    pass

assert count_of_atoms("H2O") == "H2O"
assert count_of_atoms("Mg(OH)2") == "H2MgO2"
assert count_of_atoms("K4(ON(SO3)2)2") == "K4N2O14S4"
print("PASS")'''},

    # 46. Sliding Puzzle
    {"id": 46, "name": "sliding_puzzle", "difficulty": "extreme",
     "template": '''def sliding_puzzle(board):
    """Minimum moves to solve 2x3 sliding puzzle."""
    pass

assert sliding_puzzle([[1,2,3],[4,0,5]]) == 1
assert sliding_puzzle([[1,2,3],[5,4,0]]) == -1
assert sliding_puzzle([[4,1,2],[5,0,3]]) == 5
print("PASS")'''},

    # 47. Race Car
    {"id": 47, "name": "racecar", "difficulty": "extreme",
     "template": '''def racecar(target):
    """Minimum instructions to reach target position."""
    pass

assert racecar(3) == 2
assert racecar(6) == 5
assert racecar(4) == 5
print("PASS")'''},

    # 48. Strange Printer
    {"id": 48, "name": "strange_printer", "difficulty": "extreme",
     "template": '''def strange_printer(s):
    """Minimum turns for strange printer."""
    pass

assert strange_printer("aaabbb") == 2
assert strange_printer("aba") == 2
assert strange_printer("abcabc") == 5
print("PASS")'''},

    # 49. Binary Tree Cameras
    {"id": 49, "name": "min_camera_cover", "difficulty": "extreme",
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

    # 50. Minimum Number of Refueling Stops
    {"id": 50, "name": "min_refuel_stops", "difficulty": "extreme",
     "template": '''def min_refuel_stops(target, startFuel, stations):
    """Minimum refueling stops to reach target."""
    pass

assert min_refuel_stops(1, 1, []) == 0
assert min_refuel_stops(100, 1, [[10,100]]) == -1
assert min_refuel_stops(100, 10, [[10,60],[20,30],[30,30],[60,40]]) == 2
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
        prompt = f"""You are an expert competitive programmer. Solve this {difficulty.upper()} challenge.

CRITICAL INSTRUCTIONS:
1. Replace ALL `pass` statements with working code
2. Do NOT change assert statements or print("PASS")
3. Return ONLY the complete Python code
4. Use optimal time/space complexity

CHALLENGE:
```python
{template}
```

Return complete working code:"""

        try:
            response = await self.client.post(
                self.mistral_url,
                headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                json={"model": "mistral-small-latest", "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.1, "max_tokens": 3000}
            )
            if response.status_code == 200:
                code = response.json()["choices"][0]["message"]["content"]
                code = self._extract_code(code)
                self.stats["mistral"] += 1
                return code
        except Exception as e:
            logger.warning(f"Mistral failed: {e}")

        try:
            response = await self.client.post(
                self.gemini_url, headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1, "maxOutputTokens": 3000}}
            )
            if response.status_code == 200:
                code = response.json()["candidates"][0]["content"]["parts"][0]["text"]
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
            if end > start: return text[start:end].strip()
        if "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end > start: return text[start:end].strip()
        return text.strip()

    async def close(self):
        await self.client.aclose()


class ExtremeChallenge:
    def __init__(self):
        self.openhands = OpenHandsClient(timeout=30.0)
        self.generator = AgentCodeGenerator()
        logger.info(f"ExtremeChallenge: {len(HARD_CHALLENGES)} hard + {len(EXTREME_CHALLENGES)} extreme = {len(ALL_CHALLENGES)} total")

    async def run_challenge(self, ch: dict) -> dict:
        start = time.time()
        code = await self.generator.generate_code(ch["template"], ch["name"], ch["difficulty"])

        try:
            result = await self.openhands.execute(instructions=f"Challenge {ch['name']}", code=code, run_tests=False)
            elapsed = time.time() - start
            passed = result.success and "PASS" in result.output
            reward = compute_reward(code, {"passed": passed}, {"difficulty": ch["difficulty"], "template": ch["template"]})
            return {"id": ch["id"], "name": ch["name"], "difficulty": ch["difficulty"], "passed": passed, "reward": reward, "elapsed_ms": int(elapsed * 1000)}
        except Exception as e:
            return {"id": ch["id"], "name": ch["name"], "difficulty": ch["difficulty"], "passed": False, "reward": 0.25, "elapsed_ms": int((time.time() - start) * 1000)}

    async def run_all(self, iterations: int = 1) -> dict:
        logger.info("=" * 60)
        logger.info("GENESIS EXTREME CHALLENGE - 50 HARD/EXTREME TESTS")
        logger.info("25 Hard | 25 Extreme")
        logger.info("=" * 60)

        best_results = None
        best_passed = 0

        for iteration in range(1, iterations + 1):
            logger.info(f"\n>>> ITERATION {iteration}/{iterations} <<<\n")
            results = []

            for ch in ALL_CHALLENGES:
                result = await self.run_challenge(ch)
                status = "PASS" if result["passed"] else "FAIL"
                logger.info(f"  [{result['id']:02d}] {result['name']} ({result['difficulty']}): {status} (R={result['reward']:.3f}, {result['elapsed_ms']}ms)")
                results.append(result)

            hard_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "hard")
            extreme_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "extreme")
            total_passed = hard_passed + extreme_passed
            total_reward = sum(r["reward"] for r in results)

            logger.info(f"\n--- Iteration {iteration} ---")
            logger.info(f"Hard: {hard_passed}/25 | Extreme: {extreme_passed}/25 | Total: {total_passed}/50 ({total_passed*2}%)")
            logger.info(f"Reward: {total_reward:.2f}")

            if total_passed > best_passed:
                best_passed = total_passed
                best_results = {"iteration": iteration, "hard_passed": hard_passed, "extreme_passed": extreme_passed,
                               "total_passed": total_passed, "total_reward": total_reward, "results": results}

        await self.generator.close()

        logger.info("\n" + "=" * 60)
        logger.info("FINAL RESULTS")
        logger.info("=" * 60)
        logger.info(f"Hard: {best_results['hard_passed']}/25 ({best_results['hard_passed']*4}%)")
        logger.info(f"Extreme: {best_results['extreme_passed']}/25 ({best_results['extreme_passed']*4}%)")
        logger.info(f"Total: {best_results['total_passed']}/50 ({best_results['total_passed']*2}%)")
        logger.info(f"Reward: {best_results['total_reward']:.2f}")
        logger.info(f"LLM: Mistral={self.generator.stats['mistral']}, Gemini={self.generator.stats['gemini']}")

        output = {
            "iterations": iterations,
            "best_passed": best_results["total_passed"],
            "best_reward": best_results["total_reward"],
            "pass_rate": best_results["total_passed"] * 2,
            "breakdown": {"hard": {"passed": best_results["hard_passed"], "total": 25},
                         "extreme": {"passed": best_results["extreme_passed"], "total": 25}},
            "llm_stats": self.generator.stats
        }

        Path("data").mkdir(exist_ok=True)
        with open("data/extreme_results.json", "w") as f:
            json.dump(output, f, indent=2)

        return output


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=1)
    args = parser.parse_args()

    challenge = ExtremeChallenge()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
