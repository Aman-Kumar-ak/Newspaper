require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const driveRoutes = require('./routes/drive');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware - Helmet
if (isProduction || process.env.HELMET_ENABLED === 'true') {
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP as we set it manually
    crossOriginEmbedderPolicy: false,
  }));
}

// Trust proxy (important for production behind reverse proxy)
if (isProduction || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(isProduction ? 'combined' : 'dev'));

// CORS Configuration
// Allow multiple origins for development and production
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (allowedOrigins.some(allowed => allowed === '*' || origin.endsWith('.vercel.app'))) {
      // Allow all Vercel preview deployments
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-google-access-token', 'x-google-refresh-token'],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

if (isProduction) {
  app.use('/drive/upload', limiter); // Apply to upload endpoint
  app.use('/auth', rateLimit({ ...limiter, max: 20 })); // Stricter for auth
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser (for OAuth redirect tracking)
app.use(cookieParser());

// Custom headers for PDF embedding
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Use the same allowed origins as CORS
  const cspOrigins = allowedOrigins.join(' ');
  res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${cspOrigins}`);
  next();
});

// Health check endpoint for Uptime Robot monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ 
    ok: true, 
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Simple ping endpoint for monitoring services
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Alternative health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Cloud Newspaper API is running',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/drive', driveRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error in production
  if (isProduction) {
    console.error(`[${new Date().toISOString()}] Error ${statusCode}:`, {
      message,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } else {
    console.error(err);
  }
  
  res.status(statusCode).json({ 
    error: message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`🚀 Cloud Newspaper API Server`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Listening on port: ${PORT}`);
  console.log(`🔒 CORS Origin: ${process.env.CORS_ORIGIN || 'ALL (Development)'}`);
  console.log(`⚡ Server ready at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;

