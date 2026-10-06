import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  notifications: Notification[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Responsibility: Global state manager for system notifications.
 * Provides stable helpers for triggering UI alerts from any component.
 */
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    if (message === 'REQUEST_CANCELLED') return;

    setNotifications((prev) => {
      // Prevent duplicate active toasts
      if (prev.some((n) => n.message === message && n.type === type)) {
        return prev;
      }

      const id = Math.random().toString(36).substring(2, 9);

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        removeNotification(id);
      }, 4000);

      return [...prev, { id, type, message }];
    });
  }, [removeNotification]);

  const showSuccess = useCallback((message: string) => addNotification('success', message), [addNotification]);
  const showError = useCallback((message: string) => addNotification('error', message), [addNotification]);
  const showWarning = useCallback((message: string) => addNotification('warning', message), [addNotification]);
  const showInfo = useCallback((message: string) => addNotification('info', message), [addNotification]);

  return (
    <NotificationContext.Provider
      value={{ notifications, showSuccess, showError, showWarning, showInfo, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};