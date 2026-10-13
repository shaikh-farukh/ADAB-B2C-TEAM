import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5003';

/**
 * Shared Socket.IO Provider
 * 
 * Creates a single Socket.IO connection for the entire Seller Portal.
 * All components use `useSocket()` to access the shared socket instance.
 * 
 * AUTH NOTE: Currently uses temporary dev identity headers.
 * When real JWT/session auth is implemented, update the `auth` object
 * in the socket connection to pass the real token. No other changes needed.
 * 
 * Features:
 * - Single connection (no duplicates across components)
 * - Authenticated handshake (userId + storeId sent to server)
 * - Server-side room join (no client-side room manipulation)
 * - Auto-reconnection with state recovery
 * - Connection status tracking
 */
export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  // Get JWT token from localStorage
  const getToken = () => localStorage.getItem('seller_token') || localStorage.getItem('token') || null;

  const getUserId = () => {
    const directId = localStorage.getItem('seller_user_id');
    if (directId) return directId;
    try {
      const user = JSON.parse(localStorage.getItem('seller_user') || localStorage.getItem('user') || localStorage.getItem('seller_profile_cache') || '{}');
      return user.id || user.userId || user.user_id || null;
    } catch {
      return null;
    }
  };

  const getStoreId = () => {
    const directStoreId = localStorage.getItem('seller_store_id');
    if (directStoreId) return directStoreId;
    try {
      const store = JSON.parse(localStorage.getItem('seller_store') || localStorage.getItem('store') || localStorage.getItem('seller_store_cache') || '{}');
      return store.id || store.storeId || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      reconnectionDelayMax: 10000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      // Auth sent in handshake — server validates JWT and auto-joins room
      auth: {
        token,
      },
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setIsConnected(false);
    });

    newSocket.on('auth_error', (msg) => {
      console.error('[Socket] Authentication error:', msg);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   * Components should call this in useEffect and clean up on unmount.
   */
  const subscribe = useCallback((event, handler) => {
    const s = socketRef.current;
    if (s) {
      s.on(event, handler);
    }
    return () => {
      if (s) {
        s.off(event, handler);
      }
    };
  }, []);

  const value = {
    socket,
    isConnected,
    subscribe,
    getUserId,
    getStoreId,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Hook to access the shared socket connection.
 * Must be used within a <SocketProvider>.
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a <SocketProvider>');
  }
  return context;
};

export default SocketContext;
