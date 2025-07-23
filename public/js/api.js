// API Client Module

class APIClient {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.token = this.getToken();
    this.refreshPromise = null;
  }

  // Token management
  getToken() {
    return localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // HTTP request wrapper
  async request(endpoint, options = {}) {
    // Handle dummy token for demo mode
    if (this.token && this.token.startsWith('dummy-jwt-token-')) {
      return this.handleDummyRequest(endpoint, options);
    }
    
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authorization header if token exists
    if (this.token && !config.skipAuth) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    // Handle FormData
    if (config.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized
      if (response.status === 401 && !config.skipAuth && !endpoint.includes('/auth/')) {
        return this.handleUnauthorized(endpoint, options);
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new APIError(errorData.message || 'Request failed', response.status, errorData);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Network or other errors
      console.error('API request failed:', error);
      throw new APIError('Network error. Please check your connection.', 0, error);
    }
  }

  // Handle dummy requests for demo mode
  async handleDummyRequest(endpoint, options = {}) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock responses for different endpoints
    if (endpoint.includes('/dashboard/overview')) {
      return {
        totalForms: 5,
        totalResponses: 42,
        activeUsers: 3,
        recentActivity: []
      };
    }
    
    if (endpoint.includes('/auth/me') || endpoint.includes('/users/me')) {
      return JSON.parse(localStorage.getItem('user') || '{}');
    }
    
    if (endpoint.includes('/forms')) {
      return {
        forms: [],
        total: 0,
        page: 1,
        limit: 10
      };
    }
    
    if (endpoint.includes('/users')) {
      return {
        users: [],
        total: 0,
        page: 1,
        limit: 10
      };
    }
    
    // Default success response
    return { success: true, message: 'Demo mode - operation simulated' };
  }

  // Handle unauthorized responses
  async handleUnauthorized(originalEndpoint, originalOptions) {
    // If already refreshing, wait for it
    if (this.refreshPromise) {
      try {
        await this.refreshPromise;
        return this.request(originalEndpoint, originalOptions);
      } catch (error) {
        this.logout();
        throw new APIError('Session expired. Please login again.', 401);
      }
    }

    // Try to refresh token
    this.refreshPromise = this.refreshToken();
    
    try {
      await this.refreshPromise;
      this.refreshPromise = null;
      return this.request(originalEndpoint, originalOptions);
    } catch (error) {
      this.refreshPromise = null;
      this.logout();
      throw new APIError('Session expired. Please login again.', 401);
    }
  }

  // Refresh authentication token
  async refreshToken() {
    try {
      const response = await this.request('/auth/refresh-token', {
        method: 'POST',
        skipAuth: false
      });
      
      if (response.token) {
        this.setToken(response.token);
        return response;
      }
      
      throw new Error('No token in refresh response');
    } catch (error) {
      this.setToken(null);
      throw error;
    }
  }

  // Logout and clear token
  logout() {
    this.setToken(null);
    window.location.href = '/login.html';
  }

  // HTTP method helpers
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Authentication endpoints
  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async setupSuperAdmin(setupData) {
    return this.request('/auth/setup-super-admin', {
      method: 'POST',
      body: JSON.stringify(setupData),
      skipAuth: true
    });
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async updateProfile(profileData) {
    return this.put('/auth/profile', profileData);
  }

  async changePassword(passwordData) {
    return this.put('/auth/change-password', passwordData);
  }

  // User management endpoints
  async getUsers(params = {}) {
    return this.get('/users', params);
  }

  async getUser(userId) {
    return this.get(`/users/${userId}`);
  }

  async createUser(userData) {
    return this.post('/users', userData);
  }

  async updateUser(userId, userData) {
    return this.put(`/users/${userId}`, userData);
  }

  async deleteUser(userId) {
    return this.delete(`/users/${userId}`);
  }

  async resetUserPassword(userId, passwordData) {
    return this.put(`/users/${userId}/reset-password`, passwordData);
  }

  async getUserStats() {
    return this.get('/users/stats/overview');
  }

  // Application endpoints
  async getApps(params = {}) {
    return this.get('/apps', params);
  }

  async getApp(appId) {
    return this.get(`/apps/${appId}`);
  }

  async createApp(appData) {
    return this.post('/apps', appData);
  }

  async updateApp(appId, appData) {
    return this.put(`/apps/${appId}`, appData);
  }

  async deleteApp(appId) {
    return this.delete(`/apps/${appId}`);
  }

  async getAppUsers(appId, params = {}) {
    return this.get(`/apps/${appId}/users`, params);
  }

  async addAppUser(appId, userData) {
    return this.post(`/apps/${appId}/users`, userData);
  }

  async removeAppUser(appId, userId) {
    return this.delete(`/apps/${appId}/users/${userId}`);
  }

  async getAppAnalytics(appId) {
    return this.get(`/apps/${appId}/analytics`);
  }

  // Form endpoints
  async getForms(params = {}) {
    return this.get('/forms', params);
  }

  async getForm(formId) {
    return this.get(`/forms/${formId}`);
  }

  async createForm(formData) {
    return this.post('/forms', formData);
  }

  async updateForm(formId, formData) {
    return this.put(`/forms/${formId}`, formData);
  }

  async deleteForm(formId) {
    return this.delete(`/forms/${formId}`);
  }

  async duplicateForm(formId) {
    return this.post(`/forms/${formId}/duplicate`);
  }

  async getPublicForm(shareableLink) {
    return this.request(`/forms/public/${shareableLink}`, {
      method: 'GET',
      skipAuth: true
    });
  }

  async getFormResponses(formId, params = {}) {
    return this.get(`/forms/${formId}/responses`, params);
  }

  async getFormAnalytics(formId) {
    return this.get(`/forms/${formId}/analytics`);
  }

  // Response endpoints
  async submitResponse(formId, responseData) {
    return this.post(`/responses/${formId}`, responseData);
  }

  async getResponse(responseId) {
    return this.get(`/responses/${responseId}`);
  }

  async updateResponse(responseId, responseData) {
    return this.put(`/responses/${responseId}`, responseData);
  }

  async deleteResponse(responseId) {
    return this.delete(`/responses/${responseId}`);
  }

  async exportResponses(formId, format = 'csv') {
    return this.get(`/responses/export/${formId}`, { format });
  }

  // Dashboard endpoints
  async getDashboardOverview() {
    return this.get('/dashboard/overview');
  }

  async getDashboardStats(params = {}) {
    return this.get('/dashboard/stats', params);
  }

  async getRecentActivity(params = {}) {
    return this.get('/dashboard/recent-activity', params);
  }

  async getMyForms(params = {}) {
    return this.get('/dashboard/my-forms', params);
  }

  async getAnalyticsSummary(params = {}) {
    return this.get('/dashboard/analytics-summary', params);
  }

  // File upload endpoints
  async uploadFile(file, type = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return this.post('/upload', formData);
  }

  async uploadProfileImage(file) {
    return this.uploadFile(file, 'profile');
  }

  async uploadFormFile(file) {
    return this.uploadFile(file, 'form');
  }
}

// Custom API Error class
class APIError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }

  get isNetworkError() {
    return this.status === 0;
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError() {
    return this.status >= 500;
  }

  get isValidationError() {
    return this.status === 400 && this.data && this.data.errors;
  }

  getValidationErrors() {
    if (this.isValidationError) {
      return this.data.errors;
    }
    return [];
  }
}

