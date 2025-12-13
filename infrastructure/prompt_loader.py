"""
Externalized Prompt Management System
Based on: arXiv:2512.08769 Best Practice #4

Stores prompts as external Markdown files for:
- Version control and collaboration
- A/B testing and continuous improvement
- Separation of concerns (prompts vs. code)
- Red-teaming and governance
"""

import os
import logging
from pathlib import Path
from typing import Dict, Optional, Any
from functools import lru_cache
import re

logger = logging.getLogger(__name__)

# Default prompts directory
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


class PromptLoader:
    """
    Load and manage externalized prompts from markdown files.

    Best Practice: Prompts should be external artifacts, not embedded in code.
    This enables version control, A/B testing, and stakeholder collaboration.
    """

    def __init__(self, prompts_dir: Optional[Path] = None):
        self.prompts_dir = prompts_dir or PROMPTS_DIR
        self._cache: Dict[str, str] = {}

        if not self.prompts_dir.exists():
            logger.warning(f"Prompts directory not found: {self.prompts_dir}")
            self.prompts_dir.mkdir(parents=True, exist_ok=True)

    def load(
        self,
        prompt_name: str,
        variables: Optional[Dict[str, Any]] = None,
        fallback: Optional[str] = None
    ) -> str:
        """
        Load a prompt from external file and substitute variables.

        Args:
            prompt_name: Name of prompt file (without extension)
            variables: Dict of variables to substitute ({var} -> value)
            fallback: Fallback prompt if file not found

        Returns:
            Prompt string with variables substituted
        """
        # Check cache first
        cache_key = prompt_name
        if cache_key not in self._cache:
            prompt_path = self.prompts_dir / f"{prompt_name}.md"

            if not prompt_path.exists():
                # Try .txt extension
                prompt_path = self.prompts_dir / f"{prompt_name}.txt"

            if not prompt_path.exists():
                if fallback:
                    logger.warning(f"Prompt '{prompt_name}' not found, using fallback")
                    return self._substitute(fallback, variables)
                raise FileNotFoundError(f"Prompt not found: {prompt_name}")

            self._cache[cache_key] = prompt_path.read_text(encoding="utf-8")
            logger.debug(f"Loaded prompt: {prompt_name}")

        prompt = self._cache[cache_key]
        return self._substitute(prompt, variables)

    def _substitute(
        self,
        prompt: str,
        variables: Optional[Dict[str, Any]]
    ) -> str:
        """Substitute {variable} placeholders in prompt."""
        if not variables:
            return prompt

        for key, value in variables.items():
            placeholder = "{" + key + "}"
            if placeholder in prompt:
                prompt = prompt.replace(placeholder, str(value))

        return prompt

    def reload(self, prompt_name: Optional[str] = None):
        """Clear cache to force reload of prompts."""
        if prompt_name:
            self._cache.pop(prompt_name, None)
        else:
            self._cache.clear()
        logger.info(f"Prompt cache cleared: {prompt_name or 'all'}")

    def list_prompts(self) -> list:
        """List all available prompt files."""
        prompts = []
        for ext in [".md", ".txt"]:
            prompts.extend([
                p.stem for p in self.prompts_dir.glob(f"*{ext}")
            ])
        return sorted(set(prompts))


# Global instance for convenience
_loader: Optional[PromptLoader] = None


def get_prompt_loader() -> PromptLoader:
    """Get global PromptLoader instance."""
    global _loader
    if _loader is None:
        _loader = PromptLoader()
    return _loader


def load_prompt(
    prompt_name: str,
    variables: Optional[Dict[str, Any]] = None,
    fallback: Optional[str] = None
) -> str:
    """
    Convenience function to load a prompt.

    Usage:
        prompt = load_prompt("business_idea_generation", {
            "business_type": "saas",
            "trends": "AI, automation"
        })
    """
    return get_prompt_loader().load(prompt_name, variables, fallback)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)

    loader = PromptLoader()
    print("Available prompts:", loader.list_prompts())

    # Test loading
    try:
        prompt = loader.load("business_idea_generation", {
            "business_type": "saas",
            "trends": "AI, automation, remote work",
            "market_hints": "developers, startups"
        })
        print("\n--- Loaded Prompt ---")
        print(prompt[:500] + "...")
    except FileNotFoundError as e:
        print(f"Error: {e}")
