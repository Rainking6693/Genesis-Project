#!/usr/bin/env python3
"""
Comprehensive validation script for Genesis business generation system.
Validates all components before running overnight generation.
"""

import asyncio
import sys
import os
from pathlib import Path
from typing import Dict, List, Tuple
import yaml
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

class ValidationResult:
    def __init__(self, component: str, passed: bool, message: str, details: str = ""):
        self.component = component
        self.passed = passed
        self.message = message
        self.details = details

    def __repr__(self):
        status = "✅ PASS" if self.passed else "❌ FAIL"
        return f"{status} | {self.component}: {self.message}"

class BusinessGenerationValidator:
    def __init__(self):
        self.root_dir = Path(__file__).parent.parent
        self.results: List[ValidationResult] = []

    def validate_file_exists(self, filepath: Path, component: str) -> ValidationResult:
        """Validate a file exists."""
        if filepath.exists():
            size = filepath.stat().st_size
            return ValidationResult(
                component=component,
                passed=True,
                message=f"File exists ({size} bytes)",
                details=str(filepath)
            )
        else:
            return ValidationResult(
                component=component,
                passed=False,
                message="File not found",
                details=str(filepath)
            )

    def validate_python_imports(self) -> ValidationResult:
        """Validate critical Python imports."""
        try:
            import torch
            import transformers
            import yaml
            import aiofiles

            details = {
                "torch": torch.__version__,
                "transformers": transformers.__version__,
                "cuda_available": torch.cuda.is_available()
            }

            return ValidationResult(
                component="Python Dependencies",
                passed=True,
                message="All critical imports successful",
                details=json.dumps(details, indent=2)
            )
        except ImportError as e:
            return ValidationResult(
                component="Python Dependencies",
                passed=False,
                message=f"Import failed: {str(e)}",
                details=""
            )

    def validate_config_file(self) -> ValidationResult:
        """Validate local_llm_config.yml."""
        config_path = self.root_dir / "config" / "local_llm_config.yml"

        if not config_path.exists():
            return ValidationResult(
                component="LLM Config",
                passed=False,
                message="Config file not found",
                details=str(config_path)
            )

        try:
            with open(config_path) as f:
                config = yaml.safe_load(f)

            # Validate required keys
            required_keys = ["llm_backend", "agent_llm_mapping"]
            missing_keys = [k for k in required_keys if k not in config]

            if missing_keys:
                return ValidationResult(
                    component="LLM Config",
                    passed=False,
                    message=f"Missing keys: {missing_keys}",
                    details=str(config_path)
                )

            # Count configured agents
            agent_count = len(config["agent_llm_mapping"])

            return ValidationResult(
                component="LLM Config",
                passed=True,
                message=f"Valid config with {agent_count} agents",
                details=f"Provider: {config['llm_backend']['provider']}"
            )
        except Exception as e:
            return ValidationResult(
                component="LLM Config",
                passed=False,
                message=f"Config validation failed: {str(e)}",
                details=str(config_path)
            )

    def validate_business_prompts(self) -> ValidationResult:
        """Validate business generation prompts."""
        prompts_path = self.root_dir / "prompts" / "business_generation_prompts.yml"

        if not prompts_path.exists():
            return ValidationResult(
                component="Business Prompts",
                passed=False,
                message="Prompts file not found",
                details=str(prompts_path)
            )

        try:
            with open(prompts_path) as f:
                prompts = yaml.safe_load(f)

            # Validate 3 business types
            required_businesses = ["business_1_ecommerce", "business_2_content", "business_3_saas"]
            found_businesses = [b for b in required_businesses if b in prompts]

            if len(found_businesses) < 3:
                return ValidationResult(
                    component="Business Prompts",
                    passed=False,
                    message=f"Only {len(found_businesses)}/3 businesses defined",
                    details=f"Found: {found_businesses}"
                )

            # Validate each business has required fields
            for biz in found_businesses:
                required_fields = ["name", "type", "description", "prompt"]
                business_data = prompts[biz]
                missing_fields = [f for f in required_fields if f not in business_data]

                if missing_fields:
                    return ValidationResult(
                        component="Business Prompts",
                        passed=False,
                        message=f"{biz} missing fields: {missing_fields}",
                        details=str(prompts_path)
                    )

            return ValidationResult(
                component="Business Prompts",
                passed=True,
                message="3 businesses fully defined",
                details=f"E-commerce, Content, SaaS"
            )
        except Exception as e:
            return ValidationResult(
                component="Business Prompts",
                passed=False,
                message=f"Prompts validation failed: {str(e)}",
                details=str(prompts_path)
            )

    def validate_model_access(self) -> ValidationResult:
        """Validate access to downloaded models."""
        cache_dir = Path.home() / ".cache" / "huggingface" / "hub"

        required_models = [
            "models--Qwen--Qwen2.5-VL-7B-Instruct",
            "models--deepseek-ai--DeepSeek-OCR"
        ]

        found_models = []
        for model in required_models:
            model_path = cache_dir / model
            if model_path.exists():
                found_models.append(model)

        if len(found_models) < 2:
            return ValidationResult(
                component="Model Access",
                passed=False,
                message=f"Only {len(found_models)}/2 models found",
                details=f"Missing: {set(required_models) - set(found_models)}"
            )

        return ValidationResult(
            component="Model Access",
            passed=True,
            message="Both models accessible",
            details="Qwen 7B + DeepSeek-OCR"
        )

    def validate_output_directories(self) -> ValidationResult:
        """Validate output directories exist or can be created."""
        required_dirs = [
            self.root_dir / "businesses",
            self.root_dir / "businesses" / "friday_demo",
            self.root_dir / "logs" / "business_generation"
        ]

        created_dirs = []
        for dir_path in required_dirs:
            if not dir_path.exists():
                try:
                    dir_path.mkdir(parents=True, exist_ok=True)
                    created_dirs.append(str(dir_path.name))
                except Exception as e:
                    return ValidationResult(
                        component="Output Directories",
                        passed=False,
                        message=f"Failed to create {dir_path.name}: {str(e)}",
                        details=str(dir_path)
                    )

        message = "All directories ready"
        if created_dirs:
            message += f" (created: {', '.join(created_dirs)})"

        return ValidationResult(
            component="Output Directories",
            passed=True,
            message=message,
            details=f"{len(required_dirs)} directories validated"
        )

    def validate_scripts(self) -> ValidationResult:
        """Validate generation scripts are executable."""
        scripts = [
            self.root_dir / "scripts" / "generate_business.py",
            self.root_dir / "scripts" / "overnight_business_generation.sh"
        ]

        non_executable = []
        for script in scripts:
            if not script.exists():
                return ValidationResult(
                    component="Scripts",
                    passed=False,
                    message=f"Script not found: {script.name}",
                    details=str(script)
                )

            if not os.access(script, os.X_OK):
                non_executable.append(script.name)

        if non_executable:
            return ValidationResult(
                component="Scripts",
                passed=False,
                message=f"Scripts not executable: {non_executable}",
                details="Run: chmod +x scripts/*.py scripts/*.sh"
            )

        return ValidationResult(
            component="Scripts",
            passed=True,
            message="All scripts executable",
            details=f"{len(scripts)} scripts validated"
        )

    def validate_infrastructure(self) -> ValidationResult:
        """Validate infrastructure modules."""
        modules = [
            self.root_dir / "infrastructure" / "genesis_meta_agent.py",
            self.root_dir / "infrastructure" / "local_llm_client.py",
            self.root_dir / "infrastructure" / "halo_router.py"
        ]

        missing_modules = []
        for module in modules:
            if not module.exists():
                missing_modules.append(module.name)

        if missing_modules:
            return ValidationResult(
                component="Infrastructure",
                passed=False,
                message=f"Missing modules: {missing_modules}",
                details="Critical infrastructure files not found"
            )

        return ValidationResult(
            component="Infrastructure",
            passed=True,
            message="All infrastructure modules present",
            details=f"{len(modules)} modules validated"
        )

    async def run_all_validations(self) -> Tuple[List[ValidationResult], bool]:
        """Run all validation checks."""
        print("=" * 80)
        print("GENESIS BUSINESS GENERATION SYSTEM VALIDATION")
        print("=" * 80)
        print()

        # Run all validations
        self.results.append(self.validate_python_imports())
        self.results.append(self.validate_config_file())
        self.results.append(self.validate_business_prompts())
        self.results.append(self.validate_model_access())
        self.results.append(self.validate_output_directories())
        self.results.append(self.validate_scripts())
        self.results.append(self.validate_infrastructure())

        # Additional file checks
        critical_files = [
            (self.root_dir / "config" / "local_llm_config.yml", "LLM Config File"),
            (self.root_dir / "prompts" / "business_generation_prompts.yml", "Prompts File"),
            (self.root_dir / "infrastructure" / "genesis_meta_agent.py", "Genesis Meta-Agent"),
            (self.root_dir / "infrastructure" / "local_llm_client.py", "LLM Client")
        ]

        for filepath, component in critical_files:
            self.results.append(self.validate_file_exists(filepath, component))

        # Print results
        passed_count = sum(1 for r in self.results if r.passed)
        total_count = len(self.results)
        all_passed = passed_count == total_count

        print(f"Validation Results: {passed_count}/{total_count} checks passed\n")

        for result in self.results:
            print(result)
            if result.details:
                print(f"         Details: {result.details}")
            print()

        print("=" * 80)
        if all_passed:
            print("✅ ALL VALIDATIONS PASSED - READY FOR BUSINESS GENERATION")
            print("=" * 80)
            print()
            print("To start overnight generation, run:")
            print("  bash scripts/overnight_business_generation.sh")
            print()
            print("Expected completion: 10-12 hours")
            print("Expected cost: $0.00 (local LLM)")
            print("Output directory: businesses/friday_demo/")
        else:
            print("❌ VALIDATION FAILED - ISSUES MUST BE RESOLVED")
            print("=" * 80)
            print()
            print("Failed checks:")
            for result in self.results:
                if not result.passed:
                    print(f"  - {result.component}: {result.message}")

        return self.results, all_passed

async def main():
    validator = BusinessGenerationValidator()
    results, all_passed = await validator.run_all_validations()

    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    asyncio.run(main())
