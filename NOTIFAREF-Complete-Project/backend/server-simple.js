require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'https://localhost:3000',
      process.env.BASE_URL,
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version,
    services: {
      database: 'not_connected',
      scheduler: 'not_running',
      notifications: {
        vapid: !!process.env.VAPID_PUBLIC_KEY,
        email: !!process.env.EMAIL_USER
      }
    }
  });
});

// Mock API endpoints for testing frontend
app.get('/api/notifications/vapid-key', (req, res) => {
  res.json({
    success: true,
    data: {
      publicKey: process.env.VAPID_PUBLIC_KEY || 'mock-vapid-key'
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'User registered successfully (mock)',
    token: 'mock-jwt-token',
    user: {
      _id: 'mock-user-id',
      username: req.body.username,
      email: req.body.email,
      profile: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        language: req.body.language || 'fa',
        theme: 'light'
      },
      analytics: {
        totalReminders: 0,
        completedReminders: 0
      }
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login successful (mock)',
    token: 'mock-jwt-token',
    user: {
      _id: 'mock-user-id',
      username: req.body.username,
      email: 'user@example.com',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        language: 'fa',
        theme: 'light'
      },
      analytics: {
        totalReminders: 5,
        completedReminders: 3
      }
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      _id: 'mock-user-id',
      username: 'testuser',
      email: 'user@example.com',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        language: 'fa',
        theme: 'light'
      },
      analytics: {
        totalReminders: 5,
        completedReminders: 3
      }
    }
  });
});

app.get('/api/reminders', (req, res) => {
  const mockReminders = [
    {
      _id: '1',
      title: 'جلسه تیم',
      description: 'جلسه هفتگی تیم توسعه',
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      priority: 'high',
      tags: ['کار', 'جلسه'],
      recurrence: { type: 'weekly' }
    },
    {
      _id: '2',
      title: 'خرید مواد غذایی',
      description: 'خرید مواد غذایی برای هفته',
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      priority: 'medium',
      tags: ['شخصی', 'خرید'],
      recurrence: { type: 'none' }
    }
  ];

  res.json({
    success: true,
    data: {
      reminders: mockReminders,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: mockReminders.length,
        hasNextPage: false,
        hasPrevPage: false
      }
    }
  });
});

app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      reminders: {
        total: 5,
        status: {
          pending: 2,
          completed: 3,
          cancelled: 0,
          snoozed: 0
        },
        priority: {
          low: 1,
          medium: 2,
          high: 1,
          urgent: 1
        },
        upcoming: 2,
        overdue: 0
      },
      user: {
        totalReminders: 5,
        completedReminders: 3,
        completionRate: 60,
        joinedDays: 30
      }
    }
  });
});

// Serve shared reminder pages
app.get('/shared/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/shared.html'));
});

// Serve main application pages
app.get('/dashboard*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/profile*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/profile.html'));
});

app.get('/analytics*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/analytics.html'));
});

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 NOTIFAREF Server Started Successfully! (Simple Mode)

📍 Server Details:
   • Port: ${PORT}
   • Environment: ${process.env.NODE_ENV || 'development'}
   • Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}

🔧 Services Status:
   • Database: Mock Mode (SQLite not connected yet)
   • Scheduler: Disabled
   • Notifications: ${process.env.VAPID_PUBLIC_KEY ? '✅ Configured' : '⚠️  Mock Mode'}
   • Email: ${process.env.EMAIL_USER ? '✅ Configured' : '⚠️  Mock Mode'}

📱 PWA Features:
   • Service Worker: Enabled
   • Push Notifications: Mock Mode
   • Offline Support: Enabled
   • Install Prompts: Enabled

🌐 Access Points:
   • Main App: ${process.env.BASE_URL || `http://localhost:${PORT}`}
   • Dashboard: ${process.env.BASE_URL || `http://localhost:${PORT}`}/dashboard
   • API Health: ${process.env.BASE_URL || `http://localhost:${PORT}`}/health

Ready to serve requests! 🎉
  `);
});

module.exports = app;