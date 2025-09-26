// NOTIFAREF - Main Application

class App {
  constructor() {
    this.isInitialized = false;
    this.currentTheme = 'light';
    this.currentLanguage = 'fa';
    this.init();
  }

  async init() {
    console.log('NOTIFAREF: Initializing application...');
    
    try {
      // Initialize core systems
      await this.initializeCore();
      
      // Setup global event listeners
      this.setupGlobalEventListeners();
      
      // Initialize page-specific functionality
      this.initializePage();
      
      // Setup theme and language
      this.setupThemeAndLanguage();
      
      // Setup PWA functionality
      this.setupPWA();
      
      // Mark as initialized
      this.isInitialized = true;
      
      console.log('NOTIFAREF: Application initialized successfully');
      
      // Hide loading screen
      Utils.hideLoading();
      
    } catch (error) {
      console.error('NOTIFAREF: Application initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  async initializeCore() {
    // Initialize i18n system
    if (window.i18n) {
      const savedLanguage = Utils.getStorage('language', 'fa');
      window.i18n.setLanguage(savedLanguage);
      this.currentLanguage = savedLanguage;
    }

    // Initialize theme system
    const savedTheme = Utils.getStorage('theme', 'light');
    Utils.setTheme(savedTheme);
    this.currentTheme = savedTheme;

    // Initialize authentication
    if (window.auth) {
      await window.auth.checkAuth();
    }

    // Initialize notification system
    if (window.notificationManager) {
      await window.notificationManager.init();
    }

    // Initialize PWA manager
    if (window.pwaManager) {
      await window.pwaManager.init();
    }
  }

  setupGlobalEventListeners() {
    // Theme toggle
    document.addEventListener('click', (e) => {
      if (e.target.closest('#theme-toggle')) {
        this.toggleTheme();
      }
    });

    // Language toggle
    document.addEventListener('click', (e) => {
      if (e.target.closest('#language-toggle')) {
        this.toggleLanguage();
      }
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Handle online/offline status
    window.addEventListener('online', () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Handle authentication state changes
    window.addEventListener('authStateChanged', (e) => {
      this.handleAuthStateChange(e.detail);
    });

    // Handle language changes
    window.addEventListener('languageChanged', (e) => {
      this.handleLanguageChange(e.detail);
    });

    // Handle theme changes
    window.addEventListener('themeChanged', (e) => {
      this.handleThemeChange(e.detail);
    });

    // Handle PWA install
    window.addEventListener('beforeinstallprompt', (e) => {
      this.handleInstallPrompt(e);
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      this.handleAppInstalled();
    });

    // Handle service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        this.handleServiceWorkerMessage(e.data);
      });
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      this.handleError(e.reason, 'Unhandled Promise Rejection');
    });

    // Handle errors
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      this.handleError(e.error, 'Global Error');
    });
  }

  initializePage() {
    const pathname = window.location.pathname;
    
    // Initialize based on current page
    if (pathname === '/' || pathname === '/index.html') {
      this.initializeHomePage();
    } else if (pathname.startsWith('/dashboard')) {
      this.initializeDashboardPage();
    } else if (pathname.startsWith('/profile')) {
      this.initializeProfilePage();
    } else if (pathname.startsWith('/shared')) {
      this.initializeSharedPage();
    }
  }

  initializeHomePage() {
    console.log('Initializing home page...');
    
    // Setup hero interactions
    this.setupHeroInteractions();
    
    // Setup smooth scrolling
    this.setupSmoothScrolling();
    
    // Setup feature animations
    this.setupFeatureAnimations();
  }

  initializeDashboardPage() {
    console.log('Initializing dashboard page...');
    
    // Dashboard is initialized by dashboard.js
    // Just ensure authentication
    if (!window.auth?.isAuthenticated) {
      window.location.href = '/';
    }
  }

  initializeProfilePage() {
    console.log('Initializing profile page...');
    
    // Profile is initialized by profile.js
    // Just ensure authentication
    if (!window.auth?.isAuthenticated) {
      window.location.href = '/';
    }
  }

  initializeSharedPage() {
    console.log('Initializing shared page...');
    
    // Shared page functionality
    this.loadSharedReminder();
  }

  setupHeroInteractions() {
    // Smooth scroll to sections
    const heroLearnMore = Utils.$('#hero-learn-more');
    if (heroLearnMore) {
      heroLearnMore.addEventListener('click', () => {
        const featuresSection = Utils.$('#features');
        if (featuresSection) {
          featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Navigation links
    const navLinks = Utils.$$('.nav a[href^="#"]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = Utils.$(`#${targetId}`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  setupSmoothScrolling() {
    // Enable smooth scrolling for all anchor links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link) {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = Utils.$(`#${targetId}`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  setupFeatureAnimations() {
    // Intersection Observer for animations
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      // Observe feature cards
      const featureCards = Utils.$$('.feature-card');
      featureCards.forEach(card => observer.observe(card));
    }
  }

  setupThemeAndLanguage() {
    // Apply saved preferences
    const savedTheme = Utils.getStorage('theme', 'light');
    const savedLanguage = Utils.getStorage('language', 'fa');
    
    this.setTheme(savedTheme);
    this.setLanguage(savedLanguage);
    
    // Update toggle buttons
    this.updateThemeToggle();
    this.updateLanguageToggle();
  }

  setupPWA() {
    // PWA is handled by pwa.js
    // Just ensure it's properly initialized
    if (window.pwaManager) {
      console.log('PWA Manager initialized');
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    
    // Update user preference if authenticated
    if (window.auth?.isAuthenticated) {
      window.auth.updateProfile({ theme: newTheme }).catch(console.error);
    }
  }

  setTheme(theme) {
    this.currentTheme = theme;
    Utils.setTheme(theme);
    this.updateThemeToggle();
    
    // Trigger theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme }
    }));
  }

  updateThemeToggle() {
    const themeToggles = Utils.$$('#theme-toggle i');
    themeToggles.forEach(icon => {
      icon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
  }

  toggleLanguage() {
    const newLanguage = this.currentLanguage === 'fa' ? 'en' : 'fa';
    this.setLanguage(newLanguage);
    
    // Update user preference if authenticated
    if (window.auth?.isAuthenticated) {
      window.auth.updateProfile({ language: newLanguage }).catch(console.error);
    }
  }

  setLanguage(language) {
    this.currentLanguage = language;
    
    if (window.i18n) {
      window.i18n.setLanguage(language);
    }
    
    this.updateLanguageToggle();
    
    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language, direction: language === 'fa' ? 'rtl' : 'ltr' }
    }));
  }

  updateLanguageToggle() {
    const languageToggles = Utils.$$('#language-toggle span, #current-lang');
    languageToggles.forEach(span => {
      span.textContent = this.currentLanguage === 'fa' ? 'فا' : 'EN';
    });
  }

  handleKeyboardShortcuts(e) {
    // Global keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'k':
          e.preventDefault();
          // Focus search input if available
          const searchInput = Utils.$('#search-input');
          if (searchInput) {
            searchInput.focus();
          }
          break;
          
        case 'n':
          e.preventDefault();
          // Add new reminder
          if (window.dashboard) {
            window.dashboard.showAddReminderModal();
          }
          break;
          
        case '/':
          e.preventDefault();
          // Toggle help or shortcuts
          this.showKeyboardShortcuts();
          break;
      }
    }

    // Escape key
    if (e.key === 'Escape') {
      // Close any open modals
      const activeModal = Utils.$('.modal.active');
      if (activeModal) {
        Utils.removeClass(activeModal, 'active');
      }
      
      // Close any open dropdowns
      const activeDropdown = Utils.$('.dropdown-menu.active');
      if (activeDropdown) {
        Utils.removeClass(activeDropdown, 'active');
      }
    }
  }

  showKeyboardShortcuts() {
    const shortcuts = [
      { key: 'Ctrl+K', description: window.i18n?.t('shortcuts.search') || 'Focus search' },
      { key: 'Ctrl+N', description: window.i18n?.t('shortcuts.new_reminder') || 'New reminder' },
      { key: 'Escape', description: window.i18n?.t('shortcuts.close') || 'Close modal/dropdown' }
    ];

    const modal = Utils.createElement('div', 'modal shortcuts-modal');
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${window.i18n?.t('shortcuts.title') || 'Keyboard Shortcuts'}</h3>
          <button class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-list">
            ${shortcuts.map(shortcut => `
              <div class="shortcut-item">
                <kbd class="shortcut-key">${shortcut.key}</kbd>
                <span class="shortcut-description">${shortcut.description}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    Utils.addClass(modal, 'active');

    // Setup close handler
    modal.querySelector('.modal-close').addEventListener('click', () => {
      Utils.removeClass(modal, 'active');
      setTimeout(() => modal.remove(), 300);
    });
  }

  handleOnlineStatus(isOnline) {
    console.log('Network status changed:', isOnline ? 'online' : 'offline');
    
    if (isOnline) {
      // Sync any pending data
      this.syncPendingData();
      
      // Show online notification
      Utils.showNotification(
        window.i18n?.t('network.back_online') || 'Back online',
        'success',
        3000
      );
    } else {
      // Show offline notification
      Utils.showNotification(
        window.i18n?.t('network.offline') || 'You are offline',
        'warning',
        5000
      );
    }
  }

  async syncPendingData() {
    // Trigger background sync if available
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await registration.sync.register('background-sync');
        }
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // App became visible, refresh data if needed
      this.refreshDataIfNeeded();
    }
  }

  async refreshDataIfNeeded() {
    const lastRefresh = Utils.getStorage('last_refresh');
    const now = Date.now();
    const refreshInterval = 5 * 60 * 1000; // 5 minutes

    if (!lastRefresh || (now - lastRefresh) > refreshInterval) {
      // Refresh current page data
      if (window.dashboard && window.dashboard.currentPage) {
        await window.dashboard.loadPageData(window.dashboard.currentPage);
      }
      
      Utils.setStorage('last_refresh', now);
    }
  }

  handleAuthStateChange(authData) {
    console.log('Auth state changed:', authData.isAuthenticated);
    
    if (authData.isAuthenticated) {
      // User logged in
      this.onUserLogin(authData.user);
    } else {
      // User logged out
      this.onUserLogout();
    }
  }

  onUserLogin(user) {
    // Apply user preferences
    if (user.profile) {
      if (user.profile.language && user.profile.language !== this.currentLanguage) {
        this.setLanguage(user.profile.language);
      }
      
      if (user.profile.theme && user.profile.theme !== this.currentTheme) {
        this.setTheme(user.profile.theme);
      }
    }

    // Initialize user-specific features
    this.initializeUserFeatures();
  }

  onUserLogout() {
    // Clear user-specific data
    this.clearUserData();
    
    // Reset to default preferences
    this.setLanguage('fa');
    this.setTheme('light');
  }

  initializeUserFeatures() {
    // Initialize notification system for authenticated user
    if (window.notificationManager) {
      window.notificationManager.loadSettings();
    }

    // Setup real-time updates
    this.setupRealTimeUpdates();
  }

  clearUserData() {
    // Clear sensitive data from localStorage
    const keysToKeep = ['theme', 'language', 'pwa_banner_dismissed'];
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith('notifaref_'));
    
    allKeys.forEach(key => {
      const shortKey = key.replace('notifaref_', '');
      if (!keysToKeep.includes(shortKey)) {
        localStorage.removeItem(key);
      }
    });
  }

  setupRealTimeUpdates() {
    // Setup WebSocket connection if available
    if (window.api && window.auth?.isAuthenticated) {
      // This would connect to WebSocket for real-time updates
      console.log('Setting up real-time updates...');
    }
  }

  handleLanguageChange(languageData) {
    console.log('Language changed to:', languageData.language);
    
    // Update language toggle
    this.updateLanguageToggle();
    
    // Update document direction
    document.documentElement.dir = languageData.direction;
    document.documentElement.lang = languageData.language;
    
    // Re-render any dynamic content
    this.refreshDynamicContent();
  }

  handleThemeChange(themeData) {
    console.log('Theme changed to:', themeData.theme);
    
    // Update theme toggle
    this.updateThemeToggle();
    
    // Update charts if analytics is loaded
    if (window.analytics) {
      window.analytics.updateChartsTheme(themeData.theme);
    }
  }

  refreshDynamicContent() {
    // Refresh any dynamically generated content that needs translation
    if (window.dashboard) {
      // Refresh dashboard if it's the current page
      const currentPage = window.dashboard.currentPage;
      if (currentPage) {
        window.dashboard.loadPageData(currentPage);
      }
    }
  }

  handleInstallPrompt(e) {
    console.log('PWA install prompt available');
    // This is handled by PWA manager
  }

  handleAppInstalled() {
    console.log('PWA installed successfully');
    
    Utils.showNotification(
      window.i18n?.t('pwa.installed_success') || 'App installed successfully!',
      'success'
    );
  }

  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'notification-action':
        // Handle notification actions
        this.handleNotificationAction(data);
        break;
        
      case 'background-sync':
        // Handle background sync
        this.handleBackgroundSync(data);
        break;
        
      case 'cache-updated':
        // Handle cache updates
        console.log('Cache updated');
        break;
        
      case 'update-available':
        // Handle app updates
        this.handleUpdateAvailable();
        break;
    }
  }

  handleNotificationAction(data) {
    // Forward to appropriate handler
    if (window.dashboard) {
      window.dashboard.handleNotificationAction(data.action, data.data);
    }
  }

  handleBackgroundSync(data) {
    if (data.status === 'completed') {
      // Refresh current page data
      this.refreshDataIfNeeded();
    }
  }

  handleUpdateAvailable() {
    Utils.showNotification(
      window.i18n?.t('pwa.update_available') || 'App update available',
      'info',
      10000
    );
  }

  async loadSharedReminder() {
    const pathParts = window.location.pathname.split('/');
    const token = pathParts[pathParts.length - 1];
    
    if (!token) {
      this.showSharedError();
      return;
    }

    try {
      const response = await api.getSharedReminder(token);
      
      if (response.success) {
        this.displaySharedReminder(response.data);
      } else {
        this.showSharedError();
      }
    } catch (error) {
      console.error('Error loading shared reminder:', error);
      this.showSharedError();
    }
  }

  displaySharedReminder(reminder) {
    const errorState = Utils.$('#error-state');
    const reminderDisplay = Utils.$('#reminder-display');
    
    if (errorState) Utils.hide(errorState);
    if (reminderDisplay) Utils.show(reminderDisplay);

    // Populate reminder data
    const titleElement = Utils.$('#reminder-title');
    const descriptionElement = Utils.$('#reminder-description');
    const timeElement = Utils.$('#reminder-time');
    const priorityElement = Utils.$('#reminder-priority');
    const tagsContainer = Utils.$('#reminder-tags');
    const sharedByElement = Utils.$('#shared-by-name');
    const sharedDateElement = Utils.$('#shared-date');

    if (titleElement) titleElement.textContent = reminder.title;
    if (descriptionElement) {
      if (reminder.description) {
        descriptionElement.textContent = reminder.description;
        Utils.show(descriptionElement);
      } else {
        Utils.hide(descriptionElement);
      }
    }
    if (timeElement) timeElement.textContent = Utils.formatDate(reminder.scheduledTime);
    if (priorityElement) {
      priorityElement.innerHTML = `<span class="priority-badge priority-${reminder.priority}">${window.i18n?.t(`priority.${reminder.priority}`) || reminder.priority}</span>`;
    }
    
    if (tagsContainer && reminder.tags?.length > 0) {
      tagsContainer.innerHTML = reminder.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');
      Utils.show(Utils.$('#tags-container'));
    } else {
      Utils.hide(Utils.$('#tags-container'));
    }
    
    if (sharedByElement) sharedByElement.textContent = reminder.sharedBy?.name || reminder.sharedBy?.username;
    if (sharedDateElement) sharedDateElement.textContent = Utils.formatDate(reminder.sharedAt);

    // Setup import button
    const importBtn = Utils.$('#import-reminder-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importSharedReminder(reminder));
    }
  }

  showSharedError() {
    const errorState = Utils.$('#error-state');
    const reminderDisplay = Utils.$('#reminder-display');
    
    if (errorState) Utils.show(errorState);
    if (reminderDisplay) Utils.hide(reminderDisplay);
  }

  async importSharedReminder(reminder) {
    if (!window.auth?.isAuthenticated) {
      Utils.showModal('#login-required-modal');
      return;
    }

    try {
      const pathParts = window.location.pathname.split('/');
      const token = pathParts[pathParts.length - 1];
      
      const response = await api.importSharedReminder(token);
      
      if (response.success) {
        Utils.showModal('#import-modal');
      }
    } catch (error) {
      Utils.handleError(error, 'Import Shared Reminder');
    }
  }

  handleInitializationError(error) {
    console.error('Initialization error:', error);
    
    // Show error message
    const errorContainer = Utils.createElement('div', 'initialization-error');
    errorContainer.innerHTML = `
      <div class="error-content">
        <h2>${window.i18n?.t('app.initialization_error') || 'Initialization Error'}</h2>
        <p>${window.i18n?.t('app.initialization_error_description') || 'Failed to initialize the application. Please refresh the page.'}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">
          ${window.i18n?.t('common.refresh') || 'Refresh Page'}
        </button>
      </div>
    `;
    
    document.body.appendChild(errorContainer);
    
    // Hide loading screen
    Utils.hideLoading();
  }

  handleError(error, context) {
    console.error(`App Error (${context}):`, error);
    
    // Don't show notifications for network errors when offline
    if (!navigator.onLine && error.message?.includes('fetch')) {
      return;
    }
    
    // Show user-friendly error message
    Utils.handleError(error, context);
  }

  // Performance monitoring
  measurePerformance() {
    if ('performance' in window) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        
        console.log('App Performance Metrics:', {
          loadTime: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
          domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
          firstPaint: Math.round(performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0),
          firstContentfulPaint: Math.round(performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0)
        });
      });
    }
  }

  // App status
  getStatus() {
    return {
      initialized: this.isInitialized,
      theme: this.currentTheme,
      language: this.currentLanguage,
      authenticated: window.auth?.isAuthenticated || false,
      online: navigator.onLine,
      pwa: window.pwaManager?.getStatus() || {},
      notifications: window.notificationManager?.getPermissionStatus() || {}
    };
  }

  // Cleanup
  cleanup() {
    // Remove global event listeners
    // This would be called when the app is being destroyed
    console.log('Cleaning up application...');
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (window.app) {
    window.app.cleanup();
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}