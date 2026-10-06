const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5002; 

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Route imports
const catalogRoutes = require('./routes/catalog');
const customerRoutes = require('./routes/customer');

// API V1 Mounting
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/customers', customerRoutes);

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

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});