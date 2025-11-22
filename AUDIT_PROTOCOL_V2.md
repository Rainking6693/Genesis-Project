# Audit Protocol V2.0 - Mandatory File Inventory Validation

**Effective:** November 4, 2025
**Created After:** Missing files audit failure (product_templates.py)
**Authority:** User directive for corrective action

## CRITICAL FAILURE IDENTIFIED

**Incident:** Two files were missing from Nova's deliverables:
1. `infrastructure/products/product_templates.py`
2. Incomplete `tests/product/test_product_generation.py`

**Impact:** Two audits (Cora, Hudson) approved incomplete work
**Discovery:** External tool (Cursor) found the gaps
**Severity:** HIGH - Undermines audit credibility

---

## NEW MANDATORY AUDIT STEPS

### STEP 1: Deliverables Manifest Check (REQUIRED)

Before ANY audit starts, auditor MUST:

```bash
# 1. Get list of files promised in task description/spec
grep -E "(file:|create|implement|add)" <task_spec> > promised_files.txt

# 2. Get list of files actually created/modified
git diff --name-status <base_branch> > actual_files.txt

# 3. Compare and identify gaps
comm -23 <(sort promised_files.txt) <(sort actual_files.txt)
```

**If ANY gaps found → IMMEDIATE BLOCKER**

### STEP 2: File Inventory Validation (REQUIRED)

For each mentioned file in spec:

```bash
# Check file exists
test -f <file_path> || echo "BLOCKER: Missing file"

# Check file is not empty
test -s <file_path> || echo "BLOCKER: Empty file"

# Check file has minimum expected content
wc -l <file_path>  # Should be >50 lines for implementation files
```

### STEP 3: Test Coverage Manifest (REQUIRED)

For each implementation file, verify corresponding test file:

```bash
# If infrastructure/foo/bar.py exists:
# MUST have tests/foo/test_bar.py

# Validate test file:
grep -c "def test_" tests/foo/test_bar.py  # Should be >5 tests minimum
```

### STEP 4: Audit Report Must Include (REQUIRED)

**Every audit report MUST contain:**

```markdown
## File Inventory Validation

### Files Promised (from spec):
1. file1.py
2. file2.py
3. test_file1.py

### Files Delivered (verified):
- [x] file1.py (exists, 234 lines, non-empty)
- [x] file2.py (exists, 156 lines, non-empty)
- [x] test_file1.py (exists, 89 lines, 12 tests)

### Gaps Identified:
- [ ] BLOCKER: file3.py mentioned in spec but not created

### Git Diff Verification:
```
M infrastructure/file1.py
A infrastructure/file2.py
A tests/test_file1.py
```

**Status:** PASS/FAIL (if any gaps = FAIL)
```

---

## PENALTIES FOR NON-COMPLIANCE

**If auditor approves work WITHOUT file inventory validation:**

1. **First Offense:** Warning + re-audit required
2. **Second Offense:** Auditor loses approval authority for 1 week
3. **Third Offense:** Auditor permanently removed from rotation

**If implementer delivers incomplete work:**

1. **First Offense:** Immediate rework required
2. **Second Offense:** Task reassigned to different agent
3. **Third Offense:** Agent removed from critical path tasks

---

## AUTOMATED ENFORCEMENT

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Audit Protocol V2 Enforcement

if git log -1 --pretty=%B | grep -i "audit\|approved"; then
    # This is an audit commit
    if ! git log -1 --pretty=%B | grep -q "File Inventory Validation"; then
        echo "ERROR: Audit commits MUST include File Inventory Validation"
        echo "See .claude/AUDIT_PROTOCOL_V2.md for requirements"
        exit 1
    fi
fi
```

---

## RETROACTIVE VALIDATION REQUIRED

**All previous "APPROVED" audits must be re-validated with this protocol:**

Priority Queue:
1. ⚠️ Nova Product Generation (FAILED - missing files found)
2. ⚠️ Thon Stripe Integration (needs validation)
3. ⚠️ Cora Orchestration (needs validation)
4. ⚠️ SE-Darwin (needs validation)

**Timeline:** All re-validations due within 24 hours

---

## ESCALATION PROTOCOL

**If file gaps found during re-validation:**

1. Create BLOCKER issue immediately
2. Notify user with severity assessment
3. Original implementer has 2 hours to fix
4. If not fixed → reassign to backup agent
5. Original auditor writes post-mortem explaining how they missed it

---

## SUCCESS METRICS

**Audit Quality Score (new metric):**

```
Score = (Files Delivered / Files Promised) × 100%

90-100%: Excellent
80-89%: Acceptable
70-79%: Warning
<70%: FAIL - work rejected
```

**Track per-agent delivery rates:**
- Nova: TBD (pending re-validation)
- Thon: TBD
- Cora: TBD

---

## LESSONS LEARNED

**What failed:**
- Trusted "tests pass" without checking if all tests exist
- Focused on quality of existing code, not completeness
- No automated file inventory check

**What works now:**
- Explicit manifest comparison (promised vs delivered)
- Git diff validation (proof files were created)
- Empty file detection (catch placeholder commits)
- Test coverage ratios (at least 5 tests per module)

---

**Approved:** User (November 4, 2025)
**Mandatory:** All future audits MUST follow this protocol
**No Exceptions:** File inventory validation is NON-NEGOTIABLE
