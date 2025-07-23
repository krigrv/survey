// Users Module

class UsersManager {
  constructor() {
    this.currentUsers = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalPages = 1;
    this.currentFilters = {
      search: '',
      role: 'all',
      app: 'all',
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    this.selectedUsers = new Set();
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      if (this.isUsersPage()) {
        this.initializePage();
        this.setupEventListeners();
        this.loadUsers();
      }
    });
  }

  isUsersPage() {
    return window.location.pathname.includes('users');
  }

  initializePage() {
    // Check permissions
    if (!window.auth.canManageUsers()) {
      this.showAccessDenied();
      return;
    }

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
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
      searchInput.addEventListener('input', window.utils.debounce((e) => {
        this.currentFilters.search = e.target.value;
        this.currentPage = 1;
        this.loadUsers();
      }, 300));
    }

    // Filter changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('#roleFilter')) {
        this.currentFilters.role = e.target.value;
        this.currentPage = 1;
        this.loadUsers();
      }
      
      if (e.target.matches('#appFilter')) {
        this.currentFilters.app = e.target.value;
        this.currentPage = 1;
        this.loadUsers();
      }
      
      if (e.target.matches('#statusFilter')) {
        this.currentFilters.status = e.target.value;
        this.currentPage = 1;
        this.loadUsers();
      }
      
      if (e.target.matches('#sortBy')) {
        this.currentFilters.sortBy = e.target.value;
        this.loadUsers();
      }
      
      if (e.target.matches('#sortOrder')) {
        this.currentFilters.sortOrder = e.target.value;
        this.loadUsers();
      }
    });

    // Action buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="create-user"]')) {
        e.preventDefault();
        this.showCreateUserModal();
      }
      
      if (e.target.matches('[data-action="view-user"]')) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        this.viewUser(userId);
      }
      
      if (e.target.matches('[data-action="edit-user"]')) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        this.editUser(userId);
      }
      
      if (e.target.matches('[data-action="delete-user"]')) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        this.deleteUser(userId);
      }
      
      if (e.target.matches('[data-action="reset-password"]')) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        this.resetUserPassword(userId);
      }
      
      if (e.target.matches('[data-action="toggle-status"]')) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        this.toggleUserStatus(userId);
      }
    });

    // Bulk selection
    document.addEventListener('change', (e) => {
      if (e.target.matches('#selectAllUsers')) {
        this.toggleSelectAll(e.target.checked);
      }
      
      if (e.target.matches('.user-checkbox')) {
        const userId = e.target.value;
        if (e.target.checked) {
          this.selectedUsers.add(userId);
        } else {
          this.selectedUsers.delete(userId);
        }
        this.updateBulkActions();
      }
    });

    // Bulk actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="bulk-delete"]')) {
        e.preventDefault();
        this.bulkDeleteUsers();
      }
      
      if (e.target.matches('[data-action="bulk-activate"]')) {
        e.preventDefault();
        this.bulkActivateUsers();
      }
      
      if (e.target.matches('[data-action="bulk-deactivate"]')) {
        e.preventDefault();
        this.bulkDeactivateUsers();
      }
    });

    // Pagination
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="prev-page"]')) {
        e.preventDefault();
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadUsers();
        }
      }
      
      if (e.target.matches('[data-action="next-page"]')) {
        e.preventDefault();
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadUsers();
        }
      }
      
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        this.currentPage = parseInt(e.target.dataset.page);
        this.loadUsers();
      }
    });

    // Modal forms
    this.setupCreateUserModal();
    this.setupEditUserModal();
    this.setupResetPasswordModal();
  }

  async loadUsers() {
    try {
      const params = {
        page: this.currentPage,
        limit: this.itemsPerPage,
        search: this.currentFilters.search,
        sortBy: this.currentFilters.sortBy,
        sortOrder: this.currentFilters.sortOrder
      };

      if (this.currentFilters.role !== 'all') {
        params.role = this.currentFilters.role;
      }

      if (this.currentFilters.app !== 'all') {
        params.appId = this.currentFilters.app;
      }

      if (this.currentFilters.status !== 'all') {
        params.isActive = this.currentFilters.status === 'active';
      }

      const response = await window.api.getUsers(params);
      
      this.currentUsers = response.users;
      this.totalPages = response.totalPages;
      
      this.renderUsers();
      this.updatePagination();
      this.updateResultsInfo(response.total);
      
    } catch (error) {
      console.error('Failed to load users:', error);
      this.showErrorState();
    }
  }

  renderUsers() {
    const container = document.getElementById('usersContainer');
    if (!container) return;

    if (this.currentUsers.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    container.innerHTML = this.renderUsersTable();
  }

  renderUsersTable() {
    return `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th width="40">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="selectAllUsers">
                </div>
              </th>
              <th>User</th>
              <th>Role</th>
              <th>Applications</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th width="150">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentUsers.map(user => `
              <tr>
                <td>
                  <div class="form-check">
                    <input class="form-check-input user-checkbox" type="checkbox" value="${user._id}">
                  </div>
                </td>
                <td>
                  <div class="d-flex align-items-center">
                    <div class="user-avatar me-3">
                      <img src="${user.profileImage || this.getDefaultAvatar(user.firstName, user.lastName)}" 
                           alt="${user.firstName} ${user.lastName}" 
                           class="rounded-circle" width="40" height="40">
                    </div>
                    <div>
                      <h6 class="mb-0">${user.firstName} ${user.lastName}</h6>
                      <small class="text-muted">${user.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge ${window.utils.getRoleColor(user.role)}">
                    ${window.utils.getRoleDisplayName(user.role)}
                  </span>
                </td>
                <td>
                  <div class="app-access">
                    ${this.renderUserAppAccess(user.appAccess)}
                  </div>
                </td>
                <td>
                  <span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">
                    ${user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <span class="text-muted">
                    ${user.lastLogin ? window.utils.formatRelativeTime(user.lastLogin) : 'Never'}
                  </span>
                </td>
                <td>
                  <span class="text-muted">${window.utils.formatDate(user.createdAt)}</span>
                </td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" data-action="view-user" data-user-id="${user._id}" title="View">
                      <i class="fas fa-eye"></i>
                    </button>
                    ${this.canEditUser(user) ? `
                      <button class="btn btn-outline-secondary" data-action="edit-user" data-user-id="${user._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                    ` : ''}
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="More">
                        <i class="fas fa-ellipsis-h"></i>
                      </button>
                      <ul class="dropdown-menu">
                        ${this.canResetPassword(user) ? `
                          <li><a class="dropdown-item" href="#" data-action="reset-password" data-user-id="${user._id}">
                            <i class="fas fa-key"></i> Reset Password
                          </a></li>
                        ` : ''}
                        ${this.canToggleStatus(user) ? `
                          <li><a class="dropdown-item" href="#" data-action="toggle-status" data-user-id="${user._id}">
                            <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i> ${user.isActive ? 'Deactivate' : 'Activate'}
                          </a></li>
                        ` : ''}
                        ${this.canDeleteUser(user) ? `
                          <li><hr class="dropdown-divider"></li>
                          <li><a class="dropdown-item text-danger" href="#" data-action="delete-user" data-user-id="${user._id}">
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

  renderUserAppAccess(appAccess) {
    if (!appAccess || appAccess.length === 0) {
      return '<span class="text-muted">No access</span>';
    }

    const maxShow = 2;
    const shown = appAccess.slice(0, maxShow);
    const remaining = appAccess.length - maxShow;

    let html = shown.map(access => {
      const permissions = [];
      if (access.permissions.admin) permissions.push('Admin');
      else if (access.permissions.edit) permissions.push('Edit');
      else if (access.permissions.view) permissions.push('View');
      
      return `
        <span class="badge badge-outline-primary" title="${access.appName} - ${permissions.join(', ')}">
          ${access.appCode}
        </span>
      `;
    }).join(' ');

    if (remaining > 0) {
      html += ` <span class="badge badge-light">+${remaining} more</span>`;
    }

    return html;
  }

  renderEmptyState() {
    return `
      <div class="empty-state text-center py-5">
        <div class="empty-icon mb-3">
          <i class="fas fa-users fa-3x text-muted"></i>
        </div>
        <h5>No users found</h5>
        <p class="text-muted">Get started by creating your first user.</p>
        <button class="btn btn-primary" data-action="create-user">
          <i class="fas fa-plus"></i> Create User
        </button>
      </div>
    `;
  }

  showErrorState() {
    const container = document.getElementById('usersContainer');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger text-center">
          <h5>Error loading users</h5>
          <p>There was an error loading the users. Please try again.</p>
          <button class="btn btn-outline-danger" onclick="location.reload()">
            <i class="fas fa-refresh"></i> Retry
          </button>
        </div>
      `;
    }
  }

  showAccessDenied() {
    const container = document.getElementById('usersContainer');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-warning text-center">
          <h5>Access Denied</h5>
          <p>You do not have permission to manage users.</p>
          <a href="/dashboard.html" class="btn btn-primary">Go to Dashboard</a>
        </div>
      `;
    }
  }

  getDefaultAvatar(firstName, lastName) {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    // Generate color based on name
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
    
    ctx.fillStyle = colors[colorIndex];
    ctx.fillRect(0, 0, 40, 40);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 20, 20);
    
    return canvas.toDataURL();
  }

  initializeFilters() {
    // Set initial filter values
    const searchInput = document.getElementById('searchUsers');
    const roleFilter = document.getElementById('roleFilter');
    const appFilter = document.getElementById('appFilter');
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrder = document.getElementById('sortOrder');

    if (searchInput) searchInput.value = this.currentFilters.search;
    if (roleFilter) roleFilter.value = this.currentFilters.role;
    if (appFilter) appFilter.value = this.currentFilters.app;
    if (statusFilter) statusFilter.value = this.currentFilters.status;
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

        // Add app options
        response.apps.forEach(app => {
          const option = document.createElement('option');
          option.value = app._id;
          option.textContent = app.name;
          appFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Failed to load app options:', error);
    }
  }

  initializePagination() {
    // Pagination will be updated when users are loaded
  }

  updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    if (this.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = `
      <nav aria-label="Users pagination">
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
      resultsInfo.textContent = `Showing ${start}-${end} of ${total} users`;
    }
  }

  initializeBulkActions() {
    this.updateBulkActions();
  }

  updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkActions) {
      bulkActions.style.display = this.selectedUsers.size > 0 ? 'block' : 'none';
    }
    
    if (selectedCount) {
      selectedCount.textContent = this.selectedUsers.size;
    }
  }

  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
      if (checked) {
        this.selectedUsers.add(checkbox.value);
      } else {
        this.selectedUsers.delete(checkbox.value);
      }
    });
    this.updateBulkActions();
  }

  async bulkDeleteUsers() {
    if (this.selectedUsers.size === 0) return;

    const confirmed = await window.utils.confirm(
      'Delete Users',
      `Are you sure you want to delete ${this.selectedUsers.size} selected user(s)? This action cannot be undone.`,
      'Delete',
      'danger'
    );

    if (!confirmed) return;

    try {
      const deletePromises = Array.from(this.selectedUsers).map(userId => 
        window.api.deleteUser(userId)
      );
      
      await Promise.all(deletePromises);
      
      window.utils.toast.success(`${this.selectedUsers.size} user(s) deleted successfully`);
      
      this.selectedUsers.clear();
      this.updateBulkActions();
      this.loadUsers();
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      window.utils.toast.error('Failed to delete some users');
    }
  }

  async bulkActivateUsers() {
    if (this.selectedUsers.size === 0) return;

    try {
      const updatePromises = Array.from(this.selectedUsers).map(userId => 
        window.api.updateUser(userId, { isActive: true })
      );
      
      await Promise.all(updatePromises);
      
      window.utils.toast.success(`${this.selectedUsers.size} user(s) activated successfully`);
      
      this.selectedUsers.clear();
      this.updateBulkActions();
      this.loadUsers();
      
    } catch (error) {
      console.error('Bulk activate failed:', error);
      window.utils.toast.error('Failed to activate some users');
    }
  }

  async bulkDeactivateUsers() {
    if (this.selectedUsers.size === 0) return;

    try {
      const updatePromises = Array.from(this.selectedUsers).map(userId => 
        window.api.updateUser(userId, { isActive: false })
      );
      
      await Promise.all(updatePromises);
      
      window.utils.toast.success(`${this.selectedUsers.size} user(s) deactivated successfully`);
      
      this.selectedUsers.clear();
      this.updateBulkActions();
      this.loadUsers();
      
    } catch (error) {
      console.error('Bulk deactivate failed:', error);
      window.utils.toast.error('Failed to deactivate some users');
    }
  }

  setupCreateUserModal() {
    const createUserForm = document.getElementById('createUserForm');
    if (!createUserForm) return;

    createUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(createUserForm);
      
      // Process app access
      const appAccessElements = createUserForm.querySelectorAll('[name^="appAccess"]');
      const appAccess = [];
      
      appAccessElements.forEach(element => {
        const match = element.name.match(/appAccess\[(\w+)\]\[(\w+)\]/);
        if (match && element.checked) {
          const [, appId, permission] = match;
          let access = appAccess.find(a => a.appId === appId);
          if (!access) {
            access = { appId, permissions: {} };
            appAccess.push(access);
          }
          access.permissions[permission] = true;
        }
      });
      
      formData.appAccess = appAccess;
      
      try {
        await window.handleFormSubmit(
          createUserForm,
          () => window.api.createUser(formData),
          {
            onSuccess: () => {
              const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
              modal.hide();
              this.loadUsers();
            },
            successMessage: 'User created successfully!'
          }
        );
      } catch (error) {
        // Error handling is done by the form submit handler
      }
    });

    // Load app options for create user modal
    this.loadCreateUserAppOptions();
  }

  setupEditUserModal() {
    const editUserForm = document.getElementById('editUserForm');
    if (!editUserForm) return;

    editUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(editUserForm);
      const userId = editUserForm.dataset.userId;
      
      // Process app access
      const appAccessElements = editUserForm.querySelectorAll('[name^="appAccess"]');
      const appAccess = [];
      
      appAccessElements.forEach(element => {
        const match = element.name.match(/appAccess\[(\w+)\]\[(\w+)\]/);
        if (match && element.checked) {
          const [, appId, permission] = match;
          let access = appAccess.find(a => a.appId === appId);
          if (!access) {
            access = { appId, permissions: {} };
            appAccess.push(access);
          }
          access.permissions[permission] = true;
        }
      });
      
      formData.appAccess = appAccess;
      
      try {
        await window.handleFormSubmit(
          editUserForm,
          () => window.api.updateUser(userId, formData),
          {
            onSuccess: () => {
              const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
              modal.hide();
              this.loadUsers();
            },
            successMessage: 'User updated successfully!'
          }
        );
      } catch (error) {
        // Error handling is done by the form submit handler
      }
    });
  }

  setupResetPasswordModal() {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (!resetPasswordForm) return;

    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(resetPasswordForm);
      const userId = resetPasswordForm.dataset.userId;
      
      // Validate password confirmation
      if (formData.newPassword !== formData.confirmPassword) {
        window.utils.showFieldError(
          resetPasswordForm.querySelector('input[name="confirmPassword"]'),
          'Passwords do not match'
        );
        return;
      }
      
      try {
        await window.handleFormSubmit(
          resetPasswordForm,
          () => window.api.resetUserPassword(userId, { newPassword: formData.newPassword }),
          {
            onSuccess: () => {
              const modal = bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'));
              modal.hide();
            },
            successMessage: 'Password reset successfully!'
          }
        );
      } catch (error) {
        // Error handling is done by the form submit handler
      }
    });
  }

  async loadCreateUserAppOptions() {
    try {
      const response = await window.api.getApps({ limit: 100 });
      const appAccessContainer = document.getElementById('createUserAppAccess');
      
      if (appAccessContainer && response.apps) {
        appAccessContainer.innerHTML = response.apps.map(app => `
          <div class="app-access-item">
            <h6>${app.name} (${app.code})</h6>
            <div class="permissions">
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" name="appAccess[${app._id}][view]" id="create-${app._id}-view">
                <label class="form-check-label" for="create-${app._id}-view">View</label>
              </div>
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" name="appAccess[${app._id}][edit]" id="create-${app._id}-edit">
                <label class="form-check-label" for="create-${app._id}-edit">Edit</label>
              </div>
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" name="appAccess[${app._id}][admin]" id="create-${app._id}-admin">
                <label class="form-check-label" for="create-${app._id}-admin">Admin</label>
              </div>
            </div>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load app options for create user:', error);
    }
  }

  showCreateUserModal() {
    const modal = document.getElementById('createUserModal');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  viewUser(userId) {
    window.location.href = `/user-profile.html?id=${userId}`;
  }

  async editUser(userId) {
    try {
      const user = await window.api.getUser(userId);
      this.populateEditUserModal(user);
      
      const modal = document.getElementById('editUserModal');
      if (modal) {
        const editUserForm = document.getElementById('editUserForm');
        editUserForm.dataset.userId = userId;
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
      }
    } catch (error) {
      console.error('Failed to load user for editing:', error);
      window.utils.toast.error('Failed to load user data');
    }
  }

  populateEditUserModal(user) {
    const form = document.getElementById('editUserForm');
    if (!form) return;

    // Fill basic fields
    const fields = ['firstName', 'lastName', 'email', 'role'];
    fields.forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        input.value = user[field] || '';
      }
    });

    // Set active status
    const isActiveCheckbox = form.querySelector('[name="isActive"]');
    if (isActiveCheckbox) {
      isActiveCheckbox.checked = user.isActive;
    }

    // Load and set app access
    this.loadEditUserAppOptions(user.appAccess);
  }

  async loadEditUserAppOptions(userAppAccess = []) {
    try {
      const response = await window.api.getApps({ limit: 100 });
      const appAccessContainer = document.getElementById('editUserAppAccess');
      
      if (appAccessContainer && response.apps) {
        appAccessContainer.innerHTML = response.apps.map(app => {
          const userAccess = userAppAccess.find(access => access.appId === app._id);
          const permissions = userAccess ? userAccess.permissions : {};
          
          return `
            <div class="app-access-item">
              <h6>${app.name} (${app.code})</h6>
              <div class="permissions">
                <div class="form-check form-check-inline">
                  <input class="form-check-input" type="checkbox" name="appAccess[${app._id}][view]" 
                         id="edit-${app._id}-view" ${permissions.view ? 'checked' : ''}>
                  <label class="form-check-label" for="edit-${app._id}-view">View</label>
                </div>
                <div class="form-check form-check-inline">
                  <input class="form-check-input" type="checkbox" name="appAccess[${app._id}][edit]" 
                         id="edit-${app._id}-edit" ${permissions.edit ? 'checked' : ''}>
                  <label class="form-check-label" for="edit-${app._id}-edit">Edit</label>
                </div>
                <div class="form-check form-check-inline">
                  <input class="form-check-input" type="checkbox" name="appAccess[${app._id}][admin]" 
                         id="edit-${app._id}-admin" ${permissions.admin ? 'checked' : ''}>
                  <label class="form-check-label" for="edit-${app._id}-admin">Admin</label>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (error) {
      console.error('Failed to load app options for edit user:', error);
    }
  }

  async deleteUser(userId) {
    const user = this.currentUsers.find(u => u._id === userId);
    if (!user) return;

    const confirmed = await window.utils.confirm(
      'Delete User',
      `Are you sure you want to delete "${user.firstName} ${user.lastName}"? This action cannot be undone.`,
      'Delete',
      'danger'
    );

    if (!confirmed) return;

    try {
      await window.api.deleteUser(userId);
      window.utils.toast.success('User deleted successfully!');
      this.loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  }

  async resetUserPassword(userId) {
    const user = this.currentUsers.find(u => u._id === userId);
    if (!user) return;

    const modal = document.getElementById('resetPasswordModal');
    if (modal) {
      const resetPasswordForm = document.getElementById('resetPasswordForm');
      resetPasswordForm.dataset.userId = userId;
      
      // Set user name in modal
      const userNameElement = modal.querySelector('.user-name');
      if (userNameElement) {
        userNameElement.textContent = `${user.firstName} ${user.lastName}`;
      }
      
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  async toggleUserStatus(userId) {
    const user = this.currentUsers.find(u => u._id === userId);
    if (!user) return;

    const action = user.isActive ? 'deactivate' : 'activate';
    const confirmed = await window.utils.confirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} "${user.firstName} ${user.lastName}"?`,
      action.charAt(0).toUpperCase() + action.slice(1),
      user.isActive ? 'warning' : 'success'
    );

    if (!confirmed) return;

    try {
      await window.api.updateUser(userId, { isActive: !user.isActive });
      window.utils.toast.success(`User ${action}d successfully!`);
      this.loadUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  }

  canEditUser(user) {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return false;

    // Can't edit yourself
    if (user._id === currentUser._id) return false;

    // Super admin can edit all users except other super admins
    if (currentUser.role === 'super_admin') {
      return user.role !== 'super_admin' || currentUser._id === user._id;
    }

    // Admin can edit non-admin users
    if (currentUser.role === 'admin') {
      return !['super_admin', 'admin'].includes(user.role);
    }

    // App admin can edit users in their apps
    if (currentUser.appAccess) {
      const adminApps = currentUser.appAccess
        .filter(access => access.permissions.admin)
        .map(access => access.appId);
      
      return user.appAccess && user.appAccess.some(access => 
        adminApps.includes(access.appId)
      );
    }

    return false;
  }

  canDeleteUser(user) {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return false;

    // Can't delete yourself
    if (user._id === currentUser._id) return false;

    // Can't delete super admin
    if (user.role === 'super_admin') return false;

    // Super admin can delete all users except super admins
    if (currentUser.role === 'super_admin') return true;

    // Admin can delete non-admin users
    if (currentUser.role === 'admin') {
      return !['super_admin', 'admin'].includes(user.role);
    }

    return false;
  }

  canResetPassword(user) {
    const currentUser = window.auth.getCurrentUser();
    if (!currentUser) return false;

    // Super admin can reset all passwords except other super admins
    if (currentUser.role === 'super_admin') {
      return user.role !== 'super_admin' || currentUser._id === user._id;
    }

    // Admin can reset non-admin passwords
    if (currentUser.role === 'admin') {
      return !['super_admin', 'admin'].includes(user.role);
    }

    return false;
  }

  canToggleStatus(user) {
    return this.canEditUser(user);
  }
}

// Create global users manager instance
const usersManager = new UsersManager();

// Export users manager
window.users = usersManager;

// Helper functions for user operations
window.createUser = (userData) => {
  return window.api.createUser(userData);
};

window.getUser = (userId) => {
  return window.api.getUser(userId);
};

window.updateUser = (userId, userData) => {
  return window.api.updateUser(userId, userData);
};

window.deleteUser = (userId) => {
  return window.api.deleteUser(userId);
};