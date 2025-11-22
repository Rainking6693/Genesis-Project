"""
A2A FastAPI Service - Production-Ready Agent-to-Agent Communication

Integrates with Genesis orchestration layer (HTDAG/HALO/AOP/DAAO) and exposes
all 21 agents via A2A protocol for external agent-to-agent communication.

Key Features:
- A2A protocol compliant (Google/IBM standard)
- 21 specialized agents with 56+ tools
- Lazy agent loading (< 5s startup)
- API key authentication
- OTEL observability
- Circuit breaker resilience
- Rate limiting per agent
- TOON protocol support (97% token reduction)

Architecture:
  External Agent (A2A Client)
       ↓
  [A2A FastAPI] ← THIS SERVICE
       ↓
  [A2A Connector] → [HTDAG/HALO/AOP/DAAO]
       ↓
  [Genesis Agents] (21 agents × tools)
       ↓
  [Results]

Author: Claude Code (Lead)
Date: 2025-10-31
Version: 2.0.0 - Full integration with orchestration layer
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Security, Depends, Request, status
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
from opentelemetry import trace

# Import Genesis infrastructure
from infrastructure.a2a_connector import (
    A2AConnector,
    A2ATaskRequest,
    A2ATaskResponse,
    A2AError
)
from infrastructure.agent_auth_registry import AgentAuthRegistry, SecurityError
from infrastructure.toon_encoder import toon_or_json, decode_from_toon
from infrastructure.observability import MetricSnapshot, CorrelationContext
from infrastructure.feature_flags import is_feature_enabled
from infrastructure.session_store import SessionStore, SessionCompactor
from infrastructure.memory.session_memori_bridge import SessionMemoriBridge
from infrastructure import a2a_logger

# Initialize logger FIRST (before any usage)
logger = logging.getLogger(__name__)

# Setup observability
try:
    from agent_framework.observability import setup_observability
    setup_observability(enable_sensitive_data=True)
except ImportError:
    logger.warning("agent-framework not installed, skipping observability setup")
    pass

# Initialize FastAPI app
app = FastAPI(
    title="Genesis A2A Service",
    description="Agent-to-Agent communication service for Genesis multi-agent system",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# SECURITY: Get allowed origins from environment (default to localhost only)
allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
if os.getenv("GENESIS_ENV") == "production" and "*" in allowed_origins:
    logger.warning("SECURITY WARNING: CORS allows all origins in production. Set CORS_ALLOWED_ORIGINS environment variable.")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Configurable via CORS_ALLOWED_ORIGINS env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tracing
tracer = trace.get_tracer(__name__)

# Session persistence backbone
_SESSION_DB_PATH = os.getenv("GENESIS_SESSION_DB_PATH", "data/sessions/genesis_sessions.db")
_SESSION_TTL_HOURS = int(os.getenv("GENESIS_SESSION_TTL_HOURS", "720"))
_SESSION_PURGE_INTERVAL = int(os.getenv("GENESIS_SESSION_PURGE_INTERVAL_SECONDS", "600"))
_SESSION_MEMORI_SYNC = os.getenv("GENESIS_SESSION_MEMORI_SYNC", "true").lower() == "true"
_last_session_purge = 0.0

try:
    session_store: Optional[SessionStore] = SessionStore(
        db_path=_SESSION_DB_PATH,
        default_ttl_hours=_SESSION_TTL_HOURS,
    )
    session_compactor: Optional[SessionCompactor] = SessionCompactor(session_store)
    logger.info("SessionStore initialized at %s (TTL=%sh)", _SESSION_DB_PATH, _SESSION_TTL_HOURS)
except Exception as exc:  # pragma: no cover - optional dependency
    logger.warning("SessionStore initialization failed: %s", exc)
    session_store = None
    session_compactor = None

session_memori_bridge: Optional[SessionMemoriBridge] = None
if _SESSION_MEMORI_SYNC and session_store:
    try:
        session_memori_bridge = SessionMemoriBridge(session_store)
        logger.info("SessionMemoriBridge enabled (Memori sync active)")
    except Exception as exc:
        logger.warning("Failed to initialize SessionMemoriBridge: %s", exc)
        session_memori_bridge = None

# Security: API Key authentication
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_api_key() -> str:
    """Get API key from environment variable"""
    api_key = os.getenv("A2A_API_KEY", os.getenv("GENESIS_API_KEY"))
    if not api_key:
        import secrets
        api_key = secrets.token_urlsafe(32)
        logger.warning(f"No A2A_API_KEY found - using generated key: {api_key[:8]}...")
    return api_key

GENESIS_API_KEY = get_api_key()

async def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify API key from request header"""
    genesis_env = os.getenv("GENESIS_ENV", "development")

    # In development, allow without key (but log warning)
    if genesis_env != "production" and api_key is None:
        logger.warning("API request without key in development mode")
        return True

    # In production, require valid key
    if api_key is None:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Include X-API-Key header."
        )

    if api_key != GENESIS_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return True

