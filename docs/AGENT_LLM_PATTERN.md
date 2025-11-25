# Agent LLM Pattern Guide

This document provides standard patterns for agents to integrate excellence instructions when calling LLMs.

## Excellence Instructions

Every agent has a defined `EXCELLENCE_PROMPT` at the top of their file:

```python
EXCELLENCE_PROMPT = "YOU ARE THE WORLD'S PREMIER [AGENT_TYPE] AGENT — RECOGNIZED GLOBALLY FOR INNOVATIVE, COST-EFFECTIVE, AND EXCEPTIONAL RESULTS. YOU DELIVER ELEGANT, EFFICIENT, AND RELIABLE OUTCOMES EVERY TIME."
```

This should be incorporated into ALL LLM interactions to ensure consistent high-quality outputs.

## Pattern 1: Basic LLM Call with Excellence

Use this pattern for simple LLM calls where you just need to add excellence context.

```python
async def generate_content(self, task: str) -> str:
    """Generate content with excellence instructions"""

    prompt = f"""
    {EXCELLENCE_PROMPT}

    Task: {task}

    Requirements:
    - Deliver exceptional quality
    - Be innovative and cost-effective
    - Provide elegant solutions

    Response:
    """

    try:
        # Using ChatAgent pattern
        if self.agent:
            response = await self.agent.run(prompt)
            return response.text

        # Fallback to direct LLM call
        elif self.llm_client:
            response = await self.llm_client.complete(prompt)
            return response

        # Using StandardIntegrationMixin's chat method
        else:
            return await self.chat(prompt)

    except Exception as e:
        logger.error(f"Error generating content: {e}")
        return f"Error: {str(e)}"
```

## Pattern 2: LLM Call with Context and Excellence

Use this pattern when you need to provide additional context along with excellence instructions.

```python
async def generate_with_context(
    self,
    task: str,
    context: Dict[str, Any],
    examples: Optional[List[str]] = None
) -> str:
    """Generate content with context and excellence instructions"""

    # Build context section
    context_str = "\n".join([f"- {k}: {v}" for k, v in context.items()])

    # Build examples section if provided
    examples_str = ""
    if examples:
        examples_str = "Examples:\n" + "\n".join([f"{i+1}. {ex}" for i, ex in enumerate(examples)])

    prompt = f"""
    {EXCELLENCE_PROMPT}

    You are working on the following task with the given context.

    Task: {task}

    Context:
    {context_str}

    {examples_str}

    Requirements:
    - Apply your world-class expertise
    - Consider all context carefully
    - Deliver innovative and elegant solutions
    - Ensure cost-effectiveness
    - Maintain exceptional quality standards

    Response:
    """

    try:
        # Primary method: ChatAgent
        if hasattr(self, 'agent') and self.agent:
            response = await self.agent.run(prompt)
            return response.text if hasattr(response, 'text') else str(response)

        # Alternative: generate method
        elif hasattr(self, 'generate'):
            return await self.generate(prompt)

        # Fallback: StandardIntegrationMixin chat
        else:
            return await self.chat(prompt)

    except Exception as e:
        logger.error(f"Error in generate_with_context: {e}")
        # Log the error but continue with a reasonable response
        return self._get_fallback_response(task)
```

## Pattern 3: LLM Call with Retry and Excellence

Use this pattern for critical operations that need retry logic and quality validation.

