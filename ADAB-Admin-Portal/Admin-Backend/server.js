const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
dotenv.config();

const pool = require('./db');
const adminRoutes = require('./routes/adminRoutes');
const legacyAdminRoutes = require('./src/routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5005;

// Trust Proxy (Configure for typical 1-level load balancers like Render/Heroku)
// Document assumption: If using multiple proxies/WAF, this needs adjusting.
app.set('trust proxy', 1);

// Structured Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path, // Use req.path instead of originalUrl to avoid raw query strings / PII leakage
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip // Safe due to trust proxy
    }));
  });
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : 2500, // Generous limit in dev, strict in test
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Never rate limit CORS preflight requests
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Apply rate limiter to all API routes
app.use('/api/', limiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin', legacyAdminRoutes);
app.use('/api/admin', adminRoutes);

// Health Route
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    res.json({
      status: 'ok',
      service: 'ADAB-Admin-Portal Backend',
      db_time: result.rows[0].db_time
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

app.get('/api/data', (req, res) => {
  res.json({ message: "Hello from Admin Portal backend server!" });
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use by another process.`);
      console.error(`   Please terminate the existing process or use a different port.`);
    } else {
      console.error('❌ Server startup error:', err.message);
    }
  });

  process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception:', err.message);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down Admin Backend cleanly...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;