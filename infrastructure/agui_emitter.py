"""
AG-UI Emitter - Real-time Pipeline Visualization

Emits AG-UI protocol events for real-time visualization of the Genesis Pipeline.
Events are streamed to the AG-UI Dojo dashboard via SSE.

Event Types:
- RUN_STARTED: Pipeline begins
- STATE_SNAPSHOT: Current pipeline state
- STATE_DELTA: Incremental updates
- TEXT_MESSAGE: Agent communications
- TOOL_CALL_START: Agent tool usage
- TOOL_CALL_END: Tool completion
- RUN_FINISHED: Pipeline complete
"""

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, AsyncGenerator
from enum import Enum
from datetime import datetime
import aiohttp

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)


class AGUIEventType(Enum):
    """AG-UI Protocol Event Types"""
    RUN_STARTED = "RUN_STARTED"
    RUN_FINISHED = "RUN_FINISHED"
    TEXT_MESSAGE_START = "TEXT_MESSAGE_START"
    TEXT_MESSAGE_CONTENT = "TEXT_MESSAGE_CONTENT"
    TEXT_MESSAGE_END = "TEXT_MESSAGE_END"
    TOOL_CALL_START = "TOOL_CALL_START"
    TOOL_CALL_END = "TOOL_CALL_END"
    STATE_SNAPSHOT = "STATE_SNAPSHOT"
    STATE_DELTA = "STATE_DELTA"
    STEP_STARTED = "STEP_STARTED"
    STEP_FINISHED = "STEP_FINISHED"
    MESSAGES_SNAPSHOT = "MESSAGES_SNAPSHOT"
    RAW = "RAW"
    CUSTOM = "CUSTOM"


@dataclass
class AGUIEvent:
    """Base AG-UI Event structure"""
    type: AGUIEventType
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    run_id: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "timestamp": self.timestamp,
            "runId": self.run_id,
            **self.data
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    def to_sse(self) -> str:
        """Format as Server-Sent Event"""
        return f"data: {self.to_json()}\n\n"


@dataclass
class PipelineState:
    """Current state of the pipeline for STATE_SNAPSHOT events"""
    run_id: str
    status: str
    current_stage: Optional[str] = None
    current_gate: Optional[int] = None
    stages_completed: List[str] = field(default_factory=list)
    gates_passed: List[int] = field(default_factory=list)
    active_agents: List[str] = field(default_factory=list)
    business_name: Optional[str] = None
    live_url: Optional[str] = None
    start_time: Optional[str] = None
    elapsed_seconds: float = 0.0
    errors: List[str] = field(default_factory=list)


