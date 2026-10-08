const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5003; 

// Middleware
app.use(cors()); 
app.use(express.json()); 

const sellerRoutes = require('./src/routes/seller');
const listingRoutes = require('./src/routes/listing');
const marketingRoutes = require('./src/routes/marketing');
const pricingRoutes = require('./src/routes/pricing');

// Health / Sample API Route with DB check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    res.json({ 
      status: 'ok', 
      service: 'ADAB-Shop-Portal Backend', 
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

// Domain Routes
app.use('/api/v1/seller', marketingRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/seller/listings', listingRoutes);
app.use('/api/v1/seller/pricing', pricingRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});