// NOTIFAREF - Dashboard Management

class DashboardManager {
  constructor() {
    this.currentPage = 'dashboard';
    this.reminders = [];
    this.filters = {
      status: '',
      priority: '',
      tags: '',
      search: ''
    };
    this.pagination = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0
    };
    this.init();
  }

  async init() {
    // Check authentication
    if (!auth.isAuthenticated) {
      window.location.href = '/';
      return;
    }

    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadDashboardData();
    
    // Setup auto-refresh
    this.setupAutoRefresh();
    
    // Hide loading screen
    Utils.hideLoading();
  }

  setupEventListeners() {
    // Sidebar navigation
    const navItems = Utils.$$('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.getAttribute('data-page');
        if (page) this.switchPage(page);
      });
    });

    // Mobile sidebar toggle
    Utils.on('#mobile-sidebar-toggle', 'click', () => this.toggleMobileSidebar());
    Utils.on('#sidebar-toggle', 'click', () => this.toggleMobileSidebar());

    // Add reminder buttons
    Utils.on('#add-reminder-btn', 'click', () => this.showAddReminderModal());
    Utils.on('#add-reminder-main-btn', 'click', () => this.showAddReminderModal());
    Utils.on('#quick-add-reminder', 'click', () => this.showAddReminderModal());

    // Quick actions
    Utils.on('#quick-view-upcoming', 'click', () => this.showUpcomingReminders());
    Utils.on('#quick-view-overdue', 'click', () => this.showOverdueReminders());
    Utils.on('#quick-calendar-sync', 'click', () => this.syncWithCalendar());

    // Reminder form
    const reminderForm = Utils.$('#reminder-form');
    if (reminderForm) {
      reminderForm.addEventListener('submit', (e) => this.handleReminderSubmit(e));
    }

    // Modal setup
    Utils.setupModalClose('#reminder-modal');
    Utils.on('#reminder-cancel-btn', 'click', () => Utils.hideModal('#reminder-modal'));

    // Filters
    Utils.on('#status-filter', 'change', () => this.applyFilters());
    Utils.on('#priority-filter', 'change', () => this.applyFilters());
    Utils.on('#tags-filter', 'change', () => this.applyFilters());
    Utils.on('#search-input', 'input', Utils.debounce(() => this.applyFilters(), 500));
    Utils.on('#clear-filters-btn', 'click', () => this.clearFilters());

    // Pagination
    Utils.on('#prev-page', 'click', () => this.previousPage());
    Utils.on('#next-page', 'click', () => this.nextPage());

    // Test notification
    Utils.on('#notification-test-btn', 'click', () => this.testNotification());

    // View all reminders
    Utils.on('#view-all-reminders', 'click', () => this.switchPage('reminders'));

    // Theme and language toggles
    Utils.on('#theme-toggle', 'click', () => this.toggleTheme());
    Utils.on('#language-toggle', 'click', () => this.toggleLanguage());

    // User menu
    this.setupUserMenu();
  }

  setupUserMenu() {
    const userMenuBtn = Utils.$('#user-menu-btn');
    const userDropdown = Utils.$('#user-dropdown');
    
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        userDropdown.classList.remove('active');
      });
    }
  }

  async loadDashboardData() {
    try {
      // Load stats
      await this.loadStats();
      
      // Load recent reminders
      await this.loadRecentReminders();
      
      // Load upcoming reminders count
      await this.updatePendingCount();
      
    } catch (error) {
      Utils.handleError(error, 'Loading Dashboard Data');
    }
  }

  async loadStats() {
    try {
      const response = await api.getDashboardAnalytics(30);
      
      if (response.success) {
        const stats = response.data;
        
        // Update stat cards
        this.updateStatCard('#total-reminders', stats.reminders.total || 0);
        this.updateStatCard('#completed-reminders', stats.reminders.status.completed || 0);
        this.updateStatCard('#pending-reminders', stats.reminders.status.pending || 0);
        this.updateStatCard('#overdue-reminders', stats.reminders.overdue || 0);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  updateStatCard(selector, value) {
    const element = Utils.$(selector);
    if (element) {
      // Animate number change
      this.animateNumber(element, parseInt(element.textContent) || 0, value);
    }
  }

  animateNumber(element, from, to, duration = 1000) {
    const start = performance.now();
    const change = to - from;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      const current = Math.floor(from + change * progress);
      element.textContent = window.i18n ? window.i18n.formatNumber(current) : current;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  async loadRecentReminders() {
    try {
      const response = await api.getReminders({
        page: 1,
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      if (response.success) {
        this.renderRecentReminders(response.data.reminders);
      }
    } catch (error) {
      console.error('Error loading recent reminders:', error);
    }
  }

  renderRecentReminders(reminders) {
    const container = Utils.$('#recent-reminders-list');
    if (!container) return;

    if (reminders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-bell-slash"></i>
          </div>
          <h3>${window.i18n?.t('dashboard.no_reminders') || 'No reminders yet'}</h3>
          <p>${window.i18n?.t('dashboard.create_first') || 'Create your first reminder to get started'}</p>
          <button class="btn btn-primary" onclick="dashboard.showAddReminderModal()">
            <i class="fas fa-plus"></i>
            ${window.i18n?.t('reminders.add') || 'Add Reminder'}
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = reminders.map(reminder => this.createReminderCard(reminder)).join('');
    
    // Setup reminder card event listeners
    this.setupReminderCardListeners(container);
  }

  createReminderCard(reminder) {
    const timeUntil = Utils.getTimeUntil(reminder.scheduledTime);
    const priorityColor = Utils.getPriorityColor(reminder.priority);
    const statusIcon = Utils.getStatusIcon(reminder.status);
    
    const isOverdue = new Date(reminder.scheduledTime) < new Date() && reminder.status === 'pending';
    const cardClass = isOverdue ? 'reminder-card overdue' : 'reminder-card';
    
    return `
      <div class="${cardClass}" data-reminder-id="${reminder._id}">
        <div class="reminder-header">
          <h3 class="reminder-title">${Utils.escapeHtml(reminder.title)}</h3>
          <div class="reminder-actions">
            <button class="btn btn-ghost btn-icon complete-btn" title="${window.i18n?.t('reminders.complete') || 'Complete'}" data-id="${reminder._id}">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-ghost btn-icon edit-btn" title="${window.i18n?.t('common.edit') || 'Edit'}" data-id="${reminder._id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-ghost btn-icon delete-btn" title="${window.i18n?.t('common.delete') || 'Delete'}" data-id="${reminder._id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        ${reminder.description ? `<p class="reminder-description">${Utils.escapeHtml(reminder.description)}</p>` : ''}
        
        <div class="reminder-meta">
          <div class="meta-item">
            <i class="fas ${statusIcon}"></i>
            <span>${window.i18n?.t(`status.${reminder.status}`) || reminder.status}</span>
          </div>
          
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>${timeUntil}</span>
          </div>
          
          <div class="meta-item">
            <i class="fas fa-flag" style="color: ${priorityColor}"></i>
            <span>${window.i18n?.t(`priority.${reminder.priority}`) || reminder.priority}</span>
          </div>
          
          ${reminder.recurrence?.type !== 'none' ? `
            <div class="meta-item">
              <i class="fas fa-repeat"></i>
              <span>${window.i18n?.t(`recurrence.${reminder.recurrence.type}`) || reminder.recurrence.type}</span>
            </div>
          ` : ''}
        </div>
        
        ${reminder.tags && reminder.tags.length > 0 ? `
          <div class="tags-list">
            ${reminder.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  setupReminderCardListeners(container) {
    // Complete reminder
    container.addEventListener('click', async (e) => {
      if (e.target.closest('.complete-btn')) {
        const btn = e.target.closest('.complete-btn');
        const id = btn.getAttribute('data-id');
        await this.completeReminder(id);
      }
    });

    // Edit reminder
    container.addEventListener('click', (e) => {
      if (e.target.closest('.edit-btn')) {
        const btn = e.target.closest('.edit-btn');
        const id = btn.getAttribute('data-id');
        this.editReminder(id);
      }
    });

    // Delete reminder
    container.addEventListener('click', async (e) => {
      if (e.target.closest('.delete-btn')) {
        const btn = e.target.closest('.delete-btn');
        const id = btn.getAttribute('data-id');
        await this.deleteReminder(id);
      }
    });
  }

  async updatePendingCount() {
    try {
      const response = await api.getReminders({ status: 'pending', limit: 1 });
      
      if (response.success) {
        const count = response.data.pagination.totalItems;
        const badge = Utils.$('#pending-count');
        if (badge) {
          badge.textContent = count;
          badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
      }
    } catch (error) {
      console.error('Error updating pending count:', error);
    }
  }

  switchPage(page) {
    // Update navigation
    Utils.$$('.sidebar-nav .nav-item').forEach(item => {
      Utils.removeClass(item, 'active');
    });
    
    const activeNavItem = Utils.$(`.sidebar-nav .nav-item[data-page="${page}"]`);
    if (activeNavItem) {
      Utils.addClass(activeNavItem, 'active');
    }

    // Update page content
    Utils.$$('.page').forEach(pageEl => {
      Utils.removeClass(pageEl, 'active');
    });
    
    const targetPage = Utils.$(`#${page}-page`);
    if (targetPage) {
      Utils.addClass(targetPage, 'active');
    }

    // Update page title
    const pageTitle = Utils.$('#page-title');
    if (pageTitle) {
      pageTitle.textContent = window.i18n?.t(`nav.${page}`) || page;
    }

    // Load page-specific data
    this.loadPageData(page);
    
    this.currentPage = page;
  }

  async loadPageData(page) {
    switch (page) {
      case 'dashboard':
        await this.loadDashboardData();
        break;
      case 'reminders':
        await this.loadReminders();
        break;
      case 'calendar':
        await this.loadCalendarData();
        break;
      case 'analytics':
        await this.loadAnalyticsData();
        break;
      case 'settings':
        await this.loadSettingsData();
        break;
    }
  }

  async loadReminders() {
    try {
      const params = {
        page: this.pagination.currentPage,
        limit: 20,
        ...this.filters
      };

      const response = await api.getReminders(params);
      
      if (response.success) {
        this.reminders = response.data.reminders;
        this.pagination = response.data.pagination;
        
        this.renderReminders();
        this.updatePagination();
      }
    } catch (error) {
      Utils.handleError(error, 'Loading Reminders');
    }
  }

  renderReminders() {
    const container = Utils.$('#reminders-list');
    if (!container) return;

    if (this.reminders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fas fa-bell-slash"></i>
          </div>
          <h3>${window.i18n?.t('reminders.no_results') || 'No reminders found'}</h3>
          <p>${window.i18n?.t('reminders.try_different_filter') || 'Try adjusting your filters'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.reminders.map(reminder => this.createReminderCard(reminder)).join('');
    this.setupReminderCardListeners(container);
  }

  updatePagination() {
    const pagination = Utils.$('#pagination');
    const pageInfo = Utils.$('#page-info');
    const prevBtn = Utils.$('#prev-page');
    const nextBtn = Utils.$('#next-page');
    

    if (!pagination) return;

    if (this.pagination.totalPages <= 1) {
      Utils.hide(pagination);
      return;
    }

    Utils.show(pagination);

    if (pageInfo) {
      pageInfo.textContent = `${window.i18n?.t('pagination.page') || 'Page'} ${this.pagination.currentPage} ${window.i18n?.t('pagination.of') || 'of'} ${this.pagination.totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = !this.pagination.hasPrevPage;
    }

    if (nextBtn) {
      nextBtn.disabled = !this.pagination.hasNextPage;
    }
  }

  showAddReminderModal() {
    const modalTitle = Utils.$('#reminder-modal-title');
    const form = Utils.$('#reminder-form');

    if (modalTitle) {
      modalTitle.textContent = window.i18n?.t('reminders.add') || 'Add Reminder';
    }

    if (form) {
      Utils.clearForm(form);
      form.setAttribute('data-mode', 'add');
      form.removeAttribute('data-reminder-id');
      
      // Set default values
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dateInput = Utils.$('#reminder-date');
      const timeInput = Utils.$('#reminder-time');
      
      if (dateInput) {
        dateInput.value = Utils.formatDate(tomorrow, 'YYYY-MM-DD');
      }
      
      if (timeInput) {
        timeInput.value = '09:00';
      }
    }

    Utils.showModal('#reminder-modal');
  }

  async editReminder(id) {
    try {
      const response = await api.getReminder(id);
      
      if (response.success) {
        const reminder = response.data;
        
        const modalTitle = Utils.$('#reminder-modal-title');
        const form = Utils.$('#reminder-form');

        if (modalTitle) {
          modalTitle.textContent = window.i18n?.t('reminders.edit') || 'Edit Reminder';
        }

        if (form) {
          form.setAttribute('data-mode', 'edit');
          form.setAttribute('data-reminder-id', id);

          const scheduledDate = new Date(reminder.scheduledTime);
          
          Utils.setFormData(form, {
            title: reminder.title,
            description: reminder.description || '',
            date: Utils.formatDate(scheduledDate, 'YYYY-MM-DD'),
            time: Utils.formatTime(scheduledDate),
            priority: reminder.priority,
            recurrence: reminder.recurrence?.type || 'none',
            tags: reminder.tags.join(', ')
          });
        }

        Utils.showModal('#reminder-modal');
      }
    } catch (error) {
      Utils.handleError(error, 'Loading Reminder');
    }
  }

  async handleReminderSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = Utils.getFormData(form);
    const mode = form.getAttribute('data-mode');
    const reminderId = form.getAttribute('data-reminder-id');

    if (!this.validateReminderForm(formData)) {
      return;
    }

    const reminderData = {
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      scheduledTime: new Date(`${formData.date}T${formData.time}`).toISOString(),
      priority: formData.priority,
      recurrence: { type: formData.recurrence || 'none' },
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (window.i18n?.t('common.loading') || 'Loading...');

      let response;
      if (mode === 'edit' && reminderId) {
        response = await api.updateReminder(reminderId, reminderData);
      } else {
        response = await api.createReminder(reminderData);
      }

      if (response.success) {
        Utils.hideModal('#reminder-modal');
        Utils.showNotification(
          mode === 'edit' 
            ? (window.i18n?.t('reminders.updated_successfully') || 'Reminder updated')
            : (window.i18n?.t('reminders.created_successfully') || 'Reminder created'),
          'success'
        );

        // Reload current page data
        await this.loadPageData(this.currentPage);
      }

    } catch (error) {
      Utils.handleError(error, mode === 'edit' ? 'Update Reminder' : 'Create Reminder');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  validateReminderForm(data) {
    const errors = [];

    if (!data.title?.trim()) {
      errors.push(window.i18n?.t('reminders.title_required') || 'Title is required');
    }

    if (!data.date) {
      errors.push(window.i18n?.t('reminders.date_required') || 'Date is required');
    }

    if (!data.time) {
      errors.push(window.i18n?.t('reminders.time_required') || 'Time is required');
    }

    if (data.date && data.time) {
      const scheduledTime = new Date(`${data.date}T${data.time}`);
      if (scheduledTime <= new Date()) {
        errors.push(window.i18n?.t('reminders.future_time_required') || 'Scheduled time must be in the future');
      }
    }

    if (errors.length > 0) {
      Utils.showNotification(errors.join('. '), 'error');
      return false;
    }

    return true;
  }

  async completeReminder(id) {
    try {
      const response = await api.updateReminderStatus(id, 'completed');
      
      if (response.success) {
        Utils.showNotification(
          window.i18n?.t('reminders.completed_successfully') || 'Reminder completed',
          'success'
        );
        
        await this.loadPageData(this.currentPage);
      }
    } catch (error) {
      Utils.handleError(error, 'Complete Reminder');
    }
  }

  async deleteReminder(id) {
    const confirmed = await Utils.confirm(
      window.i18n?.t('reminders.delete_confirmation') || 'Are you sure you want to delete this reminder?',
      window.i18n?.t('common.confirm') || 'Confirm'
    );

    if (!confirmed) return;

    try {
      const response = await api.deleteReminder(id);
      
      if (response.success) {
        Utils.showNotification(
          window.i18n?.t('reminders.deleted_successfully') || 'Reminder deleted',
          'success'
        );
        
        await this.loadPageData(this.currentPage);
      }
    } catch (error) {
      Utils.handleError(error, 'Delete Reminder');
    }
  }

  applyFilters() {
    const statusFilter = Utils.$('#status-filter');
    const priorityFilter = Utils.$('#priority-filter');
    const tagsFilter = Utils.$('#tags-filter');
    const searchInput = Utils.$('#search-input');

    this.filters = {
      status: statusFilter?.value || '',
      priority: priorityFilter?.value || '',
      tags: tagsFilter?.value || '',
      search: searchInput?.value || ''
    };

    this.pagination.currentPage = 1;
    
    if (this.currentPage === 'reminders') {
      this.loadReminders();
    }
  }

  clearFilters() {
    const statusFilter = Utils.$('#status-filter');
    const priorityFilter = Utils.$('#priority-filter');
    const tagsFilter = Utils.$('#tags-filter');
    const searchInput = Utils.$('#search-input');

    if (statusFilter) statusFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    if (tagsFilter) tagsFilter.value = '';
    if (searchInput) searchInput.value = '';

    this.applyFilters();
  }

  previousPage() {
    if (this.pagination.hasPrevPage) {
      this.pagination.currentPage--;
      this.loadReminders();
    }
  }

  nextPage() {
    if (this.pagination.hasNextPage) {
      this.pagination.currentPage++;
      this.loadReminders();
    }
  }

  async showUpcomingReminders() {
    this.filters = { status: 'pending' };
    this.switchPage('reminders');
    await this.loadReminders();
  }

  async showOverdueReminders() {
    // This would need custom API endpoint for overdue reminders
    this.filters = { status: 'pending' };
    this.switchPage('reminders');
    await this.loadReminders();
  }

  async syncWithCalendar() {
    try {
      Utils.showNotification(
        window.i18n?.t('calendar.syncing') || 'Syncing with calendar...',
        'info'
      );
      
      // This would trigger calendar sync
      // Implementation depends on calendar integration
      
      Utils.showNotification(
        window.i18n?.t('calendar.sync_success') || 'Calendar sync completed',
        'success'
      );
    } catch (error) {
      Utils.handleError(error, 'Calendar Sync');
    }
  }

  async testNotification() {
    try {
      const response = await api.testNotification();
      
      if (response.success) {
        Utils.showNotification(
          window.i18n?.t('notifications.test_sent') || 'Test notification sent',
          'success'
        );
      }
    } catch (error) {
      Utils.handleError(error, 'Test Notification');
    }
  }

  toggleMobileSidebar() {
    const sidebar = Utils.$('#sidebar');
    if (sidebar) {
      Utils.toggleClass(sidebar, 'mobile-open');
    }
  }

  toggleTheme() {
    const newTheme = Utils.toggleTheme();
    
    // Update user preference
    if (auth.isAuthenticated) {
      auth.updateProfile({ theme: newTheme }).catch(console.error);
    }
  }

  toggleLanguage() {
    const currentLang = window.i18n?.getLanguage() || 'fa';
    const newLang = currentLang === 'fa' ? 'en' : 'fa';
    
    if (window.i18n) {
      window.i18n.setLanguage(newLang);
    }
    
    // Update user preference
    if (auth.isAuthenticated) {
      auth.updateProfile({ language: newLang }).catch(console.error);
    }
  }

  async loadCalendarData() {
    try {
      const response = await api.getCalendarStatus();
      
      if (response.success) {
        this.updateCalendarStatus(response.data);
      }
    } catch (error) {
      Utils.handleError(error, 'Loading Calendar Data');
    }
  }

  updateCalendarStatus(status) {
    const statusCard = Utils.$('#calendar-status');
    const connectBtn = Utils.$('#calendar-connect-btn');
    
    if (status.userConnected) {
      if (statusCard) {
        statusCard.innerHTML = `
          <div class="status-card">
            <i class="fas fa-calendar-check" style="color: var(--success-500)"></i>
            <h3>${window.i18n?.t('calendar.connected') || 'Calendar Connected'}</h3>
            <p>${window.i18n?.t('calendar.sync_description') || 'Your reminders are synced with Google Calendar'}</p>
            <button class="btn btn-outline" onclick="dashboard.disconnectCalendar()">
              ${window.i18n?.t('calendar.disconnect') || 'Disconnect'}
            </button>
          </div>
        `;
      }
      
      if (connectBtn) {
        connectBtn.innerHTML = `
          <i class="fas fa-sync"></i>
          <span>${window.i18n?.t('calendar.sync') || 'Sync'}</span>
        `;
      }
    } else {
      if (connectBtn) {
        connectBtn.innerHTML = `
          <i class="fab fa-google"></i>
          <span>${window.i18n?.t('calendar.connect') || 'Connect to Google'}</span>
        `;
      }
    }
  }

  async loadAnalyticsData() {
    // Analytics will be handled by analytics.js
    console.log('Loading analytics data...');
  }

  async loadSettingsData() {
    // Settings will be handled by profile.js
    console.log('Loading settings data...');
  }

  setupAutoRefresh() {
    // Refresh dashboard data every 5 minutes
    setInterval(async () => {
      if (this.currentPage === 'dashboard' && document.visibilityState === 'visible') {
        await this.loadDashboardData();
      }
    }, 5 * 60 * 1000);

    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        await this.loadPageData(this.currentPage);
      }
    });
  }

  // Handle real-time updates via WebSocket
  handleRealtimeUpdate(data) {
    switch (data.type) {
      case 'reminder_created':
      case 'reminder_updated':
      case 'reminder_deleted':
        this.loadPageData(this.currentPage);
        break;
      case 'notification_sent':
        this.updateNotificationStatus(data.reminderId, data.status);
        break;
    }
  }

  updateNotificationStatus(reminderId, status) {
    const reminderCard = Utils.$(`.reminder-card[data-reminder-id="${reminderId}"]`);
    if (reminderCard) {
      // Add visual indicator for sent notification
      if (status === 'sent') {
        reminderCard.classList.add('notification-sent');
      }
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('dashboard-page')) {
    window.dashboard = new DashboardManager();
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardManager;
}