// NOTIFAREF - Internationalization System

class I18n {
  constructor() {
    this.currentLanguage = 'fa';
    this.translations = {};
    this.fallbackLanguage = 'en';
    this.init();
  }

  init() {
    // Load translations
    this.loadTranslations();
    
    // Set initial language from localStorage or default
    const savedLanguage = localStorage.getItem('notifaref_language') || 'fa';
    this.setLanguage(savedLanguage);
  }

  loadTranslations() {
    this.translations = {
      fa: {
        // Common
        common: {
          loading: 'در حال بارگذاری...',
          save: 'ذخیره',
          cancel: 'لغو',
          delete: 'حذف',
          edit: 'ویرایش',
          close: 'بستن',
          back: 'بازگشت',
          next: 'بعدی',
          previous: 'قبلی',
          view_all: 'مشاهده همه',
          dismiss: 'رد کردن',
          confirm: 'تأیید',
          error: 'خطا',
          success: 'موفقیت',
          warning: 'هشدار',
          info: 'اطلاعات'
        },

        // Navigation
        nav: {
          features: 'ویژگی‌ها',
          about: 'درباره ما',
          contact: 'تماس',
          dashboard: 'داشبورد',
          reminders: 'یادآوری‌ها',
          calendar: 'تقویم',
          analytics: 'آمار',
          settings: 'تنظیمات',
          profile: 'پروفایل'
        },

        // Authentication
        auth: {
          login: 'ورود',
          register: 'ثبت نام',
          logout: 'خروج',
          username: 'نام کاربری',
          email: 'ایمیل',
          password: 'رمز عبور',
          first_name: 'نام',
          last_name: 'نام خانوادگی',
          confirm_password: 'تأیید رمز عبور',
          forgot_password: 'فراموشی رمز عبور',
          remember_me: 'مرا به خاطر بسپار',
          no_account: 'حساب کاربری ندارید؟ ثبت نام کنید',
          have_account: 'حساب کاربری دارید؟ وارد شوید',
          2fa_code: 'کد احراز هویت دو مرحله‌ای',
          login_success: 'ورود موفقیت‌آمیز',
          register_success: 'ثبت نام موفقیت‌آمیز',
          logout_success: 'خروج موفقیت‌آمیز'
        },

        // Hero Section
        hero: {
          title: 'سیستم یادآوری هوشمند',
          subtitle: 'یادآوری‌های خود را مدیریت کنید، اعلان‌های هوشمند دریافت کنید و با تقویم گوگل همگام‌سازی کنید',
          get_started: 'شروع کنید',
          learn_more: 'بیشتر بدانید',
          features: {
            notifications: 'اعلان‌های هوشمند',
            calendar: 'همگام‌سازی تقویم',
            pwa: 'اپلیکیشن وب'
          }
        },

        // Features
        features: {
          title: 'ویژگی‌های کلیدی',
          subtitle: 'همه چیزی که برای مدیریت یادآوری‌های خود نیاز دارید',
          notifications: {
            title: 'اعلان‌های هوشمند',
            description: 'دریافت اعلان‌های وب و ایمیل در زمان مناسب با پشتیبانی از اولویت‌بندی'
          },
          calendar: {
            title: 'همگام‌سازی تقویم',
            description: 'اتصال به تقویم گوگل و همگام‌سازی خودکار یادآوری‌ها'
          },
          recurring: {
            title: 'یادآوری‌های تکراری',
            description: 'تنظیم یادآوری‌های روزانه، هفتگی، ماهانه و سالانه'
          },
          sharing: {
            title: 'اشتراک‌گذاری',
            description: 'اشتراک‌گذاری یادآوری‌ها با دیگران از طریق لینک امن'
          },
          analytics: {
            title: 'آمار و گزارش',
            description: 'مشاهده آمار عملکرد و گزارش‌های تفصیلی از یادآوری‌ها'
          },
          security: {
            title: 'امنیت بالا',
            description: 'احراز هویت دو مرحله‌ای و رمزگذاری داده‌ها'
          }
        },

        // About
        about: {
          title: 'درباره NOTIFAREF',
          description: 'NOTIFAREF یک سیستم یادآوری هوشمند و مدرن است که به شما کمک می‌کند تا هیچ کار مهمی را فراموش نکنید. با استفاده از تکنولوژی‌های روز دنیا و پشتیبانی از زبان فارسی، این اپلیکیشن تجربه‌ای بی‌نظیر از مدیریت زمان ارائه می‌دهد.',
          stats: {
            reliability: 'قابلیت اطمینان',
            availability: 'در دسترس',
            privacy: 'حریم خصوصی'
          }
        },

        // Footer
        footer: {
          description: 'سیستم یادآوری هوشمند برای مدیریت بهتر زمان شما',
          rights: 'تمامی حقوق محفوظ است.',
          home: 'صفحه اصلی',
          links: {
            title: 'لینک‌های مفید',
            features: 'ویژگی‌ها',
            about: 'درباره ما',
            dashboard: 'داشبورد'
          },
          support: {
            title: 'پشتیبانی',
            help: 'راهنما',
            contact: 'تماس با ما',
            privacy: 'حریم خصوصی'
          },
          social: {
            title: 'شبکه‌های اجتماعی'
          }
        },

        // Reminders
        reminders: {
          add: 'افزودن یادآوری',
          edit: 'ویرایش یادآوری',
          title: 'عنوان',
          description: 'توضیحات',
          date: 'تاریخ',
          time: 'زمان',
          priority: 'اولویت',
          recurrence: 'تکرار',
          tags: 'برچسب‌ها',
          tags_help: 'برچسب‌ها را با کاما از هم جدا کنید',
          scheduled_time: 'زمان برنامه‌ریزی شده',
          created_successfully: 'یادآوری با موفقیت ایجاد شد',
          updated_successfully: 'یادآوری با موفقیت به‌روزرسانی شد',
          deleted_successfully: 'یادآوری با موفقیت حذف شد'
        },

        // Status
        status: {
          pending: 'در انتظار',
          completed: 'تکمیل شده',
          cancelled: 'لغو شده',
          snoozed: 'به تعویق افتاده'
        },

        // Priority
        priority: {
          low: 'پایین',
          medium: 'متوسط',
          high: 'بالا',
          urgent: 'فوری'
        },

        // Recurrence
        recurrence: {
          none: 'بدون تکرار',
          daily: 'روزانه',
          weekly: 'هفتگی',
          monthly: 'ماهانه',
          yearly: 'سالانه'
        },

        // Dashboard
        dashboard: {
          quick_actions: 'اقدامات سریع',
          recent_reminders: 'یادآوری‌های اخیر',
          upcoming: 'آینده',
          overdue: 'عقب افتاده'
        },

        // Stats
        stats: {
          total_reminders: 'کل یادآوری‌ها',
          completed: 'تکمیل شده',
          pending: 'در انتظار',
          overdue: 'عقب افتاده',
          completion_rate: 'نرخ تکمیل'
        },

        // Filters
        filters: {
          all: 'همه',
          status: 'وضعیت',
          priority: 'اولویت',
          tags: 'برچسب‌ها',
          search: 'جستجو',
          clear: 'پاک کردن فیلترها'
        },

        // Pagination
        pagination: {
          previous: 'قبلی',
          next: 'بعدی',
          page: 'صفحه',
          of: 'از'
        },

        // Notifications
        notifications: {
          web_push: 'اعلان‌های وب',
          web_push_description: 'دریافت اعلان‌های فوری در مرورگر',
          email: 'اعلان‌های ایمیل',
          email_description: 'دریافت اعلان‌ها از طریق ایمیل',
          email_fallback: 'ایمیل به عنوان پشتیبان',
          test: 'تست اعلان',
          permission_granted: 'مجوز اعلان‌ها داده شد',
          permission_denied: 'مجوز اعلان‌ها رد شد',
          test_sent: 'اعلان تست ارسال شد'
        },

        // Calendar
        calendar: {
          connect: 'اتصال به گوگل',
          disconnect: 'قطع اتصال',
          sync: 'همگام‌سازی',
          not_connected: 'تقویم متصل نیست',
          connect_description: 'برای همگام‌سازی یادآوری‌ها با تقویم گوگل، اتصال برقرار کنید',
          connected: 'تقویم متصل است',
          sync_success: 'همگام‌سازی موفقیت‌آمیز'
        },

        // Analytics
        analytics: {
          completion_rate: 'نرخ تکمیل',
          priority_distribution: 'توزیع اولویت',
          period: {
            week: 'هفته گذشته',
            month: 'ماه گذشته',
            quarter: 'سه ماه گذشته',
            year: 'سال گذشته'
          }
        },

        // Profile
        profile: {
          general: 'اطلاعات عمومی',
          general_description: 'مدیریت اطلاعات شخصی حساب کاربری',
          notifications: 'تنظیمات اعلان‌ها',
          notifications_description: 'مدیریت نحوه دریافت اعلان‌ها',
          security: 'امنیت',
          security_description: 'مدیریت امنیت و احراز هویت',
          integrations: 'ادغام‌ها',
          integrations_description: 'اتصال به سرویس‌های خارجی',
          preferences: 'تنظیمات شخصی',
          preferences_description: 'سفارشی‌سازی تجربه کاربری',
          email_readonly: 'ایمیل قابل تغییر نیست',
          username_readonly: 'نام کاربری قابل تغییر نیست'
        },

        // Security
        security: {
          change_password: 'تغییر رمز عبور',
          password_description: 'رمز عبور قوی انتخاب کنید',
          current_password: 'رمز عبور فعلی',
          new_password: 'رمز عبور جدید',
          confirm_password: 'تأیید رمز عبور',
          2fa: 'احراز هویت دو مرحله‌ای',
          2fa_description: 'افزایش امنیت با کد تأیید',
          2fa_setup: 'تنظیم احراز هویت دو مرحله‌ای',
          enabled: 'فعال',
          disabled: 'غیرفعال',
          enable: 'فعال‌سازی',
          disable: 'غیرفعال‌سازی'
        },

        // Integrations
        integrations: {
          google_calendar: 'تقویم گوگل',
          calendar_description: 'همگام‌سازی با تقویم گوگل',
          connected: 'متصل',
          disconnected: 'قطع',
          connect: 'اتصال',
          disconnect: 'قطع اتصال'
        },

        // Preferences
        preferences: {
          appearance: 'ظاهر',
          language: 'زبان',
          theme: 'تم',
          timezone: 'منطقه زمانی',
          defaults: 'تنظیمات پیش‌فرض',
          default_priority: 'اولویت پیش‌فرض',
          default_time: 'زمان پیش‌فرض یادآوری'
        },

        // Themes
        themes: {
          light: 'روشن',
          dark: 'تیره',
          auto: 'خودکار'
        },

        // PWA
        pwa: {
          install: {
            title: 'نصب اپلیکیشن',
            description: 'NOTIFAREF را روی دستگاه خود نصب کنید',
            button: 'نصب'
          },
          installed: 'اپلیکیشن نصب شد',
          offline: 'حالت آفلاین'
        },

        // Shared
        shared: {
          badge: 'یادآوری اشتراکی',
          shared_by: 'اشتراک‌گذاری شده توسط',
          shared_on: 'تاریخ اشتراک',
          import: 'افزودن به یادآوری‌ها',
          error: {
            title: 'یادآوری یافت نشد',
            description: 'این یادآوری وجود ندارد یا منقضی شده است.',
            home: 'بازگشت به صفحه اصلی'
          },
          import_success: {
            title: 'یادآوری اضافه شد',
            description: 'یادآوری با موفقیت به حساب شما اضافه شد.',
            dashboard: 'مشاهده در داشبورد'
          },
          login_required: {
            title: 'ورود به حساب',
            description: 'برای افزودن این یادآوری به حساب خود، ابتدا وارد شوید.'
          },
          cta: {
            title: 'آیا می‌خواهید یادآوری‌های خود را مدیریت کنید؟',
            description: 'با NOTIFAREF حساب کاربری ایجاد کنید و یادآوری‌های هوشمند دریافت کنید',
            signup: 'ثبت نام رایگان',
            login: 'ورود به حساب'
          }
        }
      },

      en: {
        // Common
        common: {
          loading: 'Loading...',
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
          edit: 'Edit',
          close: 'Close',
          back: 'Back',
          next: 'Next',
          previous: 'Previous',
          view_all: 'View All',
          dismiss: 'Dismiss',
          confirm: 'Confirm',
          error: 'Error',
          success: 'Success',
          warning: 'Warning',
          info: 'Info'
        },

        // Navigation
        nav: {
          features: 'Features',
          about: 'About',
          contact: 'Contact',
          dashboard: 'Dashboard',
          reminders: 'Reminders',
          calendar: 'Calendar',
          analytics: 'Analytics',
          settings: 'Settings',
          profile: 'Profile'
        },

        // Authentication
        auth: {
          login: 'Login',
          register: 'Register',
          logout: 'Logout',
          username: 'Username',
          email: 'Email',
          password: 'Password',
          first_name: 'First Name',
          last_name: 'Last Name',
          confirm_password: 'Confirm Password',
          forgot_password: 'Forgot Password',
          remember_me: 'Remember Me',
          no_account: 'Don\'t have an account? Sign up',
          have_account: 'Have an account? Sign in',
          2fa_code: 'Two-Factor Authentication Code',
          login_success: 'Login Successful',
          register_success: 'Registration Successful',
          logout_success: 'Logout Successful'
        },

        // Hero Section
        hero: {
          title: 'Smart Reminder System',
          subtitle: 'Manage your reminders, receive smart notifications, and sync with Google Calendar',
          get_started: 'Get Started',
          learn_more: 'Learn More',
          features: {
            notifications: 'Smart Notifications',
            calendar: 'Calendar Sync',
            pwa: 'Web App'
          }
        },

        // Features
        features: {
          title: 'Key Features',
          subtitle: 'Everything you need to manage your reminders',
          notifications: {
            title: 'Smart Notifications',
            description: 'Receive web and email notifications at the right time with priority support'
          },
          calendar: {
            title: 'Calendar Sync',
            description: 'Connect to Google Calendar and automatically sync reminders'
          },
          recurring: {
            title: 'Recurring Reminders',
            description: 'Set daily, weekly, monthly, and yearly reminders'
          },
          sharing: {
            title: 'Sharing',
            description: 'Share reminders with others through secure links'
          },
          analytics: {
            title: 'Analytics & Reports',
            description: 'View performance stats and detailed reports of your reminders'
          },
          security: {
            title: 'High Security',
            description: 'Two-factor authentication and data encryption'
          }
        },

        // About
        about: {
          title: 'About NOTIFAREF',
          description: 'NOTIFAREF is a smart and modern reminder system that helps you never forget any important task. Using cutting-edge technologies and Persian language support, this application provides an unparalleled time management experience.',
          stats: {
            reliability: 'Reliability',
            availability: 'Available',
            privacy: 'Privacy'
          }
        },

        // Footer
        footer: {
          description: 'Smart reminder system for better time management',
          rights: 'All rights reserved.',
          home: 'Home',
          links: {
            title: 'Useful Links',
            features: 'Features',
            about: 'About',
            dashboard: 'Dashboard'
          },
          support: {
            title: 'Support',
            help: 'Help',
            contact: 'Contact Us',
            privacy: 'Privacy'
          },
          social: {
            title: 'Social Media'
          }
        },

        // Reminders
        reminders: {
          add: 'Add Reminder',
          edit: 'Edit Reminder',
          title: 'Title',
          description: 'Description',
          date: 'Date',
          time: 'Time',
          priority: 'Priority',
          recurrence: 'Recurrence',
          tags: 'Tags',
          tags_help: 'Separate tags with commas',
          scheduled_time: 'Scheduled Time',
          created_successfully: 'Reminder created successfully',
          updated_successfully: 'Reminder updated successfully',
          deleted_successfully: 'Reminder deleted successfully'
        },

        // Status
        status: {
          pending: 'Pending',
          completed: 'Completed',
          cancelled: 'Cancelled',
          snoozed: 'Snoozed'
        },

        // Priority
        priority: {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
          urgent: 'Urgent'
        },

        // Recurrence
        recurrence: {
          none: 'No Repeat',
          daily: 'Daily',
          weekly: 'Weekly',
          monthly: 'Monthly',
          yearly: 'Yearly'
        },

        // Dashboard
        dashboard: {
          quick_actions: 'Quick Actions',
          recent_reminders: 'Recent Reminders',
          upcoming: 'Upcoming',
          overdue: 'Overdue'
        },

        // Stats
        stats: {
          total_reminders: 'Total Reminders',
          completed: 'Completed',
          pending: 'Pending',
          overdue: 'Overdue',
          completion_rate: 'Completion Rate'
        },

        // Filters
        filters: {
          all: 'All',
          status: 'Status',
          priority: 'Priority',
          tags: 'Tags',
          search: 'Search',
          clear: 'Clear Filters'
        },

        // Pagination
        pagination: {
          previous: 'Previous',
          next: 'Next',
          page: 'Page',
          of: 'of'
        },

        // Notifications
        notifications: {
          web_push: 'Web Notifications',
          web_push_description: 'Receive instant notifications in browser',
          email: 'Email Notifications',
          email_description: 'Receive notifications via email',
          email_fallback: 'Email as fallback',
          test: 'Test Notification',
          permission_granted: 'Notification permission granted',
          permission_denied: 'Notification permission denied',
          test_sent: 'Test notification sent'
        },

        // Calendar
        calendar: {
          connect: 'Connect to Google',
          disconnect: 'Disconnect',
          sync: 'Sync',
          not_connected: 'Calendar not connected',
          connect_description: 'Connect to Google Calendar to sync your reminders',
          connected: 'Calendar connected',
          sync_success: 'Sync successful'
        },

        // Analytics
        analytics: {
          completion_rate: 'Completion Rate',
          priority_distribution: 'Priority Distribution',
          period: {
            week: 'Last Week',
            month: 'Last Month',
            quarter: 'Last Quarter',
            year: 'Last Year'
          }
        },

        // Profile
        profile: {
          general: 'General Information',
          general_description: 'Manage your personal account information',
          notifications: 'Notification Settings',
          notifications_description: 'Manage how you receive notifications',
          security: 'Security',
          security_description: 'Manage security and authentication',
          integrations: 'Integrations',
          integrations_description: 'Connect to external services',
          preferences: 'Preferences',
          preferences_description: 'Customize your user experience',
          email_readonly: 'Email cannot be changed',
          username_readonly: 'Username cannot be changed'
        },

        // Security
        security: {
          change_password: 'Change Password',
          password_description: 'Choose a strong password',
          current_password: 'Current Password',
          new_password: 'New Password',
          confirm_password: 'Confirm Password',
          2fa: 'Two-Factor Authentication',
          2fa_description: 'Increase security with verification code',
          2fa_setup: 'Setup Two-Factor Authentication',
          enabled: 'Enabled',
          disabled: 'Disabled',
          enable: 'Enable',
          disable: 'Disable'
        },

        // Integrations
        integrations: {
          google_calendar: 'Google Calendar',
          calendar_description: 'Sync with Google Calendar',
          connected: 'Connected',
          disconnected: 'Disconnected',
          connect: 'Connect',
          disconnect: 'Disconnect'
        },

        // Preferences
        preferences: {
          appearance: 'Appearance',
          language: 'Language',
          theme: 'Theme',
          timezone: 'Timezone',
          defaults: 'Default Settings',
          default_priority: 'Default Priority',
          default_time: 'Default Reminder Time'
        },

        // Themes
        themes: {
          light: 'Light',
          dark: 'Dark',
          auto: 'Auto'
        },

        // PWA
        pwa: {
          install: {
            title: 'Install App',
            description: 'Install NOTIFAREF on your device',
            button: 'Install'
          },
          installed: 'App Installed',
          offline: 'Offline Mode'
        },

        // Shared
        shared: {
          badge: 'Shared Reminder',
          shared_by: 'Shared by',
          shared_on: 'Shared on',
          import: 'Add to Reminders',
          error: {
            title: 'Reminder Not Found',
            description: 'This reminder does not exist or has expired.',
            home: 'Back to Home'
          },
          import_success: {
            title: 'Reminder Added',
            description: 'Reminder has been successfully added to your account.',
            dashboard: 'View in Dashboard'
          },
          login_required: {
            title: 'Login Required',
            description: 'Please login first to add this reminder to your account.'
          },
          cta: {
            title: 'Want to manage your own reminders?',
            description: 'Create an account with NOTIFAREF and receive smart reminders',
            signup: 'Free Sign Up',
            login: 'Login to Account'
          }
        }
      }
    };
  }

