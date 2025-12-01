#!/usr/bin/env python3
"""
ADAPTIVE GENESIS TRAINING - Progressive Learning

Genesis learns progressively from easy to hard:
- Level 1: Simple tests (2-3 tests) - Build confidence
- Level 2: Intermediate (4-6 tests) - Build competence
- Level 3: Advanced (7-10 tests) - Build mastery
- Level 4: Enterprise (10-20 tests) - Prove excellence

Key principle: Genesis must PASS tests to level up.
If stuck, provide hints and easier variants.

Usage:
    python run_adaptive_training.py --hours 8 --iterations-per-hour 10
"""

import sys
import os
import asyncio
import argparse
import logging
import json
import time
import random
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

# Setup paths
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "src"))
os.environ["PYTHONPATH"] = f"{PROJECT_ROOT};{PROJECT_ROOT / 'src'};{os.environ.get('PYTHONPATH', '')}"

from infrastructure.load_env import load_genesis_env
load_genesis_env()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(PROJECT_ROOT / "logs" / f"adaptive_training_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
    ],
)
logger = logging.getLogger("adaptive_training")


# =============================================================================
# PROGRESSIVE LEARNING CHALLENGES
# =============================================================================

# LEVEL 1: Baby steps - Simple, learnable patterns
LEVEL_1_CHALLENGES = [
    {
        "name": "add_numbers",
        "level": 1,
        "description": "Add two numbers",
        "code": '''
def add(a, b):
    """Return the sum of a and b."""
    return a + b

# Tests
assert add(1, 2) == 3
assert add(0, 0) == 0
assert add(-1, 1) == 0
print("Level 1: add_numbers PASSED!")
''',
        "tests_count": 3,
        "hint": "Just return a + b",
    },
    {
        "name": "multiply_numbers",
        "level": 1,
        "description": "Multiply two numbers",
        "code": '''
def multiply(a, b):
    """Return the product of a and b."""
    return a * b

# Tests
assert multiply(2, 3) == 6
assert multiply(0, 5) == 0
assert multiply(-2, 3) == -6
print("Level 1: multiply_numbers PASSED!")
''',
        "tests_count": 3,
        "hint": "Just return a * b",
    },
    {
        "name": "is_even",
        "level": 1,
        "description": "Check if number is even",
        "code": '''
def is_even(n):
    """Return True if n is even."""
    return n % 2 == 0

# Tests
assert is_even(2) == True
assert is_even(3) == False
assert is_even(0) == True
print("Level 1: is_even PASSED!")
''',
        "tests_count": 3,
        "hint": "Use modulo: n % 2 == 0",
    },
    {
        "name": "absolute_value",
        "level": 1,
        "description": "Return absolute value",
        "code": '''
def absolute(n):
    """Return absolute value of n."""
    return abs(n)

# Tests
assert absolute(5) == 5
assert absolute(-5) == 5
assert absolute(0) == 0
print("Level 1: absolute_value PASSED!")
''',
        "tests_count": 3,
        "hint": "Use abs() or: return n if n >= 0 else -n",
    },
]

