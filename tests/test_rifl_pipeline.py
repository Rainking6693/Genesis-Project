from infrastructure.rifl import RIFLPromptEvaluator


def test_rifl_pass_when_keywords_and_risks_present():
    evaluator = RIFLPromptEvaluator()
    diagnosis = "Service crashes because cache layer misses and retries cause timeouts."
    improved_code = """
def handle_request():
    cache_result = cache.get("key")
    if cache_result is None:
        cache.set("key", compute_value())
    try:
        return cache_result
    except Exception:
        logger.warning("Fallback triggered")
        return compute_value()
"""
    result = evaluator.evaluate(diagnosis=diagnosis, improvement_type="optimization", improved_code=improved_code)
    assert result["verdict"] == "pass"
    assert result["reward"] == 1.0


def test_rifl_partial_when_only_logger_present():
    evaluator = RIFLPromptEvaluator()
    diagnosis = "Needs better error handling for payment failures"
    improved_code = "logger.error('fail')\nraise Exception('fail')"
    result = evaluator.evaluate(diagnosis, "error_handling", improved_code)
    assert result["verdict"] == "partial"
    assert result["reward"] == evaluator.partial_reward


def test_rifl_fail_on_todo():
    evaluator = RIFLPromptEvaluator()
    result = evaluator.evaluate("optimize memory", "optimization", "def foo():\n    # TODO: implement\n    pass")
    assert result["verdict"] == "fail"
    assert result["reward"] == 0.0