  setLanguage(language) {
    if (!this.translations[language]) {
      console.warn(`Language ${language} not supported, falling back to ${this.fallbackLanguage}`);
      language = this.fallbackLanguage;
    }

    this.currentLanguage = language;
    localStorage.setItem('notifaref_language', language);
    
    // Update document attributes
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    document.body.setAttribute('data-lang', language);
    
    // Update all translatable elements
    this.updateTranslations();
    
    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language, direction: language === 'fa' ? 'rtl' : 'ltr' }
    }));
  }

  getLanguage() {
    return this.currentLanguage;
  }

  getDirection() {
    return this.currentLanguage === 'fa' ? 'rtl' : 'ltr';
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = this.translations[this.fallbackLanguage];
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            console.warn(`Translation key not found: ${key}`);
            return key;
          }
        }
        break;
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }
    
    // Replace parameters
    return this.interpolate(value, params);
  }

  interpolate(text, params) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  updateTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'email')) {
        element.placeholder = translation;
      } else if (element.tagName === 'INPUT' && element.type === 'submit') {
        element.value = translation;
      } else {
        element.textContent = translation;
      }
    });
    
    // Update page title
    const titleKey = document.body.getAttribute('data-title-key');
    if (titleKey) {
      document.title = this.t(titleKey);
    }
  }

  // Format numbers for current locale
  formatNumber(number) {
    const locale = this.currentLanguage === 'fa' ? 'fa-IR' : 'en-US';
    return new Intl.NumberFormat(locale).format(number);
  }

  // Format dates for current locale
  formatDate(date, options = {}) {
    const locale = this.currentLanguage === 'fa' ? 'fa-IR' : 'en-US';
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    
    return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
  }

  // Format time for current locale
  formatTime(date, options = {}) {
    const locale = this.currentLanguage === 'fa' ? 'fa-IR' : 'en-US';
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
  }

  // Format relative time (e.g., "2 hours ago")
  formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (this.currentLanguage === 'fa') {
      if (days > 0) return `${days} روز پیش`;
      if (hours > 0) return `${hours} ساعت پیش`;
      if (minutes > 0) return `${minutes} دقیقه پیش`;
      return 'همین الان';
    } else {
      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      return 'just now';
    }
  }

  // Get available languages
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }

  // Check if language is RTL
  isRTL(language = this.currentLanguage) {
    return language === 'fa';
  }
}

// Create global instance
window.i18n = new I18n();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18n;
}