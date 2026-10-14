const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5002; 

// Middleware
app.use(cors()); 
app.use(express.json({
  limit: '25mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
})); 
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Route imports
const catalogRoutes = require('./routes/catalog');
const customerRoutes = require('./routes/customer');
const wishlistRoutes = require('./routes/wishlist');
const authRoutes = require('./routes/authRoutes');

// API V1 Mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);

// Health / Sample API Route with DB check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    res.json({ 
      status: 'ok', 
      service: 'ADAB-Customer-Portal Backend', 
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
  res.json({ message: "Hello from Customer Portal backend server!" });
});

// Routes
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const productRoutes = require('./routes/productRoutes');
const supportRoutes = require('./routes/supportRoutes');
const rewardRoutes = require('./routes/rewardRoutes');

app.use('/api/v1/cart', cartRoutes);
app.use('/api/cart', cartRoutes);

app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/checkout', checkoutRoutes);

app.use('/api/v1/orders', orderRoutes);
app.use('/api/orders', orderRoutes);

app.use('/api/v1/payments', paymentRoutes);
app.use('/api/payments', paymentRoutes);

app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/reviews', reviewRoutes);

app.use('/api/v1/products', productRoutes);
app.use('/api/products', productRoutes);

app.use('/api/v1/support', supportRoutes);
app.use('/api/support', supportRoutes);

app.use('/api/v1/rewards', rewardRoutes);
app.use('/api/rewards', rewardRoutes);

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
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'An unexpected internal server error occurred'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  const pool = require('./db');
  await pool.end();
  console.log('Database pool closed.');
  process.exit(0);
});