"""
Mock LLM API Server for ES Evaluation Sandbox

This server provides a mock LLM API that returns deterministic responses
for testing Evolution Strategies fitness evaluation.

SECURITY: This server ONLY runs inside the isolated Docker network.
It NEVER makes external API calls to OpenAI, Anthropic, or Google.
"""

import asyncio
import json
import logging
import os
import random
import time
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [MOCK-LLM-SERVER] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Mock LLM API Server", version="1.0.0")

# Load mock responses
FIXTURES_DIR = Path("/app/fixtures")
MOCK_RESPONSES: Dict[str, Any] = {}


def load_mock_responses():
    """Load mock responses from fixtures"""
    global MOCK_RESPONSES

    fixtures_file = FIXTURES_DIR / "es_test_tasks.json"

    if not fixtures_file.exists():
        logger.warning(f"Fixtures file not found: {fixtures_file}")
        MOCK_RESPONSES = get_default_responses()
        return

    try:
        with open(fixtures_file, 'r') as f:
            data = json.load(f)
            MOCK_RESPONSES = data.get("mock_responses", {})
            logger.info(f"Loaded {len(MOCK_RESPONSES)} mock responses")
    except Exception as e:
        logger.error(f"Failed to load fixtures: {e}")
        MOCK_RESPONSES = get_default_responses()


def get_default_responses() -> Dict[str, Any]:
    """Default mock responses if fixtures unavailable"""
    return {
        "default": {
            "content": "This is a default mock response.",
            "model": "mock-gpt-4o",
            "latency_ms": 100
        }
    }


@app.on_event("startup")
async def startup_event():
    """Load mock responses on startup"""
    logger.info("Starting Mock LLM API Server...")
    load_mock_responses()
    logger.info("Mock LLM API Server ready")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mock-llm-api"}


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """
    Mock OpenAI-compatible chat completions endpoint

    This endpoint mimics the OpenAI API format but returns
    deterministic mock responses instead of calling external APIs.
    """
    try:
        body = await request.json()

        # Extract parameters
        model = body.get("model", "gpt-4o")
        messages = body.get("messages", [])

        # Get last user message for deterministic selection
        user_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
                break

        # Select mock response deterministically
        response_key = select_mock_response(user_message)
        mock_response = MOCK_RESPONSES.get(
            response_key,
            MOCK_RESPONSES.get("default", {})
        )

        # Simulate latency
        latency_ms = mock_response.get("latency_ms", 100)
        await asyncio.sleep(latency_ms / 1000.0)

        # Build OpenAI-compatible response
        response = {
            "id": f"chatcmpl-mock-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": f"mock-{model}",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": mock_response.get("content", "Mock response")
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": len(user_message.split()),
                "completion_tokens": len(mock_response.get("content", "").split()),
                "total_tokens": len(user_message.split()) + len(mock_response.get("content", "").split())
            }
        }

        logger.info(f"Returned mock response: {response_key} (latency: {latency_ms}ms)")

        return JSONResponse(content=response)

    except Exception as e:
        logger.error(f"Error in chat completions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def select_mock_response(user_message: str) -> str:
    """
    Select mock response deterministically based on user message

    Args:
        user_message: User's message content

    Returns:
        Key of mock response to use
    """
    message_lower = user_message.lower()

    # Pattern matching for different task types
    if "test" in message_lower or "qa" in message_lower:
        if "fail" in message_lower or "error" in message_lower:
            return "qa_failure"
        return "qa_success"

    if "build" in message_lower or "code" in message_lower or "develop" in message_lower:
        return "builder_success"

    if "market" in message_lower or "copy" in message_lower or "campaign" in message_lower:
        return "marketing_success"

    if "support" in message_lower or "customer" in message_lower:
        return "support_success"

    if "analy" in message_lower or "data" in message_lower or "metric" in message_lower:
        return "analyst_success"

    if "content" in message_lower or "blog" in message_lower or "write" in message_lower:
        return "content_success"

    if "security" in message_lower or "audit" in message_lower or "vulnerability" in message_lower:
        return "security_success"

    if "deploy" in message_lower or "production" in message_lower:
        return "deploy_success"

    if "legal" in message_lower or "compliance" in message_lower:
        return "legal_success"

    if "spec" in message_lower or "requirement" in message_lower:
        return "spec_success"

    # Default
    return "generic_success"


@app.post("/v1/embeddings")
async def embeddings(request: Request):
    """Mock embeddings endpoint"""
    try:
        body = await request.json()
        input_text = body.get("input", "")

        # Simulate latency
        await asyncio.sleep(0.05)

        # Generate deterministic embedding (not real, just for testing)
        embedding = [random.random() for _ in range(1536)]  # GPT-3 embedding size

        response = {
            "object": "list",
            "data": [
                {
                    "object": "embedding",
                    "index": 0,
                    "embedding": embedding
                }
            ],
            "model": "mock-text-embedding-ada-002",
            "usage": {
                "prompt_tokens": len(input_text.split()),
                "total_tokens": len(input_text.split())
            }
        }

        return JSONResponse(content=response)

    except Exception as e:
        logger.error(f"Error in embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Mock LLM API Server",
        "version": "1.0.0",
        "purpose": "ES Evaluation Sandbox",
        "security": "ISOLATED - No external API calls",
        "endpoints": [
            "/health",
            "/v1/chat/completions",
            "/v1/embeddings"
        ]
    }


if __name__ == "__main__":
    # Get port from environment
    port = int(os.getenv("MOCK_API_PORT", 8080))

    logger.info(f"Starting Mock LLM API Server on port {port}")
    logger.info("SECURITY: This server is ISOLATED and makes NO external API calls")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