# Pydantic models for A2A protocol
class A2AInvokeRequest(BaseModel):
    """A2A protocol invoke request"""
    agent: str = Field(..., description="Target agent name (e.g., 'qa_agent', 'builder_agent')")
    tool: Optional[str] = Field(None, description="Specific tool to invoke (optional)")
    task: str = Field(..., description="Natural language task description")
    arguments: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Tool arguments")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")
    use_toon: bool = Field(False, description="Use TOON encoding for response (97% token reduction)")

class A2AInvokeResponse(BaseModel):
    """A2A protocol invoke response"""
    result: Any = Field(..., description="Task execution result")
    agent: str = Field(..., description="Agent that handled the task")
    tool: Optional[str] = Field(None, description="Tool that was invoked")
    status: str = Field(..., description="Status: success, error, partial")
    execution_time_ms: float = Field(..., description="Execution time in milliseconds")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class A2AAgentCard(BaseModel):
    """A2A protocol agent card"""
    name: str
    version: str
    description: str
    capabilities: List[str]
    tools: List[Dict[str, Any]]
    endpoint: str

class A2AHealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    agents_available: int
    uptime_seconds: float
    feature_flags: Dict[str, bool]

# Global A2A connector (lazy-loaded)
_a2a_connector: Optional[A2AConnector] = None
_startup_time = datetime.now()

def get_a2a_connector() -> A2AConnector:
    """Get or create A2A connector (lazy initialization)"""
    global _a2a_connector
    if _a2a_connector is None:
        # A2AConnector checks ENVIRONMENT env var, not GENESIS_ENV
        # Set ENVIRONMENT if not already set, using GENESIS_ENV as fallback
        if not os.getenv("ENVIRONMENT"):
            os.environ["ENVIRONMENT"] = os.getenv("GENESIS_ENV", "development")

        # Get base URL from environment (A2AConnector will handle defaults)
        base_url = os.getenv("A2A_SERVICE_URL")
        api_key = os.getenv("A2A_API_KEY", os.getenv("GENESIS_API_KEY"))

        # For development, ensure A2A_ALLOW_HTTP is set
        if os.getenv("ENVIRONMENT") != "production":
            os.environ.setdefault("A2A_ALLOW_HTTP", "true")

        # Create connector with correct parameters
        _a2a_connector = A2AConnector(
            base_url=base_url,  # Let A2AConnector handle defaults
            timeout_seconds=30.0,
            api_key=api_key,
            verify_ssl=os.getenv("ENVIRONMENT") == "production",
            enable_toon=True  # TOON encoding is always available in A2AConnector
        )
        logger.info(f"Initialized A2A connector to {_a2a_connector.base_url}")
    return _a2a_connector

# Available Genesis agents
AVAILABLE_AGENTS = [
    # Core Development
    "spec_agent", "architect_agent", "builder_agent", "frontend_agent", "backend_agent",
    # Quality & Operations
    "qa_agent", "security_agent", "deploy_agent", "monitoring_agent", "maintenance_agent",
    # Business & Marketing
    "marketing_agent", "sales_agent", "support_agent", "analytics_agent", "finance_agent",
    # Content & Legal
    "content_agent", "legal_agent", "analyst_agent",
    # Research & Evolution
    "research_agent", "darwin_agent",
    # Infrastructure
    "domain_name_agent"  # Integration #73: Domain registration and DNS management
]


