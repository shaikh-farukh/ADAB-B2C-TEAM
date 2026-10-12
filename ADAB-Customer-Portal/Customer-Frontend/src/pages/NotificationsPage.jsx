import React, { useState } from 'react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto w-full pt-2 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-900">Notifications</h2>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="text-sm font-bold text-brand-green hover:text-green-800 cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-gray-100 p-12 rounded-3xl text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
            <i className="fa-regular fa-bell"></i>
          </div>
          <h3 className="font-bold text-gray-900 mb-1">No notifications yet</h3>
          <p className="text-sm text-gray-500">We'll let you know when we have updates for you.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map(notif => (
            <div 
              key={notif.id}
              className={`flex gap-4 p-4 rounded-2xl border transition-colors ${
                notif.read ? 'bg-white border-gray-100' : 'bg-green-50/50 border-green-100'
              }`}
              onClick={() => {
                if (!notif.read) {
                  setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                }
              }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${notif.bg} ${notif.color}`}>
                <i className={`fa-solid ${notif.icon}`}></i>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm ${notif.read ? 'font-bold text-gray-700' : 'font-extrabold text-gray-900'}`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{notif.date}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {notif.message}
                </p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-brand-green mt-2 shrink-0"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
