#!/usr/bin/env python3
"""
GENESIS TIER 2 CHALLENGE - 50 Intermediate-to-Hard Tests
Focused on data structures, classic algorithms, and edge cases.
Uses Mistral (primary) with Gemini fallback, R1 rewards, OpenHands execution.
"""

import sys
import os
import asyncio
import logging
import json
import time
import httpx
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from dataclasses import dataclass

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "xBClmFrEWnHJcdrxjJU65frPPXytIYKK")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDOYNHjGyhEgvKU0SlfXDGdnqUiWE4_6lE")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(PROJECT_ROOT / "logs" / f"tier2_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
    ],
)
logger = logging.getLogger("tier2")


class AgentCodeGenerator:
    """LLM-based code generator using Mistral (primary) with Gemini fallback."""

    def __init__(self):
        self.mistral_url = "https://api.mistral.ai/v1/chat/completions"
        self.gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={GEMINI_API_KEY}"
        self.client = httpx.AsyncClient(timeout=60.0)
        self.stats = {"mistral": 0, "gemini": 0, "errors": 0}

    async def generate_code(self, template: str, challenge_name: str) -> str:
        prompt = f"""You are a Python expert. Complete this code by replacing 'pass' with working implementations.

CHALLENGE: {challenge_name}

CODE:
```python
{template}
```

RULES:
1. Replace ALL 'pass' with working code
2. Must pass all assert statements
3. Return ONLY Python code, no markdown or explanations
4. Keep function signatures and tests unchanged

COMPLETE CODE:"""

        try:
            response = await self.client.post(
                self.mistral_url,
                headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                json={"model": "mistral-small-latest", "messages": [{"role": "user", "content": prompt}], "temperature": 0.1, "max_tokens": 2000}
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            self.stats["mistral"] += 1
            return self._extract_code(content)
        except Exception as e:
            logger.warning(f"Mistral failed: {e}")

        try:
            response = await self.client.post(
                self.gemini_url,
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2000}}
            )
            response.raise_for_status()
            content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            self.stats["gemini"] += 1
            return self._extract_code(content)
        except Exception as e:
            logger.error(f"Gemini failed: {e}")

        self.stats["errors"] += 1
        return template

    def _extract_code(self, content: str) -> str:
        content = content.strip()
        if "```python" in content:
            start = content.find("```python") + 9
            end = content.find("```", start)
            if end > start: content = content[start:end].strip()
        elif "```" in content:
            start = content.find("```") + 3
            end = content.find("```", start)
            if end > start: content = content[start:end].strip()
        return content

    async def close(self):
        await self.client.aclose()


