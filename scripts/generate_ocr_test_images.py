"""
Generate 20 Test Images for OCR Regression Testing
===================================================

Creates realistic test images for 5 agents (QA, Support, Legal, Analyst, Marketing)
Each agent gets 4 test images representing their typical use cases.

Author: Alex (E2E Testing Specialist)
Date: October 27, 2025
"""

import os
from PIL import Image, ImageDraw, ImageFont
import json

# Create output directory
os.makedirs("/home/genesis/genesis-rebuild/benchmarks/test_images", exist_ok=True)

# Ground truth data
ground_truth = {}

def create_text_image(filename, texts, size=(1920, 1080), bg_color=(255, 255, 255)):
    """Create image with text content"""
    img = Image.new('RGB', size, color=bg_color)
    draw = ImageDraw.Draw(img)

    # Try to use a system font, fallback to default
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except:
        font = ImageFont.load_default()
        font_small = font

    y_offset = 50
    full_text = []

    for text_item in texts:
        if isinstance(text_item, dict):
            text = text_item['text']
            font_size = text_item.get('size', 'normal')
            use_font = font if font_size == 'normal' else font_small
        else:
            text = text_item
            use_font = font

        draw.text((50, y_offset), text, fill=(0, 0, 0), font=use_font)
        full_text.append(text)
        y_offset += 60 if use_font == font else 40

    # Save image
    path = f"/home/genesis/genesis-rebuild/benchmarks/test_images/{filename}"
    img.save(path)

    # Store ground truth
    ground_truth[filename] = "\n".join(full_text)
    print(f"✓ Created {filename}")

# ============================================================================
# QA AGENT TEST IMAGES (4)
# ============================================================================

# QA 1: UI Screenshot
create_text_image("qa_ui_screenshot.png", [
    "Application Dashboard",
    "User: john.doe@example.com",
    "Status: Active",
    "Last Login: 2025-10-27 10:15:23",
    "Test Suite: Passed 42/45 tests",
    "Coverage: 87.3%",
])

# QA 2: Code Snippet
create_text_image("qa_code_snippet.png", [
    "def test_authentication():",
    "    user = create_test_user()",
    "    token = authenticate(user)",
    "    assert token is not None",
    "    assert validate_token(token) == True",
    "    assert get_user_from_token(token) == user",
])

# QA 3: Error Message
create_text_image("qa_error_message.png", [
    "ERROR: Test Failed",
    "AssertionError: Expected 200, got 404",
    "File: test_api.py, Line 42",
    "Test: test_user_registration",
    "Traceback:",
    "  at authentication.py:127 in validate_user()",
    "  at handlers.py:89 in create_user()",
], bg_color=(255, 230, 230))  # Light red background

# QA 4: Test Output
create_text_image("qa_test_output.png", [
    "============================= test session starts ==============================",
    "platform linux -- Python 3.12.3, pytest-8.4.2, pluggy-1.5.0",
    "collected 87 items",
    "",
    "tests/test_unit.py .................... [ 23%]",
    "tests/test_integration.py ............. [ 42%]",
    "tests/test_e2e.py ..................... [ 65%]",
    "tests/test_performance.py ............. [100%]",
    "",
    "============================= 87 passed in 12.34s ==============================",
])

# ============================================================================
# SUPPORT AGENT TEST IMAGES (4)
# ============================================================================

# Support 1: Customer Ticket
create_text_image("support_ticket_1.png", [
    "Support Ticket #45821",
    "Date: October 27, 2025",
    "Customer: Sarah Johnson",
    "Email: sarah.j@company.com",
    "Priority: High",
    "",
    "Issue: Cannot login to account",
    "Description: Getting 'Invalid credentials' error",
    "Browser: Chrome 131.0.6778.69",
    "Platform: Windows 11",
])

# Support 2: Error Log
create_text_image("support_error_log.png", [
    "[2025-10-27 10:15:42] ERROR: Connection timeout",
    "[2025-10-27 10:15:43] WARN: Retrying connection (attempt 1/3)",
    "[2025-10-27 10:15:48] ERROR: Connection timeout",
    "[2025-10-27 10:15:49] WARN: Retrying connection (attempt 2/3)",
    "[2025-10-27 10:15:54] ERROR: Connection timeout",
    "[2025-10-27 10:15:55] ERROR: Max retries reached, operation failed",
    "[2025-10-27 10:15:55] INFO: User notified of service outage",
])