def _resolve_identity(context: Optional[Dict[str, Any]]) -> Tuple[str, Optional[str]]:
    context = context or {}
    user_id = (
        context.get("user_id")
        or context.get("account_id")
        or context.get("tenant_id")
        or context.get("business_id")
        or context.get("organization_id")
        or "anonymous"
    )
    return str(user_id), context.get("session_id")


def _safe_payload(data: Any) -> Any:
    try:
        json.dumps(data, ensure_ascii=False)
        return data
    except TypeError:
        return json.loads(json.dumps(data, default=str))


def _stringify_result(value: Any, limit: int = 2000) -> str:
    if isinstance(value, str):
        text = value
    else:
        try:
            text = json.dumps(value, ensure_ascii=False)
        except TypeError:
            text = str(value)
    text = text.strip()
    if len(text) > limit:
        text = text[: limit - 3] + "..."
    return text


def _record_session_event(
    user_id: str,
    session_id: Optional[str],
    role: str,
    content: str,
    payload: Dict[str, Any],
) -> None:
    if not (session_store and session_id):
        return
    try:
        session_store.append_event(
            user_id=user_id,
            session_id=session_id,
            role=role,
            content=content,
            payload=_safe_payload(payload),
        )
    except Exception as exc:  # pragma: no cover - telemetry best effort
        logger.debug("Session logging skipped: %s", exc)


def _maybe_compact_session(user_id: str, session_id: Optional[str]) -> None:
    if not (session_compactor and session_id):
        return
    try:
        session_compactor.maybe_compact(user_id, session_id)
    except Exception as exc:  # pragma: no cover - telemetry best effort
        logger.debug("Session compaction skipped: %s", exc)


def _maybe_purge_sessions() -> None:
    global _last_session_purge
    if not session_store:
        return
    now = time.time()
    if now - _last_session_purge < _SESSION_PURGE_INTERVAL:
        return
    removed = session_store.purge_expired_sessions(batch_size=25)
    if removed:
        logger.info("Purged %s expired sessions", removed)
    _last_session_purge = now


def _sync_memori_summary(user_id: str, session_id: Optional[str]) -> None:
    if not (session_memori_bridge and session_id):
        return
    try:
        session_memori_bridge.sync_session(user_id, session_id)
    except Exception as exc:  # pragma: no cover - telemetry best effort
        logger.debug("Session Memori sync skipped: %s", exc)

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("Genesis A2A FastAPI service starting...")

    # Warm up A2A connector (creates client but doesn't load agents)
    connector = get_a2a_connector()

    # Log feature flags
    flags = {
        "a2a_integration": is_feature_enabled("a2a_integration_enabled"),
        "error_handling": is_feature_enabled("error_handling_enabled"),
        "otel": is_feature_enabled("otel_enabled"),
        "performance_optimizations": is_feature_enabled("performance_optimizations_enabled")
    }
    logger.info(f"Feature flags: {flags}")

    logger.info("Genesis A2A FastAPI service ready!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Genesis A2A FastAPI service shutting down...")
    global _a2a_connector
    if _a2a_connector:
        # A2AConnector doesn't have close() method - just clear the reference
        _a2a_connector = None
        logger.info("A2A connector reference cleared")

@app.get("/health", response_model=A2AHealthResponse)
async def health_check():
    """Health check endpoint"""
    uptime = (datetime.now() - _startup_time).total_seconds()

    return A2AHealthResponse(
        status="healthy",
        version="2.0.0",
        agents_available=len(AVAILABLE_AGENTS),
        uptime_seconds=uptime,
        feature_flags={
            "a2a_integration": is_feature_enabled("a2a_integration_enabled"),
            "error_handling": is_feature_enabled("error_handling_enabled"),
            "otel": is_feature_enabled("otel_enabled"),
            "performance_optimizations": is_feature_enabled("performance_optimizations_enabled")
        }
    )

@app.get("/agents", dependencies=[Depends(verify_api_key)])
async def list_agents():
    """List all available agents"""
    return {
        "agents": AVAILABLE_AGENTS,
        "count": len(AVAILABLE_AGENTS),
        "endpoint_pattern": "/invoke/{agent}"
    }

