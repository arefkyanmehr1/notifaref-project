const { google } = require('googleapis');
const User = require('../models/User');
const Reminder = require('../models/Reminder');

class CalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.initializeOAuth();
  }

  /**
   * Initialize OAuth2 client
   */
  initializeOAuth() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('Google OAuth credentials not configured');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Generate OAuth2 authorization URL
   * @param {string} userId - User ID for state parameter
   */
  getAuthUrl(userId) {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code
   * @param {string} userId - User ID
   */
  async exchangeCodeForTokens(code, userId) {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth not configured');
    }

    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      
      // Save tokens to user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.integrations.googleCalendar.accessToken = tokens.access_token;
      user.integrations.googleCalendar.refreshToken = tokens.refresh_token;
      user.integrations.googleCalendar.connected = true;
      
      await user.save();

      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Set up OAuth client with user tokens
   * @param {Object} user - User document
   */
  async setupUserAuth(user) {
    if (!this.oauth2Client) {
      throw new Error('Google OAuth not configured');
    }

    if (!user.integrations.googleCalendar.connected) {
      throw new Error('Google Calendar not connected for this user');
    }

    this.oauth2Client.setCredentials({
      access_token: user.integrations.googleCalendar.accessToken,
      refresh_token: user.integrations.googleCalendar.refreshToken
    });

    // Handle token refresh
    this.oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        user.integrations.googleCalendar.refreshToken = tokens.refresh_token;
      }
      user.integrations.googleCalendar.accessToken = tokens.access_token;
      await user.save();
    });
  }

  /**
   * Get user's calendar list
   * @param {Object} user - User document
   */
  async getCalendarList(user) {
    await this.setupUserAuth(user);

    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Error getting calendar list:', error);
      throw error;
    }
  }

  /**
   * Create calendar event from reminder
   * @param {Object} reminder - Reminder document
   * @param {Object} user - User document
   * @param {string} calendarId - Calendar ID (optional, uses primary if not provided)
   */
  async createEventFromReminder(reminder, user, calendarId = 'primary') {
    await this.setupUserAuth(user);

    try {
      const event = {
        summary: reminder.title,
        description: reminder.description || '',
        start: {
          dateTime: reminder.scheduledTime.toISOString(),
          timeZone: user.profile.timezone || 'UTC'
        },
        end: {
          dateTime: new Date(reminder.scheduledTime.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timeZone: user.profile.timezone || 'UTC'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'email', minutes: 60 }
          ]
        }
      };

      // Add recurrence if applicable
      if (reminder.recurrence && reminder.recurrence.type !== 'none') {
        event.recurrence = this.buildRecurrenceRule(reminder.recurrence);
      }

      const response = await this.calendar.events.insert({
        calendarId,
        resource: event
      });

      // Update reminder with Google event ID
      reminder.calendar.googleEventId = response.data.id;
      reminder.calendar.synced = true;
      reminder.calendar.lastSyncAt = new Date();
      await reminder.save();

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Update calendar event
   * @param {Object} reminder - Reminder document
   * @param {Object} user - User document
   * @param {string} calendarId - Calendar ID
   */
  async updateEvent(reminder, user, calendarId = 'primary') {
    if (!reminder.calendar.googleEventId) {
      throw new Error('No Google event ID found for this reminder');
    }

    await this.setupUserAuth(user);

    try {
      const event = {
        summary: reminder.title,
        description: reminder.description || '',
        start: {
          dateTime: reminder.scheduledTime.toISOString(),
          timeZone: user.profile.timezone || 'UTC'
        },
        end: {
          dateTime: new Date(reminder.scheduledTime.getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: user.profile.timezone || 'UTC'
        }
      };

      const response = await this.calendar.events.update({
        calendarId,
        eventId: reminder.calendar.googleEventId,
        resource: event
      });

      reminder.calendar.lastSyncAt = new Date();
      await reminder.save();

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete calendar event
   * @param {Object} reminder - Reminder document
   * @param {Object} user - User document
   * @param {string} calendarId - Calendar ID
   */
  async deleteEvent(reminder, user, calendarId = 'primary') {
    if (!reminder.calendar.googleEventId) {
      return; // No event to delete
    }

    await this.setupUserAuth(user);

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId: reminder.calendar.googleEventId
      });

      reminder.calendar.googleEventId = undefined;
      reminder.calendar.synced = false;
      await reminder.save();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      // Don't throw error for delete operations
    }
  }

  /**
   * Import events from Google Calendar
   * @param {Object} user - User document
   * @param {string} calendarId - Calendar ID
   * @param {Date} timeMin - Start time for import
   * @param {Date} timeMax - End time for import
   */
  async importEvents(user, calendarId = 'primary', timeMin = new Date(), timeMax = null) {
    await this.setupUserAuth(user);

    if (!timeMax) {
      timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3); // Import next 3 months
    }

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      const importedReminders = [];

      for (const event of events) {
        // Skip all-day events or events without start time
        if (!event.start.dateTime) continue;

        // Check if reminder already exists
        const existingReminder = await Reminder.findOne({
          user: user._id,
          'calendar.googleEventId': event.id
        });

        if (existingReminder) continue;

        // Create reminder from event
        const reminder = new Reminder({
          user: user._id,
          title: event.summary || 'Imported Event',
          description: event.description || '',
          scheduledTime: new Date(event.start.dateTime),
          tags: ['imported', 'calendar'],
          priority: 'medium',
          calendar: {
            googleEventId: event.id,
            synced: true,
            lastSyncAt: new Date()
          },
          metadata: {
            source: 'calendar'
          }
        });

        await reminder.save();
        importedReminders.push(reminder);
      }

      return importedReminders;
    } catch (error) {
      console.error('Error importing calendar events:', error);
      throw error;
    }
  }

  /**
   * Sync reminder with Google Calendar
   * @param {Object} reminder - Reminder document
   * @param {Object} user - User document
   */
  async syncReminder(reminder, user) {
    if (!user.integrations.googleCalendar.connected) {
      return;
    }

    try {
      if (reminder.calendar.googleEventId) {
        // Update existing event
        await this.updateEvent(reminder, user);
      } else {
        // Create new event
        await this.createEventFromReminder(reminder, user);
      }
    } catch (error) {
      console.error(`Error syncing reminder ${reminder._id}:`, error);
      // Mark as sync failed but don't throw
      reminder.calendar.synced = false;
      await reminder.save();
    }
  }

  /**
   * Disconnect Google Calendar for user
   * @param {Object} user - User document
   */
  async disconnectCalendar(user) {
    user.integrations.googleCalendar.connected = false;
    user.integrations.googleCalendar.accessToken = undefined;
    user.integrations.googleCalendar.refreshToken = undefined;
    user.integrations.googleCalendar.calendarId = undefined;
    
    await user.save();

    // Optionally, remove Google event IDs from reminders
    await Reminder.updateMany(
      { user: user._id },
      {
        $unset: {
          'calendar.googleEventId': 1
        },
        $set: {
          'calendar.synced': false
        }
      }
    );
  }

  /**
   * Build recurrence rule for Google Calendar
   * @param {Object} recurrence - Recurrence object from reminder
   */
  buildRecurrenceRule(recurrence) {
    const rules = [];
    
    switch (recurrence.type) {
      case 'daily':
        rules.push(`RRULE:FREQ=DAILY;INTERVAL=${recurrence.interval || 1}`);
        break;
      case 'weekly':
        rules.push(`RRULE:FREQ=WEEKLY;INTERVAL=${recurrence.interval || 1}`);
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          const days = recurrence.daysOfWeek.map(day => {
            const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
            return dayNames[day];
          }).join(',');
          rules[0] += `;BYDAY=${days}`;
        }
        break;
      case 'monthly':
        rules.push(`RRULE:FREQ=MONTHLY;INTERVAL=${recurrence.interval || 1}`);
        break;
      case 'yearly':
        rules.push(`RRULE:FREQ=YEARLY;INTERVAL=${recurrence.interval || 1}`);
        break;
    }

    if (recurrence.endDate) {
      const endDate = new Date(recurrence.endDate);
      rules[0] += `;UNTIL=${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    }

    if (recurrence.maxOccurrences) {
      rules[0] += `;COUNT=${recurrence.maxOccurrences}`;
    }

    return rules;
  }

  /**
   * Get calendar service status
   */
  getStatus() {
    return {
      configured: !!this.oauth2Client,
      clientId: !!process.env.GOOGLE_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    };
  }
}

// Create singleton instance
const calendarService = new CalendarService();

module.exports = calendarService;