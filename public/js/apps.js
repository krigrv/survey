// Apps Module

class AppsManager {
  constructor() {
    this.currentApps = [];
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.totalPages = 1;
    this.currentFilters = {
      search: '',
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    this.selectedApps = new Set();
    this.viewMode = 'grid'; // 'grid' or 'list'
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      if (this.isAppsPage()) {
        this.initializePage();
        this.setupEventListeners();
        this.loadApps();
      }
    });
  }

  isAppsPage() {
    return window.location.pathname.includes('apps') || window.location.pathname.includes('applications');
  }

  initializePage() {
    // Check permissions
    if (!window.auth.canManageApps()) {
      this.showAccessDenied();
      return;
    }

    // Initialize filters
    this.initializeFilters();
    
    // Initialize pagination
    this.initializePagination();
    
    // Initialize view mode
    this.initializeViewMode();
    
    // Initialize bulk actions
    this.initializeBulkActions();
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchApps');
    if (searchInput) {
      searchInput.addEventListener('input', window.utils.debounce((e) => {
        this.currentFilters.search = e.target.value;
        this.currentPage = 1;
        this.loadApps();
      }, 300));
    }

    // Filter changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('#statusFilter')) {
        this.currentFilters.status = e.target.value;
        this.currentPage = 1;
        this.loadApps();
      }
      
      if (e.target.matches('#sortBy')) {
        this.currentFilters.sortBy = e.target.value;
        this.loadApps();
      }
      
      if (e.target.matches('#sortOrder')) {
        this.currentFilters.sortOrder = e.target.value;
        this.loadApps();
      }
    });

    // View mode toggle
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-view-mode]')) {
        e.preventDefault();
        this.viewMode = e.target.dataset.viewMode;
        this.updateViewMode();
        this.renderApps();
      }
    });

    // Action buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="create-app"]')) {
        e.preventDefault();
        this.showCreateAppModal();
      }
      
      if (e.target.matches('[data-action="view-app"]')) {
        e.preventDefault();
        const appId = e.target.dataset.appId;
        this.viewApp(appId);
      }
      
      if (e.target.matches('[data-action="edit-app"]')) {
        e.preventDefault();
        const appId = e.target.dataset.appId;
        this.editApp(appId);
      }
      
      if (e.target.matches('[data-action="delete-app"]')) {
        e.preventDefault();
        const appId = e.target.dataset.appId;
        this.deleteApp(appId);
      }
      
      if (e.target.matches('[data-action="manage-users"]')) {
        e.preventDefault();
        const appId = e.target.dataset.appId;
        this.manageAppUsers(appId);
      }
      
      if (e.target.matches('[data-action="view-analytics"]')) {
        e.preventDefault();
        const appId = e.target.dataset.appId;
        this.viewAppAnalytics(appId);
      }
      
      if (e.target.matches('[data-action="toggle-status"]')) {
        e.preventDefault();
        const appId = e.target.dataset.appId;
        this.toggleAppStatus(appId);
      }
    });

    // Bulk selection
    document.addEventListener('change', (e) => {
      if (e.target.matches('#selectAllApps')) {
        this.toggleSelectAll(e.target.checked);
      }
      
      if (e.target.matches('.app-checkbox')) {
        const appId = e.target.value;
        if (e.target.checked) {
          this.selectedApps.add(appId);
        } else {
          this.selectedApps.delete(appId);
        }
        this.updateBulkActions();
      }
    });

    // Bulk actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="bulk-delete"]')) {
        e.preventDefault();
        this.bulkDeleteApps();
      }
      
      if (e.target.matches('[data-action="bulk-activate"]')) {
        e.preventDefault();
        this.bulkActivateApps();
      }
      
      if (e.target.matches('[data-action="bulk-deactivate"]')) {
        e.preventDefault();
        this.bulkDeactivateApps();
      }
    });

    // Pagination
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="prev-page"]')) {
        e.preventDefault();
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadApps();
        }
      }
      
      if (e.target.matches('[data-action="next-page"]')) {
        e.preventDefault();
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadApps();
        }
      }
      
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        this.currentPage = parseInt(e.target.dataset.page);
        this.loadApps();
      }
    });

    // Modal forms
    this.setupCreateAppModal();
    this.setupEditAppModal();
    this.setupManageUsersModal();
  }

  async loadApps() {
    try {
      const params = {
        page: this.currentPage,
        limit: this.itemsPerPage,
        search: this.currentFilters.search,
        sortBy: this.currentFilters.sortBy,
        sortOrder: this.currentFilters.sortOrder
      };

      if (this.currentFilters.status !== 'all') {
        params.isActive = this.currentFilters.status === 'active';
      }

      const response = await window.api.getApps(params);
      
      this.currentApps = response.apps;
      this.totalPages = response.totalPages;
      
      this.renderApps();
      this.updatePagination();
      this.updateResultsInfo(response.total);
      
    } catch (error) {
      console.error('Failed to load apps:', error);
      this.showErrorState();
    }
  }

  renderApps() {
    const container = document.getElementById('appsContainer');
    if (!container) return;

    if (this.currentApps.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    if (this.viewMode === 'grid') {
      container.innerHTML = this.renderAppsGrid();
    } else {
      container.innerHTML = this.renderAppsList();
    }
  }

  renderAppsGrid() {
    return `
      <div class="row">
        ${this.currentApps.map(app => `
          <div class="col-lg-4 col-md-6 mb-4">
            <div class="card app-card h-100">
              <div class="card-header d-flex justify-content-between align-items-center">
                <div class="form-check">
                  <input class="form-check-input app-checkbox" type="checkbox" value="${app._id}">
                </div>
                <div class="dropdown">
                  <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                    <i class="fas fa-ellipsis-h"></i>
                  </button>
                  <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" data-action="view-app" data-app-id="${app._id}">
                      <i class="fas fa-eye"></i> View Details
                    </a></li>
                    ${this.canEditApp(app) ? `
                      <li><a class="dropdown-item" href="#" data-action="edit-app" data-app-id="${app._id}">
                        <i class="fas fa-edit"></i> Edit
                      </a></li>
                    ` : ''}
                    ${this.canManageUsers(app) ? `
                      <li><a class="dropdown-item" href="#" data-action="manage-users" data-app-id="${app._id}">
                        <i class="fas fa-users"></i> Manage Users
                      </a></li>
                    ` : ''}
                    <li><a class="dropdown-item" href="#" data-action="view-analytics" data-app-id="${app._id}">
                      <i class="fas fa-chart-bar"></i> Analytics
                    </a></li>
                    ${this.canToggleStatus(app) ? `
                      <li><hr class="dropdown-divider"></li>
                      <li><a class="dropdown-item" href="#" data-action="toggle-status" data-app-id="${app._id}">
                        <i class="fas fa-${app.isActive ? 'ban' : 'check'}"></i> ${app.isActive ? 'Deactivate' : 'Activate'}
                      </a></li>
                    ` : ''}
                    ${this.canDeleteApp(app) ? `
                      <li><hr class="dropdown-divider"></li>
                      <li><a class="dropdown-item text-danger" href="#" data-action="delete-app" data-app-id="${app._id}">
                        <i class="fas fa-trash"></i> Delete
                      </a></li>
                    ` : ''}
                  </ul>
                </div>
              </div>
              <div class="card-body">
                <div class="app-icon mb-3">
                  ${app.icon ? `<img src="${app.icon}" alt="${app.name}" class="app-icon-img">` : 
                    `<div class="app-icon-placeholder">${app.name.charAt(0).toUpperCase()}</div>`}
                </div>
                <h5 class="card-title">${app.name}</h5>
                <p class="card-text text-muted">${app.description || 'No description available'}</p>
                <div class="app-meta">
                  <small class="text-muted">
                    <span class="badge ${app.isActive ? 'badge-success' : 'badge-danger'} me-2">
                      ${app.isActive ? 'Active' : 'Inactive'}
                    </span>
                    Code: ${app.code}
                  </small>
                </div>
              </div>
              <div class="card-footer">
                <div class="row text-center">
                  <div class="col-4">
                    <div class="stat-value">${app.stats?.totalForms || 0}</div>
                    <div class="stat-label">Forms</div>
                  </div>
                  <div class="col-4">
                    <div class="stat-value">${app.stats?.totalResponses || 0}</div>
                    <div class="stat-label">Responses</div>
                  </div>
                  <div class="col-4">
                    <div class="stat-value">${app.stats?.totalUsers || 0}</div>
                    <div class="stat-label">Users</div>
                  </div>
                </div>
                <div class="mt-3">
                  <button class="btn btn-primary btn-sm me-2" data-action="view-app" data-app-id="${app._id}">
                    <i class="fas fa-eye"></i> View
                  </button>
                  ${this.canEditApp(app) ? `
                    <button class="btn btn-outline-secondary btn-sm" data-action="edit-app" data-app-id="${app._id}">
                      <i class="fas fa-edit"></i> Edit
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderAppsList() {
    return `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th width="40">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="selectAllApps">
                </div>
              </th>
              <th>Application</th>
              <th>Code</th>
              <th>Status</th>
              <th>Forms</th>
              <th>Responses</th>
              <th>Users</th>
              <th>Created</th>
              <th width="150">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentApps.map(app => `
              <tr>
                <td>
                  <div class="form-check">
                    <input class="form-check-input app-checkbox" type="checkbox" value="${app._id}">
                  </div>
                </td>
                <td>
                  <div class="d-flex align-items-center">
                    <div class="app-icon-small me-3">
                      ${app.icon ? `<img src="${app.icon}" alt="${app.name}" class="app-icon-img-small">` : 
                        `<div class="app-icon-placeholder-small">${app.name.charAt(0).toUpperCase()}</div>`}
                    </div>
                    <div>
                      <h6 class="mb-0">${app.name}</h6>
                      <small class="text-muted">${app.description || 'No description'}</small>
                    </div>
                  </div>
                </td>
                <td><code>${app.code}</code></td>
                <td>
                  <span class="badge ${app.isActive ? 'badge-success' : 'badge-danger'}">
                    ${app.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>${app.stats?.totalForms || 0}</td>
                <td>${app.stats?.totalResponses || 0}</td>
                <td>${app.stats?.totalUsers || 0}</td>
                <td>
                  <span class="text-muted">${window.utils.formatDate(app.createdAt)}</span>
                </td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" data-action="view-app" data-app-id="${app._id}" title="View">
                      <i class="fas fa-eye"></i>
                    </button>
                    ${this.canEditApp(app) ? `
                      <button class="btn btn-outline-secondary" data-action="edit-app" data-app-id="${app._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                    ` : ''}
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="More">
                        <i class="fas fa-ellipsis-h"></i>
                      </button>
                      <ul class="dropdown-menu">
                        ${this.canManageUsers(app) ? `
                          <li><a class="dropdown-item" href="#" data-action="manage-users" data-app-id="${app._id}">
                            <i class="fas fa-users"></i> Manage Users
                          </a></li>
                        ` : ''}
                        <li><a class="dropdown-item" href="#" data-action="view-analytics" data-app-id="${app._id}">
                          <i class="fas fa-chart-bar"></i> Analytics
                        </a></li>
                        ${this.canToggleStatus(app) ? `
                          <li><a class="dropdown-item" href="#" data-action="toggle-status" data-app-id="${app._id}">
                            <i class="fas fa-${app.isActive ? 'ban' : 'check'}"></i> ${app.isActive ? 'Deactivate' : 'Activate'}
                          </a></li>
                        ` : ''}
                        ${this.canDeleteApp(app) ? `
                          <li><hr class="dropdown-divider"></li>
                          <li><a class="dropdown-item text-danger" href="#" data-action="delete-app" data-app-id="${app._id}">
                            <i class="fas fa-trash"></i> Delete
                          </a></li>
                        ` : ''}
                      </ul>
                    </div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state text-center py-5">
        <div class="empty-icon mb-3">
          <i class="fas fa-th-large fa-3x text-muted"></i>
        </div>
        <h5>No applications found</h5>
        <p class="text-muted">Get started by creating your first application.</p>
        <button class="btn btn-primary" data-action="create-app">
          <i class="fas fa-plus"></i> Create Application
        </button>
      </div>
    `;
  }

  showErrorState() {
    const container = document.getElementById('appsContainer');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger text-center">
          <h5>Error loading applications</h5>
          <p>There was an error loading the applications. Please try again.</p>
          <button class="btn btn-outline-danger" onclick="location.reload()">
            <i class="fas fa-refresh"></i> Retry
          </button>
        </div>
      `;
    }
  }

  showAccessDenied() {
    const container = document.getElementById('appsContainer');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-warning text-center">
          <h5>Access Denied</h5>
          <p>You do not have permission to manage applications.</p>
          <a href="/dashboard.html" class="btn btn-primary">Go to Dashboard</a>
        </div>
      `;
    }
  }

  initializeFilters() {
    // Set initial filter values
    const searchInput = document.getElementById('searchApps');
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');

    if (searchInput) searchInput.value = this.currentFilters.search;
    if (statusFilter) statusFilter.value = this.currentFilters.status;
    if (sortBy) sortBy.value = this.currentFilters.sortBy;
    if (sortOrder) sortOrder.value = this.currentFilters.sortOrder;
  }

  initializeViewMode() {
    this.updateViewMode();
  }

  updateViewMode() {
    const gridBtn = document.querySelector('[data-view-mode="grid"]');
    const listBtn = document.querySelector('[data-view-mode="list"]');
    
    if (gridBtn && listBtn) {
      gridBtn.classList.toggle('active', this.viewMode === 'grid');
      listBtn.classList.toggle('active', this.viewMode === 'list');
    }
  }

  initializePagination() {
    // Pagination will be updated when apps are loaded
  }

  updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    if (this.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = `
      <nav aria-label="Apps pagination">
        <ul class="pagination justify-content-center">
          <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-action="prev-page">
              <i class="fas fa-chevron-left"></i>
            </a>
          </li>
    `;

    // Show page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" data-page="1">1</a>
        </li>
      `;
      if (startPage > 2) {
        paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" data-page="${this.totalPages}">${this.totalPages}</a>
        </li>
      `;
    }

    paginationHTML += `
          <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-action="next-page">
              <i class="fas fa-chevron-right"></i>
            </a>
          </li>
        </ul>
      </nav>
    `;

    paginationContainer.innerHTML = paginationHTML;
  }

  updateResultsInfo(total) {
    const resultsInfo = document.getElementById('resultsInfo');
    if (resultsInfo) {
      const start = (this.currentPage - 1) * this.itemsPerPage + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, total);
      resultsInfo.textContent = `Showing ${start}-${end} of ${total} applications`;
    }
  }

  initializeBulkActions() {
    this.updateBulkActions();
  }

  updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkActions) {
      bulkActions.style.display = this.selectedApps.size > 0 ? 'block' : 'none';
    }
    
    if (selectedCount) {
      selectedCount.textContent = this.selectedApps.size;
    }
  }

  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.app-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
      if (checked) {
        this.selectedApps.add(checkbox.value);
      } else {
        this.selectedApps.delete(checkbox.value);
      }
    });
    this.updateBulkActions();
  }

  async bulkDeleteApps() {
    if (this.selectedApps.size === 0) return;

    const confirmed = await window.utils.confirm(
      'Delete Applications',
      `Are you sure you want to delete ${this.selectedApps.size} selected application(s)? This action cannot be undone.`,
      'Delete',
      'danger'
    );

    if (!confirmed) return;

    try {
      const deletePromises = Array.from(this.selectedApps).map(appId => 
        window.api.deleteApp(appId)
      );
      
      await Promise.all(deletePromises);
      
      window.utils.toast.success(`${this.selectedApps.size} application(s) deleted successfully`);
      
      this.selectedApps.clear();
      this.updateBulkActions();
      this.loadApps();
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      window.utils.toast.error('Failed to delete some applications');
    }
  }

  async bulkActivateApps() {
    if (this.selectedApps.size === 0) return;

    try {
      const updatePromises = Array.from(this.selectedApps).map(appId => 
        window.api.updateApp(appId, { isActive: true })
      );
      
      await Promise.all(updatePromises);
      
      window.utils.toast.success(`${this.selectedApps.size} application(s) activated successfully`);
      
      this.selectedApps.clear();
      this.updateBulkActions();
      this.loadApps();
      
    } catch (error) {
      console.error('Bulk activate failed:', error);
      window.utils.toast.error('Failed to activate some applications');
    }
  }

  async bulkDeactivateApps() {
    if (this.selectedApps.size === 0) return;

    try {
      const updatePromises = Array.from(this.selectedApps).map(appId => 
        window.api.updateApp(appId, { isActive: false })
      );
      
      await Promise.all(updatePromises);
      
      window.utils.toast.success(`${this.selectedApps.size} application(s) deactivated successfully`);
      
      this.selectedApps.clear();
      this.updateBulkActions();
      this.loadApps();
      
    } catch (error) {
      console.error('Bulk deactivate failed:', error);
      window.utils.toast.error('Failed to deactivate some applications');
    }
  }

  setupCreateAppModal() {
    const createAppForm = document.getElementById('createAppForm');
    if (!createAppForm) return;

    createAppForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(createAppForm);
      
      try {
        await window.handleFormSubmit(
          createAppForm,
          () => window.api.createApp(formData),
          {
            onSuccess: () => {
              const modal = bootstrap.Modal.getInstance(document.getElementById('createAppModal'));
              modal.hide();
              this.loadApps();
            },
            successMessage: 'Application created successfully!'
          }
        );
      } catch (error) {
        // Error handling is done by the form submit handler
      }
    });
  }

  setupEditAppModal() {
    const editAppForm = document.getElementById('editAppForm');
    if (!editAppForm) return;

    editAppForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(editAppForm);
      const appId = editAppForm.dataset.appId;
      
      try {
        await window.handleFormSubmit(
          editAppForm,
          () => window.api.updateApp(appId, formData),
          {
            onSuccess: () => {
              const modal = bootstrap.Modal.getInstance(document.getElementById('editAppModal'));
              modal.hide();
              this.loadApps();
            },
            successMessage: 'Application updated successfully!'
          }
        );
      } catch (error) {
        // Error handling is done by the form submit handler
      }
    });
  }

  setupManageUsersModal() {
    // This will be implemented when the manage users modal is created
    // For now, we'll redirect to a dedicated page
  }

  showCreateAppModal() {
    const modal = document.getElementById('createAppModal');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  viewApp(appId) {
    window.location.href = `/app-details.html?id=${appId}`;
  }

  async editApp(appId) {
    try {
      const app = await window.api.getApp(appId);
      this.populateEditAppModal(app);
      
      const modal = document.getElementById('editAppModal');
      if (modal) {
        const editAppForm = document.getElementById('editAppForm');
        editAppForm.dataset.appId = appId;
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
      }
    } catch (error) {
      console.error('Failed to load app for editing:', error);
      window.utils.toast.error('Failed to load application data');
    }
  }

  populateEditAppModal(app) {
    const form = document.getElementById('editAppForm');
    if (!form) return;

    // Fill basic fields
    const fields = ['name', 'code', 'description'];
    fields.forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        input.value = app[field] || '';
      }
    });

    // Set active status
    const isActiveCheckbox = form.querySelector('[name="isActive"]');
    if (isActiveCheckbox) {
      isActiveCheckbox.checked = app.isActive;
    }
  }

  async deleteApp(appId) {
    const app = this.currentApps.find(a => a._id === appId);
    if (!app) return;

    const confirmed = await window.utils.confirm(
      'Delete Application',
      `Are you sure you want to delete "${app.name}"? This action cannot be undone and will delete all associated forms and data.`,
      'Delete',
      'danger'
    );

    if (!confirmed) return;

    try {
      await window.api.deleteApp(appId);
      window.utils.toast.success('Application deleted successfully!');
      this.loadApps();
    } catch (error) {
      console.error('Failed to delete app:', error);
    }
  }

  manageAppUsers(appId) {
    window.location.href = `/app-users.html?appId=${appId}`;
  }

  viewAppAnalytics(appId) {
    window.location.href = `/app-analytics.html?appId=${appId}`;
  }

  async toggleAppStatus(appId) {
    const app = this.currentApps.find(a => a._id === appId);
    if (!app) return;

    const action = app.isActive ? 'deactivate' : 'activate';
    const confirmed = await window.utils.confirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Application`,
      `Are you sure you want to ${action} "${app.name}"?`,
      action.charAt(0).toUpperCase() + action.slice(1),
      app.isActive ? 'warning' : 'success'
    );

    if (!confirmed) return;

    try {
      await window.api.updateApp(appId, { isActive: !app.isActive });
      window.utils.toast.success(`Application ${action}d successfully!`);
      this.loadApps();
    } catch (error) {
      console.error(`Failed to ${action} app:`, error);
    }
  }

  canEditApp(app) {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return false;

    // Super admin can edit all apps
    if (currentUser.role === 'super_admin') return true;

    // Admin can edit all apps
    if (currentUser.role === 'admin') return true;

    // App admin can edit their apps
    if (currentUser.appAccess) {
      return currentUser.appAccess.some(access => 
        access.appId === app._id && access.permissions.admin
      );
    }

    return false;
  }

  canDeleteApp(app) {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return false;

    // Only super admin can delete apps
    return currentUser.role === 'super_admin';
  }

  canManageUsers(app) {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return false;

    // Super admin can manage users for all apps
    if (currentUser.role === 'super_admin') return true;

    // Admin can manage users for all apps
    if (currentUser.role === 'admin') return true;

    // App admin can manage users for their apps
    if (currentUser.appAccess) {
      return currentUser.appAccess.some(access => 
        access.appId === app._id && access.permissions.admin
      );
    }

    return false;
  }

  canToggleStatus(app) {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return false;

    // Only super admin can deactivate apps
    if (!app.isActive) {
      return currentUser.role === 'super_admin';
    }

    // Super admin and admin can activate/deactivate
    return ['super_admin', 'admin'].includes(currentUser.role);
  }
}

// Create global apps manager instance
const appsManager = new AppsManager();

// Export apps manager
window.apps = appsManager;

// Helper functions for app operations
window.createApp = (appData) => {
  return window.api.createApp(appData);
};

window.getApp = (appId) => {
  return window.api.getApp(appId);
};

window.updateApp = (appId, appData) => {
  return window.api.updateApp(appId, appData);
};

window.deleteApp = (appId) => {
  return window.api.deleteApp(appId);
};

window.getAppUsers = (appId, params) => {
  return window.api.getAppUsers(appId, params);
};

window.addAppUser = (appId, userData) => {
  return window.api.addAppUser(appId, userData);
};

window.removeAppUser = (appId, userId) => {
  return window.api.removeAppUser(appId, userId);
};

window.getAppAnalytics = (appId, params) => {
  return window.api.getAppAnalytics(appId, params);
};