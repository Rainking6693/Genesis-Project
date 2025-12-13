"""
GitHub Pusher - Push Genesis business code to GitHub

Automatically creates repositories and pushes business code to GitHub
before deploying to Netlify.
"""

import logging
import subprocess
import os
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class GitHubPusher:
    """Push business code to GitHub repositories"""
    
    def __init__(self):
        self.github_token = os.getenv("GITHUB_TOKEN", "")
        self.github_org = os.getenv("GITHUB_ORG", "")  # Optional: push to org instead of personal
        
    def is_configured(self) -> bool:
        """Check if GitHub is properly configured"""
        return bool(self.github_token)
    
    async def push_to_github(
        self, 
        codebase_path: str, 
        business_name: str,
        create_repo: bool = True
    ) -> Dict[str, Any]:
        """
        Push business code to GitHub repository.
        
        Args:
            codebase_path: Path to the business code directory
            business_name: Name of the business (used for repo name)
            create_repo: Whether to create a new GitHub repo
            
        Returns:
            Dict with success status, repo_url, and any errors
        """
        try:
            repo_path = Path(codebase_path)
            
            if not repo_path.exists():
                return {
                    "success": False,
                    "error": f"Codebase path does not exist: {codebase_path}"
                }
            
            logger.info(f"Pushing {business_name} to GitHub...")
            
            # Sanitize repo name (GitHub requirements)
            repo_name = business_name.lower().replace(" ", "-").replace("_", "-")
            repo_name = ''.join(c for c in repo_name if c.isalnum() or c == '-')
            
            # Initialize git if not already
            await self._run_git_command(["git", "init"], repo_path)
            
            # Configure git user (required for commit)
            await self._run_git_command(
                ["git", "config", "user.email", "genesis@autonomous.ai"],
                repo_path
            )
            await self._run_git_command(
                ["git", "config", "user.name", "Genesis Pipeline"],
                repo_path
            )
            
            # Create .gitignore if it doesn't exist
            gitignore_path = repo_path / ".gitignore"
            if not gitignore_path.exists():
                gitignore_path.write_text(
                    "node_modules/\n"
                    ".env\n"
                    ".DS_Store\n"
                    "*.log\n"
                )
            
            # Add all files
            await self._run_git_command(["git", "add", "."], repo_path)
            
            # Commit
            commit_message = f"Genesis auto-deploy: {business_name}"
            await self._run_git_command(
                ["git", "commit", "-m", commit_message, "--allow-empty"],
                repo_path
            )
            
            # Create GitHub repo if requested and configured
            if create_repo and self.is_configured():
                repo_url = await self._create_github_repo(repo_name)
                if not repo_url:
                    return {
                        "success": False,
                        "error": "Failed to create GitHub repository"
                    }
            else:
                # Assume repo already exists or user will create it manually
                if self.github_org:
                    repo_url = f"https://github.com/{self.github_org}/{repo_name}.git"
                else:
                    # Use token to get username
                    repo_url = f"https://github.com/genesis-auto/{repo_name}.git"
            
            # Add remote (remove if exists)
            try:
                await self._run_git_command(["git", "remote", "remove", "origin"], repo_path)
            except:
                pass  # Remote doesn't exist, which is fine
            
            await self._run_git_command(
                ["git", "remote", "add", "origin", repo_url],
                repo_path
            )
            
            # Rename branch to main if needed
            try:
                await self._run_git_command(
                    ["git", "branch", "-M", "main"],
                    repo_path
                )
            except:
                pass  # Branch might already be main
            
            # Push to GitHub
            if self.is_configured():
                # Use token for authentication
                auth_url = repo_url.replace(
                    "https://",
                    f"https://{self.github_token}@"
                )
                await self._run_git_command(
                    ["git", "push", "-u", auth_url, "main", "--force"],
                    repo_path,
                    hide_output=True  # Hide token from logs
                )
            else:
                logger.warning("GitHub token not configured, skipping push")
                return {
                    "success": True,
                    "repo_url": repo_url,
                    "pushed": False,
                    "message": "GitHub not configured, repo initialized locally only"
                }
            
            logger.info(f"✅ Successfully pushed {business_name} to {repo_url}")
            
            return {
                "success": True,
                "repo_url": repo_url,
                "pushed": True,
                "repo_name": repo_name
            }
            
        except Exception as e:
            logger.error(f"GitHub push failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _run_git_command(
        self, 
        command: list, 
        cwd: Path,
        hide_output: bool = False
    ) -> str:
        """Run a git command asynchronously"""
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                cwd=str(cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                if not hide_output:
                    logger.error(f"Git command failed: {' '.join(command)}")
                    logger.error(f"Error: {error_msg}")
                raise RuntimeError(error_msg)
            
            return stdout.decode() if stdout else ""
            
        except FileNotFoundError:
            raise RuntimeError("Git is not installed or not in PATH")
    
    async def _create_github_repo(self, repo_name: str) -> Optional[str]:
        """Create a GitHub repository using the API"""
        if not self.is_configured():
            logger.warning("GitHub token not configured, cannot create repo")
            return None
        
        try:
            import aiohttp
            
            url = "https://api.github.com/user/repos"
            if self.github_org:
                url = f"https://api.github.com/orgs/{self.github_org}/repos"
            
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            data = {
                "name": repo_name,
                "description": f"Genesis autonomous business: {repo_name}",
                "private": False,  # Public by default
                "auto_init": False  # We'll push our own code
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=data) as resp:
                    if resp.status == 201:
                        result = await resp.json()
                        logger.info(f"✅ Created GitHub repo: {result['html_url']}")
                        return result['clone_url']
                    elif resp.status == 422:
                        # Repo already exists
                        logger.info(f"GitHub repo {repo_name} already exists")
                        if self.github_org:
                            return f"https://github.com/{self.github_org}/{repo_name}.git"
                        else:
                            # Try to get the repo URL
                            async with session.get(
                                f"https://api.github.com/repos/{self.github_org or 'user'}/{repo_name}",
                                headers=headers
                            ) as get_resp:
                                if get_resp.status == 200:
                                    result = await get_resp.json()
                                    return result['clone_url']
                        return f"https://github.com/genesis-auto/{repo_name}.git"
                    else:
                        error = await resp.text()
                        logger.error(f"Failed to create GitHub repo: {error}")
                        return None
                        
        except Exception as e:
            logger.error(f"GitHub API error: {e}")
            return None


# Singleton instance
_github_pusher = None


def get_github_pusher() -> GitHubPusher:
    """Get singleton GitHub pusher instance"""
    global _github_pusher
    if _github_pusher is None:
        _github_pusher = GitHubPusher()
    return _github_pusher


# Test
if __name__ == "__main__":
    async def test():
        pusher = get_github_pusher()
        print(f"GitHub configured: {pusher.is_configured()}")
        
        # Test push (create a dummy directory)
        test_path = Path("test_business")
        test_path.mkdir(exist_ok=True)
        (test_path / "README.md").write_text("# Test Business\n\nGenerated by Genesis")
        
        result = await pusher.push_to_github(
            str(test_path),
            "test-business",
            create_repo=True
        )
        
        print(f"Result: {result}")
    
    asyncio.run(test())
