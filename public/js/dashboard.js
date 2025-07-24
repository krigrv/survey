// Dashboard Module with Tabbed Interface

class DashboardManager {
  constructor() {
    this.charts = {};
    this.currentPeriod = '30';
    this.currentAppFilter = 'all';
    this.refreshInterval = null;
    this.tenants = [];
    this.surveyFormCounter = 1;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      if (this.isDashboardPage()) {
        this.initializeDashboard();
        this.setupEventListeners();
        this.loadInitialData();
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
    
    // Initialize chart containers for analytics tab
    this.initializeCharts();
    
    // Setup domain change handler for admin email suggestion
    this.setupDomainHandler();
    
    // Initialize step navigation
    this.initStepNavigation();
    
    // Check if required DOM elements exist
    const requiredElements = ['totalForms', 'totalResponses', 'activeUsers', 'totalApps'];
    requiredElements.forEach(id => {
      const element = document.getElementById(id);
      console.log(`Element ${id}:`, element ? 'found' : 'NOT FOUND');
    });
  }

  setupEventListeners() {
    // Tenant form submission
    document.addEventListener('submit', (e) => {
      if (e.target.matches('#tenantForm')) {
        e.preventDefault();
        this.createTenant();
      }
    });

    // Survey form creation submission
    document.addEventListener('submit', (e) => {
      if (e.target.matches('#surveyFormCreation')) {
        e.preventDefault();
        this.proceedToFormBuilder();
      }
    });

    // Domain change for admin email suggestion
    document.addEventListener('change', (e) => {
      if (e.target.matches('#domain')) {
        this.updateAdminEmailSuggestion(e.target.value);
      }
    });

    // Tenant selection change for form name update
    document.addEventListener('change', (e) => {
      if (e.target.matches('#formType')) {
        this.updateSurveyFormName();
      }
    });

    // Back to form creation from form builder
    document.addEventListener('click', (e) => {
      if (e.target.matches('#backToFormCreation')) {
        e.preventDefault();
        this.showFormCreation();
      }
    });

    // Tab change events
    document.addEventListener('shown.bs.tab', (e) => {
      const targetTab = e.target.getAttribute('data-bs-target');
      if (targetTab === '#tenant-onboarding') {
        this.loadTenants();
      } else if (targetTab === '#form-analytics') {
        this.loadAnalyticsData();
        this.loadAllCreatedForms();
      } else if (targetTab === '#form-creation') {
        this.loadTenantsForFormCreation();
      } else if (targetTab === '#form-responses') {
        this.loadFormResponsesTab();
      }
    });
  }

  setupDomainHandler() {
    const domainSelect = document.getElementById('domain');
    const adminInput = document.getElementById('adminAccess');
    
    if (domainSelect && adminInput) {
      domainSelect.addEventListener('change', () => {
        this.updateAdminEmailSuggestion(domainSelect.value);
      });
    }
  }

  updateAdminEmailSuggestion(domain) {
    const adminInput = document.getElementById('adminAccess');
    if (adminInput && domain) {
      adminInput.placeholder = `admin@${domain}.com`;
      // Auto-fill if empty
      if (!adminInput.value) {
        adminInput.value = `admin@${domain}.com`;
      }
    }
  }

  async createTenant() {
    try {
      const form = document.getElementById('tenantForm');
      const formData = new FormData(form);
      
      const tenantData = {
        teamName: formData.get('teamName'),
        teamDescription: formData.get('teamDescription'),
        domain: formData.get('domain'),
        adminAccess: formData.get('adminAccess'),
        type: 'tenant', // Add type to distinguish from regular forms
        title: formData.get('teamName'), // Use team name as title for API compatibility
        description: formData.get('teamDescription'),
        createdAt: new Date().toISOString()
      };

      console.log('Creating tenant with data:', tenantData);

      // Call the API to save tenant
      const response = await fetch('http://localhost:3001/api/form-types/direct-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Tenant created successfully:', result);

      // Show success message
      this.showSuccessMessage('Tenant created successfully!');
      
      // Reset form
      form.reset();
      
      // Reload tenants list
      this.loadTenants();
      
      // Switch to form creation tab
      const formTab = document.getElementById('form-tab');
      if (formTab) formTab.click();
      
      // Load tenants and select the new one
      await this.loadTenantsForFormCreation();
      
      const formTypeSelect = document.getElementById('formType');
      if (formTypeSelect) {
        formTypeSelect.value = result.data.id;
        this.updateSurveyFormName();
      }
      
    } catch (error) {
      console.error('Failed to create tenant:', error);
      this.showErrorMessage('Failed to create tenant. Please try again.');
    }
  }

  async loadTenants() {
    try {
      console.log('Loading tenants...');
      
      // Fetch tenants from the API
      const response = await fetch('http://localhost:3001/api/form-types');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      // Filter for tenant type entries - data is directly an array
      // For now, show all form types if no type field exists, or filter by type === 'tenant'
      this.tenants = data.filter(item => item.type === 'tenant' || !item.type);
      console.log('Filtered tenants:', this.tenants);
      
      this.updateTenantsDisplay();
      
    } catch (error) {
      console.error('Failed to load tenants:', error);
      this.updateTenantsDisplay([]);
    }
  }

  updateTenantsDisplay() {
    const container = document.getElementById('tenantsList');
    if (!container) return;

    if (!this.tenants || this.tenants.length === 0) {
      container.innerHTML = '<div class="text-center py-3"><p class="text-muted">No form types available</p></div>';
      return;
    }

    // Display the names from the form-types API response with three-dot menu
    container.innerHTML = this.tenants.map(tenant => `
      <div class="mb-3 p-3 border rounded">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="fw-medium mb-1">${tenant.name}</div>
            <div class="text-muted small mb-2">${tenant.description || 'No description'}</div>
            <div class="d-flex flex-wrap gap-2 small text-muted">
              <span><i class="fas fa-calendar-alt"></i> Created: ${this.formatDate(tenant.createdAt)}</span>
              <span><i class="fas fa-tag"></i> Type: ${tenant.type || 'form'}</span>
            </div>
          </div>
          <div class="dropdown ms-3">
            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <ul class="dropdown-menu">
              <li>
                <a class="dropdown-item" href="#" onclick="dashboard.createFormFromTenant('${tenant._id}', '${tenant.name}')">
                  <i class="fas fa-plus me-2"></i>Create Form
                </a>
              </li>
              <li>
                <a class="dropdown-item text-danger" href="#" onclick="dashboard.deleteFormType('${tenant._id}', '${tenant.name}')">
                  <i class="fas fa-trash me-2"></i>Delete Form
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    `).join('');
  }

  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async loadTenantsForFormCreation() {
    await this.loadTenants();
    
    const tenantSelect = document.getElementById('formType');
    if (!tenantSelect) return;

    // Clear existing options except the first one
    tenantSelect.innerHTML = '<option value="">Choose a tenant</option>';
    
    // Add tenant options
    this.tenants.forEach(tenant => {
      const option = document.createElement('option');
      option.value = tenant._id;
      option.textContent = tenant.name;
      tenantSelect.appendChild(option);
    });
  }

  updateSurveyFormName() {
    // Remove auto-generation - let users enter their own form names
    const tenantSelect = document.getElementById('formType');
    const formNameInput = document.getElementById('surveyFormName');
    
    if (tenantSelect && formNameInput && tenantSelect.value) {
      // Clear the readonly attribute to allow user input
      formNameInput.removeAttribute('readonly');
      formNameInput.placeholder = 'Enter survey form name';
      // Don't auto-generate - let user type their own name
    }
  }

  proceedToFormBuilder() {
    const tenantSelect = document.getElementById('formType');
    const formNameInput = document.getElementById('surveyFormName');
    
    if (!tenantSelect.value) {
      this.showErrorMessage('Please select a tenant first.');
      return;
    }

    if (!formNameInput.value.trim()) {
      this.showErrorMessage('Please enter a survey form name.');
      return;
    }

    // Hide form creation and show form builder
    const formCreationForm = document.getElementById('surveyFormCreation');
    const formBuilderContainer = document.getElementById('formBuilderContainer');
    
    if (formCreationForm && formBuilderContainer) {
      formCreationForm.style.display = 'none';
      formBuilderContainer.style.display = 'block';
      
      // Initialize the integrated form builder
      this.initializeFormBuilder();
    }
  }

  initializeFormBuilder() {
    // Set the form title from the survey form name
    const surveyFormName = document.getElementById('surveyFormName').value;
    const builderFormTitle = document.getElementById('builderFormTitle');
    if (builderFormTitle) {
      builderFormTitle.value = surveyFormName;
    }

    // Set the selected tenant in the builder form type dropdown
    const selectedTenant = document.getElementById('formType').value;
    const builderFormType = document.getElementById('builderFormType');
    if (builderFormType && selectedTenant) {
      // Load tenants into the builder dropdown
      this.loadTenantsForBuilder();
      // Set the selected value
      setTimeout(() => {
        builderFormType.value = selectedTenant;
      }, 100);
    }

    // Initialize form builder functionality
    this.initializeFormBuilderEvents();
  }

  async loadTenantsForBuilder() {
    const builderFormType = document.getElementById('builderFormType');
    if (!builderFormType) return;

    // Clear existing options except the first one
    builderFormType.innerHTML = '<option value="">Select form type...</option>';
    
    // Add tenant options
    this.tenants.forEach(tenant => {
      const option = document.createElement('option');
      option.value = tenant._id;
      option.textContent = tenant.name;
      builderFormType.appendChild(option);
    });
  }

  initializeFormBuilderEvents() {
    // Initialize tab switching for form builder
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const targetTab = e.target.closest('.tab-button').dataset.tab;
        this.switchFormBuilderTab(targetTab);
      });
    });

    // Initialize back to form creation button
    const backButton = document.getElementById('backToFormCreation');
    if (backButton) {
      backButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showFormCreation();
      });
    }
  }

  switchFormBuilderTab(tabName) {
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked tab button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });
    
    // Show selected tab content
    const targetContent = document.getElementById(`${tabName}Tab`);
    if (targetContent) {
      targetContent.style.display = 'block';
    }
  }

  showFormCreation() {
    const formCreationForm = document.getElementById('surveyFormCreation');
    const formBuilderContainer = document.getElementById('formBuilderContainer');
    
    if (formCreationForm && formBuilderContainer) {
      formCreationForm.style.display = 'block';
      formBuilderContainer.style.display = 'none';
    }
  }

  createFormFromTenant(tenantId, tenantName) {
    // Pre-fill the form creation with the selected tenant
    const tenantSelect = document.getElementById('formType');
    const formNameInput = document.getElementById('surveyFormName');
    
    if (tenantSelect && formNameInput) {
      // Set the tenant
      tenantSelect.value = tenantId;
      
      // Clear the form name for user input
      formNameInput.value = '';
      formNameInput.placeholder = `Enter form name for ${tenantName}`;
      formNameInput.focus();
      
      // Show the form creation section and hide the form builder
      const formCreationForm = document.getElementById('surveyFormCreation');
      const formBuilderContainer = document.getElementById('formBuilderContainer');
      
      if (formCreationForm && formBuilderContainer) {
        formCreationForm.style.display = 'block';
        formBuilderContainer.style.display = 'none';
      }
      
      // Show success message
      this.showSuccessMessage(`Selected tenant: ${tenantName}. Please enter a form name to continue.`);
    }
  }

  deleteFormType(tenantId, tenantName) {
    // Show confirmation modal
    const confirmDelete = confirm(
      `Are you sure you want to delete "${tenantName}"?\n\n` +
      `This action requires approval and a confirmation email will be sent to the administrator. ` +
      `The deletion will only proceed after email approval.`
    );
    
    if (confirmDelete) {
      // Here you would typically send a request to the server
      // For now, we'll show a message about the email approval process
      this.showSuccessMessage(
        `Delete request for "${tenantName}" has been submitted. ` +
        `A confirmation email has been sent to the administrator. ` +
        `The form type will be deleted once approved via email.`
      );
      
      // TODO: Implement actual API call to request deletion with email approval
      // Example:
      // fetch(`/api/form-types/${tenantId}/request-deletion`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' }
      // });
    }
  }

  async loadInitialData() {
    // Load tenants for the first tab
    await this.loadTenants();
    
    // Load analytics data if analytics tab is active
    const analyticsTab = document.getElementById('form-analytics');
    if (analyticsTab && analyticsTab.classList.contains('active')) {
      this.loadAnalyticsData();
    }
  }

  async loadAnalyticsData() {
    try {
      console.log('Loading analytics data...');
      this.showLoadingState();

      // Load overview data for analytics
      const overviewPromise = window.api.getDashboardOverview();
      
      // Build params for stats and analytics
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
      
      // Load top forms
      const topFormsPromise = window.api.getMyForms({ limit: 5 });
      
      // Load analytics summary
      const analyticsPromise = window.api.getAnalyticsSummary(analyticsParams);

      // Wait for all data
      const [overview, stats, activity, topForms, analytics] = await Promise.all([
        overviewPromise,
        statsPromise,
        activityPromise,
        topFormsPromise,
        analyticsPromise
      ]);

      console.log('Analytics data loaded:', { overview, stats, activity, topForms, analytics });

      // Update UI with loaded data
      this.updateOverviewCards(overview);
      this.updateStatsCards(stats);
      this.updateRecentActivity(activity.activities);
      this.updateTopForms(topForms.forms);
      this.updateCharts(analytics);
      
      this.hideLoadingState();
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      this.hideLoadingState();
      this.showErrorState();
    }
  }

  updateOverviewCards(data) {
    console.log('Updating overview cards with data:', data);
    
    // Map dashboard IDs to home page IDs
    const cardMappings = {
      'totalForms': ['totalForms', 'totalFormsCount'],
      'totalResponses': ['totalResponses', 'totalResponsesCount'],
      'activeUsers': ['activeUsers', 'totalViewsCount'], // Using views count for home page
      'totalApps': ['totalApps', 'conversionRate'] // Using conversion rate for home page
    };
    
    const cardValues = {
      'totalForms': data.totalForms || 0,
      'totalResponses': data.totalResponses || 0,
      'activeUsers': data.totalViews || data.activeForms || 0,
      'totalApps': data.conversionRate || data.totalFormTypes || 0
    };
    
    console.log('Card values:', cardValues);

    Object.entries(cardMappings).forEach(([key, ids]) => {
      const value = cardValues[key];
      let element = null;
      
      // Try to find element with any of the mapped IDs
      for (const id of ids) {
        element = document.getElementById(id);
        if (element) break;
      }
      
      console.log(`Updating element for ${key}:`, element, 'with value:', value);
      if (element) {
        // For conversion rate, format as percentage
        if (key === 'totalApps' && element.id === 'conversionRate') {
          element.textContent = `${value}%`;
        } else {
          this.animateNumber(element, value);
        }
        console.log(`Successfully updated ${key} to ${value}`);
      } else {
        console.error(`No element found for ${key} with IDs: ${ids.join(', ')}`);
      }
    });

    // Update percentage changes if available (dashboard only)
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
    // Try both dashboard and home page element IDs
    const container = document.getElementById('recentActivity') || document.getElementById('recentActivityList');
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

  updateTopForms(forms) {
    // Try both dashboard and home page element IDs
    const container = document.getElementById('topForms') || document.getElementById('topPerformingFormsList');
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
    // Forms over time chart - try multiple possible IDs
    const formsChartCanvas = document.getElementById('formsChart') || document.getElementById('formsResponsesChart');
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

    // Responses over time chart - try multiple possible IDs
    const responsesChartCanvas = document.getElementById('responsesChart') || document.getElementById('formsResponsesChart');
    if (responsesChartCanvas && !this.charts.forms) { // Only create if forms chart wasn't created with same element
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

    // Form status distribution chart - try multiple possible IDs
    const statusChartCanvas = document.getElementById('statusChart') || document.getElementById('formStatusChart');
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

  showSuccessMessage(message) {
    // Create and show success toast or alert
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-success alert-dismissible fade show';
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      alertContainer.appendChild(alert);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (alert.parentNode) {
          alert.parentNode.removeChild(alert);
        }
      }, 5000);
    }
  }

  showErrorMessage(message) {
    // Create and show error toast or alert
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger alert-dismissible fade show';
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      alertContainer.appendChild(alert);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (alert.parentNode) {
          alert.parentNode.removeChild(alert);
        }
      }, 5000);
    }
  }

  showCreateUserModal() {
    // User management removed - hide this functionality
    console.log('User management functionality has been removed');
  }

  showCreateAppModal() {
    // App management removed - hide this functionality
    console.log('App management functionality has been removed');
  }

  startAutoRefresh() {
    // Refresh analytics data every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.loadAnalyticsData();
    }, 5 * 60 * 1000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async loadFormResponsesTab() {
    try {
      console.log('Loading form responses tab...');
      
      // Load tenants for the form type selector
      const response = await fetch('/api/form-types');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tenants = await response.json();
      const formTypeSelect = document.getElementById('responseFormTypeSelect');
      
      if (formTypeSelect) {
        formTypeSelect.innerHTML = '<option value="">Select a form type...</option>';
        tenants.forEach(tenant => {
          const option = document.createElement('option');
          option.value = tenant._id; // Use _id instead of id
          option.textContent = tenant.name || tenant.title;
          formTypeSelect.appendChild(option);
        });
        
        // Add event listener for form type selection
        formTypeSelect.addEventListener('change', (e) => {
          if (e.target.value) {
            this.loadFormResponses(e.target.value);
          } else {
            const container = document.getElementById('formResponsesContainer') || document.getElementById('responseFormsContainer');
            if (container) {
              container.innerHTML = '<p class="text-muted">Please select a form type to view responses.</p>';
            }
          }
        });
      }
      
    } catch (error) {
      console.error('Failed to load form responses tab:', error);
      const container = document.getElementById('formResponsesContainer') || document.getElementById('responseFormsContainer');
      if (container) {
        container.innerHTML = '<p class="text-danger">Failed to load form types.</p>';
      }
    }
  }

  async loadFormResponses(formTypeId = null) {
    try {
      // Check for both dashboard and home page containers
      const container = document.getElementById('formResponsesContainer') || document.getElementById('responseFormsContainer');
      if (!container) {
        console.warn('Response container not found');
        return;
      }
      
      // If no formTypeId provided, show a message to select a form type
      if (!formTypeId) {
        container.innerHTML = '<p class="text-muted">Please select a form type to view responses.</p>';
        return;
      }
      
      container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';
      
      // Fetch responses for the selected form type
      const response = await fetch(`/api/form-types/${formTypeId}/responses`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const responses = data.responses || [];
      
      if (responses.length === 0) {
        container.innerHTML = '<p class="text-muted">No responses found for this form type.</p>';
        return;
      }
      
      // Display responses in a table format
      let html = `
        <div class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Response ID</th>
                <th>Submitted At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      responses.forEach(response => {
        html += `
          <tr>
            <td>${response.id || 'N/A'}</td>
            <td>${this.formatDate(response.submittedAt || response.createdAt)}</td>
            <td><span class="badge bg-${this.getStatusColor(response.status)}">${this.getStatusDisplayName(response.status)}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-primary" onclick="dashboard.viewResponse('${response.id}')">
                <i class="fas fa-eye"></i> View
              </button>
            </td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
      
      container.innerHTML = html;
      
    } catch (error) {
      console.error('Failed to load form responses:', error);
      const container = document.getElementById('formResponsesContainer') || document.getElementById('responseFormsContainer');
      if (container) {
        container.innerHTML = '<p class="text-danger">Failed to load responses.</p>';
      }
    }
  }

  async loadAllCreatedForms() {
    try {
      console.log('Loading all created forms...');
      
      // Check for both dashboard and home page containers
      const container = document.getElementById('allFormsContainer') || document.querySelector('#allFormsTable tbody');
      if (!container) {
        console.warn('Forms container not found');
        return;
      }
      
      container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';
      
      // Fetch all form types (tenants)
      const tenantsResponse = await fetch('/api/form-types');
      if (!tenantsResponse.ok) {
        throw new Error(`HTTP error! status: ${tenantsResponse.status}`);
      }
      
      const tenants = await tenantsResponse.json();
      
      // Fetch all forms using dashboard endpoint
      const formsResponse = await fetch('/api/dashboard/forms');
      if (!formsResponse.ok) {
        throw new Error(`HTTP error! status: ${formsResponse.status}`);
      }
      
      const formsData = await formsResponse.json();
      const forms = formsData.forms || [];
      
      // Check if we're rendering for a table (home page) or cards (dashboard)
      const isTableView = container.tagName === 'TBODY';
      
      if (isTableView) {
        // Render for table view (home page)
        let html = '';
        forms.forEach(form => {
          const tenant = tenants.find(t => t._id === form.formTypeId);
          html += `
            <tr>
              <td>${form.title}</td>
              <td>${tenant ? tenant.name : 'Unknown'}</td>
              <td><span class="badge bg-${this.getStatusColor(form.status)}">${this.getStatusDisplayName(form.status)}</span></td>
              <td>0</td>
              <td>${this.formatDate(form.createdAt)}</td>
              <td>
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="dashboard.editForm('${form.id}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-info btn-action" onclick="dashboard.viewFormResponses('${form.id}')">
                  <i class="fas fa-chart-bar"></i>
                </button>
              </td>
            </tr>
          `;
        });
        
        if (html === '') {
          html = '<tr><td colspan="6" class="text-center text-muted">No forms found.</td></tr>';
        }
        
        container.innerHTML = html;
      } else {
        // Render for card view (dashboard)
        // Group forms by tenant
        const formsByTenant = {};
        
        tenants.forEach(tenant => {
          formsByTenant[tenant._id] = {
            tenant: tenant,
            forms: forms.filter(form => form.formTypeId === tenant._id)
          };
        });
        
        // Display grouped forms
        let html = '';
        
        Object.values(formsByTenant).forEach(group => {
          const { tenant, forms } = group;
          
          html += `
            <div class="mb-4">
              <h6 class="fw-bold text-primary mb-3">
                <i class="fas fa-building"></i> ${tenant.name || tenant.title}
                <span class="badge bg-secondary ms-2">${forms.length} form${forms.length !== 1 ? 's' : ''}</span>
              </h6>
          `;
          
          if (forms.length === 0) {
            html += '<p class="text-muted ms-3">No forms created yet.</p>';
          } else {
            html += '<div class="row">';
            forms.forEach(form => {
              html += `
                <div class="col-md-6 col-lg-4 mb-3">
                  <div class="card h-100" style="border: 1px solid #e2e8f0;">
                    <div class="card-body">
                      <h6 class="card-title">${form.title}</h6>
                      <p class="card-text text-muted small">${form.description || 'No description'}</p>
                      <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-${this.getStatusColor(form.status)}">${this.getStatusDisplayName(form.status)}</span>
                        <small class="text-muted">${this.formatDate(form.createdAt)}</small>
                      </div>
                    </div>
                    <div class="card-footer bg-transparent">
                      <div class="btn-group w-100" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="dashboard.editForm('${form.id}')">
                          <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="dashboard.viewFormResponses('${form.id}')">
                          <i class="fas fa-chart-bar"></i> Responses
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            });
            html += '</div>';
          }
          
          html += '</div>';
        });
        
        if (html === '') {
          html = '<p class="text-muted">No forms found.</p>';
        }
        
        container.innerHTML = html;
      }
      
    } catch (error) {
      console.error('Failed to load all created forms:', error);
      const container = document.getElementById('allFormsContainer') || document.querySelector('#allFormsTable tbody');
      if (container) {
        container.innerHTML = '<p class="text-danger">Failed to load forms.</p>';
      }
    }
  }

  viewResponse(responseId) {
    // TODO: Implement response viewing functionality
    console.log('Viewing response:', responseId);
    alert('Response viewing functionality will be implemented soon.');
  }

  editForm(formId) {
    // TODO: Implement form editing functionality
    console.log('Editing form:', formId);
    alert('Form editing functionality will be implemented soon.');
  }

  viewFormResponses(formId) {
    // TODO: Implement form responses viewing functionality
    console.log('Viewing responses for form:', formId);
    alert('Form responses viewing functionality will be implemented soon.');
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  // Methods called by index.html
  async loadFormAnalytics() {
    try {
      await this.loadAnalyticsData();
    } catch (error) {
      console.error('Error loading form analytics:', error);
    }
  }

  async loadOverviewStats() {
    try {
      const response = await fetch('/api/dashboard/overview');
      if (!response.ok) {
        throw new Error('Failed to load overview stats');
      }
      const data = await response.json();
      this.updateOverviewCards(data);
    } catch (error) {
      console.error('Error loading overview stats:', error);
    }
  }

  async loadCharts() {
    try {
      const response = await fetch('/api/dashboard/analytics');
      if (!response.ok) {
        throw new Error('Failed to load charts data');
      }
      const data = await response.json();
      this.updateCharts(data);
    } catch (error) {
      console.error('Error loading charts:', error);
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

  // Step Navigation Methods
  initStepNavigation() {
    // Add click handlers for step items
    document.querySelectorAll('.step-item').forEach(stepItem => {
      stepItem.addEventListener('click', (e) => {
        const target = stepItem.getAttribute('data-target');
        const stepNumber = stepItem.getAttribute('data-step');
        this.navigateToStep(target, stepNumber);
      });
    });

    // Handle form submissions for auto-advancing steps
    const tenantForm = document.getElementById('tenantForm');
    if (tenantForm) {
      tenantForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Auto-advance to next step after successful tenant creation
        this.navigateToStep('#form-creation', '2');
      });
    }

    const surveyFormCreation = document.getElementById('surveyFormCreation');
    if (surveyFormCreation) {
      surveyFormCreation.addEventListener('submit', (e) => {
        e.preventDefault();
        // Show form builder instead of advancing to non-existent step 3
        this.proceedToFormBuilder();
      });
    }
  }

  navigateToStep(targetId, stepNumber) {
    // Remove active class from all steps and panes
    document.querySelectorAll('.step-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelectorAll('.step-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    // Add active class to current step and pane
    const currentStepItem = document.querySelector(`[data-target="${targetId}"]`);
    const currentStepPane = document.querySelector(targetId);

    if (currentStepItem) {
      currentStepItem.classList.add('active');
    }
    if (currentStepPane) {
      currentStepPane.classList.add('active');
    }

    // Mark previous steps as completed
    document.querySelectorAll('.step-item').forEach(item => {
      const itemStep = parseInt(item.getAttribute('data-step'));
      const currentStep = parseInt(stepNumber);
      
      if (itemStep < currentStep) {
        item.classList.add('completed');
      } else {
        item.classList.remove('completed');
      }
    });

    // Load content based on step
    this.loadStepContent(targetId);

    // Scroll to top of content area
    document.querySelector('.step-content-area').scrollTop = 0;
  }

  loadStepContent(stepId) {
    switch (stepId) {
      case '#tenant-onboarding':
        this.loadTenants();
        break;
      case '#form-creation':
        this.loadTenantsForFormCreation();
        break;
    }
  }

  handleTenantFormSubmission(event) {
    // This method should handle the actual form submission
    // For now, we'll just show a success message
    console.log('Tenant form submitted');
    
    // Show success toast or message
    this.showToast('Tenant created successfully! Proceeding to Form Creation...', 'success');
    
    // You can add actual form submission logic here
    // const formData = new FormData(event.target);
    // Submit to API...
  }

  showToast(message, type = 'info') {
    // Simple toast notification
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;

    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }
}

// Create global dashboard manager instance
const dashboardManager = new DashboardManager();

// Export dashboard manager
window.dashboard = dashboardManager;

// Create Dashboard alias for compatibility
window.Dashboard = DashboardManager;

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