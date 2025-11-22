#!/bin/bash
# Genesis Weekend Training - Quick Status Check
# Run this anytime to see current status

echo "================================================================================"
echo "GENESIS WEEKEND TRAINING STATUS"
echo "================================================================================"
echo ""

# Check timestamp
echo "Current Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# Check Autonomous Scheduler
echo "--- AUTONOMOUS SCHEDULER ---"
if ps aux | grep -q "[a]utonomous_scheduler.py"; then
    echo "Status: ✅ RUNNING"

    # Check heartbeat
    if [ -f "/tmp/genesis_scheduler_heartbeat.json" ]; then
        echo ""
        echo "Heartbeat:"
        cat /tmp/genesis_scheduler_heartbeat.json | python -m json.tool 2>/dev/null || cat /tmp/genesis_scheduler_heartbeat.json
    else
        echo "Heartbeat: Not yet created (first business still generating)"
    fi

    # Show recent log
    echo ""
    echo "Recent Activity:"
    tail -10 autonomous_scheduler_weekend.log | grep -E "(Generating business|SUCCESSFUL|FAILED|Next cycle)" || echo "Check log file for details"
else
    echo "Status: ❌ NOT RUNNING"
    echo "To restart: python scripts/autonomous_scheduler.py --min-interval 5 --max-interval 10 > autonomous_scheduler_weekend.log 2>&1 &"
fi
echo ""

# Check A2A Service
echo "--- A2A SERVICE ---"
if ps aux | grep -q "[a]2a_fastapi.py"; then
    echo "Status: ✅ RUNNING"

    # Check health endpoint
    echo ""
    echo "Health Check:"
    curl -s http://localhost:8000/health | python -m json.tool 2>/dev/null || echo "Health endpoint not responding"
else
    echo "Status: ❌ NOT RUNNING"
    echo "To restart: python a2a_fastapi.py > a2a_service_weekend.log 2>&1 &"
fi
echo ""

# Count generated businesses
echo "--- GENERATED BUSINESSES ---"
if [ -d "businesses/autonomous" ]; then
    BUSINESS_COUNT=$(ls -1 businesses/autonomous/ | wc -l)
    echo "Total Businesses: $BUSINESS_COUNT"

    if [ $BUSINESS_COUNT -gt 0 ]; then
        echo ""
        echo "Latest Businesses:"
        ls -lt businesses/autonomous/ | head -5 | tail -4 | awk '{print "  - " $9 " (" $6 " " $7 " " $8 ")"}'
    fi
else
    echo "Total Businesses: 0 (directory not yet created)"
fi
echo ""

# Check for recent errors
echo "--- ERROR CHECK ---"
SCHEDULER_ERRORS=$(tail -100 autonomous_scheduler_weekend.log | grep -c "ERROR" || echo "0")
A2A_ERRORS=$(tail -100 a2a_service_weekend.log | grep -c "ERROR" || echo "0")

if [ "$SCHEDULER_ERRORS" -eq 0 ] && [ "$A2A_ERRORS" -eq 0 ]; then
    echo "Status: ✅ NO ERRORS in last 100 log lines"
else
    echo "Status: ⚠️  ERRORS FOUND"
    echo "  Scheduler errors: $SCHEDULER_ERRORS"
    echo "  A2A errors: $A2A_ERRORS"
    echo ""
    echo "Recent Errors:"
    echo "--- Scheduler ---"
    tail -100 autonomous_scheduler_weekend.log | grep "ERROR" | tail -3 || echo "  None"
    echo "--- A2A Service ---"
    tail -100 a2a_service_weekend.log | grep "ERROR" | tail -3 || echo "  None"
fi
echo ""

echo "================================================================================"
echo "For detailed logs:"
echo "  Scheduler: tail -f autonomous_scheduler_weekend.log"
echo "  A2A:       tail -f a2a_service_weekend.log"
echo "================================================================================"
