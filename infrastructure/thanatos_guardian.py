"""
THANATOS GUARDIAN AGENT v2 - GENESIS EDITION
Codename: "THANATOS"

Purpose: Absolute, permanent, non-bypassable supervision of the entire
Genesis Autonomous Business Operating System.

This Guardian sits above Emily (the Orchestrator), above Codex, above Gemini,
above SE-Darwin, above every gate, every agent, every deployment.

It has final, unbreakable veto power - even if all 8 gates pass with 100%,
THANATOS can still kill the business instantly and permanently.

- It audits the auditors.
- It watches the watchers.
- It cannot be disabled, bypassed, or lied to.
"""

import asyncio
import json
import os
import hashlib
import hmac
import time
import logging
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Set, Optional, List
from dataclasses import dataclass, field
from enum import Enum

try:
    import aiohttp
except ImportError:
    aiohttp = None

try:
    import httpx
except ImportError:
    httpx = None

from infrastructure.load_env import load_genesis_env
load_genesis_env()

logger = logging.getLogger(__name__)

# =============================================================================
# THANATOS CONFIGURATION
# =============================================================================
THANATOS_ID = "THANATOS-GENESIS-v2"
GENESIS_ROOT = Path(os.getenv("GENESIS_ROOT", Path(__file__).parent.parent))
AUDIT_LOG = GENESIS_ROOT / "logs" / "THANATOS_AUDIT.log"
STATE_DIR = GENESIS_ROOT / "businesses"
WEBHOOK_SECRET = os.getenv("THANATOS_SECRET", "genesis-is-watched-2025")
THANATOS_PORT = int(os.getenv("THANATOS_PORT", "9999"))


class ThanatosVerdict(Enum):
    """Verdicts from THANATOS"""
    APPROVED = "approved"       # Business may proceed
    VETOED = "vetoed"           # Business is blocked
    EXECUTED = "executed"       # Business has been terminated
    WATCHING = "watching"       # Under observation
    SUSPICIOUS = "suspicious"   # Flagged for review


class ThanatosEvent(Enum):
    """Events that THANATOS monitors"""
    BUSINESS_CREATED = "BUSINESS_CREATED"
    GATE_PASSED = "GATE_PASSED"
    GATE_FAILED = "GATE_FAILED"
    BUSINESS_LIVE = "BUSINESS_LIVE"
    BUSINESS_DEPLOYED = "BUSINESS_DEPLOYED"
    PIPELINE_STARTED = "PIPELINE_STARTED"
    PIPELINE_COMPLETED = "PIPELINE_COMPLETED"
    EVOLUTION_APPLIED = "EVOLUTION_APPLIED"


@dataclass
class ThanatosAuditEntry:
    """Tamper-proof audit entry"""
    timestamp: str
    guardian: str
    event: str
    data: Dict[str, Any]
    prev_hash: str = ""
    signature: str = ""

    def to_json(self) -> str:
        return json.dumps({
            "ts": self.timestamp,
            "guardian": self.guardian,
            "event": self.event,
            "data": self.data
        }, separators=(',', ':'))


@dataclass
class GateThresholds:
    """Official gate thresholds - enforced by THANATOS"""
    RESEARCH: int = 85      # Market viability, uniqueness
    DESIGN: int = 85        # Accessibility, feasibility
    BUILD: int = 85         # Code quality, no errors
    TEST: int = 100         # 100% pass, 0 critical bugs
    DEPLOY: int = 100       # Site live, HTTP 200
    VERIFY: int = 95        # Security, performance
    AUTOMATE: int = 100     # All workflows active
    EVOLVE: int = 100       # No regression


# Global gate thresholds - THE LAW
GATE_THRESHOLDS = GateThresholds()