@app.get("/agents/{agent_name}", dependencies=[Depends(verify_api_key)])
async def get_agent_card(agent_name: str):
    """Get agent card for specific agent (A2A discovery)"""
    if agent_name not in AVAILABLE_AGENTS:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")

    # TODO: Implement full agent card retrieval from A2A connector
    return {
        "name": agent_name,
        "version": "2.0.0",
        "description": f"Genesis {agent_name} specialized agent",
        "capabilities": ["task_execution", "tool_invocation", "orchestration"],
        "endpoint": f"/invoke/{agent_name}"
    }

@app.post("/invoke",
         response_model=A2AInvokeResponse,
         dependencies=[Depends(verify_api_key)])
async def invoke_task(request: A2AInvokeRequest):
    """
    Invoke a task on a Genesis agent via A2A protocol

    This is the main A2A endpoint that:
    1. Validates the agent exists
    2. Routes to A2A connector
    3. Executes via HTDAG/HALO/AOP/DAAO orchestration
    4. Returns results in A2A format
    """
    with tracer.start_as_current_span("a2a_invoke") as span:
        span.set_attribute("agent", request.agent)
        span.set_attribute("tool", request.tool or "auto")
        span.set_attribute("use_toon", request.use_toon)

        start_time = datetime.now()
        context = request.context or {}
        user_id, requested_session_id = _resolve_identity(context)
        active_session_id: Optional[str] = None
        enriched_context = dict(context)

        if session_store:
            try:
                active_session_id = session_store.start_session(
                    user_id=user_id,
                    session_id=requested_session_id,
                    metadata={"last_agent": request.agent},
                )
            except Exception as exc:  # pragma: no cover - telemetry best effort
                logger.debug("Failed to initialize session: %s", exc)

        if active_session_id:
            enriched_context["session_id"] = active_session_id
        enriched_context.setdefault("user_id", user_id)

        _maybe_purge_sessions()
        _record_session_event(
            user_id,
            active_session_id,
            "user",
            request.task,
            {
                "agent": request.agent,
                "tool": request.tool or "auto",
                "arguments": _safe_payload(request.arguments),
                "context": _safe_payload(enriched_context),
            },
        )

        try:
            # Validate agent
            if request.agent not in AVAILABLE_AGENTS:
                raise HTTPException(
                    status_code=404,
                    detail=f"Agent '{request.agent}' not found. Available: {', '.join(AVAILABLE_AGENTS)}"
                )

            # Get A2A connector
            connector = get_a2a_connector()

            # Create A2A task request
            a2a_request = A2ATaskRequest(
                agent=request.agent,
                tool=request.tool,
                task=request.task,
                arguments=request.arguments,
                context=enriched_context
            )

            # Execute task via A2A connector
            # This routes through HTDAG decomposition → HALO routing → AOP validation → Agent execution
            a2a_response = await connector.execute_task(a2a_request)

            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds() * 1000

            # Apply TOON encoding if requested (always available)
            raw_result = a2a_response.result
            result = raw_result
            if request.use_toon:
                result = toon_or_json(result)

            # Build response
            response = A2AInvokeResponse(
                result=result,
                agent=request.agent,
                tool=a2a_response.tool_used,
                status="success",
                execution_time_ms=execution_time,
                metadata={
                    "orchestration_used": a2a_response.metadata.get("orchestration_used", False),
                    "cost_optimized": a2a_response.metadata.get("cost_optimized", False),
                    "toon_encoded": request.use_toon
                }
            )

            _record_session_event(
                user_id,
                active_session_id,
                "agent",
                _stringify_result(raw_result),
                {"status": "success", "metadata": response.metadata},
            )
            _maybe_compact_session(user_id, active_session_id)
            _sync_memori_summary(user_id, active_session_id)

            if active_session_id:
                response.metadata["session_id"] = active_session_id
                response.metadata["user_id"] = user_id
                if session_store:
                    try:
                        response.metadata["events_recorded"] = session_store.count_events(active_session_id)
                    except Exception:
                        response.metadata["events_recorded"] = None

            span.set_attribute("status", "success")
            span.set_attribute("execution_time_ms", execution_time)

            logger.info(f"A2A task completed: agent={request.agent}, time={execution_time:.2f}ms")

            return response

        except A2AError as e:
            # A2A-specific errors
            span.set_attribute("status", "error")
            span.set_attribute("error_type", type(e).__name__)
            logger.error(f"A2A error: {e}")

            _record_session_event(
                user_id,
                active_session_id,
                "agent_error",
                str(e),
                {"status": "error", "error_type": type(e).__name__},
            )
            _maybe_compact_session(user_id, active_session_id)
            _sync_memori_summary(user_id, active_session_id)

            raise HTTPException(
                status_code=500,
                detail=f"A2A execution error: {str(e)}"
            )

        except SecurityError as e:
            # Security errors
            span.set_attribute("status", "security_error")
            logger.error(f"Security error: {e}")

            _record_session_event(
                user_id,
                active_session_id,
                "agent_error",
                str(e),
                {"status": "security_error", "error_type": type(e).__name__},
            )
            _maybe_compact_session(user_id, active_session_id)
            _sync_memori_summary(user_id, active_session_id)

            raise HTTPException(
                status_code=403,
                detail=f"Security error: {str(e)}"
            )

        except Exception as e:
            # Generic errors
            span.set_attribute("status", "error")
            span.set_attribute("error_type", type(e).__name__)
            logger.error(f"Unexpected error: {e}", exc_info=True)

            _record_session_event(
                user_id,
                active_session_id,
                "agent_error",
                str(e),
                {"status": "error", "error_type": type(e).__name__},
            )
            _maybe_compact_session(user_id, active_session_id)
            _sync_memori_summary(user_id, active_session_id)

            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

