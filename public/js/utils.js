// Utility Functions

// Toast notification system
class ToastManager {
  constructor() {
    this.container = document.getElementById('toastContainer');
    this.toastCount = 0;
  }

  show(message, type = 'info', duration = 5000) {
    const toastId = `toast-${++this.toastCount}`;
    const iconMap = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="${iconMap[type]} me-2"></i>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;

    this.container.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, {
      autohide: duration > 0,
      delay: duration
    });

    bsToast.show();

    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });

    return bsToast;
  }

  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 7000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 6000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }
}

// Global toast instance
const toast = new ToastManager();

// Loading spinner utilities
class LoadingManager {
  constructor() {
    this.spinner = document.getElementById('loading-spinner');
    this.loadingCount = 0;
  }

  show() {
    this.loadingCount++;
    if (this.spinner) {
      this.spinner.classList.remove('hidden');
    }
  }

  hide() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0 && this.spinner) {
      this.spinner.classList.add('hidden');
    }
  }

  forceHide() {
    this.loadingCount = 0;
    if (this.spinner) {
      this.spinner.classList.add('hidden');
    }
  }
}

const loading = new LoadingManager();

// Confirmation modal utility
class ConfirmationModal {
  constructor() {
    this.modal = document.getElementById('confirmModal');
    this.title = document.getElementById('confirmModalTitle');
    this.body = document.getElementById('confirmModalBody');
    this.confirmBtn = document.getElementById('confirmModalBtn');
    
    // Only initialize Bootstrap modal if the modal element exists
    if (this.modal && typeof bootstrap !== 'undefined') {
      this.bsModal = new bootstrap.Modal(this.modal);
    } else {
      this.bsModal = null;
    }
  }

  show(options = {}) {
    // If modal is not available, just execute the confirm action
    if (!this.bsModal) {
      const { onConfirm = () => {} } = options;
      if (confirm(options.message || 'Are you sure you want to perform this action?')) {
        onConfirm();
      }
      return;
    }

    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to perform this action?',
      confirmText = 'Confirm',
      confirmClass = 'btn-danger',
      onConfirm = () => {}
    } = options;

    this.title.textContent = title;
    this.body.textContent = message;
    this.confirmBtn.textContent = confirmText;
    this.confirmBtn.className = `btn ${confirmClass}`;

    // Remove previous event listeners
    const newConfirmBtn = this.confirmBtn.cloneNode(true);
    this.confirmBtn.parentNode.replaceChild(newConfirmBtn, this.confirmBtn);
    this.confirmBtn = newConfirmBtn;

    // Add new event listener
    this.confirmBtn.addEventListener('click', () => {
      onConfirm();
      this.bsModal.hide();
    });

    this.bsModal.show();
  }
}

const confirmModal = new ConfirmationModal();

// Date formatting utilities
const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const options = {
    short: { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    },
    long: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    },
    relative: null // Will be handled separately
  };

  if (format === 'relative') {
    return formatRelativeTime(d);
  }

  return d.toLocaleDateString('en-US', options[format] || options.short);
};

const formatRelativeTime = (date) => {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
};

// Number formatting utilities
const formatNumber = (num, options = {}) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  const {
    compact = false,
    decimals = 0,
    currency = false,
    percentage = false
  } = options;

  if (compact && num >= 1000) {
    const units = ['', 'K', 'M', 'B', 'T'];
    const unitIndex = Math.floor(Math.log10(Math.abs(num)) / 3);
    const scaledNum = num / Math.pow(1000, unitIndex);
    return scaledNum.toFixed(1) + units[unitIndex];
  }

  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  }

  if (percentage) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num / 100);
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

// String utilities
const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength - suffix.length) + suffix;
};

const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Validation utilities
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
    errors: {
      minLength: password.length < minLength,
      upperCase: !hasUpperCase,
      lowerCase: !hasLowerCase,
      numbers: !hasNumbers,
      specialChar: !hasSpecialChar
    }
  };
};

// Form utilities
const serializeForm = (form) => {
  const formData = new FormData(form);
  const data = {};
  
  for (let [key, value] of formData.entries()) {
    if (data[key]) {
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  }
  
  return data;
};

const clearFormErrors = (form) => {
  const errorElements = form.querySelectorAll('.is-invalid');
  errorElements.forEach(el => el.classList.remove('is-invalid'));
  
  const errorMessages = form.querySelectorAll('.invalid-feedback, .field-error');
  errorMessages.forEach(el => el.remove());
};

const showFieldError = (field, message) => {
  field.classList.add('is-invalid');
  
  // Remove existing error message
  const existingError = field.parentNode.querySelector('.field-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Add new error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  field.parentNode.appendChild(errorDiv);
};

// URL utilities
const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (let [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
};

const updateQueryParams = (params) => {
  const url = new URL(window.location);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      url.searchParams.set(key, params[key]);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.replaceState({}, '', url);
};

// Local storage utilities
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};

// Debounce utility
const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle utility
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Copy to clipboard utility
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy to clipboard');
    return false;
  }
};

// Download utility
const downloadFile = (data, filename, type = 'application/json') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Color utilities
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const getContrastColor = (hexColor) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

// Role and permission utilities
const getRoleDisplayName = (role) => {
  const roleNames = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    mydhl_admin: 'MyDHL+ Admin',
    mydhl_edit: 'MyDHL+ Editor',
    mydhl_view: 'MyDHL+ Viewer',
    odd_admin: 'ODD Admin',
    odd_edit: 'ODD Editor',
    odd_view: 'ODD Viewer'
  };
  return roleNames[role] || role;
};

const getRoleColor = (role) => {
  const roleColors = {
    super_admin: '#e74c3c',
    admin: '#f39c12',
    mydhl_admin: '#3498db',
    mydhl_edit: '#2ecc71',
    mydhl_view: '#95a5a6',
    odd_admin: '#3498db',
    odd_edit: '#2ecc71',
    odd_view: '#95a5a6'
  };
  return roleColors[role] || '#6c757d';
};

const getStatusColor = (status) => {
  const statusColors = {
    draft: '#ffc107',
    published: '#28a745',
    closed: '#dc3545',
    archived: '#6c757d',
    active: '#28a745',
    inactive: '#dc3545'
  };
  return statusColors[status] || '#6c757d';
};

// Chart utilities
const getChartColors = (count = 1) => {
  const colors = [
    '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
    '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'
  ];
  
  if (count === 1) return colors[0];
  
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};

// Export utilities for use in other modules
window.utils = {
  toast,
  loading,
  confirmModal,
  formatDate,
  formatRelativeTime,
  formatNumber,
  truncateText,
  capitalizeFirst,
  slugify,
  validateEmail,
  validatePassword,
  serializeForm,
  clearFormErrors,
  showFieldError,
  getQueryParams,
  updateQueryParams,
  storage,
  debounce,
  throttle,
  copyToClipboard,
  downloadFile,
  hexToRgb,
  rgbToHex,
  getContrastColor,
  getRoleDisplayName,
  getRoleColor,
  getStatusColor,
  getChartColors
};

// Initialize utilities when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Hide loading spinner initially
  loading.forceHide();
  
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  
  // Initialize popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  toast.error('An unexpected error occurred. Please try again.');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  toast.error('An unexpected error occurred. Please try again.');
  event.preventDefault();
});