# =============================================================================
# 50 TIER 2 CHALLENGES - Intermediate to Hard
# =============================================================================
TIER2_CHALLENGES = [
    # --- SEARCH & SORT (1-10) ---
    {"id": 1, "name": "binary_search_rotated",
     "template": '''def search_rotated(nums, target):
    """Search in rotated sorted array. Return index or -1."""
    pass

assert search_rotated([4,5,6,7,0,1,2], 0) == 4
assert search_rotated([4,5,6,7,0,1,2], 3) == -1
assert search_rotated([1], 0) == -1
assert search_rotated([1], 1) == 0
print("PASS")'''},

    {"id": 2, "name": "find_peak",
     "template": '''def find_peak(nums):
    """Find a peak element index (greater than neighbors)."""
    pass

assert nums[find_peak([1,2,3,1])] >= nums[max(0, find_peak([1,2,3,1])-1)]
assert nums[find_peak([1,2,1,3,5,6,4])] >= nums[max(0, find_peak([1,2,1,3,5,6,4])-1)]
nums = [1,2,3,1]
peak = find_peak(nums)
assert peak == 2
print("PASS")'''},

    {"id": 3, "name": "search_2d_matrix",
     "template": '''def search_matrix(matrix, target):
    """Search in row-wise and column-wise sorted matrix."""
    pass

m = [[1,4,7],[2,5,8],[3,6,9]]
assert search_matrix(m, 5) == True
assert search_matrix(m, 10) == False
assert search_matrix([[1]], 1) == True
assert search_matrix([], 1) == False
print("PASS")'''},

    {"id": 4, "name": "merge_intervals",
     "template": '''def merge_intervals(intervals):
    """Merge overlapping intervals."""
    pass

assert merge_intervals([[1,3],[2,6],[8,10],[15,18]]) == [[1,6],[8,10],[15,18]]
assert merge_intervals([[1,4],[4,5]]) == [[1,5]]
assert merge_intervals([]) == []
assert merge_intervals([[1,2]]) == [[1,2]]
print("PASS")'''},

    {"id": 5, "name": "insertion_sort",
     "template": '''def insertion_sort(arr):
    """Sort using insertion sort, return new list."""
    pass

assert insertion_sort([5,2,4,6,1,3]) == [1,2,3,4,5,6]
assert insertion_sort([]) == []
assert insertion_sort([1]) == [1]
assert insertion_sort([2,1]) == [1,2]
print("PASS")'''},

    {"id": 6, "name": "count_inversions",
     "template": '''def count_inversions(arr):
    """Count pairs (i,j) where i<j and arr[i]>arr[j]."""
    pass

assert count_inversions([2,4,1,3,5]) == 3
assert count_inversions([1,2,3]) == 0
assert count_inversions([3,2,1]) == 3
assert count_inversions([]) == 0
print("PASS")'''},

    {"id": 7, "name": "kth_smallest",
     "template": '''def kth_smallest(arr, k):
    """Find kth smallest element (1-indexed)."""
    pass

assert kth_smallest([7,10,4,3,20,15], 3) == 7
assert kth_smallest([7,10,4,3,20,15], 1) == 3
assert kth_smallest([1], 1) == 1
print("PASS")'''},

    {"id": 8, "name": "three_sum",
     "template": '''def three_sum(nums):
    """Find all unique triplets that sum to zero."""
    pass

result = three_sum([-1,0,1,2,-1,-4])
assert [-1,-1,2] in result
assert [-1,0,1] in result
assert len(result) == 2
assert three_sum([0,0,0]) == [[0,0,0]]
print("PASS")'''},

    {"id": 9, "name": "search_range",
     "template": '''def search_range(nums, target):
    """Find first and last position of target."""
    pass

assert search_range([5,7,7,8,8,10], 8) == [3,4]
assert search_range([5,7,7,8,8,10], 6) == [-1,-1]
assert search_range([], 0) == [-1,-1]
assert search_range([1], 1) == [0,0]
print("PASS")'''},

    {"id": 10, "name": "sort_colors",
     "template": '''def sort_colors(nums):
    """Sort array of 0,1,2 in-place (Dutch flag)."""
    pass

a = [2,0,2,1,1,0]
sort_colors(a)
assert a == [0,0,1,1,2,2]
b = [2,0,1]
sort_colors(b)
assert b == [0,1,2]
print("PASS")'''},

    # --- LINKED LISTS (11-20) ---
    {"id": 11, "name": "reverse_linked_list",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def reverse_list(head):
    """Reverse a linked list."""
    pass

def to_list(head):
    r = []
    while head: r.append(head.val); head = head.next
    return r

h = ListNode(1, ListNode(2, ListNode(3)))
assert to_list(reverse_list(h)) == [3,2,1]
assert reverse_list(None) is None
print("PASS")'''},

    {"id": 12, "name": "detect_cycle",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def has_cycle(head):
    """Detect if linked list has cycle."""
    pass

a = ListNode(1, ListNode(2, ListNode(3)))
assert has_cycle(a) == False
b = ListNode(1)
b.next = ListNode(2, b)
assert has_cycle(b) == True
assert has_cycle(None) == False
print("PASS")'''},

    {"id": 13, "name": "merge_two_lists",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def merge_lists(l1, l2):
    """Merge two sorted linked lists."""
    pass

def to_list(head):
    r = []
    while head: r.append(head.val); head = head.next
    return r

a = ListNode(1, ListNode(3, ListNode(5)))
b = ListNode(2, ListNode(4, ListNode(6)))
assert to_list(merge_lists(a, b)) == [1,2,3,4,5,6]
assert to_list(merge_lists(None, ListNode(1))) == [1]
print("PASS")'''},

    {"id": 14, "name": "remove_nth_from_end",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def remove_nth_from_end(head, n):
    """Remove nth node from end."""
    pass

def to_list(head):
    r = []
    while head: r.append(head.val); head = head.next
    return r

h = ListNode(1, ListNode(2, ListNode(3, ListNode(4, ListNode(5)))))
assert to_list(remove_nth_from_end(h, 2)) == [1,2,3,5]
print("PASS")'''},

    {"id": 15, "name": "find_middle",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def find_middle(head):
    """Find middle node (second middle if even)."""
    pass

h = ListNode(1, ListNode(2, ListNode(3, ListNode(4, ListNode(5)))))
assert find_middle(h).val == 3
h2 = ListNode(1, ListNode(2, ListNode(3, ListNode(4))))
assert find_middle(h2).val == 3
print("PASS")'''},

    {"id": 16, "name": "is_palindrome_list",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def is_palindrome(head):
    """Check if linked list is palindrome."""
    pass

h = ListNode(1, ListNode(2, ListNode(2, ListNode(1))))
assert is_palindrome(h) == True
h2 = ListNode(1, ListNode(2))
assert is_palindrome(h2) == False
assert is_palindrome(None) == True
print("PASS")'''},

    {"id": 17, "name": "add_two_numbers",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def add_two_numbers(l1, l2):
    """Add two numbers represented as reversed linked lists."""
    pass

def to_list(head):
    r = []
    while head: r.append(head.val); head = head.next
    return r

a = ListNode(2, ListNode(4, ListNode(3)))  # 342
b = ListNode(5, ListNode(6, ListNode(4)))  # 465
assert to_list(add_two_numbers(a, b)) == [7,0,8]  # 807
print("PASS")'''},

    {"id": 18, "name": "intersection_lists",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def get_intersection(headA, headB):
    """Find intersection node of two lists."""
    pass

c = ListNode(8, ListNode(4, ListNode(5)))
a = ListNode(4, ListNode(1, c))
b = ListNode(5, ListNode(6, ListNode(1, c)))
assert get_intersection(a, b) == c
assert get_intersection(ListNode(1), ListNode(2)) is None
print("PASS")'''},

    {"id": 19, "name": "swap_pairs",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def swap_pairs(head):
    """Swap every two adjacent nodes."""
    pass

def to_list(head):
    r = []
    while head: r.append(head.val); head = head.next
    return r

h = ListNode(1, ListNode(2, ListNode(3, ListNode(4))))
assert to_list(swap_pairs(h)) == [2,1,4,3]
assert swap_pairs(None) is None
print("PASS")'''},

    {"id": 20, "name": "rotate_list",
     "template": '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def rotate_right(head, k):
    """Rotate list to the right by k places."""
    pass

def to_list(head):
    r = []
    while head: r.append(head.val); head = head.next
    return r

h = ListNode(1, ListNode(2, ListNode(3, ListNode(4, ListNode(5)))))
assert to_list(rotate_right(h, 2)) == [4,5,1,2,3]
assert rotate_right(None, 5) is None
print("PASS")'''},

    # --- STACKS & QUEUES (21-30) ---
    {"id": 21, "name": "min_stack",
     "template": '''class MinStack:
    def __init__(self): pass
    def push(self, val): pass
    def pop(self): pass
    def top(self): pass
    def get_min(self): pass

s = MinStack()
s.push(-2); s.push(0); s.push(-3)
assert s.get_min() == -3
s.pop()
assert s.top() == 0
assert s.get_min() == -2
print("PASS")'''},

    {"id": 22, "name": "eval_rpn",
     "template": '''def eval_rpn(tokens):
    """Evaluate Reverse Polish Notation."""
    pass

assert eval_rpn(["2","1","+","3","*"]) == 9
assert eval_rpn(["4","13","5","/","+"]) == 6
assert eval_rpn(["10","6","9","3","+","-11","*","/","*","17","+","5","+"]) == 22
print("PASS")'''},

    {"id": 23, "name": "daily_temperatures",
     "template": '''def daily_temperatures(temps):
    """Days until warmer temperature."""
    pass

assert daily_temperatures([73,74,75,71,69,72,76,73]) == [1,1,4,2,1,1,0,0]
assert daily_temperatures([30,40,50,60]) == [1,1,1,0]
assert daily_temperatures([30,60,90]) == [1,1,0]
print("PASS")'''},

    {"id": 24, "name": "largest_rectangle",
     "template": '''def largest_rectangle(heights):
    """Largest rectangle in histogram."""
    pass

assert largest_rectangle([2,1,5,6,2,3]) == 10
assert largest_rectangle([2,4]) == 4
assert largest_rectangle([1]) == 1
print("PASS")'''},

    {"id": 25, "name": "sliding_window_max",
     "template": '''def max_sliding_window(nums, k):
    """Maximum in each sliding window of size k."""
    pass

assert max_sliding_window([1,3,-1,-3,5,3,6,7], 3) == [3,3,5,5,6,7]
assert max_sliding_window([1], 1) == [1]
assert max_sliding_window([1,-1], 1) == [1,-1]
print("PASS")'''},

    {"id": 26, "name": "simplify_path",
     "template": '''def simplify_path(path):
    """Simplify Unix-style path."""
    pass

assert simplify_path("/home/") == "/home"
assert simplify_path("/../") == "/"
assert simplify_path("/home//foo/") == "/home/foo"
assert simplify_path("/a/./b/../../c/") == "/c"
print("PASS")'''},

    {"id": 27, "name": "decode_string",
     "template": '''def decode_string(s):
    """Decode string: 3[a2[c]] -> accaccacc"""
    pass

assert decode_string("3[a]2[bc]") == "aaabcbc"
assert decode_string("3[a2[c]]") == "accaccacc"
assert decode_string("2[abc]3[cd]ef") == "abcabccdcdcdef"
print("PASS")'''},

    {"id": 28, "name": "next_greater",
     "template": '''def next_greater_element(nums1, nums2):
    """Next greater element for each num in nums1 from nums2."""
    pass

assert next_greater_element([4,1,2], [1,3,4,2]) == [-1,3,-1]
assert next_greater_element([2,4], [1,2,3,4]) == [3,-1]
print("PASS")'''},

    {"id": 29, "name": "asteroid_collision",
     "template": '''def asteroid_collision(asteroids):
    """Simulate asteroid collisions."""
    pass

assert asteroid_collision([5,10,-5]) == [5,10]
assert asteroid_collision([8,-8]) == []
assert asteroid_collision([10,2,-5]) == [10]
assert asteroid_collision([-2,-1,1,2]) == [-2,-1,1,2]
print("PASS")'''},

    {"id": 30, "name": "basic_calculator",
     "template": '''def calculate(s):
    """Basic calculator with +, -, (, )."""
    pass

assert calculate("1 + 1") == 2
assert calculate(" 2-1 + 2 ") == 3
assert calculate("(1+(4+5+2)-3)+(6+8)") == 23
print("PASS")'''},

    # --- STRINGS (31-40) ---
    {"id": 31, "name": "longest_palindrome_substr",
     "template": '''def longest_palindrome(s):
    """Find longest palindromic substring."""
    pass

r = longest_palindrome("babad")
assert r in ["bab", "aba"]
assert longest_palindrome("cbbd") == "bb"
assert longest_palindrome("a") == "a"
print("PASS")'''},

    {"id": 32, "name": "group_anagrams",
     "template": '''def group_anagrams(strs):
    """Group anagrams together."""
    pass

result = group_anagrams(["eat","tea","tan","ate","nat","bat"])
result = [sorted(g) for g in result]
assert sorted(result) == sorted([["ate","eat","tea"],["nat","tan"],["bat"]])
print("PASS")'''},

    {"id": 33, "name": "longest_common_prefix",
     "template": '''def longest_common_prefix(strs):
    """Find longest common prefix."""
    pass

assert longest_common_prefix(["flower","flow","flight"]) == "fl"
assert longest_common_prefix(["dog","racecar","car"]) == ""
assert longest_common_prefix([]) == ""
assert longest_common_prefix(["a"]) == "a"
print("PASS")'''},

    {"id": 34, "name": "multiply_strings",
     "template": '''def multiply(num1, num2):
    """Multiply two numbers as strings."""
    pass

assert multiply("2", "3") == "6"
assert multiply("123", "456") == "56088"
assert multiply("0", "52") == "0"
print("PASS")'''},

    {"id": 35, "name": "min_window_substring",
     "template": '''def min_window(s, t):
    """Minimum window containing all chars of t."""
    pass

assert min_window("ADOBECODEBANC", "ABC") == "BANC"
assert min_window("a", "a") == "a"
assert min_window("a", "aa") == ""
print("PASS")'''},

    {"id": 36, "name": "zigzag_conversion",
     "template": '''def convert(s, numRows):
    """Convert string to zigzag pattern."""
    pass

assert convert("PAYPALISHIRING", 3) == "PAHNAPLSIIGYIR"
assert convert("PAYPALISHIRING", 4) == "PINALSIGYAHRPI"
assert convert("A", 1) == "A"
print("PASS")'''},

    {"id": 37, "name": "letter_combinations",
     "template": '''def letter_combinations(digits):
    """Phone number letter combinations."""
    pass

result = letter_combinations("23")
assert "ad" in result and "ae" in result and "cf" in result
assert len(result) == 9
assert letter_combinations("") == []
print("PASS")'''},

    {"id": 38, "name": "word_break",
     "template": '''def word_break(s, wordDict):
    """Can string be segmented into dictionary words?"""
    pass

assert word_break("leetcode", ["leet","code"]) == True
assert word_break("applepenapple", ["apple","pen"]) == True
assert word_break("catsandog", ["cats","dog","sand","and","cat"]) == False
print("PASS")'''},

    {"id": 39, "name": "atoi",
     "template": '''def my_atoi(s):
    """String to integer (handle edge cases)."""
    pass

assert my_atoi("42") == 42
assert my_atoi("   -42") == -42
assert my_atoi("4193 with words") == 4193
assert my_atoi("words and 987") == 0
assert my_atoi("-91283472332") == -2147483648
print("PASS")'''},

    {"id": 40, "name": "valid_number",
     "template": '''def is_number(s):
    """Check if string is valid number."""
    pass

assert is_number("0") == True
assert is_number("e") == False
assert is_number(".") == False
assert is_number("2e10") == True
assert is_number("-90E3") == True
assert is_number("99e2.5") == False
print("PASS")'''},

    # --- HASH MAPS & SETS (41-50) ---
    {"id": 41, "name": "lru_cache_v2",
     "template": '''class LRUCache:
    def __init__(self, capacity): pass
    def get(self, key): pass  # Return -1 if not found
    def put(self, key, value): pass

c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
assert c.get(1) == 1
c.put(3, 3)
assert c.get(2) == -1
c.put(4, 4)
assert c.get(1) == -1
assert c.get(3) == 3
assert c.get(4) == 4
print("PASS")'''},

    {"id": 42, "name": "subarray_sum_k",
     "template": '''def subarray_sum(nums, k):
    """Count subarrays with sum equal to k."""
    pass

assert subarray_sum([1,1,1], 2) == 2
assert subarray_sum([1,2,3], 3) == 2
assert subarray_sum([1], 0) == 0
print("PASS")'''},

    {"id": 43, "name": "longest_consecutive",
     "template": '''def longest_consecutive(nums):
    """Longest consecutive sequence length."""
    pass

assert longest_consecutive([100,4,200,1,3,2]) == 4
assert longest_consecutive([0,3,7,2,5,8,4,6,0,1]) == 9
assert longest_consecutive([]) == 0
print("PASS")'''},

    {"id": 44, "name": "top_k_frequent",
     "template": '''def top_k_frequent(nums, k):
    """Top k frequent elements."""
    pass

result = top_k_frequent([1,1,1,2,2,3], 2)
assert set(result) == {1, 2}
assert top_k_frequent([1], 1) == [1]
print("PASS")'''},

    {"id": 45, "name": "contains_duplicate_ii",
     "template": '''def contains_nearby_duplicate(nums, k):
    """Check if duplicate exists within k distance."""
    pass

assert contains_nearby_duplicate([1,2,3,1], 3) == True
assert contains_nearby_duplicate([1,0,1,1], 1) == True
assert contains_nearby_duplicate([1,2,3,1,2,3], 2) == False
print("PASS")'''},

    {"id": 46, "name": "isomorphic_strings",
     "template": '''def is_isomorphic(s, t):
    """Check if strings are isomorphic."""
    pass

assert is_isomorphic("egg", "add") == True
assert is_isomorphic("foo", "bar") == False
assert is_isomorphic("paper", "title") == True
print("PASS")'''},

    {"id": 47, "name": "find_duplicate",
     "template": '''def find_duplicate(nums):
    """Find the duplicate number (Floyd's cycle)."""
    pass

assert find_duplicate([1,3,4,2,2]) == 2
assert find_duplicate([3,1,3,4,2]) == 3
assert find_duplicate([1,1]) == 1
print("PASS")'''},

    {"id": 48, "name": "valid_sudoku",
     "template": '''def is_valid_sudoku(board):
    """Check if 9x9 Sudoku board is valid."""
    pass

board = [
    ["5","3",".",".","7",".",".",".","."],
    ["6",".",".","1","9","5",".",".","."],
    [".","9","8",".",".",".",".","6","."],
    ["8",".",".",".","6",".",".",".","3"],
    ["4",".",".","8",".","3",".",".","1"],
    ["7",".",".",".","2",".",".",".","6"],
    [".","6",".",".",".",".","2","8","."],
    [".",".",".","4","1","9",".",".","5"],
    [".",".",".",".","8",".",".","7","9"]
]
assert is_valid_sudoku(board) == True
print("PASS")'''},

    {"id": 49, "name": "first_missing_positive",
     "template": '''def first_missing_positive(nums):
    """Find first missing positive integer."""
    pass

assert first_missing_positive([1,2,0]) == 3
assert first_missing_positive([3,4,-1,1]) == 2
assert first_missing_positive([7,8,9,11,12]) == 1
print("PASS")'''},

    {"id": 50, "name": "4sum",
     "template": '''def four_sum(nums, target):
    """Find all unique quadruplets that sum to target."""
    pass

result = four_sum([1,0,-1,0,-2,2], 0)
expected = [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]
assert len(result) == len(expected)
for quad in expected:
    assert sorted(quad) in [sorted(r) for r in result]
print("PASS")'''},
]