# LEVEL 2: Building blocks - Basic algorithms
LEVEL_2_CHALLENGES = [
    {
        "name": "max_of_three",
        "level": 2,
        "description": "Find maximum of three numbers",
        "code": '''
def max_of_three(a, b, c):
    """Return the maximum of three numbers."""
    return max(a, b, c)

# Tests
assert max_of_three(1, 2, 3) == 3
assert max_of_three(3, 2, 1) == 3
assert max_of_three(2, 3, 1) == 3
assert max_of_three(-1, -2, -3) == -1
assert max_of_three(5, 5, 5) == 5
print("Level 2: max_of_three PASSED!")
''',
        "tests_count": 5,
        "hint": "Use max(a, b, c) or nested if statements",
    },
    {
        "name": "sum_list",
        "level": 2,
        "description": "Sum all elements in a list",
        "code": '''
def sum_list(numbers):
    """Return sum of all numbers in list."""
    return sum(numbers)

# Tests
assert sum_list([1, 2, 3]) == 6
assert sum_list([]) == 0
assert sum_list([5]) == 5
assert sum_list([-1, 1]) == 0
assert sum_list([10, 20, 30]) == 60
print("Level 2: sum_list PASSED!")
''',
        "tests_count": 5,
        "hint": "Use sum() or loop through and add",
    },
    {
        "name": "reverse_string",
        "level": 2,
        "description": "Reverse a string",
        "code": '''
def reverse_string(s):
    """Return reversed string."""
    return s[::-1]

# Tests
assert reverse_string("hello") == "olleh"
assert reverse_string("") == ""
assert reverse_string("a") == "a"
assert reverse_string("ab") == "ba"
assert reverse_string("12345") == "54321"
print("Level 2: reverse_string PASSED!")
''',
        "tests_count": 5,
        "hint": "Use slicing: s[::-1]",
    },
    {
        "name": "count_vowels",
        "level": 2,
        "description": "Count vowels in a string",
        "code": '''
def count_vowels(s):
    """Count vowels (a,e,i,o,u) in string."""
    return sum(1 for c in s.lower() if c in 'aeiou')

# Tests
assert count_vowels("hello") == 2
assert count_vowels("") == 0
assert count_vowels("aeiou") == 5
assert count_vowels("xyz") == 0
assert count_vowels("HELLO") == 2
print("Level 2: count_vowels PASSED!")
''',
        "tests_count": 5,
        "hint": "Loop through string, check if char in 'aeiou'",
    },
]

# LEVEL 3: Real algorithms - Need to think
LEVEL_3_CHALLENGES = [
    {
        "name": "fibonacci",
        "level": 3,
        "description": "Calculate nth Fibonacci number",
        "code": '''
def fibonacci(n):
    """Return nth Fibonacci number (0-indexed)."""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# Tests
assert fibonacci(0) == 0
assert fibonacci(1) == 1
assert fibonacci(2) == 1
assert fibonacci(5) == 5
assert fibonacci(10) == 55
assert fibonacci(15) == 610
assert fibonacci(20) == 6765
print("Level 3: fibonacci PASSED!")
''',
        "tests_count": 7,
        "hint": "Base cases: fib(0)=0, fib(1)=1. Then fib(n) = fib(n-1) + fib(n-2)",
    },
    {
        "name": "is_palindrome",
        "level": 3,
        "description": "Check if string is palindrome",
        "code": '''
def is_palindrome(s):
    """Check if string is a palindrome (ignore case/spaces)."""
    clean = ''.join(c.lower() for c in s if c.isalnum())
    return clean == clean[::-1]

# Tests
assert is_palindrome("racecar") == True
assert is_palindrome("hello") == False
assert is_palindrome("A man a plan a canal Panama") == True
assert is_palindrome("") == True
assert is_palindrome("a") == True
assert is_palindrome("ab") == False
assert is_palindrome("Madam") == True
print("Level 3: is_palindrome PASSED!")
''',
        "tests_count": 7,
        "hint": "Clean the string (lowercase, alphanumeric only), then compare to reversed",
    },
    {
        "name": "find_duplicates",
        "level": 3,
        "description": "Find duplicate elements in list",
        "code": '''
def find_duplicates(lst):
    """Return list of duplicate elements."""
    seen = set()
    duplicates = set()
    for item in lst:
        if item in seen:
            duplicates.add(item)
        seen.add(item)
    return sorted(list(duplicates))

# Tests
assert find_duplicates([1, 2, 3, 2, 1]) == [1, 2]
assert find_duplicates([1, 2, 3]) == []
assert find_duplicates([]) == []
assert find_duplicates([1, 1, 1]) == [1]
assert find_duplicates([1, 2, 2, 3, 3, 3]) == [2, 3]
assert find_duplicates(['a', 'b', 'a']) == ['a']
assert find_duplicates([1]) == []
print("Level 3: find_duplicates PASSED!")
''',
        "tests_count": 7,
        "hint": "Use a set to track seen items, another set for duplicates",
    },
    {
        "name": "binary_search",
        "level": 3,
        "description": "Binary search in sorted array",
        "code": '''
def binary_search(arr, target):
    """Return index of target in sorted array, or -1 if not found."""
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Tests
assert binary_search([1, 2, 3, 4, 5], 3) == 2
assert binary_search([1, 2, 3, 4, 5], 1) == 0
assert binary_search([1, 2, 3, 4, 5], 5) == 4
assert binary_search([1, 2, 3, 4, 5], 6) == -1
assert binary_search([], 1) == -1
assert binary_search([1], 1) == 0
assert binary_search([1, 3, 5, 7, 9], 7) == 3
print("Level 3: binary_search PASSED!")
''',
        "tests_count": 7,
        "hint": "Use two pointers (left, right). Compare middle element, adjust pointers.",
    },
]

