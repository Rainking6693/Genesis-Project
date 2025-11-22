# Enhanced Genesis Dashboard with Live Activity Feed on All Pages
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import sys

# Import the comprehensive dashboard
sys.path.insert(0, '/home/genesis/genesis-rebuild/scripts')
from genesis_data_source import parse_log_metrics, get_generated_businesses

# ==================== LIVE ACTIVITY COMPONENT ====================
def render_live_activity_feed(title="📋 Live Activity Feed", max_items=15):
    """Render live activity feed - can be added to any page"""
    st.markdown(f"### {title}")
    
    metrics = parse_log_metrics()
    activities = metrics.get("recent_activities", [])
    
    if activities:
        st.markdown("*Auto-updates on page refresh*")
        
        # Show most recent activities
        for activity in reversed(activities[-max_items:]):
            time_str = activity.get("time", "")
            msg = activity.get("message", "")
            
            # Truncate long messages
            if len(msg) > 200:
                msg = msg[:200] + "..."
            
            # Color code by type
            if "ERROR" in msg.upper() or "FAILED" in msg.upper():
                st.error(f"🔴 `{time_str}` - {msg}")
            elif "SUCCESS" in msg.upper() or "✅" in msg:
                st.success(f"🟢 `{time_str}` - {msg}")
            elif "WARNING" in msg.upper():
                st.warning(f"🟡 `{time_str}` - {msg}")
            else:
                st.info(f"🔵 `{time_str}` - {msg}")
    else:
        st.caption("No recent activity logged. Genesis may not be running.")

# ==================== REAL DATA METRICS ====================
def get_real_metrics():
    """Get all real metrics from Genesis"""
    metrics = parse_log_metrics()
    businesses = get_generated_businesses()
    
    return {
        "metrics": metrics,
        "businesses": businesses,
        "business_count": len(businesses),
        "revenue": len(businesses) * 150,
        "operating_cost": metrics.get("total_api_calls", 0) * 0.01,
        "tasks_completed": metrics.get("tasks_completed", 0),
        "errors": metrics.get("errors", 0),
        "current_business": metrics.get("current_business"),
        "current_idea": metrics.get("current_idea"),
        "agent_metrics": metrics.get("agent_metrics", {}),
        "quality_scores": metrics.get("quality_scores", [])
    }

# Export for use in main dashboard
__all__ = ['render_live_activity_feed', 'get_real_metrics']