// Request interceptor for loading states
class LoadingInterceptor {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.activeRequests = new Set();
    this.setupInterceptors();
  }

  setupInterceptors() {
    const originalRequest = this.apiClient.request.bind(this.apiClient);
    
    this.apiClient.request = async (endpoint, options = {}) => {
      const requestId = `${options.method || 'GET'}-${endpoint}-${Date.now()}`;
      
      // Show loading for non-background requests
      if (!options.background) {
        this.activeRequests.add(requestId);
        if (window.utils && window.utils.loading) {
          window.utils.loading.show();
        }
      }

      try {
        const result = await originalRequest(endpoint, options);
        return result;
      } finally {
        this.activeRequests.delete(requestId);
        if (!options.background && window.utils && window.utils.loading) {
          window.utils.loading.hide();
        }
      }
    };
  }
}

// Error interceptor for global error handling
class ErrorInterceptor {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.setupInterceptors();
  }

  setupInterceptors() {
    const originalRequest = this.apiClient.request.bind(this.apiClient);
    
    this.apiClient.request = async (endpoint, options = {}) => {
      try {
        return await originalRequest(endpoint, options);
      } catch (error) {
        // Don't show toast for silent requests
        if (!options.silent && window.utils && window.utils.toast) {
          if (error instanceof APIError) {
            if (error.isValidationError) {
              // Handle validation errors differently
              const errors = error.getValidationErrors();
              if (errors.length > 0) {
                window.utils.toast.error(errors[0].msg || 'Validation error');
              }
            } else if (error.status !== 401) {
              // Don't show toast for 401 errors (handled by auth interceptor)
              window.utils.toast.error(error.message);
            }
          } else {
            window.utils.toast.error('An unexpected error occurred');
          }
        }
        
        throw error;
      }
    };
  }
}

