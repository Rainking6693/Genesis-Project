#!/bin/bash

# Monitor the generation progress every 30 seconds
echo "=== Generation Monitor Started ==="
echo "Monitoring 5 agents generating 6,665 total examples..."
echo ""

while true; do
    clear
    echo "=== Training Data Generation Progress ==="
    echo "Started: $(date)"
    echo ""

    # Check each agent
    for agent in qa support legal analyst content; do
        FILE="data/generated_examples/${agent}_agent_examples.jsonl"
        if [ -f "$FILE" ]; then
            COUNT=$(wc -l < "$FILE" 2>/dev/null || echo "0")
            SIZE=$(du -h "$FILE" 2>/dev/null | cut -f1)
            PERCENT=$(echo "scale=1; ($COUNT / 1333) * 100" | bc 2>/dev/null || echo "0")
            echo "✅ ${agent}_agent: $COUNT/1333 examples ($PERCENT%) - $SIZE"
        else
            echo "⏳ ${agent}_agent: Generating first batch..."
        fi
    done

    echo ""
    echo "Total progress:"
    TOTAL=$(find data/generated_examples -name "*_agent_examples.jsonl" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    TOTAL_PERCENT=$(echo "scale=1; ($TOTAL / 6665) * 100" | bc 2>/dev/null || echo "0")
    echo "  $TOTAL/6665 examples generated ($TOTAL_PERCENT%)"

    # Check if all done
    if [ "$TOTAL" -ge 6665 ]; then
        echo ""
        echo "🎉 ALL COMPLETE! 6,665 examples generated successfully!"
        break
    fi

    echo ""
    echo "Next update in 30 seconds... (Ctrl+C to stop monitoring)"
    sleep 30
done
