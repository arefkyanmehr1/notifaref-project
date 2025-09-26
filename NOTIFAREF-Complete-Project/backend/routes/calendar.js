const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const calendarService = require('../services/calendarService');
const User = require('../models/User');
const Reminder = require('../models/Reminder');

const router = express.Router();

// @route   GET /api/calendar/status
// @desc    Get Google Calendar integration status
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const serviceStatus = calendarService.getStatus();
    
    res.json({
      success: true,
      data: {
        ...serviceStatus,
        userConnected: user.integrations.googleCalendar.connected,
        calendarId: user.integrations.googleCalendar.calendarId
      }
    });

  } catch (error) {
    console.error('Get calendar status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/calendar/auth-url
// @desc    Get Google OAuth authorization URL
// @access  Private
router.get('/auth-url', auth, async (req, res) => {
  try {
    const authUrl = calendarService.getAuthUrl(req.user.userId);
    
    res.json({
      success: true,
      data: {
        authUrl
      }
    });

  } catch (error) {
    console.error('Get auth URL error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @route   POST /api/calendar/callback
// @desc    Handle Google OAuth callback
// @access  Private
router.post('/callback', auth, [
  body('code').notEmpty().withMessage('Authorization code is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { code } = req.body;
    
    const tokens = await calendarService.exchangeCodeForTokens(code, req.user.userId);
    
    res.json({
      success: true,
      message: 'Google Calendar connected successfully',
      data: {
        connected: true
      }
    });

  } catch (error) {
    console.error('Calendar callback error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to connect Google Calendar'
    });
  }
});

// @route   DELETE /api/calendar/disconnect
// @desc    Disconnect Google Calendar
// @access  Private
router.delete('/disconnect', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await calendarService.disconnectCalendar(user);
    
    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });

  } catch (error) {
    console.error('Disconnect calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/calendar/calendars
// @desc    Get user's calendar list
// @access  Private
router.get('/calendars', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.integrations.googleCalendar.connected) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar not connected'
      });
    }

    const calendars = await calendarService.getCalendarList(user);
    
    res.json({
      success: true,
      data: calendars
    });

  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @route   POST /api/calendar/sync-reminder/:id
// @desc    Sync a specific reminder with Google Calendar
// @access  Private
router.post('/sync-reminder/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.integrations.googleCalendar.connected) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar not connected'
      });
    }

    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    await calendarService.syncReminder(reminder, user);
    
    res.json({
      success: true,
      message: 'Reminder synced with Google Calendar successfully',
      data: {
        synced: reminder.calendar.synced,
        googleEventId: reminder.calendar.googleEventId,
        lastSyncAt: reminder.calendar.lastSyncAt
      }
    });

  } catch (error) {
    console.error('Sync reminder error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @route   POST /api/calendar/import
// @desc    Import events from Google Calendar
// @access  Private
router.post('/import', auth, [
  body('calendarId').optional().isString().withMessage('Calendar ID must be a string'),
  body('timeMin').optional().isISO8601().withMessage('Invalid timeMin format'),
  body('timeMax').optional().isISO8601().withMessage('Invalid timeMax format'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.integrations.googleCalendar.connected) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar not connected'
      });
    }

    const { 
      calendarId = 'primary',
      timeMin = new Date().toISOString(),
      timeMax 
    } = req.body;

    const importedReminders = await calendarService.importEvents(
      user,
      calendarId,
      new Date(timeMin),
      timeMax ? new Date(timeMax) : null
    );
    
    res.json({
      success: true,
      message: `Imported ${importedReminders.length} events from Google Calendar`,
      data: {
        imported: importedReminders.length,
        reminders: importedReminders
      }
    });

  } catch (error) {
    console.error('Import calendar events error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @route   POST /api/calendar/bulk-sync
// @desc    Sync multiple reminders with Google Calendar
// @access  Private
router.post('/bulk-sync', auth, [
  body('reminderIds').isArray().withMessage('reminderIds must be an array'),
  body('reminderIds.*').isMongoId().withMessage('Invalid reminder ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.integrations.googleCalendar.connected) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar not connected'
      });
    }

    const { reminderIds } = req.body;

    const reminders = await Reminder.find({
      _id: { $in: reminderIds },
      user: req.user.userId
    });

    if (reminders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reminders found'
      });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const reminder of reminders) {
      try {
        await calendarService.syncReminder(reminder, user);
        results.push({
          reminderId: reminder._id,
          success: true,
          synced: reminder.calendar.synced,
          googleEventId: reminder.calendar.googleEventId
        });
        successful++;
      } catch (error) {
        results.push({
          reminderId: reminder._id,
          success: false,
          error: error.message
        });
        failed++;
      }
    }
    
    res.json({
      success: true,
      message: `Synced ${successful}/${reminders.length} reminders successfully`,
      data: {
        results,
        summary: {
          total: reminders.length,
          successful,
          failed
        }
      }
    });

  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/calendar/sync-reminder/:id
// @desc    Remove reminder from Google Calendar
// @access  Private
router.delete('/sync-reminder/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (user.integrations.googleCalendar.connected && reminder.calendar.googleEventId) {
      await calendarService.deleteEvent(reminder, user);
    }
    
    res.json({
      success: true,
      message: 'Reminder removed from Google Calendar successfully'
    });

  } catch (error) {
    console.error('Remove calendar sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @route   PUT /api/calendar/settings
// @desc    Update calendar integration settings
// @access  Private
router.put('/settings', auth, [
  body('calendarId').optional().isString().withMessage('Calendar ID must be a string'),
  body('autoSync').optional().isBoolean().withMessage('autoSync must be boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { calendarId } = req.body;

    if (calendarId !== undefined) {
      user.integrations.googleCalendar.calendarId = calendarId;
    }

    await user.save();
    
    res.json({
      success: true,
      message: 'Calendar settings updated successfully',
      data: {
        calendarId: user.integrations.googleCalendar.calendarId
      }
    });

  } catch (error) {
    console.error('Update calendar settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;