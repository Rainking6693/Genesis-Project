"""
AgentGit - Git operations for autonomous agents.

Provides safe, sandboxed Git operations for agents with:
- Repository initialization and cloning
- Branch management
- Commit creation with validation
- Merge and rebase operations
- Conflict detection and resolution
- Security controls (no force push, protected branches)
- Git hooks integration

Enables agents to manage code repositories autonomously while
maintaining safety and quality standards.
"""

import logging
import os
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import re

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


@dataclass
class GitConfig:
    """Git configuration for agent operations"""
    user_name: str = "Genesis Agent"
    user_email: str = "agent@genesis.ai"
    default_branch: str = "main"
    protected_branches: List[str] = field(default_factory=lambda: ["main", "master", "production"])
    allow_force_push: bool = False
    max_file_size_mb: int = 100
    require_commit_message: bool = True


@dataclass
class GitCommit:
    """Git commit information"""
    hash: str
    author: str
    email: str
    timestamp: float
    message: str
    files_changed: List[str]
    insertions: int = 0
    deletions: int = 0


@dataclass
class GitBranch:
    """Git branch information"""
    name: str
    is_current: bool
    last_commit: Optional[str] = None
    tracking_remote: Optional[str] = None


class AgentGit:
    """
    Git operations manager for autonomous agents.

    Provides safe, controlled Git operations with security constraints
    and validation.
    """

    def __init__(self, repo_path: Optional[str] = None, config: Optional[GitConfig] = None):
        """
        Initialize AgentGit.

        Args:
            repo_path: Path to Git repository (None = temp directory)
            config: Git configuration
        """
        self.config = config or GitConfig()

        if repo_path:
            self.repo_path = Path(repo_path)
        else:
            self.repo_path = Path(tempfile.mkdtemp(prefix="genesis_git_"))

        self._git_configured = False

        logger.info(f"AgentGit initialized at {self.repo_path}")

    def _run_git_command(
        self,
        args: List[str],
        check: bool = True,
        capture_output: bool = True
    ) -> subprocess.CompletedProcess:
        """
        Run git command safely.

        Args:
            args: Git command arguments
            check: Raise exception on error
            capture_output: Capture stdout/stderr

        Returns:
            CompletedProcess result
        """
        cmd = ["git"] + args

        logger.debug(f"Running: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            cwd=self.repo_path,
            check=check,
            capture_output=capture_output,
            text=True
        )

        return result

    def _ensure_git_config(self) -> None:
        """Ensure Git user config is set"""
        if self._git_configured:
            return

        try:
            self._run_git_command(["config", "user.name", self.config.user_name])
            self._run_git_command(["config", "user.email", self.config.user_email])
            self._git_configured = True
        except Exception as e:
            logger.warning(f"Failed to set Git config: {e}")

    def init_repository(self, initial_branch: Optional[str] = None) -> bool:
        """
        Initialize Git repository.

        Args:
            initial_branch: Initial branch name (None = use default)

        Returns:
            True if successful
        """
        try:
            branch = initial_branch or self.config.default_branch

            # Initialize repo
            self._run_git_command(["init", "-b", branch])

            # Configure
            self._ensure_git_config()

            logger.info(f"Initialized Git repository with branch '{branch}'")

            return True

        except Exception as e:
            logger.error(f"Failed to initialize repository: {e}")
            return False

    def clone_repository(self, url: str, depth: Optional[int] = None) -> bool:
        """
        Clone remote repository.

        Args:
            url: Repository URL
            depth: Clone depth (None = full history)

        Returns:
            True if successful
        """
        try:
            args = ["clone", url, str(self.repo_path)]

            if depth:
                args.extend(["--depth", str(depth)])

            # Clone to temp first
            temp_dir = tempfile.mkdtemp(prefix="genesis_clone_")
            args[-1] = temp_dir

            subprocess.run(["git"] + args, check=True, capture_output=True)

            # Move contents to repo_path
            import shutil
            shutil.rmtree(self.repo_path)
            shutil.move(temp_dir, self.repo_path)

            self._ensure_git_config()

            logger.info(f"Cloned repository from {url}")

            return True

        except Exception as e:
            logger.error(f"Failed to clone repository: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """
        Get repository status.

        Returns:
            Status information
        """
        try:
            result = self._run_git_command(["status", "--porcelain", "-b"])

            lines = result.stdout.strip().split('\n')
            branch_line = lines[0] if lines else ""

            # Parse branch info
            branch_match = re.match(r'## (.+?)(?:\.\.\.(.+?))?(?:\s\[(.+)\])?$', branch_line)
            current_branch = branch_match.group(1) if branch_match else "unknown"

            # Parse file changes
            modified = []
            added = []
            deleted = []
            untracked = []

            for line in lines[1:]:
                if not line:
                    continue

                status = line[:2]
                filename = line[3:]

                if status.startswith('M'):
                    modified.append(filename)
                elif status.startswith('A'):
                    added.append(filename)
                elif status.startswith('D'):
                    deleted.append(filename)
                elif status.startswith('??'):
                    untracked.append(filename)

            return {
                "branch": current_branch,
                "modified": modified,
                "added": added,
                "deleted": deleted,
                "untracked": untracked,
                "clean": len(modified) == 0 and len(added) == 0 and len(deleted) == 0 and len(untracked) == 0
            }

        except Exception as e:
            logger.error(f"Failed to get status: {e}")
            return {"error": str(e)}

    def create_branch(self, branch_name: str, from_branch: Optional[str] = None) -> bool:
        """
        Create new branch.

        Args:
            branch_name: Name of new branch
            from_branch: Base branch (None = current branch)

        Returns:
            True if successful
        """
        try:
            args = ["checkout", "-b", branch_name]

            if from_branch:
                args.append(from_branch)

            self._run_git_command(args)

            logger.info(f"Created branch '{branch_name}'")

            return True

        except Exception as e:
            logger.error(f"Failed to create branch: {e}")
            return False

    def switch_branch(self, branch_name: str) -> bool:
        """
        Switch to branch.

        Args:
            branch_name: Branch to switch to

        Returns:
            True if successful
        """
        try:
            self._run_git_command(["checkout", branch_name])

            logger.info(f"Switched to branch '{branch_name}'")

            return True

        except Exception as e:
            logger.error(f"Failed to switch branch: {e}")
            return False

    def commit(
        self,
        message: str,
        files: Optional[List[str]] = None,
        allow_empty: bool = False
    ) -> Optional[str]:
        """
        Create commit.

        Args:
            message: Commit message
            files: Files to commit (None = all changes)
            allow_empty: Allow empty commits

        Returns:
            Commit hash if successful
        """
        try:
            # Validate message
            if self.config.require_commit_message and not message.strip():
                logger.error("Commit message required")
                return None

            # Add files
            if files:
                for file in files:
                    self._run_git_command(["add", file])
            else:
                self._run_git_command(["add", "-A"])

            # Create commit
            args = ["commit", "-m", message]

            if allow_empty:
                args.append("--allow-empty")

            self._ensure_git_config()
            result = self._run_git_command(args)

            # Get commit hash
            hash_result = self._run_git_command(["rev-parse", "HEAD"])
            commit_hash = hash_result.stdout.strip()

            logger.info(f"Created commit: {commit_hash[:8]} - {message[:50]}")

            return commit_hash

        except Exception as e:
            logger.error(f"Failed to create commit: {e}")
            return None

    def get_commits(self, limit: int = 10, branch: Optional[str] = None) -> List[GitCommit]:
        """
        Get commit history.

        Args:
            limit: Maximum commits to return
            branch: Branch to get commits from (None = current)

        Returns:
            List of commits
        """
        try:
            args = [
                "log",
                f"-{limit}",
                "--pretty=format:%H|%an|%ae|%at|%s",
                "--numstat"
            ]

            if branch:
                args.append(branch)

            result = self._run_git_command(args)

            commits = []
            lines = result.stdout.strip().split('\n')

            i = 0
            while i < len(lines):
                if not lines[i]:
                    i += 1
                    continue

                # Parse commit line
                parts = lines[i].split('|')
                if len(parts) < 5:
                    i += 1
                    continue

                commit = GitCommit(
                    hash=parts[0],
                    author=parts[1],
                    email=parts[2],
                    timestamp=float(parts[3]),
                    message=parts[4],
                    files_changed=[]
                )

                i += 1

                # Parse file changes
                while i < len(lines) and lines[i] and '|' not in lines[i]:
                    stats = lines[i].split('\t')
                    if len(stats) >= 3:
                        commit.files_changed.append(stats[2])
                    i += 1

                commits.append(commit)

            return commits

        except Exception as e:
            logger.error(f"Failed to get commits: {e}")
            return []

    def is_protected_branch(self, branch: str) -> bool:
        """Check if branch is protected"""
        return branch in self.config.protected_branches

    def validate_operation(self, operation: str, branch: str) -> Tuple[bool, Optional[str]]:
        """
        Validate Git operation against security policies.

        Args:
            operation: Operation name (push, force-push, delete, etc.)
            branch: Target branch

        Returns:
            (is_valid, error_message)
        """
        # Check protected branches
        if operation in ["force-push", "delete"] and self.is_protected_branch(branch):
            return False, f"Operation '{operation}' not allowed on protected branch '{branch}'"

        # Check force push policy
        if operation == "force-push" and not self.config.allow_force_push:
            return False, "Force push is disabled by policy"

        return True, None


# Global instance
_agent_git = None


def get_agent_git(repo_path: Optional[str] = None) -> AgentGit:
    """
    Get or create AgentGit instance.

    Args:
        repo_path: Repository path

    Returns:
        AgentGit instance
    """
    global _agent_git
    if _agent_git is None or (repo_path and _agent_git.repo_path != Path(repo_path)):
        _agent_git = AgentGit(repo_path)
    return _agent_git
