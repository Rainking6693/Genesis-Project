#!/usr/bin/env python3
"""Shared helpers for inspecting Genesis training datasets."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterator, List, Optional, Sequence, Tuple

SIMHASH_BITS = 64


@dataclass
class TrainingExample:
    """Light-weight representation of a training example."""

    example_id: str
    target_agent: str
    source_agent: str
    weight: float
    cross_agent_weight: Optional[float]
    difficulty: Optional[str]
    category: Optional[str]
    normalized_text: str
    assistant_text: str
    token_count: int
    message_fingerprint: str
    simhash: int
    has_trailing_punctuation: bool
    pii_hits: Dict[str, int] = field(default_factory=dict)
    metadata: Dict[str, object] = field(default_factory=dict)


def iter_jsonl(path: Path) -> Iterator[Tuple[int, dict]]:
    """Yield (line_number, parsed_json) pairs for a JSONL file."""

    with path.open("r", encoding="utf-8") as handle:
        for idx, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError as exc:  # pragma: no cover
                raise ValueError(f"Malformed JSON in {path}:{idx}: {exc}") from exc
            yield idx, payload


def normalize_text(messages: Sequence[dict]) -> str:
    """Return canonical text representation for duplicate detection."""

    fragments: List[str] = []
    for msg in messages:
        role = (msg.get("role") or "").strip()
        content = (msg.get("content") or "").strip()
        fragments.append(f"{role}:{content}")
    return "\n".join(fragments)


def assistant_text(messages: Sequence[dict]) -> str:
    """Return the last assistant message content if available."""

    for message in reversed(messages):
        if message.get("role") == "assistant":
            return message.get("content", "") or ""
    return ""


def estimate_token_count(text: str) -> int:
    """Approximate token count via whitespace split."""

    if not text:
        return 0
    return len(text.replace("\n", " ").split())


def compute_simhash(text: str, bits: int = SIMHASH_BITS) -> int:
    """Compute a simple SimHash fingerprint for similarity checks."""

    if not text:
        return 0

    vector = [0] * bits
    for token in text.lower().split():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        value = int.from_bytes(digest[:8], "big")
        for idx in range(bits):
            vector[idx] += 1 if ((value >> idx) & 1) else -1

    fingerprint = 0
    for idx, score in enumerate(vector):
        if score >= 0:
            fingerprint |= 1 << idx
    return fingerprint


def hamming_distance(a: int, b: int) -> int:
    """Return Hamming distance between two 64-bit simhash values."""

    return (a ^ b).bit_count()


def scan_pii(text: str) -> Dict[str, int]:
    """Detect simple PII patterns inside text."""

    patterns = {
        "email": r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
        "phone": r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    }
    hits = {}
    for name, pattern in patterns.items():
        matches = re.findall(pattern, text)
        if matches:
            hits[name] = len(matches)
    return hits


def load_training_examples(input_dir: Path) -> List[TrainingExample]:
    """Load all JSONL files from the directory into TrainingExample objects."""

    records: List[TrainingExample] = []

    for jsonl_path in sorted(input_dir.glob("*.jsonl")):
        target_agent = jsonl_path.stem.replace("_training", "")
        for line_number, payload in iter_jsonl(jsonl_path):
            messages = payload.get("messages")
            if not isinstance(messages, list):
                raise ValueError(f"{jsonl_path}:{line_number} missing messages array")

            text = normalize_text(messages)
            assistant = assistant_text(messages)
            record = TrainingExample(
                example_id=f"{jsonl_path.name}:{line_number}",
                target_agent=payload.get("target_agent", target_agent),
                source_agent=payload.get("source_agent")
                or (payload.get("metadata") or {}).get("agent")
                or "unknown",
                weight=float(payload.get("weight", 0.0)),
                cross_agent_weight=payload.get("cross_agent_weight"),
                difficulty=((payload.get("metadata") or {}).get("difficulty") or "").lower() or None,
                category=((payload.get("metadata") or {}).get("category") or "").lower() or None,
                normalized_text=text,
                assistant_text=assistant,
                token_count=estimate_token_count(text),
                message_fingerprint=hashlib.md5(text.encode("utf-8")).hexdigest(),
                simhash=compute_simhash(text),
                has_trailing_punctuation=assistant.strip().endswith(
                    (".", "!", "?", '"', "'")
                ),
                pii_hits=scan_pii(text),
                metadata=payload.get("metadata") or {},
            )
            records.append(record)

    if not records:
        raise ValueError(f"No JSONL files found under {input_dir}")

    return records
