// NOTIFAREF - API Client

class ApiClient {
  constructor() {
    this.baseURL = window.location.origin;
    this.token = Utils.getStorage('notifaref_token');
    this.refreshing = false;
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    Utils.setStorage('notifaref_token', token);
  }

  // Remove authentication token
  removeToken() {
    this.token = null;
    Utils.removeStorage('notifaref_token');
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Make HTTP request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    
    const config = {
      method: 'GET',
      headers: this.getHeaders(),
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // Handle token expiration
      if (response.status === 401 && this.token && !this.refreshing) {
        this.removeToken();
        window.location.href = '/';
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url);
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  // PATCH request
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data,
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Authentication API
  async register(userData) {
    const response = await this.post('/auth/register', userData);
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.removeToken();
    }
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  async updateProfile(profileData) {
    return this.put('/auth/profile', profileData);
  }

  async changePassword(passwordData) {
    return this.post('/auth/change-password', passwordData);
  }

  // Two-Factor Authentication API
  async setup2FA() {
    return this.post('/auth/2fa/setup');
  }

  async verify2FA(token) {
    return this.post('/auth/2fa/verify', { token });
  }

  async disable2FA(password) {
    return this.post('/auth/2fa/disable', { password });
  }

  // Reminders API
  async getReminders(params = {}) {
    return this.get('/reminders', params);
  }

  async getReminder(id) {
    return this.get(`/reminders/${id}`);
  }

  async createReminder(reminderData) {
    return this.post('/reminders', reminderData);
  }

  async updateReminder(id, reminderData) {
    return this.put(`/reminders/${id}`, reminderData);
  }

  async deleteReminder(id) {
    return this.delete(`/reminders/${id}`);
  }

  async updateReminderStatus(id, status) {
    return this.patch(`/reminders/${id}/status`, { status });
  }

  async snoozeReminder(id, minutes = 15) {
    return this.patch(`/reminders/${id}/snooze`, { minutes });
  }

  async shareReminder(id, expirationHours = 24) {
    return this.post(`/reminders/${id}/share`, { expirationHours });
  }

  async getSharedReminder(token) {
    return this.get(`/reminders/shared/${token}`);
  }

  async importSharedReminder(token) {
    return this.post(`/reminders/shared/${token}/import`);
  }

  async getReminderStats(days = 30) {
    return this.get('/reminders/stats', { days });
  }

  async getUpcomingReminders(hours = 24) {
    return this.get('/reminders/upcoming', { hours });
  }

  // Notifications API
  async getVapidKey() {
    return this.get('/notifications/vapid-key');
  }

  async subscribeToNotifications(subscription) {
    return this.post('/notifications/subscribe', { subscription });
  }

  async unsubscribeFromNotifications() {
    return this.delete('/notifications/unsubscribe');
  }

  async getNotificationSettings() {
    return this.get('/notifications/settings');
  }

  async updateNotificationSettings(settings) {
    return this.put('/notifications/settings', settings);
  }

  async testNotification() {
    return this.post('/notifications/test');
  }

  async getNotificationStatus() {
    return this.get('/notifications/status');
  }

  // Calendar API
  async getCalendarStatus() {
    return this.get('/calendar/status');
  }

  async getCalendarAuthUrl() {
    return this.get('/calendar/auth-url');
  }

  async handleCalendarCallback(code) {
    return this.post('/calendar/callback', { code });
  }

  async disconnectCalendar() {
    return this.delete('/calendar/disconnect');
  }

  async getCalendars() {
    return this.get('/calendar/calendars');
  }

  async syncReminder(id) {
    return this.post(`/calendar/sync-reminder/${id}`);
  }

  async importCalendarEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
    return this.post('/calendar/import', { calendarId, timeMin, timeMax });
  }

  async bulkSyncReminders(reminderIds) {
    return this.post('/calendar/bulk-sync', { reminderIds });
  }

  async updateCalendarSettings(settings) {
    return this.put('/calendar/settings', settings);
  }

  // Analytics API
  async getDashboardAnalytics(days = 30) {
    return this.get('/analytics/dashboard', { days });
  }

  async getTrends(days = 30, groupBy = 'day') {
    return this.get('/analytics/trends', { days, groupBy });
  }

  async getPerformanceMetrics(days = 30) {
    return this.get('/analytics/performance', { days });
  }

  async getTagAnalytics(days = 30, limit = 20) {
    return this.get('/analytics/tags', { days, limit });
  }

  async exportAnalytics(days = 30, format = 'json') {
    const response = await fetch(`${this.baseURL}/api/analytics/export?days=${days}&format=${format}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    if (format === 'csv') {
      return response.text();
    } else {
      return response.json();
    }
  }

  // Health Check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'ERROR', error: error.message };
    }
  }

  // Batch Operations
  async batchUpdateReminders(updates) {
    return this.post('/reminders/batch-update', { updates });
  }

  async batchDeleteReminders(ids) {
    return this.post('/reminders/batch-delete', { ids });
  }

  // Search API
  async searchReminders(query, filters = {}) {
    return this.get('/reminders', { search: query, ...filters });
  }

  // Tags API
  async getAllTags() {
    return this.get('/reminders/tags');
  }

  // User Statistics
  async getUserStats() {
    return this.get('/auth/stats');
  }

  // File Upload (if needed for avatars, etc.)
  async uploadFile(file, type = 'avatar') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('/upload', {
      method: 'POST',
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : undefined,
      },
      body: formData,
    });
  }

  // Utility methods for common operations
  async isAuthenticated() {
    if (!this.token) return false;
    
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      this.removeToken();
      return false;
    }
  }

  // Error handling wrapper
  async safeRequest(requestFn, fallbackValue = null) {
    try {
      return await requestFn();
    } catch (error) {
      Utils.handleError(error, 'API Request');
      return fallbackValue;
    }
  }

  // Retry wrapper for failed requests
  async retryRequest(requestFn, maxAttempts = 3) {
    return Utils.retry(requestFn, maxAttempts, 1000);
  }

  // Bulk operations with progress tracking
  async bulkOperation(items, operation, onProgress = null) {
    const results = [];
    const total = items.length;
    
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await operation(items[i]);
        results.push({ success: true, data: result, item: items[i] });
      } catch (error) {
        results.push({ success: false, error: error.message, item: items[i] });
      }
      
      if (onProgress) {
        onProgress(i + 1, total, results);
      }
    }
    
    return results;
  }

  // WebSocket connection (for real-time updates)
  connectWebSocket() {
    if (!this.token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${this.token}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      window.dispatchEvent(new CustomEvent('websocketMessage', { detail: data }));
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create global API instance
window.api = new ApiClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}