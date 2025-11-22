"""
Tests for AgentEvolver Coverage Tracker

Tests coverage metrics and gap identification.

Author: Nova (Full-Stack Specialist)
Date: 2025-11-18
"""

import pytest
from infrastructure.agentevolver.coverage_tracker import (
    CoverageTracker,
    CoverageMetrics,
)
from infrastructure.agentevolver.config import BUSINESS_TYPES, INDUSTRY_DOMAINS


class TestCoverageMetrics:
    """Tests for CoverageMetrics."""

    def test_creation(self):
        """Test metrics creation."""
        metrics = CoverageMetrics(category="saas")

        assert metrics.category == "saas"
        assert metrics.exploration_count == 0
        assert metrics.unique_ideas == 0

    def test_to_dict(self):
        """Test conversion to dict."""
        metrics = CoverageMetrics(
            category="saas",
            exploration_count=5,
            unique_ideas=3,
            avg_quality_score=85.0,
        )

        d = metrics.to_dict()

        assert d["category"] == "saas"
        assert d["exploration_count"] == 5


class TestCoverageTracker:
    """Tests for CoverageTracker."""

    def test_initialization(self):
        """Test tracker initialization."""
        tracker = CoverageTracker()

        assert len(tracker.business_type_metrics) == len(BUSINESS_TYPES)
        assert len(tracker.domain_metrics) == len(INDUSTRY_DOMAINS)

    def test_record_exploration(self):
        """Test recording exploration."""
        tracker = CoverageTracker()

        tracker.record_exploration("saas", "healthcare", quality_score=85.0)

        metrics = tracker.business_type_metrics["saas"]
        assert metrics.exploration_count == 1
        assert metrics.unique_ideas == 1

    def test_business_type_coverage(self):
        """Test business type coverage computation."""
        tracker = CoverageTracker()

        # Initially zero coverage
        assert tracker.get_business_type_coverage() == 0.0

        # Explore one type
        tracker.record_exploration("saas", "healthcare")

        coverage = tracker.get_business_type_coverage()
        assert 0.0 < coverage < 1.0

    def test_domain_coverage(self):
        """Test domain coverage computation."""
        tracker = CoverageTracker()

        # Initially zero coverage
        assert tracker.get_domain_coverage() == 0.0

        # Explore one domain
        tracker.record_exploration("saas", "healthcare")

        coverage = tracker.get_domain_coverage()
        assert 0.0 < coverage < 1.0

    def test_overall_coverage(self):
        """Test overall coverage computation."""
        tracker = CoverageTracker()

        # Initially zero
        assert tracker.get_overall_coverage() == 0.0

        # Explore several
        tracker.record_exploration("saas", "healthcare")
        tracker.record_exploration("ecommerce", "retail")

        coverage = tracker.get_overall_coverage()
        assert 0.0 < coverage < 1.0

    def test_get_unexplored_business_types(self):
        """Test getting unexplored business types."""
        tracker = CoverageTracker()

        # Initially all unexplored
        unexplored = tracker.get_unexplored_business_types()
        assert len(unexplored) == len(BUSINESS_TYPES)

        # Explore one
        tracker.record_exploration("saas", "healthcare")

        unexplored = tracker.get_unexplored_business_types()
        assert "saas" not in unexplored
        assert len(unexplored) == len(BUSINESS_TYPES) - 1

    def test_get_unexplored_domains(self):
        """Test getting unexplored domains."""
        tracker = CoverageTracker()

        # Initially all unexplored
        unexplored = tracker.get_unexplored_domains()
        assert len(unexplored) == len(INDUSTRY_DOMAINS)

        # Explore one
        tracker.record_exploration("saas", "healthcare")

        unexplored = tracker.get_unexplored_domains()
        assert "healthcare" not in unexplored

    def test_get_coverage_status(self):
        """Test coverage status reporting."""
        tracker = CoverageTracker()

        status = tracker.get_coverage_status()

        assert "business_type_coverage" in status
        assert "domain_coverage" in status
        assert "overall_coverage" in status
        assert "coverage_target" in status

    def test_high_quality_coverage(self):
        """Test high-quality coverage computation."""
        tracker = CoverageTracker()

        # Add high-quality exploration
        tracker.record_exploration("saas", "healthcare", quality_score=95.0)

        high_quality = tracker.get_high_quality_coverage(quality_threshold=80.0)

        assert 0.0 <= high_quality <= 1.0

    def test_generate_report(self):
        """Test report generation."""
        tracker = CoverageTracker()

        # Add some explorations
        tracker.record_exploration("saas", "healthcare", quality_score=85.0)
        tracker.record_exploration("ecommerce", "retail", quality_score=90.0)

        report = tracker.generate_report()

        assert report is not None
        assert report.overall_business_type_coverage > 0.0
        assert report.overall_domain_coverage > 0.0
        assert "unexplored_business_types" in report.gaps

    def test_underexplored_identification(self):
        """Test identifying underexplored categories."""
        tracker = CoverageTracker()

        # Explore some types minimally
        tracker.record_exploration("saas", "healthcare")
        tracker.record_exploration("ecommerce", "retail")
        tracker.record_exploration("saas", "fintech")

        underexplored = tracker.get_underexplored_business_types(threshold=2)

        # saas has been explored 2 times, ecommerce 1 time
        assert "ecommerce" in underexplored
