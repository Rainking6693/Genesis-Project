import pytest

from infrastructure.hallucination_control import BinaryRARVerifier


def test_binary_rar_verifier_supports_grounded_response():
    verifier = BinaryRARVerifier()
    response = (
        "According to IDC, global AI spending is on track to hit $500 billion by 2025 "
        "with North America carrying roughly thirty-eight percent of budgets. Western "
        "Europe follows at twenty-nine percent as analytics and customer service "
        "automation drive deployments."
    )
    result = verifier.verify("AI spending projections 2025", response)
    assert result["reward"] == 1.0
    assert result["status"] == "supported"
    assert result["coverage"] >= 0.25
    assert result["supporting_docs"]


def test_binary_rar_verifier_flags_unsupported_response():
    verifier = BinaryRARVerifier()
    response = (
        "Mars tourism already produces fifty billion dollars in revenue with no risks "
        "or supply chain issues, and every country subsidizes interplanetary flights. "
        "No supporting data is required because everyone knows space resorts exist."
    )
    result = verifier.verify("AI spending projections 2025", response)
    assert result["reward"] == 0.0
    assert result["status"] == "unsupported"
    assert result["coverage"] < 0.25
