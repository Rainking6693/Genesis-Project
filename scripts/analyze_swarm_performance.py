#!/usr/bin/env python
"""
Swarm Performance Analytics
===========================

Utility script for analysing the Genesis inclusive-fitness swarm optimiser.
It runs a lightweight simulation over several generations, captures the team
compositions discovered by the PSO optimiser, and produces a structured report
that downstream tooling (e.g. the dashboard) can visualise.

Outputs
-------
* Console summary (fitness trends, emergent strategies, improvement metrics)
* JSON report with full metrics (default: reports/swarm/swarm_performance_summary.json)
* Optional heatmap image for the kin cooperation matrix (PNG)

The simulation relies on the inclusive fitness and swarm bridge modules that
ship with the repository, so no external services are required.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from collections import Counter, defaultdict
import os
import time
from dataclasses import asdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from infrastructure.inclusive_fitness_swarm import (
    Agent,
    GenotypeGroup,
    TaskRequirement,
    TeamOutcome,
)
from infrastructure.swarm import GENESIS_DEFAULT_PROFILES, create_swarm_halo_bridge
from infrastructure.swarm.swarm_halo_bridge import AgentProfile, SwarmHALOBridge

DEFAULT_OUTPUT_PATH = Path("reports/swarm/swarm_performance_summary.json")
DEFAULT_HEATMAP_PATH = Path("reports/swarm/swarm_cooperation_matrix.png")
REPORT_VERSION = "1.0"
ANALYSIS_LOCKFILE = Path(os.getenv("SWARM_ANALYSIS_LOCKFILE", "/tmp/swarm_analysis.lock"))
ANALYSIS_MIN_INTERVAL = int(os.getenv("SWARM_ANALYSIS_MIN_INTERVAL", "300"))


def _ensure_directory(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def check_analysis_rate_limit() -> None:
    """Prevent the analytics script from running too frequently."""
    if ANALYSIS_MIN_INTERVAL <= 0:
        return

    if ANALYSIS_LOCKFILE.exists():
        elapsed = time.time() - ANALYSIS_LOCKFILE.stat().st_mtime
        if elapsed < ANALYSIS_MIN_INTERVAL:
            raise RuntimeError(
                f"Swarm analysis ran {elapsed:.0f}s ago. Minimum interval is {ANALYSIS_MIN_INTERVAL}s."
            )

    ANALYSIS_LOCKFILE.parent.mkdir(parents=True, exist_ok=True)
    ANALYSIS_LOCKFILE.touch()


def load_profiles(use_default: bool = True) -> List[AgentProfile]:
    if use_default:
        # Return copies so that mutations in the simulation do not affect the constant.
        return [AgentProfile(**asdict(profile)) for profile in GENESIS_DEFAULT_PROFILES]
    raise ValueError("Custom profile loading not yet implemented")


def build_tasks() -> List[Dict]:
    """Create a representative set of business tasks the swarm should solve."""
    return [
        {
            "task_id": "saas_launch",
            "required_capabilities": [
                "coding",
                "architecture",
                "deployment",
                "testing",
                "payments",
            ],
            "team_size_range": (3, 5),
            "priority": 1.4,
        },
        {
            "task_id": "ecommerce_store",
            "required_capabilities": [
                "seo",
                "email_marketing",
                "content_strategy",
                "ads",
                "payments",
            ],
            "team_size_range": (3, 4),
            "priority": 1.2,
        },
        {
            "task_id": "support_automation",
            "required_capabilities": [
                "customer_service",
                "documentation",
                "analytics",
                "automation",
            ],
            "team_size_range": (2, 4),
            "priority": 1.0,
        },
        {
            "task_id": "compliance_review",
            "required_capabilities": [
                "compliance",
                "privacy",
                "security",
                "reporting",
            ],
            "team_size_range": (2, 3),
            "priority": 1.3,
        },
        {
            "task_id": "content_campaign",
            "required_capabilities": [
                "copywriting",
                "content_strategy",
                "social_media",
                "analytics",
            ],
            "team_size_range": (2, 4),
            "priority": 1.1,
        },
        {
            "task_id": "growth_experiment",
            "required_capabilities": [
                "analytics",
                "growth",
                "ads",
                "experimentation",
            ],
            "team_size_range": (2, 4),
            "priority": 1.25,
        },
    ]


def task_requirement(payload: Dict) -> TaskRequirement:
    return TaskRequirement(
        task_id=payload["task_id"],
        required_capabilities=payload["required_capabilities"],
        team_size_range=payload["team_size_range"],
        priority=payload["priority"],
    )


def agents_by_name(bridge: SwarmHALOBridge) -> Dict[str, Agent]:
    return {agent.name: agent for agent in bridge.swarm_agents}


def sample_baseline_success(
    bridge: SwarmHALOBridge,
    tasks: Sequence[TaskRequirement],
    repeats: int = 5,
) -> float:
    """
    Estimate the baseline success rate by sampling random teams (no optimisation).
    """
    total_success = 0
    total_trials = 0

    rng = bridge.pso.rng
    for _ in range(repeats):
        for task in tasks:
            if not bridge.swarm_agents:
                continue

            sample_size = min(len(bridge.swarm_agents), 2)
            candidate_team = rng.sample(bridge.swarm_agents, sample_size)
            capabilities = {cap for agent in candidate_team for cap in agent.capabilities}
            required = set(task.required_capabilities)
            coverage = (len(capabilities & required) / len(required)) if required else 1.0
            total_success += coverage
            total_trials += 1

    return (total_success / total_trials) if total_trials else 0.0


def update_agent_fitness(team: Iterable[Agent], outcome: TeamOutcome) -> None:
    """Gently nudge agent fitness toward the latest contributions."""
    for agent in team:
        current = agent.current_fitness or agent.metadata.get("success_rate", 0.5)
        contribution = outcome.individual_contributions.get(agent.name, 0.0)
        agent.current_fitness = 0.7 * current + 0.3 * contribution
        agent.metadata["recent_reward"] = contribution


def compute_cooperation_matrix(
    teams: List[Tuple[List[Agent], TaskRequirement]],
    bridge: SwarmHALOBridge,
) -> Dict[str, Dict[str, float]]:
    totals: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for team, _task in teams:
        for i, agent in enumerate(team):
            for teammate in team[i + 1 :]:
                relatedness = bridge.swarm.calculate_relatedness(agent, teammate)
                a = agent.genotype.value
                b = teammate.genotype.value
                totals[a][b] += relatedness
                totals[b][a] += relatedness
                counts[a][b] += 1
                counts[b][a] += 1

    matrix: Dict[str, Dict[str, float]] = {}
    for genotype in GenotypeGroup:
        row: Dict[str, float] = {}
        for other in GenotypeGroup:
            total = totals[genotype.value][other.value]
            count = counts[genotype.value][other.value]
            row[other.value] = (total / count) if count else (1.0 if genotype == other else 0.0)
        matrix[genotype.value] = row
    return matrix


def detect_emergent_strategies(
    generation_results: List[Dict],
    diversity_history: Sequence[float],
) -> List[str]:
    notes: List[str] = []
    if not generation_results:
        return notes

    final_gen = generation_results[-1]
    diversity_gain = diversity_history[-1] - diversity_history[0] if diversity_history else 0.0
    if diversity_gain > 0.1:
        notes.append(
            f"Genotype diversity increased by {diversity_gain:.2f}, indicating hybrid-team exploration."
        )

    high_success = [
        team for team in final_gen["teams"] if team["success_rate"] >= 0.75 and team["kin_score"] >= 0.5
    ]
    if high_success:
        notes.append(
            f"{len(high_success)} high-performing kin clusters maintained ≥75% success with strong cooperation."
        )

    adaptive = [
        team
        for team in final_gen["teams"]
        if team["diversity"] >= 0.5 and team["success_rate"] >= 0.7
    ]
    if adaptive:
        notes.append(
            "Hybrid teams balancing diversity and kinship emerged as reliable performers."
        )
    return notes


def attempt_heatmap(matrix: Dict[str, Dict[str, float]], path: Path) -> Optional[str]:
    try:
        import matplotlib.pyplot as plt  # type: ignore
        import numpy as np  # noqa: F401  # ensure numpy available for imshow
    except Exception as exc:  # pragma: no cover - optional dependency
        return f"Matplotlib unavailable ({exc}); skipped heatmap generation."

    labels = list(matrix.keys())
    data = [[matrix[row][col] for col in labels] for row in labels]

    fig, ax = plt.subplots(figsize=(6, 5))
    heatmap = ax.imshow(data, cmap="viridis", vmin=0.0, vmax=1.0)

    ax.set_xticks(range(len(labels)))
    ax.set_yticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_yticklabels(labels)
    ax.set_title("Kin Cooperation Matrix")

    for i, row in enumerate(data):
        for j, value in enumerate(row):
            ax.text(j, i, f"{value:.2f}", ha="center", va="center", color="white", fontsize=8)

    fig.colorbar(heatmap, ax=ax, fraction=0.046, pad=0.04)
    fig.tight_layout()
    _ensure_directory(path)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    return None


def run_simulation(
    bridge: SwarmHALOBridge,
    tasks_payload: Sequence[Dict],
    generations: int,
) -> Tuple[Dict, Dict]:
    agent_lookup = agents_by_name(bridge)
    tasks = [task_requirement(payload) for payload in tasks_payload]

    baseline_success = sample_baseline_success(bridge, tasks, repeats=10)

    generation_history: List[Dict] = []
    diversity_history: List[float] = []
    cooperation_history: List[float] = []
    overall_successes: List[int] = []
    overall_trials: int = 0
    team_counter: Counter[Tuple[str, ...]] = Counter()
    team_fitness_totals: Dict[Tuple[str, ...], List[float]] = defaultdict(list)
    team_success_totals: Dict[Tuple[str, ...], List[float]] = defaultdict(list)
    evaluated_teams: List[Tuple[List[Agent], TaskRequirement]] = []

    for gen in range(1, generations + 1):
        teams_this_gen: List[Dict] = []
        gen_diversities: List[float] = []
        gen_cooperation: List[float] = []
        gen_success = 0.0
        gen_trials = 0
        gen_fitness = []
        for task in tasks:
            agent_names, fitness_score, explanations = bridge.optimize_team(
                task_id=task.task_id,
                required_capabilities=task.required_capabilities,
                team_size_range=task.team_size_range,
                priority=task.priority,
                verbose=False,
            )
            team_agents = [agent_lookup[name] for name in agent_names]
            outcome = bridge.swarm.evaluate_team(team_agents, task, simulate=True)
            update_agent_fitness(team_agents, outcome)
            bridge.swarm.cooperation_history.append(outcome)
            evaluated_teams.append((team_agents.copy(), task))

            diversity = bridge.get_team_genotype_diversity(agent_names)
            cooperation = bridge.get_team_cooperation_score(agent_names)

            required_caps = set(task.required_capabilities)
            team_caps = {cap for agent in team_agents for cap in agent.capabilities}
            coverage_ratio = (len(required_caps & team_caps) / len(required_caps)) if required_caps else 1.0

            success_score = min(1.0, coverage_ratio + 0.05 * cooperation + 0.03 * diversity)

            gen_diversities.append(diversity)
            gen_cooperation.append(cooperation)
            gen_fitness.append(fitness_score)
            gen_success += success_score
            gen_trials += 1
            overall_successes.append(success_score)
            overall_trials += 1

            team_key = tuple(sorted(agent_names))
            team_counter[team_key] += 1
            team_fitness_totals[team_key].append(fitness_score)
            team_success_totals[team_key].append(success_score)

            teams_this_gen.append(
                {
                    "task_id": task.task_id,
                    "team": agent_names,
                    "fitness_score": round(fitness_score, 4),
                    "success_rate": round(success_score, 4),
                    "diversity": round(diversity, 4),
                    "kin_score": round(cooperation, 4),
                    "explanations": explanations,
                    "execution_time": outcome.execution_time,
                }
            )

        avg_fitness = statistics.mean(gen_fitness) if gen_fitness else 0.0
        avg_diversity = statistics.mean(gen_diversities) if gen_diversities else 0.0
        avg_cooperation = statistics.mean(gen_cooperation) if gen_cooperation else 0.0
        diversity_history.append(avg_diversity)
        cooperation_history.append(avg_cooperation)

        generation_history.append(
            {
                "generation": gen,
                "teams": teams_this_gen,
                "avg_fitness": avg_fitness,
                "success_rate": (gen_success / gen_trials) if gen_trials else 0.0,
                "avg_diversity": avg_diversity,
                "avg_cooperation": avg_cooperation,
            }
        )

    overall_success_rate = (
        sum(overall_successes) / overall_trials if overall_trials else 0.0
    )
    relative_gain = (overall_success_rate - baseline_success) * 100.0

    top_team_entries = []
    for team_key, count in team_counter.most_common(8):
        fitness_values = team_fitness_totals[team_key]
        success_values = team_success_totals[team_key]
        top_team_entries.append(
            {
                "team": list(team_key),
                "appearances": count,
                "avg_fitness": statistics.mean(fitness_values) if fitness_values else 0.0,
                "avg_success": statistics.mean(success_values) if success_values else 0.0,
            }
        )

    cooperation_matrix = compute_cooperation_matrix(evaluated_teams, bridge)
    emergent_notes = detect_emergent_strategies(generation_history, diversity_history)

    summary = {
        "report_version": REPORT_VERSION,
        "generated_at": Path(),
        "baseline_success_rate": baseline_success,
        "swarm_success_rate": overall_success_rate,
        "relative_gain_percent": relative_gain,
        "generations": generation_history,
        "top_teams": top_team_entries,
        "diversity_history": diversity_history,
        "cooperation_history": cooperation_history,
        "cooperation_matrix": cooperation_matrix,
        "emergent_strategies": emergent_notes,
    }

    active_teams = []
    if generation_history:
        for entry in generation_history[-1]["teams"]:
            active_teams.append(
                {
                    "task_id": entry["task_id"],
                    "team": entry["team"],
                    "fitness": entry["fitness_score"],
                    "success_probability": entry["success_rate"],
                    "diversity": entry["diversity"],
                    "cooperation": entry["kin_score"],
                }
            )

    dashboard_payload = {
        "generated_at": generation_history[-1]["generation"] if generation_history else 0,
        "summary": {
            "baseline_success_rate": baseline_success,
            "swarm_success_rate": overall_success_rate,
            "relative_gain_percent": relative_gain,
        },
        "generations": [
            {
                "generation": row["generation"],
                "avg_fitness": row["avg_fitness"],
                "success_rate": row["success_rate"],
                "avg_diversity": row["avg_diversity"],
                "avg_cooperation": row["avg_cooperation"],
            }
            for row in generation_history
        ],
        "top_teams": top_team_entries,
        "cooperation_matrix": cooperation_matrix,
        "active_teams": active_teams,
        "emergent_strategies": emergent_notes,
    }

    return summary, dashboard_payload


def write_json(path: Path, payload: Dict) -> None:
    _ensure_directory(path)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def format_percentage(value: float) -> str:
    return f"{value * 100:.1f}%" if value <= 1 else f"{value:.1f}%"


def print_summary(summary: Dict) -> None:
    baseline = summary["baseline_success_rate"]
    swarm = summary["swarm_success_rate"]
    gain = summary["relative_gain_percent"]
    print("\n=== Swarm Performance Summary ===")
    print(f"Baseline success rate (random teams): {format_percentage(baseline)}")
    print(f"Swarm success rate (optimised teams): {format_percentage(swarm)}")
    print(f"Improvement vs baseline: {gain:.1f} percentage points")

    if summary["generations"]:
        print("\nGeneration overview:")
        for row in summary["generations"]:
            print(
                f"  Gen {row['generation']:>2}: "
                f"fitness={row['avg_fitness']:.3f}, "
                f"success={format_percentage(row['success_rate'])}, "
                f"diversity={row['avg_diversity']:.2f}, "
                f"cooperation={row['avg_cooperation']:.2f}"
            )

    if summary["emergent_strategies"]:
        print("\nEmergent strategies detected:")
        for note in summary["emergent_strategies"]:
            print(f"  • {note}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyse swarm performance trends.")
    parser.add_argument(
        "--generations",
        type=int,
        default=6,
        help="Number of simulated generations (default: 6)",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help=f"Path for the full analytics JSON report (default: {DEFAULT_OUTPUT_PATH})",
    )
    parser.add_argument(
        "--dashboard-json",
        type=Path,
        default=Path("public_demo/dashboard/public/swarm_metrics.json"),
        help="Path for the lightweight dashboard payload (default: public swarm_metrics.json)",
    )
    parser.add_argument(
        "--heatmap",
        type=Path,
        default=DEFAULT_HEATMAP_PATH,
        help="Optional PNG path for the kin cooperation heatmap.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        check_analysis_rate_limit()
        profiles = load_profiles()
        bridge = create_swarm_halo_bridge(
            agent_profiles=profiles,
            random_seed=args.seed,
        )
        summary, dashboard_payload = run_simulation(bridge, build_tasks(), args.generations)

        # Fill timestamp after simulation (using ISO string).
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat()
        summary["generated_at"] = now
        dashboard_payload["generated_at"] = now

        print_summary(summary)

        write_json(args.output_json, summary)
        write_json(args.dashboard_json, dashboard_payload)

        if args.heatmap:
            note = attempt_heatmap(summary["cooperation_matrix"], args.heatmap)
            if note:
                print(f"[heatmap] {note}")
            else:
                print(f"Kin cooperation heatmap written to {args.heatmap}")

        print(f"\nFull analytics report saved to {args.output_json}")
        print(f"Dashboard payload saved to {args.dashboard_json}")
    finally:
        if ANALYSIS_LOCKFILE.exists():
            try:
                ANALYSIS_LOCKFILE.unlink()
            except OSError:
                pass


if __name__ == "__main__":
    main()
