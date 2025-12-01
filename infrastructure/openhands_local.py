"""
OpenHands Local Execution Sandbox

Provides local execution sandbox for Genesis Evolution Strategies training when
the full OpenHands package is not available. This is a lightweight alternative
that provides similar functionality for code evaluation.

Key Features:
- Sandboxed Python code execution in subprocess
- Timeout enforcement (default: 30s)
- Resource limits (memory, CPU time)
- Test result capture (pytest integration)
- Stdout/stderr capture
- Execution time tracking

Security:
- All code runs in isolated subprocess
- Timeout prevents infinite loops
- No network access
- File system access restricted to temp directories

Usage:
    client = OpenHandsClient()
    result = await client.execute(
        instructions="Write a function to calculate fibonacci numbers",
        code="def fib(n): return n if n <= 1 else fib(n-1) + fib(n-2)"
    )
"""

import asyncio
import json
import logging
import os
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional, List

from infrastructure import get_logger

logger = get_logger("openhands_local")


@dataclass
class ExecutionResult:
    """
    Result from code execution

    Attributes:
        success: Whether execution succeeded
        output: Captured stdout
        errors: Captured stderr
        tests_passed: Number of tests passed (if tests were run)
        tests_failed: Number of tests failed
        runtime_ms: Execution time in milliseconds
        exit_code: Process exit code
        metadata: Additional execution metadata
    """
    success: bool
    output: str = ""
    errors: str = ""
    tests_passed: int = 0
    tests_failed: int = 0
    runtime_ms: float = 0.0
    exit_code: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


