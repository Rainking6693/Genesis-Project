#!/usr/bin/env python3
"""Check HOPX_ARTIFACT_ROOT directory size and structure"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv('config/production.env')

artifact_root = os.getenv("HOPX_ARTIFACT_ROOT", "businesses/fully_integrated/latest")
root_path = Path(artifact_root)

print(f"📁 HOPX_ARTIFACT_ROOT: {artifact_root}")
print(f"   Absolute path: {root_path.resolve()}")

if not root_path.exists():
    print(f"❌ Directory does not exist!")
    print(f"   Creating symlink to 'saas' as fallback...")

    saas_path = root_path.parent / "saas"
    if saas_path.exists():
        try:
            # SECURITY FIX: Validate paths and use shell=False
            # Original: subprocess.run(['mklink', ...], shell=True) - VULNERABLE to path injection
            # Fixed: Validate paths, use shell=False, use pathlib.Path.symlink_to()

            # Validate paths are within project directory
            import subprocess
            import platform

            # Resolve to absolute paths
            root_abs = root_path.resolve()
            saas_abs = saas_path.resolve()
            cwd_abs = Path.cwd().resolve()

            # SECURITY: Prevent path traversal attacks
            if not str(root_abs).startswith(str(cwd_abs)):
                raise SecurityError(f"Path traversal detected: {root_abs} outside {cwd_abs}")
            if not str(saas_abs).startswith(str(cwd_abs)):
                raise SecurityError(f"Path traversal detected: {saas_abs} outside {cwd_abs}")

            # Try platform-specific symlink creation
            if platform.system() == "Windows":
                # Windows: Use mklink with shell=False
                subprocess.run(
                    ['mklink', '/D', str(root_abs), str(saas_abs)],
                    shell=False,  # SECURITY: Prevent command injection
                    check=True,
                    capture_output=True
                )
            else:
                # Unix: Use pathlib (safest)
                root_abs.symlink_to(saas_abs, target_is_directory=True)

            print(f"   ✅ Created link to {saas_path}")
        except subprocess.CalledProcessError as e:
            # Fallback: just show manual instructions
            print(f"   ⚠️  Could not create symlink (return code {e.returncode})")
            print(f"      Manually create: mklink /D {root_path} {saas_path}")
        except Exception as e:
            # Fallback: just copy structure reference
            print(f"   ⚠️  Could not create symlink: {e}")
            print(f"      Manually create: mklink /D {root_path} {saas_path}")
else:
    print(f"✅ Directory exists")
    
    # Calculate size
    total_size = 0
    file_count = 0
    for file_path in root_path.rglob("*"):
        if file_path.is_file():
            total_size += file_path.stat().st_size
            file_count += 1
    
    size_mb = total_size / (1024 * 1024)
    print(f"   Total files: {file_count}")
    print(f"   Total size: {size_mb:.2f} MB")
    
    # Check against limits
    limits = {
        "Builder": 20_000_000,
        "QA": 10_000_000,
        "Deploy": 25_000_000,
    }
    
    print(f"\n📊 Size limits check:")
    for agent, limit_bytes in limits.items():
        limit_mb = limit_bytes / (1024 * 1024)
        if total_size > limit_bytes:
            print(f"   ❌ {agent} Agent: {size_mb:.2f} MB > {limit_mb:.0f} MB limit")
        else:
            print(f"   ✅ {agent} Agent: {size_mb:.2f} MB < {limit_mb:.0f} MB limit")

