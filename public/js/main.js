// Main Application Module

class App {
  constructor() {
    this.currentPage = null;
    this.isInitialized = false;
    this.modules = {};
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.initializeApp();
    });
  }

  async initializeApp() {
    try {
      // Show loading
      window.utils.loading.show();
      
      // Determine current page
      this.currentPage = this.getCurrentPage();
      
      // Initialize page-specific modules
      await this.initializePageModules();
      
      // Initialize global features
      this.initializeGlobalFeatures();
      
      // Mark as initialized
      this.isInitialized = true;
      
      // Hide loading
      window.utils.loading.hide();
      
      console.log('Application initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      window.utils.loading.hide();
      this.showInitializationError(error);
    }
  }

  // Authentication removed

  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    // Map filenames to page identifiers
    const pageMap = {
      'index.html': 'dashboard',
      'dashboard.html': 'dashboard',
      'forms.html': 'forms',
      'form-builder.html': 'form-builder',
      'form-preview.html': 'form-preview',
      'form-responses.html': 'form-responses',
      'users.html': 'users',
      'user-profile.html': 'user-profile',
      'apps.html': 'apps',
      'applications.html': 'apps',
      'app-details.html': 'app-details',
      'app-users.html': 'app-users',
      'app-analytics.html': 'app-analytics',
      'login.html': 'login',
      'setup.html': 'setup',
      'profile.html': 'profile',
      'settings.html': 'settings'
    };
    
    return pageMap[filename] || 'unknown';
  }

  async initializePageModules() {
    switch (this.currentPage) {
      case 'dashboard':
        await this.initializeDashboard();
        break;
        
      case 'forms':
        await this.initializeForms();
        break;
        
      case 'form-builder':
        await this.initializeFormBuilder();
        break;
        
      case 'form-preview':
        await this.initializeFormPreview();
        break;
        
      case 'form-responses':
        await this.initializeFormResponses();
        break;
        
      case 'users':
        await this.initializeUsers();
        break;
        
      case 'user-profile':
        await this.initializeUserProfile();
        break;
        
      case 'apps':
        await this.initializeApps();
        break;
        
      case 'app-details':
        await this.initializeAppDetails();
        break;
        
      case 'app-users':
        await this.initializeAppUsers();
        break;
        
      case 'app-analytics':
        await this.initializeAppAnalytics();
        break;
        
      case 'login':
        await this.initializeLogin();
        break;
        
      case 'setup':
        await this.initializeSetup();
        break;
        
      case 'profile':
        await this.initializeProfile();
        break;
        
      case 'settings':
        await this.initializeSettings();
        break;
        
      default:
        console.warn(`Unknown page: ${this.currentPage}`);
    }
  }

  async initializeDashboard() {
    if (window.dashboard) {
      this.modules.dashboard = window.dashboard;
      console.log('Dashboard module initialized');
    }
  }

  async initializeForms() {
    if (window.forms) {
      this.modules.forms = window.forms;
      console.log('Forms module initialized');
    }
  }

  async initializeFormBuilder() {
    // Form builder will be implemented later
    console.log('Form builder module not yet implemented');
  }

  async initializeFormPreview() {
    // Form preview will be implemented later
    console.log('Form preview module not yet implemented');
  }

  async initializeFormResponses() {
    // Form responses will be implemented later
    console.log('Form responses module not yet implemented');
  }

  async initializeUsers() {
    if (window.users) {
      this.modules.users = window.users;
      console.log('Users module initialized');
    }
  }

  async initializeUserProfile() {
    // User profile will be implemented later
    console.log('User profile module not yet implemented');
  }

  async initializeApps() {
    if (window.apps) {
      this.modules.apps = window.apps;
      console.log('Apps module initialized');
    }
  }

  async initializeAppDetails() {
    // App details will be implemented later
    console.log('App details module not yet implemented');
  }

  async initializeAppUsers() {
    // App users will be implemented later
    console.log('App users module not yet implemented');
  }

  async initializeAppAnalytics() {
    // App analytics will be implemented later
    console.log('App analytics module not yet implemented');
  }

  // Authentication-related pages removed

  async initializeSettings() {
    // Settings will be implemented later
    console.log('Settings module not yet implemented');
  }

  initializeGlobalFeatures() {
    // Initialize global navigation
    this.initializeNavigation();
    
    // Initialize global search
    this.initializeGlobalSearch();
    
    // Initialize keyboard shortcuts
    this.initializeKeyboardShortcuts();
    
    // Initialize theme management
    this.initializeThemeManagement();
    
    // Initialize auto-save functionality
    this.initializeAutoSave();
    
    // Initialize notification system
    this.initializeNotifications();
    
    // Initialize performance monitoring
    this.initializePerformanceMonitoring();
  }

  initializeNavigation() {
    // Handle navigation active states
    this.updateNavigationActiveState();
    
    // Handle mobile navigation toggle
    this.initializeMobileNavigation();
    
    // Handle breadcrumbs
    this.initializeBreadcrumbs();
  }

  updateNavigationActiveState() {
    const navLinks = document.querySelectorAll('.nav-link[href]');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && currentPath.includes(href.replace('.html', ''))) {
        link.classList.add('active');
        
        // Also mark parent nav items as active
        const parentNavItem = link.closest('.nav-item');
        if (parentNavItem) {
          parentNavItem.classList.add('active');
        }
      } else {
        link.classList.remove('active');
      }
    });
  }

  initializeMobileNavigation() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
      // Close mobile nav when clicking outside
      document.addEventListener('click', (e) => {
        if (!navbarToggler.contains(e.target) && !navbarCollapse.contains(e.target)) {
          const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
          if (bsCollapse && navbarCollapse.classList.contains('show')) {
            bsCollapse.hide();
          }
        }
      });
      
      // Close mobile nav when clicking on nav links
      navbarCollapse.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-link')) {
          const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
          if (bsCollapse) {
            bsCollapse.hide();
          }
        }
      });
    }
  }

  initializeBreadcrumbs() {
    const breadcrumbContainer = document.getElementById('breadcrumbs');
    if (!breadcrumbContainer) return;
    
    const breadcrumbs = this.generateBreadcrumbs();
    if (breadcrumbs.length > 0) {
      breadcrumbContainer.innerHTML = this.renderBreadcrumbs(breadcrumbs);
    }
  }

  generateBreadcrumbs() {
    const breadcrumbs = [{ name: 'Dashboard', url: '/dashboard.html' }];
    
    switch (this.currentPage) {
      case 'forms':
        breadcrumbs.push({ name: 'Forms', url: '/forms.html' });
        break;
        
      case 'form-builder':
        breadcrumbs.push({ name: 'Forms', url: '/forms.html' });
        breadcrumbs.push({ name: 'Form Builder', url: null });
        break;
        
      case 'users':
        breadcrumbs.push({ name: 'Users', url: '/users.html' });
        break;
        
      case 'apps':
        breadcrumbs.push({ name: 'Applications', url: '/apps.html' });
        break;
        
      case 'profile':
        breadcrumbs.push({ name: 'Profile', url: '/profile.html' });
        break;
        
      case 'settings':
        breadcrumbs.push({ name: 'Settings', url: '/settings.html' });
        break;
    }
    
    return breadcrumbs;
  }

  renderBreadcrumbs(breadcrumbs) {
    return `
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          ${breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return `
              <li class="breadcrumb-item ${isLast ? 'active' : ''}">
                ${isLast || !crumb.url ? 
                  crumb.name : 
                  `<a href="${crumb.url}">${crumb.name}</a>`
                }
              </li>
            `;
          }).join('')}
        </ol>
      </nav>
    `;
  }

  initializeGlobalSearch() {
    const globalSearchInput = document.getElementById('globalSearch');
    if (!globalSearchInput) return;
    
    globalSearchInput.addEventListener('input', window.utils.debounce((e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        this.performGlobalSearch(query);
      } else {
        this.hideGlobalSearchResults();
      }
    }, 300));
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!globalSearchInput.contains(e.target)) {
        this.hideGlobalSearchResults();
      }
    });
  }

  async performGlobalSearch(query) {
    try {
      // This would search across forms, users, apps, etc.
      // For now, we'll just show a placeholder
      console.log('Global search:', query);
      
      // TODO: Implement actual global search
      // const results = await window.api.globalSearch(query);
      // this.showGlobalSearchResults(results);
      
    } catch (error) {
      console.error('Global search failed:', error);
    }
  }

  showGlobalSearchResults(results) {
    // TODO: Implement search results display
    console.log('Search results:', results);
  }

  hideGlobalSearchResults() {
    const resultsContainer = document.getElementById('globalSearchResults');
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }
  }

  initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Ctrl/Cmd + N for new form (on forms page)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && this.currentPage === 'forms') {
        e.preventDefault();
        const createButton = document.querySelector('[data-action="create-form"]');
        if (createButton) {
          createButton.click();
        }
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) {
            bsModal.hide();
          }
        });
      }
    });
  }

  initializeThemeManagement() {
    // Load saved theme
    const savedTheme = window.utils.storage.get('theme') || 'light';
    this.setTheme(savedTheme);
    
    // Theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
      });
    }
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    window.utils.storage.set('theme', theme);
    
    // Update theme toggle icon
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('i');
      if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
      }
    }
  }

  initializeAutoSave() {
    // Auto-save functionality for forms and other data
    this.autoSaveInterval = setInterval(() => {
      this.performAutoSave();
    }, 30000); // Auto-save every 30 seconds
  }

  performAutoSave() {
    // Check if there are any unsaved changes
    const forms = document.querySelectorAll('form[data-auto-save]');
    forms.forEach(form => {
      if (form.dataset.hasChanges === 'true') {
        this.saveFormData(form);
      }
    });
  }

  saveFormData(form) {
    const formId = form.id;
    const formData = window.utils.serializeForm(form);
    
    // Save to localStorage as backup
    window.utils.storage.set(`autosave_${formId}`, {
      data: formData,
      timestamp: Date.now()
    });
    
    console.log(`Auto-saved form: ${formId}`);
  }

  initializeNotifications() {
    // Check for browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't request permission automatically, let user decide
    }
    
    // Initialize service worker for push notifications (if needed)
    if ('serviceWorker' in navigator) {
      // Register service worker for notifications
      // This would be implemented later for push notifications
    }
  }

  initializePerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
        console.log(`Page load time: ${loadTime}ms`);
        
        // Send performance data to analytics (if implemented)
        // this.sendPerformanceData(loadTime);
      }
    });
    
    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        if (memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.9) {
          console.warn('High memory usage detected');
          // Could trigger cleanup or warning
        }
      }, 60000); // Check every minute
    }
  }

  showInitializationError(error) {
    const errorContainer = document.getElementById('initializationError');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <h4 class="alert-heading">Application Error</h4>
          <p>Failed to initialize the application. Please refresh the page and try again.</p>
          <hr>
          <p class="mb-0">
            <button class="btn btn-outline-danger" onclick="location.reload()">
              <i class="fas fa-refresh"></i> Refresh Page
            </button>
          </p>
        </div>
      `;
      errorContainer.style.display = 'block';
    } else {
      // Fallback error display
      document.body.innerHTML = `
        <div class="container mt-5">
          <div class="alert alert-danger text-center" role="alert">
            <h4 class="alert-heading">Application Error</h4>
            <p>Failed to initialize the application. Please refresh the page and try again.</p>
            <button class="btn btn-outline-danger" onclick="location.reload()">
              <i class="fas fa-refresh"></i> Refresh Page
            </button>
          </div>
        </div>
      `;
    }
  }

  // Public methods for other modules to use
  getCurrentPage() {
    return this.currentPage;
  }

  getModule(name) {
    return this.modules[name];
  }

  isReady() {
    return this.isInitialized;
  }

  // Cleanup method
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Clean up other resources
    this.modules = {};
    this.isInitialized = false;
  }
}

// Create global app instance
const app = new App();

// Export app instance
window.app = app;

// Global error handlers
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  
  // Don't show error toast for every error, only critical ones
  if (e.error && e.error.message && !e.error.message.includes('Script error')) {
    window.utils.toast.error('An unexpected error occurred');
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  
  // Handle API errors gracefully
  if (e.reason && e.reason.name === 'APIError') {
    // API errors are already handled by the API client
    return;
  }
  
  window.utils.toast.error('An unexpected error occurred');
});

// Export helper functions
window.refreshPage = () => {
  window.location.reload();
};

window.navigateTo = (url) => {
  window.location.href = url;
};

window.goBack = () => {
  window.history.back();
};

window.goForward = () => {
  window.history.forward();
};

// Initialize app when DOM is ready
console.log('Main application module loaded');