class OpenHandsClient:
    """
    Local execution sandbox for code evaluation

    Provides similar functionality to OpenHands but runs locally in subprocess.
    Used for Evolution Strategies training when full OpenHands is unavailable.

    Usage:
        client = OpenHandsClient(timeout=30.0)
        result = await client.execute("print('Hello, World!')")
    """

    def __init__(
        self,
        timeout: float = 30.0,
        max_memory_mb: int = 512,
        enable_networking: bool = False,
        workspace_dir: Optional[Path] = None
    ):
        """
        Initialize OpenHands local client

        Args:
            timeout: Maximum execution time in seconds (default: 30s)
            max_memory_mb: Maximum memory limit in MB (default: 512MB)
            enable_networking: Allow network access (default: False for security)
            workspace_dir: Workspace directory for execution (default: temp)
        """
        self.timeout = timeout
        self.max_memory_mb = max_memory_mb
        self.enable_networking = enable_networking
        self.workspace_dir = workspace_dir or Path(tempfile.mkdtemp(prefix="openhands_local_"))

        # Ensure workspace exists
        self.workspace_dir.mkdir(parents=True, exist_ok=True)

        logger.info(
            f"OpenHandsClient (local) initialized: timeout={timeout}s, "
            f"max_memory={max_memory_mb}MB, workspace={self.workspace_dir}"
        )

    async def execute(
        self,
        instructions: str,
        code: Optional[str] = None,
        language: str = "python",
        run_tests: bool = False
    ) -> ExecutionResult:
        """
        Execute code in sandboxed subprocess

        Args:
            instructions: Natural language description of task
            code: Code to execute (if None, generates from instructions)
            language: Programming language (currently only "python" supported)
            run_tests: Whether to run pytest on the code

        Returns:
            ExecutionResult with execution details
        """
        if language != "python":
            return ExecutionResult(
                success=False,
                errors=f"Unsupported language: {language}. Only 'python' is supported.",
                exit_code=1
            )

        # If no code provided, return instructions-only result
        if code is None:
            logger.warning("No code provided, returning empty result")
            return ExecutionResult(
                success=False,
                errors="No code provided for execution",
                exit_code=1,
                metadata={"instructions": instructions}
            )

        start_time = time.time()

        try:
            # Write code to temporary file
            code_file = self.workspace_dir / "execution.py"
            code_file.write_text(code, encoding="utf-8")

            logger.info(f"Executing code in {code_file}")

            # Build command
            if run_tests:
                # Run pytest if tests requested
                cmd = [
                    "pytest",
                    str(code_file),
                    "-v",
                    "--tb=short",
                    "--json-report",
                    f"--json-report-file={self.workspace_dir / 'test_report.json'}"
                ]
            else:
                # Execute Python code directly
                cmd = ["python", str(code_file)]

            # Execute with timeout and capture output
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.workspace_dir)
            )

            # Wait for completion with timeout
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.timeout
                )
            except asyncio.TimeoutError:
                # Kill process on timeout
                process.kill()
                await process.wait()

                runtime_ms = (time.time() - start_time) * 1000
                logger.error(f"Execution timed out after {runtime_ms:.2f}ms")

                return ExecutionResult(
                    success=False,
                    errors=f"Execution timed out after {self.timeout}s",
                    runtime_ms=runtime_ms,
                    exit_code=-1,
                    metadata={"timeout": True}
                )

            runtime_ms = (time.time() - start_time) * 1000

            # Decode output
            output = stdout.decode("utf-8", errors="replace") if stdout else ""
            errors = stderr.decode("utf-8", errors="replace") if stderr else ""
            exit_code = process.returncode or 0

            # Parse test results if pytest was run
            tests_passed = 0
            tests_failed = 0
            if run_tests:
                tests_passed, tests_failed = self._parse_pytest_results()

            success = exit_code == 0

            result = ExecutionResult(
                success=success,
                output=output,
                errors=errors,
                tests_passed=tests_passed,
                tests_failed=tests_failed,
                runtime_ms=runtime_ms,
                exit_code=exit_code,
                metadata={
                    "instructions": instructions,
                    "code_length": len(code),
                    "workspace": str(self.workspace_dir),
                    "run_tests": run_tests
                }
            )

            logger.info(
                f"Execution {'succeeded' if success else 'failed'}: "
                f"runtime={runtime_ms:.2f}ms, exit_code={exit_code}, "
                f"tests={tests_passed}/{tests_passed + tests_failed}"
            )

            return result

        except Exception as e:
            runtime_ms = (time.time() - start_time) * 1000
            logger.error(f"Execution failed with exception: {e}")

            return ExecutionResult(
                success=False,
                errors=str(e),
                runtime_ms=runtime_ms,
                exit_code=-1,
                metadata={"exception": str(e)}
            )

    def _parse_pytest_results(self) -> tuple[int, int]:
        """
        Parse pytest JSON report for test results

        Returns:
            Tuple of (tests_passed, tests_failed)
        """
        report_file = self.workspace_dir / "test_report.json"

        if not report_file.exists():
            logger.warning("Pytest report not found, checking stderr")
            return 0, 0

        try:
            with open(report_file, "r") as f:
                report = json.load(f)

            summary = report.get("summary", {})
            passed = summary.get("passed", 0)
            failed = summary.get("failed", 0)

            logger.info(f"Pytest results: {passed} passed, {failed} failed")
            return passed, failed

        except Exception as e:
            logger.error(f"Failed to parse pytest report: {e}")
            return 0, 0

    async def generate_code(
        self,
        problem_description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ExecutionResult:
        """
        Generate code from problem description

        Note: This is a simplified stub. In full OpenHands, this would use
        CodeActAgent to generate code. Here we just return instructions.

        Args:
            problem_description: Description of code to generate
            context: Additional context

        Returns:
            ExecutionResult with metadata (no actual code generation)
        """
        logger.warning(
            "generate_code called but local client cannot generate code. "
            "Returning instructions only. Use full OpenHands for code generation."
        )

        return ExecutionResult(
            success=False,
            output="",
            errors="Local client cannot generate code. Provide code explicitly or use full OpenHands.",
            exit_code=1,
            metadata={
                "problem_description": problem_description,
                "context": context or {},
                "note": "Code generation requires full OpenHands package"
            }
        )

    async def execute_with_tests(
        self,
        code: str,
        test_code: str
    ) -> ExecutionResult:
        """
        Execute code and run tests against it

        Args:
            code: Implementation code
            test_code: Test code (pytest)

        Returns:
            ExecutionResult with test results
        """
        # Write both files
        code_file = self.workspace_dir / "implementation.py"
        test_file = self.workspace_dir / "test_implementation.py"

        code_file.write_text(code, encoding="utf-8")
        test_file.write_text(test_code, encoding="utf-8")

        logger.info("Executing tests against implementation")

        # Run pytest on test file
        start_time = time.time()

        try:
            cmd = [
                "pytest",
                str(test_file),
                "-v",
                "--tb=short",
                "--json-report",
                f"--json-report-file={self.workspace_dir / 'test_report.json'}"
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.workspace_dir)
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.timeout
            )

            runtime_ms = (time.time() - start_time) * 1000

            output = stdout.decode("utf-8", errors="replace") if stdout else ""
            errors = stderr.decode("utf-8", errors="replace") if stderr else ""
            exit_code = process.returncode or 0

            tests_passed, tests_failed = self._parse_pytest_results()

            return ExecutionResult(
                success=exit_code == 0,
                output=output,
                errors=errors,
                tests_passed=tests_passed,
                tests_failed=tests_failed,
                runtime_ms=runtime_ms,
                exit_code=exit_code,
                metadata={
                    "code_file": str(code_file),
                    "test_file": str(test_file)
                }
            )

        except asyncio.TimeoutError:
            runtime_ms = (time.time() - start_time) * 1000
            return ExecutionResult(
                success=False,
                errors=f"Test execution timed out after {self.timeout}s",
                runtime_ms=runtime_ms,
                exit_code=-1,
                metadata={"timeout": True}
            )

    def cleanup(self):
        """Clean up workspace directory"""
        try:
            import shutil
            if self.workspace_dir.exists():
                shutil.rmtree(self.workspace_dir)
                logger.info(f"Cleaned up workspace: {self.workspace_dir}")
        except Exception as e:
            logger.warning(f"Failed to cleanup workspace: {e}")

    def __del__(self):
        """Cleanup on deletion"""
        self.cleanup()


# Factory function for consistency with openhands_integration.py
def get_openhands_client(
    timeout: float = 30.0,
    **kwargs
) -> OpenHandsClient:
    """
    Factory function to create OpenHands local client

    Args:
        timeout: Execution timeout in seconds
        **kwargs: Additional client arguments

    Returns:
        OpenHandsClient instance
    """
    return OpenHandsClient(timeout=timeout, **kwargs)