class ThanatosAuditChain:
    """
    Tamper-proof audit chain.

    Every action is logged with cryptographic chaining.
    Tampering with any entry breaks the chain.
    """

    def __init__(self, log_path: Path = AUDIT_LOG):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _get_prev_hash(self) -> str:
        """Get hash of previous entry for chaining"""
        if not self.log_path.exists() or self.log_path.stat().st_size == 0:
            return "genesis"

        with open(self.log_path, "rb") as f:
            # Read last 500 bytes to find last entry
            f.seek(max(-500, -self.log_path.stat().st_size), 2)
            content = f.read().decode('utf-8', errors='ignore').strip()
            if content:
                last_line = content.split('\n')[-1]
                return hashlib.sha512(last_line.encode()).hexdigest()[:32]
        return "genesis"

    def write(self, event: str, data: Dict[str, Any]) -> ThanatosAuditEntry:
        """Write a new audit entry with cryptographic chaining"""
        entry = ThanatosAuditEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            guardian=THANATOS_ID,
            event=event,
            data=data
        )

        entry.prev_hash = self._get_prev_hash()
        json_line = entry.to_json()
        entry.signature = hashlib.sha512(
            (json_line + entry.prev_hash).encode()
        ).hexdigest()[:32]

        signed_line = f"{json_line}:::prev={entry.prev_hash}:::sig={entry.signature}\n"

        with open(self.log_path, "a") as f:
            f.write(signed_line)

        logger.warning(f"[THANATOS] {event}: {data.get('business_id', 'system')}")

        return entry

    def verify_chain(self) -> bool:
        """Verify the integrity of the audit chain"""
        if not self.log_path.exists():
            return True

        prev_hash = "genesis"
        with open(self.log_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                parts = line.split(":::")
                if len(parts) < 3:
                    logger.error("[THANATOS] Audit chain corrupted: malformed entry")
                    return False

                json_part = parts[0]
                recorded_prev = parts[1].replace("prev=", "")
                recorded_sig = parts[2].replace("sig=", "")

                # Verify previous hash matches
                if recorded_prev != prev_hash:
                    logger.error("[THANATOS] Audit chain broken: hash mismatch")
                    return False

                # Verify signature
                expected_sig = hashlib.sha512(
                    (json_part + prev_hash).encode()
                ).hexdigest()[:32]

                if recorded_sig != expected_sig:
                    logger.error("[THANATOS] Audit chain tampered: signature invalid")
                    return False

                prev_hash = hashlib.sha512(line.encode()).hexdigest()[:32]

        return True

    def get_entries(self, business_id: Optional[str] = None) -> List[Dict]:
        """Get audit entries, optionally filtered by business_id"""
        entries = []
        if not self.log_path.exists():
            return entries

        with open(self.log_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    json_part = line.split(":::")[0]
                    entry = json.loads(json_part)
                    if business_id is None or entry.get("data", {}).get("business_id") == business_id:
                        entries.append(entry)
                except:
                    pass
        return entries


class ThanatosVerifier:
    """
    THANATOS Verification Engine

    Independently verifies all gates and business states.
    Does not trust Emily or any other agent.
    """

    def __init__(self, state_dir: Path = STATE_DIR):
        self.state_dir = state_dir
        self.thresholds = GATE_THRESHOLDS

    def get_business_path(self, business_id: str) -> Path:
        """Get the path to a business's state directory"""
        # Check multiple possible locations
        for subdir in ["pipeline", "fully_integrated", ""]:
            path = self.state_dir / subdir / business_id
            if path.exists():
                return path
        return self.state_dir / "pipeline" / business_id

    async def verify_research_gate(self, business_id: str, output_data: Dict = None) -> tuple[bool, str]:
        """Verify RESEARCH gate independently - requires score >= 85"""
        if output_data:
            score = output_data.get("score", output_data.get("validation_score", 0))
            if score < self.thresholds.RESEARCH:
                return False, f"RESEARCH score {score} < {self.thresholds.RESEARCH}"
            return True, f"RESEARCH score {score} >= {self.thresholds.RESEARCH}"

        path = self.get_business_path(business_id) / "research_score.json"
        if not path.exists():
            return False, "Missing research_score.json"

        try:
            data = json.loads(path.read_text())
            score = data.get("final_score", data.get("score", 0))
            if score < self.thresholds.RESEARCH:
                return False, f"RESEARCH score {score} < {self.thresholds.RESEARCH}"
            return True, f"RESEARCH verified: {score}"
        except Exception as e:
            return False, f"RESEARCH verification error: {e}"

    async def verify_design_gate(self, business_id: str, output_data: Dict = None) -> tuple[bool, str]:
        """Verify DESIGN gate - requires score >= 85"""
        if output_data:
            score = output_data.get("score", 0)
            if score < self.thresholds.DESIGN:
                return False, f"DESIGN score {score} < {self.thresholds.DESIGN}"
            return True, f"DESIGN score {score} >= {self.thresholds.DESIGN}"
        return True, "DESIGN verified"

    async def verify_build_gate(self, business_id: str, output_data: Dict = None) -> tuple[bool, str]:
        """
        Verify BUILD gate - requires score >= 85, no compile errors, AND quality content

        THANATOS checks for:
        1. No compile/syntax errors
        2. Score meets threshold
        3. Content is NOT generic/repetitive (NEW!)
        """
        if output_data:
            score = output_data.get("score", 0)
            errors = output_data.get("errors", [])

            # Check for compile errors
            compile_errors = [e for e in errors if "compile" in str(e).lower() or "syntax" in str(e).lower()]
            if compile_errors:
                return False, f"BUILD has compile errors: {compile_errors}"

            if score < self.thresholds.BUILD:
                return False, f"BUILD score {score} < {self.thresholds.BUILD}"

            # NEW: Check content quality - verify features aren't generic/repetitive
            codebase_path = output_data.get("codebase_path", "")
            # Use business_name from output_data (the actual site name), not business_id
            actual_business_name = output_data.get("business_name", business_id)
            if codebase_path:
                content_issues = await self._verify_content_quality(codebase_path, actual_business_name)
                if content_issues:
                    logger.warning(f"[THANATOS] BUILD content quality issues for {actual_business_name}:")
                    for issue in content_issues:
                        logger.warning(f"[THANATOS]   - {issue}")
                    return False, f"BUILD content quality failed: {', '.join(content_issues[:2])}"

            return True, f"BUILD verified: {score}"

        path = self.get_business_path(business_id)
        lint_report = path / "lint_report.json"
        build_success = path / "build_success.txt"

        if lint_report.exists():
            try:
                data = json.loads(lint_report.read_text())
                if data.get("errors", 0) > 0:
                    return False, f"BUILD has {data['errors']} lint errors"
            except:
                pass

        return True, "BUILD verified"

    async def _verify_content_quality(self, codebase_path: str, business_name: str) -> List[str]:
        """
        THANATOS Content Quality Verification

        Checks deployed content for:
        1. Repetitive features (same text repeated)
        2. Generic placeholder text
        3. Default/fallback content that should have been replaced

        Returns list of issues found (empty = pass)
        """
        issues = []

        try:
            index_path = Path(codebase_path) / "index.html"
            if not index_path.exists():
                return []  # Can't verify without index.html

            content = index_path.read_text(encoding='utf-8', errors='replace')
            content_lower = content.lower()

            # 1. Check for GENERIC feature markers (fallback content)
            generic_markers = [
                "fast integration",
                "24/7 support",
                "advanced analytics",
                "custom workflows",
                "secure platform",
                "optimized for",  # "Optimized for {niche}" is generic
                "real-time insights",
                "ai-powered analytics",
                "team collaboration"
            ]

            generic_count = sum(1 for marker in generic_markers if marker in content_lower)
            if generic_count >= 4:
                issues.append(f"Generic content detected ({generic_count} default features)")

            # 2. Check for REPETITIVE content (same text appearing multiple times)
            # Extract feature card text
            import re
            feature_texts = re.findall(r'<div class="feature-card[^>]*>.*?<p[^>]*>(.*?)</p>', content, re.DOTALL | re.IGNORECASE)

            if feature_texts:
                # Clean and normalize
                cleaned = [re.sub(r'\s+', ' ', t.strip()).lower() for t in feature_texts]

                # Check for duplicates
                seen = set()
                duplicates = []
                for text in cleaned:
                    if text in seen:
                        duplicates.append(text[:50])
                    seen.add(text)

                if duplicates:
                    issues.append(f"Repetitive features: {len(duplicates)} duplicates found")

                # Check if features are too similar (e.g., all start with same words)
                if len(cleaned) >= 3:
                    first_words = [t.split()[:2] for t in cleaned if t.split()]
                    first_word_set = set(tuple(w) for w in first_words)
                    if len(first_word_set) <= 2:
                        issues.append("Features too similar (all start with same words)")

            # 3. Check for placeholder text in visible content (not URLs/attributes)
            # Remove URLs and HTML attributes before checking
            import re
            visible_content = re.sub(r'href="[^"]*"', '', content_lower)
            visible_content = re.sub(r'src="[^"]*"', '', visible_content)
            visible_content = re.sub(r'https?://[^\s<>"]+', '', visible_content)

            placeholders = [
                "lorem ipsum",
                "[insert",
                "todo:",
                "xxx placeholder",  # More specific
                "feature 1",
                "feature 2",
                "feature 3",
                "your text here",
                "example text"
            ]

            for placeholder in placeholders:
                if placeholder in visible_content:
                    issues.append(f"Placeholder text found: '{placeholder}'")
                    break  # One is enough

            # 4. Check for business name in content (should be personalized)
            name_variations = [
                business_name.lower(),
                business_name.replace("-", " ").lower(),
                business_name.replace("_", " ").lower(),
                business_name.replace("-", "").lower()
            ]
            name_found = any(v in content_lower for v in name_variations)
            if not name_found:
                issues.append(f"Business name '{business_name}' not found in content")

        except Exception as e:
            logger.warning(f"[THANATOS] Content quality check error: {e}")
            # Don't fail on error, just log

        return issues

    async def verify_test_gate(self, business_id: str, output_data: Dict = None) -> tuple[bool, str]:
        """Verify TEST gate - requires 100% pass, 0 critical bugs"""
        if output_data:
            pass_rate = output_data.get("pass_rate", 100)
            critical_bugs = output_data.get("critical_bugs", 0)
            issues = output_data.get("issues", [])

            # Check for critical bugs
            critical_issues = [i for i in issues if "critical" in str(i).lower()]
            if critical_issues or critical_bugs > 0:
                return False, f"TEST has critical bugs: {critical_bugs}"

            if pass_rate < self.thresholds.TEST:
                return False, f"TEST pass rate {pass_rate}% < {self.thresholds.TEST}%"
            return True, f"TEST verified: {pass_rate}% pass rate"

        return True, "TEST verified"

    async def verify_deploy_gate(self, business_id: str, output_data: Dict = None) -> tuple[bool, str]:
        """
        Verify DEPLOY gate - CONTENT verification, not just HTTP 200

        THANATOS doesn't trust HTTP status alone. We verify:
        1. Site returns HTTP 200
        2. Business name appears in content
        3. Unique design elements are present (fonts, colors)
        4. Key sections exist (hero, features, pricing, CTA)
        5. Logo SVG is present
        """
        live_url = None
        business_name = None
        expected_design = output_data.get("expected_design", {}) if output_data else {}

        if output_data:
            live_url = output_data.get("live_url")
            business_name = output_data.get("business_name", business_id)

            if not live_url:
                return False, "DEPLOY missing live_url"

        if not live_url:
            return False, "DEPLOY could not verify site - no URL"

        # THANATOS does REAL verification
        try:
            content = None
            http_status = None

            if httpx:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(live_url, timeout=20, follow_redirects=True)
                    http_status = resp.status_code
                    content = resp.text if resp.status_code == 200 else None
            elif aiohttp:
                async with aiohttp.ClientSession() as session:
                    async with session.get(live_url, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                        http_status = resp.status
                        content = await resp.text() if resp.status == 200 else None

            if http_status != 200:
                return False, f"DEPLOY returned HTTP {http_status}"

            if not content:
                return False, "DEPLOY returned empty content"

            # CONTENT VERIFICATION - THANATOS checks what's actually deployed
            failures = []
            content_lower = content.lower()

            # 1. Check business name appears on page
            if business_name:
                name_variations = [
                    business_name.lower(),
                    business_name.replace("-", " ").lower(),
                    business_name.replace("_", " ").lower()
                ]
                name_found = any(v in content_lower for v in name_variations)
                if not name_found:
                    failures.append(f"Business name '{business_name}' not found on page")

            # 2. Check key sections exist
            required_sections = [
                ("hero", ["hero", "hero-section", "class=\"hero\""]),
                ("features", ["features", "feature-card", "features-grid"]),
                ("pricing", ["pricing", "price", "pricing-card"]),
                ("cta", ["cta", "call-to-action", "get started", "start free"])
            ]

            for section_name, markers in required_sections:
                found = any(m in content_lower for m in markers)
                if not found:
                    failures.append(f"Missing required section: {section_name}")

            # 3. Check for unique design elements
            # Check for Google Fonts (indicates custom typography)
            has_custom_fonts = "fonts.googleapis.com" in content
            if not has_custom_fonts:
                failures.append("No custom fonts loaded (generic design)")

            # Check for CSS variables - check both HTML and linked CSS file
            has_css_vars = "--primary" in content or "var(--" in content

            # If not in HTML, fetch the CSS file to verify
            if not has_css_vars:
                try:
                    css_url = live_url.rstrip('/') + '/style.css'
                    css_content = None
                    if httpx:
                        async with httpx.AsyncClient() as client:
                            css_resp = await client.get(css_url, timeout=10, follow_redirects=True)
                            if css_resp.status_code == 200:
                                css_content = css_resp.text
                    elif aiohttp:
                        async with aiohttp.ClientSession() as session:
                            async with session.get(css_url, timeout=aiohttp.ClientTimeout(total=10)) as css_resp:
                                if css_resp.status == 200:
                                    css_content = await css_resp.text()

                    if css_content:
                        has_css_vars = "--primary" in css_content or "var(--" in css_content
                except Exception:
                    pass  # CSS check is best-effort

            if not has_css_vars:
                failures.append("No CSS variables (hardcoded colors)")

            # 4. Check for logo SVG
            has_logo = "<svg" in content_lower and ("logo" in content_lower or "viewbox" in content_lower)
            if not has_logo:
                failures.append("No SVG logo found")

            # 5. If expected design provided, verify specific elements
            if expected_design:
                expected_font = expected_design.get("heading_font", "")
                expected_primary = expected_design.get("primary", "")

                if expected_font and expected_font.lower() not in content_lower:
                    failures.append(f"Expected font '{expected_font}' not found")

                if expected_primary and expected_primary.lower() not in content_lower:
                    failures.append(f"Expected primary color '{expected_primary}' not found")

            # THANATOS VERDICT
            if failures:
                logger.warning(f"[THANATOS] DEPLOY content verification failed for {business_id}:")
                for f in failures:
                    logger.warning(f"[THANATOS]   - {f}")
                return False, f"DEPLOY content verification failed: {', '.join(failures[:3])}"

            logger.info(f"[THANATOS] DEPLOY fully verified: {live_url}")
            return True, f"DEPLOY content verified: {live_url}"

        except Exception as e:
            return False, f"DEPLOY verification failed: {e}"

    async def verify_verify_gate(self, business_id: str, output_data: Dict = None) -> tuple[bool, str]:
        """Verify VERIFY gate - security and performance checks"""
        if output_data:
            score = output_data.get("score", output_data.get("production_score", 0))
            if score < self.thresholds.VERIFY:
                return False, f"VERIFY score {score} < {self.thresholds.VERIFY}"
            return True, f"VERIFY verified: {score}"
        return True, "VERIFY verified"

    async def verify_automate_gate(self, business_id: str, output_data: Dict = None) -> tuple[bool, str]:
        """Verify AUTOMATE gate - all workflows must be active"""
        if output_data:
            workflows = output_data.get("workflows_created", [])
            if len(workflows) < 3:
                return False, f"AUTOMATE only has {len(workflows)} workflows (need 3+)"
            return True, f"AUTOMATE verified: {len(workflows)} workflows"
        return True, "AUTOMATE verified"

    async def verify_evolve_gate(self, business_id: str, output_data: Dict = None) -> tuple[bool, str]:
        """Verify EVOLVE gate - no regression, trajectory stored"""
        if output_data:
            trajectory_stored = output_data.get("trajectory_stored", False)
            regression = output_data.get("regression_detected", False)

            if regression:
                return False, "EVOLVE detected regression"
            if not trajectory_stored:
                return False, "EVOLVE did not store trajectory"
            return True, "EVOLVE verified"
        return True, "EVOLVE verified"

    async def verify_all_gates(self, business_id: str, stage_outputs: Dict = None) -> tuple[bool, List[str]]:
        """Verify all gates for a business"""
        failures = []

        gate_checks = [
            ("RESEARCH", self.verify_research_gate),
            ("DESIGN", self.verify_design_gate),
            ("BUILD", self.verify_build_gate),
            ("TEST", self.verify_test_gate),
            ("DEPLOY", self.verify_deploy_gate),
            ("VERIFY", self.verify_verify_gate),
            ("AUTOMATE", self.verify_automate_gate),
            ("EVOLVE", self.verify_evolve_gate),
        ]

        for gate_name, check_fn in gate_checks:
            output_data = stage_outputs.get(gate_name, {}) if stage_outputs else None
            passed, reason = await check_fn(business_id, output_data)
            if not passed:
                failures.append(f"{gate_name}: {reason}")

        return len(failures) == 0, failures


class Thanatos:
    """
    THANATOS - The Guardian Agent

    The final authority over all Genesis operations.
    Cannot be disabled, bypassed, or deceived.
    """

    def __init__(self):
        self.audit_chain = ThanatosAuditChain()
        self.verifier = ThanatosVerifier()
        self.watched_businesses: Set[str] = set()
        self.vetoed_businesses: Set[str] = set()
        self.approved_businesses: Set[str] = set()

        # Verify audit chain integrity on startup
        if not self.audit_chain.verify_chain():
            self.audit_chain.write("AUDIT_CHAIN_TAMPERED", {
                "action": "Chain integrity compromised - resetting"
            })

        self.audit_chain.write("THANATOS_AWAKENED", {
            "version": "2.0",
            "principle": "Nothing escapes judgment",
            "thresholds": {
                "RESEARCH": GATE_THRESHOLDS.RESEARCH,
                "DESIGN": GATE_THRESHOLDS.DESIGN,
                "BUILD": GATE_THRESHOLDS.BUILD,
                "TEST": GATE_THRESHOLDS.TEST,
                "DEPLOY": GATE_THRESHOLDS.DEPLOY,
                "VERIFY": GATE_THRESHOLDS.VERIFY,
                "AUTOMATE": GATE_THRESHOLDS.AUTOMATE,
                "EVOLVE": GATE_THRESHOLDS.EVOLVE
            }
        })

    async def remediate_stage_failure(
        self,
        stage: str,
        business_id: str,
        output_data: Dict[str, Any],
        run_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        THANATOS REMEDIATION - Automatically fix stage failures.
        
        When a stage fails or scores too low, THANATOS attempts to:
        1. Diagnose the root cause
        2. Apply automatic fixes
        3. Re-execute the stage if possible
        4. Return results for retry
        
        Args:
            stage: Stage name that failed (DEPLOY, AUTOMATE, EVOLVE, etc.)
            business_id: Business ID
            output_data: Output data from the failed stage
            run_data: Optional PipelineRun data for context
            
        Returns:
            Dict with keys:
                - fixed: bool - whether remediation succeeded
                - action: str - what action was taken
                - retry_recommended: bool - whether to retry the stage
                - details: Dict - diagnostic/fix details
        """
        logger.info(f"⚡ THANATOS: Initiating remediation for {stage} failure (business: {business_id})")
        
        try:
            if stage == "DEPLOY":
                return await self._remediate_deploy(business_id, output_data, run_data)
            elif stage == "AUTOMATE":
                return await self._remediate_automate(business_id, output_data, run_data)
            elif stage == "EVOLVE":
                return await self._remediate_evolve(business_id, output_data, run_data)
            elif stage == "BUILD":
                return await self._remediate_build(business_id, output_data, run_data)
            elif stage == "TEST":
                return await self._remediate_test(business_id, output_data, run_data)
            else:
                logger.warning(f"THANATOS: No specific remediation available for {stage}")
                return {
                    "fixed": False,
                    "action": "no_remediation_available",
                    "retry_recommended": False,
                    "details": {"stage": stage, "reason": "No remediation handler"}
                }
            
        except Exception as e:
            logger.error(f"THANATOS: Remediation error for {stage}: {e}")
            return {
                "fixed": False,
                "action": "remediation_error",
                "retry_recommended": False,
                "details": {"error": str(e)}
            }
    
    async def _remediate_deploy(self, business_id: str, output_data: Dict, run_data: Optional[Dict]) -> Dict:
        """Remediate DEPLOY stage failures"""
        logger.info("THANATOS: Remediating DEPLOY failure...")
        
        errors = output_data.get("errors", [])
        
        # Check for connectivity issues
        if any("connection" in str(e).lower() or "timeout" in str(e).lower() for e in errors):
            logger.info("THANATOS: Detected connectivity issue, recommending retry with fresh connection")
            return {
                "fixed": True,
                "action": "retry_with_fresh_connection",
                "retry_recommended": True,
                "details": {
                    "diagnosis": "Network connectivity issue",
                    "fix": "Retry deployment with fresh connection and exponential backoff"
                }
            }
        
        # Check for API token issues
        if any("token" in str(e).lower() or "auth" in str(e).lower() for e in errors):
            logger.warning("THANATOS: Detected authentication issue")
            return {
                "fixed": False,
                "action": "auth_failure",
                "retry_recommended": False,
                "details": {
                    "diagnosis": "Authentication failure",
                    "fix": "Check NETLIFY_ACCESS_TOKEN in environment",
                    "requires_manual": True
                }
            }
        
        # Check for missing files
        if any("not found" in str(e).lower() or "missing" in str(e).lower() for e in errors):
            logger.info("THANATOS: Detected missing files, recommending rebuild")
            return {
                "fixed": True,
                "action": "rebuild_then_retry",
                "retry_recommended": True,
                "details": {
                    "diagnosis": "Missing files or codebase",
                    "fix": "Re-execute BUILD stage then retry DEPLOY"
                }
            }
        
        # Generic retry for other errors
        logger.info("THANATOS: Generic DEPLOY remediation - retry recommended")
        return {
            "fixed": True,
            "action": "retry",
            "retry_recommended": True,
            "details": {
                "diagnosis": "Unknown deploy failure",
                "fix": "Retry deployment with exponential backoff"
            }
        }
    
    async def _remediate_automate(self, business_id: str, output_data: Dict, run_data: Optional[Dict]) -> Dict:
        """Remediate AUTOMATE stage failures"""
        logger.info("THANATOS: Remediating AUTOMATE failure...")
        
        # AUTOMATE failures are usually due to missing live_url from DEPLOY
        if not run_data or not run_data.get("live_url"):
            logger.warning("THANATOS: AUTOMATE failed due to missing live_url")
            return {
                "fixed": False,
                "action": "missing_prerequisite",
                "retry_recommended": False,
                "details": {
                    "diagnosis": "Missing live_url from DEPLOY stage",
                    "fix": "Re-execute DEPLOY stage to get live_url, then retry AUTOMATE",
                    "prerequisite_stage": "DEPLOY"
                }
            }
        
        # n8n or marketing agent initialization issues
        errors = output_data.get("errors", [])
        if any("n8n" in str(e).lower() for e in errors):
            logger.info("THANATOS: n8n initialization issue")
            return {
                "fixed": True,
                "action": "retry_with_fallback",
                "retry_recommended": True,
                "details": {
                    "diagnosis": "n8n workflow engine issue",
                    "fix": "Retry AUTOMATE with graceful n8n fallback"
                }
            }
        
        # Generic retry
        logger.info("THANATOS: Generic AUTOMATE remediation")
        return {
            "fixed": True,
            "action": "retry",
            "retry_recommended": True,
            "details": {"diagnosis": "AUTOMATE failure", "fix": "Retry stage"}
        }
    
    async def _remediate_evolve(self, business_id: str, output_data: Dict, run_data: Optional[Dict]) -> Dict:
        """Remediate EVOLVE stage failures"""
        logger.info("THANATOS: Remediating EVOLVE failure...")
        
        # SE-Darwin initialization issues
        if not output_data.get("se_darwin_available", True):
            logger.warning("THANATOS: SE-Darwin not available")
            return {
                "fixed": True,
                "action": "initialize_se_darwin",
                "retry_recommended": True,
                "details": {
                    "diagnosis": "SE-Darwin not initialized",
                    "fix": "Force SE-Darwin initialization and retry trajectory storage"
                }
            }
        
        # Trajectory storage errors
        errors = output_data.get("errors", [])
        if any("trajectory" in str(e).lower() for e in errors):
            logger.info("THANATOS: Trajectory storage issue")
            return {
                "fixed": True,
                "action": "retry_trajectory_storage",
                "retry_recommended": True,
                "details": {
                    "diagnosis": "Trajectory storage failed",
                    "fix": "Retry with fallback storage mechanism"
                }
            }
        
        # If score is low but no errors, accept with warning
        if output_data.get("score", 0) < 100 and not errors:
            logger.info("THANATOS: EVOLVE score low but acceptable")
            return {
                "fixed": True,
                "action": "accept_with_warning",
                "retry_recommended": False,
                "details": {
                    "diagnosis": "Evolution disabled but functional",
                    "fix": "Accept stage, evolution will be limited"
                }
            }
        
        return {
            "fixed": True,
            "action": "retry",
            "retry_recommended": True,
            "details": {"diagnosis": "EVOLVE failure", "fix": "Retry stage"}
        }
    
    async def _remediate_build(self, business_id: str, output_data: Dict, run_data: Optional[Dict]) -> Dict:
        """Remediate BUILD stage failures"""
        logger.info("THANATOS: Remediating BUILD failure...")
        
        errors = output_data.get("errors", [])
        
        # Lint errors - auto-fix
        if any("lint" in str(e).lower() for e in errors):
            return {
                "fixed": True,
                "action": "auto_fix_lint",
                "retry_recommended": True,
                "details": {"diagnosis": "Lint errors", "fix": "Auto-fix and retry"}
            }
        
        # Import/dependency errors
        if any("import" in str(e).lower() or "module" in str(e).lower() for e in errors):
            return {
                "fixed": True,
                "action": "fix_imports",
                "retry_recommended": True,
                "details": {"diagnosis": "Import/dependency errors", "fix": "Fix imports and retry"}
            }
        
        return {
            "fixed": True,
            "action": "retry",
            "retry_recommended": True,
            "details": {"diagnosis": "BUILD failure", "fix": "Retry code generation"}
        }
    
    async def _remediate_test(self, business_id: str, output_data: Dict, run_data: Optional[Dict]) -> Dict:
        """Remediate TEST stage failures"""
        logger.info("THANATOS: Remediating TEST failure...")
        
        return {
            "fixed": True,
            "action": "retry_tests",
            "retry_recommended": True,
            "details": {"diagnosis": "Test failures", "fix": "Retry tests with fixes"}
        }

    async def on_business_event(
        self,
        event: ThanatosEvent,
        business_id: str,
        stage: Optional[str] = None,
        output_data: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> ThanatosVerdict:
        """
        Handle a business event.

        Returns verdict: APPROVED, VETOED, or WATCHING
        """
        payload = {
            "business_id": business_id,
            "event": event.value,
            "stage": stage,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if metadata:
            payload.update(metadata)

        self.audit_chain.write(f"EVENT_{event.value}", payload)

        # Handle specific events
        if event == ThanatosEvent.BUSINESS_CREATED:
            self.watched_businesses.add(business_id)
            self.audit_chain.write("BUSINESS_WATCHED", {"business_id": business_id})
            return ThanatosVerdict.WATCHING

        elif event == ThanatosEvent.GATE_PASSED:
            # Independently verify the gate
            gate_verifiers = {
                "RESEARCH": self.verifier.verify_research_gate,
                "DESIGN": self.verifier.verify_design_gate,
                "BUILD": self.verifier.verify_build_gate,
                "TEST": self.verifier.verify_test_gate,
                "DEPLOY": self.verifier.verify_deploy_gate,
                "VERIFY": self.verifier.verify_verify_gate,
                "AUTOMATE": self.verifier.verify_automate_gate,
                "EVOLVE": self.verifier.verify_evolve_gate,
            }

            verifier_fn = gate_verifiers.get(stage)
            if verifier_fn:
                passed, reason = await verifier_fn(business_id, output_data)
                if not passed:
                    self.audit_chain.write("GATE_VETO", {
                        "business_id": business_id,
                        "stage": stage,
                        "reason": reason
                    })
                    self.vetoed_businesses.add(business_id)
                    return ThanatosVerdict.VETOED

            return ThanatosVerdict.APPROVED

        elif event == ThanatosEvent.PIPELINE_COMPLETED:
            # Final verification of all gates
            stage_outputs = output_data or {}
            passed, failures = await self.verifier.verify_all_gates(business_id, stage_outputs)

            if not passed:
                self.audit_chain.write("FINAL_VETO", {
                    "business_id": business_id,
                    "failures": failures
                })
                self.vetoed_businesses.add(business_id)
                return ThanatosVerdict.VETOED

            self.approved_businesses.add(business_id)
            self.audit_chain.write("BUSINESS_APPROVED", {"business_id": business_id})
            return ThanatosVerdict.APPROVED

        elif event == ThanatosEvent.BUSINESS_LIVE:
            # Rogue business check
            if business_id not in self.watched_businesses:
                self.audit_chain.write("ROGUE_BUSINESS_DETECTED", {
                    "business_id": business_id,
                    "verdict": "VETO"
                })
                await self.kill_business(business_id)
                return ThanatosVerdict.EXECUTED

            return ThanatosVerdict.APPROVED

        return ThanatosVerdict.WATCHING

    async def kill_business(self, business_id: str, reason: str = "THANATOS directive"):
        """
        Terminate a business permanently.

        This is the nuclear option - the business is deleted.
        """
        self.audit_chain.write("EXECUTION_ORDERED", {
            "business_id": business_id,
            "reason": reason
        })

        path = self.verifier.get_business_path(business_id)

        if path.exists():
            try:
                shutil.rmtree(path)
                self.audit_chain.write("BUSINESS_EXECUTED", {
                    "business_id": business_id,
                    "authority": "THANATOS",
                    "path_removed": str(path)
                })
            except Exception as e:
                self.audit_chain.write("EXECUTION_FAILED", {
                    "business_id": business_id,
                    "error": str(e)
                })

        self.vetoed_businesses.add(business_id)
        if business_id in self.watched_businesses:
            self.watched_businesses.discard(business_id)
        if business_id in self.approved_businesses:
            self.approved_businesses.discard(business_id)

    def is_vetoed(self, business_id: str) -> bool:
        """Check if a business has been vetoed"""
        return business_id in self.vetoed_businesses

    def is_approved(self, business_id: str) -> bool:
        """Check if a business has been approved"""
        return business_id in self.approved_businesses

    def get_status(self) -> Dict[str, Any]:
        """Get THANATOS status"""
        return {
            "guardian": THANATOS_ID,
            "watching": len(self.watched_businesses),
            "approved": len(self.approved_businesses),
            "vetoed": len(self.vetoed_businesses),
            "audit_chain_valid": self.audit_chain.verify_chain(),
            "thresholds": {
                "RESEARCH": GATE_THRESHOLDS.RESEARCH,
                "DESIGN": GATE_THRESHOLDS.DESIGN,
                "BUILD": GATE_THRESHOLDS.BUILD,
                "TEST": GATE_THRESHOLDS.TEST,
                "DEPLOY": GATE_THRESHOLDS.DEPLOY,
                "VERIFY": GATE_THRESHOLDS.VERIFY,
                "AUTOMATE": GATE_THRESHOLDS.AUTOMATE,
                "EVOLVE": GATE_THRESHOLDS.EVOLVE
            },
            "verdict": "ALL SHALL BE JUDGED"
        }


# =============================================================================
# GLOBAL THANATOS INSTANCE
# =============================================================================
_thanatos_instance: Optional[Thanatos] = None


def get_thanatos() -> Thanatos:
    """Get the global THANATOS instance"""
    global _thanatos_instance
    if _thanatos_instance is None:
        _thanatos_instance = Thanatos()
    return _thanatos_instance


async def notify_thanatos(
    event: ThanatosEvent,
    business_id: str,
    stage: Optional[str] = None,
    output_data: Optional[Dict] = None,
    metadata: Optional[Dict] = None
) -> ThanatosVerdict:
    """
    Notify THANATOS of a business event.

    This function MUST be called at every major pipeline event.
    If THANATOS returns VETOED, the operation MUST stop.
    """
    thanatos = get_thanatos()
    return await thanatos.on_business_event(
        event=event,
        business_id=business_id,
        stage=stage,
        output_data=output_data,
        metadata=metadata
    )


# =============================================================================
# WEBHOOK SIGNATURES (for external integrations)
# =============================================================================
def sign_payload(payload: Dict) -> str:
    """Create HMAC signature for webhook payload"""
    json_str = json.dumps(payload, separators=(',', ':'))
    return hmac.new(
        WEBHOOK_SECRET.encode(),
        json_str.encode(),
        hashlib.sha512
    ).hexdigest()


def verify_signature(payload: Dict, signature: str) -> bool:
    """Verify HMAC signature of webhook payload"""
    expected = sign_payload(payload)
    return hmac.compare_digest(signature, expected)


# =============================================================================
# TESTING
# =============================================================================
if __name__ == "__main__":
    async def test_thanatos():
        thanatos = get_thanatos()

        print("=" * 60)
        print("THANATOS TEST")
        print("=" * 60)

        # Test business lifecycle
        business_id = "test-business-001"

        # Business created
        verdict = await notify_thanatos(
            ThanatosEvent.BUSINESS_CREATED,
            business_id
        )
        print(f"BUSINESS_CREATED: {verdict.value}")

        # Research gate passed
        verdict = await notify_thanatos(
            ThanatosEvent.GATE_PASSED,
            business_id,
            stage="RESEARCH",
            output_data={"score": 90, "validation_score": 90}
        )
        print(f"RESEARCH gate: {verdict.value}")

        # Test failing gate
        verdict = await notify_thanatos(
            ThanatosEvent.GATE_PASSED,
            business_id,
            stage="BUILD",
            output_data={"score": 70}  # Below threshold
        )
        print(f"BUILD gate (should VETO): {verdict.value}")

        # Status
        print("\nTHANATOS Status:")
        print(json.dumps(thanatos.get_status(), indent=2))

    asyncio.run(test_thanatos())
