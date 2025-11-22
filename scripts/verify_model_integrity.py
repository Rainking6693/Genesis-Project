#!/usr/bin/env python3
"""
Verify downloaded GGUF models match expected checksums.

Purpose:
- Detect model tampering
- Verify successful downloads
- Ensure model versions match

Usage:
    python verify_model_integrity.py
    python verify_model_integrity.py --model qwen3-vl-4b-instruct-q4_k_m.gguf
    python verify_model_integrity.py --register <model_name> <sha256>

Security:
- Uses SHA256 hashing (NIST FIPS 180-4)
- Verifies models before loading
- Logs all verification attempts

Reference:
- GGUF Format: https://github.com/ggerganov/ggml/blob/master/docs/gguf.md
- SHA256: https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf

Author: Sentinel (Security Agent)
Date: November 3, 2025
"""

import argparse
import hashlib
import json
import logging
import sys
from pathlib import Path
from typing import Dict, Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Model directory
MODEL_DIR = Path("/home/genesis/llama.cpp/models")

# Expected checksums file
CHECKSUMS_FILE = Path("/home/genesis/genesis-rebuild/scripts/model_checksums.json")

# Default expected checksums (populated by registration)
EXPECTED_CHECKSUMS = {
    # Format: "model_name.gguf": "sha256_hex_string"
    # To register: python verify_model_integrity.py --register <model> <sha256>
}


def load_checksums() -> Dict[str, str]:
    """Load expected checksums from file."""
    if CHECKSUMS_FILE.exists():
        try:
            with open(CHECKSUMS_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load checksums file: {e}")
            return EXPECTED_CHECKSUMS.copy()
    return EXPECTED_CHECKSUMS.copy()


def save_checksums(checksums: Dict[str, str]) -> None:
    """Save checksums to file."""
    try:
        CHECKSUMS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CHECKSUMS_FILE, "w") as f:
            json.dump(checksums, f, indent=2, sort_keys=True)
        logger.info(f"Saved checksums to {CHECKSUMS_FILE}")
    except Exception as e:
        logger.error(f"Failed to save checksums: {e}")


def calculate_sha256(file_path: Path) -> str:
    """
    Calculate SHA256 checksum of a file.

    Args:
        file_path: Path to file

    Returns:
        SHA256 hex string

    Raises:
        FileNotFoundError: If file not found
    """
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    sha256_hash = hashlib.sha256()
    total_size = file_path.stat().st_size
    processed = 0

    try:
        with open(file_path, "rb") as f:
            # Read in 8KB chunks for memory efficiency
            chunk_size = 8192
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                sha256_hash.update(chunk)
                processed += len(chunk)

                # Progress indication for large files
                if total_size > 100_000_000:  # >100MB
                    pct = (processed / total_size) * 100
                    if processed % (10 * chunk_size) == 0:
                        logger.info(f"  Hashing progress: {pct:.1f}%")

    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise

    return sha256_hash.hexdigest()


def verify_model(model_name: str, checksums: Dict[str, str]) -> bool:
    """
    Verify model file matches expected checksum.

    Args:
        model_name: Name of model file (with .gguf extension)
        checksums: Dict of expected checksums

    Returns:
        True if verification passed

    Raises:
        FileNotFoundError: If model file not found
        ValueError: If checksum mismatch
    """
    model_path = MODEL_DIR / model_name

    if not model_path.exists():
        logger.error(f"Model file not found: {model_path}")
        raise FileNotFoundError(f"Model file not found: {model_path}")

    expected = checksums.get(model_name)
    if not expected:
        logger.warning(
            f"No expected checksum configured for {model_name}\n"
            f"  Register with: python verify_model_integrity.py --register {model_name} <sha256>"
        )
        return False

    logger.info(f"Verifying {model_name}...")
    logger.info(f"  File size: {model_path.stat().st_size / (1024**3):.2f} GB")

    # Calculate actual checksum
    actual = calculate_sha256(model_path)

    # Compare
    if actual == expected:
        logger.info(f"✅ Model verification PASSED: {model_name}")
        logger.info(f"   SHA256: {actual}")
        return True
    else:
        logger.error(f"❌ Model verification FAILED: {model_name}")
        logger.error(f"   Expected: {expected}")
        logger.error(f"   Actual:   {actual}")
        raise ValueError(f"Model integrity check failed: checksum mismatch")


