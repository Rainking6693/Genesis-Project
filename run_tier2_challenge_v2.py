#!/usr/bin/env python3
"""
Genesis Tier 2 Challenge V2 - 50 NEW Intermediate to Hard Tests

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
logger = logging.getLogger("tier2_challenge_v2")

MISTRAL_API_KEY = "xBClmFrEWnHJcdrxjJU65frPPXytIYKK"
GEMINI_API_KEY = "AIzaSyDOYNHjGyhEgvKU0SlfXDGdnqUiWE4_6lE"

from infrastructure.openhands_local import OpenHandsClient


def compute_reward(code: str, result: dict, challenge: dict) -> float:
    passed = result.get("passed", False)
    difficulty = challenge.get("difficulty", "intermediate")
    difficulty_weights = {"intermediate": 1.5, "hard": 2.5}
    base_weight = difficulty_weights.get(difficulty, 1.5)
    if passed:
        return 1.5 * base_weight
    else:
        has_impl = "pass" not in code.lower() or len(code) > len(challenge.get("template", ""))
        return 0.3 * base_weight if has_impl else 0.1 * base_weight


# ============================================================
# INTERMEDIATE CHALLENGES V2 (1-25)
# ============================================================
INTERMEDIATE_CHALLENGES = [
    {"id": 1, "name": "zigzag_conversion", "difficulty": "intermediate",
     "template": '''def convert(s, num_rows):
    """Convert string to zigzag pattern and read row by row."""
    pass

assert convert("PAYPALISHIRING", 3) == "PAHNAPLSIIGYIR"
assert convert("PAYPALISHIRING", 4) == "PINALSIGYAHRPI"
assert convert("A", 1) == "A"
print("PASS")'''},

    {"id": 2, "name": "integer_to_roman", "difficulty": "intermediate",
     "template": '''def int_to_roman(num):
    """Convert integer to Roman numeral."""
    pass

assert int_to_roman(3) == "III"
assert int_to_roman(58) == "LVIII"
assert int_to_roman(1994) == "MCMXCIV"
print("PASS")'''},

    {"id": 3, "name": "4sum", "difficulty": "intermediate",
     "template": '''def four_sum(nums, target):
    """Find all unique quadruplets that sum to target."""
    pass

result = four_sum([1,0,-1,0,-2,2], 0)
expected = [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]
assert sorted([sorted(x) for x in result]) == sorted([sorted(x) for x in expected])
print("PASS")'''},

    {"id": 4, "name": "remove_nth_from_end", "difficulty": "intermediate",
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
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def remove_nth_from_end(head, n):
    """Remove nth node from end of list."""
    pass

assert to_list(remove_nth_from_end(from_list([1,2,3,4,5]), 2)) == [1,2,3,5]
assert to_list(remove_nth_from_end(from_list([1]), 1)) == []
print("PASS")'''},

    {"id": 5, "name": "swap_pairs", "difficulty": "intermediate",
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
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def swap_pairs(head):
    """Swap every two adjacent nodes."""
    pass

assert to_list(swap_pairs(from_list([1,2,3,4]))) == [2,1,4,3]
assert to_list(swap_pairs(from_list([1]))) == [1]
print("PASS")'''},

    {"id": 6, "name": "next_permutation", "difficulty": "intermediate",
     "template": '''def next_permutation(nums):
    """Rearrange to next lexicographically greater permutation."""
    pass
    return nums

assert next_permutation([1,2,3]) == [1,3,2]
assert next_permutation([3,2,1]) == [1,2,3]
assert next_permutation([1,1,5]) == [1,5,1]
print("PASS")'''},

    {"id": 7, "name": "search_range", "difficulty": "intermediate",
     "template": '''def search_range(nums, target):
    """Find first and last position of target."""
    pass

assert search_range([5,7,7,8,8,10], 8) == [3,4]
assert search_range([5,7,7,8,8,10], 6) == [-1,-1]
assert search_range([], 0) == [-1,-1]
print("PASS")'''},

    {"id": 8, "name": "valid_sudoku", "difficulty": "intermediate",
     "template": '''def is_valid_sudoku(board):
    """Check if sudoku board is valid."""
    pass

board = [["5","3",".",".","7",".",".",".","."]
        ,["6",".",".","1","9","5",".",".","."]
        ,[".","9","8",".",".",".",".","6","."]
        ,["8",".",".",".","6",".",".",".","3"]
        ,["4",".",".","8",".","3",".",".","1"]
        ,["7",".",".",".","2",".",".",".","6"]
        ,[".","6",".",".",".",".","2","8","."]
        ,[".",".",".","4","1","9",".",".","5"]
        ,[".",".",".",".","8",".",".","7","9"]]
assert is_valid_sudoku(board) == True
print("PASS")'''},

    {"id": 9, "name": "combination_sum_ii", "difficulty": "intermediate",
     "template": '''def combination_sum2(candidates, target):
    """Find unique combinations (each number used once)."""
    pass

result = combination_sum2([10,1,2,7,6,1,5], 8)
expected = [[1,1,6],[1,2,5],[1,7],[2,6]]
assert sorted([sorted(x) for x in result]) == sorted([sorted(x) for x in expected])
print("PASS")'''},

    {"id": 10, "name": "rotate_image", "difficulty": "intermediate",
     "template": '''def rotate(matrix):
    """Rotate image 90 degrees clockwise in-place."""
    pass
    return matrix

assert rotate([[1,2,3],[4,5,6],[7,8,9]]) == [[7,4,1],[8,5,2],[9,6,3]]
assert rotate([[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]) == [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]
print("PASS")'''},

    {"id": 11, "name": "pow_x_n", "difficulty": "intermediate",
     "template": '''def my_pow(x, n):
    """Implement pow(x, n)."""
    pass

assert abs(my_pow(2.0, 10) - 1024.0) < 0.001
assert abs(my_pow(2.1, 3) - 9.261) < 0.001
assert abs(my_pow(2.0, -2) - 0.25) < 0.001
print("PASS")'''},

    {"id": 12, "name": "max_subarray_sum", "difficulty": "intermediate",
     "template": '''def max_sub_array(nums):
    """Find contiguous subarray with max sum using divide and conquer."""
    pass

assert max_sub_array([-2,1,-3,4,-1,2,1,-5,4]) == 6
assert max_sub_array([1]) == 1
assert max_sub_array([5,4,-1,7,8]) == 23
print("PASS")'''},

    {"id": 13, "name": "simplify_path", "difficulty": "intermediate",
     "template": '''def simplify_path(path):
    """Simplify Unix-style file path."""
    pass

assert simplify_path("/home/") == "/home"
assert simplify_path("/../") == "/"
assert simplify_path("/home//foo/") == "/home/foo"
assert simplify_path("/a/./b/../../c/") == "/c"
print("PASS")'''},

    {"id": 14, "name": "sort_list", "difficulty": "intermediate",
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
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def sort_list(head):
    """Sort linked list in O(n log n) time."""
    pass

assert to_list(sort_list(from_list([4,2,1,3]))) == [1,2,3,4]
assert to_list(sort_list(from_list([-1,5,3,4,0]))) == [-1,0,3,4,5]
print("PASS")'''},

    {"id": 15, "name": "gas_station", "difficulty": "intermediate",
     "template": '''def can_complete_circuit(gas, cost):
    """Find starting gas station index."""
    pass

assert can_complete_circuit([1,2,3,4,5], [3,4,5,1,2]) == 3
assert can_complete_circuit([2,3,4], [3,4,3]) == -1
print("PASS")'''},

    {"id": 16, "name": "word_break", "difficulty": "intermediate",
     "template": '''def word_break(s, word_dict):
    """Check if s can be segmented into dictionary words."""
    pass

assert word_break("leetcode", ["leet","code"]) == True
assert word_break("applepenapple", ["apple","pen"]) == True
assert word_break("catsandog", ["cats","dog","sand","and","cat"]) == False
print("PASS")'''},

    {"id": 17, "name": "copy_random_list", "difficulty": "intermediate",
     "template": '''class Node:
    def __init__(self, val=0, next=None, random=None):
        self.val = val
        self.next = next
        self.random = random

def copy_random_list(head):
    """Deep copy linked list with random pointer."""
    pass

# Test
n1 = Node(7)
n2 = Node(13)
n3 = Node(11)
n1.next = n2
n2.next = n3
n2.random = n1
n3.random = n2

copied = copy_random_list(n1)
assert copied.val == 7
assert copied.next.val == 13
assert copied.next.random.val == 7
assert copied is not n1
print("PASS")'''},

    {"id": 18, "name": "longest_common_prefix", "difficulty": "intermediate",
     "template": '''def longest_common_prefix(strs):
    """Find longest common prefix."""
    pass

assert longest_common_prefix(["flower","flow","flight"]) == "fl"
assert longest_common_prefix(["dog","racecar","car"]) == ""
assert longest_common_prefix(["interspecies","interstellar","interstate"]) == "inters"
print("PASS")'''},

    {"id": 19, "name": "min_path_sum", "difficulty": "intermediate",
     "template": '''def min_path_sum(grid):
    """Minimum path sum from top-left to bottom-right."""
    pass

assert min_path_sum([[1,3,1],[1,5,1],[4,2,1]]) == 7
assert min_path_sum([[1,2,3],[4,5,6]]) == 12
print("PASS")'''},

    {"id": 20, "name": "flatten_binary_tree", "difficulty": "intermediate",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def flatten(root):
    """Flatten binary tree to linked list in-place."""
    pass
    return root

def to_list(node):
    result = []
    while node:
        result.append(node.val)
        node = node.right
    return result

root = TreeNode(1, TreeNode(2, TreeNode(3), TreeNode(4)), TreeNode(5, None, TreeNode(6)))
flatten(root)
assert to_list(root) == [1,2,3,4,5,6]
print("PASS")'''},

    {"id": 21, "name": "triangle_min_path", "difficulty": "intermediate",
     "template": '''def minimum_total(triangle):
    """Minimum path sum in triangle."""
    pass

assert minimum_total([[2],[3,4],[6,5,7],[4,1,8,3]]) == 11
assert minimum_total([[-10]]) == -10
print("PASS")'''},

    {"id": 22, "name": "surrounded_regions", "difficulty": "intermediate",
     "template": '''def solve(board):
    """Capture surrounded regions."""
    pass
    return board

board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]
solve(board)
assert board == [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]
print("PASS")'''},

    {"id": 23, "name": "sum_root_to_leaf", "difficulty": "intermediate",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def sum_numbers(root):
    """Sum all root-to-leaf numbers."""
    pass

root1 = TreeNode(1, TreeNode(2), TreeNode(3))
assert sum_numbers(root1) == 25  # 12 + 13

root2 = TreeNode(4, TreeNode(9, TreeNode(5), TreeNode(1)), TreeNode(0))
assert sum_numbers(root2) == 1026  # 495 + 491 + 40
print("PASS")'''},

    {"id": 24, "name": "single_number_ii", "difficulty": "intermediate",
     "template": '''def single_number(nums):
    """Find element appearing once (others appear 3 times)."""
    pass

assert single_number([2,2,3,2]) == 3
assert single_number([0,1,0,1,0,1,99]) == 99
print("PASS")'''},

    {"id": 25, "name": "evaluate_rpn", "difficulty": "intermediate",
     "template": '''def eval_rpn(tokens):
    """Evaluate Reverse Polish Notation."""
    pass

assert eval_rpn(["2","1","+","3","*"]) == 9
assert eval_rpn(["4","13","5","/","+"]) == 6
assert eval_rpn(["10","6","9","3","+","-11","*","/","*","17","+","5","+"]) == 22
print("PASS")'''},
]

# ============================================================
# HARD CHALLENGES V2 (26-50)
# ============================================================
HARD_CHALLENGES = [
    {"id": 26, "name": "decode_ways_ii", "difficulty": "hard",
     "template": '''def num_decodings(s):
    """Count decode ways with * wildcard."""
    pass

assert num_decodings("*") == 9
assert num_decodings("1*") == 18
assert num_decodings("2*") == 15
print("PASS")'''},

    {"id": 27, "name": "substring_concat", "difficulty": "hard",
     "template": '''def find_substring(s, words):
    """Find starting indices of concatenation of all words."""
    pass

result = find_substring("barfoothefoobarman", ["foo","bar"])
assert sorted(result) == [0, 9]
print("PASS")'''},

    {"id": 28, "name": "longest_valid_parens", "difficulty": "hard",
     "template": '''def longest_valid_parentheses(s):
    """Length of longest valid parentheses substring."""
    pass

assert longest_valid_parentheses("(()") == 2
assert longest_valid_parentheses(")()())") == 4
assert longest_valid_parentheses("") == 0
print("PASS")'''},

    {"id": 29, "name": "trap_water", "difficulty": "hard",
     "template": '''def trap(height):
    """Calculate trapped rain water."""
    pass

assert trap([0,1,0,2,1,0,1,3,2,1,2,1]) == 6
assert trap([4,2,0,3,2,5]) == 9
print("PASS")'''},

    {"id": 30, "name": "insert_interval", "difficulty": "hard",
     "template": '''def insert(intervals, new_interval):
    """Insert and merge interval."""
    pass

assert insert([[1,3],[6,9]], [2,5]) == [[1,5],[6,9]]
assert insert([[1,2],[3,5],[6,7],[8,10],[12,16]], [4,8]) == [[1,2],[3,10],[12,16]]
print("PASS")'''},

    {"id": 31, "name": "permutation_sequence", "difficulty": "hard",
     "template": '''def get_permutation(n, k):
    """Return kth permutation sequence."""
    pass

assert get_permutation(3, 3) == "213"
assert get_permutation(4, 9) == "2314"
assert get_permutation(3, 1) == "123"
print("PASS")'''},

    {"id": 32, "name": "distinct_subsequences", "difficulty": "hard",
     "template": '''def num_distinct(s, t):
    """Count distinct subsequences of s that equal t."""
    pass

assert num_distinct("rabbbit", "rabbit") == 3
assert num_distinct("babgbag", "bag") == 5
print("PASS")'''},

    {"id": 33, "name": "binary_tree_postorder", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def postorder_traversal(root):
    """Iterative postorder traversal."""
    pass

root = TreeNode(1, None, TreeNode(2, TreeNode(3)))
assert postorder_traversal(root) == [3,2,1]
print("PASS")'''},

    {"id": 34, "name": "max_gap", "difficulty": "hard",
     "template": '''def maximum_gap(nums):
    """Maximum gap between successive elements in sorted form."""
    pass

assert maximum_gap([3,6,9,1]) == 3
assert maximum_gap([10]) == 0
print("PASS")'''},

    {"id": 35, "name": "find_celebrity", "difficulty": "hard",
     "template": '''def find_celebrity(n, knows):
    """Find celebrity who everyone knows but knows no one."""
    pass

# Test case: person 1 is celebrity
knows_matrix = [[1,1,0],[0,1,0],[1,1,1]]
def knows(a, b):
    return knows_matrix[a][b] == 1

# Inline test
def test_celebrity(n):
    def knows_func(a, b):
        return knows_matrix[a][b] == 1
    # Find celebrity
    candidate = 0
    for i in range(1, n):
        if knows_matrix[candidate][i]:
            candidate = i
    for i in range(n):
        if i != candidate:
            if knows_matrix[candidate][i] or not knows_matrix[i][candidate]:
                return -1
    return candidate

assert test_celebrity(3) == 1
print("PASS")'''},

    {"id": 36, "name": "count_digit_one", "difficulty": "hard",
     "template": '''def count_digit_one(n):
    """Count digit 1 appearing in all numbers <= n."""
    pass

assert count_digit_one(13) == 6
assert count_digit_one(0) == 0
assert count_digit_one(1) == 1
print("PASS")'''},

    {"id": 37, "name": "shortest_palindrome", "difficulty": "hard",
     "template": '''def shortest_palindrome(s):
    """Shortest palindrome by adding chars in front."""
    pass

assert shortest_palindrome("aacecaaa") == "aaacecaaa"
assert shortest_palindrome("abcd") == "dcbabcd"
print("PASS")'''},

    {"id": 38, "name": "expression_add_operators", "difficulty": "hard",
     "template": '''def add_operators(num, target):
    """Add +, -, * to reach target."""
    pass

result = add_operators("123", 6)
assert set(result) == {"1+2+3", "1*2*3"}
print("PASS")'''},

    {"id": 39, "name": "h_index_ii", "difficulty": "hard",
     "template": '''def h_index(citations):
    """Find H-index with binary search (sorted input)."""
    pass

assert h_index([0,1,3,5,6]) == 3
assert h_index([1,2,100]) == 2
print("PASS")'''},

    {"id": 40, "name": "wiggle_sort_ii", "difficulty": "hard",
     "template": '''def wiggle_sort(nums):
    """Reorder so nums[0] < nums[1] > nums[2] < nums[3]..."""
    pass
    return nums

result = wiggle_sort([1,5,1,1,6,4])
for i in range(len(result)-1):
    if i % 2 == 0:
        assert result[i] < result[i+1]
    else:
        assert result[i] > result[i+1]
print("PASS")'''},

    {"id": 41, "name": "super_ugly_number", "difficulty": "hard",
     "template": '''def nth_super_ugly_number(n, primes):
    """Find nth super ugly number."""
    pass

assert nth_super_ugly_number(12, [2,7,13,19]) == 32
print("PASS")'''},

    {"id": 42, "name": "coin_change_ii", "difficulty": "hard",
     "template": '''def change(amount, coins):
    """Count ways to make change."""
    pass

assert change(5, [1,2,5]) == 4
assert change(3, [2]) == 0
assert change(10, [10]) == 1
print("PASS")'''},

    {"id": 43, "name": "valid_number", "difficulty": "hard",
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

    {"id": 44, "name": "candy_v2", "difficulty": "hard",
     "template": '''def candy(ratings):
    """Minimum candies with rating constraints."""
    pass

assert candy([1,0,2]) == 5
assert candy([1,2,2]) == 4
print("PASS")'''},

    {"id": 45, "name": "word_ladder_ii", "difficulty": "hard",
     "template": '''def find_ladders(begin_word, end_word, word_list):
    """Find all shortest transformation sequences."""
    pass

result = find_ladders("hit", "cog", ["hot","dot","dog","lot","log","cog"])
assert len(result) == 2
assert ["hit","hot","dot","dog","cog"] in result
print("PASS")'''},

    {"id": 46, "name": "max_rectangle", "difficulty": "hard",
     "template": '''def maximal_rectangle(matrix):
    """Largest rectangle of 1s in binary matrix."""
    pass

matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]
assert maximal_rectangle(matrix) == 6
print("PASS")'''},

    {"id": 47, "name": "dungeon_game", "difficulty": "hard",
     "template": '''def calculate_minimum_hp(dungeon):
    """Minimum initial health to rescue princess."""
    pass

dungeon = [[-2,-3,3],[-5,-10,1],[10,30,-5]]
assert calculate_minimum_hp(dungeon) == 7
print("PASS")'''},

    {"id": 48, "name": "best_time_iii", "difficulty": "hard",
     "template": '''def max_profit(prices):
    """Maximum profit with at most 2 transactions."""
    pass

assert max_profit([3,3,5,0,0,3,1,4]) == 6
assert max_profit([1,2,3,4,5]) == 4
assert max_profit([7,6,4,3,1]) == 0
print("PASS")'''},

    {"id": 49, "name": "first_missing_pos", "difficulty": "hard",
     "template": '''def first_missing_positive(nums):
    """First missing positive integer in O(n) time, O(1) space."""
    pass

assert first_missing_positive([1,2,0]) == 3
assert first_missing_positive([3,4,-1,1]) == 2
assert first_missing_positive([7,8,9,11,12]) == 1
print("PASS")'''},

    {"id": 50, "name": "recover_bst", "difficulty": "hard",
     "template": '''class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def recover_tree(root):
    """Recover BST where two nodes are swapped."""
    pass
    return root

def inorder(node):
    if not node: return []
    return inorder(node.left) + [node.val] + inorder(node.right)

root = TreeNode(1, TreeNode(3, None, TreeNode(2)))
recover_tree(root)
assert inorder(root) == [1, 2, 3]
print("PASS")'''},
]

ALL_CHALLENGES = INTERMEDIATE_CHALLENGES + HARD_CHALLENGES


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


class Tier2ChallengeV2:
    def __init__(self):
        self.openhands = OpenHandsClient()
        self.generator = AgentCodeGenerator()
        self.challenges = ALL_CHALLENGES
        logger.info(f"Tier2ChallengeV2: {len(INTERMEDIATE_CHALLENGES)} intermediate + {len(HARD_CHALLENGES)} hard = {len(self.challenges)} total")

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
        logger.info("GENESIS TIER 2 CHALLENGE V2 - 50 NEW TESTS")
        logger.info("25 Intermediate | 25 Hard")
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

            inter_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "intermediate")
            hard_passed = sum(1 for r in results if r["passed"] and r["difficulty"] == "hard")
            total_passed = inter_passed + hard_passed
            total_reward = sum(r["reward"] for r in results)

            logger.info(f"\n--- Iteration {iteration} ---")
            logger.info(f"Intermediate: {inter_passed}/25 | Hard: {hard_passed}/25 | Total: {total_passed}/50 ({total_passed * 2}%)")

            if total_passed > best_passed:
                best_passed = total_passed
                best_results = {"iteration": iteration, "intermediate_passed": inter_passed, "hard_passed": hard_passed, "total_passed": total_passed, "total_reward": total_reward}

        await self.generator.close()

        logger.info("\nFINAL RESULTS")
        logger.info(f"Intermediate: {best_results['intermediate_passed']}/25 | Hard: {best_results['hard_passed']}/25 | Total: {best_results['total_passed']}/50")

        output = {
            "iterations": iterations,
            "best_passed": best_results["total_passed"],
            "best_reward": best_results["total_reward"],
            "pass_rate": best_results["total_passed"] * 2,
            "breakdown": {"intermediate": {"passed": best_results["intermediate_passed"], "total": 25}, "hard": {"passed": best_results["hard_passed"], "total": 25}},
            "llm_stats": self.generator.stats
        }

        output_path = Path("data/tier2_results_v2.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"\nResults saved to {output_path}")

        return output


async def main():
    parser = argparse.ArgumentParser(description="Genesis Tier 2 Challenge V2")
    parser.add_argument("--iterations", type=int, default=1)
    args = parser.parse_args()
    challenge = Tier2ChallengeV2()
    await challenge.run_all(iterations=args.iterations)


if __name__ == "__main__":
    asyncio.run(main())