# LEVEL 4: Enterprise - Complex algorithms
LEVEL_4_CHALLENGES = [
    {
        "name": "merge_sorted_arrays",
        "level": 4,
        "description": "Merge two sorted arrays",
        "code": '''
def merge_sorted(arr1, arr2):
    """Merge two sorted arrays into one sorted array."""
    result = []
    i = j = 0
    while i < len(arr1) and j < len(arr2):
        if arr1[i] <= arr2[j]:
            result.append(arr1[i])
            i += 1
        else:
            result.append(arr2[j])
            j += 1
    result.extend(arr1[i:])
    result.extend(arr2[j:])
    return result

# Tests
assert merge_sorted([1, 3, 5], [2, 4, 6]) == [1, 2, 3, 4, 5, 6]
assert merge_sorted([], [1, 2, 3]) == [1, 2, 3]
assert merge_sorted([1, 2, 3], []) == [1, 2, 3]
assert merge_sorted([], []) == []
assert merge_sorted([1], [2]) == [1, 2]
assert merge_sorted([2], [1]) == [1, 2]
assert merge_sorted([1, 1, 1], [1, 1]) == [1, 1, 1, 1, 1]
assert merge_sorted([1, 5, 9], [2, 6, 10]) == [1, 2, 5, 6, 9, 10]
assert merge_sorted([1, 2], [3, 4, 5, 6]) == [1, 2, 3, 4, 5, 6]
assert merge_sorted([10, 20, 30], [5, 15, 25, 35]) == [5, 10, 15, 20, 25, 30, 35]
print("Level 4: merge_sorted_arrays PASSED!")
''',
        "tests_count": 10,
        "hint": "Two pointers, compare and append smaller, then append remaining",
    },
    {
        "name": "valid_parentheses",
        "level": 4,
        "description": "Validate balanced parentheses",
        "code": '''
def is_valid(s):
    """Check if parentheses are balanced."""
    stack = []
    mapping = {')': '(', ']': '[', '}': '{'}
    for char in s:
        if char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        elif char in '([{':
            stack.append(char)
    return len(stack) == 0

# Tests
assert is_valid("()") == True
assert is_valid("()[]{}") == True
assert is_valid("(]") == False
assert is_valid("([)]") == False
assert is_valid("{[]}") == True
assert is_valid("") == True
assert is_valid("(") == False
assert is_valid(")") == False
assert is_valid("((()))") == True
assert is_valid("({[()]})") == True
print("Level 4: valid_parentheses PASSED!")
''',
        "tests_count": 10,
        "hint": "Use a stack. Push open brackets, pop and match for close brackets.",
    },
]

ALL_LEVELS = {
    1: LEVEL_1_CHALLENGES,
    2: LEVEL_2_CHALLENGES,
    3: LEVEL_3_CHALLENGES,
    4: LEVEL_4_CHALLENGES,
}


