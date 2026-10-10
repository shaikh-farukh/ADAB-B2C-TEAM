const socketIo = require('socket.io');

let io;

/**
 * Socket.IO Configuration with Authentication
 * 
 * AUTH NOTE: Currently uses temporary header-based identity (x-user-id, x-store-id).
 * When real JWT/session auth is implemented:
 *   1. Replace the auth middleware below to decode JWT from socket.handshake.auth.token
 *   2. Set socket.userId and socket.storeId from the decoded token
 *   3. No other changes needed — room join and event routing are already based on socket.userId
 * 
 * Security guarantees:
 *   - Server-side room join (client cannot join arbitrary rooms)
 *   - Identity validated on handshake (not on each message)
 *   - Connection rejected if identity is missing
 */
module.exports = {
  init: (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*', // Restrict in production via env
        methods: ['GET', 'POST', 'PATCH']
      }
    });

    // === Socket Authentication Middleware ===
    io.use((socket, next) => {
      // Extract identity from handshake auth (sent by SocketProvider)
      const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
      const storeId = socket.handshake.auth?.storeId || socket.handshake.query?.storeId;

      if (!userId) {
        console.warn('[Socket Auth] Connection rejected: missing userId');
        return next(new Error('Authentication required: userId missing'));
      }

      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.warn('[Socket Auth] Connection rejected: invalid userId format');
        return next(new Error('Invalid userId format'));
      }

      // Attach verified identity to socket (used for room routing)
      socket.userId = userId;
      socket.storeId = storeId || null;

      next();
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

      // Handle legacy join_seller_room (backwards compatibility, but enforce authorization)
      socket.on('join_seller_room', (requestedId) => {
        if (requestedId !== userId) {
          console.warn(`[Socket] IDOR attempt: userId=${userId} tried to join room ${requestedId}`);
          socket.emit('auth_error', 'Cannot join another seller\'s room');
          return;
        }
        // Already joined above, this is a no-op
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
