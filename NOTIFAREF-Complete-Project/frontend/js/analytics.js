// NOTIFAREF - Analytics Dashboard

class AnalyticsManager {
  constructor() {
    this.charts = {};
    this.currentPeriod = 30;
    this.data = {};
    this.init();
  }

  async init() {
    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadAnalyticsData();
  }

  setupEventListeners() {
    // Period selector
    const periodSelect = Utils.$('#analytics-period');
    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        this.currentPeriod = parseInt(e.target.value);
        this.loadAnalyticsData();
      });
    }

    // Export button
    const exportBtn = Utils.$('#export-analytics-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportAnalytics());
    }

    // Refresh button
    const refreshBtn = Utils.$('#refresh-analytics-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadAnalyticsData());
    }
  }

  async loadAnalyticsData() {
    try {
      // Show loading state
      this.showLoadingState();

      // Load all analytics data in parallel
      const [dashboardData, trendsData, performanceData, tagsData] = await Promise.all([
        api.getDashboardAnalytics(this.currentPeriod),
        api.getTrends(this.currentPeriod, 'day'),
        api.getPerformanceMetrics(this.currentPeriod),
        api.getTagAnalytics(this.currentPeriod, 10)
      ]);

      if (dashboardData.success) {
        this.data.dashboard = dashboardData.data;
      }

      if (trendsData.success) {
        this.data.trends = trendsData.data;
      }

      if (performanceData.success) {
        this.data.performance = performanceData.data;
      }

      if (tagsData.success) {
        this.data.tags = tagsData.data;
      }

      // Render charts
      this.renderCharts();
      
      // Hide loading state
      this.hideLoadingState();

    } catch (error) {
      Utils.handleError(error, 'Loading Analytics Data');
      this.hideLoadingState();
    }
  }

  showLoadingState() {
    const chartsContainer = Utils.$('#analytics-content');
    if (chartsContainer) {
      chartsContainer.classList.add('loading');
    }
  }

  hideLoadingState() {
    const chartsContainer = Utils.$('#analytics-content');
    if (chartsContainer) {
      chartsContainer.classList.remove('loading');
    }
  }

  renderCharts() {
    // Destroy existing charts
    this.destroyCharts();

    // Render completion rate chart
    this.renderCompletionChart();
    
    // Render priority distribution chart
    this.renderPriorityChart();
    
    // Render trends chart
    this.renderTrendsChart();
    
    // Render tags chart
    this.renderTagsChart();
    
    // Render performance metrics
    this.renderPerformanceMetrics();
  }

  renderCompletionChart() {
    const canvas = Utils.$('#completion-chart');
    if (!canvas || !this.data.dashboard) return;

    const ctx = canvas.getContext('2d');
    const stats = this.data.dashboard.reminders;
    
    const total = stats.total || 0;
    const completed = stats.status?.completed || 0;
    const pending = stats.status?.pending || 0;
    const cancelled = stats.status?.cancelled || 0;

    this.charts.completion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [
          window.i18n?.t('status.completed') || 'Completed',
          window.i18n?.t('status.pending') || 'Pending',
          window.i18n?.t('status.cancelled') || 'Cancelled'
        ],
        datasets: [{
          data: [completed, pending, cancelled],
          backgroundColor: [
            '#10B981', // Green for completed
            '#F59E0B', // Yellow for pending
            '#6B7280'  // Gray for cancelled
          ],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label;
                const value = context.parsed;
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    });
  }

  renderPriorityChart() {
    const canvas = Utils.$('#priority-chart');
    if (!canvas || !this.data.dashboard) return;

    const ctx = canvas.getContext('2d');
    const priority = this.data.dashboard.reminders.priority || {};

    this.charts.priority = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          window.i18n?.t('priority.low') || 'Low',
          window.i18n?.t('priority.medium') || 'Medium',
          window.i18n?.t('priority.high') || 'High',
          window.i18n?.t('priority.urgent') || 'Urgent'
        ],
        datasets: [{
          label: window.i18n?.t('analytics.reminders_count') || 'Reminders',
          data: [
            priority.low || 0,
            priority.medium || 0,
            priority.high || 0,
            priority.urgent || 0
          ],
          backgroundColor: [
            '#10B981', // Green for low
            '#F59E0B', // Yellow for medium
            '#EF4444', // Red for high
            '#DC2626'  // Dark red for urgent
          ],
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: (context) => {
                return window.i18n?.t(`priority.${['low', 'medium', 'high', 'urgent'][context[0].dataIndex]}`) || context[0].label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  renderTrendsChart() {
    const canvas = Utils.$('#trends-chart');
    if (!canvas || !this.data.trends) return;

    const ctx = canvas.getContext('2d');
    const trends = this.data.trends;

    // Prepare data
    const labels = trends.creation?.map(item => item._id) || [];
    const creationData = trends.creation?.map(item => item.total) || [];
    const completionData = trends.completion?.map(item => item.count) || [];

    this.charts.trends = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: window.i18n?.t('analytics.created') || 'Created',
            data: creationData,
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: window.i18n?.t('analytics.completed') || 'Completed',
            data: completionData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  renderTagsChart() {
    const canvas = Utils.$('#tags-chart');
    if (!canvas || !this.data.tags) return;

    const ctx = canvas.getContext('2d');
    const tagsData = this.data.tags.usage || [];

    if (tagsData.length === 0) {
      canvas.parentElement.innerHTML = `
        <div class="empty-chart">
          <i class="fas fa-tags"></i>
          <p>${window.i18n?.t('analytics.no_tags') || 'No tags data available'}</p>
        </div>
      `;
      return;
    }

    const labels = tagsData.map(item => `#${item.tag}`);
    const data = tagsData.map(item => item.total);
    const colors = Utils.getChartColors(labels.length);

    this.charts.tags = new Chart(ctx, {
      type: 'horizontalBar',
      data: {
        labels,
        datasets: [{
          label: window.i18n?.t('analytics.usage_count') || 'Usage Count',
          data,
          backgroundColor: colors,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  renderPerformanceMetrics() {
    const container = Utils.$('#performance-metrics');
    if (!container || !this.data.performance) return;

    const performance = this.data.performance;
    const completionByPriority = performance.completionByPriority || [];
    const notifications = performance.notifications || {};
    const streaks = performance.streaks || {};

    container.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <h4>${window.i18n?.t('analytics.completion_by_priority') || 'Completion by Priority'}</h4>
          </div>
          <div class="metric-content">
            ${completionByPriority.map(item => `
              <div class="metric-row">
                <span class="metric-label">${window.i18n?.t(`priority.${item.priority}`) || item.priority}</span>
                <div class="metric-bar">
                  <div class="metric-fill" style="width: ${item.completionRate}%; background-color: ${Utils.getPriorityColor(item.priority)}"></div>
                </div>
                <span class="metric-value">${Math.round(item.completionRate)}%</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h4>${window.i18n?.t('analytics.notification_success') || 'Notification Success'}</h4>
          </div>
          <div class="metric-content">
            <div class="metric-row">
              <span class="metric-label">${window.i18n?.t('notifications.web_push') || 'Web Push'}</span>
              <span class="metric-value">${notifications.webPushSent || 0}/${notifications.total || 0}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${window.i18n?.t('notifications.email') || 'Email'}</span>
              <span class="metric-value">${notifications.emailSent || 0}/${notifications.total || 0}</span>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h4>${window.i18n?.t('analytics.streaks') || 'Streaks'}</h4>
          </div>
          <div class="metric-content">
            <div class="metric-row">
              <span class="metric-label">${window.i18n?.t('analytics.current_streak') || 'Current Streak'}</span>
              <span class="metric-value">${streaks.current || 0} ${window.i18n?.t('analytics.days') || 'days'}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">${window.i18n?.t('analytics.longest_streak') || 'Longest Streak'}</span>
              <span class="metric-value">${streaks.longest || 0} ${window.i18n?.t('analytics.days') || 'days'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  destroyCharts() {
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) {
        this.charts[key].destroy();
        delete this.charts[key];
      }
    });
  }

  async exportAnalytics() {
    try {
      const format = Utils.$('#export-format')?.value || 'json';
      
      Utils.showNotification(
        window.i18n?.t('analytics.exporting') || 'Exporting analytics...',
        'info'
      );

      const data = await api.exportAnalytics(this.currentPeriod, format);
      
      // Download file
      const filename = `notifaref-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (format === 'csv') {
        Utils.downloadFile(data, filename, 'text/csv');
      } else {
        Utils.downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
      }

      Utils.showNotification(
        window.i18n?.t('analytics.exported_successfully') || 'Analytics exported successfully',
        'success'
      );

    } catch (error) {
      Utils.handleError(error, 'Export Analytics');
    }
  }

  // Create summary cards
  createSummaryCards(data) {
    const container = Utils.$('#analytics-summary');
    if (!container) return;

    const stats = data.reminders || {};
    const user = data.user || {};

    container.innerHTML = `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon">
            <i class="fas fa-bell"></i>
          </div>
          <div class="summary-content">
            <div class="summary-number">${stats.total || 0}</div>
            <div class="summary-label">${window.i18n?.t('stats.total_reminders') || 'Total Reminders'}</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="summary-content">
            <div class="summary-number">${Math.round(user.completionRate || 0)}%</div>
            <div class="summary-label">${window.i18n?.t('stats.completion_rate') || 'Completion Rate'}</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">
            <i class="fas fa-calendar-day"></i>
          </div>
          <div class="summary-content">
            <div class="summary-number">${stats.upcoming || 0}</div>
            <div class="summary-label">${window.i18n?.t('stats.upcoming') || 'Upcoming'}</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="summary-content">
            <div class="summary-number">${stats.overdue || 0}</div>
            <div class="summary-label">${window.i18n?.t('stats.overdue') || 'Overdue'}</div>
          </div>
        </div>
      </div>
    `;
  }

  // Create detailed analytics view
  createDetailedView() {
    const container = Utils.$('#analytics-detailed');
    if (!container) return;

    container.innerHTML = `
      <div class="analytics-tabs">
        <button class="tab-btn active" data-tab="overview">${window.i18n?.t('analytics.overview') || 'Overview'}</button>
        <button class="tab-btn" data-tab="trends">${window.i18n?.t('analytics.trends') || 'Trends'}</button>
        <button class="tab-btn" data-tab="performance">${window.i18n?.t('analytics.performance') || 'Performance'}</button>
        <button class="tab-btn" data-tab="tags">${window.i18n?.t('analytics.tags') || 'Tags'}</button>
      </div>

      <div class="analytics-content">
        <div id="overview-tab" class="tab-content active">
          <div class="charts-row">
            <div class="chart-container">
              <canvas id="completion-chart"></canvas>
            </div>
            <div class="chart-container">
              <canvas id="priority-chart"></canvas>
            </div>
          </div>
        </div>

        <div id="trends-tab" class="tab-content">
          <div class="chart-container">
            <canvas id="trends-chart"></canvas>
          </div>
        </div>

        <div id="performance-tab" class="tab-content">
          <div id="performance-metrics"></div>
        </div>

        <div id="tags-tab" class="tab-content">
          <div class="chart-container">
            <canvas id="tags-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    // Setup tab switching
    this.setupTabSwitching();
  }

  setupTabSwitching() {
    const tabBtns = Utils.$$('.tab-btn');
    const tabContents = Utils.$$('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Update active tab button
        tabBtns.forEach(b => Utils.removeClass(b, 'active'));
        Utils.addClass(btn, 'active');
        
        // Update active tab content
        tabContents.forEach(content => Utils.removeClass(content, 'active'));
        const targetContent = Utils.$(`#${tabId}-tab`);
        if (targetContent) {
          Utils.addClass(targetContent, 'active');
        }
      });
    });
  }

  // Real-time updates
  setupRealTimeUpdates() {
    // Listen for reminder updates
    window.addEventListener('reminderUpdated', () => {
      // Debounced reload
      clearTimeout(this.reloadTimeout);
      this.reloadTimeout = setTimeout(() => {
        this.loadAnalyticsData();
      }, 2000);
    });

    // Auto-refresh every 5 minutes
    setInterval(() => {
      if (document.visibilityState === 'visible' && this.currentPage === 'analytics') {
        this.loadAnalyticsData();
      }
    }, 5 * 60 * 1000);
  }

  // Chart theme handling
  updateChartsTheme(theme) {
    const textColor = theme === 'dark' ? '#F9FAFB' : '#111827';
    const gridColor = theme === 'dark' ? '#374151' : '#E5E7EB';

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;
    Chart.defaults.backgroundColor = 'rgba(79, 70, 229, 0.1)';

    // Re-render charts with new theme
    this.renderCharts();
  }

  // Get chart data for external use
  getChartData() {
    return this.data;
  }

  // Refresh analytics data
  async refresh() {
    await this.loadAnalyticsData();
  }

  // Get analytics summary
  getSummary() {
    if (!this.data.dashboard) return null;

    const stats = this.data.dashboard.reminders;
    const user = this.data.dashboard.user;

    return {
      totalReminders: stats.total || 0,
      completionRate: user.completionRate || 0,
      upcomingCount: stats.upcoming || 0,
      overdueCount: stats.overdue || 0,
      period: this.currentPeriod
    };
  }
}

// Initialize analytics when on analytics page
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('analytics') || 
      document.body.classList.contains('analytics-page')) {
    window.analytics = new AnalyticsManager();
  }
});

// Listen for theme changes
window.addEventListener('themeChanged', (event) => {
  if (window.analytics) {
    window.analytics.updateChartsTheme(event.detail.theme);
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsManager;
}