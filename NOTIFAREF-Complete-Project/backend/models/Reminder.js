const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  scheduledTime: {
    type: Date,
    required: true,
    index: true
  },
  recurrence: {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none'
    },
    interval: {
      type: Number,
      default: 1,
      min: 1
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    endDate: Date,
    maxOccurrences: Number
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'snoozed'],
    default: 'pending',
    index: true
  },
  notifications: {
    webPush: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    }
  },
  sharing: {
    isShared: { type: Boolean, default: false },
    shareToken: String,
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: Date,
    expiresAt: Date
  },
  calendar: {
    googleEventId: String,
    synced: { type: Boolean, default: false },
    lastSyncAt: Date
  },
  metadata: {
    completedAt: Date,
    snoozeUntil: Date,
    snoozeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    lastViewed: Date,
    source: {
      type: String,
      enum: ['manual', 'shared', 'calendar', 'import'],
      default: 'manual'
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
reminderSchema.index({ user: 1, status: 1 });
reminderSchema.index({ user: 1, scheduledTime: 1 });
reminderSchema.index({ user: 1, tags: 1 });
reminderSchema.index({ scheduledTime: 1, status: 1 });
reminderSchema.index({ 'sharing.shareToken': 1 });
reminderSchema.index({ 'sharing.expiresAt': 1 });

// Virtual for overdue status
reminderSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && this.scheduledTime < new Date();
});

// Virtual for upcoming status (within next 24 hours)
reminderSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return this.status === 'pending' && this.scheduledTime >= now && this.scheduledTime <= tomorrow;
});

// Virtual for formatted time remaining
reminderSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'pending') return null;
  
  const now = new Date();
  const diff = this.scheduledTime - now;
  
  if (diff < 0) return 'Overdue';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Method to mark as completed
reminderSchema.methods.markCompleted = async function() {
  this.status = 'completed';
  this.metadata.completedAt = new Date();
  
  // Update user analytics
  await mongoose.model('User').updateOne(
    { _id: this.user },
    { $inc: { 'analytics.completedReminders': 1 } }
  );
  
  return this.save();
};

// Method to snooze reminder
reminderSchema.methods.snooze = function(minutes = 15) {
  this.status = 'snoozed';
  this.metadata.snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
  this.metadata.snoozeCount += 1;
  return this.save();
};

// Method to generate next occurrence for recurring reminders
reminderSchema.methods.generateNextOccurrence = function() {
  if (this.recurrence.type === 'none') return null;
  
  const next = new Date(this.scheduledTime);
  
  switch (this.recurrence.type) {
    case 'daily':
      next.setDate(next.getDate() + this.recurrence.interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * this.recurrence.interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + this.recurrence.interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + this.recurrence.interval);
      break;
  }
  
  // Check if we've exceeded the end date or max occurrences
  if (this.recurrence.endDate && next > this.recurrence.endDate) {
    return null;
  }
  
  return next;
};

// Method to create share token
reminderSchema.methods.createShareToken = function(expirationHours = 24) {
  const jwt = require('jsonwebtoken');
  const shareToken = jwt.sign(
    { 
      reminderId: this._id,
      sharedBy: this.user,
      type: 'reminder_share'
    },
    process.env.JWT_SECRET,
    { expiresIn: `${expirationHours}h` }
  );
  
  this.sharing.isShared = true;
  this.sharing.shareToken = shareToken;
  this.sharing.sharedAt = new Date();
  this.sharing.expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  
  return shareToken;
};

// Method to increment view count
reminderSchema.methods.incrementView = function() {
  this.metadata.viewCount += 1;
  this.metadata.lastViewed = new Date();
  return this.save();
};

// Static method to find due reminders
reminderSchema.statics.findDueReminders = function() {
  const now = new Date();
  return this.find({
    $or: [
      {
        status: 'pending',
        scheduledTime: { $lte: now }
      },
      {
        status: 'snoozed',
        'metadata.snoozeUntil': { $lte: now }
      }
    ]
  }).populate('user', 'username email notifications profile');
};

// Static method to find upcoming reminders
reminderSchema.statics.findUpcomingReminders = function(userId, hours = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  return this.find({
    user: userId,
    status: 'pending',
    scheduledTime: { $gte: now, $lte: future }
  }).sort({ scheduledTime: 1 });
};

// Static method to get user statistics
reminderSchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'pending'] },
                  { $lt: ['$scheduledTime', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        byPriority: {
          $push: '$priority'
        },
        byTags: {
          $push: '$tags'
        }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    byPriority: [],
    byTags: []
  };
};

// Pre-save middleware to update user analytics
reminderSchema.pre('save', async function(next) {
  if (this.isNew) {
    await mongoose.model('User').updateOne(
      { _id: this.user },
      { $inc: { 'analytics.totalReminders': 1 } }
    );
  }
  next();
});

// Pre-remove middleware to update user analytics
reminderSchema.pre('remove', async function(next) {
  await mongoose.model('User').updateOne(
    { _id: this.user },
    { $inc: { 'analytics.totalReminders': -1 } }
  );
  
  if (this.status === 'completed') {
    await mongoose.model('User').updateOne(
      { _id: this.user },
      { $inc: { 'analytics.completedReminders': -1 } }
    );
  }
  
  next();
});

module.exports = mongoose.model('Reminder', reminderSchema);