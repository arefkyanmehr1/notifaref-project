// NOTIFAREF - Authentication System

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.init();
  }

  async init() {
    // Check if user is already authenticated
    await this.checkAuthStatus();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update UI based on auth status
    this.updateAuthUI();
  }

  async checkAuthStatus() {
    try {
      if (api.token) {
        const response = await api.getCurrentUser();
        if (response.success) {
          this.currentUser = response.user;
          this.isAuthenticated = true;
          return true;
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.logout();
    }
    
    this.isAuthenticated = false;
    this.currentUser = null;
    return false;
  }

  setupEventListeners() {
    // Login form
    const loginForm = Utils.$('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Register form
    const registerForm = Utils.$('#register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Auth modal toggles
    const loginBtn = Utils.$('#login-btn');
    const registerBtn = Utils.$('#register-btn');
    const showRegister = Utils.$('#show-register');
    const showLogin = Utils.$('#show-login');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.showLoginModal());
    }

    if (registerBtn) {
      registerBtn.addEventListener('click', () => this.showRegisterModal());
    }

    if (showRegister) {
      showRegister.addEventListener('click', () => this.switchToRegister());
    }

    if (showLogin) {
      showLogin.addEventListener('click', () => this.switchToLogin());
    }

    // Logout buttons
    const logoutBtns = Utils.$$('#logout-btn, #header-logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', () => this.logout());
    });

    // Hero buttons
    const heroGetStarted = Utils.$('#hero-get-started');
    if (heroGetStarted) {
      heroGetStarted.addEventListener('click', () => {
        if (this.isAuthenticated) {
          window.location.href = '/dashboard';
        } else {
          this.showRegisterModal();
        }
      });
    }

    // Password toggles
    const passwordToggles = Utils.$$('.password-toggle');
    passwordToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => this.togglePassword(e));
    });

    // Setup modal close handlers
    Utils.setupModalClose('#auth-modal');
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = Utils.getFormData(form);
    
    // Validate form
    if (!Utils.validateForm(form)) {
      Utils.showNotification(i18n.t('common.error'), 'error');
      return;
    }

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type=\"submit\"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class=\"fas fa-spinner fa-spin\"></i> ' + i18n.t('common.loading');

      const response = await api.login(formData);

      if (response.success) {
        this.currentUser = response.user;
        this.isAuthenticated = true;
        
        Utils.showNotification(i18n.t('auth.login_success'), 'success');
        Utils.hideModal('#auth-modal');
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
        
      } else if (response.requiresTwoFactor) {
        // Show 2FA input
        Utils.show('#2fa-section');
        Utils.$('#login-2fa').focus();
        
      } else {
        Utils.showNotification(response.message || i18n.t('common.error'), 'error');
      }

    } catch (error) {
      Utils.handleError(error, 'Login');
    } finally {
      // Reset button state
      const submitBtn = form.querySelector('button[type=\"submit\"]');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = Utils.getFormData(form);
    
    // Validate form
    if (!Utils.validateForm(form)) {
      Utils.showNotification(i18n.t('common.error'), 'error');
      return;
    }

    // Validate password strength
    if (!Utils.isStrongPassword(formData.password)) {
      Utils.showNotification('Password must be at least 6 characters with uppercase, lowercase, and number', 'error');
      return;
    }

    // Validate email
    if (!Utils.isEmail(formData.email)) {
      Utils.showNotification('Please enter a valid email address', 'error');
      return;
    }

    // Validate username
    if (!Utils.isValidUsername(formData.username)) {
      Utils.showNotification('Username must be 3-30 characters, letters, numbers, and underscores only', 'error');
      return;
    }

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type=\"submit\"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class=\"fas fa-spinner fa-spin\"></i> ' + i18n.t('common.loading');

      const response = await api.register(formData);

      if (response.success) {
        this.currentUser = response.user;
        this.isAuthenticated = true;
        
        Utils.showNotification(i18n.t('auth.register_success'), 'success');
        Utils.hideModal('#auth-modal');
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
        
      } else {
        Utils.showNotification(response.message || i18n.t('common.error'), 'error');
      }

    } catch (error) {
      Utils.handleError(error, 'Registration');
    } finally {
      // Reset button state
      const submitBtn = form.querySelector('button[type=\"submit\"]');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  async logout() {
    try {
      await api.logout();
      
      this.currentUser = null;
      this.isAuthenticated = false;
      
      Utils.showNotification(i18n.t('auth.logout_success'), 'success');
      
      // Redirect to home page
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      api.removeToken();
      this.currentUser = null;
      this.isAuthenticated = false;
      window.location.href = '/';
    }
  }

  showLoginModal() {
    this.switchToLogin();
    Utils.showModal('#auth-modal');
  }

  showRegisterModal() {
    this.switchToRegister();
    Utils.showModal('#auth-modal');
  }

  switchToLogin() {
    Utils.show('#login-form');
    Utils.hide('#register-form');
    Utils.hide('#2fa-section');
    
    const modalTitle = Utils.$('#auth-modal-title');
    if (modalTitle) {
      modalTitle.textContent = i18n.t('auth.login');
    }
    
    // Clear forms
    Utils.clearForm('#login-form');
    Utils.clearForm('#register-form');
  }

  switchToRegister() {
    Utils.hide('#login-form');
    Utils.show('#register-form');
    Utils.hide('#2fa-section');
    
    const modalTitle = Utils.$('#auth-modal-title');
    if (modalTitle) {
      modalTitle.textContent = i18n.t('auth.register');
    }
    
    // Clear forms
    Utils.clearForm('#login-form');
    Utils.clearForm('#register-form');
  }

  togglePassword(e) {
    const button = e.target.closest('.password-toggle');
    const targetId = button.getAttribute('data-target');
    const input = Utils.$(`#${targetId}`);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  }

  updateAuthUI() {
    const authButtons = Utils.$('#auth-buttons');
    const userMenu = Utils.$('#user-menu');
    
    if (this.isAuthenticated) {
      // Hide auth buttons, show user menu
      if (authButtons) Utils.hide(authButtons);
      if (userMenu) Utils.show(userMenu);
      
      // Update user info
      this.updateUserInfo();
      
    } else {
      // Show auth buttons, hide user menu
      if (authButtons) Utils.show(authButtons);
      if (userMenu) Utils.hide(userMenu);
    }
  }

  updateUserInfo() {
    if (!this.currentUser) return;

    // Update user name displays
    const userNameElements = Utils.$$('#user-name, .user-name');
    userNameElements.forEach(element => {
      const displayName = this.currentUser.profile.firstName || this.currentUser.username;
      element.textContent = displayName;
    });

    // Update user email displays
    const userEmailElements = Utils.$$('#user-email, .user-email');
    userEmailElements.forEach(element => {
      element.textContent = this.currentUser.email;
    });

    // Update username displays
    const usernameElements = Utils.$$('#user-username, .user-username');
    usernameElements.forEach(element => {
      element.textContent = `@${this.currentUser.username}`;
    });
  }

  // Check if user has specific permission
  hasPermission(permission) {
    if (!this.isAuthenticated || !this.currentUser) return false;
    
    // Add permission checking logic here if needed
    return true;
  }

  // Get user preference
  getUserPreference(key, defaultValue = null) {
    if (!this.currentUser || !this.currentUser.profile) return defaultValue;
    return this.currentUser.profile[key] || defaultValue;
  }

  // Redirect to login if not authenticated
  requireAuth() {
    if (!this.isAuthenticated) {
      this.showLoginModal();
      return false;
    }
    return true;
  }

  // Setup auth guards for protected pages
  setupAuthGuards() {
    const protectedPages = ['/dashboard', '/profile', '/analytics'];
    const currentPath = window.location.pathname;
    
    if (protectedPages.some(page => currentPath.startsWith(page))) {
      if (!this.isAuthenticated) {
        window.location.href = '/';
        return false;
      }
    }
    
    return true;
  }

  // Handle authentication state changes
  onAuthStateChange(callback) {
    window.addEventListener('authStateChanged', callback);
  }

  // Trigger auth state change event
  triggerAuthStateChange() {
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: {
        isAuthenticated: this.isAuthenticated,
        user: this.currentUser
      }
    }));
  }

  // Auto-refresh token before expiration
  setupTokenRefresh() {
    if (!this.token) return;

    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;
      
      // Refresh 5 minutes before expiration
      const refreshTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 0);
      
      setTimeout(async () => {
        try {
          // In a real app, you might have a refresh token endpoint
          await this.checkAuthStatus();
        } catch (error) {
          console.error('Token refresh failed:', error);
          this.logout();
        }
      }, refreshTime);
      
    } catch (error) {
      console.error('Invalid token format:', error);
      this.logout();
    }
  }

  // Password strength checker
  checkPasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?\":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    
    let strength = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return { checks, score, strength };
  }

  // Show password strength indicator
  showPasswordStrength(inputId, indicatorId) {
    const input = Utils.$(inputId);
    const indicator = Utils.$(indicatorId);
    
    if (!input || !indicator) return;

    input.addEventListener('input', () => {
      const password = input.value;
      const { checks, strength } = this.checkPasswordStrength(password);
      
      indicator.className = `password-strength ${strength}`;
      
      const requirements = [
        { key: 'length', text: 'At least 8 characters' },
        { key: 'uppercase', text: 'One uppercase letter' },
        { key: 'lowercase', text: 'One lowercase letter' },
        { key: 'number', text: 'One number' }
      ];

      indicator.innerHTML = requirements.map(req => 
        `<div class="requirement ${checks[req.key] ? 'met' : 'unmet'}">
          <i class="fas ${checks[req.key] ? 'fa-check' : 'fa-times'}"></i>
          ${req.text}
        </div>`
      ).join('');
    });
  }

  // Handle social login (if implemented)
  async handleSocialLogin(provider) {
    try {
      // Redirect to social auth endpoint
      window.location.href = `/api/auth/${provider}`;
    } catch (error) {
      Utils.handleError(error, 'Social Login');
    }
  }

  // Handle forgot password
  async handleForgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      
      if (response.success) {
        Utils.showNotification('Password reset email sent', 'success');
      } else {
        Utils.showNotification(response.message, 'error');
      }
      
    } catch (error) {
      Utils.handleError(error, 'Forgot Password');
    }
  }

  // Validate registration form
  validateRegistration(formData) {
    const errors = [];

    if (!formData.username || !Utils.isValidUsername(formData.username)) {
      errors.push('Username must be 3-30 characters, letters, numbers, and underscores only');
    }

    if (!formData.email || !Utils.isEmail(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!formData.password || !Utils.isStrongPassword(formData.password)) {
      errors.push('Password must be at least 6 characters with uppercase, lowercase, and number');
    }

    return errors;
  }

  // Auto-login after registration
  async autoLogin(credentials) {
    try {
      const response = await api.login({
        username: credentials.username,
        password: credentials.password
      });

      if (response.success) {
        this.currentUser = response.user;
        this.isAuthenticated = true;
        this.updateAuthUI();
        return true;
      }
    } catch (error) {
      console.error('Auto-login failed:', error);
    }
    
    return false;
  }

  // Session management
  extendSession() {
    if (this.isAuthenticated) {
      // Update last activity timestamp
      Utils.setStorage('notifaref_last_activity', Date.now());
    }
  }

  checkSessionTimeout() {
    const lastActivity = Utils.getStorage('notifaref_last_activity');
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    
    if (lastActivity && Date.now() - lastActivity > sessionTimeout) {
      this.logout();
      Utils.showNotification('Session expired. Please login again.', 'warning');
    }
  }

  // Setup session monitoring
  setupSessionMonitoring() {
    // Extend session on user activity
    const events = ['click', 'keypress', 'scroll', 'mousemove'];
    const extendSession = Utils.throttle(() => this.extendSession(), 60000); // Once per minute
    
    events.forEach(event => {
      document.addEventListener(event, extendSession);
    });

    // Check session timeout periodically
    setInterval(() => this.checkSessionTimeout(), 60000); // Every minute
  }

  // Handle authentication errors
  handleAuthError(error) {
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      this.logout();
      Utils.showNotification('Session expired. Please login again.', 'warning');
    } else {
      Utils.handleError(error, 'Authentication');
    }
  }

  // Get user avatar URL
  getUserAvatarUrl() {
    if (this.currentUser && this.currentUser.profile.avatar) {
      return this.currentUser.profile.avatar;
    }
    return null;
  }

  // Get user display name
  getUserDisplayName() {
    if (!this.currentUser) return 'Guest';
    
    const { firstName, lastName } = this.currentUser.profile;
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else {
      return this.currentUser.username;
    }
  }

  // Check if user has 2FA enabled
  has2FAEnabled() {
    return this.currentUser && this.currentUser.security.twoFactorAuth.enabled;
  }

  // Get user language preference
  getUserLanguage() {
    return this.getUserPreference('language', 'fa');
  }

  // Get user theme preference
  getUserTheme() {
    return this.getUserPreference('theme', 'light');
  }

  // Apply user preferences
  applyUserPreferences() {
    if (!this.currentUser) return;

    // Apply language
    const language = this.getUserLanguage();
    if (i18n.getLanguage() !== language) {
      i18n.setLanguage(language);
    }

    // Apply theme
    const theme = this.getUserTheme();
    if (Utils.getTheme() !== theme) {
      Utils.setTheme(theme);
    }
  }

  // Update user preferences
  async updateUserPreferences(preferences) {
    try {
      const response = await api.updateProfile(preferences);
      
      if (response.success) {
        this.currentUser = response.user;
        this.applyUserPreferences();
        Utils.showNotification('Preferences updated successfully', 'success');
      }
      
      return response;
    } catch (error) {
      Utils.handleError(error, 'Update Preferences');
      throw error;
    }
  }
}

// Create global auth manager instance
window.auth = new AuthManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}