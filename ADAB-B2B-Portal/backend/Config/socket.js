import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

let io = null;

/**
 * Initializes Socket.io on the existing B2B HTTP server.
 * Reuses existing JWT secret and authentication mechanism.
 */
export const initSocket = (httpServer) => {
  if (io) return io;

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002'
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server) or allowed origins
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // JWT Authentication Middleware for Socket.io
  io.use((socket, next) => {
    try {
      let rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      console.log('--- Socket Connection Attempt ---');
      console.log('Headers cookie:', socket.handshake.headers?.cookie);
      console.log('Auth token:', socket.handshake.auth?.token);

      if (!rawToken && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, currentCookie) => {
          const parts = currentCookie.trim().split('=');
          if (parts.length >= 2) {
            acc[parts[0]] = parts.slice(1).join('=');
          }
          return acc;
        }, {});
        console.log('Parsed cookies keys:', Object.keys(cookies));
        rawToken = cookies.token;
      }

      console.log('Raw token found?', !!rawToken);

      if (!rawToken) {
        return next(new Error('Authentication token required'));
      }

      const token = typeof rawToken === 'string' && rawToken.startsWith('Bearer ')
        ? rawToken.slice(7).trim()
        : rawToken;

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('❌ Socket Auth Error: JWT_SECRET environment variable is not set');
        return next(new Error('Server configuration error: JWT_SECRET missing'));
      }

      const decoded = jwt.verify(token, secret);
      socket.user = decoded;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Invalid token'));
    }
  });

  // Connection & Room Management
  io.on('connection', (socket) => {
    const userId = socket.user?.userId || socket.user?.id;
    const role = socket.user?.role;
    const shopId = socket.user?.shopId || socket.user?.shop_id || (role === 'shop' ? userId : null);

    console.log(`🔌 [Socket.io] Connected: socket_id=${socket.id} (user_${userId}, role=${role || 'unknown'})`);

    // 1. Join user-specific room: user_${id}
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 Socket ${socket.id} joined room: user_${userId}`);
    }

    // 2. Join shop-specific room: shop_${id}
    if (shopId) {
      socket.join(`shop_${shopId}`);
      console.log(`🏪 Socket ${socket.id} joined room: shop_${shopId}`);
    }

    // Dynamic room subscription (e.g., distributor or admin observing shop updates)
    socket.on('join_shop', (targetShopId) => {
      if (targetShopId) {
        socket.join(`shop_${targetShopId}`);
        console.log(`🏪 Socket ${socket.id} joined shop_${targetShopId}`);
      }
    });

    socket.on('leave_shop', (targetShopId) => {
      if (targetShopId) {
        socket.leave(`shop_${targetShopId}`);
        console.log(`Socket ${socket.id} left shop_${targetShopId}`);
      }
    });

    // Error handling
    socket.on('error', (err) => {
      console.error(`❌ Socket error on ${socket.id}:`, err.message);
    });

    // Disconnect lifecycle
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket.io] Disconnected: socket_id=${socket.id}, reason=${reason}`);
    });
  });

  console.log('✅ Socket.io initialized on B2B HTTP server');
  return io;
};

/**
 * Getter for the initialized Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket(server) first.');
  }
  return io;
};

export default { initSocket, getIO };
