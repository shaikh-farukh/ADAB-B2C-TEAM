import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Package, Info } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocket } from '../../context/useSocket';
import { useNotification } from '../../context/NotificationContext';

export interface AppNotification {
  id: string;
  type: 'order_update' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const { showInfo } = useNotification();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Socket listener for real-time order updates
  useSocket({
    event: 'ORDER_UPDATE',
    handler: (data: any) => {
      const newNotif: AppNotification = {
        id: Math.random().toString(36).substring(7),
        type: 'order_update',
        title: 'Order Status Updated',
        message: `Order #${data.order_id || 'Unknown'} has been updated to ${data.status}.`,
        time: 'Just now',
        read: false,
        link: `/${role}/orders`,
      };

      setNotifications((prev) => [newNotif, ...prev]);
      showInfo(`Order #${data.order_id || ''} updated to ${data.status}`);
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif: AppNotification) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
    );
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative mr-2 md:mr-4" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500 hover:text-adab-green group focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 md:w-5 md:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-adab-orange rounded-full border-2 border-white group-hover:scale-110 transition-transform animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-4 ring-black/5 z-50">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold text-adab-green bg-green-50 px-2 py-1 rounded-md uppercase tracking-wider border border-green-100">
                {unreadCount} New
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No new notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group ${!notif.read ? 'bg-blue-50/20' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      notif.type === 'order_update'
                        ? 'bg-orange-50 border border-orange-100 text-adab-orange group-hover:bg-adab-orange group-hover:text-white'
                        : 'bg-blue-50 border border-blue-100 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
                    }`}>
                      {notif.type === 'order_update' ? <Package className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`text-sm mb-0.5 ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 leading-tight">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5 font-semibold uppercase tracking-wider">{notif.time}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-gray-500 hover:text-gray-700 uppercase tracking-widest transition-colors"
              >
                Mark all read
              </button>
              <button
                onClick={() => { setIsOpen(false); navigate(`/${role}/notifications`); }}
                className="text-[10px] font-bold text-adab-green hover:text-green-700 uppercase tracking-widest transition-colors"
              >
                View All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
