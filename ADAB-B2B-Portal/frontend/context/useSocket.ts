import { useContext, useEffect, useRef } from 'react';
import { SocketContext, SocketContextType } from './SocketContext';

export interface UseSocketOptions {
  event?: string;
  handler?: (...args: any[]) => void;
}

/**
 * Custom hook to access the Socket.io client context and optionally listen to socket events with automatic cleanup.
 *
 * Usage 1 - Context access:
 *   const { socket, isConnected, emit, joinShop } = useSocket();
 *
 * Usage 2 - Event subscription with automatic cleanup:
 *   useSocket({ event: 'new_order', handler: (order) => console.log(order) });
 */
export const useSocket = (options?: UseSocketOptions): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  const { socket } = context;
  const handlerRef = useRef(options?.handler);
  handlerRef.current = options?.handler;

  useEffect(() => {
    if (!socket || !options?.event || !handlerRef.current) return;

    const eventName = options.event;
    const listener = (...args: any[]) => {
      handlerRef.current?.(...args);
    };

    socket.on(eventName, listener);

    return () => {
      socket.off(eventName, listener);
    };
  }, [socket, options?.event]);

  return context;
};

export default useSocket;
