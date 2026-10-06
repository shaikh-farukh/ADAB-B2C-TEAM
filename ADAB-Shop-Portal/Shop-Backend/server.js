const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pool = require('./db');

// Route modules
const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const fulfillmentRoutes = require('./routes/fulfillmentRoutes');
const returnRoutes = require('./routes/returnRoutes');
const financeRoutes = require('./routes/financeRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const stockRoutes = require('./routes/stockRoutes');
const posRoutes = require('./routes/posRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json());

const sellerRoutes = require('./src/routes/seller');
const listingRoutes = require('./src/routes/listing');

// Health / Sample API Route with DB check
// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health / Status Check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    res.json({
      status: 'ok',
      service: 'ADAB-Shop-Portal Backend (Seller Domain)',
      db_status: 'connected',
      db_time: result.rows[0].db_time
    });
  } catch (err) {
    res.json({
      status: 'ok',
      service: 'ADAB-Shop-Portal Backend (Seller Domain)',
      db_status: 'degraded_mode_active',
      db_notice: 'Operating with resilience layer: ' + err.message
    });
  }
});

// Domain Routes
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/seller/listings', listingRoutes);
// Mount Canonical Mayank Seller Domain Routes
app.use('/api/v1/seller/inventory', inventoryRoutes);
app.use('/api/v1/seller/orders', orderRoutes);
app.use('/api/v1/seller/shipments', fulfillmentRoutes);
app.use('/api/v1/seller/fulfillment', fulfillmentRoutes);
app.use('/api/v1/seller/returns', returnRoutes);
app.use('/api/v1/seller/finance', financeRoutes);
app.use('/api/v1/seller/analytics', analyticsRoutes);
app.use('/api/v1/seller/reviews', reviewRoutes);
app.use('/api/v1/seller/purchase-orders', stockRoutes);
app.use('/api/v1/seller/buystock', stockRoutes);
app.use('/api/v1/seller/pos', posRoutes);
app.use('/api/v1/seller/notifications', notificationRoutes);

// Fallback legacy test route
app.get('/api/data', (req, res) => {
  res.json({ message: "Hello from Shop Portal backend server!" });
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 ADAB Shop Portal (Seller Domain) running on http://localhost:${PORT}`);
  });
}

module.exports = app;