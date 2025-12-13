"""
Automated A/B Testing Deployer

Deploys 2 variants per business for performance comparison:
- Variant A: Baseline version
- Variant B: Optimized version (with advanced features)

Features:
- Automated dual deployment
- Traffic splitting (50/50)
- Metrics tracking and comparison
- Performance analysis

Expected Impact: Data-driven optimization decisions
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class DeploymentVariant:
    """Single deployment variant"""
    variant_id: str
    variant_name: str  # "A" or "B"
    business_id: str
    deployment_url: str
    build_path: str
    features_enabled: List[str]
    deployed_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    status: str = "active"


@dataclass
class ABTestResult:
    """A/B test results"""
    test_id: str
    business_id: str
    variant_a: DeploymentVariant
    variant_b: DeploymentVariant
    traffic_split: float = 0.5  # 50/50 by default
    metrics_endpoint: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class ABTestingDeployer:
    """
    Automated A/B testing deployment system.
    
    Deploys 2 variants of each business for performance comparison:
    - Variant A: Baseline (standard features)
    - Variant B: Optimized (advanced features enabled)
    """
    
    def __init__(
        self,
        deployment_base_url: str = "http://localhost",
        metrics_dir: str = "data/ab_testing"
    ):
        """
        Initialize A/B testing deployer.
        
        Args:
            deployment_base_url: Base URL for deployments
            metrics_dir: Directory to store metrics
        """
        self.deployment_base_url = deployment_base_url
        self.metrics_dir = Path(metrics_dir)
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        
        # Track active tests
        self.active_tests: Dict[str, ABTestResult] = {}
        
        logger.info(f"ABTestingDeployer initialized: base_url={deployment_base_url}")
    
    async def deploy_variants(
        self,
        business_id: str,
        primary_build: Dict[str, Any],
        variant_build: Optional[Dict[str, Any]] = None,
        split_ratio: float = 0.5
    ) -> ABTestResult:
        """
        Deploy A/B test variants for a business.
        
        Args:
            business_id: Unique business identifier
            primary_build: Primary build configuration
            variant_build: Variant build configuration (optional, defaults to primary)
            split_ratio: Traffic split ratio (0.5 = 50/50)
        
        Returns:
            ABTestResult with deployment details
        """
        test_id = f"ab_{uuid4().hex[:12]}"
        
        logger.info(f"Deploying A/B test variants for business: {business_id}")
        
        # Deploy Variant A (Baseline)
        variant_a = await self._deploy_variant(
            business_id=business_id,
            variant_name="A",
            build_config=primary_build,
            features=["standard"]
        )
        
        # Deploy Variant B (Optimized)
        variant_b_config = variant_build if variant_build else primary_build
        variant_b = await self._deploy_variant(
            business_id=business_id,
            variant_name="B",
            build_config=variant_b_config,
            features=["multi_llm", "pipelex", "microadapt", "spice", "voix"]
        )
        
        # Configure traffic splitting
        await self._configure_traffic_split(
            variant_a.deployment_url,
            variant_b.deployment_url,
            split_ratio=split_ratio
        )
        
        # Create test result
        test_result = ABTestResult(
            test_id=test_id,
            business_id=business_id,
            variant_a=variant_a,
            variant_b=variant_b,
            traffic_split=split_ratio,
            metrics_endpoint=f"/api/metrics/{test_id}"
        )
        
        # Save test configuration
        await self._save_test_config(test_result)
        
        # Track active test
        self.active_tests[test_id] = test_result
        
        logger.info(
            f"✅ A/B test deployed: {test_id}\n"
            f"   Variant A: {variant_a.deployment_url}\n"
            f"   Variant B: {variant_b.deployment_url}\n"
            f"   Traffic split: {split_ratio*100:.0f}% / {(1-split_ratio)*100:.0f}%"
        )
        
        return test_result
    
    async def _deploy_variant(
        self,
        business_id: str,
        variant_name: str,
        build_config: Dict[str, Any],
        features: List[str]
    ) -> DeploymentVariant:
        """
        Deploy a single variant.
        
        Args:
            business_id: Business identifier
            variant_name: "A" or "B"
            build_config: Build configuration
            features: List of enabled features
        
        Returns:
            DeploymentVariant instance
        """
        variant_id = f"{business_id}-{variant_name.lower()}-{uuid4().hex[:8]}"
        
        # Simulate deployment (in production, would deploy to actual infrastructure)
        deployment_url = f"{self.deployment_base_url}/{variant_id}"
        build_path = build_config.get("output_dir", f"businesses/{business_id}")
        
        logger.info(f"Deploying variant {variant_name} to {deployment_url}")
        
        # In production, this would:
        # 1. Build Docker container
        # 2. Deploy to Kubernetes/Cloud Run
        # 3. Configure load balancer
        # 4. Setup monitoring
        
        # Simulate deployment delay
        await asyncio.sleep(0.1)
        
        variant = DeploymentVariant(
            variant_id=variant_id,
            variant_name=variant_name,
            business_id=business_id,
            deployment_url=deployment_url,
            build_path=build_path,
            features_enabled=features
        )
        
        logger.info(f"✅ Variant {variant_name} deployed: {deployment_url}")
        
        return variant
    
    async def _configure_traffic_split(
        self,
        variant_a_url: str,
        variant_b_url: str,
        split_ratio: float
    ) -> None:
        """
        Configure traffic splitting between variants.
        
        Args:
            variant_a_url: Variant A URL
            variant_b_url: Variant B URL
            split_ratio: Traffic split ratio (0.5 = 50/50)
        """
        logger.info(
            f"Configuring traffic split: "
            f"{split_ratio*100:.0f}% → A, {(1-split_ratio)*100:.0f}% → B"
        )
        
        # In production, this would configure:
        # - Load balancer weighted routing
        # - CDN edge routing rules
        # - Service mesh traffic policies
        
        # Simulate configuration
        await asyncio.sleep(0.05)
        
        logger.info("✅ Traffic split configured")
    
    async def _save_test_config(self, test_result: ABTestResult) -> None:
        """Save test configuration to file."""
        config_file = self.metrics_dir / f"test_{test_result.test_id}.json"
        
        with open(config_file, "w") as f:
            json.dump({
                "test_id": test_result.test_id,
                "business_id": test_result.business_id,
                "variant_a": {
                    "variant_id": test_result.variant_a.variant_id,
                    "url": test_result.variant_a.deployment_url,
                    "features": test_result.variant_a.features_enabled
                },
                "variant_b": {
                    "variant_id": test_result.variant_b.variant_id,
                    "url": test_result.variant_b.deployment_url,
                    "features": test_result.variant_b.features_enabled
                },
                "traffic_split": test_result.traffic_split,
                "metrics_endpoint": test_result.metrics_endpoint,
                "created_at": test_result.created_at
            }, f, indent=2)
        
        logger.info(f"Test configuration saved: {config_file}")
    
    async def track_metrics(
        self,
        test_id: str,
        variant_name: str,
        metrics: Dict[str, Any]
    ) -> None:
        """
        Track metrics for a variant.
        
        Args:
            test_id: Test identifier
            variant_name: "A" or "B"
            metrics: Metrics dictionary (e.g., response_time, conversion_rate, etc.)
        """
        metrics_file = self.metrics_dir / f"metrics_{test_id}_{variant_name}.jsonl"
        
        metric_entry = {
            "test_id": test_id,
            "variant": variant_name,
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": metrics
        }
        
        with open(metrics_file, "a") as f:
            f.write(json.dumps(metric_entry) + "\n")
        
        logger.debug(f"Metrics recorded for variant {variant_name}: {metrics}")
    
    async def get_test_results(self, test_id: str) -> Dict[str, Any]:
        """
        Get aggregated results for an A/B test.
        
        Args:
            test_id: Test identifier
        
        Returns:
            Aggregated test results
        """
        if test_id not in self.active_tests:
            raise ValueError(f"Test not found: {test_id}")
        
        test = self.active_tests[test_id]
        
        # Load metrics for both variants
        metrics_a = await self._load_metrics(test_id, "A")
        metrics_b = await self._load_metrics(test_id, "B")
        
        # Calculate aggregates (simplified)
        results = {
            "test_id": test_id,
            "business_id": test.business_id,
            "duration_hours": self._calculate_duration(test.created_at),
            "variant_a": {
                "url": test.variant_a.deployment_url,
                "features": test.variant_a.features_enabled,
                "metrics_count": len(metrics_a),
                "sample_metrics": metrics_a[-5:] if metrics_a else []
            },
            "variant_b": {
                "url": test.variant_b.deployment_url,
                "features": test.variant_b.features_enabled,
                "metrics_count": len(metrics_b),
                "sample_metrics": metrics_b[-5:] if metrics_b else []
            },
            "recommendation": "Collect more data" if len(metrics_a) < 100 else "Analyze results"
        }
        
        return results
    
    async def _load_metrics(self, test_id: str, variant_name: str) -> List[Dict[str, Any]]:
        """Load metrics for a variant."""
        metrics_file = self.metrics_dir / f"metrics_{test_id}_{variant_name}.jsonl"
        
        if not metrics_file.exists():
            return []
        
        metrics = []
        with open(metrics_file, "r") as f:
            for line in f:
                if line.strip():
                    metrics.append(json.loads(line))
        
        return metrics
    
    def _calculate_duration(self, created_at: str) -> float:
        """Calculate test duration in hours."""
        created = datetime.fromisoformat(created_at)
        now = datetime.utcnow()
        duration = (now - created).total_seconds() / 3600
        return round(duration, 2)
    
    def get_active_tests(self) -> List[str]:
        """Get list of active test IDs."""
        return list(self.active_tests.keys())


# Global singleton instance
_ab_testing_deployer: Optional[ABTestingDeployer] = None


def get_ab_testing_deployer() -> ABTestingDeployer:
    """Get or create global ABTestingDeployer instance."""
    global _ab_testing_deployer
    
    if _ab_testing_deployer is None:
        _ab_testing_deployer = ABTestingDeployer()
    
    return _ab_testing_deployer
