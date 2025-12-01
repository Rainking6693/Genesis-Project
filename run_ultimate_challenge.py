#!/usr/bin/env python3
"""
GENESIS ULTIMATE CHALLENGE - 50 Progressively Harder Agent Tests
Agents must GENERATE code to solve challenges using LLM.
Uses Mistral (primary) with Gemini fallback, R1 rewards, OpenHands execution.
"""

import sys
import os
import asyncio
import logging
import json
import time
import random
import httpx
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from infrastructure.load_env import load_genesis_env
load_genesis_env()

# LLM API Keys for agent code generation
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "xBClmFrEWnHJcdrxjJU65frPPXytIYKK")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDOYNHjGyhEgvKU0SlfXDGdnqUiWE4_6lE")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(PROJECT_ROOT / "logs" / f"ultimate_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
    ],
)
logger = logging.getLogger("ultimate")


class AgentCodeGenerator:
    """LLM-based code generator using Mistral (primary) with Gemini fallback."""

    def __init__(self):
        self.mistral_url = "https://api.mistral.ai/v1/chat/completions"
        self.gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={GEMINI_API_KEY}"
        self.client = httpx.AsyncClient(timeout=60.0)
        self.stats = {"mistral": 0, "gemini": 0, "errors": 0}

    async def generate_code(self, template: str, challenge_name: str) -> str:
        """Generate code to solve the challenge using LLM."""
        prompt = self._build_prompt(template, challenge_name)

        # Try Mistral first
        try:
            code = await self._call_mistral(prompt)
            if code and "def " in code:
                self.stats["mistral"] += 1
                logger.debug(f"Mistral generated code for {challenge_name}")
                return code
        except Exception as e:
            logger.warning(f"Mistral failed for {challenge_name}: {e}")

        # Fallback to Gemini
        try:
            code = await self._call_gemini(prompt)
            if code and "def " in code:
                self.stats["gemini"] += 1
                logger.debug(f"Gemini generated code for {challenge_name}")
                return code
        except Exception as e:
            logger.error(f"Gemini also failed for {challenge_name}: {e}")

        self.stats["errors"] += 1
        return template  # Return original template if both fail

    def _build_prompt(self, template: str, challenge_name: str) -> str:
        return f"""You are a Python code expert. Complete the following code by replacing 'pass' with working implementations.

CHALLENGE: {challenge_name}

CODE TO COMPLETE:
```python
{template}
```

REQUIREMENTS:
1. Replace ALL 'pass' statements with working code
2. The code must pass all the assert statements
3. Return ONLY the complete Python code, no explanations
4. Do not change the function signatures or test assertions
5. Do not add markdown formatting - just raw Python code

COMPLETE CODE:"""

    async def _call_mistral(self, prompt: str) -> str:
        """Call Mistral API."""
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
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return self._extract_code(content)

    async def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API."""
        response = await self.client.post(
            self.gemini_url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2000}
            }
        )
        response.raise_for_status()
        data = response.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        return self._extract_code(content)

    def _extract_code(self, content: str) -> str:
        """Extract Python code from LLM response."""
        content = content.strip()
        # Remove markdown code blocks if present
        if "```python" in content:
            start = content.find("```python") + 9
            end = content.find("```", start)
            if end > start:
                content = content[start:end].strip()
        elif "```" in content:
            start = content.find("```") + 3
            end = content.find("```", start)
            if end > start:
                content = content[start:end].strip()
        return content

    async def close(self):
        await self.client.aclose()

# =============================================================================
# TIER 1: FOUNDATIONS (10 challenges) - Agent must implement from stub
# =============================================================================
TIER_1 = [
    {"id": 1, "name": "sum_array", "tier": 1,
     "template": '''def sum_array(arr):
    """Return sum of array elements, 0 if empty."""
    pass  # IMPLEMENT

assert sum_array([1,2,3]) == 6
assert sum_array([]) == 0
assert sum_array([-1,1]) == 0
print("PASS")''',
     "solution": '''def sum_array(arr):
    return sum(arr) if arr else 0
assert sum_array([1,2,3]) == 6
assert sum_array([]) == 0
assert sum_array([-1,1]) == 0
print("PASS")'''},

    {"id": 2, "name": "find_max", "tier": 1,
     "template": '''def find_max(arr):
    """Return max element, None if empty."""
    pass  # IMPLEMENT

assert find_max([1,5,3]) == 5
assert find_max([-1,-5]) == -1
assert find_max([]) is None
print("PASS")''',
     "solution": '''def find_max(arr):
    return max(arr) if arr else None
assert find_max([1,5,3]) == 5
assert find_max([-1,-5]) == -1
assert find_max([]) is None
print("PASS")'''},

    {"id": 3, "name": "reverse_string", "tier": 1,
     "template": '''def reverse_string(s):
    """Return reversed string."""
    pass  # IMPLEMENT

assert reverse_string("hello") == "olleh"
assert reverse_string("") == ""
print("PASS")''',
     "solution": '''def reverse_string(s):
    return s[::-1]
assert reverse_string("hello") == "olleh"
assert reverse_string("") == ""
print("PASS")'''},

    {"id": 4, "name": "is_palindrome", "tier": 1,
     "template": '''def is_palindrome(s):
    """Return True if s is palindrome."""
    pass  # IMPLEMENT

assert is_palindrome("radar") == True
assert is_palindrome("hello") == False
assert is_palindrome("") == True
print("PASS")''',
     "solution": '''def is_palindrome(s):
    return s == s[::-1]
assert is_palindrome("radar") == True
assert is_palindrome("hello") == False
assert is_palindrome("") == True
print("PASS")'''},

    {"id": 5, "name": "count_vowels", "tier": 1,
     "template": '''def count_vowels(s):
    """Count vowels in string (case insensitive)."""
    pass  # IMPLEMENT

assert count_vowels("hello") == 2
assert count_vowels("xyz") == 0
assert count_vowels("AEIOU") == 5
print("PASS")''',
     "solution": '''def count_vowels(s):
    return sum(1 for c in s.lower() if c in "aeiou")
assert count_vowels("hello") == 2
assert count_vowels("xyz") == 0
assert count_vowels("AEIOU") == 5
print("PASS")'''},

    {"id": 6, "name": "factorial", "tier": 1,
     "template": '''def factorial(n):
    """Return n! (0! = 1)."""
    pass  # IMPLEMENT

assert factorial(0) == 1
assert factorial(5) == 120
assert factorial(10) == 3628800
print("PASS")''',
     "solution": '''def factorial(n):
    return 1 if n <= 1 else n * factorial(n-1)
assert factorial(0) == 1
assert factorial(5) == 120
assert factorial(10) == 3628800
print("PASS")'''},

    {"id": 7, "name": "fibonacci", "tier": 1,
     "template": '''def fib(n):
    """Return nth Fibonacci number (0,1,1,2,3,5...)."""
    pass  # IMPLEMENT

assert fib(0) == 0
assert fib(1) == 1
assert fib(10) == 55
print("PASS")''',
     "solution": '''def fib(n):
    if n <= 1: return n
    a, b = 0, 1
    for _ in range(2, n+1): a, b = b, a+b
    return b
assert fib(0) == 0
assert fib(1) == 1
assert fib(10) == 55
print("PASS")'''},

    {"id": 8, "name": "remove_duplicates", "tier": 1,
     "template": '''def remove_dups(arr):
    """Remove duplicates preserving order."""
    pass  # IMPLEMENT

assert remove_dups([1,2,2,3]) == [1,2,3]
assert remove_dups([]) == []
assert remove_dups([1,1,1]) == [1]
print("PASS")''',
     "solution": '''def remove_dups(arr):
    return list(dict.fromkeys(arr))
assert remove_dups([1,2,2,3]) == [1,2,3]
assert remove_dups([]) == []
assert remove_dups([1,1,1]) == [1]
print("PASS")'''},

    {"id": 9, "name": "merge_sorted", "tier": 1,
     "template": '''def merge_sorted(a, b):
    """Merge two sorted lists into sorted list."""
    pass  # IMPLEMENT

assert merge_sorted([1,3], [2,4]) == [1,2,3,4]
assert merge_sorted([], [1]) == [1]
assert merge_sorted([], []) == []
print("PASS")''',
     "solution": '''def merge_sorted(a, b):
    return sorted(a + b)
assert merge_sorted([1,3], [2,4]) == [1,2,3,4]
assert merge_sorted([], [1]) == [1]
assert merge_sorted([], []) == []
print("PASS")'''},

    {"id": 10, "name": "flatten", "tier": 1,
     "template": '''def flatten(lst):
    """Flatten nested list."""
    pass  # IMPLEMENT

assert flatten([1,[2,[3]]]) == [1,2,3]
assert flatten([]) == []
assert flatten([[1,2],[3]]) == [1,2,3]
print("PASS")''',
     "solution": '''def flatten(lst):
    r = []
    for x in lst:
        if isinstance(x, list): r.extend(flatten(x))
        else: r.append(x)
    return r
assert flatten([1,[2,[3]]]) == [1,2,3]
assert flatten([]) == []
assert flatten([[1,2],[3]]) == [1,2,3]
print("PASS")'''},
]

# =============================================================================
# TIER 2: INTERMEDIATE (10 challenges)
# =============================================================================
TIER_2 = [
    {"id": 11, "name": "binary_search", "tier": 2,
     "template": '''def binary_search(arr, target):
    """Return index of target or -1."""
    pass  # IMPLEMENT

assert binary_search([1,2,3,4,5], 3) == 2
assert binary_search([1,2,3], 5) == -1
assert binary_search([], 1) == -1
assert binary_search([1], 1) == 0
print("PASS")''',
     "solution": '''def binary_search(arr, target):
    lo, hi = 0, len(arr)-1
    while lo <= hi:
        mid = (lo+hi)//2
        if arr[mid] == target: return mid
        elif arr[mid] < target: lo = mid+1
        else: hi = mid-1
    return -1
assert binary_search([1,2,3,4,5], 3) == 2
assert binary_search([1,2,3], 5) == -1
assert binary_search([], 1) == -1
assert binary_search([1], 1) == 0
print("PASS")'''},

    {"id": 12, "name": "valid_parens", "tier": 2,
     "template": '''def is_valid(s):
    """Check if parentheses are balanced: ()[]{}"""
    pass  # IMPLEMENT

assert is_valid("()[]{}") == True
assert is_valid("(]") == False
assert is_valid("{[]}") == True
assert is_valid("") == True
print("PASS")''',
     "solution": '''def is_valid(s):
    stack, m = [], {")":"(","]":"[","}":"{"}
    for c in s:
        if c in m:
            if not stack or stack.pop() != m[c]: return False
        elif c in "([{": stack.append(c)
    return len(stack) == 0
assert is_valid("()[]{}") == True
assert is_valid("(]") == False
assert is_valid("{[]}") == True
assert is_valid("") == True
print("PASS")'''},

    {"id": 13, "name": "two_sum", "tier": 2,
     "template": '''def two_sum(nums, target):
    """Return indices of two numbers that sum to target."""
    pass  # IMPLEMENT

assert two_sum([2,7,11], 9) == [0,1]
assert two_sum([3,2,4], 6) == [1,2]
assert two_sum([3,3], 6) == [0,1]
print("PASS")''',
     "solution": '''def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target-n in seen: return [seen[target-n], i]
        seen[n] = i
    return []
assert two_sum([2,7,11], 9) == [0,1]
assert two_sum([3,2,4], 6) == [1,2]
assert two_sum([3,3], 6) == [0,1]
print("PASS")'''},

    {"id": 14, "name": "anagram", "tier": 2,
     "template": '''def is_anagram(s1, s2):
    """Check if s1 and s2 are anagrams."""
    pass  # IMPLEMENT

assert is_anagram("listen", "silent") == True
assert is_anagram("hello", "world") == False
assert is_anagram("", "") == True
print("PASS")''',
     "solution": '''def is_anagram(s1, s2):
    return sorted(s1.lower()) == sorted(s2.lower())
assert is_anagram("listen", "silent") == True
assert is_anagram("hello", "world") == False
assert is_anagram("", "") == True
print("PASS")'''},

    {"id": 15, "name": "stack", "tier": 2,
     "template": '''class Stack:
    def __init__(self): pass  # IMPLEMENT
    def push(self, x): pass
    def pop(self): pass  # Return None if empty
    def peek(self): pass
    def is_empty(self): pass

s = Stack()
assert s.is_empty() == True
s.push(1); s.push(2)
assert s.peek() == 2
assert s.pop() == 2
assert s.pop() == 1
assert s.pop() is None
print("PASS")''',
     "solution": '''class Stack:
    def __init__(self): self.items = []
    def push(self, x): self.items.append(x)
    def pop(self): return self.items.pop() if self.items else None
    def peek(self): return self.items[-1] if self.items else None
    def is_empty(self): return len(self.items) == 0

s = Stack()
assert s.is_empty() == True
s.push(1); s.push(2)
assert s.peek() == 2
assert s.pop() == 2
assert s.pop() == 1
assert s.pop() is None
print("PASS")'''},

    {"id": 16, "name": "queue", "tier": 2,
     "template": '''class Queue:
    def __init__(self): pass  # IMPLEMENT
    def enqueue(self, x): pass
    def dequeue(self): pass  # Return None if empty
    def is_empty(self): pass

q = Queue()
assert q.is_empty() == True
q.enqueue(1); q.enqueue(2)
assert q.dequeue() == 1
assert q.dequeue() == 2
assert q.dequeue() is None
print("PASS")''',
     "solution": '''from collections import deque
class Queue:
    def __init__(self): self.items = deque()
    def enqueue(self, x): self.items.append(x)
    def dequeue(self): return self.items.popleft() if self.items else None
    def is_empty(self): return len(self.items) == 0

q = Queue()
assert q.is_empty() == True
q.enqueue(1); q.enqueue(2)
assert q.dequeue() == 1
assert q.dequeue() == 2
assert q.dequeue() is None
print("PASS")'''},

    {"id": 17, "name": "linked_list", "tier": 2,
     "template": '''class Node:
    def __init__(self, val): self.val, self.next = val, None

class LinkedList:
    def __init__(self): pass  # IMPLEMENT
    def append(self, val): pass
    def to_list(self): pass

ll = LinkedList()
ll.append(1); ll.append(2); ll.append(3)
assert ll.to_list() == [1,2,3]
print("PASS")''',
     "solution": '''class Node:
    def __init__(self, val): self.val, self.next = val, None

class LinkedList:
    def __init__(self): self.head = None
    def append(self, val):
        if not self.head: self.head = Node(val)
        else:
            cur = self.head
            while cur.next: cur = cur.next
            cur.next = Node(val)
    def to_list(self):
        r, cur = [], self.head
        while cur: r.append(cur.val); cur = cur.next
        return r

ll = LinkedList()
ll.append(1); ll.append(2); ll.append(3)
assert ll.to_list() == [1,2,3]
print("PASS")'''},

    {"id": 18, "name": "word_count", "tier": 2,
     "template": '''def word_count(text):
    """Return dict of word frequencies."""
    pass  # IMPLEMENT

assert word_count("a b a") == {"a": 2, "b": 1}
assert word_count("") == {}
assert word_count("one") == {"one": 1}
print("PASS")''',
     "solution": '''def word_count(text):
    if not text: return {}
    d = {}
    for w in text.split():
        d[w] = d.get(w, 0) + 1
    return d
assert word_count("a b a") == {"a": 2, "b": 1}
assert word_count("") == {}
assert word_count("one") == {"one": 1}
print("PASS")'''},

    {"id": 19, "name": "bubble_sort", "tier": 2,
     "template": '''def bubble_sort(arr):
    """Sort array using bubble sort (return new)."""
    pass  # IMPLEMENT

assert bubble_sort([3,1,2]) == [1,2,3]
assert bubble_sort([]) == []
assert bubble_sort([5,4,3,2,1]) == [1,2,3,4,5]
print("PASS")''',
     "solution": '''def bubble_sort(arr):
    arr = arr.copy()
    n = len(arr)
    for i in range(n):
        for j in range(n-i-1):
            if arr[j] > arr[j+1]: arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr
assert bubble_sort([3,1,2]) == [1,2,3]
assert bubble_sort([]) == []
assert bubble_sort([5,4,3,2,1]) == [1,2,3,4,5]
print("PASS")'''},

    {"id": 20, "name": "gcd", "tier": 2,
     "template": '''def gcd(a, b):
    """Return greatest common divisor."""
    pass  # IMPLEMENT

assert gcd(48, 18) == 6
assert gcd(100, 25) == 25
assert gcd(7, 13) == 1
print("PASS")''',
     "solution": '''def gcd(a, b):
    while b: a, b = b, a % b
    return a
assert gcd(48, 18) == 6
assert gcd(100, 25) == 25
assert gcd(7, 13) == 1
print("PASS")'''},
]

# =============================================================================
# TIER 3: ADVANCED (10 challenges)
# =============================================================================
TIER_3 = [
    {"id": 21, "name": "merge_sort", "tier": 3,
     "template": '''def merge_sort(arr):
    """Sort using merge sort."""
    pass  # IMPLEMENT

assert merge_sort([3,1,4,1,5]) == [1,1,3,4,5]
assert merge_sort([]) == []
assert merge_sort([1]) == [1]
print("PASS")''',
     "solution": '''def merge_sort(arr):
    if len(arr) <= 1: return arr
    mid = len(arr)//2
    l, r = merge_sort(arr[:mid]), merge_sort(arr[mid:])
    res, i, j = [], 0, 0
    while i < len(l) and j < len(r):
        if l[i] <= r[j]: res.append(l[i]); i += 1
        else: res.append(r[j]); j += 1
    return res + l[i:] + r[j:]
assert merge_sort([3,1,4,1,5]) == [1,1,3,4,5]
assert merge_sort([]) == []
assert merge_sort([1]) == [1]
print("PASS")'''},

    {"id": 22, "name": "quick_sort", "tier": 3,
     "template": '''def quick_sort(arr):
    """Sort using quick sort."""
    pass  # IMPLEMENT

assert quick_sort([3,6,8,10,1,2,1]) == [1,1,2,3,6,8,10]
assert quick_sort([]) == []
print("PASS")''',
     "solution": '''def quick_sort(arr):
    if len(arr) <= 1: return arr
    p = arr[len(arr)//2]
    l = [x for x in arr if x < p]
    m = [x for x in arr if x == p]
    r = [x for x in arr if x > p]
    return quick_sort(l) + m + quick_sort(r)
assert quick_sort([3,6,8,10,1,2,1]) == [1,1,2,3,6,8,10]
assert quick_sort([]) == []
print("PASS")'''},

    {"id": 23, "name": "lru_cache", "tier": 3,
     "template": '''class LRUCache:
    def __init__(self, capacity): pass  # IMPLEMENT
    def get(self, key): pass  # Return -1 if not found
    def put(self, key, val): pass

c = LRUCache(2)
c.put(1,1); c.put(2,2)
assert c.get(1) == 1
c.put(3,3)
assert c.get(2) == -1
assert c.get(3) == 3
print("PASS")''',
     "solution": '''from collections import OrderedDict
class LRUCache:
    def __init__(self, capacity): self.cap, self.cache = capacity, OrderedDict()
    def get(self, key):
        if key not in self.cache: return -1
        self.cache.move_to_end(key)
        return self.cache[key]
    def put(self, key, val):
        if key in self.cache: self.cache.move_to_end(key)
        self.cache[key] = val
        if len(self.cache) > self.cap: self.cache.popitem(last=False)

c = LRUCache(2)
c.put(1,1); c.put(2,2)
assert c.get(1) == 1
c.put(3,3)
assert c.get(2) == -1
assert c.get(3) == 3
print("PASS")'''},

    {"id": 24, "name": "bfs", "tier": 3,
     "template": '''def bfs(graph, start):
    """BFS traversal returning visited order."""
    pass  # IMPLEMENT

g = {0:[1,2], 1:[2], 2:[3], 3:[]}
assert bfs(g, 0) == [0,1,2,3]
print("PASS")''',
     "solution": '''from collections import deque
def bfs(graph, start):
    visited, q, res = set([start]), deque([start]), []
    while q:
        n = q.popleft()
        res.append(n)
        for nb in graph.get(n, []):
            if nb not in visited:
                visited.add(nb); q.append(nb)
    return res

g = {0:[1,2], 1:[2], 2:[3], 3:[]}
assert bfs(g, 0) == [0,1,2,3]
print("PASS")'''},

    {"id": 25, "name": "dfs", "tier": 3,
     "template": '''def dfs(graph, start):
    """DFS traversal returning visited order."""
    pass  # IMPLEMENT

g = {0:[1,2], 1:[3], 2:[], 3:[]}
r = dfs(g, 0)
assert r[0] == 0  # starts at 0
assert len(r) == 4  # visits all
print("PASS")''',
     "solution": '''def dfs(graph, start, visited=None):
    if visited is None: visited = set()
    visited.add(start)
    res = [start]
    for nb in graph.get(start, []):
        if nb not in visited:
            res.extend(dfs(graph, nb, visited))
    return res

g = {0:[1,2], 1:[3], 2:[], 3:[]}
r = dfs(g, 0)
assert r[0] == 0
assert len(r) == 4
print("PASS")'''},

    {"id": 26, "name": "binary_tree_inorder", "tier": 3,
     "template": '''class TreeNode:
    def __init__(self, val): self.val, self.left, self.right = val, None, None

def inorder(root):
    """Return inorder traversal."""
    pass  # IMPLEMENT

r = TreeNode(2); r.left = TreeNode(1); r.right = TreeNode(3)
assert inorder(r) == [1,2,3]
assert inorder(None) == []
print("PASS")''',
     "solution": '''class TreeNode:
    def __init__(self, val): self.val, self.left, self.right = val, None, None

def inorder(root):
    if not root: return []
    return inorder(root.left) + [root.val] + inorder(root.right)

r = TreeNode(2); r.left = TreeNode(1); r.right = TreeNode(3)
assert inorder(r) == [1,2,3]
assert inorder(None) == []
print("PASS")'''},

    {"id": 27, "name": "heap_kth", "tier": 3,
     "template": '''def kth_largest(arr, k):
    """Return kth largest element."""
    pass  # IMPLEMENT

assert kth_largest([3,2,1,5,6,4], 2) == 5
assert kth_largest([3,2,3,1,2,4,5,5,6], 4) == 4
print("PASS")''',
     "solution": '''import heapq
def kth_largest(arr, k):
    return heapq.nlargest(k, arr)[-1]

assert kth_largest([3,2,1,5,6,4], 2) == 5
assert kth_largest([3,2,3,1,2,4,5,5,6], 4) == 4
print("PASS")'''},

    {"id": 28, "name": "trie", "tier": 3,
     "template": '''class Trie:
    def __init__(self): pass  # IMPLEMENT
    def insert(self, word): pass
    def search(self, word): pass  # Return bool

t = Trie()
t.insert("apple"); t.insert("app")
assert t.search("apple") == True
assert t.search("app") == True
assert t.search("ap") == False
print("PASS")''',
     "solution": '''class Trie:
    def __init__(self): self.root = {}
    def insert(self, word):
        n = self.root
        for c in word: n = n.setdefault(c, {})
        n["$"] = True
    def search(self, word):
        n = self.root
        for c in word:
            if c not in n: return False
            n = n[c]
        return "$" in n

t = Trie()
t.insert("apple"); t.insert("app")
assert t.search("apple") == True
assert t.search("app") == True
assert t.search("ap") == False
print("PASS")'''},

    {"id": 29, "name": "longest_substr", "tier": 3,
     "template": '''def longest_unique(s):
    """Length of longest substring without repeats."""
    pass  # IMPLEMENT

assert longest_unique("abcabcbb") == 3
assert longest_unique("bbbbb") == 1
assert longest_unique("") == 0
print("PASS")''',
     "solution": '''def longest_unique(s):
    seen, start, mx = {}, 0, 0
    for i, c in enumerate(s):
        if c in seen and seen[c] >= start: start = seen[c] + 1
        seen[c] = i
        mx = max(mx, i - start + 1)
    return mx

assert longest_unique("abcabcbb") == 3
assert longest_unique("bbbbb") == 1
assert longest_unique("") == 0
print("PASS")'''},

    {"id": 30, "name": "coin_change", "tier": 3,
     "template": '''def coin_change(coins, amount):
    """Min coins to make amount, -1 if impossible."""
    pass  # IMPLEMENT

assert coin_change([1,2,5], 11) == 3
assert coin_change([2], 3) == -1
assert coin_change([1], 0) == 0
print("PASS")''',
     "solution": '''def coin_change(coins, amount):
    dp = [float("inf")] * (amount + 1)
    dp[0] = 0
    for c in coins:
        for x in range(c, amount + 1):
            dp[x] = min(dp[x], dp[x-c] + 1)
    return dp[amount] if dp[amount] != float("inf") else -1

assert coin_change([1,2,5], 11) == 3
assert coin_change([2], 3) == -1
assert coin_change([1], 0) == 0
print("PASS")'''},
]

# =============================================================================
# TIER 4: EXPERT (10 challenges)
# =============================================================================
TIER_4 = [
    {"id": 31, "name": "rate_limiter", "tier": 4,
     "template": '''class RateLimiter:
    def __init__(self, max_req, window_sec): pass  # IMPLEMENT
    def allow(self): pass  # Return bool

import time
rl = RateLimiter(2, 1.0)
assert rl.allow() == True
assert rl.allow() == True
assert rl.allow() == False
print("PASS")''',
     "solution": '''import time
class RateLimiter:
    def __init__(self, max_req, window_sec):
        self.max_req, self.window = max_req, window_sec
        self.reqs = []
    def allow(self):
        now = time.time()
        self.reqs = [t for t in self.reqs if now - t < self.window]
        if len(self.reqs) < self.max_req:
            self.reqs.append(now)
            return True
        return False

rl = RateLimiter(2, 1.0)
assert rl.allow() == True
assert rl.allow() == True
assert rl.allow() == False
print("PASS")'''},

    {"id": 32, "name": "pub_sub", "tier": 4,
     "template": '''class PubSub:
    def __init__(self): pass  # IMPLEMENT
    def subscribe(self, topic, fn): pass
    def publish(self, topic, msg): pass

results = []
ps = PubSub()
ps.subscribe("t", lambda m: results.append(m))
ps.publish("t", "a"); ps.publish("t", "b")
assert results == ["a", "b"]
print("PASS")''',
     "solution": '''class PubSub:
    def __init__(self): self.subs = {}
    def subscribe(self, topic, fn): self.subs.setdefault(topic, []).append(fn)
    def publish(self, topic, msg):
        for fn in self.subs.get(topic, []): fn(msg)

results = []
ps = PubSub()
ps.subscribe("t", lambda m: results.append(m))
ps.publish("t", "a"); ps.publish("t", "b")
assert results == ["a", "b"]
print("PASS")'''},

    {"id": 33, "name": "circuit_breaker", "tier": 4,
     "template": '''class CircuitBreaker:
    def __init__(self, threshold): pass  # IMPLEMENT
    def call(self, fn): pass  # Raise if open

cb = CircuitBreaker(2)
assert cb.call(lambda: 1) == 1
try: cb.call(lambda: 1/0)
except: pass
try: cb.call(lambda: 1/0)
except: pass
try:
    cb.call(lambda: 1)
    assert False
except Exception as e:
    assert "open" in str(e).lower()
print("PASS")''',
     "solution": '''class CircuitBreaker:
    def __init__(self, threshold):
        self.threshold, self.failures, self.open = threshold, 0, False
    def call(self, fn):
        if self.open: raise Exception("Circuit open")
        try:
            r = fn(); self.failures = 0; return r
        except:
            self.failures += 1
            if self.failures >= self.threshold: self.open = True
            raise

cb = CircuitBreaker(2)
assert cb.call(lambda: 1) == 1
try: cb.call(lambda: 1/0)
except: pass
try: cb.call(lambda: 1/0)
except: pass
try:
    cb.call(lambda: 1)
    assert False
except Exception as e:
    assert "open" in str(e).lower()
print("PASS")'''},

    {"id": 34, "name": "retry_decorator", "tier": 4,
     "template": '''import functools
def retry(max_attempts):
    """Decorator that retries function max_attempts times."""
    pass  # IMPLEMENT

attempts = [0]
@retry(3)
def flaky():
    attempts[0] += 1
    if attempts[0] < 3: raise ValueError()
    return "ok"
assert flaky() == "ok"
assert attempts[0] == 3
print("PASS")''',
     "solution": '''import functools
def retry(max_attempts):
    def dec(fn):
        @functools.wraps(fn)
        def wrapper(*a, **kw):
            for i in range(max_attempts):
                try: return fn(*a, **kw)
                except:
                    if i == max_attempts - 1: raise
        return wrapper
    return dec

attempts = [0]
@retry(3)
def flaky():
    attempts[0] += 1
    if attempts[0] < 3: raise ValueError()
    return "ok"
assert flaky() == "ok"
assert attempts[0] == 3
print("PASS")'''},

    {"id": 35, "name": "singleton", "tier": 4,
     "template": '''class Singleton:
    """Only one instance should exist."""
    pass  # IMPLEMENT

s1, s2 = Singleton(), Singleton()
assert s1 is s2
s1.val = 42
assert s2.val == 42
print("PASS")''',
     "solution": '''class Singleton:
    _inst = None
    def __new__(cls):
        if cls._inst is None: cls._inst = super().__new__(cls)
        return cls._inst

s1, s2 = Singleton(), Singleton()
assert s1 is s2
s1.val = 42
assert s2.val == 42
print("PASS")'''},

    {"id": 36, "name": "factory", "tier": 4,
     "template": '''class Dog: name = "dog"
class Cat: name = "cat"
class AnimalFactory:
    @staticmethod
    def create(animal_type):
        """Return Dog for 'dog', Cat for 'cat'."""
        pass  # IMPLEMENT

assert AnimalFactory.create("dog").name == "dog"
assert AnimalFactory.create("cat").name == "cat"
print("PASS")''',
     "solution": '''class Dog: name = "dog"
class Cat: name = "cat"
class AnimalFactory:
    @staticmethod
    def create(animal_type):
        return {"dog": Dog, "cat": Cat}.get(animal_type, Dog)()

assert AnimalFactory.create("dog").name == "dog"
assert AnimalFactory.create("cat").name == "cat"
print("PASS")'''},

    {"id": 37, "name": "observer", "tier": 4,
     "template": '''class Subject:
    def __init__(self): pass  # IMPLEMENT
    def attach(self, obs): pass
    def notify(self, msg): pass

class Observer:
    def __init__(self): self.msgs = []
    def update(self, msg): self.msgs.append(msg)

s = Subject(); o1, o2 = Observer(), Observer()
s.attach(o1); s.attach(o2)
s.notify("hi")
assert o1.msgs == ["hi"]
assert o2.msgs == ["hi"]
print("PASS")''',
     "solution": '''class Subject:
    def __init__(self): self._obs = []
    def attach(self, obs): self._obs.append(obs)
    def notify(self, msg):
        for o in self._obs: o.update(msg)

class Observer:
    def __init__(self): self.msgs = []
    def update(self, msg): self.msgs.append(msg)

s = Subject(); o1, o2 = Observer(), Observer()
s.attach(o1); s.attach(o2)
s.notify("hi")
assert o1.msgs == ["hi"]
assert o2.msgs == ["hi"]
print("PASS")'''},

    {"id": 38, "name": "command", "tier": 4,
     "template": '''class Calculator:
    def __init__(self): self.val = 0
    def add(self, x): self.val += x
    def sub(self, x): self.val -= x

class AddCmd:
    def __init__(self, calc, x): pass  # IMPLEMENT
    def execute(self): pass
    def undo(self): pass

calc = Calculator()
cmd = AddCmd(calc, 10)
cmd.execute(); assert calc.val == 10
cmd.undo(); assert calc.val == 0
print("PASS")''',
     "solution": '''class Calculator:
    def __init__(self): self.val = 0
    def add(self, x): self.val += x
    def sub(self, x): self.val -= x

class AddCmd:
    def __init__(self, calc, x): self.calc, self.x = calc, x
    def execute(self): self.calc.add(self.x)
    def undo(self): self.calc.sub(self.x)

calc = Calculator()
cmd = AddCmd(calc, 10)
cmd.execute(); assert calc.val == 10
cmd.undo(); assert calc.val == 0
print("PASS")'''},

    {"id": 39, "name": "strategy", "tier": 4,
     "template": '''class QuickSort:
    def sort(self, data): return sorted(data)
class ReverseSort:
    def sort(self, data): return sorted(data, reverse=True)

class Sorter:
    def __init__(self, strategy): pass  # IMPLEMENT
    def sort(self, data): pass

assert Sorter(QuickSort()).sort([3,1,2]) == [1,2,3]
assert Sorter(ReverseSort()).sort([3,1,2]) == [3,2,1]
print("PASS")''',
     "solution": '''class QuickSort:
    def sort(self, data): return sorted(data)
class ReverseSort:
    def sort(self, data): return sorted(data, reverse=True)

class Sorter:
    def __init__(self, strategy): self.strategy = strategy
    def sort(self, data): return self.strategy.sort(data)

assert Sorter(QuickSort()).sort([3,1,2]) == [1,2,3]
assert Sorter(ReverseSort()).sort([3,1,2]) == [3,2,1]
print("PASS")'''},

    {"id": 40, "name": "state_machine", "tier": 4,
     "template": '''class StateMachine:
    def __init__(self): pass  # IMPLEMENT - start in "idle"
    def trigger(self, event): pass  # Return new state
    # idle->start->running, running->pause->paused
    # paused->resume->running, running/paused->stop->idle

sm = StateMachine()
assert sm.trigger("start") == "running"
assert sm.trigger("pause") == "paused"
assert sm.trigger("resume") == "running"
assert sm.trigger("stop") == "idle"
print("PASS")''',
     "solution": '''class StateMachine:
    def __init__(self):
        self.state = "idle"
        self.trans = {
            ("idle","start"):"running", ("running","pause"):"paused",
            ("paused","resume"):"running", ("running","stop"):"idle",
            ("paused","stop"):"idle"
        }
    def trigger(self, event):
        k = (self.state, event)
        if k in self.trans: self.state = self.trans[k]
        return self.state

sm = StateMachine()
assert sm.trigger("start") == "running"
assert sm.trigger("pause") == "paused"
assert sm.trigger("resume") == "running"
assert sm.trigger("stop") == "idle"
print("PASS")'''},
]

# =============================================================================
# TIER 5: MASTERY (10 challenges)
# =============================================================================
TIER_5 = [
    {"id": 41, "name": "json_parse", "tier": 5,
     "template": '''import json
def safe_parse(s, default=None):
    """Parse JSON, return default on error."""
    pass  # IMPLEMENT

assert safe_parse('{"a":1}') == {"a": 1}
assert safe_parse('bad', {}) == {}
assert safe_parse('[1,2]') == [1,2]
print("PASS")''',
     "solution": '''import json
def safe_parse(s, default=None):
    try: return json.loads(s)
    except: return default

assert safe_parse('{"a":1}') == {"a": 1}
assert safe_parse('bad', {}) == {}
assert safe_parse('[1,2]') == [1,2]
print("PASS")'''},

    {"id": 42, "name": "url_parse", "tier": 5,
     "template": '''from urllib.parse import urlparse, parse_qs
def parse_url(url):
    """Return dict with scheme, host, path, params."""
    pass  # IMPLEMENT

r = parse_url("https://ex.com/p?a=1")
assert r["scheme"] == "https"
assert r["host"] == "ex.com"
assert r["path"] == "/p"
assert r["params"] == {"a": ["1"]}
print("PASS")''',
     "solution": '''from urllib.parse import urlparse, parse_qs
def parse_url(url):
    p = urlparse(url)
    return {"scheme": p.scheme, "host": p.netloc, "path": p.path, "params": parse_qs(p.query)}

r = parse_url("https://ex.com/p?a=1")
assert r["scheme"] == "https"
assert r["host"] == "ex.com"
assert r["path"] == "/p"
assert r["params"] == {"a": ["1"]}
print("PASS")'''},

    {"id": 43, "name": "event_emitter", "tier": 5,
     "template": '''class EventEmitter:
    def __init__(self): pass  # IMPLEMENT
    def on(self, event, fn): pass
    def off(self, event, fn): pass
    def emit(self, event, *args): pass

results = []
ee = EventEmitter()
h = lambda x: results.append(x)
ee.on("d", h)
ee.emit("d", 1); ee.emit("d", 2)
ee.off("d", h)
ee.emit("d", 3)
assert results == [1, 2]
print("PASS")''',
     "solution": '''class EventEmitter:
    def __init__(self): self.evts = {}
    def on(self, event, fn): self.evts.setdefault(event, []).append(fn)
    def off(self, event, fn):
        if event in self.evts: self.evts[event] = [f for f in self.evts[event] if f != fn]
    def emit(self, event, *args):
        for fn in self.evts.get(event, []): fn(*args)

results = []
ee = EventEmitter()
h = lambda x: results.append(x)
ee.on("d", h)
ee.emit("d", 1); ee.emit("d", 2)
ee.off("d", h)
ee.emit("d", 3)
assert results == [1, 2]
print("PASS")'''},

    {"id": 44, "name": "dep_resolver", "tier": 5,
     "template": '''def resolve_deps(deps):
    """Topological sort of dependencies."""
    pass  # IMPLEMENT

deps = {"a": ["b", "c"], "b": ["c"], "c": []}
r = resolve_deps(deps)
assert r.index("c") < r.index("b") < r.index("a")
print("PASS")''',
     "solution": '''def resolve_deps(deps):
    result, visited, temp = [], set(), set()
    def visit(n):
        if n in temp: raise ValueError("Circular")
        if n in visited: return
        temp.add(n)
        for d in deps.get(n, []): visit(d)
        temp.remove(n); visited.add(n); result.append(n)
    for n in deps: visit(n)
    return result

deps = {"a": ["b", "c"], "b": ["c"], "c": []}
r = resolve_deps(deps)
assert r.index("c") < r.index("b") < r.index("a")
print("PASS")'''},

    {"id": 45, "name": "bloom_filter", "tier": 5,
     "template": '''class BloomFilter:
    def __init__(self, size=100): pass  # IMPLEMENT
    def add(self, item): pass
    def might_contain(self, item): pass  # Return bool

bf = BloomFilter()
bf.add("hello"); bf.add("world")
assert bf.might_contain("hello") == True
assert bf.might_contain("world") == True
print("PASS")''',
     "solution": '''class BloomFilter:
    def __init__(self, size=100):
        self.size, self.bits = size, [False] * size
    def _h(self, item):
        return [hash(item) % self.size, hash(item + "s") % self.size]
    def add(self, item):
        for h in self._h(item): self.bits[h] = True
    def might_contain(self, item):
        return all(self.bits[h] for h in self._h(item))

bf = BloomFilter()
bf.add("hello"); bf.add("world")
assert bf.might_contain("hello") == True
assert bf.might_contain("world") == True
print("PASS")'''},

    {"id": 46, "name": "middleware", "tier": 5,
     "template": '''class MiddlewareChain:
    def __init__(self): pass  # IMPLEMENT
    def use(self, mw): pass
    def execute(self, ctx): pass  # Run chain

chain = MiddlewareChain()
chain.use(lambda ctx, nxt: nxt() | {"a": 1})
chain.use(lambda ctx, nxt: nxt() | {"b": 2})
r = chain.execute({})
assert r == {"a": 1, "b": 2}
print("PASS")''',
     "solution": '''class MiddlewareChain:
    def __init__(self): self.mws = []
    def use(self, mw): self.mws.append(mw)
    def execute(self, ctx):
        def run(i):
            if i < len(self.mws): return self.mws[i](ctx, lambda: run(i+1))
            return ctx
        return run(0)

chain = MiddlewareChain()
chain.use(lambda ctx, nxt: nxt() | {"a": 1})
chain.use(lambda ctx, nxt: nxt() | {"b": 2})
r = chain.execute({})
assert r == {"a": 1, "b": 2}
print("PASS")'''},

    {"id": 47, "name": "schema_validate", "tier": 5,
     "template": '''def validate(data, schema):
    """Validate data against schema (type, properties, required)."""
    pass  # IMPLEMENT

s = {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}
assert validate({"name": "J"}, s) == True
assert validate({}, s) == False
assert validate({"name": 123}, s) == False
print("PASS")''',
     "solution": '''def validate(data, schema):
    if schema["type"] == "object":
        if not isinstance(data, dict): return False
        for k in schema.get("required", []):
            if k not in data: return False
        for k, sub in schema.get("properties", {}).items():
            if k in data and not validate(data[k], sub): return False
        return True
    elif schema["type"] == "string": return isinstance(data, str)
    elif schema["type"] == "number": return isinstance(data, (int, float))
    return False

s = {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}
assert validate({"name": "J"}, s) == True
assert validate({}, s) == False
assert validate({"name": 123}, s) == False
print("PASS")'''},

    {"id": 48, "name": "cqrs", "tier": 5,
     "template": '''class EventStore:
    def __init__(self): self.events = []
    def append(self, e): self.events.append(e)
    def get_all(self): return self.events

class WriteModel:
    def __init__(self, store): pass  # IMPLEMENT
    def create_user(self, name): pass  # Append UserCreated event

class ReadModel:
    def __init__(self, store): pass  # IMPLEMENT
    def get_users(self): pass  # Return list of names

store = EventStore()
w, r = WriteModel(store), ReadModel(store)
w.create_user("A"); w.create_user("B")
assert r.get_users() == ["A", "B"]
print("PASS")''',
     "solution": '''class EventStore:
    def __init__(self): self.events = []
    def append(self, e): self.events.append(e)
    def get_all(self): return self.events

class WriteModel:
    def __init__(self, store): self.store = store
    def create_user(self, name): self.store.append({"type": "UserCreated", "name": name})

class ReadModel:
    def __init__(self, store): self.store = store
    def get_users(self): return [e["name"] for e in self.store.get_all() if e["type"] == "UserCreated"]

store = EventStore()
w, r = WriteModel(store), ReadModel(store)
w.create_user("A"); w.create_user("B")
assert r.get_users() == ["A", "B"]
print("PASS")'''},

    {"id": 49, "name": "memoize", "tier": 5,
     "template": '''def memoize(fn):
    """Decorator that caches function results."""
    pass  # IMPLEMENT

calls = [0]
@memoize
def fib(n):
    calls[0] += 1
    if n <= 1: return n
    return fib(n-1) + fib(n-2)

assert fib(10) == 55
c1 = calls[0]
assert fib(10) == 55  # Should use cache
assert calls[0] == c1  # No new calls
print("PASS")''',
     "solution": '''def memoize(fn):
    cache = {}
    def wrapper(*args):
        if args not in cache: cache[args] = fn(*args)
        return cache[args]
    return wrapper

calls = [0]
@memoize
def fib(n):
    calls[0] += 1
    if n <= 1: return n
    return fib(n-1) + fib(n-2)

assert fib(10) == 55
c1 = calls[0]
assert fib(10) == 55
assert calls[0] == c1
print("PASS")'''},

    {"id": 50, "name": "throttle", "tier": 5,
     "template": '''import time
def throttle(delay):
    """Decorator that limits function calls to once per delay seconds."""
    pass  # IMPLEMENT

results = []
@throttle(0.1)
def log(x): results.append(x)

log(1); log(2); log(3)  # Only first should go through immediately
assert len(results) == 1
assert results[0] == 1
print("PASS")''',
     "solution": '''import time
def throttle(delay):
    def dec(fn):
        last = [0]
        def wrapper(*a, **kw):
            now = time.time()
            if now - last[0] >= delay:
                last[0] = now
                return fn(*a, **kw)
        return wrapper
    return dec

results = []
@throttle(0.1)
def log(x): results.append(x)

log(1); log(2); log(3)
assert len(results) == 1
assert results[0] == 1
print("PASS")'''},
]

ALL_CHALLENGES = TIER_1 + TIER_2 + TIER_3 + TIER_4 + TIER_5


@dataclass
class ChallengeResult:
    id: int
    name: str
    tier: int
    passed: bool
    reward: float
    runtime_ms: float
    error: str = ""


class UltimateChallenge:
    """Run 50 agent challenges with R1 rewards and LLM code generation."""

    def __init__(self):
        from infrastructure.openhands_local import OpenHandsClient
        self.executor = OpenHandsClient(timeout=10.0)

        from src.integrations.acontext_client import AcontextClient
        self.acontext = AcontextClient(db_path=str(PROJECT_ROOT / "data" / "ultimate.db"))

        from src.rl.r1.r1_reward_functions import compute_total_reward
        self.compute_reward = compute_total_reward

        # Initialize LLM code generator (Mistral primary, Gemini fallback)
        self.code_generator = AgentCodeGenerator()

        import yaml
        with open(PROJECT_ROOT / "config" / "rl_day1.yaml") as f:
            self.weights = yaml.safe_load(f).get("r1", {}).get("reward_weights", {
                "correctness": 1.0, "clarity": 0.5, "structure": 0.5,
                "stability": 0.5, "efficiency": 0.3
            })

        self.results: List[ChallengeResult] = []
        self.iteration = 0
        logger.info(f"Initialized with {len(ALL_CHALLENGES)} challenges")
        logger.info(f"LLM: Mistral (primary) → Gemini (fallback)")

    async def run_challenge(self, ch: Dict, use_solution: bool = False) -> ChallengeResult:
        """Run a challenge - use LLM to generate code, then execute."""
        start = time.time()

        if use_solution:
            # Use pre-written solution for verification
            code = ch["solution"]
        else:
            # Use LLM to generate code from template
            code = await self.code_generator.generate_code(ch["template"], ch["name"])

        try:
            result = await self.executor.execute(
                instructions=f"Challenge {ch['name']}",
                code=code,
                run_tests=False
            )
            runtime_ms = (time.time() - start) * 1000
            passed = result.success and "PASS" in result.output

            # Calculate R1 reward
            if passed:
                metrics = {
                    "correctness_score": 1.0,
                    "clarity_score": 0.8,
                    "structure_score": 0.8,
                    "stability_score": 0.9,
                    "efficiency_score": min(1.0, 500 / max(runtime_ms, 1)),
                    "oph_result": {
                        "tests_passed": 3 + ch["tier"],  # More tests for higher tiers
                        "tests_failed": 0,
                        "runtime_ms": runtime_ms,
                    }
                }
            else:
                # Failed - partial credit based on how close
                error = result.errors or result.output
                # Give partial credit if code was generated but has bugs
                has_implementation = "pass" not in code.lower() or code != ch["template"]
                metrics = {
                    "correctness_score": 0.3 if has_implementation else 0.1,
                    "clarity_score": 0.4 if has_implementation else 0.2,
                    "structure_score": 0.4 if has_implementation else 0.2,
                    "stability_score": 0.3 if has_implementation else 0.1,
                    "efficiency_score": 0.2,
                    "oph_result": {
                        "tests_passed": 0,
                        "tests_failed": 3 + ch["tier"],
                        "runtime_ms": runtime_ms,
                        "errors": error[:200]
                    }
                }

            reward = self.compute_reward(metrics, self.weights)

            return ChallengeResult(
                id=ch["id"], name=ch["name"], tier=ch["tier"],
                passed=passed, reward=reward, runtime_ms=runtime_ms,
                error="" if passed else (result.errors or "")[:100]
            )

        except Exception as e:
            return ChallengeResult(
                id=ch["id"], name=ch["name"], tier=ch["tier"],
                passed=False, reward=0.0, runtime_ms=(time.time() - start) * 1000,
                error=str(e)[:100]
            )

    async def run_all(self, max_iter: int = 10, use_solutions: bool = False) -> Dict:
        """Run all challenges."""
        logger.info("=" * 60)
        logger.info("GENESIS ULTIMATE CHALLENGE - 50 AGENT TESTS")
        logger.info(f"Mode: {'SOLUTIONS (verification)' if use_solutions else 'TEMPLATES (agent must solve)'}")
        logger.info("=" * 60)

        for iteration in range(1, max_iter + 1):
            self.iteration = iteration
            self.results = []
            tier_stats = {t: {"passed": 0, "total": 0, "reward": 0.0} for t in range(1, 6)}

            logger.info(f"\n>>> ITERATION {iteration}/{max_iter} <<<\n")

            for tier in range(1, 6):
                tier_chs = [c for c in ALL_CHALLENGES if c["tier"] == tier]
                logger.info(f"TIER {tier}: {len(tier_chs)} challenges")

                for ch in tier_chs:
                    result = await self.run_challenge(ch, use_solutions)
                    self.results.append(result)

                    tier_stats[tier]["total"] += 1
                    tier_stats[tier]["reward"] += result.reward
                    if result.passed:
                        tier_stats[tier]["passed"] += 1

                    status = "PASS" if result.passed else "FAIL"
                    logger.info(f"  [{result.id:02d}] {result.name}: {status} (R={result.reward:.3f}, {result.runtime_ms:.0f}ms)")
                    if not result.passed and result.error:
                        logger.debug(f"      Error: {result.error[:60]}")

                tp = tier_stats[tier]
                logger.info(f"  Tier {tier}: {tp['passed']}/{tp['total']} | Avg reward: {tp['reward']/tp['total']:.3f}\n")

            # Summary
            total_passed = sum(t["passed"] for t in tier_stats.values())
            total_reward = sum(t["reward"] for t in tier_stats.values())
            avg_reward = total_reward / 50

            logger.info("=" * 60)
            logger.info(f"ITERATION {iteration} SUMMARY")
            logger.info(f"Passed: {total_passed}/50 ({total_passed/50*100:.1f}%)")
            logger.info(f"Total Reward: {total_reward:.2f} | Avg: {avg_reward:.3f}")
            for t in range(1, 6):
                tp = tier_stats[t]
                logger.info(f"  Tier {t}: {tp['passed']}/10 | Reward: {tp['reward']:.2f}")
            logger.info("=" * 60)

            # Log to Acontext
            self.acontext.log_rl_iteration(
                space="Genesis-Ultimate",
                iteration=iteration,
                metrics={
                    "total_passed": total_passed,
                    "total_reward": total_reward,
                    "avg_reward": avg_reward,
                    "tier_stats": {str(k): v for k, v in tier_stats.items()},
                },
                insights=[f"Tier {t}: {tier_stats[t]['passed']}/10" for t in range(1, 6)],
                prefix="/rl/ultimate/",
            )

            if total_passed == 50:
                logger.info("\nALL 50 CHALLENGES PASSED!")
                break

            await asyncio.sleep(0.5)

        # Final results with LLM stats
        final = {
            "iterations": self.iteration,
            "total_passed": total_passed,
            "total_reward": total_reward,
            "avg_reward": avg_reward,
            "pass_rate": total_passed / 50 * 100,
            "tier_breakdown": {str(k): v for k, v in tier_stats.items()},
            "all_passed": total_passed == 50,
            "llm_stats": self.code_generator.stats,
        }

        # Log LLM usage
        logger.info(f"\nLLM Usage: Mistral={self.code_generator.stats['mistral']}, "
                   f"Gemini={self.code_generator.stats['gemini']}, "
                   f"Errors={self.code_generator.stats['errors']}")

        results_path = PROJECT_ROOT / "data" / "ultimate_results.json"
        with open(results_path, "w") as f:
            json.dump(final, f, indent=2)

        self.executor.cleanup()
        self.acontext.close()
        await self.code_generator.close()

        return final


async def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=5)
    parser.add_argument("--solutions", action="store_true", help="Run solutions (verify tests work)")
    args = parser.parse_args()

    (PROJECT_ROOT / "logs").mkdir(exist_ok=True)
    (PROJECT_ROOT / "data").mkdir(exist_ok=True)

    runner = UltimateChallenge()
    result = await runner.run_all(max_iter=args.iterations, use_solutions=args.solutions)

    print("\n" + "=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)
    print(f"Passed: {result['total_passed']}/50 ({result['pass_rate']:.1f}%)")
    print(f"Total Reward: {result['total_reward']:.2f}")
    print(f"Average Reward: {result['avg_reward']:.3f}")
    print(f"All passed: {result['all_passed']}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
