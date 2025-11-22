"""
Quality Validation for Socratic-Zero Generated Examples

Validates quality of generated examples and produces Hudson score (≥80% required)
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class QualityValidator:
    """
    Quality validator for Socratic-Zero generated examples
    
    Validates:
    - Format compliance
    - Content quality
    - Diversity metrics
    - Business reasoning focus
    """
    
    def __init__(self, bootstrap_file: str = "data/socratic_zero/analyst_bootstrap.jsonl"):
        """
        Initialize quality validator
        
        Args:
            bootstrap_file: Path to bootstrap examples JSONL file
        """
        self.bootstrap_file = Path(bootstrap_file)
    
    def load_examples(self) -> List[Dict[str, Any]]:
        """
        Load examples from JSONL file
        
        Returns:
            List of examples
        """
        examples = []
        with open(self.bootstrap_file, 'r') as f:
            for line in f:
                examples.append(json.loads(line.strip()))
        
        logger.info(f"Loaded {len(examples)} examples for validation")
        return examples
    
    def validate_format(self, examples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate format compliance
        
        Returns:
            Validation metrics
        """
        required_fields = ["id", "category", "topic", "instruction", "input"]
        format_errors = []
        format_valid = 0
        
        for example in examples:
            missing_fields = [field for field in required_fields if field not in example]
            if missing_fields:
                format_errors.append(f"{example.get('id', 'unknown')}: Missing {missing_fields}")
            else:
                format_valid += 1
        
        format_score = (format_valid / len(examples)) * 100 if examples else 0
        
        return {
            "format_valid": format_valid,
            "format_errors": len(format_errors),
            "format_score": format_score,
            "errors": format_errors[:10]  # First 10 errors
        }
    
    def validate_content(self, examples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate content quality
        
        Returns:
            Content quality metrics
        """
        content_valid = 0
        content_issues = []
        
        for example in examples:
            issues = []
            
            # Check instruction quality
            instruction = example.get("instruction", "")
            if len(instruction) < 20:
                issues.append("Instruction too short")
            
            # Check input quality
            input_text = example.get("input", "")
            if len(input_text) < 50:
                issues.append("Input too short")
            
            # Check output quality (if present)
            output = example.get("output", "")
            if output and len(output) < 50:
                issues.append("Output too short")
            
            # Check category relevance
            category = example.get("category", "")
            analyst_categories = ["Financial Analysis", "Market Analysis", "Strategy", "Operations", "Risk Assessment"]
            if category not in analyst_categories:
                issues.append(f"Invalid category: {category}")
            
            if not issues:
                content_valid += 1
            else:
                content_issues.append(f"{example.get('id', 'unknown')}: {', '.join(issues)}")
        
        content_score = (content_valid / len(examples)) * 100 if examples else 0
        
        return {
            "content_valid": content_valid,
            "content_issues": len(content_issues),
            "content_score": content_score,
            "issues": content_issues[:10]  # First 10 issues
        }
    
    def validate_diversity(self, examples: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate diversity metrics
        
        Returns:
            Diversity metrics
        """
        categories = {}
        difficulties = {}
        topics = {}
        
        for example in examples:
            category = example.get("category", "unknown")
            difficulty = example.get("difficulty", "unknown")
            topic = example.get("topic", "unknown")
            
            categories[category] = categories.get(category, 0) + 1
            difficulties[difficulty] = difficulties.get(difficulty, 0) + 1
            topics[topic] = topics.get(topic, 0) + 1
        
        # Calculate diversity scores
        category_diversity = len(categories) / 5.0  # 5 expected categories
        difficulty_diversity = len(difficulties) / 3.0  # 3 expected difficulties
        topic_diversity = len(topics) / min(25, len(topics))  # At least 25 topics expected
        
        diversity_score = ((category_diversity + difficulty_diversity + topic_diversity) / 3.0) * 100
        
        return {
            "categories": len(categories),
            "difficulties": len(difficulties),
            "topics": len(topics),
            "category_distribution": categories,
            "difficulty_distribution": difficulties,
            "diversity_score": min(100, diversity_score)
        }
    
    def calculate_hudson_score(self, format_metrics: Dict, content_metrics: Dict, diversity_metrics: Dict) -> float:
        """
        Calculate Hudson quality score (≥80% required)
        
        Hudson Score Formula:
        - Format: 30% weight
        - Content: 50% weight
        - Diversity: 20% weight
        
        Returns:
            Hudson score (0-100)
        """
        format_weight = 0.30
        content_weight = 0.50
        diversity_weight = 0.20
        
        hudson_score = (
            format_metrics["format_score"] * format_weight +
            content_metrics["content_score"] * content_weight +
            diversity_metrics["diversity_score"] * diversity_weight
        )
        
        return round(hudson_score, 2)
    
    def validate(self) -> Dict[str, Any]:
        """
        Run complete validation
        
        Returns:
            Validation report
        """
        logger.info("Starting quality validation...")
        
        examples = self.load_examples()
        
        format_metrics = self.validate_format(examples)
        content_metrics = self.validate_content(examples)
        diversity_metrics = self.validate_diversity(examples)
        
        hudson_score = self.calculate_hudson_score(format_metrics, content_metrics, diversity_metrics)
        
        report = {
            "total_examples": len(examples),
            "format_metrics": format_metrics,
            "content_metrics": content_metrics,
            "diversity_metrics": diversity_metrics,
            "hudson_score": hudson_score,
            "pass": hudson_score >= 80.0
        }
        
        logger.info(f"Validation complete: Hudson score = {hudson_score}%")
        return report
    
    def generate_report(self, report: Dict[str, Any], output_file: str = "data/socratic_zero/validation_report.md"):
        """
        Generate validation report
        
        Args:
            report: Validation report dictionary
            output_file: Path to output markdown file
        """
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        bootstrap_ts = datetime.fromtimestamp(
            Path(self.bootstrap_file).stat().st_mtime, tz=timezone.utc
        ).isoformat()

        with open(output_path, 'w') as f:
            f.write("# Socratic-Zero Quality Validation Report\n\n")
            f.write(f"**Generated:** {bootstrap_ts}\n")
            f.write(f"**Total Examples:** {report['total_examples']}\n")
            f.write(f"**Hudson Score:** {report['hudson_score']}%\n")
            f.write(f"**Status:** {'✅ PASS' if report['pass'] else '❌ FAIL'} (≥80% required)\n\n")
            
            f.write("## Format Validation\n\n")
            f.write(f"- Valid: {report['format_metrics']['format_valid']}/{report['total_examples']}\n")
            f.write(f"- Score: {report['format_metrics']['format_score']:.1f}%\n")
            f.write(f"- Errors: {report['format_metrics']['format_errors']}\n\n")
            
            f.write("## Content Validation\n\n")
            f.write(f"- Valid: {report['content_metrics']['content_valid']}/{report['total_examples']}\n")
            f.write(f"- Score: {report['content_metrics']['content_score']:.1f}%\n")
            f.write(f"- Issues: {report['content_metrics']['content_issues']}\n\n")
            
            f.write("## Diversity Metrics\n\n")
            f.write(f"- Categories: {report['diversity_metrics']['categories']}\n")
            f.write(f"- Difficulties: {report['diversity_metrics']['difficulties']}\n")
            f.write(f"- Topics: {report['diversity_metrics']['topics']}\n")
            f.write(f"- Diversity Score: {report['diversity_metrics']['diversity_score']:.1f}%\n\n")
            
            f.write("### Category Distribution\n\n")
            for category, count in report['diversity_metrics']['category_distribution'].items():
                f.write(f"- {category}: {count}\n")
            
            f.write("\n### Difficulty Distribution\n\n")
            for difficulty, count in report['diversity_metrics']['difficulty_distribution'].items():
                f.write(f"- {difficulty}: {count}\n")
        
        print(f"✅ Validation report saved to {output_path}")


def main():
    """Run quality validation"""
    logging.basicConfig(level=logging.INFO)
    
    validator = QualityValidator()
    report = validator.validate()
    
    validator.generate_report(report)
    
    print(f"\n✅ Quality validation complete!")
    print(f"   Hudson Score: {report['hudson_score']}%")
    print(f"   Status: {'✅ PASS' if report['pass'] else '❌ FAIL'} (≥80% required)")
    print(f"   Format Score: {report['format_metrics']['format_score']:.1f}%")
    print(f"   Content Score: {report['content_metrics']['content_score']:.1f}%")
    print(f"   Diversity Score: {report['diversity_metrics']['diversity_score']:.1f}%")
    
    if not report['pass']:
        print("\n⚠️  Quality validation failed - Hudson score below 80%")
        print("   Review validation_report.md for details")
    else:
        print("\n✅ Quality validation passed - ready for use")


if __name__ == "__main__":
    main()
