"""
Benchmark builder pipeline locally vs HopX.

Usage:
    python scripts/benchmark_hopx_vs_local.py \
        --business-id demo \
        --artifact-root businesses/fully_integrated/latest \
        --local-cmd "npm run build" \
        --hopx-cmd "npm install && npm run build"
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import shlex
import subprocess
import time
from pathlib import Path
from typing import Dict, Optional

from infrastructure.hopx_agent_adapter import HopXAgentAdapter, collect_directory_payload


def run_local(command: str, cwd: Path) -> Dict[str, object]:
    start = time.perf_counter()
    try:
        # SECURITY FIX: Use shlex.split() and shell=False to prevent command injection
        # Original: subprocess.run(command, shell=True) - VULNERABLE to RCE
        # Fixed: Parse command safely and use shell=False
        cmd_parts = shlex.split(command)
        proc = subprocess.run(
            cmd_parts,  # List of arguments (safe)
            cwd=str(cwd),
            shell=False,  # SECURITY: Prevent shell injection
            check=True,
            capture_output=True,
            text=True,
        )
        success = True
        stderr = proc.stderr
    except subprocess.CalledProcessError as exc:
        success = False
        stderr = exc.stderr or str(exc)
    duration = time.perf_counter() - start
    return {"success": success, "duration_seconds": duration, "stderr": stderr}


async def run_hopx(
    business_id: str,
    command: str,
    artifact_root: Path,
    template: str,
) -> Dict[str, object]:
    adapter = HopXAgentAdapter("Builder Benchmark", business_id)
    payload = collect_directory_payload(artifact_root, max_bytes=25_000_000)
    upload = {f"app/{path}": data for path, data in payload.items()}
    start = time.perf_counter()
    try:
        result = await adapter.execute(
            task="Benchmark build",
            template=template,
            upload_files=upload,
            commands=[f"cd app && {command}"],
            download_paths=["app/dist", "app/.next"],
        )
        success = True
    except Exception as exc:
        result = {"error": str(exc)}
        success = False
    duration = time.perf_counter() - start
    return {"success": success, "duration_seconds": duration, "result": result}


async def main(args: argparse.Namespace) -> None:
    artifact_root = Path(args.artifact_root).expanduser().resolve()
    if not artifact_root.exists():
        raise SystemExit(f"Artifact root not found: {artifact_root}")

    local_result = run_local(args.local_cmd, artifact_root)
    hopx_result = await run_hopx(
        args.business_id,
        args.hopx_cmd,
        artifact_root,
        args.template,
    )

    summary = {
        "business_id": args.business_id,
        "artifact_root": str(artifact_root),
        "local": local_result,
        "hopx": hopx_result,
    }
    output = Path(args.output) if args.output else None
    if output:
        output.write_text(json.dumps(summary, indent=2))
        print(f"Benchmark written to {output}")
    else:
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark HopX vs local builds.")
    parser.add_argument("--business-id", required=True)
    parser.add_argument("--artifact-root", required=True)
    parser.add_argument("--local-cmd", default="npm run build")
    parser.add_argument("--hopx-cmd", default="npm install && npm run build")
    parser.add_argument("--template", default="fullstack_environment")
    parser.add_argument("--output", help="Optional path to save JSON results")
    asyncio.run(main(parser.parse_args()))

