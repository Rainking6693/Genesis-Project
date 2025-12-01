#!/usr/bin/env python3
"""
Genesis Mixed Difficulty Challenge - 50 Tests
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
logger = logging.getLogger("mixed_challenge")

# API Keys
MISTRAL_API_KEY = "xBClmFrEWnHJcdrxjJU65frPPXytIYKK"
GEMINI_API_KEY = "AIzaSyDOYNHjGyhEgvKU0SlfXDGdnqUiWE4_6lE"

# Import infrastructure
from infrastructure.openhands_local import OpenHandsClient


def compute_reward(code: str, result: dict, challenge: dict) -> float:
    """Calculate reward based on execution results."""
    passed = result.get("passed", False)
    difficulty = challenge.get("difficulty", "intermediate")

    # Base reward by difficulty
    difficulty_weights = {"easy": 1.0, "intermediate": 1.5, "hard": 2.5}
    base_weight = difficulty_weights.get(difficulty, 1.5)

    if passed:
        # Full credit + difficulty bonus
        return 1.5 * base_weight
    else:
        # Partial credit for implementation attempt
        has_impl = "pass" not in code.lower() or len(code) > len(challenge.get("template", ""))
        if has_impl:
            return 0.3 * base_weight
        return 0.1 * base_weight

# ============================================================
# EASY CHALLENGES (1-10)
# ============================================================
EASY_CHALLENGES = [
    # 1. Two Sum
    {"id": 1, "name": "two_sum", "difficulty": "easy",
     "template": '''def two_sum(nums, target):
    """Find two indices that add up to target."""
    pass

assert two_sum([2,7,11,15], 9) == [0,1]
assert two_sum([3,2,4], 6) == [1,2]
assert two_sum([3,3], 6) == [0,1]
print("PASS")'''},

    # 2. Reverse String
    {"id": 2, "name": "reverse_string", "difficulty": "easy",
     "template": '''def reverse_string(s):
    """Reverse a string in place (as list of chars)."""
    pass
    return s

assert reverse_string(["h","e","l","l","o"]) == ["o","l","l","e","h"]
assert reverse_string(["H","a","n","n","a","h"]) == ["h","a","n","n","a","H"]
print("PASS")'''},

    # 3. Valid Parentheses
    {"id": 3, "name": "valid_parentheses", "difficulty": "easy",
     "template": '''def is_valid(s):
    """Check if parentheses are valid."""
    pass

assert is_valid("()") == True
assert is_valid("()[]{}") == True
assert is_valid("(]") == False
assert is_valid("([)]") == False
assert is_valid("{[]}") == True
print("PASS")'''},

    # 4. Maximum Subarray (Kadane's)
    {"id": 4, "name": "max_subarray", "difficulty": "easy",
     "template": '''def max_subarray(nums):
    """Find contiguous subarray with largest sum."""
    pass

assert max_subarray([-2,1,-3,4,-1,2,1,-5,4]) == 6
assert max_subarray([1]) == 1
assert max_subarray([5,4,-1,7,8]) == 23
print("PASS")'''},

    # 5. Merge Sorted Arrays
    {"id": 5, "name": "merge_sorted", "difficulty": "easy",
     "template": '''def merge(nums1, m, nums2, n):
    """Merge nums2 into nums1 in-place."""
    pass
    return nums1

n1 = [1,2,3,0,0,0]
merge(n1, 3, [2,5,6], 3)
assert n1 == [1,2,2,3,5,6]
print("PASS")'''},

    # 6. Climbing Stairs
    {"id": 6, "name": "climb_stairs", "difficulty": "easy",
     "template": '''def climb_stairs(n):
    """Count ways to climb n stairs (1 or 2 steps)."""
    pass

assert climb_stairs(2) == 2
assert climb_stairs(3) == 3
assert climb_stairs(4) == 5
assert climb_stairs(5) == 8
print("PASS")'''},

    # 7. Best Time to Buy/Sell Stock
    {"id": 7, "name": "max_profit", "difficulty": "easy",
     "template": '''def max_profit(prices):
    """Find max profit from single buy/sell."""
    pass

assert max_profit([7,1,5,3,6,4]) == 5
assert max_profit([7,6,4,3,1]) == 0
assert max_profit([2,4,1]) == 2
print("PASS")'''},

    # 8. Palindrome Number
    {"id": 8, "name": "is_palindrome_num", "difficulty": "easy",
     "template": '''def is_palindrome(x):
    """Check if integer is palindrome."""
    pass

assert is_palindrome(121) == True
assert is_palindrome(-121) == False
assert is_palindrome(10) == False
assert is_palindrome(12321) == True
print("PASS")'''},

    # 9. Single Number (XOR)
    {"id": 9, "name": "single_number", "difficulty": "easy",
     "template": '''def single_number(nums):
    """Find element that appears once (others appear twice)."""
    pass

assert single_number([2,2,1]) == 1
assert single_number([4,1,2,1,2]) == 4
assert single_number([1]) == 1
print("PASS")'''},

    # 10. Contains Duplicate
    {"id": 10, "name": "contains_duplicate", "difficulty": "easy",
     "template": '''def contains_duplicate(nums):
    """Check if any value appears twice."""
    pass

assert contains_duplicate([1,2,3,1]) == True
assert contains_duplicate([1,2,3,4]) == False
assert contains_duplicate([1,1,1,3,3,4,3,2,4,2]) == True
print("PASS")'''},
]

# ============================================================
# INTERMEDIATE CHALLENGES (11-25)
# ============================================================
INTERMEDIATE_CHALLENGES = [
    # 11. Product of Array Except Self
    {"id": 11, "name": "product_except_self", "difficulty": "intermediate",
     "template": '''def product_except_self(nums):
    """Return array where each element is product of all others."""
    pass

assert product_except_self([1,2,3,4]) == [24,12,8,6]
assert product_except_self([-1,1,0,-3,3]) == [0,0,9,0,0]
print("PASS")'''},

    # 12. Rotate Array
    {"id": 12, "name": "rotate_array", "difficulty": "intermediate",
     "template": '''def rotate(nums, k):
    """Rotate array right by k steps in-place."""
    pass
    return nums

assert rotate([1,2,3,4,5,6,7], 3) == [5,6,7,1,2,3,4]
assert rotate([-1,-100,3,99], 2) == [3,99,-1,-100]
print("PASS")'''},

    # 13. Find Minimum in Rotated Sorted Array
    {"id": 13, "name": "find_min_rotated", "difficulty": "intermediate",
     "template": '''def find_min(nums):
    """Find minimum in rotated sorted array."""
    pass

assert find_min([3,4,5,1,2]) == 1
assert find_min([4,5,6,7,0,1,2]) == 0
assert find_min([11,13,15,17]) == 11
print("PASS")'''},

    # 14. Container With Most Water
    {"id": 14, "name": "max_area", "difficulty": "intermediate",
     "template": '''def max_area(height):
    """Find max water container can store."""
    pass

assert max_area([1,8,6,2,5,4,8,3,7]) == 49
assert max_area([1,1]) == 1
assert max_area([4,3,2,1,4]) == 16
print("PASS")'''},

    # 15. Longest Substring Without Repeating
    {"id": 15, "name": "length_of_longest_substring", "difficulty": "intermediate",
     "template": '''def length_of_longest_substring(s):
    """Length of longest substring without repeating chars."""
    pass

assert length_of_longest_substring("abcabcbb") == 3
assert length_of_longest_substring("bbbbb") == 1
assert length_of_longest_substring("pwwkew") == 3
assert length_of_longest_substring("") == 0
print("PASS")'''},

    # 16. Set Matrix Zeroes
    {"id": 16, "name": "set_zeroes", "difficulty": "intermediate",
     "template": '''def set_zeroes(matrix):
    """Set entire row/col to 0 if element is 0."""
    pass
    return matrix

m1 = [[1,1,1],[1,0,1],[1,1,1]]
assert set_zeroes(m1) == [[1,0,1],[0,0,0],[1,0,1]]
m2 = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]
assert set_zeroes(m2) == [[0,0,0,0],[0,4,5,0],[0,3,1,0]]
print("PASS")'''},

    # 17. Spiral Matrix
    {"id": 17, "name": "spiral_order", "difficulty": "intermediate",
     "template": '''def spiral_order(matrix):
    """Return elements in spiral order."""
    pass

assert spiral_order([[1,2,3],[4,5,6],[7,8,9]]) == [1,2,3,6,9,8,7,4,5]
assert spiral_order([[1,2,3,4],[5,6,7,8],[9,10,11,12]]) == [1,2,3,4,8,12,11,10,9,5,6,7]
print("PASS")'''},

    # 18. Jump Game
    {"id": 18, "name": "can_jump", "difficulty": "intermediate",
     "template": '''def can_jump(nums):
    """Check if you can reach last index."""
    pass

assert can_jump([2,3,1,1,4]) == True
assert can_jump([3,2,1,0,4]) == False
assert can_jump([0]) == True
print("PASS")'''},

    # 19. Unique Paths
    {"id": 19, "name": "unique_paths", "difficulty": "intermediate",
     "template": '''def unique_paths(m, n):
    """Count unique paths in m x n grid."""
    pass

assert unique_paths(3, 7) == 28
assert unique_paths(3, 2) == 3
assert unique_paths(7, 3) == 28
assert unique_paths(3, 3) == 6
print("PASS")'''},

    # 20. Coin Change
    {"id": 20, "name": "coin_change", "difficulty": "intermediate",
     "template": '''def coin_change(coins, amount):
    """Minimum coins to make amount, -1 if impossible."""
    pass

assert coin_change([1,2,5], 11) == 3
assert coin_change([2], 3) == -1
assert coin_change([1], 0) == 0
print("PASS")'''},

    # 21. House Robber
    {"id": 21, "name": "rob", "difficulty": "intermediate",
     "template": '''def rob(nums):
    """Max money without robbing adjacent houses."""
    pass

assert rob([1,2,3,1]) == 4
assert rob([2,7,9,3,1]) == 12
assert rob([2,1,1,2]) == 4
print("PASS")'''},

    # 22. Decode Ways
    {"id": 22, "name": "num_decodings", "difficulty": "intermediate",
     "template": '''def num_decodings(s):
    """Count ways to decode number string to letters."""
    pass

assert num_decodings("12") == 2
assert num_decodings("226") == 3
assert num_decodings("06") == 0
assert num_decodings("11106") == 2
print("PASS")'''},

    # 23. Combination Sum
    {"id": 23, "name": "combination_sum", "difficulty": "intermediate",
     "template": '''def combination_sum(candidates, target):
    """Find all combinations that sum to target."""
    pass

result = combination_sum([2,3,6,7], 7)
assert sorted([sorted(x) for x in result]) == [[2,2,3], [7]]
result2 = combination_sum([2,3,5], 8)
assert sorted([sorted(x) for x in result2]) == [[2,2,2,2], [2,3,3], [3,5]]
print("PASS")'''},

    # 24. Permutations
    {"id": 24, "name": "permute", "difficulty": "intermediate",
     "template": '''def permute(nums):
    """Return all permutations."""
    pass

result = permute([1,2,3])
expected = [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
assert sorted(result) == sorted(expected)
print("PASS")'''},

    # 25. Subsets
    {"id": 25, "name": "subsets", "difficulty": "intermediate",
     "template": '''def subsets(nums):
    """Return all subsets (power set)."""
    pass

result = subsets([1,2,3])
expected = [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]
assert sorted([sorted(x) for x in result]) == sorted([sorted(x) for x in expected])
print("PASS")'''},
]

# ============================================================
# HARD CHALLENGES (26-50)
# ============================================================
HARD_CHALLENGES = [
    # 26. Median of Two Sorted Arrays
    {"id": 26, "name": "find_median_sorted_arrays", "difficulty": "hard",
     "template": '''def find_median_sorted_arrays(nums1, nums2):
    """Find median of two sorted arrays in O(log(m+n))."""
    pass

assert find_median_sorted_arrays([1,3], [2]) == 2.0
assert find_median_sorted_arrays([1,2], [3,4]) == 2.5
assert find_median_sorted_arrays([0,0], [0,0]) == 0.0
print("PASS")'''},

    # 27. Regular Expression Matching
    {"id": 27, "name": "is_match_regex", "difficulty": "hard",
     "template": '''def is_match(s, p):
    """Regex matching with . and * support."""
    pass

assert is_match("aa", "a") == False
assert is_match("aa", "a*") == True
assert is_match("ab", ".*") == True
assert is_match("aab", "c*a*b") == True
print("PASS")'''},

    # 28. Merge K Sorted Lists
    {"id": 28, "name": "merge_k_lists", "difficulty": "hard",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def to_list(node):
    result = []
    while node:
        result.append(node.val)
        node = node.next
    return result

def from_list(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def merge_k_lists(lists):
    """Merge k sorted linked lists."""
    pass

lists = [from_list([1,4,5]), from_list([1,3,4]), from_list([2,6])]
assert to_list(merge_k_lists(lists)) == [1,1,2,3,4,4,5,6]
assert merge_k_lists([]) == None
print("PASS")'''},

    # 29. Trapping Rain Water
    {"id": 29, "name": "trap_rain_water", "difficulty": "hard",
     "template": '''def trap(height):
    """Calculate trapped rain water."""
    pass

assert trap([0,1,0,2,1,0,1,3,2,1,2,1]) == 6
assert trap([4,2,0,3,2,5]) == 9
assert trap([4,2,3]) == 1
print("PASS")'''},

    # 30. N-Queens
    {"id": 30, "name": "solve_n_queens", "difficulty": "hard",
     "template": '''def solve_n_queens(n):
    """Solve N-Queens problem, return all solutions."""
    pass

result = solve_n_queens(4)
assert len(result) == 2
assert [".Q..","...Q","Q...","..Q."] in result
print("PASS")'''},

    # 31. Longest Valid Parentheses
    {"id": 31, "name": "longest_valid_parentheses", "difficulty": "hard",
     "template": '''def longest_valid_parentheses(s):
    """Length of longest valid parentheses substring."""
    pass

assert longest_valid_parentheses("(()") == 2
assert longest_valid_parentheses(")()())") == 4
assert longest_valid_parentheses("") == 0
assert longest_valid_parentheses("()(()") == 2
print("PASS")'''},

    # 32. Edit Distance
    {"id": 32, "name": "min_distance", "difficulty": "hard",
     "template": '''def min_distance(word1, word2):
    """Minimum edit operations to convert word1 to word2."""
    pass

assert min_distance("horse", "ros") == 3
assert min_distance("intention", "execution") == 5
assert min_distance("", "a") == 1
print("PASS")'''},

    # 33. Longest Increasing Subsequence
    {"id": 33, "name": "length_of_lis", "difficulty": "hard",
     "template": '''def length_of_lis(nums):
    """Length of longest strictly increasing subsequence."""
    pass

assert length_of_lis([10,9,2,5,3,7,101,18]) == 4
assert length_of_lis([0,1,0,3,2,3]) == 4
assert length_of_lis([7,7,7,7,7,7,7]) == 1
print("PASS")'''},

    # 34. Word Ladder
    {"id": 34, "name": "ladder_length", "difficulty": "hard",
     "template": '''def ladder_length(begin_word, end_word, word_list):
    """Shortest transformation sequence length."""
    pass

assert ladder_length("hit", "cog", ["hot","dot","dog","lot","log","cog"]) == 5
assert ladder_length("hit", "cog", ["hot","dot","dog","lot","log"]) == 0
print("PASS")'''},

    # 35. Serialize/Deserialize Binary Tree
    {"id": 35, "name": "serialize_tree", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def serialize(root):
    """Encode tree to string."""
    pass

def deserialize(data):
    """Decode string to tree."""
    pass

# Test
root = TreeNode(1, TreeNode(2), TreeNode(3, TreeNode(4), TreeNode(5)))
encoded = serialize(root)
decoded = deserialize(encoded)
assert decoded.val == 1
assert decoded.left.val == 2
assert decoded.right.val == 3
assert decoded.right.left.val == 4
print("PASS")'''},

    # 36. Maximal Rectangle
    {"id": 36, "name": "maximal_rectangle", "difficulty": "hard",
     "template": '''def maximal_rectangle(matrix):
    """Find largest rectangle containing only 1s."""
    pass

matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]
assert maximal_rectangle(matrix) == 6
assert maximal_rectangle([["0"]]) == 0
assert maximal_rectangle([["1"]]) == 1
print("PASS")'''},

    # 37. Minimum Window Substring
    {"id": 37, "name": "min_window_hard", "difficulty": "hard",
     "template": '''def min_window(s, t):
    """Minimum window in s containing all chars of t."""
    pass

assert min_window("ADOBECODEBANC", "ABC") == "BANC"
assert min_window("a", "a") == "a"
assert min_window("a", "aa") == ""
print("PASS")'''},

    # 38. Word Search II
    {"id": 38, "name": "find_words", "difficulty": "hard",
     "template": '''def find_words(board, words):
    """Find all words from list that exist in board."""
    pass

board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]]
words = ["oath","pea","eat","rain"]
result = find_words(board, words)
assert sorted(result) == ["eat", "oath"]
print("PASS")'''},

    # 39. Alien Dictionary
    {"id": 39, "name": "alien_order", "difficulty": "hard",
     "template": '''def alien_order(words):
    """Derive alien alphabet order from sorted words."""
    pass

result = alien_order(["wrt","wrf","er","ett","rftt"])
assert result == "wertf" or set(result) == set("wertf")
assert alien_order(["z","x"]) in ["zx", "xz"] or alien_order(["z","x"]) == "zx"
print("PASS")'''},

    # 40. Burst Balloons
    {"id": 40, "name": "max_coins", "difficulty": "hard",
     "template": '''def max_coins(nums):
    """Maximum coins from bursting balloons."""
    pass

assert max_coins([3,1,5,8]) == 167
assert max_coins([1,5]) == 10
print("PASS")'''},

    # 41. Palindrome Partitioning II
    {"id": 41, "name": "min_cut", "difficulty": "hard",
     "template": '''def min_cut(s):
    """Minimum cuts for palindrome partitioning."""
    pass

assert min_cut("aab") == 1
assert min_cut("a") == 0
assert min_cut("ab") == 1
print("PASS")'''},

    # 42. Count of Smaller Numbers After Self
    {"id": 42, "name": "count_smaller", "difficulty": "hard",
     "template": '''def count_smaller(nums):
    """Count smaller elements to the right of each element."""
    pass

assert count_smaller([5,2,6,1]) == [2,1,1,0]
assert count_smaller([-1]) == [0]
assert count_smaller([-1,-1]) == [0,0]
print("PASS")'''},

    # 43. Longest Substring with At Most K Distinct Characters
    {"id": 43, "name": "length_of_longest_k", "difficulty": "hard",
     "template": '''def length_of_longest_k(s, k):
    """Longest substring with at most k distinct chars."""
    pass

assert length_of_longest_k("eceba", 2) == 3
assert length_of_longest_k("aa", 1) == 2
assert length_of_longest_k("a", 0) == 0
print("PASS")'''},

    # 44. Sliding Window Maximum
    {"id": 44, "name": "max_sliding_window", "difficulty": "hard",
     "template": '''def max_sliding_window(nums, k):
    """Maximum in each sliding window of size k."""
    pass

assert max_sliding_window([1,3,-1,-3,5,3,6,7], 3) == [3,3,5,5,6,7]
assert max_sliding_window([1], 1) == [1]
assert max_sliding_window([1,-1], 1) == [1,-1]
print("PASS")'''},

    # 45. Binary Tree Maximum Path Sum
    {"id": 45, "name": "max_path_sum", "difficulty": "hard",
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

    # 46. Find Kth Largest Element
    {"id": 46, "name": "find_kth_largest", "difficulty": "hard",
     "template": '''def find_kth_largest(nums, k):
    """Find kth largest element using quickselect."""
    pass

assert find_kth_largest([3,2,1,5,6,4], 2) == 5
assert find_kth_largest([3,2,3,1,2,4,5,5,6], 4) == 4
print("PASS")'''},

    # 47. Reverse Nodes in K-Group
    {"id": 47, "name": "reverse_k_group", "difficulty": "hard",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def to_list(node):
    result = []
    while node:
        result.append(node.val)
        node = node.next
    return result

def from_list(arr):
    if not arr:
        return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def reverse_k_group(head, k):
    """Reverse nodes in groups of k."""
    pass

assert to_list(reverse_k_group(from_list([1,2,3,4,5]), 2)) == [2,1,4,3,5]
assert to_list(reverse_k_group(from_list([1,2,3,4,5]), 3)) == [3,2,1,4,5]
print("PASS")'''},

    # 48. Sudoku Solver
    {"id": 48, "name": "solve_sudoku", "difficulty": "hard",
     "template": '''def solve_sudoku(board):
    """Solve sudoku in-place."""
    pass
    return board

board = [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]
solve_sudoku(board)
assert board[0][2] == "4"
assert board[2][0] == "1"
print("PASS")'''},

    # 49. Word Break II
    {"id": 49, "name": "word_break_ii", "difficulty": "hard",
     "template": '''def word_break_ii(s, word_dict):
    """Return all possible sentence breakings."""
    pass

result = word_break_ii("catsanddog", ["cat","cats","and","sand","dog"])
expected = ["cats and dog", "cat sand dog"]
assert sorted(result) == sorted(expected)
print("PASS")'''},

    # 50. LFU Cache
    {"id": 50, "name": "lfu_cache", "difficulty": "hard",
     "template": '''class LFUCache:
    """Least Frequently Used cache implementation."""

    def __init__(self, capacity):
        pass

    def get(self, key):
        pass

    def put(self, key, value):
        pass

cache = LFUCache(2)
cache.put(1, 1)
cache.put(2, 2)
assert cache.get(1) == 1
cache.put(3, 3)  # evicts 2
assert cache.get(2) == -1
assert cache.get(3) == 3
cache.put(4, 4)  # evicts 1
assert cache.get(1) == -1
assert cache.get(3) == 3
assert cache.get(4) == 4
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


class MixedChallenge:
    """Run mixed difficulty challenge suite."""

    def __init__(self):
        self.openhands = OpenHandsClient()
        self.generator = AgentCodeGenerator()
        self.challenges = ALL_CHALLENGES
        logger.info(f"MixedChallenge initialized with {len(self.challenges)} challenges")
        logger.info(f"  Easy: {len(EASY_CHALLENGES)}, Intermediate: {len(INTERMEDIATE_CHALLENGES)}, Hard: {len(HARD_CHALLENGES)}")

    async def run_challenge(self, challenge: dict) -> dict:
        """Run a single challenge."""
        start_time = time.time()
        ch_id = challenge["id"]
        name = challenge["name"]
        difficulty = challenge["difficulty"]
        template = challenge["template"]

        # Generate code using LLM
        generated_code = await self.generator.generate_code(template, name, difficulty)

        # Execute generated code
        result = await self.openhands.execute(instructions=f"Challenge {name}", code=generated_code, run_tests=False)
        elapsed = time.time() - start_time

        # Check if passed
        passed = result.success and "PASS" in result.output

        # Calculate reward
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
        logger.info("GENESIS MIXED DIFFICULTY CHALLENGE - 50 TESTS")
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

            # Count by difficulty
            easy_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "easy")
            inter_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "intermediate")
            hard_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "hard")
            total_passed = easy_passed + inter_passed + hard_passed
            total_reward = sum(r["reward"] for r in results)

            logger.info(f"\n--- Iteration {iteration} Summary ---")
            logger.info(f"Easy: {easy_passed}/10 | Intermediate: {inter_passed}/15 | Hard: {hard_passed}/25")
            logger.info(f"Total: {total_passed}/50 ({total_passed * 2}%) | Reward: {total_reward:.2f}")

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

        # Final summary
        logger.info("\n" + "=" * 60)
        logger.info("FINAL RESULTS")
        logger.info("=" * 60)
        logger.info(f"Best iteration: {best_results['iteration']}")
        logger.info(f"Easy: {best_results['easy_passed']}/10 ({best_results['easy_passed']*10}%)")
        logger.info(f"Intermediate: {best_results['intermediate_passed']}/15 ({round(best_results['intermediate_passed']/15*100)}%)")
        logger.info(f"Hard: {best_results['hard_passed']}/25 ({best_results['hard_passed']*4}%)")
        logger.info(f"Total: {best_results['total_passed']}/50 ({best_results['total_passed']*2}%)")
        logger.info(f"Total Reward: {best_results['total_reward']:.2f}")
        logger.info(f"LLM Stats: Mistral={self.generator.stats['mistral']}, Gemini={self.generator.stats['gemini']}, Errors={self.generator.stats['errors']}")

        # Save results
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

        output_path = Path("data/mixed_results.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"\nResults saved to {output_path}")

        return output


async def main():
    parser = argparse.ArgumentParser(description="Genesis Mixed Difficulty Challenge")
    parser.add_argument("--iterations", type=int, default=1, help="Number of iterations")
    args = parser.parse_args()

    challenge = MixedChallenge()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
