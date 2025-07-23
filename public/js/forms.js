// Forms Module

class FormsManager {
  constructor() {
    this.currentForms = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalPages = 1;
    this.currentFilters = {
      search: '',
      status: 'all',
      app: 'all',
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    };
    this.selectedForms = new Set();
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      if (this.isFormsPage()) {
        this.initializePage();
        this.setupEventListeners();
        this.loadForms();
      }
    });
  }

  isFormsPage() {
    return window.location.pathname.includes('forms') || 
           window.location.pathname.includes('form-builder') ||
           window.location.pathname.includes('form-view');
  }

  initializePage() {
    // Initialize filters
    this.initializeFilters();
    
    // Initialize pagination
    this.initializePagination();
    
    // Initialize bulk actions
    this.initializeBulkActions();
    
    // Load app options for filters
    this.loadAppOptions();
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchForms');
    if (searchInput) {
      searchInput.addEventListener('input', window.utils.debounce((e) => {
        this.currentFilters.search = e.target.value;
        this.currentPage = 1;
        this.loadForms();
      }, 300));
    }

    // Filter changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('#statusFilter')) {
        this.currentFilters.status = e.target.value;
        this.currentPage = 1;
        this.loadForms();
      }
      
      if (e.target.matches('#appFilter')) {
        this.currentFilters.app = e.target.value;
        this.currentPage = 1;
        this.loadForms();
      }
      
      if (e.target.matches('#sortBy')) {
        this.currentFilters.sortBy = e.target.value;
        this.loadForms();
      }
      
      if (e.target.matches('#sortOrder')) {
        this.currentFilters.sortOrder = e.target.value;
        this.loadForms();
      }
    });

    // Action buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="create-form"]')) {
        e.preventDefault();
        this.showCreateFormModal();
      }
      
      if (e.target.matches('[data-action="view-form"]')) {
        e.preventDefault();
        const formId = e.target.dataset.formId;
        this.viewForm(formId);
      }
      
      if (e.target.matches('[data-action="edit-form"]')) {
        e.preventDefault();
        const formId = e.target.dataset.formId;
        this.editForm(formId);
      }
      
      if (e.target.matches('[data-action="duplicate-form"]')) {
        e.preventDefault();
        const formId = e.target.dataset.formId;
        this.duplicateForm(formId);
      }
      
      if (e.target.matches('[data-action="delete-form"]')) {
        e.preventDefault();
        const formId = e.target.dataset.formId;
        this.deleteForm(formId);
      }
      
      if (e.target.matches('[data-action="view-responses"]')) {
        e.preventDefault();
        const formId = e.target.dataset.formId;
        this.viewResponses(formId);
      }
      
      if (e.target.matches('[data-action="view-analytics"]')) {
        e.preventDefault();
        const formId = e.target.dataset.formId;
        this.viewAnalytics(formId);
      }
      
      if (e.target.matches('[data-action="share-form"]')) {
        e.preventDefault();
        const formId = e.target.dataset.formId;
        this.shareForm(formId);
      }
    });

    // Bulk selection
    document.addEventListener('change', (e) => {
      if (e.target.matches('#selectAllForms')) {
        this.toggleSelectAll(e.target.checked);
      }
      
      if (e.target.matches('.form-checkbox')) {
        const formId = e.target.value;
        if (e.target.checked) {
          this.selectedForms.add(formId);
        } else {
          this.selectedForms.delete(formId);
        }
        this.updateBulkActions();
      }
    });

    // Bulk actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="bulk-delete"]')) {
        e.preventDefault();
        this.bulkDeleteForms();
      }
      
      if (e.target.matches('[data-action="bulk-publish"]')) {
        e.preventDefault();
        this.bulkPublishForms();
      }
      
      if (e.target.matches('[data-action="bulk-unpublish"]')) {
        e.preventDefault();
        this.bulkUnpublishForms();
      }
    });

    // Pagination
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="prev-page"]')) {
        e.preventDefault();
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadForms();
        }
      }
      
      if (e.target.matches('[data-action="next-page"]')) {
        e.preventDefault();
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadForms();
        }
      }
      
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        this.currentPage = parseInt(e.target.dataset.page);
        this.loadForms();
      }
    });

    // Create form modal
    this.setupCreateFormModal();
  }

  async loadForms() {
    try {
      const params = {
        page: this.currentPage,
        limit: this.itemsPerPage,
        search: this.currentFilters.search,
        sortBy: this.currentFilters.sortBy,
        sortOrder: this.currentFilters.sortOrder
      };

      if (this.currentFilters.status !== 'all') {
        params.status = this.currentFilters.status;
      }

      if (this.currentFilters.app !== 'all') {
        params.appId = this.currentFilters.app;
      }

      const response = await window.api.getForms(params);
      
      this.currentForms = response.forms;
      this.totalPages = response.totalPages;
      
      this.renderForms();
      this.updatePagination();
      this.updateResultsInfo(response.total);
      
    } catch (error) {
      console.error('Failed to load forms:', error);
      this.showErrorState();
    }
  }

  renderForms() {
    const container = document.getElementById('formsContainer');
    if (!container) return;

    if (this.currentForms.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    const viewMode = this.getViewMode();
    
    if (viewMode === 'grid') {
      container.innerHTML = this.renderGridView();
    } else {
      container.innerHTML = this.renderListView();
    }
  }

  renderGridView() {
    return `
      <div class="row">
        ${this.currentForms.map(form => `
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="card form-card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <div class="form-check">
                  <input class="form-check-input form-checkbox" type="checkbox" value="${form._id}" id="form-${form._id}">
                  <label class="form-check-label" for="form-${form._id}"></label>
                </div>
                <div class="dropdown">
                  <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                  <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" data-action="view-form" data-form-id="${form._id}">
                      <i class="fas fa-eye"></i> View
                    </a></li>
                    ${this.canEditForm(form) ? `
                      <li><a class="dropdown-item" href="#" data-action="edit-form" data-form-id="${form._id}">
                        <i class="fas fa-edit"></i> Edit
                      </a></li>
                    ` : ''}
                    <li><a class="dropdown-item" href="#" data-action="duplicate-form" data-form-id="${form._id}">
                      <i class="fas fa-copy"></i> Duplicate
                    </a></li>
                    <li><a class="dropdown-item" href="#" data-action="view-responses" data-form-id="${form._id}">
                      <i class="fas fa-chart-bar"></i> Responses (${form.responseCount || 0})
                    </a></li>
                    <li><a class="dropdown-item" href="#" data-action="share-form" data-form-id="${form._id}">
                      <i class="fas fa-share"></i> Share
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    ${this.canDeleteForm(form) ? `
                      <li><a class="dropdown-item text-danger" href="#" data-action="delete-form" data-form-id="${form._id}">
                        <i class="fas fa-trash"></i> Delete
                      </a></li>
                    ` : ''}
                  </ul>
                </div>
              </div>
              <div class="card-body">
                <h6 class="card-title">
                  <a href="#" data-action="view-form" data-form-id="${form._id}">${form.title}</a>
                </h6>
                <p class="card-text text-muted">${window.utils.truncateText(form.description || 'No description', 100)}</p>
                <div class="form-meta">
                  <span class="badge ${window.utils.getStatusColor(form.status)}">
                    ${window.utils.getStatusDisplayName(form.status)}
                  </span>
                  <span class="text-muted">•</span>
                  <span class="text-muted">${form.appName}</span>
                </div>
              </div>
              <div class="card-footer">
                <div class="d-flex justify-content-between align-items-center">
                  <small class="text-muted">
                    Updated ${window.utils.formatRelativeTime(form.updatedAt)}
                  </small>
                  <div class="form-stats">
                    <span class="badge badge-light">${form.responseCount || 0} responses</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderListView() {
    return `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th width="40">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="selectAllForms">
                </div>
              </th>
              <th>Title</th>
              <th>Application</th>
              <th>Status</th>
              <th>Responses</th>
              <th>Updated</th>
              <th width="120">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentForms.map(form => `
              <tr>
                <td>
                  <div class="form-check">
                    <input class="form-check-input form-checkbox" type="checkbox" value="${form._id}">
                  </div>
                </td>
                <td>
                  <div>
                    <h6 class="mb-0">
                      <a href="#" data-action="view-form" data-form-id="${form._id}">${form.title}</a>
                    </h6>
                    ${form.description ? `<small class="text-muted">${window.utils.truncateText(form.description, 60)}</small>` : ''}
                  </div>
                </td>
                <td>
                  <span class="badge badge-outline-primary">${form.appName}</span>
                </td>
                <td>
                  <span class="badge ${window.utils.getStatusColor(form.status)}">
                    ${window.utils.getStatusDisplayName(form.status)}
                  </span>
                </td>
                <td>
                  <a href="#" data-action="view-responses" data-form-id="${form._id}" class="text-decoration-none">
                    ${form.responseCount || 0}
                  </a>
                </td>
                <td>
                  <span class="text-muted">${window.utils.formatRelativeTime(form.updatedAt)}</span>
                </td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" data-action="view-form" data-form-id="${form._id}" title="View">
                      <i class="fas fa-eye"></i>
                    </button>
                    ${this.canEditForm(form) ? `
                      <button class="btn btn-outline-secondary" data-action="edit-form" data-form-id="${form._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                    ` : ''}
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="More">
                        <i class="fas fa-ellipsis-h"></i>
                      </button>
                      <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" data-action="duplicate-form" data-form-id="${form._id}">
                          <i class="fas fa-copy"></i> Duplicate
                        </a></li>
                        <li><a class="dropdown-item" href="#" data-action="view-analytics" data-form-id="${form._id}">
                          <i class="fas fa-chart-line"></i> Analytics
                        </a></li>
                        <li><a class="dropdown-item" href="#" data-action="share-form" data-form-id="${form._id}">
                          <i class="fas fa-share"></i> Share
                        </a></li>
                        ${this.canDeleteForm(form) ? `
                          <li><hr class="dropdown-divider"></li>
                          <li><a class="dropdown-item text-danger" href="#" data-action="delete-form" data-form-id="${form._id}">
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
          <i class="fas fa-file-alt fa-3x text-muted"></i>
        </div>
        <h5>No forms found</h5>
        <p class="text-muted">Get started by creating your first form.</p>
        <button class="btn btn-primary" data-action="create-form">
          <i class="fas fa-plus"></i> Create Form
        </button>
      </div>
    `;
  }

  showErrorState() {
    const container = document.getElementById('formsContainer');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger text-center">
          <h5>Error loading forms</h5>
          <p>There was an error loading the forms. Please try again.</p>
          <button class="btn btn-outline-danger" onclick="location.reload()">
            <i class="fas fa-refresh"></i> Retry
          </button>
        </div>
      `;
    }
  }

  getViewMode() {
    return localStorage.getItem('formsViewMode') || 'list';
  }

  setViewMode(mode) {
    localStorage.setItem('formsViewMode', mode);
    this.renderForms();
  }

  initializeFilters() {
    // Set initial filter values
    const searchInput = document.getElementById('searchForms');
    const statusFilter = document.getElementById('statusFilter');
    const appFilter = document.getElementById('appFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');

    if (searchInput) searchInput.value = this.currentFilters.search;
    if (statusFilter) statusFilter.value = this.currentFilters.status;
    if (appFilter) appFilter.value = this.currentFilters.app;
    if (sortBy) sortBy.value = this.currentFilters.sortBy;
    if (sortOrder) sortOrder.value = this.currentFilters.sortOrder;
  }

  async loadAppOptions() {
    try {
      const response = await window.api.getApps({ limit: 100 });
      const appFilter = document.getElementById('appFilter');
      
      if (appFilter && response.apps) {
        // Keep the "All" option
        const allOption = appFilter.querySelector('option[value="all"]');
        appFilter.innerHTML = '';
        if (allOption) {
          appFilter.appendChild(allOption);
        } else {
          appFilter.innerHTML = '<option value="all">All Applications</option>';
        }

        // Add app options based on user access
        response.apps.forEach(app => {
          if (window.auth.canAccessApp(app.code)) {
            const option = document.createElement('option');
            option.value = app._id;
            option.textContent = app.name;
            appFilter.appendChild(option);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load app options:', error);
    }
  }

  initializePagination() {
    // Pagination will be updated when forms are loaded
  }

  updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    if (this.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = `
      <nav aria-label="Forms pagination">
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
      resultsInfo.textContent = `Showing ${start}-${end} of ${total} forms`;
    }
  }

  initializeBulkActions() {
    this.updateBulkActions();
  }

  updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkActions) {
      bulkActions.style.display = this.selectedForms.size > 0 ? 'block' : 'none';
    }
    
    if (selectedCount) {
      selectedCount.textContent = this.selectedForms.size;
    }
  }

  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.form-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
      if (checked) {
        this.selectedForms.add(checkbox.value);
      } else {
        this.selectedForms.delete(checkbox.value);
      }
    });
    this.updateBulkActions();
  }

  async bulkDeleteForms() {
    if (this.selectedForms.size === 0) return;

    const confirmed = await window.utils.confirm(
      'Delete Forms',
      `Are you sure you want to delete ${this.selectedForms.size} selected form(s)? This action cannot be undone.`,
      'Delete',
      'danger'
    );

    if (!confirmed) return;

    try {
      const deletePromises = Array.from(this.selectedForms).map(formId => 
        window.api.deleteForm(formId)
      );
      
      await Promise.all(deletePromises);
      
      window.utils.toast.success(`${this.selectedForms.size} form(s) deleted successfully`);
      
      this.selectedForms.clear();
      this.updateBulkActions();
      this.loadForms();
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      window.utils.toast.error('Failed to delete some forms');
    }
  }

  async bulkPublishForms() {
    if (this.selectedForms.size === 0) return;

    try {
      const updatePromises = Array.from(this.selectedForms).map(formId => 
        window.api.updateForm(formId, { status: 'published' })
      );
      
      await Promise.all(updatePromises);
      
      window.utils.toast.success(`${this.selectedForms.size} form(s) published successfully`);
      
      this.selectedForms.clear();
      this.updateBulkActions();
      this.loadForms();
      
    } catch (error) {
      console.error('Bulk publish failed:', error);
      window.utils.toast.error('Failed to publish some forms');
    }
  }

  async bulkUnpublishForms() {
    if (this.selectedForms.size === 0) return;

    try {
      const updatePromises = Array.from(this.selectedForms).map(formId => 
        window.api.updateForm(formId, { status: 'draft' })
      );
      
      await Promise.all(updatePromises);
      
      window.utils.toast.success(`${this.selectedForms.size} form(s) unpublished successfully`);
      
      this.selectedForms.clear();
      this.updateBulkActions();
      this.loadForms();
      
    } catch (error) {
      console.error('Bulk unpublish failed:', error);
      window.utils.toast.error('Failed to unpublish some forms');
    }
  }

  setupCreateFormModal() {
    const createFormForm = document.getElementById('createFormForm');
    if (!createFormForm) return;

    createFormForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(createFormForm);
      
      try {
        await window.handleFormSubmit(
          createFormForm,
          () => window.api.createForm(formData),
          {
            onSuccess: (response) => {
              const modal = bootstrap.Modal.getInstance(document.getElementById('createFormModal'));
              modal.hide();
              
              // Redirect to form builder
              window.location.href = `/form-builder.html?id=${response.form._id}`;
            },
            successMessage: 'Form created successfully!'
          }
        );
      } catch (error) {
        // Error handling is done by the form submit handler
      }
    });

    // Load app options for create form modal
    this.loadCreateFormAppOptions();
  }

  async loadCreateFormAppOptions() {
    try {
      const response = await window.api.getApps({ limit: 100 });
      const appSelect = document.getElementById('createFormApp');
      
      if (appSelect && response.apps) {
        appSelect.innerHTML = '<option value="">Select Application</option>';
        
        response.apps.forEach(app => {
          if (window.auth.hasAppAccess(app.code, 'edit')) {
            const option = document.createElement('option');
            option.value = app._id;
            option.textContent = app.name;
            appSelect.appendChild(option);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load app options for create form:', error);
    }
  }

  showCreateFormModal() {
    const modal = document.getElementById('createFormModal');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  viewForm(formId) {
    window.location.href = `/form-view.html?id=${formId}`;
  }

  editForm(formId) {
    window.location.href = `/form-builder.html?id=${formId}`;
  }

  async duplicateForm(formId) {
    try {
      const response = await window.api.duplicateForm(formId);
      window.utils.toast.success('Form duplicated successfully!');
      
      // Redirect to edit the duplicated form
      window.location.href = `/form-builder.html?id=${response.form._id}`;
      
    } catch (error) {
      console.error('Failed to duplicate form:', error);
    }
  }

  async deleteForm(formId) {
    const form = this.currentForms.find(f => f._id === formId);
    if (!form) return;

    const confirmed = await window.utils.confirm(
      'Delete Form',
      `Are you sure you want to delete "${form.title}"? This action cannot be undone and will also delete all responses.`,
      'Delete',
      'danger'
    );

    if (!confirmed) return;

    try {
      await window.api.deleteForm(formId);
      window.utils.toast.success('Form deleted successfully!');
      this.loadForms();
    } catch (error) {
      console.error('Failed to delete form:', error);
    }
  }

  viewResponses(formId) {
    window.location.href = `/responses.html?formId=${formId}`;
  }

  viewAnalytics(formId) {
    window.location.href = `/analytics.html?formId=${formId}`;
  }

  shareForm(formId) {
    const form = this.currentForms.find(f => f._id === formId);
    if (!form) return;

    const shareUrl = `${window.location.origin}/public/${form.shareableLink}`;
    
    // Copy to clipboard
    window.utils.copyToClipboard(shareUrl).then(() => {
      window.utils.toast.success('Share link copied to clipboard!');
    }).catch(() => {
      // Fallback: show the link in a modal
      this.showShareModal(shareUrl, form.title);
    });
  }

  showShareModal(shareUrl, formTitle) {
    const modalHTML = `
      <div class="modal fade" id="shareModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Share Form</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p>Share this link to allow others to fill out "${formTitle}":</p>
              <div class="input-group">
                <input type="text" class="form-control" value="${shareUrl}" readonly>
                <button class="btn btn-outline-secondary" type="button" onclick="window.utils.copyToClipboard('${shareUrl}')">
                  <i class="fas fa-copy"></i> Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('shareModal'));
    modal.show();
    
    // Remove modal from DOM when hidden
    document.getElementById('shareModal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('shareModal').remove();
    });
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

  canDeleteForm(form) {
    const user = window.auth.getCurrentUser();
    if (!user) return false;

    // Owner can always delete
    if (form.createdBy === user._id) return true;

    // Super admin and admin can delete all forms
    if (['super_admin', 'admin'].includes(user.role)) return true;

    // App admin can delete forms in their app
    return window.auth.hasAppAccess(form.appCode, 'admin');
  }
}

// Create global forms manager instance
const formsManager = new FormsManager();

// Export forms manager
window.forms = formsManager;

// Helper functions for form operations
window.createForm = (appId, title, description) => {
  return window.api.createForm({ appId, title, description });
};

window.getForm = (formId) => {
  return window.api.getForm(formId);
};

window.updateForm = (formId, data) => {
  return window.api.updateForm(formId, data);
};

window.deleteForm = (formId) => {
  return window.api.deleteForm(formId);
};