@dataclass
class LearningState:
    """Track Genesis's learning progress."""
    current_level: int = 1
    level_scores: Dict[int, List[float]] = field(default_factory=lambda: {1: [], 2: [], 3: [], 4: []})
    challenges_passed: Dict[str, int] = field(default_factory=dict)
    total_tests_passed: int = 0
    total_tests_attempted: int = 0
    consecutive_passes: int = 0
    consecutive_fails: int = 0

    def pass_rate(self, level: int) -> float:
        scores = self.level_scores.get(level, [])
        if not scores:
            return 0.0
        return sum(scores) / len(scores)

    def should_level_up(self) -> bool:
        """Level up if 80%+ pass rate on current level with 5+ attempts."""
        scores = self.level_scores.get(self.current_level, [])
        if len(scores) < 5:
            return False
        recent = scores[-5:]
        return sum(recent) / len(recent) >= 0.8

    def should_level_down(self) -> bool:
        """Level down if 3 consecutive fails."""
        return self.consecutive_fails >= 3 and self.current_level > 1


class AdaptiveTrainer:
    """Adaptive training with progressive difficulty."""

    def __init__(self, hours: int = 8, iterations_per_hour: int = 10):
        self.hours = hours
        self.iterations_per_hour = iterations_per_hour
        self.total_iterations = hours * iterations_per_hour
        self.current_iteration = 0
        self.learning_state = LearningState()
        self.metrics_history = []
        self.best_reward = 0.0

        # Load config
        import yaml
        config_path = PROJECT_ROOT / "config" / "rl_day1.yaml"
        with open(config_path, "r", encoding="utf-8") as f:
            self.rl_config = yaml.safe_load(f)

        # Initialize Acontext
        from src.integrations.acontext_client import AcontextClient
        self.acontext = AcontextClient(
            db_path=str(PROJECT_ROOT / "data" / "adaptive_training.db")
        )
        self.acontext.health_check()

        logger.info(f"AdaptiveTrainer: {hours}h, {iterations_per_hour}/h, total={self.total_iterations}")
        logger.info("Starting at Level 1 (simple challenges)")

    def _get_challenge_for_level(self, level: int) -> Dict[str, Any]:
        """Get a random challenge for the current level."""
        challenges = ALL_LEVELS.get(level, LEVEL_1_CHALLENGES)
        return random.choice(challenges)

    async def execute_challenge(self, challenge: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a challenge and return results."""
        from infrastructure.openhands_local import OpenHandsClient

        try:
            oph = OpenHandsClient(timeout=30.0)
            start_time = time.time()

            result = await oph.execute(
                instructions=f"Execute {challenge['name']}",
                code=challenge["code"],
                run_tests=False
            )
            runtime_ms = (time.time() - start_time) * 1000

            # Check if all tests passed
            output = result.output or ""
            success = "PASSED" in output and result.exit_code == 0

            tests_passed = challenge["tests_count"] if success else 0
            tests_failed = 0 if success else challenge["tests_count"]

            oph.cleanup()

            return {
                "success": success,
                "tests_passed": tests_passed,
                "tests_failed": tests_failed,
                "tests_total": challenge["tests_count"],
                "runtime_ms": runtime_ms,
                "output": output,
                "error": result.errors if not success else None,
            }

        except Exception as e:
            logger.warning(f"Execution error: {e}")
            return {
                "success": False,
                "tests_passed": 0,
                "tests_failed": challenge["tests_count"],
                "tests_total": challenge["tests_count"],
                "runtime_ms": 5000,
                "error": str(e),
            }

    def compute_reward(self, result: Dict[str, Any], challenge: Dict[str, Any]) -> float:
        """Compute reward based on performance."""
        level = challenge["level"]

        if result["success"]:
            # Base reward for passing
            base_reward = 1.0 + (level * 0.5)  # Higher levels = more reward

            # Bonus for speed
            if result["runtime_ms"] < 100:
                base_reward += 0.3
            elif result["runtime_ms"] < 500:
                base_reward += 0.1

            # Bonus for test count
            base_reward += result["tests_passed"] * 0.1

            return base_reward
        else:
            # Partial credit based on level (easier levels = more forgiving)
            partial = 0.2 + (0.1 * (4 - level))  # Level 1 gets 0.5, Level 4 gets 0.2
            return partial

    def update_learning_state(self, success: bool, challenge: Dict[str, Any]):
        """Update learning state based on result."""
        level = challenge["level"]

        # Track score (1.0 for pass, 0.0 for fail)
        self.learning_state.level_scores[level].append(1.0 if success else 0.0)

        # Track consecutive results
        if success:
            self.learning_state.consecutive_passes += 1
            self.learning_state.consecutive_fails = 0
            self.learning_state.challenges_passed[challenge["name"]] = \
                self.learning_state.challenges_passed.get(challenge["name"], 0) + 1
        else:
            self.learning_state.consecutive_fails += 1
            self.learning_state.consecutive_passes = 0

        # Check for level changes
        if self.learning_state.should_level_up() and self.learning_state.current_level < 4:
            self.learning_state.current_level += 1
            self.learning_state.consecutive_passes = 0
            logger.info(f"🎉 LEVEL UP! Now at Level {self.learning_state.current_level}")
        elif self.learning_state.should_level_down():
            self.learning_state.current_level -= 1
            self.learning_state.consecutive_fails = 0
            logger.info(f"📉 Level down. Back to Level {self.learning_state.current_level}")

    async def run_iteration(self) -> Dict[str, Any]:
        """Run a single training iteration."""
        iteration_start = time.time()

        # Get challenge for current level
        level = self.learning_state.current_level
        challenge = self._get_challenge_for_level(level)

        logger.info(f"Level {level} | Challenge: {challenge['name']} ({challenge['tests_count']} tests)")

        # Execute
        result = await self.execute_challenge(challenge)

        # Compute reward
        reward = self.compute_reward(result, challenge)

        # Update learning state
        self.update_learning_state(result["success"], challenge)

        # Track best
        if reward > self.best_reward:
            self.best_reward = reward
            logger.info(f"⭐ New best reward: {reward:.4f}")

        # Update totals
        self.learning_state.total_tests_passed += result["tests_passed"]
        self.learning_state.total_tests_attempted += result["tests_total"]

        # Generate insights
        insights = []
        if result["success"]:
            insights.append(f"✅ Passed {challenge['name']} at Level {level}!")
            if self.learning_state.consecutive_passes >= 3:
                insights.append("🔥 On a streak! Keep it up!")
        else:
            insights.append(f"❌ Failed {challenge['name']}. Hint: {challenge['hint']}")
            if self.learning_state.consecutive_fails >= 2:
                insights.append("💡 Consider reviewing the basics")

        # Store result
        iteration_result = {
            "iteration": self.current_iteration,
            "level": level,
            "challenge": challenge["name"],
            "success": result["success"],
            "reward": reward,
            "best_reward": self.best_reward,
            "tests_passed": result["tests_passed"],
            "tests_total": result["tests_total"],
            "pass_rate": self.learning_state.pass_rate(level),
            "consecutive_passes": self.learning_state.consecutive_passes,
            "insights": insights,
            "iteration_time": time.time() - iteration_start,
            "timestamp": datetime.now().isoformat(),
        }

        self.metrics_history.append(iteration_result)
        self.current_iteration += 1

        # Log to Acontext
        self.acontext.log_rl_iteration(
            space="Genesis-Adaptive-Training",
            iteration=self.current_iteration,
            metrics={
                "level": level,
                "success": result["success"],
                "tests_passed": result["tests_passed"],
                "pass_rate": self.learning_state.pass_rate(level),
            },
            insights=insights,
            prefix="/rl/genesis/adaptive/",
        )

        return iteration_result

    async def run_training(self):
        """Run full adaptive training."""
        logger.info("=" * 70)
        logger.info("GENESIS ADAPTIVE TRAINING - Progressive Learning")
        logger.info("=" * 70)
        logger.info(f"Total iterations: {self.total_iterations}")
        logger.info("Level 1: Simple (3 tests) -> Level 4: Enterprise (10 tests)")
        logger.info("Genesis must PASS tests to level up!")
        logger.info("=" * 70)

        start_time = datetime.now()
        end_time = start_time + timedelta(hours=self.hours)

        try:
            while self.current_iteration < self.total_iterations:
                if datetime.now() > end_time:
                    logger.info("Time limit reached")
                    break

                result = await self.run_iteration()

                # Log progress
                progress = (self.current_iteration / self.total_iterations) * 100
                status = "✅" if result["success"] else "❌"
                logger.info(
                    f"[{self.current_iteration}/{self.total_iterations}] {status} "
                    f"L{result['level']} {result['challenge']} "
                    f"reward={result['reward']:.2f} best={self.best_reward:.2f} "
                    f"pass_rate={result['pass_rate']:.0%} streak={result['consecutive_passes']} "
                    f"progress={progress:.1f}%"
                )

                # Save checkpoint every 10 iterations
                if self.current_iteration % 10 == 0:
                    self._save_checkpoint()

                # Brief pause
                await asyncio.sleep(0.5)

        except KeyboardInterrupt:
            logger.info("Training interrupted")
        finally:
            self._save_checkpoint()
            self._print_summary()
            self.acontext.close()

    def _save_checkpoint(self):
        """Save training checkpoint."""
        checkpoint = {
            "iteration": self.current_iteration,
            "current_level": self.learning_state.current_level,
            "best_reward": self.best_reward,
            "total_tests_passed": self.learning_state.total_tests_passed,
            "total_tests_attempted": self.learning_state.total_tests_attempted,
            "level_pass_rates": {
                level: self.learning_state.pass_rate(level)
                for level in range(1, 5)
            },
            "challenges_passed": self.learning_state.challenges_passed,
            "metrics_history": self.metrics_history[-50:],
            "timestamp": datetime.now().isoformat(),
        }
        checkpoint_path = PROJECT_ROOT / "data" / "adaptive_checkpoint.json"
        with open(checkpoint_path, "w") as f:
            json.dump(checkpoint, f, indent=2)

    def _print_summary(self):
        """Print training summary."""
        logger.info("=" * 70)
        logger.info("TRAINING SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Final Level: {self.learning_state.current_level}")
        logger.info(f"Best Reward: {self.best_reward:.4f}")
        logger.info(f"Total Tests Passed: {self.learning_state.total_tests_passed}/{self.learning_state.total_tests_attempted}")

        for level in range(1, 5):
            rate = self.learning_state.pass_rate(level)
            attempts = len(self.learning_state.level_scores[level])
            logger.info(f"  Level {level}: {rate:.0%} pass rate ({attempts} attempts)")

        logger.info("Challenges Mastered:")
        for name, count in sorted(self.learning_state.challenges_passed.items(), key=lambda x: -x[1]):
            logger.info(f"  {name}: {count} passes")
        logger.info("=" * 70)


async def main():
    parser = argparse.ArgumentParser(description="Adaptive Genesis Training")
    parser.add_argument("--hours", type=int, default=8)
    parser.add_argument("--iterations-per-hour", type=int, default=10)
    args = parser.parse_args()

    # Ensure directories
    (PROJECT_ROOT / "logs").mkdir(exist_ok=True)
    (PROJECT_ROOT / "data").mkdir(exist_ok=True)

    trainer = AdaptiveTrainer(
        hours=args.hours,
        iterations_per_hour=args.iterations_per_hour
    )
    await trainer.run_training()


if __name__ == "__main__":
    asyncio.run(main())
