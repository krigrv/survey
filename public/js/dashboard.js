// Dashboard Module

class DashboardManager {
  constructor() {
    this.charts = {};
    this.currentPeriod = '30d';
    this.currentAppFilter = 'all';
    this.refreshInterval = null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      if (this.isDashboardPage()) {
        this.initializeDashboard();
        this.setupEventListeners();
        this.loadDashboardData();
        this.startAutoRefresh();
      }
    });
  }

  isDashboardPage() {
    return window.location.pathname.includes('dashboard') || 
           window.location.pathname === '/' || 
           window.location.pathname === '/index.html';
  }

  initializeDashboard() {
    // Initialize chart containers
    this.initializeCharts();
    
    // Setup period filter
    this.setupPeriodFilter();
    
    // Setup app filter
    this.setupAppFilter();
    
    // Setup refresh button
    this.setupRefreshButton();
  }

  setupEventListeners() {
    // Period filter change
    document.addEventListener('change', (e) => {
      if (e.target.matches('#periodFilter')) {
        this.currentPeriod = e.target.value;
        this.loadDashboardData();
      }
    });

    // App filter change
    document.addEventListener('change', (e) => {
      if (e.target.matches('#appFilter')) {
        this.currentAppFilter = e.target.value;
        this.loadDashboardData();
      }
    });

    // Refresh button
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="refresh-dashboard"]')) {
        e.preventDefault();
        this.loadDashboardData(true);
      }
    });

    // Quick action buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="create-form"]')) {
        e.preventDefault();
        this.showCreateFormModal();
      }
      
      if (e.target.matches('[data-action="create-user"]')) {
        e.preventDefault();
        this.showCreateUserModal();
      }
      
      if (e.target.matches('[data-action="create-app"]')) {
        e.preventDefault();
        this.showCreateAppModal();
      }
    });

    // View details buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="view-forms"]')) {
        e.preventDefault();
        window.location.href = '/forms.html';
      }
      
      if (e.target.matches('[data-action="view-users"]')) {
        e.preventDefault();
        window.location.href = '/users.html';
      }
      
      if (e.target.matches('[data-action="view-apps"]')) {
        e.preventDefault();
        window.location.href = '/apps.html';
      }
    });
  }

  async loadDashboardData(forceRefresh = false) {
    try {
      // Show loading state
      this.showLoadingState();

      // Load overview data
      const overviewPromise = window.api.getDashboardOverview();
      
      // Load stats data
      const statsPromise = window.api.getDashboardStats({
        period: this.currentPeriod,
        appId: this.currentAppFilter !== 'all' ? this.currentAppFilter : undefined
      });
      
      // Load recent activity
      const activityPromise = window.api.getRecentActivity({ limit: 10 });
      
      // Load my forms
      const myFormsPromise = window.api.getMyForms({ limit: 5 });
      
      // Load analytics summary
      const analyticsPromise = window.api.getAnalyticsSummary({
        period: this.currentPeriod,
        appId: this.currentAppFilter !== 'all' ? this.currentAppFilter : undefined
      });

      // Wait for all data
      const [overview, stats, activity, myForms, analytics] = await Promise.all([
        overviewPromise,
        statsPromise,
        activityPromise,
        myFormsPromise,
        analyticsPromise
      ]);

      // Update UI with loaded data
      this.updateOverviewCards(overview);
      this.updateStatsCards(stats);
      this.updateRecentActivity(activity.activities);
      this.updateMyForms(myForms.forms);
      this.updateCharts(analytics);
      
      // Hide loading state
      this.hideLoadingState();
      
      // Update last refresh time
      this.updateLastRefreshTime();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.hideLoadingState();
      this.showErrorState();
    }
  }

  updateOverviewCards(data) {
    const cards = {
      'total-forms': data.totalForms,
      'total-responses': data.totalResponses,
      'total-users': data.totalUsers,
      'active-forms': data.activeForms
    };

    Object.entries(cards).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        this.animateNumber(element, value);
      }
    });

    // Update percentage changes if available
    const changes = {
      'forms-change': data.formsChange,
      'responses-change': data.responsesChange,
      'users-change': data.usersChange,
      'active-forms-change': data.activeFormsChange
    };

    Object.entries(changes).forEach(([id, change]) => {
      const element = document.getElementById(id);
      if (element && change !== undefined) {
        const isPositive = change >= 0;
        element.textContent = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;
        element.className = `change ${isPositive ? 'positive' : 'negative'}`;
      }
    });
  }

  updateStatsCards(data) {
    // Update response rate
    const responseRateElement = document.getElementById('response-rate');
    if (responseRateElement && data.responseRate !== undefined) {
      responseRateElement.textContent = `${data.responseRate.toFixed(1)}%`;
    }

    // Update average completion time
    const completionTimeElement = document.getElementById('completion-time');
    if (completionTimeElement && data.averageCompletionTime) {
      completionTimeElement.textContent = this.formatDuration(data.averageCompletionTime);
    }

    // Update top performing form
    const topFormElement = document.getElementById('top-form');
    if (topFormElement && data.topForm) {
      topFormElement.textContent = data.topForm.title;
      topFormElement.href = `/forms.html?id=${data.topForm._id}`;
    }

    // Update recent activity count
    const activityCountElement = document.getElementById('activity-count');
    if (activityCountElement && data.recentActivityCount !== undefined) {
      activityCountElement.textContent = data.recentActivityCount;
    }
  }

  updateRecentActivity(activities) {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    if (!activities || activities.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
      return;
    }

    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="${this.getActivityIcon(activity.type)}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${window.utils.formatRelativeTime(activity.createdAt)}</div>
        </div>
        ${activity.link ? `<a href="${activity.link}" class="activity-link"><i class="fas fa-external-link-alt"></i></a>` : ''}
      </div>
    `).join('');
  }

  updateMyForms(forms) {
    const container = document.getElementById('my-forms-list');
    if (!container) return;

    if (!forms || forms.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No forms created yet</p></div>';
      return;
    }

    container.innerHTML = forms.map(form => `
      <div class="form-item">
        <div class="form-info">
          <h6 class="form-title">
            <a href="/forms.html?id=${form._id}">${form.title}</a>
          </h6>
          <div class="form-meta">
            <span class="badge ${window.utils.getStatusColor(form.status)}">
              ${window.utils.getStatusDisplayName(form.status)}
            </span>
            <span class="form-responses">${form.responseCount || 0} responses</span>
            <span class="form-date">${window.utils.formatRelativeTime(form.updatedAt)}</span>
          </div>
        </div>
        <div class="form-actions">
          <a href="/forms.html?id=${form._id}" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-eye"></i>
          </a>
          ${this.canEditForm(form) ? `
            <a href="/form-builder.html?id=${form._id}" class="btn btn-sm btn-outline-secondary">
              <i class="fas fa-edit"></i>
            </a>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  updateCharts(data) {
    // Update forms over time chart
    if (data.formsOverTime) {
      this.updateFormsChart(data.formsOverTime);
    }

    // Update responses over time chart
    if (data.responsesOverTime) {
      this.updateResponsesChart(data.responsesOverTime);
    }

    // Update form status distribution chart
    if (data.formStatusDistribution) {
      this.updateStatusChart(data.formStatusDistribution);
    }

    // Update top forms chart
    if (data.topForms) {
      this.updateTopFormsChart(data.topForms);
    }
  }

  initializeCharts() {
    // Forms over time chart
    const formsChartCanvas = document.getElementById('formsChart');
    if (formsChartCanvas) {
      this.charts.forms = new Chart(formsChartCanvas, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Forms Created',
            data: [],
            borderColor: window.utils.getChartColors().primary,
            backgroundColor: window.utils.getChartColors().primaryLight,
            tension: 0.4
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

    // Responses over time chart
    const responsesChartCanvas = document.getElementById('responsesChart');
    if (responsesChartCanvas) {
      this.charts.responses = new Chart(responsesChartCanvas, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Responses',
            data: [],
            backgroundColor: window.utils.getChartColors().success,
            borderColor: window.utils.getChartColors().successDark,
            borderWidth: 1
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
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Form status distribution chart
    const statusChartCanvas = document.getElementById('statusChart');
    if (statusChartCanvas) {
      this.charts.status = new Chart(statusChartCanvas, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [
              window.utils.getChartColors().primary,
              window.utils.getChartColors().success,
              window.utils.getChartColors().warning,
              window.utils.getChartColors().danger
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }

    // Top forms chart
    const topFormsChartCanvas = document.getElementById('topFormsChart');
    if (topFormsChartCanvas) {
      this.charts.topForms = new Chart(topFormsChartCanvas, {
        type: 'horizontalBar',
        data: {
          labels: [],
          datasets: [{
            label: 'Responses',
            data: [],
            backgroundColor: window.utils.getChartColors().info,
            borderColor: window.utils.getChartColors().infoDark,
            borderWidth: 1
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
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  updateFormsChart(data) {
    if (!this.charts.forms) return;

    this.charts.forms.data.labels = data.map(item => 
      window.utils.formatDate(item.date, { month: 'short', day: 'numeric' })
    );
    this.charts.forms.data.datasets[0].data = data.map(item => item.count);
    this.charts.forms.update();
  }

  updateResponsesChart(data) {
    if (!this.charts.responses) return;

    this.charts.responses.data.labels = data.map(item => 
      window.utils.formatDate(item.date, { month: 'short', day: 'numeric' })
    );
    this.charts.responses.data.datasets[0].data = data.map(item => item.count);
    this.charts.responses.update();
  }

  updateStatusChart(data) {
    if (!this.charts.status) return;

    this.charts.status.data.labels = data.map(item => 
      window.utils.getStatusDisplayName(item.status)
    );
    this.charts.status.data.datasets[0].data = data.map(item => item.count);
    this.charts.status.update();
  }

  updateTopFormsChart(data) {
    if (!this.charts.topForms) return;

    this.charts.topForms.data.labels = data.map(item => 
      window.utils.truncateText(item.title, 30)
    );
    this.charts.topForms.data.datasets[0].data = data.map(item => item.responseCount);
    this.charts.topForms.update();
  }

  setupPeriodFilter() {
    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter) {
      periodFilter.value = this.currentPeriod;
    }
  }

  setupAppFilter() {
    const appFilter = document.getElementById('appFilter');
    if (!appFilter) return;

    // Load available apps for filter
    this.loadAppFilterOptions();
  }

  async loadAppFilterOptions() {
    try {
      const response = await window.api.getApps({ limit: 100 });
      const appFilter = document.getElementById('appFilter');
      
      if (appFilter && response.apps) {
        // Clear existing options except "All"
        const allOption = appFilter.querySelector('option[value="all"]');
        appFilter.innerHTML = '';
        if (allOption) {
          appFilter.appendChild(allOption);
        } else {
          appFilter.innerHTML = '<option value="all">All Applications</option>';
        }

        // Add app options
        response.apps.forEach(app => {
          const option = document.createElement('option');
          option.value = app._id;
          option.textContent = app.name;
          appFilter.appendChild(option);
        });

        appFilter.value = this.currentAppFilter;
      }
    } catch (error) {
      console.error('Failed to load app filter options:', error);
    }
  }

  setupRefreshButton() {
    const refreshButton = document.querySelector('[data-action="refresh-dashboard"]');
    if (refreshButton) {
      // Add loading state to refresh button
      refreshButton.addEventListener('click', () => {
        refreshButton.classList.add('loading');
        setTimeout(() => {
          refreshButton.classList.remove('loading');
        }, 2000);
      });
    }
  }

  showLoadingState() {
    const loadingElements = document.querySelectorAll('.dashboard-loading');
    loadingElements.forEach(el => el.style.display = 'block');

    const contentElements = document.querySelectorAll('.dashboard-content');
    contentElements.forEach(el => el.style.opacity = '0.5');
  }

  hideLoadingState() {
    const loadingElements = document.querySelectorAll('.dashboard-loading');
    loadingElements.forEach(el => el.style.display = 'none');

    const contentElements = document.querySelectorAll('.dashboard-content');
    contentElements.forEach(el => el.style.opacity = '1');
  }

  showErrorState() {
    const errorContainer = document.getElementById('dashboard-error');
    if (errorContainer) {
      errorContainer.style.display = 'block';
      errorContainer.innerHTML = `
        <div class="alert alert-danger">
          <h5>Failed to load dashboard data</h5>
          <p>There was an error loading the dashboard. Please try refreshing the page.</p>
          <button class="btn btn-outline-danger" onclick="location.reload()">
            <i class="fas fa-refresh"></i> Refresh Page
          </button>
        </div>
      `;
    }
  }

  animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const increment = Math.ceil((targetValue - currentValue) / 20);
    let current = currentValue;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
        current = targetValue;
        clearInterval(timer);
      }
      element.textContent = window.utils.formatNumber(current);
    }, 50);
  }

  updateLastRefreshTime() {
    const refreshTimeElement = document.getElementById('last-refresh-time');
    if (refreshTimeElement) {
      refreshTimeElement.textContent = `Last updated: ${window.utils.formatDate(new Date(), { 
        hour: 'numeric', 
        minute: 'numeric' 
      })}`;
    }
  }

  getActivityIcon(type) {
    const icons = {
      'form_created': 'fas fa-plus-circle text-success',
      'form_updated': 'fas fa-edit text-info',
      'form_published': 'fas fa-share text-primary',
      'response_submitted': 'fas fa-paper-plane text-warning',
      'user_created': 'fas fa-user-plus text-success',
      'user_updated': 'fas fa-user-edit text-info',
      'app_created': 'fas fa-cube text-success',
      'app_updated': 'fas fa-cog text-info'
    };
    return icons[type] || 'fas fa-circle text-secondary';
  }

  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  canEditForm(form) {
    const user = window.auth.getCurrentUser();
    if (!user) return false;

    // Owner can always edit
    if (form.createdBy === user._id) return true;

    // Super admin and admin can edit all forms
    if (['super_admin', 'admin'].includes(user.role)) return true;

    // App admin can edit forms in their app
    return window.auth.hasAppAccess(form.appCode, 'admin');
  }

  showCreateFormModal() {
    const modal = document.getElementById('createFormModal');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  showCreateUserModal() {
    if (!window.auth.canManageUsers()) {
      window.utils.toast.error('You do not have permission to create users');
      return;
    }

    const modal = document.getElementById('createUserModal');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  showCreateAppModal() {
    if (!window.auth.isAdmin()) {
      window.utils.toast.error('You do not have permission to create applications');
      return;
    }

    const modal = document.getElementById('createAppModal');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  startAutoRefresh() {
    // Refresh dashboard data every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData(true);
    }, 5 * 60 * 1000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  destroy() {
    this.stopAutoRefresh();
    
    // Destroy charts
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    
    this.charts = {};
  }
}

// Create global dashboard manager instance
const dashboardManager = new DashboardManager();

// Export dashboard manager
window.dashboard = dashboardManager;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  dashboardManager.destroy();
});

// Handle visibility change to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    dashboardManager.stopAutoRefresh();
  } else {
    dashboardManager.startAutoRefresh();
  }
});