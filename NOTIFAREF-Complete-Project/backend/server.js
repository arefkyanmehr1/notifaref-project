require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import services
const schedulerService = require('./services/schedulerService');
const notificationService = require('./services/notificationService');

// Import routes
const authRoutes = require('./routes/auth');
const reminderRoutes = require('./routes/reminders');
const notificationRoutes = require('./routes/notifications');
const calendarRoutes = require('./routes/calendar');
const analyticsRoutes = require('./routes/analytics');

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
      callback(new Error('Not allowed by CORS'));
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
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
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
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      scheduler: schedulerService.getStatus().isRunning ? 'running' : 'stopped',
      notifications: {
        vapid: !!process.env.VAPID_PUBLIC_KEY,
        email: !!process.env.EMAIL_USER
      }
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/analytics', analyticsRoutes);

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

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
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

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notifaref';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected successfully');
    
    // Initialize scheduler after DB connection
    await schedulerService.init();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Shutdown scheduler
    schedulerService.shutdown();

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`
🚀 NOTIFAREF Server Started Successfully!

📍 Server Details:
   • Port: ${PORT}
   • Environment: ${process.env.NODE_ENV || 'development'}
   • Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}

🔧 Services Status:
   • Database: Connecting...
   • Scheduler: Initializing...
   • Notifications: ${process.env.VAPID_PUBLIC_KEY ? '✅ Configured' : '⚠️  Not configured'}
   • Email: ${process.env.EMAIL_USER ? '✅ Configured' : '⚠️  Not configured'}

📱 PWA Features:
   • Service Worker: Enabled
   • Push Notifications: ${process.env.VAPID_PUBLIC_KEY ? 'Ready' : 'Needs VAPID keys'}
   • Offline Support: Enabled
   • Install Prompts: Enabled

🌐 Access Points:
   • Main App: ${process.env.BASE_URL || `http://localhost:${PORT}`}
   • Dashboard: ${process.env.BASE_URL || `http://localhost:${PORT}`}/dashboard
   • API Health: ${process.env.BASE_URL || `http://localhost:${PORT}`}/health

🔐 Security Features:
   • CORS: Enabled
   • Helmet: Enabled
   • Rate Limiting: Enabled
   • JWT Authentication: Ready
   • 2FA Support: Ready

📊 Analytics & Features:
   • User Analytics: Enabled
   • Reminder Sharing: Enabled
   • Google Calendar: ${process.env.GOOGLE_CLIENT_ID ? 'Ready' : 'Needs OAuth setup'}
   • Localization: Persian/English
   • Themes: Light/Dark with RTL support

Ready to serve requests! 🎉
  `);

  // Connect to database
  await connectDB();
});

module.exports = app;