def register_model(model_name: str, sha256: str, checksums: Dict[str, str]) -> None:
    """
    Register a model with its expected checksum.

    Args:
        model_name: Name of model file
        sha256: SHA256 checksum (hex string)
        checksums: Dict to update
    """
    if not sha256.startswith("sha256:"):
        # Check if it looks like a hex string
        if len(sha256) != 64 or not all(c in "0123456789abcdefABCDEF" for c in sha256):
            logger.error(f"Invalid SHA256 format: {sha256}")
            logger.error(f"Expected 64 hex characters, got {len(sha256)}")
            raise ValueError(f"Invalid SHA256 format")

    checksums[model_name] = sha256.lower()
    save_checksums(checksums)
    logger.info(f"✅ Registered {model_name}")
    logger.info(f"   SHA256: {sha256.lower()}")


def verify_all(checksums: Dict[str, str]) -> tuple[int, int]:
    """
    Verify all registered models.

    Args:
        checksums: Dict of expected checksums

    Returns:
        (passed, failed) tuple
    """
    if not checksums:
        logger.warning("No checksums registered")
        return 0, 0

    passed = 0
    failed = 0

    for model_name in checksums:
        try:
            verify_model(model_name, checksums)
            passed += 1
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            failed += 1

    return passed, failed


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Verify GGUF model file integrity via SHA256",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Verify all registered models
  python verify_model_integrity.py

  # Verify specific model
  python verify_model_integrity.py --model qwen3-vl-4b-instruct-q4_k_m.gguf

  # Calculate and register a model
  python verify_model_integrity.py --register qwen3-vl-4b-instruct-q4_k_m.gguf

  # Calculate SHA256 and register
  python verify_model_integrity.py --register model.gguf abc123...

  # List registered models
  python verify_model_integrity.py --list
        """
    )

    parser.add_argument(
        "--model",
        help="Verify specific model file"
    )
    parser.add_argument(
        "--register",
        nargs="+",
        help="Register model: --register <model_name> [sha256]"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List registered models"
    )
    parser.add_argument(
        "--calculate",
        help="Calculate SHA256 for a model without registering"
    )

    args = parser.parse_args()

    # Load existing checksums
    checksums = load_checksums()

    # Handle commands
    if args.list:
        if not checksums:
            print("No models registered")
            return 0

        print("Registered models:")
        for name, sha256 in sorted(checksums.items()):
            print(f"  {name}")
            print(f"    SHA256: {sha256}")
        return 0

    elif args.calculate:
        try:
            model_path = MODEL_DIR / args.calculate
            sha256 = calculate_sha256(model_path)
            print(f"SHA256: {sha256}")
            return 0
        except Exception as e:
            logger.error(f"Calculation failed: {e}")
            return 1

    elif args.register:
        model_name = args.register[0]
        if len(args.register) > 1:
            sha256 = args.register[1]
        else:
            # Calculate SHA256
            logger.info(f"Calculating SHA256 for {model_name}...")
            try:
                model_path = MODEL_DIR / model_name
                sha256 = calculate_sha256(model_path)
            except Exception as e:
                logger.error(f"Calculation failed: {e}")
                return 1

        try:
            register_model(model_name, sha256, checksums)
            return 0
        except Exception as e:
            logger.error(f"Registration failed: {e}")
            return 1

    elif args.model:
        try:
            verify_model(args.model, checksums)
            return 0
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return 1

    else:
        # Verify all
        passed, failed = verify_all(checksums)
        print(f"\nVerification Summary:")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
