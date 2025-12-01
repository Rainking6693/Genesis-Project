# Genesis 100 Comprehensive Test Suite

## Overview

This test suite provides 100 comprehensive tests for Genesis agents, based on evaluation patterns from better-agents and agentmark repositories.

## Test Distribution

- **50 tests**: Genesis Meta + Top Agents
  - Top agents: analyst_agent, builder_agent_enhanced, deploy_agent, billing_agent, emergency_error_specialist_agent, marketing_agent, support_agent, onboarding_agent, qa_agent, se_darwin_agent, seo_agent

- **50 tests**: Genesis Meta + All Agents
  - Includes all 25+ agents in the Genesis ecosystem

## Difficulty Levels

- **Easy (E01-E25)**: Basic single-agent functionality
- **Intermediate (I01-I25)**: Multi-step tasks
- **Hard (H01-H25)**: Complex multi-agent orchestration
- **Hardest (X01-X25)**: Most complex scenarios

## Key Features

1. **SE-Darwin Integration**: All tests use SE_darwin_agent for evolutionary improvements
2. **No Stubs**: All LLM calls and agent calls must be real - stub detection will fail tests
3. **Comprehensive Coverage**: Tests cover all major agent capabilities
4. **Real Execution**: All agents are instantiated and executed with real implementations

## Usage

### Run All Tests

```bash
python tests/run_genesis_100_tests.py
```

### Run by Difficulty

```bash
python tests/run_genesis_100_tests.py --difficulty easy
python tests/run_genesis_100_tests.py --difficulty intermediate
python tests/run_genesis_100_tests.py --difficulty hard
python tests/run_genesis_100_tests.py --difficulty hardest
```

### Run Specific Test

```bash
python tests/run_genesis_100_tests.py --test-id E01
```

### Fail on Stub Detection

```bash
python tests/run_genesis_100_tests.py --no-stubs
```

### Save Results to JSON

```bash
python tests/run_genesis_100_tests.py --output results.json
```

### Using pytest

```bash
pytest tests/test_genesis_100_comprehensive.py -v
pytest tests/test_genesis_100_comprehensive.py::test_genesis_agent[E01] -v
```

## Test Structure

Each test includes:
- **Test ID**: Unique identifier (E01, I01, H01, X01, etc.)
- **Name**: Descriptive test name
- **Difficulty**: easy, intermediate, hard, or hardest
- **Agents**: List of agents involved (always includes genesis_meta and se_darwin_agent)
- **Task**: Task description
- **Method**: Optional specific method to call
- **Inputs**: Optional input parameters

## SE-Darwin Integration

All tests automatically use SE_darwin_agent for evolutionary improvements:

1. Primary agent executes the task
2. SE-Darwin analyzes the result
3. SE-Darwin evolves the solution for optimization
4. Improvement score is tracked

## Stub Detection

The test suite includes comprehensive stub detection:

- Detects `_StubAgent` instances
- Checks for stub responses in results
- Validates agent methods aren't stubbed
- Fails tests if stubs are detected (when `--no-stubs` is used)

## Test Results

Results include:
- **Status**: passed, failed, error, or stub_detected
- **Duration**: Execution time in milliseconds
- **Agents Used**: List of agents involved
- **SE-Darwin Improvement**: Optimization score (if available)
- **Error Message**: Error details (if failed)

## Example Test

```python
{
    "id": "E01",
    "name": "Analyst analyze basic metrics",
    "difficulty": "easy",
    "agents": ["genesis_meta", "analyst_agent", "se_darwin_agent"],
    "task": "Analyze page views, sessions, and bounce rate for the last 7 days",
    "method": "analyze_metrics",
    "inputs": {
        "metric_names": ["page_views", "sessions", "bounce_rate"],
        "time_period": "7d"
    }
}
```

## Requirements

- All agents must be properly installed and configured
- LLM API keys must be set (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
- No stubs allowed - all implementations must be real
- SE_darwin_agent must be available for evolutionary improvements

## Troubleshooting

### Agent Loading Failures

If an agent fails to load:
1. Check that the agent module exists in `agents/`
2. Verify the agent has a factory function (e.g., `get_analyst_agent`)
3. Ensure all dependencies are installed

### Stub Detection

If stubs are detected:
1. Check agent implementation - ensure no `pass # stub` statements
2. Verify agent methods are fully implemented
3. Check that `_StubAgent` is not being returned

### SE-Darwin Issues

If SE-Darwin optimization fails:
1. Verify SE_darwin_agent is properly configured
2. Check LLM client is available
3. Ensure trajectory pool is accessible

## Test Categories

### Top Agents Tests (50 tests)
- E01-E10: Easy tests with top agents
- I01-I10: Intermediate tests with top agents
- H01-H10: Hard tests with top agents
- X01-X10: Hardest tests with top agents
- E11-E25, I11-I25, H11-H25, X11-X25: Tests with all agents

### All Agents Tests (50 tests)
- Includes commerce_agent, content_agent, darwin_agent, domain_name_agent, email_agent, finance_agent, legal_agent, maintenance_agent, pricing_agent, reflection_agent, research_discovery_agent, ring1t_reasoning, security_agent, spec_agent, waltzrl_conversation_agent, waltzrl_feedback_agent

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Always include `genesis_meta` and `se_darwin_agent` in the agents list
3. Use appropriate difficulty levels
4. Ensure no stubs are used
5. Test the test before committing

## Notes

- Tests are designed to be comprehensive and realistic
- All agent calls use real implementations
- SE-Darwin optimization is optional but recommended
- Test execution time varies based on complexity and LLM response times


