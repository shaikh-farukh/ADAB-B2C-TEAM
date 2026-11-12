const pool = require('./db');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

// Route imports
const catalogRoutes = require('./routes/catalog');
const customerRoutes = require('./routes/customer');
const wishlistRoutes = require('./routes/wishlist');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const productRoutes = require('./routes/productRoutes');
const supportRoutes = require('./routes/supportRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const returnRoutes = require('./routes/returnRoutes');
const refundRoutes = require('./routes/refundRoutes');

const app = express();
const PORT = process.env.PORT || 5002;
const isProd = process.env.NODE_ENV === 'production';

// Disable weak ETags for dynamic REST APIs (prevents HTTP 304 conditional cache matches)
app.set('etag', false);

// Middleware
app.use(cors());
app.use(express.json({
  limit: '25mb', // TODO: reduce if you don't upload large JSON/base64 files
  verify: (req, res, buf) => {
    req.rawBody = buf; // TODO: keep only if payment webhooks need it
  }
}));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Dynamic REST APIs Cache-Control headers
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const deprecatedMount = (canonicalBase) => (req, res, next) => {
  console.warn(`[DEPRECATED] ${req.method} ${req.originalUrl}`);
  res.set('Deprecation', 'true');
  if (!res.getHeader('X-Canonical-Endpoint')) {
    res.set('X-Canonical-Endpoint', `${canonicalBase}${req.url === '/' ? '' : req.url}`);
  }
  next();
};

// API V1 Mounting (canonical) + unversioned /api aliases for backward compatibility
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', deprecatedMount('/api/v1/auth'), authRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/catalog', deprecatedMount('/api/v1/catalog'), catalogRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/customers', deprecatedMount('/api/v1/customers'), customerRoutes);
app.use('/api/v1/wishlist', deprecatedMount('/api/v1/customers/me/wishlist'), wishlistRoutes);
app.use('/api/wishlist', deprecatedMount('/api/v1/customers/me/wishlist'), wishlistRoutes);

app.use('/api/v1/cart', cartRoutes);
app.use('/api/cart', deprecatedMount('/api/v1/cart'), cartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/checkout', deprecatedMount('/api/v1/checkout'), checkoutRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/orders', deprecatedMount('/api/v1/orders'), orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/payments', deprecatedMount('/api/v1/payments'), paymentRoutes);
app.use('/api/v1/returns', returnRoutes);
app.use('/api/returns', deprecatedMount('/api/v1/returns'), returnRoutes);
app.use('/api/v1/refunds', refundRoutes);
app.use('/api/refunds', deprecatedMount('/api/v1/refunds'), refundRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/reviews', deprecatedMount('/api/v1/reviews'), reviewRoutes);
app.use('/api/v1/products', deprecatedMount('/api/v1/catalog/products'), productRoutes);
app.use('/api/products', deprecatedMount('/api/v1/catalog/products'), productRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/support', deprecatedMount('/api/v1/support'), supportRoutes);
app.use('/api/v1/rewards', rewardRoutes);
app.use('/api/rewards', deprecatedMount('/api/v1/rewards'), rewardRoutes);

// Health check with DB test
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    res.json({
      status: 'ok',
      service: 'ADAB-Customer-Portal Backend',
      db_time: result.rows[0].db_time
    });
  } catch (err) {
    console.error('Health check DB error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed'
    });
  }
});

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    status: 'error',
    message: status >= 500 && isProd
      ? 'An unexpected internal server error occurred'
      : (err.message || 'An unexpected internal server error occurred')
  });
});

// Start server + graceful shutdown (only when run directly)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(async () => {
      await pool.end();
      console.log('Database pool closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref(); // force exit after 10s
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;