@app.post("/invoke/{agent_name}",
         response_model=A2AInvokeResponse,
         dependencies=[Depends(verify_api_key)])
async def invoke_agent_task(agent_name: str, request: Dict[str, Any]):
    """
    Invoke a task on a specific agent (convenience endpoint)

    Same as /invoke but with agent in URL path
    """
    # Convert to standard invoke request
    invoke_request = A2AInvokeRequest(
        agent=agent_name,
        tool=request.get("tool"),
        task=request.get("task", ""),
        arguments=request.get("arguments", {}),
        context=request.get("context", {}),
        use_toon=request.get("use_toon", False)
    )

    return await invoke_task(invoke_request)

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors"""
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Request validation error",
            "errors": exc.errors()
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Development/testing endpoints (only in non-production)
if os.getenv("GENESIS_ENV", "development") != "production":

    @app.get("/debug/connector-status")
    async def debug_connector_status(authenticated: bool = Depends(verify_api_key)):
        """Debug endpoint to check A2A connector status"""
        connector = get_a2a_connector()
        return {
            "initialized": _a2a_connector is not None,
            "base_url": connector.base_url if _a2a_connector else None,
            "timeout_seconds": connector.timeout_seconds if _a2a_connector else None,
            "enable_toon": connector.enable_toon if _a2a_connector else None,
            "uptime_seconds": (datetime.now() - _startup_time).total_seconds()
        }

    @app.post("/debug/test-invoke")
    async def debug_test_invoke(authenticated: bool = Depends(verify_api_key)):
        """Debug endpoint to test basic invoke"""
        test_request = A2AInvokeRequest(
            agent="qa_agent",
            task="Echo test: Hello from A2A FastAPI",
            arguments={},
            context={}
        )
        return await invoke_task(test_request)

if __name__ == "__main__":
    import uvicorn

    # Railway/Render auto-inject PORT, fallback to A2A_PORT or 8000
    port = int(os.getenv("PORT", os.getenv("A2A_PORT", "8000")))
    host = os.getenv("A2A_HOST", "0.0.0.0")

    logger.info(f"Starting Genesis A2A FastAPI on {host}:{port}")
    logger.info(f"Environment: {os.getenv('GENESIS_ENV', 'development')}")
    logger.info(f"Docs available at: http://{host}:{port}/docs")

    uvicorn.run(
        "a2a_fastapi:app",
        host=host,
        port=port,
        reload=os.getenv("GENESIS_ENV", "development") != "production",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
        access_log=True,
        proxy_headers=True,  # Trust X-Forwarded-* headers from Railway/Render
        forwarded_allow_ips="*"  # Allow proxy headers from any IP (Railway/Render requirement)
    )
