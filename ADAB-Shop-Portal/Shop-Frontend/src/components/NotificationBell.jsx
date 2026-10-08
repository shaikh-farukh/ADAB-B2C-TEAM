import React, { useState, useEffect } from 'react';
import sellerService from '../services/sellerService';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await sellerService.getUnreadNotificationsCount();
      if (res.success) {
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      console.error("Error fetching unread count", err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await sellerService.getNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await sellerService.markNotificationRead(id);
      if (res.success) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={handleToggle}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
      >
        <i className="fa-solid fa-bell"></i>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-extrabold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-brand-dark text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-xs font-bold text-gray-400">Loading notifications...</div>
            ) : error ? (
              <div className="p-6 text-center text-xs font-bold text-red-500">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-gray-400">No notifications yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(notif => (
                  <div key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors flex gap-3 ${!notif.is_read ? 'bg-blue-50/30' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'ORDER' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      <i className={`fa-solid ${notif.type === 'ORDER' ? 'fa-box' : 'fa-triangle-exclamation'} text-xs`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className={`text-xs font-bold truncate pr-2 ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[9px] font-bold text-gray-400 shrink-0">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug line-clamp-2 mb-2">
                        {notif.message}
                      </p>
                      {!notif.is_read && (
                        <button 
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-gray-50 bg-gray-50/50 text-center">
            <button className="text-[11px] font-bold text-gray-500 hover:text-brand-dark transition-colors">
              View all activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
