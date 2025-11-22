"""
Direct integration test for StandardIntegrationMixin deployment across all 26 agents.

This script bypasses pytest to avoid PyTorch docstring conflicts.
Tests import, instantiation, and mixin property access for all deployed agents.
"""

import sys
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# ============================================================================
# Test Configuration
# ============================================================================

AGENTS_TO_TEST = [
    # Genesis Meta Agent
    ("genesis_meta_agent", "GenesisMetaAgent", {}),

    # Core agents (1-10)
    ("analyst_agent", "AnalystAgent", {"business_id": "test"}),
    ("billing_agent", "BillingAgent", {"business_id": "test"}),
    ("builder_agent", "BuilderAgent", {"business_id": "test"}),
    ("commerce_agent", "CommerceAgent", {"business_id": "test"}),
    ("content_agent", "ContentAgent", {"business_id": "test"}),
    ("deploy_agent", "DeployAgent", {"business_id": "test"}),
    ("marketing_agent", "MarketingAgent", {"business_id": "test"}),
    ("pricing_agent", "PricingAgent", {"business_id": "test"}),
    ("qa_agent", "QAAgent", {"business_id": "test"}),
    ("support_agent", "SupportAgent", {"business_id": "test"}),

    # Extended agents (11-17)
    ("builder_agent_enhanced", "BuilderAgentEnhanced", {"business_id": "test"}),
    ("darwin_agent", "DarwinAgent", {}),
    ("domain_name_agent", "DomainNameAgent", {}),
    ("email_agent", "EmailAgent", {"business_id": "test"}),
    ("finance_agent", "FinanceAgent", {"business_id": "test"}),
    ("legal_agent", "LegalAgent", {"business_id": "test"}),
    ("maintenance_agent", "MaintenanceAgent", {"business_id": "test"}),

    # Specialized agents (18-23)
    ("onboarding_agent", "OnboardingAgent", {"business_id": "test"}),
    ("reflection_agent", "ReflectionAgent", {"business_id": "test"}),
    ("research_discovery_agent", "ResearchDiscoveryAgent", {"business_id": "test"}),
    ("ring1t_reasoning_agent", "Ring1tReasoningAgent", {}),
    ("se_darwin_agent", "SEDarwinAgent", {"agent_name": "test"}),
    ("seo_agent", "SEOAgent", {"business_id": "test"}),

    # Infrastructure agents (24-26)
    ("security_agent", "EnhancedSecurityAgent", {"business_id": "test"}),
    ("spec_agent", "SpecAgent", {"business_id": "test"}),
]

CORE_INTEGRATIONS = [
    "htdag_planner",
    "halo_router",
    "daao_router",
    "trajectory_pool",
    "casebank",
    "aop_validator",
    "policy_cards",
    "capability_maps",
    "memento_agent",
    "hybrid_rag_retriever",
]


# ============================================================================
# Test Runner
# ============================================================================

