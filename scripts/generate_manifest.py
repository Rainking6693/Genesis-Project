#!/usr/bin/env python3
"""
Safe deployment manifest generation script.
Replaces heredoc-based generation to prevent shell injection.

Security features:
- JSON schema validation on output
- Input sanitization for all fields
- No shell command execution
- Type checking on all parameters
- Maximum field length enforcement
- Audit logging
"""

import json
import sys
import logging
import re
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, UTC


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Field constraints for security
MAX_LENGTHS = {
    'version': 100,
    'environment': 50,
    'commit': 40,  # Git SHA-1 is 40 chars
    'branch': 200,
    'workflow': 200,
    'test_pass_rate': 20,
}


def sanitize_field(value: str, field_name: str, allow_empty: bool = False) -> str:
    """
    Sanitize a field value to prevent injection attacks.

    Args:
        value: Raw field value
        field_name: Name of the field (for length constraints)
        allow_empty: Whether empty values are allowed

    Returns:
        Sanitized string value

    Raises:
        ValueError: If value is invalid
    """
    if value is None:
        if allow_empty:
            return ""
        raise ValueError(f"Field '{field_name}' cannot be None")

    # Convert to string and strip whitespace
    value_str = str(value).strip()

    if not value_str and not allow_empty:
        raise ValueError(f"Field '{field_name}' cannot be empty")

    # Remove control characters (keep printable only)
    sanitized = ''.join(char for char in value_str if char.isprintable())

    # Apply max length constraint
    max_length = MAX_LENGTHS.get(field_name, 500)
    if len(sanitized) > max_length:
        logger.warning(f"Field '{field_name}' truncated from {len(sanitized)} to {max_length} chars")
        sanitized = sanitized[:max_length]

    # Additional validation based on field type
    if field_name == 'commit':
        # Git SHA should be hex (alphanumeric)
        if not re.match(r'^[a-fA-F0-9]+$', sanitized):
            raise ValueError(f"Invalid commit SHA format: {sanitized}")

    elif field_name == 'environment':
        # Environment should be alphanumeric with hyphens/underscores
        if not re.match(r'^[a-zA-Z0-9_-]+$', sanitized):
            raise ValueError(f"Invalid environment name: {sanitized}")

    elif field_name == 'test_pass_rate':
        # Should end with % and contain a number
        if sanitized and not re.match(r'^\d+(\.\d+)?%?$', sanitized):
            raise ValueError(f"Invalid test pass rate format: {sanitized}")

    return sanitized


def validate_manifest_schema(manifest: Dict[str, Any]) -> None:
    """
    Validate manifest structure and required fields.

    Args:
        manifest: Manifest dictionary to validate

    Raises:
        ValueError: If validation fails
    """
    required_fields = [
        'version',
        'environment',
        'commit',
        'branch',
        'build_date',
        'build_number',
        'workflow'
    ]

    for field in required_fields:
        if field not in manifest:
            raise ValueError(f"Missing required field: {field}")

        if not manifest[field]:
            raise ValueError(f"Field '{field}' cannot be empty")

    # Validate build_date is ISO format
    try:
        datetime.fromisoformat(manifest['build_date'].replace('Z', '+00:00'))
    except ValueError as e:
        raise ValueError(f"Invalid build_date format: {e}")

    # Validate build_number is numeric
    try:
        int(manifest['build_number'])
    except ValueError:
        raise ValueError(f"build_number must be numeric: {manifest['build_number']}")


