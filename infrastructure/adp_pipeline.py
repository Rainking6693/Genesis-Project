"""
ADP Pipeline - Adaptive Data Processing Pipeline.

Provides adaptive data processing with:
- Dynamic pipeline configuration
- Feedback-driven adaptation
- Multi-stage processing
- Error recovery
- Performance optimization
"""

import logging
import time
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ProcessingStage(Enum):
    """Stages in the processing pipeline."""
    INPUT = "input"
    TRANSFORM = "transform"
    VALIDATE = "validate"
    ENRICH = "enrich"
    OUTPUT = "output"


@dataclass
class StageResult:
    """Result from a processing stage."""
    stage: ProcessingStage
    success: bool
    data: Any
    duration_ms: float
    error: Optional[str] = None
    adaptations_applied: List[str] = field(default_factory=list)


@dataclass
class PipelineResult:
    """Complete pipeline execution result."""
    pipeline_id: str
    success: bool
    final_output: Any
    stages: List[StageResult] = field(default_factory=list)
    total_duration_ms: float = 0.0
    adaptations_triggered: int = 0
    feedback_score: float = 0.0


class ADPPipeline:
    """
    Adaptive Data Processing Pipeline.

    Features:
    - Configurable processing stages
    - Runtime adaptation based on feedback
    - Automatic error recovery
    - Performance monitoring
    - Feedback loop integration
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the ADP Pipeline.

        Args:
            config: Pipeline configuration
        """
        self.config = config or {}
        self._pipeline_counter = 0
        self._stage_handlers: Dict[ProcessingStage, Callable] = {}
        self._adaptation_rules: List[Dict[str, Any]] = []
        self._feedback_history: List[Dict[str, Any]] = []
        self._performance_metrics: Dict[str, List[float]] = {}

        # Set up default handlers
        self._setup_default_handlers()

    def _setup_default_handlers(self):
        """Set up default stage handlers."""
        self._stage_handlers = {
            ProcessingStage.INPUT: self._default_input_handler,
            ProcessingStage.TRANSFORM: self._default_transform_handler,
            ProcessingStage.VALIDATE: self._default_validate_handler,
            ProcessingStage.ENRICH: self._default_enrich_handler,
            ProcessingStage.OUTPUT: self._default_output_handler,
        }

    def process(
        self,
        data: Any,
        stages: Optional[List[ProcessingStage]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> PipelineResult:
        """
        Process data through the pipeline.

        Args:
            data: Input data to process
            stages: Specific stages to run (all by default)
            context: Additional processing context

        Returns:
            PipelineResult with processed data
        """
        self._pipeline_counter += 1
        pipeline_id = f"ADP-{self._pipeline_counter:05d}"

        stages = stages or list(ProcessingStage)
        context = context or {}

        result = PipelineResult(
            pipeline_id=pipeline_id,
            success=True,
            final_output=None
        )

        start_time = time.time()
        current_data = data

        for stage in stages:
            stage_start = time.time()

            try:
                # Check for adaptations
                adaptations = self._check_adaptations(stage, current_data, context)
                if adaptations:
                    result.adaptations_triggered += len(adaptations)

                # Process stage
                handler = self._stage_handlers.get(stage, self._default_passthrough)
                current_data = handler(current_data, context)

                stage_result = StageResult(
                    stage=stage,
                    success=True,
                    data=current_data,
                    duration_ms=(time.time() - stage_start) * 1000,
                    adaptations_applied=adaptations
                )

            except Exception as e:
                logger.warning(f"Stage {stage.value} failed: {e}")

                # Try recovery
                recovered = self._attempt_recovery(stage, current_data, e)
                if recovered is not None:
                    current_data = recovered
                    stage_result = StageResult(
                        stage=stage,
                        success=True,
                        data=current_data,
                        duration_ms=(time.time() - stage_start) * 1000,
                        adaptations_applied=["recovery"]
                    )
                else:
                    stage_result = StageResult(
                        stage=stage,
                        success=False,
                        data=current_data,
                        duration_ms=(time.time() - stage_start) * 1000,
                        error=str(e)
                    )
                    result.success = False

            result.stages.append(stage_result)

            # Track performance
            self._track_performance(stage, stage_result.duration_ms)

            if not stage_result.success:
                break

        result.final_output = current_data
        result.total_duration_ms = (time.time() - start_time) * 1000

        logger.info(
            f"Pipeline {pipeline_id} completed: "
            f"{'SUCCESS' if result.success else 'FAILED'} "
            f"in {result.total_duration_ms:.1f}ms"
        )

        return result

    def _default_input_handler(self, data: Any, context: Dict[str, Any]) -> Any:
        """Default input stage handler."""
        # Validate input type
        if data is None:
            raise ValueError("Input data cannot be None")
        return data

    def _default_transform_handler(self, data: Any, context: Dict[str, Any]) -> Any:
        """Default transform stage handler."""
        # Apply basic transformations
        if isinstance(data, str):
            return data.strip()
        elif isinstance(data, dict):
            # Remove None values
            return {k: v for k, v in data.items() if v is not None}
        return data

    def _default_validate_handler(self, data: Any, context: Dict[str, Any]) -> Any:
        """Default validation stage handler."""
        # Basic validation
        if data is None:
            raise ValueError("Data validation failed: None value")
        if isinstance(data, str) and len(data) == 0:
            raise ValueError("Data validation failed: Empty string")
        return data

    def _default_enrich_handler(self, data: Any, context: Dict[str, Any]) -> Any:
        """Default enrichment stage handler."""
        # Add metadata
        if isinstance(data, dict):
            data["_enriched"] = True
            data["_pipeline_timestamp"] = time.time()
        return data

    def _default_output_handler(self, data: Any, context: Dict[str, Any]) -> Any:
        """Default output stage handler."""
        return data

    def _default_passthrough(self, data: Any, context: Dict[str, Any]) -> Any:
        """Passthrough handler for unknown stages."""
        return data

    def _check_adaptations(
        self,
        stage: ProcessingStage,
        data: Any,
        context: Dict[str, Any]
    ) -> List[str]:
        """Check and apply adaptations for a stage."""
        adaptations = []

        for rule in self._adaptation_rules:
            if rule.get("stage") == stage:
                condition = rule.get("condition", lambda d, c: False)
                if condition(data, context):
                    action = rule.get("action")
                    if action:
                        action(data, context)
                        adaptations.append(rule.get("name", "unnamed"))

        return adaptations

    def _attempt_recovery(
        self,
        stage: ProcessingStage,
        data: Any,
        error: Exception
    ) -> Optional[Any]:
        """Attempt to recover from a stage failure."""
        error_type = type(error).__name__

        # Basic recovery strategies
        if error_type == "ValueError":
            if isinstance(data, str):
                return data if data else "default"
            elif isinstance(data, dict):
                return {k: v if v is not None else "" for k, v in data.items()}

        elif error_type == "TypeError":
            # Try to convert to expected type
            try:
                return str(data)
            except:
                pass

        return None

    def _track_performance(self, stage: ProcessingStage, duration_ms: float):
        """Track performance metrics for a stage."""
        key = stage.value
        if key not in self._performance_metrics:
            self._performance_metrics[key] = []

        self._performance_metrics[key].append(duration_ms)

        # Keep only last 100 measurements
        if len(self._performance_metrics[key]) > 100:
            self._performance_metrics[key] = self._performance_metrics[key][-100:]

    def process_feedback(
        self,
        pipeline_id: str,
        feedback: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process feedback for pipeline improvement.

        Args:
            pipeline_id: ID of the pipeline run
            feedback: Feedback data

        Returns:
            Dict with feedback processing result
        """
        self._feedback_history.append({
            "pipeline_id": pipeline_id,
            "feedback": feedback,
            "timestamp": time.time()
        })

        # Analyze feedback for adaptations
        adaptations_suggested = []

        success_rate = feedback.get("success_rate", 1.0)
        if success_rate < 0.8:
            adaptations_suggested.append("increase_validation")

        latency = feedback.get("latency_ms", 0)
        if latency > 1000:
            adaptations_suggested.append("optimize_stages")

        quality_score = feedback.get("quality_score", 1.0)
        if quality_score < 0.7:
            adaptations_suggested.append("enhance_enrichment")

        logger.info(
            f"Feedback processed for {pipeline_id}: "
            f"{len(adaptations_suggested)} adaptations suggested"
        )

        return {
            "processed": True,
            "adaptations_suggested": adaptations_suggested,
            "feedback_count": len(self._feedback_history)
        }

    def add_adaptation_rule(
        self,
        name: str,
        stage: ProcessingStage,
        condition: Callable[[Any, Dict], bool],
        action: Callable[[Any, Dict], None]
    ):
        """
        Add an adaptation rule.

        Args:
            name: Rule name
            stage: Stage to apply rule
            condition: Condition function
            action: Action to take when condition is met
        """
        self._adaptation_rules.append({
            "name": name,
            "stage": stage,
            "condition": condition,
            "action": action
        })

    def register_handler(
        self,
        stage: ProcessingStage,
        handler: Callable[[Any, Dict], Any]
    ):
        """
        Register a custom handler for a stage.

        Args:
            stage: Stage to handle
            handler: Handler function
        """
        self._stage_handlers[stage] = handler

    def get_performance_stats(self) -> Dict[str, Dict[str, float]]:
        """Get performance statistics for all stages."""
        stats = {}

        for stage, durations in self._performance_metrics.items():
            if durations:
                stats[stage] = {
                    "avg_ms": sum(durations) / len(durations),
                    "min_ms": min(durations),
                    "max_ms": max(durations),
                    "count": len(durations)
                }

        return stats

    def get_feedback_summary(self) -> Dict[str, Any]:
        """Get summary of feedback received."""
        if not self._feedback_history:
            return {"total_feedback": 0}

        return {
            "total_feedback": len(self._feedback_history),
            "latest_timestamp": self._feedback_history[-1]["timestamp"],
            "unique_pipelines": len(set(
                f["pipeline_id"] for f in self._feedback_history
            ))
        }


# Module-level factory function
def get_adp_pipeline(config: Optional[Dict[str, Any]] = None) -> ADPPipeline:
    """Get an ADP Pipeline instance."""
    return ADPPipeline(config=config)
