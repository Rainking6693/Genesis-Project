# src/rl/policy_update.py

from typing import Dict, Any, List, TYPE_CHECKING

if TYPE_CHECKING:
    from integrations.acontext_client import AcontextClient
    from core.genesis_meta import GenesisMetaAgent


class PolicyUpdater:
    """
    Handles policy/prompt updates for Genesis based on RL outcomes.
    Writes updated prompts to Acontext and returns new prompt text.
    """

    def __init__(
        self,
        acontext: "AcontextClient",
        genesis: "GenesisMetaAgent",
        space: str = "Genesis-Training",
        prompt_block_path: str = "/prompts/genesis/",
    ):
        self.acontext = acontext
        self.genesis = genesis
        self.space = space
        self.prompt_block_path = prompt_block_path

    def build_updated_prompt(
        self,
        base_prompt: str,
        rl_insights: List[str],
        eval_patterns: List[str],
    ) -> str:
        """
        Combine base prompt with RL-derived insights and improved evaluation patterns.
        """
        rl_section = "\n\n### RL-Derived Improvements\n" + "\n".join(
            f"- {insight}" for insight in rl_insights
        )
        eval_section = "\n\n### Refined Evaluation Patterns\n" + "\n".join(
            f"- {pattern}" for pattern in eval_patterns
        )

        updated = base_prompt.strip() + rl_section + eval_section
        return updated

    def update_genesis_prompt(
        self,
        rl_summary: Dict[str, Any],
        eval_patterns: List[str],
    ) -> str:
        """
        Given an RL summary (from R1 or Lightning) and a set of refined
        evaluation patterns, generate and persist a new Genesis prompt.
        """
        base_prompt = self.genesis.get_base_prompt()

        rl_insights = rl_summary.get("insights", [])
        updated_prompt = self.build_updated_prompt(base_prompt, rl_insights, eval_patterns)

        # Write to Acontext Space as a new versioned Block
        metadata = {
            "source": "rl_day1",
            "type": "genesis_prompt_snapshot",
        }
        self.acontext.create_block(
            space=self.space,
            path=self.prompt_block_path + "day1_rl_optimized.md",
            content=updated_prompt,
            metadata=metadata,
        )

        # Optionally update in-memory prompt used by GenesisMetaAgent
        self.genesis.set_active_prompt(updated_prompt)

        return updated_prompt
