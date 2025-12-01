# src/rl/lightning/lightning_reward_functions.py

from typing import Dict, Any


def score_prompt_candidate(metrics: Dict[str, Any]) -> float:
    """
    Scoring function for candidate prompts produced/optimized by Agent-Lightning.

    Expected keys:
      - "rubric_alignment": float in [0, 1]
      - "score_stability": float in [0, 1]
      - "feedback_quality": float in [0, 1]
      - "brevity_without_loss": float in [0, 1]
    """
    ra = float(metrics.get("rubric_alignment", 0.0))
    ss = float(metrics.get("score_stability", 0.0))
    fq = float(metrics.get("feedback_quality", 0.0))
    bwl = float(metrics.get("brevity_without_loss", 0.0))

    # Weights can be further tuned, but roughly follow rl_day1.yaml
    return (
        1.0 * ra
        + 0.9 * ss
        + 0.8 * fq
        + 0.4 * bwl
    )
