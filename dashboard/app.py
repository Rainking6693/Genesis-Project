"""
Genesis Monitoring Dashboard - Flask Application
Web-based monitoring dashboard for Genesis multi-agent system.
"""

from flask import Flask, render_template, jsonify, request
from metrics_collector import MetricsCollector
import os
from pathlib import Path
from datetime import datetime

app = Flask(__name__)

# Configure paths
BASE_PATH = Path(__file__).parent.parent
collector = MetricsCollector(base_path=BASE_PATH)


@app.route('/')
def index():
    """Render main dashboard page."""
    return render_template('index.html')


@app.route('/api/metrics')
def get_metrics():
    """Get all current metrics as JSON.

    Returns:
        JSON response with all collected metrics
    """
    try:
        metrics = collector.collect_all_metrics()
        return jsonify({
            "status": "success",
            "data": metrics
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/metrics/executive')
def get_executive_metrics():
    """Get executive overview metrics only.

    Returns:
        JSON response with executive metrics
    """
    try:
        metrics = collector._collect_executive_overview()
        return jsonify({
            "status": "success",
            "data": metrics
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/metrics/agents')
def get_agent_metrics():
    """Get agent performance metrics.

    Returns:
        JSON response with agent metrics
    """
    try:
        metrics = collector._collect_agent_performance()
        return jsonify({
            "status": "success",
            "data": metrics
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/metrics/orchestration')
def get_orchestration_metrics():
    """Get orchestration layer metrics.

    Returns:
        JSON response with orchestration metrics
    """
    try:
        metrics = collector._collect_orchestration_metrics()
        return jsonify({
            "status": "success",
            "data": metrics
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/metrics/evolution')
def get_evolution_metrics():
    """Get evolution and learning metrics.

    Returns:
        JSON response with evolution metrics
    """
    try:
        metrics = collector._collect_evolution_learning()
        return jsonify({
            "status": "success",
            "data": metrics
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/metrics/safety')
def get_safety_metrics():
    """Get safety and governance metrics.

    Returns:
        JSON response with safety metrics
    """
    try:
        metrics = collector._collect_safety_governance()
        return jsonify({
            "status": "success",
            "data": metrics
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/metrics/costs')
def get_cost_metrics():
    """Get cost optimization metrics.

    Returns:
        JSON response with cost metrics
    """
    try:
        metrics = collector._collect_cost_optimization()
        return jsonify({
            "status": "success",
            "data": metrics
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/snapshot', methods=['POST'])
def save_snapshot():
    """Save current metrics snapshot.

    Returns:
        JSON response with snapshot file path
    """
    try:
        filename = collector.save_metrics_snapshot()
        return jsonify({
            "status": "success",
            "message": "Snapshot saved successfully",
            "filename": filename
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/health')
def health_check():
    """Health check endpoint.

    Returns:
        JSON response with service health status
    """
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Genesis Monitoring Dashboard"
    })


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        "status": "error",
        "message": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({
        "status": "error",
        "message": "Internal server error"
    }), 500


if __name__ == '__main__':
    # Get port from environment (Render sets PORT automatically)
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    
    # Production server
    app.run(debug=debug, host=host, port=port)
