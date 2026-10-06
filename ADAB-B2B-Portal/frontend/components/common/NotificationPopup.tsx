import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { useNotification, NotificationType } from '../../context/NotificationContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-adab-green" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const STYLES = {
  success: 'bg-white border-l-4 border-l-adab-green border-gray-100 shadow-green-900/5',
  error: 'bg-white border-l-4 border-l-red-500 border-gray-100 shadow-red-900/5',
  warning: 'bg-white border-l-4 border-l-amber-500 border-gray-100 shadow-amber-900/5',
  info: 'bg-white border-l-4 border-l-blue-500 border-gray-100 shadow-blue-900/5',
};

/**
 * Responsibility: Renders a stack of active notifications in the top-right corner.
 * Animation: Slide-in from right with a fade transition.
 */
const NotificationPopup: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-4 w-full max-w-[400px] pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            "pointer-events-auto flex items-start gap-4 p-5 rounded-2xl border shadow-2xl animate-in slide-in-from-right-full fade-in duration-500",
            STYLES[notification.type]
          )}
          role="alert"
        >
          <div className="shrink-0 mt-0.5">
            {ICONS[notification.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1 leading-none">
              {notification.type} System Alert
            </p>
            <p className="text-sm font-bold text-gray-800 leading-relaxed">
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="shrink-0 text-gray-300 hover:text-gray-900 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationPopup;