// Create global API client instance
const api = new APIClient();

// Setup interceptors
new LoadingInterceptor(api);
new ErrorInterceptor(api);

// Export API client and error class
window.api = api;
window.APIError = APIError;

// Helper function to handle API responses with loading and error states
window.handleApiCall = async (apiCall, options = {}) => {
  const {
    onSuccess = () => {},
    onError = () => {},
    showSuccessToast = false,
    successMessage = 'Operation completed successfully',
    silent = false
  } = options;

  try {
    const result = await apiCall();
    
    if (showSuccessToast && window.utils && window.utils.toast) {
      window.utils.toast.success(successMessage);
    }
    
    onSuccess(result);
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    onError(error);
    
    if (!silent) {
      throw error;
    }
  }
};

// Helper function to handle form submissions
window.handleFormSubmit = async (form, apiCall, options = {}) => {
  const {
    onSuccess = () => {},
    onError = () => {},
    resetForm = true,
    showSuccessToast = true,
    successMessage = 'Form submitted successfully'
  } = options;

  // Clear previous errors
  if (window.utils && window.utils.clearFormErrors) {
    window.utils.clearFormErrors(form);
  }

  try {
    const result = await apiCall();
    
    if (showSuccessToast && window.utils && window.utils.toast) {
      window.utils.toast.success(successMessage);
    }
    
    if (resetForm) {
      form.reset();
    }
    
    onSuccess(result);
    return result;
  } catch (error) {
    console.error('Form submission failed:', error);
    
    // Handle validation errors
    if (error instanceof APIError && error.isValidationError) {
      const validationErrors = error.getValidationErrors();
      validationErrors.forEach(err => {
        const field = form.querySelector(`[name="${err.param}"]`);
        if (field && window.utils && window.utils.showFieldError) {
          window.utils.showFieldError(field, err.msg);
        }
      });
    }
    
    onError(error);
    throw error;
  }
};

// Initialize API client when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated on protected pages
  const isAuthPage = window.location.pathname.includes('login') || 
                    window.location.pathname.includes('setup');
  
  if (!isAuthPage && !api.getToken()) {
    window.location.href = '/login.html';
  }
});

// Handle network status changes
window.addEventListener('online', () => {
  if (window.utils && window.utils.toast) {
    window.utils.toast.success('Connection restored');
  }
});

window.addEventListener('offline', () => {
  if (window.utils && window.utils.toast) {
    window.utils.toast.warning('Connection lost. Some features may not work.');
  }
});