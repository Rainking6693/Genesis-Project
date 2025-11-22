# genesis_live_dashboard.py - Real-time Genesis Dashboard with LIVE data
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import time
import json
import os
import glob
from pathlib import Path

# ==================== PAGE CONFIG ====================
st.set_page_config(
    page_title="Genesis Live Dashboard",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==================== PATHS ====================
WORKSPACE_ROOT = Path("/home/genesis/genesis-rebuild")
LOG_FILE = Path("/tmp/genesis_cloud.log")
GENERATED_BUSINESSES_DIR = WORKSPACE_ROOT / "generated_businesses"
MONITOR_FILE = WORKSPACE_ROOT / "data" / "business_monitor.json"

# ==================== LIVE DATA FUNCTIONS ====================
def get_process_status():
    """Check if Genesis is running"""
    import subprocess
    try:
        result = subprocess.run(
            ["pgrep", "-f", "autonomous_fully_integrated"],
            capture_output=True,
            text=True
        )
        return result.returncode == 0, result.stdout.strip()
    except:
        return False, ""

def parse_log_file():
    """Parse Genesis log for real-time metrics"""
    if not LOG_FILE.exists():
        return {}
    
    data = {
        "current_business": None,
        "current_idea": None,
        "components_selected": [],
        "team_assembled": [],
        "latest_activity": [],
        "errors": [],
        "successes": 0,
        "failures": 0
    }
    
    try:
        with open(LOG_FILE, 'r') as f:
            lines = f.readlines()
            
        # Get last 500 lines for performance
        recent_lines = lines[-500:] if len(lines) > 500 else lines
        
        for line in recent_lines:
            if "BUSINESS #" in line:
                parts = line.split("BUSINESS #")
                if len(parts) > 1:
                    data["current_business"] = parts[1].split()[0]
            
            if "Generated high-quality idea:" in line:
                parts = line.split("'")
                if len(parts) > 1:
                    data["current_idea"] = parts[1]
            
            if "Team:" in line and "[" in line:
                import re
                team_match = re.search(r"\[(.*?)\]", line)
                if team_match:
                    data["team_assembled"] = eval(team_match.group(0))
            
            if "SUCCESS" in line.upper():
                data["successes"] += 1
            
            if "FAILED" in line.upper() or "ERROR" in line.upper():
                data["failures"] += 1
                data["errors"].append(line.strip()[-100:])
            
            # Collect recent activity
            if any(word in line for word in ["INFO:", "Building", "Generating", "Selected"]):
                data["latest_activity"].append({
                    "time": line[:23] if len(line) > 23 else "Unknown",
                    "message": line[24:].strip() if len(line) > 24 else line.strip()
                })
        
        # Keep only last 10 activities
        data["latest_activity"] = data["latest_activity"][-10:]
        
    except Exception as e:
        st.error(f"Error parsing log: {e}")
    
    return data

def get_generated_businesses():
    """Get list of generated businesses"""
    if not GENERATED_BUSINESSES_DIR.exists():
        return []
    
    businesses = []
    for business_dir in sorted(GENERATED_BUSINESSES_DIR.glob("*"), reverse=True):
        if business_dir.is_dir():
            # Get metadata if available
            readme = business_dir / "README.md"
            businesses.append({
                "name": business_dir.name,
                "path": str(business_dir),
                "created": datetime.fromtimestamp(business_dir.stat().st_mtime),
                "has_readme": readme.exists()
            })
    
    return businesses

def count_components_in_business(business_dir):
    """Count components in a generated business"""
    business_path = Path(business_dir)
    if not business_path.exists():
        return 0
    
    # Count React component files in src/components
    components_dir = business_path / "src" / "components"
    if components_dir.exists():
        return len(list(components_dir.glob("*.tsx"))) + len(list(components_dir.glob("*.jsx")))
    return 0

# ==================== SIDEBAR ====================
with st.sidebar:
    st.markdown("# 🚀 Genesis Live")
    st.markdown("**Real-Time Monitoring**")
    st.markdown("---")
    
    # Process status
    is_running, pid = get_process_status()
    
    if is_running:
        st.success(f"✅ Genesis Running")
        st.caption(f"PID: {pid}")
    else:
        st.error("❌ Genesis Stopped")
    
    st.markdown("---")
    
    auto_refresh = st.checkbox("🔄 Auto-refresh (5s)", value=True)
    
    if st.button("🔄 Refresh Now", use_container_width=True):
        st.rerun()
    
    st.markdown("---")
    
    last_update = datetime.now().strftime("%I:%M:%S %p")
    st.caption(f"Last updated: {last_update}")

# ==================== MAIN DASHBOARD ====================
st.title("🚀 Genesis Live Dashboard")
st.markdown("*Real-time autonomous business generation monitoring*")

# Parse live data
log_data = parse_log_file()
businesses = get_generated_businesses()

# ========== TOP METRICS ====================
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        "📦 Total Businesses",
        len(businesses),
        f"+{len(businesses)} generated"
    )