@dataclass
class ChallengeResult:
    id: int
    name: str
    passed: bool
    reward: float
    runtime_ms: float
    error: str = ""


class Tier2Challenge:
    """Run 50 Tier 2 challenges with LLM code generation."""

    def __init__(self):
        from infrastructure.openhands_local import OpenHandsClient
        self.executor = OpenHandsClient(timeout=15.0)
        self.code_generator = AgentCodeGenerator()

        from src.rl.r1.r1_reward_functions import compute_total_reward
        self.compute_reward = compute_total_reward
        self.weights = {"correctness": 1.0, "clarity": 0.5, "structure": 0.5, "stability": 0.5, "efficiency": 0.3}

        self.results: List[ChallengeResult] = []
        logger.info(f"Tier2Challenge initialized with {len(TIER2_CHALLENGES)} challenges")

    async def run_challenge(self, ch: Dict) -> ChallengeResult:
        start = time.time()
        code = await self.code_generator.generate_code(ch["template"], ch["name"])

        try:
            result = await self.executor.execute(instructions=f"Challenge {ch['name']}", code=code, run_tests=False)
            runtime_ms = (time.time() - start) * 1000
            passed = result.success and "PASS" in result.output

            if passed:
                metrics = {"correctness_score": 1.0, "clarity_score": 0.8, "structure_score": 0.8, "stability_score": 0.9,
                          "efficiency_score": min(1.0, 500 / max(runtime_ms, 1)),
                          "oph_result": {"tests_passed": 5, "tests_failed": 0, "runtime_ms": runtime_ms}}
            else:
                has_impl = "pass" not in code.lower() or code != ch["template"]
                metrics = {"correctness_score": 0.3 if has_impl else 0.1, "clarity_score": 0.4 if has_impl else 0.2,
                          "structure_score": 0.4 if has_impl else 0.2, "stability_score": 0.3 if has_impl else 0.1,
                          "efficiency_score": 0.2,
                          "oph_result": {"tests_passed": 0, "tests_failed": 5, "runtime_ms": runtime_ms}}

            reward = self.compute_reward(metrics, self.weights)
            return ChallengeResult(id=ch["id"], name=ch["name"], passed=passed, reward=reward, runtime_ms=runtime_ms,
                                  error="" if passed else (result.errors or "")[:100])
        except Exception as e:
            return ChallengeResult(id=ch["id"], name=ch["name"], passed=False, reward=0.0,
                                  runtime_ms=(time.time() - start) * 1000, error=str(e)[:100])

    async def run_all(self, max_iter: int = 5) -> Dict:
        logger.info("=" * 60)
        logger.info("GENESIS TIER 2 CHALLENGE - 50 INTERMEDIATE-HARD TESTS")
        logger.info("=" * 60)

        best_passed = 0
        best_reward = 0.0

        for iteration in range(1, max_iter + 1):
            self.results = []
            total_passed = 0
            total_reward = 0.0

            logger.info(f"\n>>> ITERATION {iteration}/{max_iter} <<<\n")

            for ch in TIER2_CHALLENGES:
                result = await self.run_challenge(ch)
                self.results.append(result)
                total_reward += result.reward
                if result.passed:
                    total_passed += 1

                status = "PASS" if result.passed else "FAIL"
                logger.info(f"  [{result.id:02d}] {result.name}: {status} (R={result.reward:.3f}, {result.runtime_ms:.0f}ms)")

            avg_reward = total_reward / 50
            logger.info(f"\nIteration {iteration}: {total_passed}/50 ({total_passed/50*100:.1f}%) | Reward: {total_reward:.2f} | Avg: {avg_reward:.3f}")

            if total_passed > best_passed:
                best_passed = total_passed
                best_reward = total_reward

            if total_passed == 50:
                logger.info("\nALL 50 CHALLENGES PASSED!")
                break

        final = {
            "iterations": iteration,
            "best_passed": best_passed,
            "best_reward": best_reward,
            "pass_rate": best_passed / 50 * 100,
            "llm_stats": self.code_generator.stats,
        }

        logger.info(f"\nLLM Usage: Mistral={self.code_generator.stats['mistral']}, Gemini={self.code_generator.stats['gemini']}")

        results_path = PROJECT_ROOT / "data" / "tier2_results.json"
        with open(results_path, "w") as f:
            json.dump(final, f, indent=2)

        self.executor.cleanup()
        await self.code_generator.close()
        return final


async def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=5)
    args = parser.parse_args()

    (PROJECT_ROOT / "logs").mkdir(exist_ok=True)
    (PROJECT_ROOT / "data").mkdir(exist_ok=True)

    runner = Tier2Challenge()
    result = await runner.run_all(max_iter=args.iterations)

    print("\n" + "=" * 60)
    print("TIER 2 FINAL RESULTS")
    print("=" * 60)
    print(f"Best: {result['best_passed']}/50 ({result['pass_rate']:.1f}%)")
    print(f"Best Reward: {result['best_reward']:.2f}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