def generate_manifest(
    version: str,
    environment: str,
    commit: str,
    branch: str,
    build_number: str,
    workflow: str,
    test_pass_rate: Optional[str] = None,
    output_file: Path = Path('MANIFEST.json')
) -> Dict[str, Any]:
    """
    Generate a deployment manifest with sanitized inputs.

    Args:
        version: Deployment version string
        environment: Target environment (e.g., 'staging', 'production')
        commit: Git commit SHA
        branch: Git branch name
        build_number: CI build number
        workflow: Workflow name
        test_pass_rate: Optional test pass rate percentage
        output_file: Path to write manifest JSON

    Returns:
        Generated manifest dictionary

    Raises:
        ValueError: If any input validation fails
    """
    # Log operation (sanitized)
    logger.info(f"Generating manifest for environment: {environment[:20]}...")

    # Sanitize all inputs
    try:
        sanitized_version = sanitize_field(version, 'version')
        sanitized_env = sanitize_field(environment, 'environment')
        sanitized_commit = sanitize_field(commit, 'commit')
        sanitized_branch = sanitize_field(branch, 'branch')
        sanitized_build_num = sanitize_field(build_number, 'build_number')
        sanitized_workflow = sanitize_field(workflow, 'workflow')
        sanitized_pass_rate = sanitize_field(test_pass_rate or '', 'test_pass_rate', allow_empty=True)
    except ValueError as e:
        logger.error(f"Input validation failed: {e}")
        raise

    # Generate build date (UTC, ISO format)
    build_date = datetime.now(UTC).strftime('%Y-%m-%dT%H:%M:%SZ')

    # Construct manifest
    manifest = {
        'version': sanitized_version,
        'environment': sanitized_env,
        'commit': sanitized_commit,
        'branch': sanitized_branch,
        'build_date': build_date,
        'build_number': sanitized_build_num,
        'workflow': sanitized_workflow,
    }

    # Add optional fields
    if sanitized_pass_rate:
        manifest['test_pass_rate'] = sanitized_pass_rate

    # Validate manifest structure
    validate_manifest_schema(manifest)

    # Write manifest to file
    try:
        with output_file.open('w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, sort_keys=True)
            f.write('\n')  # Add trailing newline
        logger.info(f"Manifest written to: {output_file}")
    except IOError as e:
        logger.error(f"Failed to write manifest: {e}")
        raise ValueError(f"Could not write manifest file: {e}")

    # Log success
    logger.info(f"Manifest generated successfully")
    logger.info(f"  Version: {sanitized_version}")
    logger.info(f"  Environment: {sanitized_env}")
    logger.info(f"  Commit: {sanitized_commit[:8]}...")

    return manifest


def main() -> int:
    """
    Main entry point for manifest generation.

    Expected environment variables (passed as command line args):
        VERSION: Deployment version
        ENVIRONMENT: Target environment
        COMMIT: Git commit SHA
        BRANCH: Git branch name
        BUILD_NUMBER: CI build number
        WORKFLOW: Workflow name
        TEST_PASS_RATE: (Optional) Test pass rate

    Returns:
        Exit code: 0 on success, 1 on error
    """
    try:
        # Parse command line arguments (safer than env vars)
        if len(sys.argv) < 7:
            print("Usage: generate_manifest.py VERSION ENVIRONMENT COMMIT BRANCH BUILD_NUMBER WORKFLOW [TEST_PASS_RATE]", file=sys.stderr)
            print("Example: generate_manifest.py v1.0.0 staging abc123 main 42 'Deploy to Staging' 95%", file=sys.stderr)
            return 1

        version = sys.argv[1]
        environment = sys.argv[2]
        commit = sys.argv[3]
        branch = sys.argv[4]
        build_number = sys.argv[5]
        workflow = sys.argv[6]
        test_pass_rate = sys.argv[7] if len(sys.argv) > 7 else None

        # Generate manifest
        manifest = generate_manifest(
            version=version,
            environment=environment,
            commit=commit,
            branch=branch,
            build_number=build_number,
            workflow=workflow,
            test_pass_rate=test_pass_rate,
            output_file=Path('MANIFEST.json')
        )

        # Print manifest to stdout for verification
        print(json.dumps(manifest, indent=2, sort_keys=True))

        return 0

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        print(f"Error: {e}", file=sys.stderr)
        return 1

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        print(f"Error: Unexpected error during manifest generation", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