# Support 3: Customer Query
create_text_image("support_customer_query.png", [
    "Customer Query",
    "",
    "Subject: Billing Question",
    "From: mark.wilson@email.com",
    "Received: Oct 27, 2025 09:32 AM",
    "",
    "Hi Support Team,",
    "",
    "I was charged $49.99 but my plan says $29.99.",
    "Can you help me understand the difference?",
    "",
    "Invoice #: INV-2025-10271",
])

# Support 4: System Status
create_text_image("support_system_status.png", [
    "System Health Dashboard",
    "Last Updated: 2025-10-27 10:18:00",
    "",
    "API Server: OPERATIONAL (99.8% uptime)",
    "Database: OPERATIONAL (Response: 23ms)",
    "Cache: OPERATIONAL (Hit Rate: 94.2%)",
    "Queue: WARNING (1,247 pending jobs)",
    "Storage: OPERATIONAL (87% capacity)",
], bg_color=(230, 255, 230))  # Light green background

# ============================================================================
# LEGAL AGENT TEST IMAGES (4)
# ============================================================================

# Legal 1: Contract Page 1
create_text_image("legal_contract_page1.png", [
    "SOFTWARE LICENSE AGREEMENT",
    "",
    "This Agreement is entered into as of October 27, 2025",
    "between Genesis AI Inc. (Licensor) and Customer (Licensee).",
    "",
    "1. GRANT OF LICENSE",
    "Licensor grants Licensee a non-exclusive, non-transferable",
    "license to use the Software in accordance with this Agreement.",
    "",
    "2. LICENSE RESTRICTIONS",
    "Licensee shall not: (a) reverse engineer the Software,",
])

# Legal 2: Terms and Conditions
create_text_image("legal_terms_conditions.png", [
    "TERMS AND CONDITIONS OF SERVICE",
    "",
    "Last Updated: October 27, 2025",
    "",
    "1. ACCEPTANCE OF TERMS",
    "By accessing this service, you agree to be bound by these",
    "terms and conditions. If you do not agree, do not use.",
    "",
    "2. USER OBLIGATIONS",
    "Users must: (a) Provide accurate information",
    "(b) Maintain account security (c) Comply with all laws",
])

# Legal 3: Invoice
create_text_image("legal_invoice.png", [
    "INVOICE",
    "",
    "Invoice Number: INV-2025-00142",
    "Date: October 27, 2025",
    "Due Date: November 11, 2025",
    "",
    "Bill To:",
    "Acme Corporation",
    "123 Business St, San Francisco, CA 94105",
    "",
    "Description                        Amount",
    "Professional Services (40 hrs)     $8,000.00",
    "Software License (Annual)          $2,400.00",
    "                         TOTAL:   $10,400.00",
])

# Legal 4: NDA
create_text_image("legal_nda.png", [
    "NON-DISCLOSURE AGREEMENT",
    "",
    "Effective Date: October 27, 2025",
    "",
    "This NDA is between Genesis AI Inc. (Disclosing Party)",
    "and Partner Company (Receiving Party).",
    "",
    "1. CONFIDENTIAL INFORMATION",
    "All information disclosed during business relationship",
    "shall be considered confidential, including but not",
    "limited to: technical data, business strategies,",
    "customer information, and proprietary algorithms.",
])

# ============================================================================
# ANALYST AGENT TEST IMAGES (4)
# ============================================================================

# Analyst 1: Chart
create_text_image("analyst_chart.png", [
    "Q3 2025 REVENUE ANALYSIS",
    "",
    "Revenue Growth:",
    "July:        $124,500 (+12.3%)",
    "August:      $138,200 (+11.0%)",
    "September:   $152,100 (+10.1%)",
    "",
    "Total Q3:    $414,800 (+11.1% vs Q2)",
    "",
    "Top Products:",
    "1. Enterprise Plan    $245,600 (59%)",
    "2. Professional Plan  $123,800 (30%)",
    "3. Basic Plan          $45,400 (11%)",
])

# Analyst 2: Data Table
create_text_image("analyst_table.png", [
    "USER ENGAGEMENT METRICS - OCTOBER 2025",
    "",
    "Metric               Current    Previous   Change",
    "---------------------------------------------------",
    "Daily Active Users   12,847     11,234     +14.4%",
    "Weekly Active Users  34,521     31,089     +11.0%",
    "Monthly Active Users 89,432     82,156     +8.9%",
    "Avg Session (min)    18.3       16.7       +9.6%",
    "Bounce Rate          32.1%      35.8%      -10.3%",
    "Conversion Rate      4.7%       4.2%       +11.9%",
])

