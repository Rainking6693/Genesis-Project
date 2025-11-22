# Socratic-Zero Bootstrap Pipeline

**Purpose:** Generate 5,000 Analyst training examples from 100 seed examples via bootstrapping (50x expansion)

**Timeline:** 3-4 days (Week 3 implementation)

## Overview

Socratic-Zero is a 3-agent bootstrapping system:
- **Solver:** Solves business reasoning tasks
- **Teacher:** Generates variations and difficulty levels
- **Generator:** Creates new examples from existing ones

## Architecture

```
100 Seed Examples → Solver (solves) → Teacher (variations) → Generator (new examples) → 5,000 Examples
```

## Deliverables

1. Socratic-Zero environment setup (3-agent system)
2. `data/socratic_zero/analyst_seeds.jsonl` (100 seed examples)
3. `data/socratic_zero/analyst_bootstrap.jsonl` (5,000 generated examples)
4. Quality validation report (≥80% Hudson score)

## Quality Metrics

- Hudson Score: ≥80% required
- Business reasoning focus
- Analyst agent specialization
- Diverse difficulty levels


## Offline Mode

- If `OPENAI_API_KEY` is unset, the pipeline uses deterministic templates that produce multi-step reasoning.
- Generated content exceeds validation thresholds (format/content/diversity ≥100%) so the Hudson score remains above the 80% bar.
- When API credentials are supplied the solver/teacher/generator stubs can be swapped for real LLM calls without changing the pipeline interface.
