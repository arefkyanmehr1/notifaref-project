// NOTIFAREF - Utility Functions

class Utils {
  // DOM Utilities
  static $(selector) {
    return document.querySelector(selector);
  }

  static $$(selector) {
    return document.querySelectorAll(selector);
  }

  static createElement(tag, className = '', content = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  }

  static show(element) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.classList.remove('hidden');
  }

  static hide(element) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.classList.add('hidden');
  }

  static toggle(element) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.classList.toggle('hidden');
  }

  static addClass(element, className) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.classList.add(className);
  }

  static removeClass(element, className) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.classList.remove(className);
  }

  static toggleClass(element, className) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.classList.toggle(className);
  }

  // Event Utilities
  static on(element, event, handler) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.addEventListener(event, handler);
  }

  static off(element, event, handler) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.removeEventListener(event, handler);
  }

  static once(element, event, handler) {
    if (typeof element === 'string') element = this.$(element);
    if (element) element.addEventListener(event, handler, { once: true });
  }

  static delegate(parent, selector, event, handler) {
    if (typeof parent === 'string') parent = this.$(parent);
    if (parent) {
      parent.addEventListener(event, (e) => {
        if (e.target.matches(selector)) {
          handler.call(e.target, e);
        }
      });
    }
  }

  // Form Utilities
  static getFormData(form) {
    if (typeof form === 'string') form = this.$(form);
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      if (data[key]) {
        // Handle multiple values (like checkboxes)
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
  }

  static setFormData(form, data) {
    if (typeof form === 'string') form = this.$(form);
    if (!form || !data) return;

    Object.keys(data).forEach(key => {
      const field = form.querySelector(`[name="${key}"]`);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = Boolean(data[key]);
        } else if (field.type === 'radio') {
          const radio = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
          if (radio) radio.checked = true;
        } else {
          field.value = data[key] || '';
        }
      }
    });
  }

  static clearForm(form) {
    if (typeof form === 'string') form = this.$(form);
    if (form) form.reset();
  }

  static validateForm(form) {
    if (typeof form === 'string') form = this.$(form);
    if (!form) return false;

    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        this.addClass(field, 'error');
        isValid = false;
      } else {
        this.removeClass(field, 'error');
      }
    });

    return isValid;
  }

  // Local Storage Utilities
  static setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  static getStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  static removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  static clearStorage() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Date Utilities
  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  static formatTime(date) {
    return this.formatDate(date, 'HH:mm');
  }

  static formatDateTime(date) {
    return this.formatDate(date, 'YYYY-MM-DD HH:mm');
  }

  static getDateTimeLocal(date = new Date()) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  static isToday(date) {
    const today = new Date();
    const d = new Date(date);
    return d.toDateString() === today.toDateString();
  }

  static isTomorrow(date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = new Date(date);
    return d.toDateString() === tomorrow.toDateString();
  }

  static isOverdue(date) {
    return new Date(date) < new Date();
  }

  static getTimeRemaining(date) {
    const now = new Date();
    const target = new Date(date);
    const diff = target - now;

    if (diff < 0) return { overdue: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, overdue: false };
  }

  // String Utilities
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static truncate(str, length = 100) {
    return str.length > length ? str.substring(0, length) + '...' : str;
  }

  static slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Array Utilities
  static unique(array) {
    return [...new Set(array)];
  }

  static groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  static sortBy(array, key, direction = 'asc') {
    return array.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (direction === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
  }

  // URL Utilities
  static getUrlParams() {
    return new URLSearchParams(window.location.search);
  }

  static setUrlParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
  }

  static removeUrlParam(key) {
    const url = new URL(window.location);
    url.searchParams.delete(key);
    window.history.pushState({}, '', url);
  }

  static getHashParams() {
    const hash = window.location.hash.substring(1);
    const params = {};
    
    if (hash) {
      hash.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }
    
    return params;
  }

  // Validation Utilities
  static isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isStrongPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return strongRegex.test(password);
  }

  static isValidUsername(username) {
    // 3-30 characters, alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  }

  // Theme Utilities
  static setTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/, '');
    document.body.classList.add(`theme-${theme}`);
    this.setStorage('notifaref_theme', theme);
  }

  static getTheme() {
    return this.getStorage('notifaref_theme', 'light');
  }

  static toggleTheme() {
    const currentTheme = this.getTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  // Animation Utilities
  static fadeIn(element, duration = 300) {
    if (typeof element === 'string') element = this.$(element);
    if (!element) return;

    element.style.opacity = '0';
    element.style.display = 'block';
    
    const start = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  static fadeOut(element, duration = 300) {
    if (typeof element === 'string') element = this.$(element);
    if (!element) return;

    const start = performance.now();
    const startOpacity = parseFloat(getComputedStyle(element).opacity);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = startOpacity * (1 - progress);
      
      if (progress >= 1) {
        element.style.display = 'none';
      } else {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  static slideDown(element, duration = 300) {
    if (typeof element === 'string') element = this.$(element);
    if (!element) return;

    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.style.display = 'block';
    
    const targetHeight = element.scrollHeight;
    const start = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.height = `${targetHeight * progress}px`;
      
      if (progress >= 1) {
        element.style.height = '';
        element.style.overflow = '';
      } else {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  static slideUp(element, duration = 300) {
    if (typeof element === 'string') element = this.$(element);
    if (!element) return;

    const startHeight = element.offsetHeight;
    const start = performance.now();
    
    element.style.overflow = 'hidden';
    
    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.height = `${startHeight * (1 - progress)}px`;
      
      if (progress >= 1) {
        element.style.display = 'none';
        element.style.height = '';
        element.style.overflow = '';
      } else {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  // Notification Utilities
  static showNotification(message, type = 'info', duration = 5000) {
    const container = this.$('#notification-container') || this.createNotificationContainer();
    
    const notification = this.createElement('div', `notification notification-${type}`);
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-message">${this.escapeHtml(message)}</div>
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    
    container.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto remove
    const autoRemove = setTimeout(() => this.removeNotification(notification), duration);
    
    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      clearTimeout(autoRemove);
      this.removeNotification(notification);
    });
    
    return notification;
  }

  static removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  static createNotificationContainer() {
    const container = this.createElement('div', 'notification-container');
    container.id = 'notification-container';
    document.body.appendChild(container);
    return container;
  }

  // Modal Utilities
  static showModal(modalId) {
    const modal = this.$(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // Focus first input
      const firstInput = modal.querySelector('input, textarea, select, button');
      if (firstInput) firstInput.focus();
    }
  }

  static hideModal(modalId) {
    const modal = this.$(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  static setupModalClose(modalId) {
    const modal = this.$(modalId);
    if (!modal) return;

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal(modalId);
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        this.hideModal(modalId);
      }
    });

    // Close button
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideModal(modalId));
    }
  }

  // Loading Utilities
  static showLoading() {
    const loading = this.$('#loading-screen');
    if (loading) this.show(loading);
  }

  static hideLoading() {
    const loading = this.$('#loading-screen');
    if (loading) {
      setTimeout(() => this.hide(loading), 500);
    }
  }

  // Debounce Utility
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle Utility
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Copy to Clipboard
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackError) {
        document.body.removeChild(textArea);
        console.error('Failed to copy to clipboard:', fallbackError);
        return false;
      }
    }
  }

  // Device Detection
  static isMobile() {
    return window.innerWidth <= 768;
  }

  static isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }

  static isDesktop() {
    return window.innerWidth > 1024;
  }

  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // Network Utilities
  static isOnline() {
    return navigator.onLine;
  }

  static onNetworkChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }

  // Performance Utilities
  static measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }

  // Error Handling
  static handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
    
    this.showNotification(message, 'error');
  }

  // Feature Detection
  static supportsServiceWorker() {
    return 'serviceWorker' in navigator;
  }

  static supportsNotifications() {
    return 'Notification' in window;
  }

  static supportsPushManager() {
    return 'PushManager' in window;
  }

  static supportsWebShare() {
    return 'share' in navigator;
  }

  // Accessibility Utilities
  static announceToScreenReader(message) {
    const announcement = this.createElement('div', 'sr-only');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  static trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    });
  }

  // Color Utilities
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Random Utilities
  static generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  static randomColor() {
    const colors = [
      '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
      '#EA580C', '#D97706', '#65A30D', '#059669',
      '#0891B2', '#0284C7', '#2563EB', '#4338CA'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // File Utilities
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static downloadFile(data, filename, type = 'application/json') {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Priority Utilities
  static getPriorityColor(priority) {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      urgent: '#DC2626'
    };
    return colors[priority] || colors.medium;
  }

  static getPriorityIcon(priority) {
    const icons = {
      low: 'fa-arrow-down',
      medium: 'fa-minus',
      high: 'fa-arrow-up',
      urgent: 'fa-exclamation'
    };
    return icons[priority] || icons.medium;
  }

  // Status Utilities
  static getStatusColor(status) {
    const colors = {
      pending: '#F59E0B',
      completed: '#10B981',
      cancelled: '#6B7280',
      snoozed: '#8B5CF6'
    };
    return colors[status] || colors.pending;
  }

  static getStatusIcon(status) {
    const icons = {
      pending: 'fa-clock',
      completed: 'fa-check-circle',
      cancelled: 'fa-times-circle',
      snoozed: 'fa-pause-circle'
    };
    return icons[status] || icons.pending;
  }

  // Search Utilities
  static highlightSearchTerm(text, term) {
    if (!term) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Pagination Utilities
  static calculatePagination(currentPage, totalPages, maxVisible = 5) {
    const pages = [];
    const half = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return {
      pages,
      showFirst: start > 1,
      showLast: end < totalPages,
      showPrevious: currentPage > 1,
      showNext: currentPage < totalPages
    };
  }

  // Chart Utilities
  static getChartColors(count) {
    const colors = [
      '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
      '#EA580C', '#D97706', '#65A30D', '#059669',
      '#0891B2', '#0284C7', '#2563EB', '#4338CA'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  // Persian/Farsi Utilities
  static toPersianDigits(str) {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const englishDigits = '0123456789';
    
    return str.toString().replace(/[0-9]/g, (digit) => {
      return persianDigits[englishDigits.indexOf(digit)];
    });
  }

  static toEnglishDigits(str) {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const englishDigits = '0123456789';
    
    return str.toString().replace(/[۰-۹]/g, (digit) => {
      return englishDigits[persianDigits.indexOf(digit)];
    });
  }

  // Retry Utility
  static async retry(fn, maxAttempts = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  // Environment Detection
  static isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('dev');
  }

  static isProduction() {
    return !this.isDevelopment();
  }

  // Browser Detection
  static getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    return {
      browser,
      userAgent: ua,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }
}

// Make Utils available globally
window.Utils = Utils;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}