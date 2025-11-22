from infrastructure.multimodal_eval.alignment import (
    ModelPrediction,
    OddOneOutSample,
    VisualQAAlignmentPilot,
)


class StubModel:
    def __init__(self, predictions):
        self._predictions = predictions

    def predict(self, sample: OddOneOutSample) -> ModelPrediction:
        return self._predictions[sample.sample_id]


def test_visual_alignment_pilot_reduces_false_positives_and_escalates_uncertainty():
    samples = [
        OddOneOutSample(
            sample_id="hero_image",
            candidates=("ok", "ok", "odd"),
            correct_index=2,
        ),
        OddOneOutSample(
            sample_id="product_shot",
            candidates=("ok", "odd", "ok"),
            correct_index=1,
        ),
    ]

    base_preds = {
        "hero_image": ModelPrediction([0.6, 0.3, 0.1]),  # wrong (predict index 0)
        "product_shot": ModelPrediction([0.2, 0.7, 0.1]),  # correct
        "uncertain": ModelPrediction([0.34, 0.33, 0.33]),
    }

    aligned_preds = {
        "hero_image": ModelPrediction([0.1, 0.2, 0.7]),  # corrected
        "product_shot": ModelPrediction([0.2, 0.75, 0.05]),  # remains correct
        "uncertain": ModelPrediction([0.35, 0.34, 0.31]),
    }

    pilot = VisualQAAlignmentPilot(
        base_model=StubModel(base_preds),
        aligned_model=StubModel(aligned_preds),
        escalation_threshold=0.5,
    )

    report = pilot.run_evaluation(samples)
    assert report.base_false_positives == 1
    assert report.aligned_false_positives == 0
    assert report.false_positive_reduction == 1.0

    uncertain_sample = OddOneOutSample("uncertain", ("a", "b", "c"), correct_index=0)
    score = pilot.score_sample(uncertain_sample)
    assert score["escalate"] is True

