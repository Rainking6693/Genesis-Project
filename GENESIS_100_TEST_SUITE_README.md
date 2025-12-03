# Genesis 100-Test Suite - Quick Start Guide

## Overview

The Genesis TestForge Alpha executes 100 comprehensive end-to-end business creation tests using the FULL Genesis system with all 79 integrations.

**Tests 1-50:** Genesis + 11 Core Agents  
**Tests 51-100:** Genesis + Full 26-Agent Swarm

## Prerequisites

1. **Ollama installed** with Qwen and Mistral models:
   ```bash
   ollama pull qwen2.5:14b-instruct-q4_K_M
   ollama pull mistral-nemo:12b-instruct-2407-q4_K_M
   ```

2. **A2A Service running** on port 8000:
   ```bash
   python a2a_fastapi.py
   ```

3. **Environment variables** (optional but recommended):
   ```bash
   export OPENAI_API_KEY=sk-...
   export GEMINI_API_KEY=AIza...
   export A2A_API_KEY=your_a2a_key
   ```

## Execution

### Basic Usage

```bash
python genesis_100_test_suite.py
```

### With Options

```bash
python genesis_100_test_suite.py \
  --openai-key sk-... \
  --gemini-key AIza... \
  --a2a-api-key your_key \
  --parallel 8 \
  --min-score 80.0 \
  --ollama-url http://localhost:11434
```

### Command Line Arguments

- `--openai-key`: OpenAI API key (optional)
- `--gemini-key`: Gemini API key (optional)
- `--a2a-api-key`: A2A service API key (optional, defaults to env var)
- `--parallel`: Number of parallel tests (default: 8)
- `--min-score`: Minimum HGM score for pass (default: 80.0)
- `--ollama-url`: Ollama base URL (default: http://localhost:11434)

## What Each Test Does

1. **Generates unique business idea** (SaaS, marketplace, AI tool, etc.)
2. **Builds complete application** (frontend + backend + auth + payments)
3. **Deploys to Railway/GitHub Pages** (real deployment)
4. **Registers domain** (simulated or test mode)
5. **Sets up billing** (Stripe test mode)
6. **Runs SEO, marketing, onboarding flows**
7. **Injects errors** → tests emergency recovery
8. **Scores with HGM Oracle** (≥80.0 required to pass)
9. **Stores full trajectory** in all persistence systems

## LLM Configuration

- **Primary:** Qwen (local via Ollama)
- **Fallback:** Mistral (local via Ollama)
- **All calls:** Via DAAO cost optimizer
- **Failed calls:** Logged → auto-retry with Mistral → stored in TrajectoryPool

## Persistence Systems Used

Every test stores trajectories in:
- ✅ TrajectoryPool
- ✅ CaseBank
- ✅ ReasoningBank
- ✅ Memento Agent
- ✅ Acontext
- ✅ LangGraph Store (via agents)
- ✅ Memory×Router + TEA embeddings

## Output Files

After execution, check:

1. **Final Report:** `GENESIS_100_TEST_CAMPAIGN_FINAL_REPORT.md`
2. **Detailed Results:** `metrics/100_test_campaign_detailed_results.json`
3. **Metrics Summary:** `metrics/100_test_campaign.json`
4. **Execution Logs:** `logs/genesis_100_tests/test_execution.log`

## Success Criteria

A test **PASSES** if:
- ✅ HGM Oracle score ≥ 80.0
- ✅ Application deployed (real URL)
- ✅ Billing system configured
- ✅ All workflow steps completed

## Final Verdict

The suite outputs one of three verdicts:

- **✅ GENESIS CERTIFIED AT SCALE** - ≥80% pass rate + avg HGM ≥80
- **⚠️ GENESIS READY FOR PRODUCTION** - ≥60% pass rate
- **❌ BLOCKERS REMAINING** - <60% pass rate

## Integration Coverage

The suite tracks usage of all **79 Genesis integrations**:
- Layer 1: Orchestration (HTDAG, HALO, AOP, DAAO, etc.)
- Layer 2: Evolution (SE-Darwin, TrajectoryPool, SICA, etc.)
- Layer 3: Communication (A2A Protocol, OpenEnv)
- Layer 5: Swarm (Inclusive Fitness, PSO Optimizer)
- Layer 6: Memory (Memento, CaseBank, ReasoningBank, etc.)
- Advanced: WaltzRL, HGM Oracle, VOIX, MCP Client, etc.

Unused integrations are listed in the final report.

## Troubleshooting

### Ollama Connection Failed
- Ensure Ollama is running: `ollama serve`
- Check models are installed: `ollama list`
- Verify URL: `--ollama-url http://localhost:11434`

### A2A Service Unavailable
- Start A2A service: `python a2a_fastapi.py`
- Check port 8000 is available
- Verify API key matches service config

### Low Pass Rate
- Check logs: `logs/genesis_100_tests/test_execution.log`
- Verify all required services are running
- Ensure sufficient system resources (memory, CPU)

## Example Output

```
================================================================================
GENESIS 100-TEST CAMPAIGN COMPLETE
================================================================================
Total Tests: 100
Passed (HGM >= 80.0): 87/100
Success Rate: 87.0%
Average HGM Score: 84.3/100
Execution Time: 12450.5s (207.5 minutes)
Qwen Calls: 1240
Mistral Calls: 45
================================================================================
✅ GENESIS CERTIFIED AT SCALE
```

## Notes

- Tests run in parallel by default (8 concurrent)
- Each test takes ~2-5 minutes depending on complexity
- Full suite takes ~2-4 hours with 8 parallel workers
- All deployments use test/simulation mode to avoid costs
- Real deployments only if explicitly configured

---

**Genesis TestForge Alpha: FORGE THE 100 TESTS NOW** 🎯

