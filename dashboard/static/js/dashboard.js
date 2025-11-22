// Genesis Monitoring Dashboard - JavaScript

// Configuration
const REFRESH_INTERVAL = 30000; // 30 seconds
const API_BASE = '/api';

// Global chart instances
let agentPerformanceChart = null;
let costChart = null;
let llmChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    loadAllMetrics();

    // Auto-refresh
    setInterval(loadAllMetrics, REFRESH_INTERVAL);

    // Event listeners
    document.getElementById('refresh-btn').addEventListener('click', loadAllMetrics);
    document.getElementById('snapshot-btn').addEventListener('click', saveSnapshot);
});

// Initialize Chart.js charts
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#f1f5f9'
                }
            }
        },
        scales: {
            y: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#475569' }
            },
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#475569' }
            }
        }
    };

    // Agent Performance Chart
    const agentCtx = document.getElementById('agent-performance-chart').getContext('2d');
    agentPerformanceChart = new Chart(agentCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Success Rate (%)',
                data: [],
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        },
        options: chartOptions
    });

    // Cost Chart
    const costCtx = document.getElementById('cost-chart').getContext('2d');
    costChart = new Chart(costCtx, {
        type: 'bar',
        data: {
            labels: ['Baseline', 'Current'],
            datasets: [{
                label: 'Monthly Cost ($)',
                data: [500, 60],
                backgroundColor: ['rgba(239, 68, 68, 0.6)', 'rgba(16, 185, 129, 0.6)'],
                borderColor: ['rgba(239, 68, 68, 1)', 'rgba(16, 185, 129, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                legend: { display: false }
            }
        }
    });

    // LLM Usage Chart
    const llmCtx = document.getElementById('llm-chart').getContext('2d');
    llmChart = new Chart(llmCtx, {
        type: 'doughnut',
        data: {
            labels: ['GPT-4o', 'Gemini Flash', 'Claude Sonnet'],
            datasets: [{
                data: [33, 34, 33],
                backgroundColor: [
                    'rgba(37, 99, 235, 0.6)',
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(245, 158, 11, 0.6)'
                ],
                borderColor: [
                    'rgba(37, 99, 235, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f1f5f9'
                    }
                }
            }
        }
    });
}

// Load all metrics from API
async function loadAllMetrics() {
    try {
        const response = await fetch(`${API_BASE}/metrics`);
        const result = await response.json();

        if (result.status === 'success') {
            updateDashboard(result.data);
            updateLastUpdateTime();
        } else {
            console.error('Failed to load metrics:', result.message);
        }
    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

// Update all dashboard sections
function updateDashboard(data) {
    updateExecutiveOverview(data.executive_overview);
    updateAgentPerformance(data.agent_performance);
    updateOrchestrationMetrics(data.orchestration_metrics);
    updateEvolutionLearning(data.evolution_learning);
    updateSafetyGovernance(data.safety_governance);
    updateCostOptimization(data.cost_optimization);
}

// Update Executive Overview section
function updateExecutiveOverview(data) {
    document.getElementById('revenue-value').textContent = `$${data.revenue_monthly.toFixed(2)}`;
    document.getElementById('costs-value').textContent = `$${data.costs_monthly.toFixed(2)}`;
    document.getElementById('profit-value').textContent = `$${data.profit_monthly.toFixed(2)}`;
    document.getElementById('businesses-value').textContent = data.active_businesses;
    document.getElementById('tasks-value').textContent = data.tasks_completed_30d.toLocaleString();
    document.getElementById('success-rate-value').textContent = `${data.success_rate}%`;

    // Update profit change indicator
    const profitChange = document.getElementById('profit-change');
    if (data.profit_monthly > 0) {
        profitChange.textContent = 'Profitable';
        profitChange.className = 'card-change positive';
    } else {
        profitChange.textContent = 'Operating Cost';
        profitChange.className = 'card-change';
    }
}

// Update Agent Performance section
function updateAgentPerformance(data) {
    // Update chart
    const labels = data.agents.map(a => a.name);
    const successRates = data.agents.map(a => a.success_rate);

    agentPerformanceChart.data.labels = labels;
    agentPerformanceChart.data.datasets[0].data = successRates;
    agentPerformanceChart.update();

    // Update table
    const tbody = document.getElementById('agent-table-body');
    tbody.innerHTML = '';

    data.agents.forEach(agent => {
        const row = document.createElement('tr');

        const successClass = agent.success_rate >= 90 ? 'status-good' :
                            agent.success_rate >= 70 ? 'status-warning' : 'status-error';

        row.innerHTML = `
            <td><strong>${agent.name}</strong></td>
            <td class="${successClass}">${agent.success_rate}%</td>
            <td>${agent.avg_latency_ms.toFixed(0)} ms</td>
            <td>$${agent.cost_per_task.toFixed(3)}</td>
            <td>${agent.quality_score.toFixed(1)}/10</td>
            <td>${agent.tasks_completed}</td>
        `;

        tbody.appendChild(row);
    });
}

// Update Orchestration Metrics section
function updateOrchestrationMetrics(data) {
    // HTDAG
    document.getElementById('htdag-decompositions').textContent = data.htdag.decompositions_total;
    document.getElementById('htdag-depth').textContent = data.htdag.avg_depth.toFixed(1);
    document.getElementById('htdag-nodes').textContent = data.htdag.avg_nodes.toFixed(1);
    document.getElementById('htdag-circular').textContent = data.htdag.circular_deps_detected;

    // HALO
    document.getElementById('halo-decisions').textContent = data.halo.routing_decisions;
    document.getElementById('halo-time').textContent = `${data.halo.avg_routing_time_ms.toFixed(1)} ms`;
    document.getElementById('halo-balancing').textContent = data.halo.load_balancing_events;
    document.getElementById('halo-failures').textContent = data.halo.routing_failures;

    // AOP
    document.getElementById('aop-validations').textContent = data.aop.validations_total;
    document.getElementById('aop-solvability').textContent = data.aop.solvability_failures;
    document.getElementById('aop-completeness').textContent = data.aop.completeness_failures;
    document.getElementById('aop-redundancy').textContent = data.aop.redundancy_detected;

    // Circuit Breaker
    const statusElement = document.getElementById('breaker-status');
    statusElement.textContent = data.circuit_breaker.status;
    statusElement.className = `metric-value status-${data.circuit_breaker.status.toLowerCase().replace('_', '-')}`;
    document.getElementById('breaker-trips').textContent = data.circuit_breaker.trips_24h;
    document.getElementById('breaker-failures').textContent = data.circuit_breaker.failures_count;
}

// Update Evolution & Learning section
function updateEvolutionLearning(data) {
    // SE-Darwin
    document.getElementById('darwin-runs').textContent = data.se_darwin.evolution_runs;
    document.getElementById('darwin-improvements').textContent = data.se_darwin.improvements_generated;
    document.getElementById('darwin-quality').textContent = `${data.se_darwin.avg_quality_improvement.toFixed(1)}%`;
    document.getElementById('darwin-archive').textContent = data.se_darwin.archive_size;

    // ATLAS
    document.getElementById('atlas-updates').textContent = data.atlas.online_learning_updates;
    document.getElementById('atlas-knowledge').textContent = data.atlas.knowledge_items_learned;
    document.getElementById('atlas-rate').textContent = data.atlas.learning_rate.toFixed(2);

    // AgentGit
    document.getElementById('agentgit-commits').textContent = data.agentgit.commits_7d;
    document.getElementById('agentgit-versions').textContent = data.agentgit.versions_tracked;
    document.getElementById('agentgit-rollbacks').textContent = data.agentgit.rollbacks_7d;
}

// Update Safety & Governance section
function updateSafetyGovernance(data) {
    // Policy Violations
    document.getElementById('violations-total').textContent = data.policy_violations.total_7d;
    document.getElementById('violations-critical').textContent = data.policy_violations.by_severity.critical;
    document.getElementById('violations-high').textContent = data.policy_violations.by_severity.high;
    document.getElementById('violations-medium').textContent = data.policy_violations.by_severity.medium;

    // Human Oversight
    document.getElementById('approvals-requested').textContent = data.human_oversight.approvals_requested;
    document.getElementById('approvals-granted').textContent = data.human_oversight.approvals_granted;
    document.getElementById('approvals-denied').textContent = data.human_oversight.approvals_denied;
    document.getElementById('approvals-time').textContent = `${data.human_oversight.avg_response_time_min.toFixed(1)} min`;

    // WaltzRL
    document.getElementById('waltz-unsafe').textContent = data.waltzrl.unsafe_detections;
    document.getElementById('waltz-feedback').textContent = data.waltzrl.feedback_loops;
    document.getElementById('waltz-score').textContent = data.waltzrl.safety_score.toFixed(1);
}

// Update Cost Optimization section
function updateCostOptimization(data) {
    // Cost stats
    document.getElementById('cost-baseline').textContent = `$${data.monthly_cost_baseline.toFixed(2)}`;
    document.getElementById('cost-actual').textContent = `$${data.monthly_cost_actual.toFixed(2)}`;
    document.getElementById('cost-reduction').textContent = `${data.cost_reduction_pct}%`;

    // Update cost chart
    costChart.data.datasets[0].data = [data.monthly_cost_baseline, data.monthly_cost_actual];
    costChart.update();

    // Update LLM usage chart
    llmChart.data.datasets[0].data = [
        data.llm_usage.gpt4o.percentage,
        data.llm_usage.gemini.percentage,
        data.llm_usage.claude.percentage
    ];
    llmChart.update();

    // Update optimizations list
    const optimizationList = document.getElementById('optimization-list');
    optimizationList.innerHTML = '';

    const optimizations = [
        { name: 'SGLang Router', active: data.optimizations.sglang_router_active },
        { name: 'Memento CaseBank', active: data.optimizations.memento_casebank_active },
        { name: 'vLLM Token Caching', active: data.optimizations.vllm_caching_active },
        { name: 'Memory×Router Coupling', active: data.optimizations.memory_router_coupling_active },
        { name: 'Long-Context Optimization', active: data.optimizations.long_context_optimization_active }
    ];

    optimizations.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'optimization-item';
        div.innerHTML = `
            <div class="optimization-status ${opt.active ? '' : 'inactive'}"></div>
            <div class="optimization-name">${opt.name}</div>
        `;
        optimizationList.appendChild(div);
    });
}

// Update last update timestamp
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-update').textContent = `Last updated: ${timeString}`;
}

// Save metrics snapshot
async function saveSnapshot() {
    try {
        const response = await fetch(`${API_BASE}/snapshot`, { method: 'POST' });
        const result = await response.json();

        if (result.status === 'success') {
            alert(`Snapshot saved: ${result.filename}`);
        } else {
            alert(`Failed to save snapshot: ${result.message}`);
        }
    } catch (error) {
        console.error('Error saving snapshot:', error);
        alert('Error saving snapshot');
    }
}

// Format large numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Export for debugging
window.dashboardDebug = {
    loadAllMetrics,
    saveSnapshot,
    agentPerformanceChart,
    costChart,
    llmChart
};
