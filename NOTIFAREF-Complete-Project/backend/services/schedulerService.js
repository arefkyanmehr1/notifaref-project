const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const NotificationService = require('./notificationService');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize the scheduler service
   */
  async init() {
    if (this.isRunning) {
      console.log('Scheduler service is already running');
      return;
    }

    console.log('Initializing scheduler service...');

    // Main job to check for due reminders every minute
    this.scheduleMainJob();

    // Cleanup job to handle recurring reminders every hour
    this.scheduleRecurringJob();

    // Cleanup job to remove expired shared reminders daily
    this.scheduleCleanupJob();

    this.isRunning = true;
    console.log('Scheduler service initialized successfully');
  }

  /**
   * Schedule the main job to check for due reminders
   */
  scheduleMainJob() {
    const mainJob = cron.schedule('* * * * *', async () => {
      try {
        await this.processDueReminders();
      } catch (error) {
        console.error('Error in main scheduler job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('main', mainJob);
    mainJob.start();
    console.log('Main scheduler job started (runs every minute)');
  }

  /**
   * Schedule job to handle recurring reminders
   */
  scheduleRecurringJob() {
    const recurringJob = cron.schedule('0 * * * *', async () => {
      try {
        await this.processRecurringReminders();
      } catch (error) {
        console.error('Error in recurring scheduler job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('recurring', recurringJob);
    recurringJob.start();
    console.log('Recurring scheduler job started (runs every hour)');
  }

  /**
   * Schedule cleanup job for expired data
   */
  scheduleCleanupJob() {
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupExpiredData();
      } catch (error) {
        console.error('Error in cleanup scheduler job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('cleanup', cleanupJob);
    cleanupJob.start();
    console.log('Cleanup scheduler job started (runs daily at 2 AM)');
  }

  /**
   * Process due reminders and send notifications
   */
  async processDueReminders() {
    try {
      console.log('Checking for due reminders...');
      
      // Find all due reminders
      const dueReminders = await Reminder.findDueReminders();
      
      if (dueReminders.length === 0) {
        console.log('No due reminders found');
        return;
      }

      console.log(`Found ${dueReminders.length} due reminders`);

      // Send notifications for due reminders
      const results = await NotificationService.sendBulkNotifications(dueReminders);
      
      // Log results
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      console.log(`Notification results: ${successful} successful, ${failed} failed`);

      // Update reminder status for snoozed reminders that are now due
      for (const reminder of dueReminders) {
        if (reminder.status === 'snoozed' && 
            reminder.metadata.snoozeUntil && 
            reminder.metadata.snoozeUntil <= new Date()) {
          reminder.status = 'pending';
          reminder.metadata.snoozeUntil = undefined;
          await reminder.save();
        }
      }

    } catch (error) {
      console.error('Error processing due reminders:', error);
    }
  }

  /**
   * Process recurring reminders and create next occurrences
   */
  async processRecurringReminders() {
    try {
      console.log('Processing recurring reminders...');

      // Find completed recurring reminders that need next occurrence
      const recurringReminders = await Reminder.find({
        'recurrence.type': { $ne: 'none' },
        status: 'completed',
        scheduledTime: { $lte: new Date() }
      }).populate('user');

      if (recurringReminders.length === 0) {
        console.log('No recurring reminders to process');
        return;
      }

      console.log(`Found ${recurringReminders.length} recurring reminders to process`);

      let created = 0;
      let skipped = 0;

      for (const reminder of recurringReminders) {
        try {
          const nextOccurrence = reminder.generateNextOccurrence();
          
          if (!nextOccurrence) {
            // No more occurrences (reached end date or max occurrences)
            skipped++;
            continue;
          }

          // Check if next occurrence already exists
          const existingReminder = await Reminder.findOne({
            user: reminder.user._id,
            title: reminder.title,
            scheduledTime: nextOccurrence,
            'recurrence.type': reminder.recurrence.type
          });

          if (existingReminder) {
            skipped++;
            continue;
          }

          // Create next occurrence
          const nextReminder = new Reminder({
            user: reminder.user._id,
            title: reminder.title,
            description: reminder.description,
            scheduledTime: nextOccurrence,
            recurrence: reminder.recurrence,
            tags: reminder.tags,
            priority: reminder.priority,
            metadata: {
              source: 'recurring'
            }
          });

          await nextReminder.save();
          created++;

        } catch (error) {
          console.error(`Error creating next occurrence for reminder ${reminder._id}:`, error);
          skipped++;
        }
      }

      console.log(`Recurring reminders processed: ${created} created, ${skipped} skipped`);

    } catch (error) {
      console.error('Error processing recurring reminders:', error);
    }
  }

  /**
   * Cleanup expired data
   */
  async cleanupExpiredData() {
    try {
      console.log('Running cleanup job...');

      // Remove expired shared reminders
      const expiredShares = await Reminder.updateMany(
        {
          'sharing.isShared': true,
          'sharing.expiresAt': { $lt: new Date() }
        },
        {
          $unset: {
            'sharing.shareToken': 1,
            'sharing.expiresAt': 1,
            'sharing.sharedAt': 1,
            'sharing.sharedBy': 1
          },
          $set: {
            'sharing.isShared': false
          }
        }
      );

      console.log(`Cleaned up ${expiredShares.modifiedCount} expired shared reminders`);

      // Remove old completed reminders (older than 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const oldReminders = await Reminder.deleteMany({
        status: 'completed',
        'metadata.completedAt': { $lt: ninetyDaysAgo }
      });

      console.log(`Removed ${oldReminders.deletedCount} old completed reminders`);

      // Remove old cancelled reminders (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const cancelledReminders = await Reminder.deleteMany({
        status: 'cancelled',
        updatedAt: { $lt: thirtyDaysAgo }
      });

      console.log(`Removed ${cancelledReminders.deletedCount} old cancelled reminders`);

    } catch (error) {
      console.error('Error in cleanup job:', error);
    }
  }

  /**
   * Schedule a custom job
   * @param {string} name - Job name
   * @param {string} cronExpression - Cron expression
   * @param {Function} task - Task function to execute
   * @param {Object} options - Cron options
   */
  scheduleCustomJob(name, cronExpression, task, options = {}) {
    if (this.jobs.has(name)) {
      console.warn(`Job '${name}' already exists. Stopping existing job.`);
      this.stopJob(name);
    }

    const defaultOptions = {
      scheduled: false,
      timezone: 'UTC',
      ...options
    };

    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Executing custom job: ${name}`);
        await task();
      } catch (error) {
        console.error(`Error in custom job '${name}':`, error);
      }
    }, defaultOptions);

    this.jobs.set(name, job);
    job.start();
    
    console.log(`Custom job '${name}' scheduled with expression: ${cronExpression}`);
    return job;
  }

  /**
   * Stop a specific job
   * @param {string} name - Job name
   */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      job.destroy();
      this.jobs.delete(name);
      console.log(`Job '${name}' stopped and removed`);
      return true;
    }
    console.warn(`Job '${name}' not found`);
    return false;
  }

  /**
   * Stop all jobs and shutdown scheduler
   */
  shutdown() {
    console.log('Shutting down scheduler service...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      job.destroy();
      console.log(`Stopped job: ${name}`);
    }
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('Scheduler service shut down successfully');
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      totalJobs: this.jobs.size,
      jobs: {}
    };

    for (const [name, job] of this.jobs) {
      status.jobs[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false
      };
    }

    return status;
  }

  /**
   * Manually trigger due reminders check (for testing)
   */
  async triggerDueRemindersCheck() {
    console.log('Manually triggering due reminders check...');
    await this.processDueReminders();
  }

  /**
   * Manually trigger recurring reminders processing (for testing)
   */
  async triggerRecurringRemindersCheck() {
    console.log('Manually triggering recurring reminders check...');
    await this.processRecurringReminders();
  }

  /**
   * Manually trigger cleanup (for testing)
   */
  async triggerCleanup() {
    console.log('Manually triggering cleanup...');
    await this.cleanupExpiredData();
  }

  /**
   * Validate cron expression
   * @param {string} expression - Cron expression to validate
   */
  static validateCronExpression(expression) {
    return cron.validate(expression);
  }

  /**
   * Get next execution dates for a cron expression
   * @param {string} expression - Cron expression
   * @param {number} count - Number of next dates to get
   */
  static getNextDates(expression, count = 5) {
    if (!cron.validate(expression)) {
      throw new Error('Invalid cron expression');
    }

    const dates = [];
    const task = cron.schedule(expression, () => {}, { scheduled: false });
    
    // This is a simplified approach - in production you might want to use a more robust solution
    let current = new Date();
    for (let i = 0; i < count; i++) {
      // Find next execution time (this is a basic implementation)
      current = new Date(current.getTime() + 60000); // Add 1 minute and check
      dates.push(new Date(current));
    }
    
    return dates;
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;