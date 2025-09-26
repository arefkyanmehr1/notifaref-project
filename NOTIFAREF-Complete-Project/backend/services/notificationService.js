const webpush = require('web-push');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Reminder = require('../models/Reminder');

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:notifaref@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Configure email transporter
let emailTransporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

class NotificationService {
  /**
   * Send web push notification
   * @param {Object} subscription - Push subscription object
   * @param {Object} payload - Notification payload
   * @param {Object} options - Push options
   */
  static async sendWebPush(subscription, payload, options = {}) {
    try {
      const defaultOptions = {
        TTL: 24 * 60 * 60, // 24 hours
        urgency: 'normal',
        ...options
      };

      const result = await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        defaultOptions
      );

      console.log('Web push sent successfully:', result.statusCode);
      return { success: true, result };
    } catch (error) {
      console.error('Web push error:', error);
      
      // Handle subscription errors
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is no longer valid
        return { success: false, error: 'subscription_invalid', details: error };
      }
      
      return { success: false, error: 'push_failed', details: error };
    }
  }

  /**
   * Send email notification
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} text - Plain text content
   * @param {string} html - HTML content
   */
  static async sendEmail(to, subject, text, html = null) {
    if (!emailTransporter) {
      console.error('Email transporter not configured');
      return { success: false, error: 'email_not_configured' };
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'NOTIFAREF <notifaref@example.com>',
        to,
        subject,
        text,
        html: html || text
      };

      const result = await emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, result };
    } catch (error) {
      console.error('Email error:', error);
      return { success: false, error: 'email_failed', details: error };
    }
  }

  /**
   * Send reminder notification to user
   * @param {Object} reminder - Reminder document
   * @param {Object} user - User document
   */
  static async sendReminderNotification(reminder, user) {
    const results = {
      webPush: { sent: false, error: null },
      email: { sent: false, error: null }
    };

    // Prepare notification content
    const title = `⏰ ${reminder.title}`;
    const body = reminder.description || `Reminder scheduled for ${reminder.scheduledTime.toLocaleString()}`;
    const icon = '/icons/icon-192x192.png';
    const badge = '/icons/badge-72x72.png';
    const tag = `reminder-${reminder._id}`;
    
    const notificationPayload = {
      title,
      body,
      icon,
      badge,
      tag,
      data: {
        reminderId: reminder._id.toString(),
        url: `/dashboard?reminder=${reminder._id}`,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'complete',
          title: 'Mark Complete',
          icon: '/icons/check.png'
        },
        {
          action: 'snooze',
          title: 'Snooze 15min',
          icon: '/icons/snooze.png'
        }
      ],
      requireInteraction: reminder.priority === 'urgent',
      silent: false
    };

    // Try web push notification first
    if (user.notifications.webPush.enabled && user.notifications.webPush.subscription) {
      try {
        const pushResult = await this.sendWebPush(
          user.notifications.webPush.subscription,
          notificationPayload,
          {
            urgency: reminder.priority === 'urgent' ? 'high' : 'normal'
          }
        );

        if (pushResult.success) {
          results.webPush.sent = true;
          reminder.notifications.webPush.sent = true;
          reminder.notifications.webPush.sentAt = new Date();
        } else {
          results.webPush.error = pushResult.error;
          reminder.notifications.webPush.error = pushResult.error;
          
          // If subscription is invalid, remove it
          if (pushResult.error === 'subscription_invalid') {
            user.notifications.webPush.subscription = null;
            await user.save();
          }
        }
      } catch (error) {
        results.webPush.error = error.message;
        reminder.notifications.webPush.error = error.message;
      }
    }

    // Send email notification as fallback or if enabled
    const shouldSendEmail = user.notifications.email.enabled && (
      user.notifications.email.fallback && !results.webPush.sent ||
      !user.notifications.webPush.enabled
    );

    if (shouldSendEmail && user.email) {
      try {
        const emailSubject = `NOTIFAREF: ${reminder.title}`;
        const emailText = this.generateEmailText(reminder, user);
        const emailHtml = this.generateEmailHtml(reminder, user);

        const emailResult = await this.sendEmail(
          user.email,
          emailSubject,
          emailText,
          emailHtml
        );

        if (emailResult.success) {
          results.email.sent = true;
          reminder.notifications.email.sent = true;
          reminder.notifications.email.sentAt = new Date();
        } else {
          results.email.error = emailResult.error;
          reminder.notifications.email.error = emailResult.error;
        }
      } catch (error) {
        results.email.error = error.message;
        reminder.notifications.email.error = error.message;
      }
    }

    // Save notification results
    await reminder.save();

    return results;
  }

  /**
   * Generate email text content
   * @param {Object} reminder - Reminder document
   * @param {Object} user - User document
   */
  static generateEmailText(reminder, user) {
    const greeting = user.profile.language === 'fa' ? 
      `سلام ${user.profile.firstName || user.username}` :
      `Hello ${user.profile.firstName || user.username}`;

    const reminderText = user.profile.language === 'fa' ?
      'یادآوری شما:' : 'Your reminder:';

    const timeText = user.profile.language === 'fa' ?
      'زمان برنامه‌ریزی شده:' : 'Scheduled time:';

    return `${greeting},

${reminderText}
${reminder.title}

${reminder.description ? reminder.description + '\n\n' : ''}${timeText} ${reminder.scheduledTime.toLocaleString()}

${user.profile.language === 'fa' ? 
  'برای مدیریت یادآوری‌های خود به داشبورد مراجعه کنید.' :
  'Visit your dashboard to manage your reminders.'
}

${process.env.BASE_URL}/dashboard

---
NOTIFAREF - ${user.profile.language === 'fa' ? 'سیستم یادآوری هوشمند' : 'Smart Reminder System'}`;
  }

  /**
   * Generate email HTML content
   * @param {Object} reminder - Reminder document
   * @param {Object} user - User document
   */
  static generateEmailHtml(reminder, user) {
    const isRTL = user.profile.language === 'fa';
    const greeting = isRTL ? 
      `سلام ${user.profile.firstName || user.username}` :
      `Hello ${user.profile.firstName || user.username}`;

    const reminderText = isRTL ? 'یادآوری شما:' : 'Your reminder:';
    const timeText = isRTL ? 'زمان برنامه‌ریزی شده:' : 'Scheduled time:';
    const dashboardText = isRTL ? 'مشاهده داشبورد' : 'View Dashboard';
    const footerText = isRTL ? 'سیستم یادآوری هوشمند' : 'Smart Reminder System';

    const priorityColors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      urgent: '#DC2626'
    };

    return `
<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${user.profile.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NOTIFAREF Reminder</title>
    <style>
        body {
            font-family: ${isRTL ? 'Tahoma, Arial' : 'Arial, sans-serif'};
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
        }
        .reminder-card {
            background: #f8fafc;
            border: 2px solid ${priorityColors[reminder.priority]};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .reminder-title {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        .reminder-description {
            color: #6b7280;
            margin-bottom: 15px;
        }
        .reminder-time {
            background: ${priorityColors[reminder.priority]};
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            display: inline-block;
            font-weight: bold;
        }
        .priority-badge {
            background: ${priorityColors[reminder.priority]};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            text-transform: uppercase;
            float: ${isRTL ? 'left' : 'right'};
        }
        .button {
            display: inline-block;
            background: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .tags {
            margin-top: 10px;
        }
        .tag {
            background: #e5e7eb;
            color: #374151;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            margin: 2px;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">NOTIFAREF</div>
            <p>${greeting}!</p>
        </div>
        
        <div class="reminder-card">
            <div class="priority-badge">${reminder.priority}</div>
            <div class="reminder-title">${reminder.title}</div>
            ${reminder.description ? `<div class="reminder-description">${reminder.description}</div>` : ''}
            <div class="reminder-time">
                ${timeText} ${reminder.scheduledTime.toLocaleString()}
            </div>
            ${reminder.tags && reminder.tags.length > 0 ? `
                <div class="tags">
                    ${reminder.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
        
        <div style="text-align: center;">
            <a href="${process.env.BASE_URL}/dashboard?reminder=${reminder._id}" class="button">
                ${dashboardText}
            </a>
        </div>
        
        <div class="footer">
            <p>NOTIFAREF - ${footerText}</p>
            <p><a href="${process.env.BASE_URL}/dashboard/settings">${isRTL ? 'تنظیمات اعلان‌ها' : 'Notification Settings'}</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Send bulk notifications for multiple reminders
   * @param {Array} reminders - Array of reminder documents with populated user
   */
  static async sendBulkNotifications(reminders) {
    const results = [];
    
    for (const reminder of reminders) {
      try {
        const result = await this.sendReminderNotification(reminder, reminder.user);
        results.push({
          reminderId: reminder._id,
          success: result.webPush.sent || result.email.sent,
          ...result
        });
      } catch (error) {
        console.error(`Failed to send notification for reminder ${reminder._id}:`, error);
        results.push({
          reminderId: reminder._id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Test notification setup
   * @param {Object} user - User document
   */
  static async testNotification(user) {
    const testReminder = {
      _id: 'test',
      title: user.profile.language === 'fa' ? 'تست اعلان' : 'Test Notification',
      description: user.profile.language === 'fa' ? 
        'این یک پیام تست است تا اطمینان حاصل شود که اعل��ن‌ها به درستی کار می‌کنند.' :
        'This is a test message to ensure notifications are working properly.',
      scheduledTime: new Date(),
      priority: 'medium',
      tags: ['test'],
      notifications: {
        webPush: { sent: false },
        email: { sent: false }
      }
    };

    return await this.sendReminderNotification(testReminder, user);
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  static getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY;
  }

  /**
   * Validate push subscription
   * @param {Object} subscription - Push subscription object
   */
  static validateSubscription(subscription) {
    return subscription &&
           subscription.endpoint &&
           subscription.keys &&
           subscription.keys.p256dh &&
           subscription.keys.auth;
  }
}

module.exports = NotificationService;