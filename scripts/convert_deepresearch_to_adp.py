#!/usr/bin/env python3
"""DeepResearch → ADP conversion pipeline for Genesis agents.

This script converts the raw DeepResearch/Claude generated examples into the
Agent Data Protocol (ADP) format used across the Genesis training pipeline. It
supports streaming conversion, optional Anthropic-powered reasoning extraction
(with graceful fallback), metadata enrichment, resume capability, and progress
reporting.

Usage examples
--------------

Convert a single file with validation::

    python scripts/convert_deepresearch_to_adp.py         data/generated_examples/qa_agent_examples.jsonl         data/adp_format/qa_agent_adp.jsonl --validate --verbose

Convert an entire directory (one output per agent) with resume support::

    python scripts/convert_deepresearch_to_adp.py         data/generated_examples         data/adp_format --resume --progress

Dry-run on the first 10 examples (no output written)::

    python scripts/convert_deepresearch_to_adp.py         data/generated_examples/qa_agent_examples.jsonl         data/adp_format/qa_agent_adp.jsonl --limit 10 --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import md5
from pathlib import Path
from typing import Dict, Iterator, List, Optional, Sequence, Tuple

try:
    from anthropic import Anthropic  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    Anthropic = None  # type: ignore

try:
    from tqdm import tqdm  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    tqdm = None  # type: ignore

LOG = logging.getLogger("convert_deepresearch_to_adp")

# ---------------------------------------------------------------------------
# Constants & configuration helpers
# ---------------------------------------------------------------------------

STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "about",
    "should",
    "which",
    "their",
    "there",
    "users",
    "require",
    "requirements",
    "tests",
    "testing",
    "ensure",
    "validate",
    "validation",
    "error",
    "errors",
    "handle",
    "handling",
    "include",
    "includes",
    "must",
    "needs",
    "using",
    "step",
    "steps",
    "scenarios",
    "scenario",
    "case",
    "cases",
    "report",
    "reports",
    "system",
    "application",
    "process",
    "provide",
}

TASK_TYPE_MAP = {
    "core_functionality": "functional_validation",
    "edge_cases": "edge_case_analysis",
    "error_handling": "fault_tolerance",
    "integration": "integration_validation",
    "performance": "performance_assurance",
}

DIFFICULTY_RANGES = {
    "easy": (3.0, 5.0),
    "medium": (5.0, 8.0),
    "hard": (8.0, 10.0),
}

ESTIMATED_TIME_BASE = {"easy": 20, "medium": 40, "hard": 65}

# Full 15×15 compatibility matrix (Genesis Week 1 alignment)
# fmt: off
AGENT_COMPATIBILITY_MATRIX: Dict[str, Dict[str, float]] = {
    "qa_agent": {
        "qa_agent": 1.0, "support_agent": 0.6, "legal_agent": 0.2, "analyst_agent": 0.4,
        "content_agent": 0.3, "builder_agent": 0.8, "deploy_agent": 0.5, "marketing_agent": 0.2,
        "sales_agent": 0.2, "finance_agent": 0.3, "research_agent": 0.4, "vision_agent": 0.5,
        "se_darwin_agent": 0.9, "memory_agent": 0.4, "security_agent": 0.7,
    },
    "support_agent": {
        "qa_agent": 0.6, "support_agent": 1.0, "legal_agent": 0.7, "analyst_agent": 0.5,
        "content_agent": 0.4, "builder_agent": 0.5, "deploy_agent": 0.7, "marketing_agent": 0.3,
        "sales_agent": 0.4, "finance_agent": 0.5, "research_agent": 0.4, "vision_agent": 0.3,
        "se_darwin_agent": 0.4, "memory_agent": 0.4, "security_agent": 0.6,
    },
    "legal_agent": {
        "qa_agent": 0.3, "support_agent": 0.7, "legal_agent": 1.0, "analyst_agent": 0.8,
        "content_agent": 0.6, "builder_agent": 0.2, "deploy_agent": 0.4, "marketing_agent": 0.5,
        "sales_agent": 0.6, "finance_agent": 0.8, "research_agent": 0.7, "vision_agent": 0.3,
        "se_darwin_agent": 0.3, "memory_agent": 0.4, "security_agent": 0.7,
    },
    "analyst_agent": {
        "qa_agent": 0.4, "support_agent": 0.6, "legal_agent": 0.7, "analyst_agent": 1.0,
        "content_agent": 0.6, "builder_agent": 0.4, "deploy_agent": 0.5, "marketing_agent": 0.8,
        "sales_agent": 0.8, "finance_agent": 0.9, "research_agent": 0.8, "vision_agent": 0.5,
        "se_darwin_agent": 0.4, "memory_agent": 0.5, "security_agent": 0.5,
    },
    "content_agent": {
        "qa_agent": 0.3, "support_agent": 0.5, "legal_agent": 0.5, "analyst_agent": 0.6,
        "content_agent": 1.0, "builder_agent": 0.3, "deploy_agent": 0.3, "marketing_agent": 0.9,
        "sales_agent": 0.8, "finance_agent": 0.5, "research_agent": 0.8, "vision_agent": 0.6,
        "se_darwin_agent": 0.3, "memory_agent": 0.4, "security_agent": 0.4,
    },
    "builder_agent": {
        "qa_agent": 0.8, "support_agent": 0.5, "legal_agent": 0.2, "analyst_agent": 0.4,
        "content_agent": 0.3, "builder_agent": 1.0, "deploy_agent": 0.8, "marketing_agent": 0.2,
        "sales_agent": 0.2, "finance_agent": 0.3, "research_agent": 0.4, "vision_agent": 0.4,
        "se_darwin_agent": 0.9, "memory_agent": 0.5, "security_agent": 0.7,
    },
    "deploy_agent": {
        "qa_agent": 0.6, "support_agent": 0.7, "legal_agent": 0.3, "analyst_agent": 0.5,
        "content_agent": 0.3, "builder_agent": 0.8, "deploy_agent": 1.0, "marketing_agent": 0.2,
        "sales_agent": 0.2, "finance_agent": 0.4, "research_agent": 0.3, "vision_agent": 0.3,
        "se_darwin_agent": 0.5, "memory_agent": 0.5, "security_agent": 0.8,
    },
    "marketing_agent": {
        "qa_agent": 0.2, "support_agent": 0.4, "legal_agent": 0.4, "analyst_agent": 0.8,
        "content_agent": 0.9, "builder_agent": 0.2, "deploy_agent": 0.2, "marketing_agent": 1.0,
        "sales_agent": 0.9, "finance_agent": 0.6, "research_agent": 0.7, "vision_agent": 0.8,
        "se_darwin_agent": 0.2, "memory_agent": 0.3, "security_agent": 0.3,
    },
    "sales_agent": {
        "qa_agent": 0.2, "support_agent": 0.5, "legal_agent": 0.5, "analyst_agent": 0.8,
        "content_agent": 0.8, "builder_agent": 0.2, "deploy_agent": 0.2, "marketing_agent": 0.9,
        "sales_agent": 1.0, "finance_agent": 0.7, "research_agent": 0.6, "vision_agent": 0.4,
        "se_darwin_agent": 0.2, "memory_agent": 0.4, "security_agent": 0.3,
    },
    "finance_agent": {
        "qa_agent": 0.3, "support_agent": 0.5, "legal_agent": 0.8, "analyst_agent": 0.9,
        "content_agent": 0.4, "builder_agent": 0.3, "deploy_agent": 0.4, "marketing_agent": 0.5,
        "sales_agent": 0.7, "finance_agent": 1.0, "research_agent": 0.5, "vision_agent": 0.3,
        "se_darwin_agent": 0.3, "memory_agent": 0.4, "security_agent": 0.5,
    },
    "research_agent": {
        "qa_agent": 0.4, "support_agent": 0.4, "legal_agent": 0.7, "analyst_agent": 0.8,
        "content_agent": 0.8, "builder_agent": 0.3, "deploy_agent": 0.3, "marketing_agent": 0.6,
        "sales_agent": 0.5, "finance_agent": 0.5, "research_agent": 1.0, "vision_agent": 0.5,
        "se_darwin_agent": 0.4, "memory_agent": 0.6, "security_agent": 0.5,
    },
    "vision_agent": {
        "qa_agent": 0.6, "support_agent": 0.4, "legal_agent": 0.3, "analyst_agent": 0.5,
        "content_agent": 0.7, "builder_agent": 0.4, "deploy_agent": 0.3, "marketing_agent": 0.8,
        "sales_agent": 0.4, "finance_agent": 0.3, "research_agent": 0.5, "vision_agent": 1.0,
        "se_darwin_agent": 0.3, "memory_agent": 0.4, "security_agent": 0.5,
    },
    "se_darwin_agent": {
        "qa_agent": 0.9, "support_agent": 0.4, "legal_agent": 0.3, "analyst_agent": 0.5,
        "content_agent": 0.3, "builder_agent": 0.9, "deploy_agent": 0.6, "marketing_agent": 0.2,
        "sales_agent": 0.2, "finance_agent": 0.3, "research_agent": 0.5, "vision_agent": 0.4,
        "se_darwin_agent": 1.0, "memory_agent": 0.6, "security_agent": 0.7,
    },
    "memory_agent": {
        "qa_agent": 0.5, "support_agent": 0.5, "legal_agent": 0.4, "analyst_agent": 0.6,
        "content_agent": 0.5, "builder_agent": 0.5, "deploy_agent": 0.6, "marketing_agent": 0.4,
        "sales_agent": 0.4, "finance_agent": 0.5, "research_agent": 0.7, "vision_agent": 0.5,
        "se_darwin_agent": 0.7, "memory_agent": 1.0, "security_agent": 0.6,
    },
    "security_agent": {
        "qa_agent": 0.7, "support_agent": 0.6, "legal_agent": 0.7, "analyst_agent": 0.5,
        "content_agent": 0.4, "builder_agent": 0.7, "deploy_agent": 0.8, "marketing_agent": 0.3,
        "sales_agent": 0.3, "finance_agent": 0.5, "research_agent": 0.5, "vision_agent": 0.5,
        "se_darwin_agent": 0.6, "memory_agent": 0.6, "security_agent": 1.0,
    },
}
# fmt: on

DEFAULT_COMPATIBILITIES = {
    agent: {other: (1.0 if agent == other else 0.5) for other in AGENT_COMPATIBILITY_MATRIX}
    for agent in AGENT_COMPATIBILITY_MATRIX
}

LINE_SPLIT_PATTERN = re.compile(r"^[\s\-•*\d\.)]+(.*)")
WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z\-]{2,}")

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ExtractionResult:
    reasoning_steps: List[str]
    actions: List[str]
    reasoning_text: str


@dataclass
class ConversionStats:
    total: int = 0
    converted: int = 0
    skipped: int = 0
    failed: int = 0


@dataclass
class ConversionConfig:
    use_llm: bool = False
    anthropic_model: str = "claude-3-5-haiku-20241022"
    resume: bool = False
    batch_size: int = 100
    progress: bool = False
    max_examples: Optional[int] = None
    dry_run: bool = False
    limit: Optional[int] = None


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------


def iter_jsonl(path: Path) -> Iterator[Tuple[int, dict]]:
    with path.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            if not line.strip():
                continue
            try:
                yield index, json.loads(line)
            except json.JSONDecodeError as exc:
                LOG.warning("Skipping malformed JSON in %s line %s: %s", path, index + 1, exc)


def count_jsonl(path: Path) -> int:
    with path.open("r", encoding="utf-8") as handle:
        return sum(1 for line in handle if line.strip())


def generate_adp_id(agent: str, category: str, index: int) -> str:
    sanitized_agent = agent.replace(" ", "_").lower()
    sanitized_category = category.replace(" ", "_").lower()
    return f"{sanitized_agent}-{sanitized_category}-{index:05d}"


def ensure_compatibility(agent: str) -> Dict[str, float]:
    if agent in AGENT_COMPATIBILITY_MATRIX:
        return AGENT_COMPATIBILITY_MATRIX[agent]
    if agent in DEFAULT_COMPATIBILITIES:
        return DEFAULT_COMPATIBILITIES[agent]
    compat = {name: 0.5 for name in AGENT_COMPATIBILITY_MATRIX}
    compat[agent] = 1.0
    return compat


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


# ---------------------------------------------------------------------------
# Reasoning & action extraction
# ---------------------------------------------------------------------------


class ReasoningExtractor:
    def __init__(self, config: ConversionConfig):
        self.config = config
        self.client = None
        if config.use_llm and Anthropic is not None:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                try:
                    self.client = Anthropic(api_key=api_key)
                    LOG.info("Anthropic client initialised for reasoning extraction")
                except Exception as exc:  # pragma: no cover
                    LOG.warning("Failed to initialise Anthropic client: %s", exc)
            else:
                LOG.warning("Anthropic API key not found; using heuristic extraction")
        elif config.use_llm:
            LOG.warning("Anthropic package not installed; using heuristic extraction")

    def extract(self, task: str, context: str, expected_output: str) -> ExtractionResult:
        if self.client is not None:
            try:
                return self._extract_via_llm(task, context, expected_output)
            except Exception as exc:  # pragma: no cover
                LOG.warning("Anthropic extraction failed (%s); falling back to heuristics", exc)
        return self._extract_heuristically(task, context, expected_output)

    def _extract_via_llm(self, task: str, context: str, expected_output: str) -> ExtractionResult:
        prompt = (
            "You will be given an agent task, optional context, and the expected output. "
            "Summarise the agent's reasoning into numbered steps and list concise action "
            "phrases (imperative verbs). Return JSON with reasoning_steps (array of strings) "
            "and actions (array of strings)."
        )
        message = (
            f"Task: {task}\n\n"
            f"Context: {context or 'N/A'}\n\n"
            f"Expected Output:\n{expected_output}"
        )
        response = self.client.messages.create(  # type: ignore[union-attr]
            model=self.config.anthropic_model,
            max_tokens=400,
            temperature=0.2,
            system=prompt,
            messages=[{"role": "user", "content": message}],
        )
        text = "".join(block.text for block in response.content if hasattr(block, "text"))
        try:
            data = json.loads(text)
            reasoning_steps = [step.strip() for step in data.get("reasoning_steps", []) if step.strip()]
            actions = [action.strip() for action in data.get("actions", []) if action.strip()]
        except json.JSONDecodeError:
            LOG.warning("Anthropic response was not valid JSON; using heuristic extraction")
            return self._extract_heuristically(task, context, expected_output)

        if len(reasoning_steps) < 3:
            reasoning_steps = self._expand_steps(reasoning_steps, expected_output)
        if not actions:
            actions = self._derive_actions(reasoning_steps)
        reasoning_text = "\n".join(f"{idx+1}. {step}" for idx, step in enumerate(reasoning_steps))
        return ExtractionResult(reasoning_steps, actions, reasoning_text)

    def _extract_heuristically(self, task: str, context: str, expected_output: str) -> ExtractionResult:
        lines = [line.strip() for line in expected_output.splitlines() if line.strip()]
        steps: List[str] = []
        for line in lines:
            match = LINE_SPLIT_PATTERN.match(line)
            cleaned = match.group(1) if match else line
            cleaned = cleaned.strip()
            if cleaned:
                steps.append(cleaned)

        if len(steps) < 3:
            sentences = re.split(r"(?<=[.!?])\s+", expected_output)
            steps = [sentence.strip() for sentence in sentences if len(sentence.strip().split()) >= 3]

        if len(steps) < 3:
            fallback_text = f"{task} {context}".strip()
            sentences = re.split(r"(?<=[.!?])\s+", fallback_text)
            steps.extend(sentence.strip() for sentence in sentences if len(sentence.strip()) >= 12)

        if len(steps) < 3:
            steps = [expected_output.strip()] * 3

        steps = self._normalise_steps(steps)
        actions = self._derive_actions(steps)
        reasoning_text = "\n".join(f"{idx+1}. {step}" for idx, step in enumerate(steps))
        return ExtractionResult(steps, actions, reasoning_text)

    @staticmethod
    def _normalise_steps(steps: Sequence[str]) -> List[str]:
        normalised: List[str] = []
        seen = set()
        for step in steps:
            cleaned = re.sub(r"\s+", " ", step.strip())
            cleaned = re.sub(r"\s*\d+\.\s*$", "", cleaned)
            cleaned = re.sub(r":\s*$", "", cleaned)
            key = cleaned.lower()
            if cleaned and key not in seen:
                normalised.append(cleaned)
                seen.add(key)
        while len(normalised) < 3:
            normalised.append(normalised[-1])
        return normalised[:8]

    @staticmethod
    def _derive_actions(steps: Sequence[str]) -> List[str]:
        actions: List[str] = []
        seen = set()
        for step in steps:
            tokens = step.split()
            if not tokens:
                continue
            phrase = " ".join(tokens[:6]).rstrip(".,:")
            key = phrase.lower()
            if phrase and key not in seen:
                actions.append(phrase)
                seen.add(key)
        if not actions:
            actions = ["Review task requirements"]
        return actions[:6]

    def _expand_steps(self, steps: Sequence[str], expected_output: str) -> List[str]:
        if len(steps) >= 3:
            return list(steps)
        supplement = [s.strip() for s in expected_output.split('.') if len(s.strip().split()) >= 4]
        combined = list(steps) + supplement
        return self._normalise_steps(combined)


# ---------------------------------------------------------------------------
# Core conversion logic
# ---------------------------------------------------------------------------


class DeepResearchConverter:
    def __init__(self, config: ConversionConfig):
        self.config = config
        self.extractor = ReasoningExtractor(config)

    def convert_example(self, raw: dict, index: int) -> dict:
        agent = raw.get("agent_name", "unknown_agent")
        category = raw.get("task_category") or raw.get("category") or "general"
        difficulty = raw.get("difficulty", "medium").lower()
        if difficulty not in DIFFICULTY_RANGES:
            difficulty = "medium"

        task = raw.get("task", "")
        context = raw.get("context", "")
        expected_output = raw.get("expected_output", "")

        extraction = self.extractor.extract(task, context, expected_output)
        complexity = self._compute_complexity(difficulty, context, extraction.reasoning_steps)
        estimated_time = self._estimate_time(difficulty, context, extraction.reasoning_steps)
        tags = self._build_tags(category, task, context, expected_output)
        task_type = TASK_TYPE_MAP.get(category, "general_task")
        compatibility = ensure_compatibility(agent)

        observation_text = task if not context else f"{task}\n\n{context}"
        observation = {
            "type": "observation",
            "observation_type": "text",
            "data": {
                "content": observation_text,
                "source": "user",
            },
        }

        action = {
            "type": "action",
            "action_type": self._infer_action_type(expected_output),
            "data": {
                "content": expected_output,
                "reasoning": extraction.reasoning_text,
                "reasoning_steps": extraction.reasoning_steps,
                "actions": extraction.actions,
                "result_summary": extraction.reasoning_steps[-1],
            },
        }

        adp_id = generate_adp_id(agent, category, index)
        details = {
            "dataset": "genesis_generated",
            "source_hash": md5(f"{agent}:{task}:{context}".encode("utf-8")).hexdigest(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tags": tags,
            "difficulty": difficulty,
        }

        extensions = {
            "agent_name": agent,
            "task_category": category,
            "task_type": task_type,
            "difficulty": difficulty,
            "complexity_score": complexity,
            "estimated_time_minutes": estimated_time,
            "agent_compatibility": compatibility,
            "version": "1.0",
        }

        return {
            "id": adp_id,
            "content": [observation, action],
            "details": details,
            "genesis_extensions": extensions,
        }

    @staticmethod
    def _infer_action_type(content: str) -> str:
        lowered = content.lower()
        if any(keyword in lowered for keyword in ("def ", "class ", "import ", "function ", "const ")):
            return "code"
        if any(keyword in lowered for keyword in ("api", "call", "invoke", "request")):
            return "api"
        return "message"

    @staticmethod
    def _compute_complexity(difficulty: str, context: str, reasoning_steps: Sequence[str]) -> float:
        context_tokens = len(context.split())
        step_factor = len(reasoning_steps)
        base_min, base_max = DIFFICULTY_RANGES[difficulty]
        base = (base_min + base_max) / 2
        context_adjust = min(context_tokens / 200, 1.5)
        step_adjust = min(step_factor / 4, 1.2)
        score = base + (context_adjust * 0.6) + (step_adjust * 0.8)
        return round(clamp(score, base_min, base_max), 2)

    @staticmethod
    def _estimate_time(difficulty: str, context: str, reasoning_steps: Sequence[str]) -> int:
        base = ESTIMATED_TIME_BASE[difficulty]
        context_tokens = len(context.split())
        adjustments = context_tokens // 120 + len(reasoning_steps)
        estimated = base + adjustments * 3
        if difficulty == "easy":
            return int(round(clamp(estimated, 10, 45)))
        if difficulty == "medium":
            return int(round(clamp(estimated, 25, 75)))
        return int(round(clamp(estimated, 45, 120)))

    @staticmethod
    def _build_tags(category: str, task: str, context: str, expected_output: str) -> List[str]:
        tags: List[str] = []
        primary = category.replace("_", "-")
        if primary:
            tags.append(primary)
        corpus = " ".join([task, context, expected_output])
        words = [word.lower() for word in WORD_PATTERN.findall(corpus)]
        keywords = [word for word in words if word not in STOPWORDS]
        counts = Counter(keywords)
        for word, _ in counts.most_common(10):
            if word not in tags:
                tags.append(word)
            if len(tags) >= 5:
                break
        while len(tags) < 2:
            tags.append("general")
        return tags[:5]


# ---------------------------------------------------------------------------
# High-level execution helpers
# ---------------------------------------------------------------------------


def write_adp_example(handle, example: dict) -> None:
    handle.write(json.dumps(example, ensure_ascii=False) + "\n")


def load_existing_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    existing_ids: set[str] = set()
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue
            adp_id = data.get("id")
            if adp_id:
                existing_ids.add(adp_id)
    return existing_ids


def process_file(
    converter: DeepResearchConverter,
    input_file: Path,
    output_file: Path,
    config: ConversionConfig,
) -> ConversionStats:
    stats = ConversionStats()
    total_examples = count_jsonl(input_file)
    existing_ids = load_existing_ids(output_file) if config.resume else set()
    stats.skipped = len(existing_ids)

    progress_iter = None
    if config.progress and tqdm is not None and not config.dry_run:
        progress_iter = tqdm(total=total_examples, desc=input_file.name)
    elif config.progress and not config.dry_run:
        LOG.info("Processing %s (%s examples)", input_file.name, total_examples)

    if not config.dry_run:
        output_file.parent.mkdir(parents=True, exist_ok=True)
    write_mode = "a" if config.resume and output_file.exists() and not config.dry_run else "w"
    handle = None if config.dry_run else output_file.open(write_mode, encoding="utf-8")

    try:
        for raw_index, raw_example in iter_jsonl(input_file):
            stats.total += 1
            adp_id = generate_adp_id(
                raw_example.get("agent_name", "unknown_agent"),
                raw_example.get("task_category") or raw_example.get("category") or "general",
                raw_index,
            )
            if adp_id in existing_ids:
                if progress_iter:
                    progress_iter.update(1)
                continue
            if config.max_examples and stats.converted >= config.max_examples:
                break
            if config.limit and stats.converted >= config.limit:
                break
            try:
                adp_example = converter.convert_example(raw_example, raw_index)
                if not config.dry_run and handle is not None:
                    write_adp_example(handle, adp_example)
                stats.converted += 1
            except Exception as exc:  # pragma: no cover
                stats.failed += 1
                LOG.error("Failed to convert %s (index %s): %s", input_file, raw_index, exc)
            if progress_iter:
                progress_iter.update(1)
    finally:
        if handle:
            handle.close()
        if progress_iter:
            progress_iter.close()
    return stats


# ---------------------------------------------------------------------------
# CLI handling
# ---------------------------------------------------------------------------


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert DeepResearch examples to ADP format")
    parser.add_argument(
        "input_path",
        type=Path,
        help="Input JSONL file or directory containing *_agent_examples.jsonl",
    )
    parser.add_argument(
        "output_path",
        type=Path,
        help="Output JSONL file or directory",
    )
    parser.add_argument("--use-llm", action="store_true", help="Use Anthropic for reasoning extraction")
    parser.add_argument("--resume", action="store_true", help="Resume from existing ADP files")
    parser.add_argument("--batch-size", type=int, default=100, help="Reserved for future batching options")
    parser.add_argument("--max-examples", type=int, help="Maximum examples to convert")
    parser.add_argument("--limit", type=int, help="Limit converted examples (testing)")
    parser.add_argument("--progress", action="store_true", help="Show progress bar")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument("--dry-run", action="store_true", help="Parse without writing output")
    parser.add_argument("--validate", action="store_true", help="Run basic validation after conversion")
    return parser.parse_args(argv)


def configure_logging(verbose: bool) -> None:
    level = logging.INFO if verbose else logging.WARNING
    logging.basicConfig(level=level, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")


def discover_input_files(input_path: Path) -> List[Path]:
    if input_path.is_file():
        return [input_path]
    if input_path.is_dir():
        return sorted(input_path.glob("*_agent_examples.jsonl"))
    raise FileNotFoundError(f"Input path {input_path} does not exist")


def resolve_output_path(input_file: Path, base_output: Path, output_is_dir: bool) -> Path:
    if not output_is_dir:
        return base_output
    return base_output / input_file.name.replace("_examples", "_adp")


def validate_output_file(path: Path) -> Tuple[int, int]:
    total = 0
    failures = 0
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            total += 1
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                failures += 1
                continue
            content = data.get("content", [])
            if len(content) < 2:
                failures += 1
                continue
            types = [item.get("type") for item in content]
            if any(types[i] == types[i + 1] for i in range(len(types) - 1)):
                failures += 1
                continue
            action = next((item for item in content if item.get("type") == "action"), None)
            if not action:
                failures += 1
                continue
            data_section = action.get("data", {})
            if len(data_section.get("reasoning_steps", [])) < 3:
                failures += 1
    return total, failures


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    configure_logging(args.verbose)

    config = ConversionConfig(
        use_llm=args.use_llm,
        resume=args.resume,
        batch_size=args.batch_size,
        progress=args.progress,
        max_examples=args.max_examples,
        dry_run=args.dry_run,
        limit=args.limit,
    )

    converter = DeepResearchConverter(config)
    input_files = discover_input_files(args.input_path)
    output_is_dir = args.output_path.is_dir() or args.input_path.is_dir()

    overall = ConversionStats()
    for input_file in input_files:
        output_file = resolve_output_path(input_file, args.output_path, output_is_dir)
        LOG.info("Processing %s → %s", input_file, output_file)
        stats = process_file(converter, input_file, output_file, config)
        overall.total += stats.total
        overall.converted += stats.converted
        overall.skipped += stats.skipped
        overall.failed += stats.failed

    print("=" * 72)
    print("ADP CONVERSION SUMMARY")
    print("=" * 72)
    print(f"Input files:           {len(input_files)}")
    print(f"Total examples seen:   {overall.total}")
    print(f"Converted examples:    {overall.converted}")
    print(f"Skipped (resume):      {overall.skipped}")
    print(f"Failures:              {overall.failed}")
    if overall.total:
        success_rate = overall.converted / overall.total * 100
        print(f"Success rate:          {success_rate:.2f}%")
    print(f"Output location:       {args.output_path}")
    print("=" * 72)

    if args.validate and not args.dry_run:
        if args.output_path.is_file():
            files_to_validate = [args.output_path]
        else:
            files_to_validate = sorted(args.output_path.glob("*_adp.jsonl"))
        for file_path in files_to_validate:
            total, failures = validate_output_file(file_path)
            print(f"Validation – {file_path.name}: {total - failures}/{total} valid")

    return 0 if overall.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
