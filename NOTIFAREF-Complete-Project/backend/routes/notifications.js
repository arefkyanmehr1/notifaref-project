const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/notifications/vapid-key
// @desc    Get VAPID public key for push subscription
// @access  Public
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = NotificationService.getVapidPublicKey();
    
    if (!publicKey) {
      return res.status(500).json({
        success: false,
        message: 'VAPID public key not configured'
      });
    }

    res.json({
      success: true,
      data: {
        publicKey
      }
    });
  } catch (error) {
    console.error('Get VAPID key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/subscribe
// @desc    Subscribe to push notifications
// @access  Private
router.post('/subscribe', auth, [
  body('subscription').notEmpty().withMessage('Subscription is required'),
  body('subscription.endpoint').notEmpty().withMessage('Subscription endpoint is required'),
  body('subscription.keys').notEmpty().withMessage('Subscription keys are required'),
  body('subscription.keys.p256dh').notEmpty().withMessage('p256dh key is required'),
  body('subscription.keys.auth').notEmpty().withMessage('auth key is required'),
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

    const { subscription } = req.body;

    // Validate subscription format
    if (!NotificationService.validateSubscription(subscription)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription format'
      });
    }

    // Update user's push subscription
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.notifications.webPush.subscription = subscription;
    user.notifications.webPush.enabled = true;
    await user.save();

    res.json({
      success: true,
      message: 'Push notification subscription saved successfully'
    });

  } catch (error) {
    console.error('Subscribe to push notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/notifications/unsubscribe
// @desc    Unsubscribe from push notifications
// @access  Private
router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove push subscription
    user.notifications.webPush.subscription = null;
    user.notifications.webPush.enabled = false;
    await user.save();

    res.json({
      success: true,
      message: 'Push notification subscription removed successfully'
    });

  } catch (error) {
    console.error('Unsubscribe from push notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/notifications/settings
// @desc    Update notification settings
// @access  Private
router.put('/settings', auth, [
  body('webPush.enabled').optional().isBoolean().withMessage('webPush.enabled must be boolean'),
  body('email.enabled').optional().isBoolean().withMessage('email.enabled must be boolean'),
  body('email.fallback').optional().isBoolean().withMessage('email.fallback must be boolean'),
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

    const { webPush, email } = req.body;

    // Update notification settings
    if (webPush) {
      if (webPush.enabled !== undefined) {
        user.notifications.webPush.enabled = webPush.enabled;
      }
    }

    if (email) {
      if (email.enabled !== undefined) {
        user.notifications.email.enabled = email.enabled;
      }
      if (email.fallback !== undefined) {
        user.notifications.email.fallback = email.fallback;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        notifications: user.notifications
      }
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/notifications/settings
// @desc    Get notification settings
// @access  Private
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't expose sensitive subscription data
    const settings = {
      webPush: {
        enabled: user.notifications.webPush.enabled,
        subscribed: !!user.notifications.webPush.subscription
      },
      email: {
        enabled: user.notifications.email.enabled,
        fallback: user.notifications.email.fallback
      }
    };

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/test
// @desc    Send a test notification
// @access  Private
router.post('/test', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send test notification
    const result = await NotificationService.testNotification(user);

    const success = result.webPush.sent || result.email.sent;
    const message = success 
      ? 'Test notification sent successfully'
      : 'Failed to send test notification';

    res.json({
      success,
      message,
      data: {
        webPush: {
          sent: result.webPush.sent,
          error: result.webPush.error
        },
        email: {
          sent: result.email.sent,
          error: result.email.error
        }
      }
    });

  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/send-bulk
// @desc    Send bulk notifications (admin/system use)
// @access  Private (could be restricted to admin users)
router.post('/send-bulk', auth, [
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

    const { reminderIds } = req.body;

    // Find reminders with populated user data
    const Reminder = require('../models/Reminder');
    const reminders = await Reminder.find({
      _id: { $in: reminderIds },
      user: req.user.userId // Ensure user can only send notifications for their own reminders
    }).populate('user');

    if (reminders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reminders found'
      });
    }

    // Send bulk notifications
    const results = await NotificationService.sendBulkNotifications(reminders);

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    res.json({
      success: true,
      message: `Sent ${successCount}/${totalCount} notifications successfully`,
      data: {
        results,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: totalCount - successCount
        }
      }
    });

  } catch (error) {
    console.error('Send bulk notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/notifications/status
// @desc    Get notification system status
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

    // Check system status
    const status = {
      vapidConfigured: !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
      emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS,
      userSettings: {
        webPushEnabled: user.notifications.webPush.enabled,
        webPushSubscribed: !!user.notifications.webPush.subscription,
        emailEnabled: user.notifications.email.enabled,
        emailFallback: user.notifications.email.fallback
      },
      permissions: {
        webPush: 'unknown', // Will be determined on client-side
        notifications: 'unknown' // Will be determined on client-side
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Get notification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;