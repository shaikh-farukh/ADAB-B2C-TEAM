const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pool = require('./db');

const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5005; 

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Routes
app.use('/api/admin', adminRoutes);

// Health / Sample API Route with DB check
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

// Admin Routes
const adminRoutes = require('./src/routes/adminRoutes');
app.use('/api/v1/admin', adminRoutes);

app.get('/api/data', (req, res) => {
  res.json({ message: "Hello from Admin Portal backend server!" });
});

// Start Server if launched directly
// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;