class AGUIEmitter:
    """
    AG-UI Event Emitter for Genesis Pipeline

    Emits AG-UI protocol events for real-time visualization.
    Supports SSE streaming to AG-UI Dojo or WebSocket clients.
    """

    def __init__(
        self,
        dashboard_url: str = "http://localhost:3000",
        api_endpoint: str = "/api/events",
        enable_sse: bool = True,
        buffer_size: int = 100
    ):
        """
        Initialize AG-UI Emitter.

        Args:
            dashboard_url: URL of the AG-UI dashboard
            api_endpoint: API endpoint for events
            enable_sse: Enable SSE streaming
            buffer_size: Event buffer size
        """
        self.dashboard_url = dashboard_url
        self.api_endpoint = api_endpoint
        self.enable_sse = enable_sse
        self.buffer_size = buffer_size

        # Event buffer for replay
        self._event_buffer: List[AGUIEvent] = []

        # Active runs tracking
        self._active_runs: Dict[str, PipelineState] = {}

        # SSE clients
        self._sse_clients: List[asyncio.Queue] = []

        logger.info(f"AG-UI Emitter initialized (dashboard: {dashboard_url})")

    # ========== Core Event Emission ==========

    async def emit(self, event: AGUIEvent):
        """Emit an AG-UI event"""
        # Add to buffer
        self._event_buffer.append(event)
        if len(self._event_buffer) > self.buffer_size:
            self._event_buffer.pop(0)

        # Send to SSE clients
        for client_queue in self._sse_clients:
            try:
                await client_queue.put(event)
            except asyncio.QueueFull:
                logger.warning("SSE client queue full, dropping event")

        # Send to dashboard API
        await self._send_to_dashboard(event)

        logger.debug(f"Emitted {event.type.value} for run {event.run_id}")

    async def _send_to_dashboard(self, event: AGUIEvent):
        """Send event to dashboard API"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.dashboard_url}{self.api_endpoint}"
                async with session.post(
                    url,
                    json=event.to_dict(),
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status != 200:
                        logger.warning(f"Dashboard API returned {response.status}")
        except aiohttp.ClientError as e:
            logger.debug(f"Dashboard not available: {e}")
        except Exception as e:
            logger.debug(f"Failed to send to dashboard: {e}")

    # ========== Pipeline Lifecycle Events ==========

    async def emit_run_started(self, run_id: str, business_spec):
        """Emit RUN_STARTED event"""
        state = PipelineState(
            run_id=run_id,
            status="running",
            business_name=getattr(business_spec, 'name', 'Unknown'),
            start_time=datetime.utcnow().isoformat() + "Z"
        )
        self._active_runs[run_id] = state

        event = AGUIEvent(
            type=AGUIEventType.RUN_STARTED,
            run_id=run_id,
            data={
                "threadId": run_id,
                "business": {
                    "name": getattr(business_spec, 'name', 'Unknown'),
                    "type": getattr(business_spec, 'business_type', 'Unknown'),
                    "target_market": getattr(business_spec, 'target_market', 'Unknown')
                }
            }
        )
        await self.emit(event)

        # Also emit initial state snapshot
        await self.emit_state_snapshot(run_id)

    async def emit_run_finished(self, run_id: str, pipeline_run):
        """Emit RUN_FINISHED event"""
        state = self._active_runs.get(run_id)
        if state:
            state.status = pipeline_run.status.value
            state.live_url = pipeline_run.live_url

        event = AGUIEvent(
            type=AGUIEventType.RUN_FINISHED,
            run_id=run_id,
            data={
                "threadId": run_id,
                "status": pipeline_run.status.value,
                "live_url": pipeline_run.live_url,
                "duration_seconds": pipeline_run.duration,
                "stages_completed": len(pipeline_run.stage_outputs),
                "gates_passed": sum(1 for g in pipeline_run.gate_evaluations.values() if g.result.value == "pass"),
                "errors": pipeline_run.errors
            }
        )
        await self.emit(event)

        # Cleanup
        if run_id in self._active_runs:
            del self._active_runs[run_id]

    # ========== Stage Events ==========

    async def emit_stage_started(self, run_id: str, stage):
        """Emit STEP_STARTED event for a pipeline stage"""
        state = self._active_runs.get(run_id)
        if state:
            state.current_stage = stage.name
            state.current_gate = stage.value

        event = AGUIEvent(
            type=AGUIEventType.STEP_STARTED,
            run_id=run_id,
            data={
                "stepName": stage.name,
                "gate": stage.value,
                "message": f"Starting stage: {stage.name} (Gate {stage.value})"
            }
        )
        await self.emit(event)

        # Emit state delta
        await self.emit_state_delta(run_id, {
            "current_stage": stage.name,
            "current_gate": stage.value
        })

    async def emit_stage_completed(self, run_id: str, stage, output):
        """Emit STEP_FINISHED event for a pipeline stage"""
        state = self._active_runs.get(run_id)
        if state:
            state.stages_completed.append(stage.name)

        event = AGUIEvent(
            type=AGUIEventType.STEP_FINISHED,
            run_id=run_id,
            data={
                "stepName": stage.name,
                "gate": stage.value,
                "success": output.success,
                "score": output.score,
                "duration_seconds": output.duration_seconds,
                "message": f"Stage {stage.name} completed (score: {output.score})"
            }
        )
        await self.emit(event)

    # ========== Gate Events ==========

    async def emit_gate_result(self, run_id: str, gate_evaluation):
        """Emit CUSTOM event for gate result"""
        state = self._active_runs.get(run_id)
        if state and gate_evaluation.result.value == "pass":
            state.gates_passed.append(gate_evaluation.gate)

        event = AGUIEvent(
            type=AGUIEventType.CUSTOM,
            run_id=run_id,
            data={
                "eventName": "GATE_RESULT",
                "gate": gate_evaluation.gate,
                "result": gate_evaluation.result.value,
                "score": gate_evaluation.score,
                "feedback": gate_evaluation.feedback,
                "evaluator": gate_evaluation.evaluator
            }
        )
        await self.emit(event)

        # Also emit as text message
        await self.emit_text_message(
            run_id=run_id,
            agent="Emily",
            message=f"Gate {gate_evaluation.gate}: {gate_evaluation.result.value.upper()} (score: {gate_evaluation.score:.1f})"
        )

    # ========== Agent Events ==========

    async def emit_agent_action(self, run_id: str, agent: str, action: str, details: Optional[Dict] = None):
        """Emit agent action as TOOL_CALL events"""
        tool_call_id = str(uuid.uuid4())[:8]

        state = self._active_runs.get(run_id)
        if state and agent not in state.active_agents:
            state.active_agents.append(agent)

        # Tool call start
        start_event = AGUIEvent(
            type=AGUIEventType.TOOL_CALL_START,
            run_id=run_id,
            data={
                "toolCallId": tool_call_id,
                "toolCallName": action,
                "parentMessageId": run_id,
                "agent": agent,
                "args": details or {}
            }
        )
        await self.emit(start_event)

        return tool_call_id

    async def emit_agent_action_complete(
        self,
        run_id: str,
        tool_call_id: str,
        agent: str,
        result: Any
    ):
        """Emit tool call end"""
        state = self._active_runs.get(run_id)
        if state and agent in state.active_agents:
            state.active_agents.remove(agent)

        event = AGUIEvent(
            type=AGUIEventType.TOOL_CALL_END,
            run_id=run_id,
            data={
                "toolCallId": tool_call_id,
                "result": str(result) if result else "completed"
            }
        )
        await self.emit(event)

    # ========== Text Message Events ==========

    async def emit_text_message(self, run_id: str, agent: str, message: str):
        """Emit a text message from an agent"""
        message_id = str(uuid.uuid4())[:8]

        # Start
        start_event = AGUIEvent(
            type=AGUIEventType.TEXT_MESSAGE_START,
            run_id=run_id,
            data={
                "messageId": message_id,
                "role": "assistant",
                "agent": agent
            }
        )
        await self.emit(start_event)

        # Content
        content_event = AGUIEvent(
            type=AGUIEventType.TEXT_MESSAGE_CONTENT,
            run_id=run_id,
            data={
                "messageId": message_id,
                "delta": message
            }
        )
        await self.emit(content_event)

        # End
        end_event = AGUIEvent(
            type=AGUIEventType.TEXT_MESSAGE_END,
            run_id=run_id,
            data={
                "messageId": message_id
            }
        )
        await self.emit(end_event)

    # ========== State Events ==========

    async def emit_state_snapshot(self, run_id: str):
        """Emit complete state snapshot"""
        state = self._active_runs.get(run_id)
        if not state:
            return

        # Calculate elapsed time
        if state.start_time:
            try:
                start = datetime.fromisoformat(state.start_time.replace("Z", "+00:00"))
                state.elapsed_seconds = (datetime.utcnow() - start.replace(tzinfo=None)).total_seconds()
            except:
                pass

        event = AGUIEvent(
            type=AGUIEventType.STATE_SNAPSHOT,
            run_id=run_id,
            data={
                "state": {
                    "run_id": state.run_id,
                    "status": state.status,
                    "current_stage": state.current_stage,
                    "current_gate": state.current_gate,
                    "stages_completed": state.stages_completed,
                    "gates_passed": state.gates_passed,
                    "active_agents": state.active_agents,
                    "business_name": state.business_name,
                    "live_url": state.live_url,
                    "elapsed_seconds": state.elapsed_seconds,
                    "errors": state.errors
                }
            }
        )
        await self.emit(event)

    async def emit_state_delta(self, run_id: str, changes: Dict[str, Any]):
        """Emit incremental state update (JSON Patch style)"""
        event = AGUIEvent(
            type=AGUIEventType.STATE_DELTA,
            run_id=run_id,
            data={
                "delta": [
                    {"op": "replace", "path": f"/{key}", "value": value}
                    for key, value in changes.items()
                ]
            }
        )
        await self.emit(event)

    # ========== SSE Streaming ==========

    async def create_sse_stream(self) -> AsyncGenerator[str, None]:
        """Create an SSE stream for a client"""
        queue = asyncio.Queue(maxsize=100)
        self._sse_clients.append(queue)

        try:
            # Send buffered events first
            for event in self._event_buffer:
                yield event.to_sse()

            # Stream new events
            while True:
                event = await queue.get()
                yield event.to_sse()

        finally:
            self._sse_clients.remove(queue)

    def get_active_runs(self) -> Dict[str, PipelineState]:
        """Get all active pipeline runs"""
        return self._active_runs.copy()

    def get_event_buffer(self) -> List[AGUIEvent]:
        """Get buffered events"""
        return self._event_buffer.copy()


# ========== FastAPI Integration ==========

def create_agui_router():
    """Create FastAPI router for AG-UI endpoints"""
    from fastapi import APIRouter, Request
    from fastapi.responses import StreamingResponse

    router = APIRouter(prefix="/agui", tags=["AG-UI"])
    emitter = AGUIEmitter()

    @router.get("/events")
    async def sse_events(request: Request):
        """SSE endpoint for AG-UI events"""
        async def event_generator():
            async for event in emitter.create_sse_stream():
                if await request.is_disconnected():
                    break
                yield event

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*"
            }
        )

    @router.get("/state")
    async def get_state():
        """Get current pipeline state"""
        return {
            "active_runs": {
                run_id: {
                    "status": state.status,
                    "current_stage": state.current_stage,
                    "business_name": state.business_name,
                    "elapsed_seconds": state.elapsed_seconds
                }
                for run_id, state in emitter.get_active_runs().items()
            }
        }

    @router.get("/buffer")
    async def get_buffer():
        """Get event buffer for replay"""
        return {
            "events": [e.to_dict() for e in emitter.get_event_buffer()]
        }

    return router, emitter


# ========== Singleton ==========

_global_emitter: Optional[AGUIEmitter] = None


def get_agui_emitter() -> AGUIEmitter:
    """Get or create global AG-UI emitter"""
    global _global_emitter
    if _global_emitter is None:
        _global_emitter = AGUIEmitter()
    return _global_emitter


# ========== Testing ==========

if __name__ == "__main__":
    import asyncio

    async def test_emitter():
        emitter = AGUIEmitter()

        # Simulate pipeline run
        run_id = "test-123"

        # Create mock business spec
        class MockSpec:
            name = "test-business"
            business_type = "saas"
            target_market = "developers"

        # Emit run started
        await emitter.emit_run_started(run_id, MockSpec())

        # Emit stage events
        class MockStage:
            name = "RESEARCH"
            value = 1

        await emitter.emit_stage_started(run_id, MockStage())

        # Emit agent action
        tool_id = await emitter.emit_agent_action(
            run_id, "Morgan", "analyze_market",
            {"target": "developers"}
        )
        await asyncio.sleep(0.1)
        await emitter.emit_agent_action_complete(run_id, tool_id, "Morgan", "Analysis complete")

        # Emit text message
        await emitter.emit_text_message(run_id, "Emily", "Gate 1 evaluation in progress...")

        # Emit state snapshot
        await emitter.emit_state_snapshot(run_id)

        print(f"Emitted {len(emitter.get_event_buffer())} events")

    asyncio.run(test_emitter())
