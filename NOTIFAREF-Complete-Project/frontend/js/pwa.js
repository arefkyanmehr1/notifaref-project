// NOTIFAREF - PWA Manager

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isStandalone = false;
    this.serviceWorkerRegistration = null;
    this.init();
  }

  async init() {
    // Check if app is running in standalone mode
    this.checkStandaloneMode();
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup install prompt
    this.setupInstallPrompt();
    
    // Setup update handling
    this.setupUpdateHandling();
    
    // Setup offline detection
    this.setupOfflineDetection();
    
    // Check installation status
    this.checkInstallationStatus();
  }

  checkStandaloneMode() {
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone ||
                       document.referrer.includes('android-app://');
    
    if (this.isStandalone) {
      document.body.classList.add('pwa-standalone');
      console.log('PWA: Running in standalone mode');
    }
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('PWA: Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.serviceWorkerRegistration = registration;
      console.log('PWA: Service Worker registered successfully');

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            this.showUpdateAvailable();
          }
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

    } catch (error) {
      console.error('PWA: Service Worker registration failed:', error);
    }
  }

  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: Install prompt available');
      
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Save the event for later use
      this.deferredPrompt = e;
      
      // Show custom install banner
      this.showInstallBanner();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed successfully');
      this.isInstalled = true;
      this.hideInstallBanner();
      
      Utils.showNotification(
        window.i18n?.t('pwa.installed') || 'App installed successfully',
        'success'
      );
      
      // Track installation
      this.trackInstallation();
    });

    // Setup install button listeners
    const installBtn = Utils.$('#pwa-install-btn');
    const dismissBtn = Utils.$('#pwa-dismiss-btn');

    if (installBtn) {
      installBtn.addEventListener('click', () => this.promptInstall());
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismissInstallBanner());
    }
  }

  showInstallBanner() {
    const banner = Utils.$('#pwa-install-banner');
    if (banner && !this.isInstalled && !this.isStandalone) {
      // Check if user has dismissed the banner recently
      const dismissed = Utils.getStorage('pwa_banner_dismissed');
      const dismissedTime = dismissed ? new Date(dismissed) : null;
      const now = new Date();
      
      // Show banner if not dismissed or dismissed more than 7 days ago
      if (!dismissedTime || (now - dismissedTime) > 7 * 24 * 60 * 60 * 1000) {
        Utils.removeClass(banner, 'hidden');
        Utils.addClass(banner, 'show');
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
          if (Utils.hasClass(banner, 'show')) {
            this.hideInstallBanner();
          }
        }, 30000);
      }
    }
  }

  hideInstallBanner() {
    const banner = Utils.$('#pwa-install-banner');
    if (banner) {
      Utils.removeClass(banner, 'show');
      Utils.addClass(banner, 'hidden');
    }
  }

  dismissInstallBanner() {
    this.hideInstallBanner();
    
    // Remember dismissal
    Utils.setStorage('pwa_banner_dismissed', new Date().toISOString());
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      console.warn('PWA: Install prompt not available');
      return;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for the user to respond
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('PWA: Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        Utils.showNotification(
          window.i18n?.t('pwa.installing') || 'Installing app...',
          'info'
        );
      } else {
        this.dismissInstallBanner();
      }
      
      // Clear the deferred prompt
      this.deferredPrompt = null;
      
    } catch (error) {
      console.error('PWA: Install prompt error:', error);
    }
  }

  setupUpdateHandling() {
    // Check for updates periodically
    if (this.serviceWorkerRegistration) {
      setInterval(() => {
        this.serviceWorkerRegistration.update();
      }, 60000); // Check every minute
    }
  }

  showUpdateAvailable() {
    const updateBanner = Utils.createElement('div', 'update-banner');
    updateBanner.innerHTML = `
      <div class="update-content">
        <div class="update-icon">
          <i class="fas fa-download"></i>
        </div>
        <div class="update-text">
          <h4>${window.i18n?.t('pwa.update_available') || 'Update Available'}</h4>
          <p>${window.i18n?.t('pwa.update_description') || 'A new version of NOTIFAREF is available'}</p>
        </div>
        <div class="update-actions">
          <button class="btn btn-primary btn-sm update-btn">
            ${window.i18n?.t('pwa.update') || 'Update'}
          </button>
          <button class="btn btn-ghost btn-sm dismiss-update-btn">
            ${window.i18n?.t('common.dismiss') || 'Dismiss'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(updateBanner);

    // Setup event listeners
    updateBanner.querySelector('.update-btn').addEventListener('click', () => {
      this.applyUpdate();
      updateBanner.remove();
    });

    updateBanner.querySelector('.dismiss-update-btn').addEventListener('click', () => {
      updateBanner.remove();
    });
  }

  applyUpdate() {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.waiting) {
      // Tell the waiting service worker to skip waiting
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to use the new service worker
      window.location.reload();
    }
  }

  setupOfflineDetection() {
    // Update UI based on online/offline status
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        document.body.classList.remove('offline');
        this.hideOfflineBanner();
      } else {
        document.body.classList.add('offline');
        this.showOfflineBanner();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  }

  showOfflineBanner() {
    let banner = Utils.$('#offline-banner');
    
    if (!banner) {
      banner = Utils.createElement('div', 'offline-banner');
      banner.id = 'offline-banner';
      banner.innerHTML = `
        <div class="offline-content">
          <i class="fas fa-wifi-slash"></i>
          <span>${window.i18n?.t('pwa.offline') || 'You are offline'}</span>
        </div>
      `;
      
      document.body.appendChild(banner);
    }
    
    Utils.show(banner);
  }

  hideOfflineBanner() {
    const banner = Utils.$('#offline-banner');
    if (banner) {
      Utils.hide(banner);
    }
  }

  checkInstallationStatus() {
    // Check if app is already installed
    if ('getInstalledRelatedApps' in navigator) {
      navigator.getInstalledRelatedApps().then((relatedApps) => {
        this.isInstalled = relatedApps.length > 0;
        
        if (this.isInstalled) {
          this.hideInstallBanner();
        }
      });
    }
  }

  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'notification-action':
        // Forward to notification manager
        if (window.notificationManager) {
          window.notificationManager.handleNotificationAction(data.action, data.data);
        }
        break;
        
      case 'background-sync':
        // Handle background sync completion
        if (data.status === 'completed') {
          Utils.showNotification(
            window.i18n?.t('pwa.sync_completed') || 'Data synced',
            'success'
          );
        }
        break;
        
      case 'cache-updated':
        // Handle cache updates
        console.log('PWA: Cache updated');
        break;
    }
  }

  // Send message to service worker
  sendMessageToServiceWorker(message) {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
      this.serviceWorkerRegistration.active.postMessage(message);
    }
  }

  // Track installation for analytics
  trackInstallation() {
    // Send installation event to analytics
    if (window.gtag) {
      gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'App Installed'
      });
    }
    
    // Store installation date
    Utils.setStorage('pwa_installed_date', new Date().toISOString());
  }

  // Get installation info
  getInstallationInfo() {
    return {
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone,
      installDate: Utils.getStorage('pwa_installed_date'),
      canInstall: !!this.deferredPrompt
    };
  }

  // Share functionality
  async share(data) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('Web Share API error:', error);
      }
    }
    
    // Fallback to clipboard
    if (data.url) {
      const success = await Utils.copyToClipboard(data.url);
      if (success) {
        Utils.showNotification(
          window.i18n?.t('common.copied_to_clipboard') || 'Copied to clipboard',
          'success'
        );
        return true;
      }
    }
    
    return false;
  }

  // Add to home screen prompt for iOS
  showIOSInstallPrompt() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.navigator.standalone;
    
    if (isIOS && !isInStandaloneMode) {
      const prompt = Utils.createElement('div', 'ios-install-prompt');
      prompt.innerHTML = `
        <div class="ios-prompt-content">
          <div class="ios-prompt-header">
            <h4>${window.i18n?.t('pwa.ios_install_title') || 'Install NOTIFAREF'}</h4>
            <button class="ios-prompt-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="ios-prompt-body">
            <p>${window.i18n?.t('pwa.ios_install_description') || 'Install this app on your iPhone:'}</p>
            <ol>
              <li>${window.i18n?.t('pwa.ios_step1') || 'Tap the share button'} <i class="fas fa-share"></i></li>
              <li>${window.i18n?.t('pwa.ios_step2') || 'Tap "Add to Home Screen"'} <i class="fas fa-plus-square"></i></li>
            </ol>
          </div>
        </div>
      `;
      
      document.body.appendChild(prompt);
      
      // Auto-hide after 15 seconds
      setTimeout(() => {
        if (prompt.parentNode) {
          prompt.remove();
        }
      }, 15000);
      
      // Close button
      prompt.querySelector('.ios-prompt-close').addEventListener('click', () => {
        prompt.remove();
        Utils.setStorage('ios_prompt_dismissed', true);
      });
    }
  }

  // Cache management
  async clearCache() {
    if (this.serviceWorkerRegistration) {
      this.sendMessageToServiceWorker({ type: 'clear-cache' });
      
      Utils.showNotification(
        window.i18n?.t('pwa.cache_cleared') || 'Cache cleared',
        'success'
      );
    }
  }

  async getCacheSize() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage,
          available: estimate.quota,
          percentage: Math.round((estimate.usage / estimate.quota) * 100)
        };
      } catch (error) {
        console.error('Error getting cache size:', error);
      }
    }
    return null;
  }

  // Offline functionality
  setupOfflineDetection() {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      
      // Update UI
      document.body.classList.toggle('offline', !isOnline);
      
      // Show/hide offline indicator
      if (isOnline) {
        this.hideOfflineIndicator();
        this.syncOfflineData();
      } else {
        this.showOfflineIndicator();
      }
      
      // Trigger event for other components
      window.dispatchEvent(new CustomEvent('onlineStatusChanged', {
        detail: { isOnline }
      }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  }

  showOfflineIndicator() {
    let indicator = Utils.$('#offline-indicator');
    
    if (!indicator) {
      
      indicator = Utils.createElement('div', 'offline-indicator');
      indicator.id = 'offline-indicator';
      indicator.innerHTML = `
        <div class="offline-content">
          <i class="fas fa-wifi-slash"></i>
          <span>${window.i18n?.t('pwa.offline_mode') || 'Offline Mode'}</span>
        </div>
      `;
      
      document.body.appendChild(indicator);
    }
    
    Utils.show(indicator);
  }

  hideOfflineIndicator() {
    const indicator = Utils.$('#offline-indicator');
    if (indicator) {
      Utils.hide(indicator);
    }
  }

  async syncOfflineData() {
    // Trigger background sync when coming back online
    if (this.serviceWorkerRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.serviceWorkerRegistration.sync.register('background-sync');
        console.log('PWA: Background sync registered');
      } catch (error) {
        console.error('PWA: Background sync registration failed:', error);
      }
    }
  }

  // Update handling
  showUpdateAvailable() {
    const updateBanner = Utils.createElement('div', 'update-banner');
    updateBanner.innerHTML = `
      <div class="update-content">
        <div class="update-icon">
          <i class="fas fa-sync-alt"></i>
        </div>
        <div class="update-text">
          <h4>${window.i18n?.t('pwa.update_available') || 'Update Available'}</h4>
          <p>${window.i18n?.t('pwa.update_description') || 'A new version is available'}</p>
        </div>
        <div class="update-actions">
          <button class="btn btn-primary btn-sm update-now-btn">
            ${window.i18n?.t('pwa.update_now') || 'Update Now'}
          </button>
          <button class="btn btn-ghost btn-sm update-later-btn">
            ${window.i18n?.t('pwa.update_later') || 'Later'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(updateBanner);

    // Event listeners
    updateBanner.querySelector('.update-now-btn').addEventListener('click', () => {
      this.applyUpdate();
      updateBanner.remove();
    });

    updateBanner.querySelector('.update-later-btn').addEventListener('click', () => {
      updateBanner.remove();
    });
  }

  applyUpdate() {
    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.waiting) {
      // Tell the waiting service worker to skip waiting
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Show loading and reload
      Utils.showNotification(
        window.i18n?.t('pwa.updating') || 'Updating app...',
        'info'
      );
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  // Installation detection for different platforms
  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else if (/windows/.test(userAgent)) {
      return 'windows';
    } else if (/mac/.test(userAgent)) {
      return 'mac';
    } else {
      return 'desktop';
    }
  }

  // Show platform-specific install instructions
  showInstallInstructions() {
    const platform = this.detectPlatform();
    let instructions = '';

    switch (platform) {
      case 'ios':
        instructions = `
          <ol>
            <li>${window.i18n?.t('pwa.ios_step1') || 'Tap the share button'} <i class="fas fa-share"></i></li>
            <li>${window.i18n?.t('pwa.ios_step2') || 'Tap "Add to Home Screen"'}</li>
            <li>${window.i18n?.t('pwa.ios_step3') || 'Tap "Add"'}</li>
          </ol>
        `;
        break;
        
      case 'android':
        instructions = `
          <ol>
            <li>${window.i18n?.t('pwa.android_step1') || 'Tap the menu button'} <i class="fas fa-ellipsis-v"></i></li>
            <li>${window.i18n?.t('pwa.android_step2') || 'Tap "Add to Home screen"'}</li>
            <li>${window.i18n?.t('pwa.android_step3') || 'Tap "Add"'}</li>
          </ol>
        `;
        break;
        
      default:
        instructions = `
          <ol>
            <li>${window.i18n?.t('pwa.desktop_step1') || 'Look for the install icon in the address bar'}</li>
            <li>${window.i18n?.t('pwa.desktop_step2') || 'Click "Install NOTIFAREF"'}</li>
          </ol>
        `;
    }

    const modal = Utils.createElement('div', 'modal install-instructions-modal');
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${window.i18n?.t('pwa.install_instructions') || 'Installation Instructions'}</h3>
          <button class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="install-instructions">
            <h4>${window.i18n?.t('pwa.how_to_install') || 'How to install NOTIFAREF:'}</h4>
            ${instructions}
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

  // Background sync management
  async registerBackgroundSync(tag) {
    if (this.serviceWorkerRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.serviceWorkerRegistration.sync.register(tag);
        console.log('PWA: Background sync registered:', tag);
        return true;
      } catch (error) {
        console.error('PWA: Background sync registration failed:', error);
        return false;
      }
    }
    return false;
  }

  // Periodic background sync (if supported)
  async registerPeriodicSync(tag, minInterval = 24 * 60 * 60 * 1000) {
    if (this.serviceWorkerRegistration && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.serviceWorkerRegistration.periodicSync.register(tag, {
          minInterval
        });
        console.log('PWA: Periodic sync registered:', tag);
        return true;
      } catch (error) {
        console.error('PWA: Periodic sync registration failed:', error);
        return false;
      }
    }
    return false;
  }

  // App shortcuts (for installed PWA)
  setupAppShortcuts() {
    // This would be handled in the manifest.json
    // But we can also handle shortcut actions here
    
    const urlParams = new URLSearchParams(window.location.search);
    const shortcut = urlParams.get('shortcut');
    
    if (shortcut) {
      switch (shortcut) {
        case 'add-reminder':
          if (window.dashboard) {
            window.dashboard.showAddReminderModal();
          }
          break;
          
        case 'view-reminders':
          if (window.dashboard) {
            window.dashboard.switchPage('reminders');
          }
          break;
      }
    }
  }

  // Performance monitoring
  measurePerformance() {
    if ('performance' in window) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        
        console.log('PWA Performance:', {
          loadTime: perfData.loadEventEnd - perfData.loadEventStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
          firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
        });
      });
    }
  }

  // Get PWA status
  getStatus() {
    return {
      serviceWorkerSupported: 'serviceWorker' in navigator,
      serviceWorkerRegistered: !!this.serviceWorkerRegistration,
      installPromptAvailable: !!this.deferredPrompt,
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone,
      isOnline: navigator.onLine,
      platform: this.detectPlatform()
    };
  }

  // Cleanup
  cleanup() {
    // Remove event listeners and cleanup resources
    window.removeEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this.handleAppInstalled);
  }
}

// Create global PWA manager instance
window.pwaManager = new PWAManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Setup app shortcuts
  pwaManager.setupAppShortcuts();
  
  // Measure performance
  pwaManager.measurePerformance();
  
  // Show iOS install prompt if appropriate
  const iosPromptDismissed = Utils.getStorage('ios_prompt_dismissed', false);
  if (!iosPromptDismissed) {
    setTimeout(() => {
      pwaManager.showIOSInstallPrompt();
    }, 5000);
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
}