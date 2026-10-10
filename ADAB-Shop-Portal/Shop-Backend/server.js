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

const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const sellerRoutes = require('./src/routes/seller');
const listingRoutes = require('./src/routes/listing');
const marketingRoutes = require('./src/routes/marketing');
const pricingRoutes = require('./src/routes/pricing');

// Initialize Background Jobs
require('./src/jobs/bulkUploadJob');
require('./src/jobs/pgListener');

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
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Initialize Socket.io
const socket = require('./src/config/socket');
const io = socket.init(server);

const sellerService = require('./src/services/seller');

io.on('connection', (clientSocket) => {
  console.log('Client connected to socket:', clientSocket.id);
  
  // Sellers can join their own user-specific room
  clientSocket.on('join_seller_room', (sellerId) => {
    clientSocket.join(sellerId);
    console.log(`Socket ${clientSocket.id} joined seller room: ${sellerId}`);
  });

  // Handle incoming messages from the frontend via Socket
  clientSocket.on('send_message', async (data) => {
    try {
      const { userId, customerId, content } = data;
      // Save to database using existing service
      const newMsg = await sellerService.sendMessage(userId, {
        customer_id: customerId,
        content: content
      });
      
      // Broadcast back to the seller's room (so other tabs sync)
      io.to(userId).emit('receive_message', newMsg);
      
      // If we had a customer portal, we would broadcast to customerId room here:
      // io.to(customerId).emit('receive_message', newMsg);
    } catch (err) {
      console.error('Socket send_message error:', err);
    }
  });

  clientSocket.on('mark_read', async (data) => {
    try {
      const { userId, messageId } = data;
      const updatedMsg = await sellerService.markMessageRead(userId, messageId);
      io.to(userId).emit('message_read_status', updatedMsg);
    } catch (err) {
      console.error('Socket mark_read error:', err);
    }
  });

  clientSocket.on('disconnect', () => {
    console.log('Client disconnected:', clientSocket.id);
  });
});