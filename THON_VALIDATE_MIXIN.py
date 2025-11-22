"""
THON MIXIN VALIDATION - Verify StandardIntegrationMixin before deployment
Tests that Shane's mixin is complete and ready for use
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

MIXIN_PATH = PROJECT_ROOT / "infrastructure" / "standard_integration_mixin.py"

def validate_mixin_exists():
    """Check if mixin file exists"""
    if not MIXIN_PATH.exists():
        print("❌ FAIL: StandardIntegrationMixin file does not exist")
        print(f"   Expected: {MIXIN_PATH}")
        return False

    print(f"✅ PASS: Mixin file exists")
    print(f"   Location: {MIXIN_PATH}")

    size = MIXIN_PATH.stat().st_size
    print(f"   Size: {size:,} bytes")

    if size < 1000:
        print("⚠️  WARNING: File seems small, may be incomplete")
    return True

def validate_mixin_content():
    """Validate mixin has expected content"""
    print("\n" + "="*60)
    print("CONTENT VALIDATION")
    print("="*60)

    with open(MIXIN_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check for class definition
    if 'class StandardIntegrationMixin' not in content:
        print("❌ FAIL: StandardIntegrationMixin class not found")
        return False
    print("✅ PASS: StandardIntegrationMixin class found")

    # Check for __init__ method
    if 'def __init__' not in content:
        print("❌ FAIL: __init__ method not found")
        return False
    print("✅ PASS: __init__ method found")

    # Estimate integration count
    import_count = content.count('from infrastructure.')
    self_count = content.count('self.')

    print(f"\n📊 Integration Estimates:")
    print(f"   Import statements: {import_count}")
    print(f"   Self attributes: {self_count}")

    if import_count < 50:
        print("⚠️  WARNING: Low import count, expected 100+")
    if self_count < 200:
        print("⚠️  WARNING: Low self attribute count, expected 283+")

    total_estimate = import_count + self_count
    print(f"   Total estimate: {total_estimate}")

    if total_estimate < 200:
        print("❌ FAIL: Mixin appears incomplete (< 200 integrations)")
        return False

    print("✅ PASS: Mixin appears complete")
    return True

def validate_mixin_importable():
    """Test if mixin can be imported"""
    print("\n" + "="*60)
    print("IMPORT TEST")
    print("="*60)

    try:
        from infrastructure.standard_integration_mixin import StandardIntegrationMixin
        print("✅ PASS: StandardIntegrationMixin imported successfully")

        # Test instantiation
        try:
            mixin = StandardIntegrationMixin()
            print("✅ PASS: StandardIntegrationMixin instantiated successfully")

            # Count actual integrations
            integration_count = len([attr for attr in dir(mixin) if not attr.startswith('_')])
            print(f"\n📊 Actual Integration Count: {integration_count}")

            if integration_count < 200:
                print(f"⚠️  WARNING: Low integration count ({integration_count} < 200)")
            elif integration_count >= 283:
                print(f"✅ PASS: Target integration count reached ({integration_count} >= 283)")
            else:
                print(f"ℹ️  INFO: Partial integration count ({integration_count})")

            # List some integrations (first 10)
            integrations = [attr for attr in dir(mixin) if not attr.startswith('_')][:10]
            print(f"\n📋 Sample Integrations:")
            for i, integration in enumerate(integrations, 1):
                print(f"   {i}. {integration}")

            return True

        except Exception as e:
            print(f"❌ FAIL: Cannot instantiate StandardIntegrationMixin: {e}")
            import traceback
            traceback.print_exc()
            return False

    except ImportError as e:
        print(f"❌ FAIL: Cannot import StandardIntegrationMixin: {e}")
        import traceback
        traceback.print_exc()
        return False

def validate_mixin_syntax():
    """Validate Python syntax"""
    print("\n" + "="*60)
    print("SYNTAX VALIDATION")
    print("="*60)

    try:
        with open(MIXIN_PATH, 'r', encoding='utf-8') as f:
            code = f.read()

        import ast
        ast.parse(code)
        print("✅ PASS: Valid Python syntax")
        return True

    except SyntaxError as e:
        print(f"❌ FAIL: Syntax error in mixin: {e}")
        print(f"   Line {e.lineno}: {e.text}")
        return False

def main():
    """Run all validations"""
    print("="*60)
    print("THON MIXIN VALIDATION")
    print("="*60)
    print("Validating StandardIntegrationMixin before deployment")
    print("="*60)

    results = []

    # Test 1: File exists
    results.append(("File Exists", validate_mixin_exists()))

    if not results[0][1]:
        print("\n❌ VALIDATION FAILED: Mixin file not found")
        print("   Waiting for Shane to create the file...")
        return 1

    # Test 2: Syntax valid
    results.append(("Syntax Valid", validate_mixin_syntax()))

    # Test 3: Content valid
    results.append(("Content Valid", validate_mixin_content()))

    # Test 4: Import works
    results.append(("Import Works", validate_mixin_importable()))

    # Summary
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)

    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")

    all_passed = all(passed for _, passed in results)

    print("\n" + "="*60)
    if all_passed:
        print("🎯 ALL VALIDATIONS PASSED")
        print("="*60)
        print("\n✅ StandardIntegrationMixin is ready for deployment!")
        print("\nNext step: Run deployment script")
        print("   python THON_DEPLOY_AGENTS_10_17.py")
        return 0
    else:
        print("❌ VALIDATION FAILED")
        print("="*60)
        print("\n⚠️  StandardIntegrationMixin is not ready for deployment")
        print("\nAction required:")
        print("   1. Review errors above")
        print("   2. Coordinate with Shane to fix issues")
        print("   3. Re-run this validation script")
        return 1

if __name__ == "__main__":
    exit(main())