# Analyst 3: Report Summary
create_text_image("analyst_report.png", [
    "EXECUTIVE SUMMARY",
    "Quarterly Business Review - Q3 2025",
    "",
    "KEY HIGHLIGHTS:",
    "",
    "• Revenue increased 11.1% to $414,800",
    "• User growth accelerated to 14.4% DAU",
    "• Customer retention improved to 94.2%",
    "• Net Promoter Score reached 72 (+8 points)",
    "",
    "STRATEGIC INITIATIVES:",
    "• Launched Enterprise tier (59% of revenue)",
    "• Reduced churn rate by 23%",
])

# Analyst 4: KPI Dashboard
create_text_image("analyst_metrics.png", [
    "KEY PERFORMANCE INDICATORS",
    "As of October 27, 2025",
    "",
    "FINANCIAL METRICS:",
    "  MRR (Monthly Recurring Revenue):  $138,267",
    "  ARR (Annual Recurring Revenue):   $1,659,204",
    "  CAC (Customer Acquisition Cost):  $847",
    "  LTV (Lifetime Value):             $3,245",
    "  LTV:CAC Ratio:                    3.8:1",
    "",
    "OPERATIONAL METRICS:",
    "  Support Resolution Time:          4.2 hours",
    "  System Uptime:                    99.87%",
], bg_color=(230, 240, 255))  # Light blue background

# ============================================================================
# MARKETING AGENT TEST IMAGES (4)
# ============================================================================

# Marketing 1: Ad Creative
create_text_image("marketing_ad.png", [
    "TRANSFORM YOUR BUSINESS WITH AI",
    "",
    "Genesis AI Platform",
    "The Future of Autonomous Business Operations",
    "",
    "✓ 10x faster than manual processes",
    "✓ 95% cost reduction",
    "✓ 24/7 autonomous operation",
    "",
    "Limited Time Offer:",
    "Start FREE for 30 days",
    "",
    "Visit: genesisai.com/start",
], bg_color=(240, 255, 240))  # Light green background

# Marketing 2: Landing Page
create_text_image("marketing_landing_page.png", [
    "Welcome to Genesis AI",
    "",
    "REVOLUTIONIZING BUSINESS AUTOMATION",
    "",
    "Trusted by 1,000+ companies worldwide",
    "",
    "Features:",
    "• Multi-agent orchestration",
    "• Self-improving AI systems",
    "• Enterprise-grade security",
    "• 99.9% uptime guarantee",
    "",
    "Get Started Today - No Credit Card Required",
    "[Sign Up Free]    [Watch Demo]    [Contact Sales]",
])

# Marketing 3: Email Campaign
create_text_image("marketing_email.png", [
    "Subject: Your AI Journey Starts Here",
    "",
    "Hi Sarah,",
    "",
    "We noticed you checked out our Enterprise Plan.",
    "Here's what you get:",
    "",
    "• Unlimited agents",
    "• Priority support",
    "• Custom integrations",
    "• Dedicated account manager",
    "",
    "Special offer: 20% off first year",
    "Use code: EARLY2025 at checkout",
    "",
    "Questions? Reply to this email.",
])

# Marketing 4: Social Media Post
create_text_image("marketing_social_post.png", [
    "CUSTOMER SUCCESS STORY",
    "",
    "How Acme Corp Saved $2M Annually",
    "",
    "Challenge:",
    "Manual processes cost 80 hours/week",
    "",
    "Solution:",
    "Genesis AI autonomous agents",
    "",
    "Results:",
    "✓ 92% time savings",
    "✓ $2.1M annual cost reduction",
    "✓ Zero errors in 6 months",
    "",
    "Read the full case study: genesisai.com/case-studies",
], bg_color=(255, 245, 230))  # Light orange background

# ============================================================================
# SAVE GROUND TRUTH DATA
# ============================================================================

ground_truth_path = "/home/genesis/genesis-rebuild/benchmarks/test_images/ground_truth.json"
with open(ground_truth_path, 'w') as f:
    json.dump(ground_truth, f, indent=2)

print(f"\n✅ Generated 20 test images")
print(f"✅ Created ground truth: {ground_truth_path}")
print(f"\nTest Image Distribution:")
print(f"  QA Agent:        4 images")
print(f"  Support Agent:   4 images")
print(f"  Legal Agent:     4 images")
print(f"  Analyst Agent:   4 images")
print(f"  Marketing Agent: 4 images")
print(f"  TOTAL:          20 images")
