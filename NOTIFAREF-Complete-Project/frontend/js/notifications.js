// NOTIFAREF - Notification System

class NotificationManager {
  constructor() {
    this.vapidPublicKey = null;
    this.subscription = null;
    this.permission = 'default';
    this.isSupported = this.checkSupport();
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return;
    }

    // Get current permission status
    this.permission = Notification.permission;
    
    // Get VAPID public key
    await this.getVapidKey();
    
    // Check existing subscription
    await this.checkExistingSubscription();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Request permission if needed
    if (this.permission === 'default') {
      this.requestPermission();
    }
  }

  checkSupport() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  async getVapidKey() {
    try {
      const response = await api.getVapidKey();
      if (response.success) {
        this.vapidPublicKey = response.data.publicKey;
      }
    } catch (error) {
      console.error('Failed to get VAPID key:', error);
    }
  }

  async checkExistingSubscription() {
    if (!this.isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        this.subscription = subscription;
        // Verify subscription with server
        await this.syncSubscriptionWithServer();
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      Utils.showNotification(
        window.i18n?.t('notifications.not_supported') || 'Notifications not supported',
        'warning'
      );
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        Utils.showNotification(
          window.i18n?.t('notifications.permission_granted') || 'Notification permission granted',
          'success'
        );
        
        // Subscribe to push notifications
        await this.subscribe();
        return true;
        
      } else if (permission === 'denied') {
        Utils.showNotification(
          window.i18n?.t('notifications.permission_denied') || 'Notification permission denied',
          'error'
        );
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Utils.handleError(error, 'Notification Permission');
      return false;
    }
  }

  async subscribe() {
    if (!this.isSupported || !this.vapidPublicKey) {
      console.error('Cannot subscribe: missing requirements');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      
      // Send subscription to server
      const response = await api.subscribeToNotifications(subscription);
      
      if (response.success) {
        Utils.showNotification(
          window.i18n?.t('notifications.subscribed') || 'Successfully subscribed to notifications',
          'success'
        );
        
        // Update UI
        this.updateNotificationUI();
        return true;
      }
      
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      Utils.handleError(error, 'Push Subscription');
      return false;
    }
  }

  async unsubscribe() {
    if (!this.subscription) return true;

    try {
      // Unsubscribe from browser
      await this.subscription.unsubscribe();
      
      // Remove subscription from server
      await api.unsubscribeFromNotifications();
      
      this.subscription = null;
      
      Utils.showNotification(
        window.i18n?.t('notifications.unsubscribed') || 'Unsubscribed from notifications',
        'success'
      );
      
      // Update UI
      this.updateNotificationUI();
      return true;
      
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      Utils.handleError(error, 'Push Unsubscription');
      return false;
    }
  }

  async syncSubscriptionWithServer() {
    if (!this.subscription) return;

    try {
      await api.subscribeToNotifications(this.subscription);
    } catch (error) {
      console.error('Error syncing subscription with server:', error);
      // If sync fails, the subscription might be invalid
      this.subscription = null;
    }
  }

  setupEventListeners() {
    // Web push toggle
    const webPushToggle = Utils.$('#web-push-toggle');
    if (webPushToggle) {
      webPushToggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
          const success = await this.requestPermission();
          if (!success) {
            e.target.checked = false;
          }
        } else {
          await this.unsubscribe();
        }
      });
    }

    // Test notification button
    const testBtn = Utils.$('#test-notification-btn');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.sendTestNotification());
    }

    // Email notification toggles
    const emailToggle = Utils.$('#email-notifications-toggle');
    const emailFallbackToggle = Utils.$('#email-fallback-toggle');

    if (emailToggle) {
      emailToggle.addEventListener('change', () => this.updateEmailSettings());
    }

    if (emailFallbackToggle) {
      emailFallbackToggle.addEventListener('change', () => this.updateEmailSettings());
    }

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
    }
  }

  async updateEmailSettings() {
    const emailToggle = Utils.$('#email-notifications-toggle');
    const emailFallbackToggle = Utils.$('#email-fallback-toggle');

    const settings = {
      email: {
        enabled: emailToggle?.checked || false,
        fallback: emailFallbackToggle?.checked || false
      }
    };

    try {
      const response = await api.updateNotificationSettings(settings);
      
      if (response.success) {
        Utils.showNotification(
          window.i18n?.t('notifications.settings_updated') || 'Notification settings updated',
          'success'
        );
      }
    } catch (error) {
      Utils.handleError(error, 'Update Notification Settings');
      
      // Revert toggles on error
      if (emailToggle) emailToggle.checked = !emailToggle.checked;
      if (emailFallbackToggle) emailFallbackToggle.checked = !emailFallbackToggle.checked;
    }
  }

  async sendTestNotification() {
    try {
      const response = await api.testNotification();
      
      if (response.success) {
        Utils.showNotification(
          window.i18n?.t('notifications.test_sent') || 'Test notification sent',
          'success'
        );
      } else {
        Utils.showNotification(
          response.message || (window.i18n?.t('notifications.test_failed') || 'Test notification failed'),
          'error'
        );
      }
    } catch (error) {
      Utils.handleError(error, 'Test Notification');
    }
  }

  updateNotificationUI() {
    const webPushToggle = Utils.$('#web-push-toggle');
    
    if (webPushToggle) {
      webPushToggle.checked = this.permission === 'granted' && !!this.subscription;
    }

    // Update status indicators
    const statusElements = Utils.$$('.notification-status');
    statusElements.forEach(element => {
      if (this.permission === 'granted' && this.subscription) {
        element.textContent = window.i18n?.t('notifications.enabled') || 'Enabled';
        element.className = 'notification-status status-enabled';
      } else {
        element.textContent = window.i18n?.t('notifications.disabled') || 'Disabled';
        element.className = 'notification-status status-disabled';
      }
    });
  }

  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'notification-click':
        this.handleNotificationClick(data);
        break;
      case 'notification-close':
        this.handleNotificationClose(data);
        break;
      case 'background-sync':
        this.handleBackgroundSync(data);
        break;
    }
  }

  handleNotificationClick(data) {
    // Handle notification click actions
    if (data.action === 'complete' && data.reminderId) {
      // Mark reminder as complete
      this.completeReminderFromNotification(data.reminderId);
    } else if (data.action === 'snooze' && data.reminderId) {
      // Snooze reminder
      this.snoozeReminderFromNotification(data.reminderId);
    } else if (data.url) {
      // Navigate to URL
      window.location.href = data.url;
    }
  }

  async completeReminderFromNotification(reminderId) {
    try {
      await api.updateReminderStatus(reminderId, 'completed');
      Utils.showNotification(
        window.i18n?.t('reminders.completed_successfully') || 'Reminder completed',
        'success'
      );
    } catch (error) {
      Utils.handleError(error, 'Complete Reminder from Notification');
    }
  }

  async snoozeReminderFromNotification(reminderId, minutes = 15) {
    try {
      await api.snoozeReminder(reminderId, minutes);
      Utils.showNotification(
        window.i18n?.t('reminders.snoozed_successfully') || `Reminder snoozed for ${minutes} minutes`,
        'success'
      );
    } catch (error) {
      Utils.handleError(error, 'Snooze Reminder from Notification');
    }
  }

  handleNotificationClose(data) {
    // Handle notification close events
    console.log('Notification closed:', data);
  }

  handleBackgroundSync(data) {
    // Handle background sync events
    console.log('Background sync:', data);
    
    // Refresh data if needed
    if (window.dashboard) {
      window.dashboard.loadPageData(window.dashboard.currentPage);
    }
  }

  // Show browser notification (for testing)
  showBrowserNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'notifaref-notification',
      requireInteraction: false,
      ...options
    };

    const notification = new Notification(title, defaultOptions);
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get notification settings
  async getSettings() {
    try {
      const response = await api.getNotificationSettings();
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  }

  // Update notification settings
  async updateSettings(settings) {
    try {
      const response = await api.updateNotificationSettings(settings);
      
      if (response.success) {
        Utils.showNotification(
          window.i18n?.t('notifications.settings_updated') || 'Settings updated',
          'success'
        );
        return true;
      }
      return false;
    } catch (error) {
      Utils.handleError(error, 'Update Notification Settings');
      return false;
    }
  }

  // Load and apply notification settings
  async loadSettings() {
    const settings = await this.getSettings();
    if (!settings) return;

    // Update UI toggles
    const webPushToggle = Utils.$('#web-push-toggle');
    const emailToggle = Utils.$('#email-notifications-toggle');
    const emailFallbackToggle = Utils.$('#email-fallback-toggle');

    if (webPushToggle) {
      webPushToggle.checked = settings.webPush.enabled && settings.webPush.subscribed;
    }

    if (emailToggle) {
      emailToggle.checked = settings.email.enabled;
    }

    if (emailFallbackToggle) {
      emailFallbackToggle.checked = settings.email.fallback;
    }
  }

  // Check if notifications are properly configured
  async checkStatus() {
    try {
      const response = await api.getNotificationStatus();
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error checking notification status:', error);
      return null;
    }
  }

  // Show notification permission prompt
  showPermissionPrompt() {
    if (this.permission === 'granted') return;

    const prompt = Utils.createElement('div', 'notification-prompt');
    prompt.innerHTML = `
      <div class="prompt-content">
        <div class="prompt-icon">
          <i class="fas fa-bell"></i>
        </div>
        <div class="prompt-text">
          <h4>${window.i18n?.t('notifications.enable_title') || 'Enable Notifications'}</h4>
          <p>${window.i18n?.t('notifications.enable_description') || 'Get notified about your reminders'}</p>
        </div>
        <div class="prompt-actions">
          <button class="btn btn-primary btn-sm enable-notifications">
            ${window.i18n?.t('notifications.enable') || 'Enable'}
          </button>
          <button class="btn btn-ghost btn-sm dismiss-prompt">
            ${window.i18n?.t('common.dismiss') || 'Dismiss'}
          </button>
        </div>
      </div>
    `;

    // Add to page
    const container = Utils.$('#notification-container') || document.body;
    container.appendChild(prompt);

    // Setup event listeners
    prompt.querySelector('.enable-notifications').addEventListener('click', async () => {
      const success = await this.requestPermission();
      if (success) {
        prompt.remove();
      }
    });

    prompt.querySelector('.dismiss-prompt').addEventListener('click', () => {
      prompt.remove();
      // Remember dismissal
      Utils.setStorage('notification_prompt_dismissed', true);
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
      }
    }, 10000);
  }

  // Show permission prompt if appropriate
  maybeShowPermissionPrompt() {
    const dismissed = Utils.getStorage('notification_prompt_dismissed', false);
    
    if (this.permission === 'default' && !dismissed) {
      // Show prompt after a delay
      setTimeout(() => {
        this.showPermissionPrompt();
      }, 3000);
    }
  }

  // Handle notification actions from service worker
  async handleNotificationAction(action, data) {
    switch (action) {
      case 'complete':
        if (data.reminderId) {
          await this.completeReminderFromNotification(data.reminderId);
        }
        break;
        
      case 'snooze':
        if (data.reminderId) {
          await this.snoozeReminderFromNotification(data.reminderId, 15);
        }
        break;
        
      case 'view':
        if (data.url) {
          window.location.href = data.url;
        }
        break;
    }
  }

  // Register service worker message handler
  registerServiceWorkerHandler() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, action, data } = event.data;
        
        if (type === 'notification-action') {
          this.handleNotificationAction(action, data);
        }
      });
    }
  }

  // Send message to service worker
  sendMessageToServiceWorker(message) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }

  // Test notification functionality
  async testNotification() {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      // Send test notification via API
      const response = await api.testNotification();
      
      if (response.success) {
        Utils.showNotification(
          window.i18n?.t('notifications.test_sent') || 'Test notification sent',
          'success'
        );
      } else {
        // Fallback to browser notification
        this.showBrowserNotification(
          window.i18n?.t('notifications.test_title') || 'Test Notification',
          {
            body: window.i18n?.t('notifications.test_body') || 'This is a test notification from NOTIFAREF',
            icon: '/icons/icon-192x192.png',
            tag: 'test-notification'
          }
        );
      }
    } catch (error) {
      Utils.handleError(error, 'Test Notification');
    }
  }

  // Get notification permission status
  getPermissionStatus() {
    return {
      permission: this.permission,
      subscribed: !!this.subscription,
      supported: this.isSupported
    };
  }

  // Check if notifications are fully enabled
  isFullyEnabled() {
    return this.permission === 'granted' && !!this.subscription && this.isSupported;
  }

  // Handle permission change
  onPermissionChange(callback) {
    // Monitor permission changes
    const checkPermission = () => {
      const newPermission = Notification.permission;
      if (newPermission !== this.permission) {
        this.permission = newPermission;
        callback(newPermission);
      }
    };

    // Check periodically (some browsers don't fire events)
    setInterval(checkPermission, 1000);
  }

  // Initialize notification system for specific pages
  async initForPage(page) {
    switch (page) {
      case 'dashboard':
        // Show permission prompt if needed
        this.maybeShowPermissionPrompt();
        break;
        
      case 'profile':
      case 'settings':
        // Load current settings
        await this.loadSettings();
        break;
    }
  }

  // Cleanup notification system
  cleanup() {
    // Remove event listeners and cleanup resources
    if (this.subscription) {
      // Don't unsubscribe, just cleanup local references
      this.subscription = null;
    }
  }
}

// Create global notification manager instance
window.notificationManager = new NotificationManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Register service worker message handler
  notificationManager.registerServiceWorkerHandler();
  
  // Initialize for current page
  const page = document.body.classList.contains('dashboard-page') ? 'dashboard' :
              document.body.classList.contains('profile-page') ? 'profile' : 'home';
  
  notificationManager.initForPage(page);
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}