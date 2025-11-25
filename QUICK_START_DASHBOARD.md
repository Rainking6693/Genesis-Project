# Quick Start - Genesis Dashboard

## How to Run the Dashboard

### Option 1: Double-Click the .bat File (Easiest)

1. **Find the file:** `START_UNIFIED_DASHBOARD.bat` in the Genesis-Project folder
2. **Double-click it** - The dashboard will start automatically
3. **Open your browser** to: http://localhost:8888

### Option 2: Run from Command Line

```bash
# Navigate to Genesis-Project folder
cd C:\Users\Administrator\Desktop\Genesis-Project

# Run the dashboard
python scripts\enhanced_unified_dashboard.py
```

Then open: http://localhost:8888

---

## Move to Desktop

### Method 1: Manual Copy (Easiest)

1. **Right-click** on `START_UNIFIED_DASHBOARD.bat`
2. **Select "Copy"**
3. **Go to your Desktop**
4. **Right-click** and select "Paste"
5. **Rename it** to `Genesis Dashboard.bat` (optional)

### Method 2: Use the Helper Script

1. **Double-click:** `CREATE_DESKTOP_SHORTCUT.bat`
2. It will automatically copy the file to your desktop

### Method 3: Drag and Drop

1. **Open File Explorer**
2. **Navigate to:** `C:\Users\Administrator\Desktop\Genesis-Project`
3. **Find:** `START_UNIFIED_DASHBOARD.bat`
4. **Drag it** to your Desktop
5. **Rename it** to `Genesis Dashboard.bat` (optional)

---

## What the Dashboard Shows

When you open http://localhost:8888, you'll see:

1. **📋 Plain English Status Banner** (Top)
   - Shows if system is running or not
   - Agent health in plain English

2. **📋 Agent Activity** (What agents are doing)
   - Real-time activity feed
   - Active Generation (businesses being created)
   - Recent Completions (finished businesses)

3. **📊 Metrics Cards**
   - Business Generation stats
   - System Health
   - Cost & Performance

4. **🔧 All Systems Status**
   - All 79 systems with status
   - Explanations for optional systems

---

## Troubleshooting

### "Port 8888 already in use"
- Another dashboard might be running
- Close it or change the port in `scripts/enhanced_unified_dashboard.py`

### "Python not found"
- Make sure Python is installed
- Try: `python --version` in command prompt

### Dashboard shows "System Not Running"
- This is correct if Genesis isn't running
- Start Genesis first, then refresh the dashboard

---

## Quick Reference

**Dashboard URL:** http://localhost:8888  
**File to run:** `START_UNIFIED_DASHBOARD.bat`  
**Auto-refresh:** Every 3 seconds  
**Stop dashboard:** Press Ctrl+C in the terminal

---

**That's it!** Just double-click the .bat file and open your browser. 🚀

