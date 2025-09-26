const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const reminderValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('scheduledTime')
    .isISO8601()
    .withMessage('Invalid scheduled time format')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error('Scheduled time must be in the future');
      }
      return true;
    }),
  body('recurrence.type')
    .optional()
    .isIn(['none', 'daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid recurrence type'),
  body('recurrence.interval')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Recurrence interval must be a positive integer'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Each tag must be less than 50 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
];

// @route   GET /api/reminders
// @desc    Get user's reminders with filtering and pagination
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'completed', 'cancelled', 'snoozed']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  query('tags').optional().isString().withMessage('Tags must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sortBy').optional().isIn(['scheduledTime', 'createdAt', 'priority', 'title']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
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

    const {
      page = 1,
      limit = 20,
      status,
      priority,
      tags,
      search,
      sortBy = 'scheduledTime',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = { user: req.user.userId };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tagArray };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [reminders, total] = await Promise.all([
      Reminder.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Reminder.countDocuments(query)
    ]);

    // Add virtual fields
    const now = new Date();
    const enrichedReminders = reminders.map(reminder => ({
      ...reminder,
      isOverdue: reminder.status === 'pending' && reminder.scheduledTime < now,
      isUpcoming: reminder.status === 'pending' && 
                  reminder.scheduledTime >= now && 
                  reminder.scheduledTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }));

    res.json({
      success: true,
      data: {
        reminders: enrichedReminders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + parseInt(limit) < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reminders/stats
// @desc    Get user's reminder statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const stats = await Reminder.getUserStats(req.user.userId, parseInt(days));
    const userStats = await User.findById(req.user.userId).then(user => user.getStats());

    res.json({
      success: true,
      data: {
        ...stats,
        user: userStats
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reminders/upcoming
// @desc    Get upcoming reminders
// @access  Private
router.get('/upcoming', auth, [
  query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Hours must be between 1 and 168'),
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

    const { hours = 24 } = req.query;
    
    const reminders = await Reminder.findUpcomingReminders(req.user.userId, parseInt(hours));

    res.json({
      success: true,
      data: reminders
    });

  } catch (error) {
    console.error('Get upcoming reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reminders/:id
// @desc    Get a specific reminder
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
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

    // Increment view count
    await reminder.incrementView();

    res.json({
      success: true,
      data: reminder
    });

  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/reminders
// @desc    Create a new reminder
// @access  Private
router.post('/', auth, reminderValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      scheduledTime,
      recurrence = { type: 'none' },
      tags = [],
      priority = 'medium'
    } = req.body;

    const reminder = new Reminder({
      user: req.user.userId,
      title,
      description,
      scheduledTime: new Date(scheduledTime),
      recurrence,
      tags: tags.map(tag => tag.toLowerCase()),
      priority
    });

    await reminder.save();

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: reminder
    });

  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/reminders/:id
// @desc    Update a reminder
// @access  Private
router.put('/:id', auth, reminderValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
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

    const {
      title,
      description,
      scheduledTime,
      recurrence,
      tags,
      priority
    } = req.body;

    // Update fields
    if (title !== undefined) reminder.title = title;
    if (description !== undefined) reminder.description = description;
    if (scheduledTime !== undefined) reminder.scheduledTime = new Date(scheduledTime);
    if (recurrence !== undefined) reminder.recurrence = recurrence;
    if (tags !== undefined) reminder.tags = tags.map(tag => tag.toLowerCase());
    if (priority !== undefined) reminder.priority = priority;

    await reminder.save();

    res.json({
      success: true,
      message: 'Reminder updated successfully',
      data: reminder
    });

  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PATCH /api/reminders/:id/status
// @desc    Update reminder status
// @access  Private
router.patch('/:id/status', auth, [
  body('status')
    .isIn(['pending', 'completed', 'cancelled', 'snoozed'])
    .withMessage('Invalid status'),
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

    const { status } = req.body;
    
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

    if (status === 'completed') {
      await reminder.markCompleted();
    } else {
      reminder.status = status;
      await reminder.save();
    }

    res.json({
      success: true,
      message: `Reminder ${status} successfully`,
      data: reminder
    });

  } catch (error) {
    console.error('Update reminder status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PATCH /api/reminders/:id/snooze
// @desc    Snooze a reminder
// @access  Private
router.patch('/:id/snooze', auth, [
  body('minutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Minutes must be between 1 and 1440 (24 hours)'),
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

    const { minutes = 15 } = req.body;
    
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

    await reminder.snooze(parseInt(minutes));

    res.json({
      success: true,
      message: `Reminder snoozed for ${minutes} minutes`,
      data: reminder
    });

  } catch (error) {
    console.error('Snooze reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/reminders/:id
// @desc    Delete a reminder
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
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

    await reminder.remove();

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });

  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/reminders/:id/share
// @desc    Create a shareable link for a reminder
// @access  Private
router.post('/:id/share', auth, [
  body('expirationHours')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Expiration hours must be between 1 and 168 (7 days)'),
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

    const { expirationHours = 24 } = req.body;
    
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

    const shareToken = reminder.createShareToken(parseInt(expirationHours));
    await reminder.save();

    const shareUrl = `${process.env.BASE_URL}/shared/${shareToken}`;

    res.json({
      success: true,
      message: 'Share link created successfully',
      data: {
        shareUrl,
        shareToken,
        expiresAt: reminder.sharing.expiresAt
      }
    });

  } catch (error) {
    console.error('Share reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/reminders/shared/:token
// @desc    Get a shared reminder
// @access  Public
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const reminder = await Reminder.findOne({
      'sharing.shareToken': token,
      'sharing.expiresAt': { $gt: new Date() }
    }).populate('user', 'username profile.firstName profile.lastName');

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Shared reminder not found or expired'
      });
    }

    // Don't expose sensitive information
    const sharedReminder = {
      _id: reminder._id,
      title: reminder.title,
      description: reminder.description,
      scheduledTime: reminder.scheduledTime,
      priority: reminder.priority,
      tags: reminder.tags,
      sharedBy: {
        username: reminder.user.username,
        name: `${reminder.user.profile.firstName || ''} ${reminder.user.profile.lastName || ''}`.trim()
      },
      sharedAt: reminder.sharing.sharedAt
    };

    res.json({
      success: true,
      data: sharedReminder
    });

  } catch (error) {
    console.error('Get shared reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/reminders/shared/:token/import
// @desc    Import a shared reminder to user's account
// @access  Private
router.post('/shared/:token/import', auth, async (req, res) => {
  try {
    const { token } = req.params;
    
    const originalReminder = await Reminder.findOne({
      'sharing.shareToken': token,
      'sharing.expiresAt': { $gt: new Date() }
    });

    if (!originalReminder) {
      return res.status(404).json({
        success: false,
        message: 'Shared reminder not found or expired'
      });
    }

    // Create a new reminder for the current user
    const newReminder = new Reminder({
      user: req.user.userId,
      title: originalReminder.title,
      description: originalReminder.description,
      scheduledTime: originalReminder.scheduledTime,
      recurrence: originalReminder.recurrence,
      tags: originalReminder.tags,
      priority: originalReminder.priority,
      metadata: {
        source: 'shared'
      }
    });

    await newReminder.save();

    res.status(201).json({
      success: true,
      message: 'Reminder imported successfully',
      data: newReminder
    });

  } catch (error) {
    console.error('Import shared reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;