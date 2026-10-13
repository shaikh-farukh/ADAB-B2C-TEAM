const socketIo = require('socket.io');
const { verifyJwtToken } = require('../utils/jwt');
const pool = require('../../db');

let io;

/**
 * Socket.IO Configuration with JWT Authentication
 * 
 * Security guarantees:
 *   - Authenticated handshake via JWT token
 *   - Verifies active seller role in PostgreSQL database
 *   - Server-side room join (client cannot join arbitrary rooms)
 *   - Connection rejected if JWT token is missing or invalid
 */
module.exports = {
  init: (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PATCH']
      }
    });

    // === Socket Authentication Middleware ===
    io.use(async (socket, next) => {
      try {
        const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
        const token = rawToken ? String(rawToken).replace(/^Bearer\s+/i, '') : null;
        if (!token) {
          return next(new Error('Authentication error: Missing token'));
        }

        const decoded = verifyJwtToken(token);
        const userId = decoded.id || decoded.userId;
        if (!userId) {
          return next(new Error('Authentication error: Invalid token payload'));
        }

        const userRes = await pool.query(
          `SELECT u.id, u.status, u.user_type, s.id as store_id
           FROM users u
           LEFT JOIN seller_profiles sp ON sp.user_id = u.id
           LEFT JOIN stores s ON s.seller_id = sp.id
           WHERE u.id = $1`,
          [userId]
        );
        const user = userRes.rows && userRes.rows[0];
        if (!user || user.status !== 'ACTIVE' || String(user.user_type || '').toUpperCase() !== 'SELLER') {
          return next(new Error('Authentication error: Unauthorized seller'));
        }

        socket.userId = userId;
        socket.storeId = user.store_id || null;
        socket.user = {
          userId,
          storeId: user.store_id,
          ...decoded
        };

        next();
      } catch (err) {
        return next(new Error('Authentication error: ' + (err.message || 'Invalid token')));
      }
    });

    // === Connection Handler ===
    io.on('connection', (socket) => {
      const { userId, storeId } = socket;
      console.log(`[Socket] Seller connected: userId=${userId}, socketId=${socket.id}`);

      // SERVER-SIDE room join — client cannot manipulate this
      socket.join(userId);
      if (storeId) {
        socket.join(`store:${storeId}`);
      }

      // Emit confirmation to client
      socket.emit('authenticated', {
        userId,
        storeId,
        message: 'Connected and authenticated'
      });

      socket.on('disconnect', (reason) => {
        console.log(`[Socket] Seller disconnected: userId=${userId}, reason=${reason}`);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
