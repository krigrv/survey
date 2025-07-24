// API Client Module

class APIClient {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
  }

  // HTTP request wrapper
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Handle FormData
    if (config.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      // Handle HTTP errors
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
    return this.get('/dashboard/activity', params);
  }

  async getMyForms(params = {}) {
    return this.get('/dashboard/forms', params);
  }

  async getAnalyticsSummary(params = {}) {
    return this.get('/dashboard/analytics', params);
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
  // Authentication removed - all pages are now public
  console.log('API client initialized for public access');
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