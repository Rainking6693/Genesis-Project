#!/usr/bin/env python3
"""
Safe coverage calculation script for CI pipeline.
Replaces shell-based parsing to prevent command injection.

Security features:
- JSON schema validation
- Type checking on all inputs
- No shell command execution
- Sanitized error messages
- Audit logging
"""

import json
import sys
import logging
from pathlib import Path
from typing import Dict, Any
from decimal import Decimal, InvalidOperation


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def validate_coverage_schema(data: Dict[str, Any]) -> None:
    """
    Validate coverage.json structure matches expected schema.

    Args:
        data: Parsed JSON data

    Raises:
        ValueError: If schema validation fails
    """
    required_keys = ['totals']
    for key in required_keys:
        if key not in data:
            raise ValueError(f"Missing required key: {key}")

    if 'percent_covered' not in data['totals']:
        raise ValueError("Missing 'percent_covered' in totals")

    # Validate percent_covered is numeric
    percent = data['totals']['percent_covered']
    if not isinstance(percent, (int, float)):
        raise ValueError(f"percent_covered must be numeric, got {type(percent)}")

    # Validate range
    if not (0 <= percent <= 100):
        raise ValueError(f"percent_covered must be 0-100, got {percent}")


def sanitize_string(value: str, max_length: int = 100) -> str:
    """
    Sanitize string values to prevent injection.

    Args:
        value: String to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    # Remove any control characters
    sanitized = ''.join(char for char in value if char.isprintable())

    # Truncate to max length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    return sanitized


def calculate_coverage(
    coverage_file: Path = Path('coverage.json'),
    output_file: Path = Path('coverage.txt'),
    threshold: float = 95.0
) -> tuple[float, bool]:
    """
    Calculate coverage percentage and check against threshold.

    Args:
        coverage_file: Path to coverage.json
        output_file: Path to write coverage percentage
        threshold: Minimum required coverage percentage

    Returns:
        Tuple of (coverage_percentage, meets_threshold)

    Raises:
        FileNotFoundError: If coverage file doesn't exist
        ValueError: If coverage data is invalid
        JSONDecodeError: If coverage file is not valid JSON
    """
    # Validate inputs
    if not isinstance(threshold, (int, float)):
        raise ValueError(f"Threshold must be numeric, got {type(threshold)}")

    if not (0 <= threshold <= 100):
        raise ValueError(f"Threshold must be 0-100, got {threshold}")

    # Log operation
    logger.info(f"Reading coverage from: {coverage_file}")
    logger.info(f"Threshold: {threshold}%")

    # Check file exists
    if not coverage_file.exists():
        raise FileNotFoundError(f"Coverage file not found: {coverage_file}")

    # Read and parse JSON safely
    try:
        with coverage_file.open('r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in coverage file: {e}")
        raise ValueError(f"Coverage file contains invalid JSON: {e}")

    # Validate schema
    validate_coverage_schema(data)

    # Extract coverage percentage
    coverage_percent = float(data['totals']['percent_covered'])

    # Use Decimal for precise comparison to avoid floating point issues
    coverage_decimal = Decimal(str(coverage_percent))
    threshold_decimal = Decimal(str(threshold))

    meets_threshold = coverage_decimal >= threshold_decimal

    # Write coverage to output file
    try:
        with output_file.open('w', encoding='utf-8') as f:
            f.write(f"{coverage_percent:.2f}")
        logger.info(f"Wrote coverage to: {output_file}")
    except IOError as e:
        logger.error(f"Failed to write output file: {e}")
        raise

    # Log results
    logger.info(f"Coverage: {coverage_percent:.2f}%")
    logger.info(f"Meets threshold: {meets_threshold}")

    return coverage_percent, meets_threshold


def main() -> int:
    """
    Main entry point for coverage calculation.

    Returns:
        Exit code: 0 if meets threshold, 1 otherwise
    """
    try:
        # Parse command line arguments safely
        coverage_file = Path('coverage.json')
        output_file = Path('coverage.txt')

        # Get threshold from environment or use default
        threshold = 95.0
        if len(sys.argv) > 1:
            try:
                threshold = float(sys.argv[1])
                if not (0 <= threshold <= 100):
                    raise ValueError("Threshold must be 0-100")
            except (ValueError, InvalidOperation) as e:
                logger.error(f"Invalid threshold argument: {sys.argv[1]}")
                print(f"Error: Invalid threshold '{sys.argv[1]}'. Must be 0-100.", file=sys.stderr)
                return 1

        # Calculate coverage
        coverage_percent, meets_threshold = calculate_coverage(
            coverage_file=coverage_file,
            output_file=output_file,
            threshold=threshold
        )

        # Print results to stdout (for GitHub Actions)
        if meets_threshold:
            print(f"✅ Coverage {coverage_percent:.2f}% meets threshold {threshold}%")
            return 0
        else:
            print(f"❌ Coverage {coverage_percent:.2f}% is below threshold {threshold}%")
            return 1

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        print(f"Error: {e}", file=sys.stderr)
        return 1

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        print(f"Error: {e}", file=sys.stderr)
        return 1

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        print(f"Error: Unexpected error during coverage calculation", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
