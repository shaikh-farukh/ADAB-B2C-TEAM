import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  joinShop: (shopId: string | number) => void;
  leaveShop: (shopId: string | number) => void;
  emit: (event: string, data?: any) => void;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

const getSocketUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
  if (envUrl) return envUrl;

  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const socketUrl = envUrl || apiBaseUrl;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    return 'http://localhost:5000';
  }

  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }

  return 'https://adab-backend-b2b-1705.onrender.com';
};

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * Responsibility: Centralized Socket.io client provider for ADAB B2B Portal.
 * Manages WebSocket connection lifecycle, token authentication, auto-reconnection, and room subscription.
 */
export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const { isLoggedIn, role } = useAuthStore();

  useEffect(() => {
    const hasRole = !!role || !!localStorage.getItem('user_role');
    const socketUrl = getSocketUrl();

    // If not logged in, do not connect
    if (!hasRole) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setIsConnecting(false);
      }
      return;
    }

    setIsConnecting(true);
    setError(null);

    const s = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'], // Polling first is required to send HttpOnly cookies securely cross-origin
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      console.log('✅ [Socket] Connected to B2B server:', s.id);
    });

    s.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('🔌 [Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // The server forcefully disconnected the socket, reconnect manually
        s.connect();
      }
    });

    s.on('connect_error', (err) => {
      setIsConnecting(false);
      setError(err.message);
      console.warn('⚠️ [Socket] Connection error:', err.message);
    });

    s.on('reconnect_attempt', () => {
      setIsConnecting(true);
    });

    s.on('reconnect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      console.log('🔄 [Socket] Successfully reconnected to B2B server');
    });

    s.on('reconnect_failed', () => {
      setIsConnecting(false);
      setError('Failed to reconnect to real-time server');
      console.error('❌ [Socket] Reconnection failed');
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [isLoggedIn, role]);

  const joinShop = useCallback((shopId: string | number) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_shop', shopId);
    }
  }, []);

  const leaveShop = useCallback((shopId: string | number) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave_shop', shopId);
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit '${event}': socket not connected`);
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isConnecting,
        error,
        joinShop,
        leaveShop,
        emit
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
