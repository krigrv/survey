// Authentication Module

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.loginForm = null;
    this.setupForm = null;
    this.profileForm = null;
    this.passwordForm = null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.initializeForms();
      this.setupEventListeners();
      this.checkAuthStatus();
    });
  }

  initializeForms() {
    this.loginForm = document.getElementById('loginForm');
    this.setupForm = document.getElementById('setupForm');
    this.profileForm = document.getElementById('profileForm');
    this.passwordForm = document.getElementById('passwordForm');

    // Setup form handlers
    if (this.loginForm) {
      this.setupLoginForm();
    }

    if (this.setupForm) {
      this.setupSuperAdminForm();
    }

    if (this.profileForm) {
      this.setupProfileForm();
    }

    if (this.passwordForm) {
      this.setupPasswordForm();
    }
  }

  setupEventListeners() {
    // Logout button
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-action="logout"]')) {
        e.preventDefault();
        this.logout();
      }
    });

    // Profile dropdown toggle
    const profileDropdown = document.querySelector('.profile-dropdown');
    if (profileDropdown) {
      profileDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        profileDropdown.classList.remove('show');
      });
    }
  }

  async checkAuthStatus() {
    const token = window.api.getToken();
    const isAuthPage = this.isAuthPage();

    // Skip auth checks for login page to prevent refresh loops
    if (isAuthPage && window.location.pathname.includes('login')) {
      return;
    }

    if (!token && !isAuthPage) {
      this.redirectToLogin();
      return;
    }

    if (token && !isAuthPage) {
      try {
        await this.loadCurrentUser();
        this.updateUI();
      } catch (error) {
        console.error('Failed to load user:', error);
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('login')) {
          this.redirectToLogin();
        }
      }
    }
  }

  async checkSetupRequired() {
    // Setup check disabled to prevent refresh loops
    // Users can access login page directly
    return;
  }

  isAuthPage() {
    const authPages = ['login.html', 'setup.html', 'register.html'];
    return authPages.some(page => window.location.pathname.includes(page));
  }

  async loadCurrentUser() {
    try {
      const response = await window.api.getCurrentUser();
      this.currentUser = response.user;
      return this.currentUser;
    } catch (error) {
      this.currentUser = null;
      throw error;
    }
  }

  updateUI() {
    if (!this.currentUser) return;

    // Update user info in navigation
    const userNameElement = document.querySelector('.user-name');
    const userEmailElement = document.querySelector('.user-email');
    const userAvatarElement = document.querySelector('.user-avatar');
    const userRoleElement = document.querySelector('.user-role');

    if (userNameElement) {
      userNameElement.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }

    if (userEmailElement) {
      userEmailElement.textContent = this.currentUser.email;
    }

    if (userAvatarElement) {
      if (this.currentUser.profileImage) {
        userAvatarElement.src = this.currentUser.profileImage;
      } else {
        userAvatarElement.src = this.getDefaultAvatar(this.currentUser.firstName, this.currentUser.lastName);
      }
    }

    if (userRoleElement) {
      userRoleElement.textContent = window.utils.getRoleDisplayName(this.currentUser.role);
      userRoleElement.className = `badge ${window.utils.getRoleColor(this.currentUser.role)}`;
    }

    // Update navigation based on role
    this.updateNavigation();

    // Update page title if on profile page
    if (window.location.pathname.includes('profile')) {
      document.title = `Profile - ${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
  }

  updateNavigation() {
    if (!this.currentUser) return;

    const navItems = document.querySelectorAll('[data-role-required]');
    navItems.forEach(item => {
      const requiredRoles = item.dataset.roleRequired.split(',');
      const hasAccess = this.hasRole(requiredRoles);
      item.style.display = hasAccess ? '' : 'none';
    });

    // Update app-specific navigation
    const appNavItems = document.querySelectorAll('[data-app-required]');
    appNavItems.forEach(item => {
      const requiredApp = item.dataset.appRequired;
      const hasAccess = this.hasAppAccess(requiredApp);
      item.style.display = hasAccess ? '' : 'none';
    });
  }

  hasRole(roles) {
    if (!this.currentUser) return false;
    if (typeof roles === 'string') roles = [roles];
    return roles.includes(this.currentUser.role);
  }

  hasAppAccess(appCode, permission = 'view') {
    if (!this.currentUser || !this.currentUser.appAccess) return false;
    
    // Super admin and admin have access to all apps
    if (['super_admin', 'admin'].includes(this.currentUser.role)) {
      return true;
    }

    const appAccess = this.currentUser.appAccess.find(access => access.appCode === appCode);
    if (!appAccess) return false;

    switch (permission) {
      case 'view':
        return appAccess.permissions.view;
      case 'edit':
        return appAccess.permissions.edit;
      case 'admin':
        return appAccess.permissions.admin;
      default:
        return false;
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

  setupLoginForm() {
    this.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(this.loginForm);
      
      try {
        await window.handleFormSubmit(
          this.loginForm,
          () => window.api.login(formData),
          {
            onSuccess: (response) => {
              window.utils.toast.success('Login successful!');
              // Redirect to dashboard or intended page
              const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard.html';
              window.location.href = redirectUrl;
            },
            resetForm: false,
            showSuccessToast: false
          }
        );
      } catch (error) {
        // Error handling is done by the API interceptor
      }
    });

    // Show/hide password toggle
    const passwordToggle = this.loginForm.querySelector('.password-toggle');
    if (passwordToggle) {
      passwordToggle.addEventListener('click', () => {
        const passwordInput = this.loginForm.querySelector('input[name="password"]');
        const icon = passwordToggle.querySelector('i');
        
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          icon.className = 'fas fa-eye-slash';
        } else {
          passwordInput.type = 'password';
          icon.className = 'fas fa-eye';
        };
      });
    }

    // Quick Login (Bypass) button
    const quickLoginBtn = document.getElementById('quickLoginBtn');
    if (quickLoginBtn) {
      quickLoginBtn.addEventListener('click', async () => {
        try {
          const response = await fetch('/api/auth/bypass-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            window.utils.toast.success('Quick login successful!');
            
            // Redirect to dashboard
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard.html';
            window.location.href = redirectUrl;
          } else {
            const error = await response.json();
            window.utils.toast.error(error.message || 'Quick login failed');
          }
        } catch (error) {
          console.error('Quick login error:', error);
          window.utils.toast.error('Quick login failed');
        }
      });
    }
  }

  setupSuperAdminForm() {
    this.setupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(this.setupForm);
      
      // Validate password confirmation
      if (formData.password !== formData.confirmPassword) {
        window.utils.showFieldError(
          this.setupForm.querySelector('input[name="confirmPassword"]'),
          'Passwords do not match'
        );
        return;
      }
      
      try {
        await window.handleFormSubmit(
          this.setupForm,
          () => window.api.setupSuperAdmin(formData),
          {
            onSuccess: (response) => {
              window.utils.toast.success('Super admin setup completed successfully!');
              setTimeout(() => {
                window.location.href = '/login.html';
              }, 1500);
            },
            resetForm: false,
            showSuccessToast: false
          }
        );
      } catch (error) {
        // Error handling is done by the API interceptor
      }
    });

    // Password strength indicator
    const passwordInput = this.setupForm.querySelector('input[name="password"]');
    const strengthIndicator = this.setupForm.querySelector('.password-strength');
    
    if (passwordInput && strengthIndicator) {
      passwordInput.addEventListener('input', () => {
        const strength = this.calculatePasswordStrength(passwordInput.value);
        this.updatePasswordStrength(strengthIndicator, strength);
      });
    }
  }

  setupProfileForm() {
    this.profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(this.profileForm);
      
      try {
        await window.handleFormSubmit(
          this.profileForm,
          () => window.api.updateProfile(formData),
          {
            onSuccess: (response) => {
              this.currentUser = { ...this.currentUser, ...response.user };
              this.updateUI();
            },
            resetForm: false,
            successMessage: 'Profile updated successfully!'
          }
        );
      } catch (error) {
        // Error handling is done by the API interceptor
      }
    });

    // Profile image upload
    const imageInput = this.profileForm.querySelector('input[name="profileImage"]');
    const imagePreview = this.profileForm.querySelector('.image-preview');
    
    if (imageInput && imagePreview) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            imagePreview.src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Load current user data into form
    this.loadProfileData();
  }

  setupPasswordForm() {
    this.passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = window.utils.serializeForm(this.passwordForm);
      
      // Validate password confirmation
      if (formData.newPassword !== formData.confirmPassword) {
        window.utils.showFieldError(
          this.passwordForm.querySelector('input[name="confirmPassword"]'),
          'Passwords do not match'
        );
        return;
      }
      
      try {
        await window.handleFormSubmit(
          this.passwordForm,
          () => window.api.changePassword(formData),
          {
            onSuccess: () => {
              // Clear form after successful password change
              this.passwordForm.reset();
            },
            successMessage: 'Password changed successfully!'
          }
        );
      } catch (error) {
        // Error handling is done by the API interceptor
      }
    });

    // Password strength for new password
    const newPasswordInput = this.passwordForm.querySelector('input[name="newPassword"]');
    const strengthIndicator = this.passwordForm.querySelector('.password-strength');
    
    if (newPasswordInput && strengthIndicator) {
      newPasswordInput.addEventListener('input', () => {
        const strength = this.calculatePasswordStrength(newPasswordInput.value);
        this.updatePasswordStrength(strengthIndicator, strength);
      });
    }
  }

  async loadProfileData() {
    if (!this.currentUser || !this.profileForm) return;

    // Fill form with current user data
    const fields = {
      firstName: this.currentUser.firstName,
      lastName: this.currentUser.lastName,
      email: this.currentUser.email
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = this.profileForm.querySelector(`input[name="${name}"]`);
      if (input) {
        input.value = value || '';
      }
    });

    // Set profile image preview
    const imagePreview = this.profileForm.querySelector('.image-preview');
    if (imagePreview) {
      if (this.currentUser.profileImage) {
        imagePreview.src = this.currentUser.profileImage;
      } else {
        imagePreview.src = this.getDefaultAvatar(this.currentUser.firstName, this.currentUser.lastName);
      }
    }

    // Display user info
    const userInfoElements = {
      '.user-id': this.currentUser._id,
      '.user-role-display': window.utils.getRoleDisplayName(this.currentUser.role),
      '.user-created': window.utils.formatDate(this.currentUser.createdAt),
      '.user-last-login': this.currentUser.lastLogin ? window.utils.formatDate(this.currentUser.lastLogin) : 'Never'
    };

    Object.entries(userInfoElements).forEach(([selector, value]) => {
      const element = document.querySelector(selector);
      if (element) {
        element.textContent = value;
      }
    });

    // Display app access
    this.displayAppAccess();
  }

  displayAppAccess() {
    const appAccessContainer = document.querySelector('.app-access-list');
    if (!appAccessContainer || !this.currentUser.appAccess) return;

    appAccessContainer.innerHTML = '';

    if (this.currentUser.appAccess.length === 0) {
      appAccessContainer.innerHTML = '<p class="text-muted">No app access assigned</p>';
      return;
    }

    this.currentUser.appAccess.forEach(access => {
      const accessItem = document.createElement('div');
      accessItem.className = 'app-access-item';
      
      const permissions = [];
      if (access.permissions.admin) permissions.push('Admin');
      else if (access.permissions.edit) permissions.push('Edit');
      else if (access.permissions.view) permissions.push('View');
      
      accessItem.innerHTML = `
        <div class="app-info">
          <strong>${access.appName}</strong>
          <span class="app-code">${access.appCode}</span>
        </div>
        <div class="permissions">
          ${permissions.map(p => `<span class="badge badge-primary">${p}</span>`).join('')}
        </div>
      `;
      
      appAccessContainer.appendChild(accessItem);
    });
  }

  calculatePasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    return Math.min(score, 5);
  }

  updatePasswordStrength(indicator, strength) {
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#28a745'];
    
    indicator.textContent = levels[strength - 1] || '';
    indicator.style.color = colors[strength - 1] || '#6c757d';
    
    // Update progress bar if exists
    const progressBar = indicator.parentElement.querySelector('.strength-bar');
    if (progressBar) {
      progressBar.style.width = `${(strength / 5) * 100}%`;
      progressBar.style.backgroundColor = colors[strength - 1] || '#6c757d';
    }
  }

  async logout() {
    try {
      // Clear token and user data
      window.api.setToken(null);
      this.currentUser = null;
      
      // Clear any cached data
      localStorage.clear();
      
      // Show success message
      window.utils.toast.success('Logged out successfully');
      
      // Redirect to login page
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/login.html';
    }
  }

  redirectToLogin() {
    const currentPath = window.location.pathname;
    if (!this.isAuthPage()) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(currentPath)}`;
    }
  }

  // Utility methods for other modules
  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser && !!window.api.getToken();
  }

  isSuperAdmin() {
    return this.currentUser && this.currentUser.role === 'super_admin';
  }

  isAdmin() {
    return this.currentUser && ['super_admin', 'admin'].includes(this.currentUser.role);
  }

  canManageUsers() {
    return this.isAdmin() || (this.currentUser && this.currentUser.appAccess.some(access => access.permissions.admin));
  }

  canAccessApp(appCode) {
    return this.hasAppAccess(appCode, 'view');
  }

  canEditApp(appCode) {
    return this.hasAppAccess(appCode, 'edit');
  }

  canAdminApp(appCode) {
    return this.hasAppAccess(appCode, 'admin');
  }

  // Initialize method required by main.js
  async initialize() {
    // Auth manager is already initialized in constructor
    // This method exists to satisfy the main.js requirement
    return Promise.resolve();
  }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Export auth manager