with col2:
    current_biz = log_data.get("current_business", "None")
    st.metric(
        "🔄 Current Business",
        f"#{current_biz}" if current_biz else "Idle",
        "In Progress" if is_running else "Stopped"
    )

with col3:
    st.metric(
        "✅ Successes",
        log_data.get("successes", 0),
        None
    )

with col4:
    st.metric(
        "❌ Errors",
        len(log_data.get("errors", [])),
        None
    )

st.markdown("---")

# ========== CURRENT GENERATION STATUS ====================
st.markdown("### 🎯 Current Generation Status")

if is_running and log_data.get("current_idea"):
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"""
        **Business Idea:** {log_data.get('current_idea', 'Generating...')}  
        **Business #:** {log_data.get('current_business', 'N/A')}
        """)
    
    with col2:
        team = log_data.get('team_assembled', [])
        if team:
            st.markdown(f"**Team:** {', '.join(team)}")
        else:
            st.markdown("**Team:** Assembling...")
else:
    if is_running:
        st.info("🔄 Genesis is running... waiting for business generation to start")
    else:
        st.warning("⏸️ Genesis is not currently running")

st.markdown("---")

# ========== GENERATED BUSINESSES ====================
st.markdown("### 📊 Generated Businesses")

if businesses:
    business_data = []
    for biz in businesses[:10]:  # Show last 10
        component_count = count_components_in_business(biz["path"])
        business_data.append({
            "Name": biz["name"],
            "Created": biz["created"].strftime("%Y-%m-%d %H:%M"),
            "Components": component_count,
            "Has README": "✅" if biz["has_readme"] else "❌"
        })
    
    st.dataframe(
        pd.DataFrame(business_data),
        use_container_width=True,
        hide_index=True
    )
    
    # Business growth chart
    st.markdown("### 📈 Business Generation Timeline")
    
    if len(businesses) > 1:
        biz_df = pd.DataFrame([
            {"Date": b["created"], "Count": i+1} 
            for i, b in enumerate(reversed(businesses))
        ])
        
        fig = px.line(
            biz_df,
            x="Date",
            y="Count",
            labels={"Count": "Total Businesses", "Date": "Time"}
        )
        fig.update_traces(line_color='#667eea', line_width=3)
        fig.update_layout(height=300, margin=dict(l=0, r=0, t=0, b=0))
        st.plotly_chart(fig, use_container_width=True)
else:
    st.info("No businesses generated yet. Genesis is still working on the first one!")

st.markdown("---")

# ========== RECENT ACTIVITY ====================
st.markdown("### 📋 Recent Activity")

activities = log_data.get("latest_activity", [])
if activities:
    for activity in reversed(activities[-15:]):  # Last 15 activities
        time_str = activity.get("time", "")
        msg = activity.get("message", "")
        
        # Truncate long messages
        if len(msg) > 150:
            msg = msg[:150] + "..."
        
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
    st.caption("No recent activity logged")

# ==================== AUTO-REFRESH ====================
if auto_refresh:
    time.sleep(5)
    st.rerun()

