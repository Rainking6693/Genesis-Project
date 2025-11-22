"""
Apply Functional Verification Integration to autonomous_deploy.py

This script safely patches autonomous_deploy.py to add functional verification.
Creates backup before modifying.
"""

import os
import shutil
from pathlib import Path


def apply_patch():
    """Apply functional verification patch to autonomous_deploy.py"""

    file_path = Path("infrastructure/autonomous_deploy.py")
    backup_path = Path("infrastructure/autonomous_deploy.py.backup")

    print("🔧 Applying Functional Verification Patch...")
    print(f"   File: {file_path}")

    # Read original file
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False

    # Create backup
    print(f"📦 Creating backup: {backup_path}")
    try:
        shutil.copy2(file_path, backup_path)
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return False

    # Patch 1: Add import
    print("✏️  Patch 1: Adding import for functional_verifier...")
    if "from infrastructure.functional_verifier import verify_deployment_functional" not in content:
        content = content.replace(
            "from infrastructure.simple_deploy_wrapper import get_deploy_wrapper",
            "from infrastructure.simple_deploy_wrapper import get_deploy_wrapper\n"
            "from infrastructure.functional_verifier import verify_deployment_functional"
        )
        print("   ✅ Import added")
    else:
        print("   ⏭️  Import already exists")

    # Patch 2: Add functional_verification field to DeploymentResult
    print("✏️  Patch 2: Adding functional_verification field to DeploymentResult...")
    if "functional_verification: Optional[Dict] = None" not in content:
        # Find the metadata line
        old_metadata = "    metadata: Dict = None"
        new_metadata = (
            "    metadata: Dict = None\n"
            "    functional_verification: Optional[Dict] = None  # NEW: Functional verification results"
        )
        content = content.replace(old_metadata, new_metadata, 1)
        print("   ✅ Field added")
    else:
        print("   ⏭️  Field already exists")

    # Patch 3: Add enable_functional_verification to __init__
    print("✏️  Patch 3: Adding enable_functional_verification flag...")
    if "self.enable_functional_verification" not in content:
        old_init = (
            "        self.platform = os.getenv(\"DEFAULT_DEPLOY_PLATFORM\", \"railway\")\n"
            "        self.disable_vercel = os.getenv(\"DISABLE_VERCEL_DEPLOY\", \"true\").lower() == \"true\"\n"
            "        self.deploy_wrapper = get_deploy_wrapper()"
        )
        new_init = (
            "        self.platform = os.getenv(\"DEFAULT_DEPLOY_PLATFORM\", \"railway\")\n"
            "        self.disable_vercel = os.getenv(\"DISABLE_VERCEL_DEPLOY\", \"true\").lower() == \"true\"\n"
            "        self.deploy_wrapper = get_deploy_wrapper()\n"
            "        self.enable_functional_verification = os.getenv(\n"
            "            \"ENABLE_FUNCTIONAL_VERIFICATION\", \"true\"\n"
            "        ).lower() == \"true\""
        )
        content = content.replace(old_init, new_init, 1)
        print("   ✅ Flag added")
    else:
        print("   ⏭️  Flag already exists")

    # Patch 4: Add app_type parameter to deploy_business
    print("✏️  Patch 4: Adding app_type parameter to deploy_business...")
    if "app_type: str = \"nextjs\"" not in content:
        old_signature = (
            "    async def deploy_business(\n"
            "        self,\n"
            "        app_path: str,\n"
            "        business_name: str,\n"
            "        platform: Optional[str] = None\n"
            "    ) -> DeploymentResult:"
        )
        new_signature = (
            "    async def deploy_business(\n"
            "        self,\n"
            "        app_path: str,\n"
            "        business_name: str,\n"
            "        platform: Optional[str] = None,\n"
            "        app_type: str = \"nextjs\"\n"
            "    ) -> DeploymentResult:"
        )
        content = content.replace(old_signature, new_signature, 1)

        # Update docstring
        old_docstring = (
            "            platform: Deployment platform (optional, uses default if not specified)\n"
            "\n"
            "        Returns:"
        )
        new_docstring = (
            "            platform: Deployment platform (optional, uses default if not specified)\n"
            "            app_type: Application type (nextjs, react, vue, static)\n"
            "\n"
            "        Returns:"
        )
        content = content.replace(old_docstring, new_docstring, 1)
        print("   ✅ Parameter added")
    else:
        print("   ⏭️  Parameter already exists")

    # Patch 5: Add app_type to convenience function
    print("✏️  Patch 5: Adding app_type to convenience function...")
    old_convenience = (
        "async def deploy_business(\n"
        "    app_path: str,\n"
        "    business_name: str,\n"
        "    platform: Optional[str] = None\n"
        ") -> DeploymentResult:"
    )
    new_convenience = (
        "async def deploy_business(\n"
        "    app_path: str,\n"
        "    business_name: str,\n"
        "    platform: Optional[str] = None,\n"
        "    app_type: str = \"nextjs\"\n"
        ") -> DeploymentResult:"
    )
    if old_convenience in content:
        content = content.replace(old_convenience, new_convenience, 1)

        # Update convenience function call
        old_call = "    return await deployer.deploy_business(app_path, business_name, platform)"
        new_call = "    return await deployer.deploy_business(app_path, business_name, platform, app_type)"
        content = content.replace(old_call, new_call, 1)

        # Update convenience function docstring
        old_conv_doc = (
            "        platform: Deployment platform (optional)\n"
            "\n"
            "    Returns:"
        )
        new_conv_doc = (
            "        platform: Deployment platform (optional)\n"
            "        app_type: Application type (nextjs, react, vue, static)\n"
            "\n"
            "    Returns:"
        )
        # Only replace second occurrence (in convenience function)
        parts = content.split(old_conv_doc, 2)
        if len(parts) == 3:
            content = parts[0] + old_conv_doc + parts[1] + new_conv_doc + parts[2]

        print("   ✅ Convenience function updated")
    else:
        print("   ⏭️  Convenience function already updated")

    # Write patched file
    print(f"💾 Writing patched file: {file_path}")
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        print(f"❌ Error writing file: {e}")
        # Restore backup
        print(f"🔄 Restoring backup...")
        shutil.copy2(backup_path, file_path)
        return False

    print("\n✅ Functional Verification Patch Applied Successfully!")
    print(f"   Backup saved: {backup_path}")
    print("\n📝 Next steps:")
    print("   1. Review changes: git diff infrastructure/autonomous_deploy.py")
    print("   2. Test verification: python test_functional_verification.py")
    print("   3. Read guide: FUNCTIONAL_VERIFICATION_GUIDE.md")

    return True


if __name__ == "__main__":
    success = apply_patch()
    exit(0 if success else 1)