window.auth = authManager;

// Helper function to check authentication before API calls
window.requireAuth = (callback) => {
  if (!authManager.isAuthenticated()) {
    authManager.redirectToLogin();
    return false;
  }
  
  if (typeof callback === 'function') {
    callback();
  }
  
  return true;
};

// Helper function to check role permissions
window.requireRole = (roles, callback) => {
  if (!authManager.isAuthenticated()) {
    authManager.redirectToLogin();
    return false;
  }
  
  if (!authManager.hasRole(roles)) {
    window.utils.toast.error('You do not have permission to access this feature');
    return false;
  }
  
  if (typeof callback === 'function') {
    callback();
  }
  
  return true;
};

// Helper function to check app permissions
window.requireAppAccess = (appCode, permission = 'view', callback) => {
  if (!authManager.isAuthenticated()) {
    authManager.redirectToLogin();
    return false;
  }
  
  if (!authManager.hasAppAccess(appCode, permission)) {
    window.utils.toast.error('You do not have permission to access this application');
    return false;
  }
  
  if (typeof callback === 'function') {
    callback();
  }
  
  return true;
};

// Auto-refresh token before expiry
setInterval(async () => {
  if (authManager.isAuthenticated() && !authManager.isAuthPage()) {
    try {
      await window.api.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      authManager.logout();
    }
  }
}, 15 * 60 * 1000); // Refresh every 15 minutes