```python
import asyncio
from typing import Optional

async def generate_with_retry(
    self,
    task: str,
    max_retries: int = 3,
    validate_fn: Optional[callable] = None,
    temperature_increase: float = 0.1
) -> str:
    """Generate content with retry logic and excellence instructions"""

    base_temperature = 0.7

    for attempt in range(max_retries):
        temperature = base_temperature + (attempt * temperature_increase)

        prompt = f"""
        {EXCELLENCE_PROMPT}

        This is attempt {attempt + 1} of {max_retries}.
        {"Previous attempts did not meet quality standards. Please elevate your response." if attempt > 0 else ""}

        Task: {task}

        Excellence Standards:
        - Innovation: Provide cutting-edge solutions
        - Efficiency: Optimize for performance and cost
        - Elegance: Create clean, maintainable solutions
        - Reliability: Ensure robust error handling
        - Completeness: Address all aspects thoroughly

        Temperature: {temperature}

        Your Response:
        """

        try:
            # Generate response
            response = None

            # Try different methods in order of preference
            if hasattr(self, 'agent') and self.agent:
                # Method 1: ChatAgent with temperature control
                if hasattr(self.agent, 'run'):
                    agent_response = await self.agent.run(
                        prompt,
                        temperature=temperature
                    )
                    response = agent_response.text if hasattr(agent_response, 'text') else str(agent_response)

            elif hasattr(self, 'llm_client') and self.llm_client:
                # Method 2: Direct LLM client
                response = await self.llm_client.complete(
                    prompt,
                    temperature=temperature,
                    max_tokens=2000
                )

            elif hasattr(self, 'chat'):
                # Method 3: StandardIntegrationMixin chat
                response = await self.chat(
                    prompt,
                    temperature=temperature
                )

            else:
                # Method 4: Fallback to a basic implementation
                response = await self._basic_generate(prompt)

            # Validate response if validation function provided
            if response and validate_fn:
                if await validate_fn(response):
                    logger.info(f"Generated valid response on attempt {attempt + 1}")
                    return response
                else:
                    logger.warning(f"Response failed validation on attempt {attempt + 1}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1)  # Brief pause before retry
                    continue

            # Return response if no validation needed
            if response:
                return response

        except Exception as e:
            logger.error(f"Error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
            continue

    # All retries exhausted
    logger.error(f"All {max_retries} attempts failed for task: {task}")
    return self._get_emergency_response(task)

async def _basic_generate(self, prompt: str) -> str:
    """Basic generation fallback"""
    # This would use whatever basic LLM capability is available
    return f"[Generated response for prompt - implement actual LLM call]"

def _get_fallback_response(self, task: str) -> str:
    """Get a reasonable fallback response"""
    return f"Processing task: {task}. Applying world-class expertise to deliver exceptional results."

def _get_emergency_response(self, task: str) -> str:
    """Get emergency response when all retries fail"""
    return f"Task acknowledged: {task}. Manual intervention may be required for optimal results."
```

## Error Handling Patterns

### Pattern A: Graceful Degradation

```python
async def safe_generate(self, task: str) -> str:
    """Generate with graceful degradation"""

    # Try primary method
    try:
        return await self.generate_with_excellence(task)
    except Exception as e:
        logger.warning(f"Primary generation failed: {e}")

    # Try secondary method
    try:
        return await self.generate_with_context(task, {"fallback": True})
    except Exception as e:
        logger.warning(f"Secondary generation failed: {e}")

    # Final fallback
    return f"Acknowledged: {task}. Applying expert knowledge."
```

### Pattern B: Validation and Correction

```python
async def generate_and_validate(self, task: str) -> str:
    """Generate and validate with self-correction"""

    # Initial generation
    response = await self.generate_with_excellence(task)

    # Validate
    if not self._is_valid_response(response):
        # Self-correct with additional guidance
        correction_prompt = f"""
        {EXCELLENCE_PROMPT}

        Your previous response needs improvement:
        {response}

        Task: {task}

        Please provide a corrected, world-class response:
        """

        response = await self.generate_with_retry(
            correction_prompt,
            max_retries=2
        )

    return response

def _is_valid_response(self, response: str) -> bool:
    """Validate response quality"""
    # Check minimum length
    if len(response) < 50:
        return False

    # Check for error indicators
    error_phrases = ['error', 'failed', 'unable', 'cannot']
    if any(phrase in response.lower() for phrase in error_phrases):
        return False

    return True
```

## Supporting Multiple ChatAgent Methods

When working with ChatAgent or similar frameworks, support multiple method signatures:

