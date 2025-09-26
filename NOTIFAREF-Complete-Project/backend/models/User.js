const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    avatar: { type: String },
    language: { type: String, enum: ['en', 'fa'], default: 'fa' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    timezone: { type: String, default: 'Asia/Tehran' }
  },
  notifications: {
    webPush: {
      enabled: { type: Boolean, default: true },
      subscription: {
        endpoint: String,
        keys: {
          p256dh: String,
          auth: String
        }
      }
    },
    email: {
      enabled: { type: Boolean, default: true },
      fallback: { type: Boolean, default: true }
    }
  },
  security: {
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      secret: String,
      backupCodes: [String]
    },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date
  },
  integrations: {
    googleCalendar: {
      connected: { type: Boolean, default: false },
      refreshToken: String,
      accessToken: String,
      calendarId: String
    }
  },
  analytics: {
    totalReminders: { type: Number, default: 0 },
    completedReminders: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'analytics.lastActive': 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 'security.loginAttempts': 1, 'security.lockUntil': 1 }
  });
};

// Method to update last active
userSchema.methods.updateLastActive = function() {
  this.analytics.lastActive = new Date();
  return this.save();
};

// Method to get user stats
userSchema.methods.getStats = function() {
  const now = new Date();
  const joinedDays = Math.ceil((now - this.analytics.joinedAt) / (1000 * 60 * 60 * 24));
  const completionRate = this.analytics.totalReminders > 0 
    ? (this.analytics.completedReminders / this.analytics.totalReminders * 100).toFixed(1)
    : 0;
  
  return {
    totalReminders: this.analytics.totalReminders,
    completedReminders: this.analytics.completedReminders,
    completionRate: parseFloat(completionRate),
    joinedDays,
    lastActive: this.analytics.lastActive
  };
};

module.exports = mongoose.model('User', userSchema);