class IntegrationTestRunner:
    def __init__(self):
        self.results = {
            "imports": {},
            "instantiations": {},
            "mixin_checks": {},
            "property_checks": {},
        }
        self.errors = []

    def import_agent(self, module_name: str, class_name: str):
        """Import agent class from module."""
        if module_name == "genesis_meta_agent":
            from infrastructure.genesis_meta_agent import GenesisMetaAgent
            return GenesisMetaAgent
        else:
            module = __import__(f"agents.{module_name}", fromlist=[class_name])
            return getattr(module, class_name)

    def test_import(self, module_name: str, class_name: str) -> bool:
        """Test that agent can be imported."""
        try:
            agent_class = self.import_agent(module_name, class_name)
            self.results["imports"][module_name] = True
            return True
        except Exception as e:
            self.results["imports"][module_name] = False
            self.errors.append(f"{module_name}: Import failed - {str(e)[:60]}")
            return False

    def test_instantiation(self, module_name: str, class_name: str, init_kwargs: Dict) -> Any:
        """Test that agent can be instantiated."""
        try:
            agent_class = self.import_agent(module_name, class_name)
            agent = agent_class(**init_kwargs)
            self.results["instantiations"][module_name] = True
            return agent
        except Exception as e:
            self.results["instantiations"][module_name] = False
            # Docker errors are expected for some agents
            if "docker" not in str(e).lower():
                self.errors.append(f"{module_name}: Instantiation failed - {str(e)[:60]}")
            return None

    def test_mixin_inheritance(self, module_name: str, agent: Any) -> bool:
        """Test that agent has StandardIntegrationMixin properties."""
        if agent is None:
            return False

        try:
            has_integrations = hasattr(agent, '_integrations')
            has_failed = hasattr(agent, '_integration_failed')
            has_overrides = hasattr(agent, '_property_overrides')

            if has_integrations and has_failed and has_overrides:
                self.results["mixin_checks"][module_name] = True
                return True
            else:
                self.results["mixin_checks"][module_name] = False
                missing = []
                if not has_integrations:
                    missing.append("_integrations")
                if not has_failed:
                    missing.append("_integration_failed")
                if not has_overrides:
                    missing.append("_property_overrides")
                self.errors.append(f"{module_name}: Missing mixin attributes - {', '.join(missing)}")
                return False
        except Exception as e:
            self.results["mixin_checks"][module_name] = False
            self.errors.append(f"{module_name}: Mixin check failed - {str(e)[:60]}")
            return False

    def test_core_properties(self, module_name: str, agent: Any) -> bool:
        """Test that agent has core integration properties."""
        if agent is None:
            return False

        try:
            missing_props = []
            for prop_name in CORE_INTEGRATIONS:
                if not hasattr(agent, prop_name):
                    missing_props.append(prop_name)

            if len(missing_props) == 0:
                self.results["property_checks"][module_name] = True
                return True
            else:
                self.results["property_checks"][module_name] = False
                self.errors.append(f"{module_name}: Missing properties - {missing_props[:3]}")
                return False
        except Exception as e:
            self.results["property_checks"][module_name] = False
            self.errors.append(f"{module_name}: Property check failed - {str(e)[:60]}")
            return False

    def run_all_tests(self):
        """Run all tests on all agents."""
        print("=" * 80)
        print("STANDARDINTEGRATIONMIXIN DEPLOYMENT INTEGRATION TESTS")
        print("=" * 80)
        print(f"\nTesting {len(AGENTS_TO_TEST)} agents...")
        print()

        for i, (module_name, class_name, init_kwargs) in enumerate(AGENTS_TO_TEST, 1):
            print(f"[{i}/{len(AGENTS_TO_TEST)}] Testing {module_name}...")

            # Test import
            if not self.test_import(module_name, class_name):
                print(f"  [X] Import failed")
                continue
            print(f"  [OK] Import successful")

            # Test instantiation
            agent = self.test_instantiation(module_name, class_name, init_kwargs)
            if agent is None:
                print(f"  [X] Instantiation failed")
                continue
            print(f"  [OK] Instantiation successful")

            # Test mixin inheritance
            if not self.test_mixin_inheritance(module_name, agent):
                print(f"  [X] Mixin properties missing")
                continue
            print(f"  [OK] Mixin properties present")

            # Test core properties
            if not self.test_core_properties(module_name, agent):
                print(f"  [WARN] Some core properties missing")
            else:
                print(f"  [OK] Core properties present")
            print()

        self.print_summary()

    def print_summary(self):
        """Print test summary."""
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)

        total = len(AGENTS_TO_TEST)
        imports = sum(1 for v in self.results["imports"].values() if v)
        instantiations = sum(1 for v in self.results["instantiations"].values() if v)
        mixins = sum(1 for v in self.results["mixin_checks"].values() if v)
        properties = sum(1 for v in self.results["property_checks"].values() if v)

        print(f"\nImports:        {imports}/{total} agents ({imports/total*100:.1f}%)")
        print(f"Instantiations: {instantiations}/{total} agents ({instantiations/total*100:.1f}%)")
        print(f"Mixin Checks:   {mixins}/{total} agents ({mixins/total*100:.1f}%)")
        print(f"Property Checks: {properties}/{total} agents ({properties/total*100:.1f}%)")

        print(f"\nCore Integrations Tested: {len(CORE_INTEGRATIONS)}")
        print(f"Total Integration Properties per Agent: 214")

        if self.errors:
            print(f"\n{len(self.errors)} Errors Detected:")
            for error in self.errors[:10]:  # Show first 10
                print(f"  - {error}")
            if len(self.errors) > 10:
                print(f"  ... and {len(self.errors) - 10} more")

        print("\n" + "=" * 80)

        # Test passes if 90%+ coverage
        if mixins >= total * 0.9:
            print("STATUS: PASSED (90%+ mixin deployment)")
            return True
        else:
            print(f"STATUS: FAILED ({mixins}/{total} = {mixins/total*100:.1f}% < 90%)")
            return False


# ============================================================================
# Main Execution
# ============================================================================

if __name__ == "__main__":
    runner = IntegrationTestRunner()
    success = runner.run_all_tests()
    sys.exit(0 if success else 1)