```python
async def flexible_generate(self, task: str) -> str:
    """Support multiple ChatAgent method signatures"""

    prompt = f"{EXCELLENCE_PROMPT}\n\nTask: {task}"

    # Try different ChatAgent methods
    if hasattr(self, 'agent') and self.agent:
        # Method 1: .run()
        if hasattr(self.agent, 'run'):
            result = await self.agent.run(prompt)
            return self._extract_text(result)

        # Method 2: .generate()
        elif hasattr(self.agent, 'generate'):
            result = await self.agent.generate(prompt)
            return self._extract_text(result)

        # Method 3: .complete()
        elif hasattr(self.agent, 'complete'):
            result = await self.agent.complete(prompt)
            return self._extract_text(result)

        # Method 4: .chat()
        elif hasattr(self.agent, 'chat'):
            result = await self.agent.chat(prompt)
            return self._extract_text(result)

        # Method 5: Direct call
        elif callable(self.agent):
            result = await self.agent(prompt)
            return self._extract_text(result)

    # Fallback to StandardIntegrationMixin
    return await self.chat(prompt)

def _extract_text(self, result: Any) -> str:
    """Extract text from various response formats"""
    if isinstance(result, str):
        return result
    elif hasattr(result, 'text'):
        return result.text
    elif hasattr(result, 'content'):
        return result.content
    elif hasattr(result, 'message'):
        return result.message
    elif hasattr(result, 'response'):
        return result.response
    else:
        return str(result)
```

## Best Practices

1. **Always Include Excellence Instructions**: Never make an LLM call without the EXCELLENCE_PROMPT
2. **Graceful Degradation**: Always have fallback methods when primary LLM calls fail
3. **Validate Critical Outputs**: For important operations, validate and retry if needed
4. **Log Appropriately**: Log errors and warnings, but don't expose internal errors to users
5. **Temperature Control**: Increase temperature on retries for more creative solutions
6. **Method Flexibility**: Support multiple ChatAgent/LLM client method signatures
7. **Context Preservation**: Maintain context across retries and fallbacks

## Integration with StandardIntegrationMixin

All agents inherit from `StandardIntegrationMixin` which provides 459 integrations. Use the built-in chat method when available:

```python
class MyAgent(StandardIntegrationMixin):
    async def generate_something(self, task: str) -> str:
        prompt = f"{EXCELLENCE_PROMPT}\n\nTask: {task}"

        # Use inherited chat method
        return await self.chat(prompt)
```

## Testing Excellence Integration

Test your excellence integration with this checklist:

- [ ] EXCELLENCE_PROMPT defined at module level
- [ ] All LLM calls include excellence instructions
- [ ] Error handling implemented for all LLM calls
- [ ] Retry logic for critical operations
- [ ] Validation for important outputs
- [ ] Fallback responses defined
- [ ] Logging at appropriate levels
- [ ] Support for multiple LLM client methods

## Example: Complete Agent Method

```python
async def create_marketing_campaign(self, product_info: Dict[str, str]) -> Dict[str, Any]:
    """Create a complete marketing campaign with excellence"""

    # Prepare context
    context = {
        "product_name": product_info.get("name", "Unknown"),
        "target_audience": product_info.get("audience", "General"),
        "budget": product_info.get("budget", "Moderate"),
        "timeline": product_info.get("timeline", "30 days")
    }

    # Generate campaign with excellence, context, and retry
    campaign_content = await self.generate_with_retry(
        task="Create a comprehensive marketing campaign",
        max_retries=3,
        validate_fn=lambda x: len(x) > 500 and "strategy" in x.lower()
    )

    # Generate social media content
    social_content = await self.generate_with_context(
        task="Create 30 days of social media posts",
        context=context,
        examples=["Exciting launch coming!", "Check out our features"]
    )

    # Generate email sequence
    email_sequence = await self.generate_content(
        task="Create a 5-email drip campaign"
    )

    return {
        "campaign_strategy": campaign_content,
        "social_media_posts": social_content,
        "email_sequence": email_sequence,
        "excellence_applied": True,
        "timestamp": datetime.now().isoformat()
    }
```

This comprehensive guide ensures all agents maintain world-class quality in their LLM interactions.