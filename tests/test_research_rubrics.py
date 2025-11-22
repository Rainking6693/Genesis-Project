import pytest

from infrastructure.rubrics import (
    ResearchRubricDataset,
    RubricEvaluationHook,
    apply_research_rubrics_to_dag,
)
from infrastructure.task_dag import TaskDAG, Task


def _build_test_dag() -> TaskDAG:
    dag = TaskDAG()
    tasks = [
        Task(task_id="research-1", task_type="research", description="Market scan"),
        Task(task_id="analytics-1", task_type="analytics", description="Deep analysis"),
        Task(task_id="support-1", task_type="support", description="Triage request"),
        Task(task_id="generic-1", task_type="generic", description="Utility task"),
    ]
    for task in tasks:
        dag.add_task(task)
    dag.add_dependency("research-1", "analytics-1")
    dag.add_dependency("research-1", "support-1")
    return dag


def test_dataset_loads_sample_file(tmp_path, monkeypatch):
    dataset_path = tmp_path / "rubrics.json"
    dataset_path.write_text(
        """{
        "rubrics": [{
            "id": "demo",
            "dimension": "breadth",
            "criteria": [{
                "id": "crit",
                "description": "demo",
                "weight": 1.0,
                "evaluation_prompt": "score"
            }]
        }]
    }""",
        encoding="utf-8",
    )
    dataset = ResearchRubricDataset(dataset_path=dataset_path)
    crit = dataset.get_criteria("breadth")
    assert len(crit) == 1
    assert crit[0].criterion_id == "crit"


def test_apply_research_rubrics_to_dag_assigns_metadata():
    dag = _build_test_dag()
    dataset = ResearchRubricDataset()

    assignments = apply_research_rubrics_to_dag(dag, dataset=dataset, max_criteria_per_dimension=1)

    # Research node should get both breadth and depth criteria
    research_meta = dag.tasks["research-1"].metadata["rubrics"]
    assert set(research_meta["dimensions"]) == {"breadth", "depth"}
    assert len(research_meta["criteria"]) == 2

    # Analytics node inherits depth-only rubric
    analytics_meta = dag.tasks["analytics-1"].metadata["rubrics"]
    assert analytics_meta["dimensions"] == ["depth"]

    # Support task should capture ambiguity dimension
    support_meta = dag.tasks["support-1"].metadata["rubrics"]
    assert support_meta["dimensions"] == ["ambiguity"]

    # Generic task does not match any rubric category
    assert "generic-1" not in assignments


def test_rubric_evaluator_scores_outputs():
    dag = _build_test_dag()
    dataset = ResearchRubricDataset()
    apply_research_rubrics_to_dag(dag, dataset=dataset, max_criteria_per_dimension=1)

    outputs = {
        "research-1": (
            "Market A, Market B, and Market C each show 12%+ CAGR. "
            "Because survey data from 2,400 SMBs highlights retention risks, "
            "we recommend diversified pricing plus partner marketplaces. "
            "We assume compliance approvals within 60 days and track mitigation dashboards weekly."
        ),
        "analytics-1": (
            "Data shows 48% conversion when onboarding playbooks cite counterexamples. "
            "Because of historical risk spikes in Q4, we instrument telemetry due to finance audits."
        ),
        "support-1": (
            "We assume customers may misstate refunds; highlight risks, set alerts, and monitor anomalies."
        ),
    }

    evaluator = RubricEvaluationHook(min_tokens=5)
    report = evaluator.evaluate(dag, task_outputs=outputs)

    assert report["overall_score"] is not None
    assert report["coverage_ratio"] > 0.5
    research_report = report["task_reports"]["research-1"]["criteria"]
    assert all(criterion["status"] in {"satisfied", "partial"} for criterion in research_report)


def test_rubric_evaluator_handles_missing_outputs():
    dag = _build_test_dag()
    dataset = ResearchRubricDataset()
    apply_research_rubrics_to_dag(dag, dataset=dataset, max_criteria_per_dimension=1)

    evaluator = RubricEvaluationHook(min_tokens=5)
    report = evaluator.evaluate(dag, task_outputs={})

    assert report["overall_score"] is None
    assert report["coverage_ratio"] == 0.0
