const express = require('express');
const { query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Reminder = require('../models/Reminder');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics overview
// @access  Private
router.get('/dashboard', auth, [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
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

    const { days = 30 } = req.query;
    const userId = req.user.userId;

    // Get user stats
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userStats = user.getStats();

    // Get reminder stats for the specified period
    const reminderStats = await Reminder.getUserStats(userId, parseInt(days));

    // Get current status counts
    const statusCounts = await Reminder.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get priority distribution
    const priorityCounts = await Reminder.aggregate([
      { $match: { user: user._id, status: { $ne: 'completed' } } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityMap = priorityCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get upcoming reminders count
    const upcomingCount = await Reminder.countDocuments({
      user: userId,
      status: 'pending',
      scheduledTime: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    });

    // Get overdue reminders count
    const overdueCount = await Reminder.countDocuments({
      user: userId,
      status: 'pending',
      scheduledTime: { $lt: new Date() }
    });

    // Get most used tags
    const tagStats = await Reminder.aggregate([
      { $match: { user: user._id } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        user: userStats,
        reminders: {
          ...reminderStats,
          status: {
            pending: statusMap.pending || 0,
            completed: statusMap.completed || 0,
            cancelled: statusMap.cancelled || 0,
            snoozed: statusMap.snoozed || 0
          },
          priority: {
            low: priorityMap.low || 0,
            medium: priorityMap.medium || 0,
            high: priorityMap.high || 0,
            urgent: priorityMap.urgent || 0
          },
          upcoming: upcomingCount,
          overdue: overdueCount
        },
        tags: tagStats,
        period: {
          days: parseInt(days),
          startDate: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/trends
// @desc    Get reminder trends over time
// @access  Private
router.get('/trends', auth, [
  query('days').optional().isInt({ min: 7, max: 365 }).withMessage('Days must be between 7 and 365'),
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Invalid groupBy value'),
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

    const { days = 30, groupBy = 'day' } = req.query;
    const userId = req.user.userId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Determine date format based on groupBy
    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = '%Y-%U'; // Year-Week
        break;
      case 'month':
        dateFormat = '%Y-%m'; // Year-Month
        break;
      default:
        dateFormat = '%Y-%m-%d'; // Year-Month-Day
    }

    // Get creation trends
    const creationTrends = await Reminder.aggregate([
      {
        $match: {
          user: req.userDoc._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          total: { $sum: '$count' },
          byStatus: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get completion trends
    const completionTrends = await Reminder.aggregate([
      {
        $match: {
          user: req.userDoc._id,
          status: 'completed',
          'metadata.completedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: '$metadata.completedAt' } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        creation: creationTrends,
        completion: completionTrends.map(item => ({
          date: item._id.date,
          count: item.count
        })),
        period: {
          days: parseInt(days),
          groupBy,
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get trends analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/performance
// @desc    Get performance metrics
// @access  Private
router.get('/performance', auth, [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
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

    const { days = 30 } = req.query;
    const userId = req.user.userId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get completion rate by priority
    const completionByPriority = await Reminder.aggregate([
      {
        $match: {
          user: req.userDoc._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$priority',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          priority: '$_id',
          total: 1,
          completed: 1,
          completionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
            ]
          }
        }
      }
    ]);

    // Get average completion time
    const completionTimes = await Reminder.aggregate([
      {
        $match: {
          user: req.userDoc._id,
          status: 'completed',
          'metadata.completedAt': { $gte: startDate }
        }
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$metadata.completedAt', '$scheduledTime'] },
              1000 * 60 * 60 // Convert to hours
            ]
          },
          priority: 1
        }
      },
      {
        $group: {
          _id: '$priority',
          avgCompletionTime: { $avg: '$completionTime' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get notification success rates
    const notificationStats = await Reminder.aggregate([
      {
        $match: {
          user: req.userDoc._id,
          createdAt: { $gte: startDate },
          $or: [
            { 'notifications.webPush.sent': true },
            { 'notifications.email.sent': true }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          webPushSent: {
            $sum: { $cond: ['$notifications.webPush.sent', 1, 0] }
          },
          emailSent: {
            $sum: { $cond: ['$notifications.email.sent', 1, 0] }
          },
          webPushFailed: {
            $sum: { $cond: ['$notifications.webPush.error', 1, 0] }
          },
          emailFailed: {
            $sum: { $cond: ['$notifications.email.error', 1, 0] }
          }
        }
      }
    ]);

    // Get streak information
    const streakInfo = await this.calculateStreaks(req.userDoc._id, startDate);

    res.json({
      success: true,
      data: {
        completionByPriority,
        completionTimes,
        notifications: notificationStats[0] || {
          total: 0,
          webPushSent: 0,
          emailSent: 0,
          webPushFailed: 0,
          emailFailed: 0
        },
        streaks: streakInfo,
        period: {
          days: parseInt(days),
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/tags
// @desc    Get tag usage analytics
// @access  Private
router.get('/tags', auth, [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
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

    const { days = 30, limit = 20 } = req.query;
    const userId = req.user.userId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get tag usage statistics
    const tagStats = await Reminder.aggregate([
      {
        $match: {
          user: req.userDoc._id,
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          tag: '$_id',
          total: 1,
          completed: 1,
          pending: 1,
          completionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
            ]
          }
        }
      },
      { $sort: { total: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Get tag trends over time
    const tagTrends = await Reminder.aggregate([
      {
        $match: {
          user: req.userDoc._id,
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: {
            tag: '$tags',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.tag',
          timeline: {
            $push: {
              date: '$_id.date',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      { $sort: { totalCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        usage: tagStats,
        trends: tagTrends,
        period: {
          days: parseInt(days),
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get tag analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/export
// @desc    Export analytics data
// @access  Private
router.get('/export', auth, [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Invalid format'),
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

    const { days = 30, format = 'json' } = req.query;
    const userId = req.user.userId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all reminders for the period
    const reminders = await Reminder.find({
      user: userId,
      createdAt: { $gte: startDate }
    }).select('-user -__v').lean();

    // Get user stats
    const user = await User.findById(userId);
    const userStats = user.getStats();

    const exportData = {
      exportDate: new Date(),
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date()
      },
      user: userStats,
      reminders,
      summary: {
        total: reminders.length,
        completed: reminders.filter(r => r.status === 'completed').length,
        pending: reminders.filter(r => r.status === 'pending').length,
        cancelled: reminders.filter(r => r.status === 'cancelled').length
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = this.convertToCSV(reminders);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="notifaref-analytics-${Date.now()}.csv"`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="notifaref-analytics-${Date.now()}.json"`);
      res.json(exportData);
    }

  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper method to calculate streaks
router.calculateStreaks = async function(userId, startDate) {
  const completedReminders = await Reminder.find({
    user: userId,
    status: 'completed',
    'metadata.completedAt': { $gte: startDate }
  }).sort({ 'metadata.completedAt': 1 });

  let currentStreak = 0;
  let longestStreak = 0;
  let lastCompletionDate = null;

  for (const reminder of completedReminders) {
    const completionDate = new Date(reminder.metadata.completedAt);
    completionDate.setHours(0, 0, 0, 0);

    if (!lastCompletionDate) {
      currentStreak = 1;
      longestStreak = 1;
    } else {
      const daysDiff = Math.floor((completionDate - lastCompletionDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        currentStreak++;
      } else if (daysDiff === 0) {
        // Same day, don't break streak
        continue;
      } else {
        currentStreak = 1;
      }
      
      longestStreak = Math.max(longestStreak, currentStreak);
    }
    
    lastCompletionDate = completionDate;
  }

  // Check if current streak is still active (completed something today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isStreakActive = lastCompletionDate && 
    (lastCompletionDate.getTime() === today.getTime() || 
     lastCompletionDate.getTime() === yesterday.getTime());

  return {
    current: isStreakActive ? currentStreak : 0,
    longest: longestStreak,
    lastCompletion: lastCompletionDate
  };
};

// Helper method to convert data to CSV
router.convertToCSV = function(reminders) {
  if (reminders.length === 0) return '';

  const headers = [
    'ID', 'Title', 'Description', 'Scheduled Time', 'Status', 'Priority',
    'Tags', 'Created At', 'Completed At', 'Recurrence Type'
  ];

  const csvRows = [headers.join(',')];

  for (const reminder of reminders) {
    const row = [
      reminder._id,
      `"${reminder.title.replace(/"/g, '""')}"`,
      `"${(reminder.description || '').replace(/"/g, '""')}"`,
      reminder.scheduledTime.toISOString(),
      reminder.status,
      reminder.priority,
      `"${reminder.tags.join(', ')}"`,
      reminder.createdAt.toISOString(),
      reminder.metadata.completedAt ? reminder.metadata.completedAt.toISOString() : '',
      reminder.recurrence.type
    ];
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
};

module.exports = router;