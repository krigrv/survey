// Dashboard Module

class DashboardManager {
  constructor() {
    this.charts = {};
    this.currentPeriod = '30';
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
    console.log('Initializing dashboard...');
    console.log('DOM ready state:', document.readyState);
    console.log('API client available:', !!window.api);
    
    // Initialize chart containers
    this.initializeCharts();
    
    // Setup period filter
    this.setupPeriodFilter();
    
    // Setup app filter
    this.setupAppFilter();
    
    // Setup refresh button
    this.setupRefreshButton();
    
    // Check if required DOM elements exist
    const requiredElements = ['totalForms', 'totalResponses', 'activeUsers', 'totalApps'];
    requiredElements.forEach(id => {
      const element = document.getElementById(id);
      console.log(`Element ${id}:`, element ? 'found' : 'NOT FOUND');
    });
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
      console.log('Loading dashboard data...');
      // Show loading state
      this.showLoadingState();

      // Load overview data
      const overviewPromise = window.api.getDashboardOverview();
      
      // Build params for stats and analytics (only include appId if it's not 'all')
      const statsParams = { period: this.currentPeriod };
      const analyticsParams = { period: this.currentPeriod };
      
      if (this.currentAppFilter !== 'all') {
        statsParams.appId = this.currentAppFilter;
        analyticsParams.appId = this.currentAppFilter;
      }
      
      // Load stats data
      const statsPromise = window.api.getDashboardStats(statsParams);
      
      // Load recent activity
      const activityPromise = window.api.getRecentActivity({ limit: 10 });
      
      // Load my forms
      const myFormsPromise = window.api.getMyForms({ limit: 5 });
      
      // Load analytics summary
      const analyticsPromise = window.api.getAnalyticsSummary(analyticsParams);

      // Wait for all data
      const [overview, stats, activity, myForms, analytics] = await Promise.all([
        overviewPromise,
        statsPromise,
        activityPromise,
        myFormsPromise,
        analyticsPromise
      ]);

      console.log('Dashboard data loaded:', { overview, stats, activity, myForms, analytics });

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
      console.error('Error details:', error.message, error.stack);
      this.hideLoadingState();
      this.showErrorState();
      
      // Try to show what data we can get
      try {
        const overview = await window.api.getDashboardOverview();
        console.log('Manual API test - overview data:', overview);
        this.updateOverviewCards(overview);
      } catch (fallbackError) {
        console.error('Fallback API call also failed:', fallbackError);
      }
    }
  }

  updateOverviewCards(data) {
    console.log('Updating overview cards with data:', data);
    const cards = {
      'totalForms': data.totalForms || 0,
      'totalResponses': data.totalResponses || 0,
      'activeUsers': data.activeForms || 0, // Using active forms as active users since we don't have user management
      'totalApps': data.totalFormTypes || 0 // Using form types as applications/projects
    };
    console.log('Card values:', cards);

    Object.entries(cards).forEach(([id, value]) => {
      const element = document.getElementById(id);
      console.log(`Updating element ${id}:`, element, 'with value:', value);
      if (element) {
        this.animateNumber(element, value);
        console.log(`Successfully updated ${id} to ${value}`);
      } else {
        console.error(`Element with ID ${id} not found in DOM`);
      }
    });

    // Update percentage changes if available
    const changes = {
      'formsChange': data.recentFormsCount || 0,
      'responsesChange': data.recentResponsesCount || 0,
      'usersChange': 0, // No user management
      'appsChange': 0 // No app management
    };

    Object.entries(changes).forEach(([id, change]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = `+${change} this week`;
        element.className = 'text-success';
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
    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (!activities || activities.length === 0) {
      container.innerHTML = '<div class="text-center py-3"><p class="text-muted">No recent activity</p></div>';
      return;
    }

    container.innerHTML = activities.map(activity => `
      <div class="d-flex align-items-center mb-3 pb-3 border-bottom">
        <div class="me-3">
          <div class="rounded-circle bg-light p-2" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <i class="${this.getActivityIcon(activity.type)} text-primary"></i>
          </div>
        </div>
        <div class="flex-grow-1">
          <div class="fw-medium">${activity.title}</div>
          <small class="text-muted">${this.formatRelativeTime(activity.timestamp)}</small>
        </div>
      </div>
    `).join('');
  }

  updateMyForms(forms) {
    const container = document.getElementById('topForms');
    if (!container) return;

    if (!forms || forms.length === 0) {
      container.innerHTML = '<div class="text-center py-3"><p class="text-muted">No forms created yet</p></div>';
      return;
    }

    container.innerHTML = forms.map(form => `
      <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
        <div class="flex-grow-1">
          <div class="fw-medium">
            <a href="/form-viewer.html?id=${form._id}" class="text-decoration-none">${form.title}</a>
          </div>
          <div class="d-flex align-items-center mt-1">
            <span class="badge bg-${this.getStatusColor(form.status)} me-2">
              ${this.getStatusDisplayName(form.status)}
            </span>
            <small class="text-muted">${form.responseCount || 0} responses</small>
          </div>
        </div>
        <div class="text-end">
          <a href="/form-builder.html?id=${form._id}" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-edit"></i>
          </a>
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

    // App functionality removed - hide or disable app filter
    appFilter.style.display = 'none';
    const appFilterContainer = appFilter.closest('.filter-group');
    if (appFilterContainer) {
      appFilterContainer.style.display = 'none';
    }
  }

  async loadAppFilterOptions() {
    // App functionality removed - no longer needed
    console.log('App filter functionality has been removed');
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
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  getStatusColor(status) {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'secondary';
      case 'closed': return 'warning';
      case 'archived': return 'dark';
      default: return 'secondary';
    }
  }

  getStatusDisplayName(status) {
    switch (status) {
      case 'published': return 'Published';
      case 'draft': return 'Draft';
      case 'closed': return 'Closed';
      case 'archived': return 'Archived';
      default: return status;
    }
  }

  canEditForm(form) {
    // Authentication removed - all forms are now publicly editable
    return true;
  }

  showCreateFormModal() {
    // Authentication removed - form creation is now public
    const modal = document.getElementById('createFormModal');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  showCreateUserModal() {
    // User management removed - hide this functionality
    console.log('User management functionality has been removed');
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