import React, { useState, useEffect, useMemo } from 'react';
import { CustomerAPI } from '../services/api';

/**
 * Customer Notification Inbox Component (sec-notifications)
 * Replicates unified-customer-portal-demo.html:
 * 1. Dedicated notification view / slide-out inbox matching demo styling
 * 2. Displays real notifications (Order status updates, KYC/Address notices, Delivery alerts, Reward points)
 * 3. Individual "Mark as Read" toggle and "Mark All as Read" button
 * 4. Filter chips: All, Orders & Delivery, KYC & Account, Offers & Rewards
 * 5. Real-time unread badge counter sync with header and bottom nav
 */
export default function NotificationsView({
  notifications: initialNotifications = null,
  onBack,
  onNavigate = () => {},
  showToast = () => {},
  onUnreadCountChange = () => {},
  isSlideOut = false,
  onCloseSlideOut
}) {
  const [notifications, setNotifications] = useState(() => initialNotifications || []);
  const [loading, setLoading] = useState(!initialNotifications);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ORDERS' | 'DELIVERY' | 'ACCOUNT' | 'OFFERS'
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch notifications from real backend API on mount
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await CustomerAPI.getNotifications();
      if (res?.data && Array.isArray(res.data)) {
        setNotifications(res.data);
        const unread = res.data.filter((n) => !n.is_read).length;
        onUnreadCountChange(unread);
      }
    } catch (err) {
      console.warn('Could not fetch notifications from backend:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialNotifications) {
      fetchNotifications();
    }
  }, [initialNotifications]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Mark single notification as read / unread toggle
  const handleToggleRead = async (notifId, currentStatus, e) => {
    if (e) e.stopPropagation();
    const newStatus = !currentStatus;

    // Optimistic UI update
    const updated = notifications.map((n) =>
      n.id === notifId ? { ...n, is_read: newStatus } : n
    );
    setNotifications(updated);
    const newUnread = updated.filter((n) => !n.is_read).length;
    onUnreadCountChange(newUnread);

    try {
      if (newStatus) {
        await CustomerAPI.markNotificationRead(notifId);
        showToast('Notification marked as read');
      }
    } catch (err) {
      console.warn('Failed to update notification read status on backend:', err.message);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      setMarkingAll(true);
      // Optimistic update
      const updated = notifications.map((n) => ({ ...n, is_read: true }));
      setNotifications(updated);
      onUnreadCountChange(0);

      await CustomerAPI.markAllNotificationsRead();
      showToast('✓ All notifications marked as read');
    } catch (err) {
      console.warn('Failed to mark all as read on backend:', err.message);
      showToast('✓ All notifications marked as read locally');
    } finally {
      setMarkingAll(false);
    }
  };

  // Relative time helper
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Style and icon mapper matching unified-customer-portal-demo.html
  const getNotificationVisuals = (notif) => {
    const typeUpper = (notif.type || '').toUpperCase();
    const titleLower = (notif.title || '').toLowerCase();

    // 1. Delivery Alert (e.g., "Rider nearby!") -> Orange theme from demo
    if (typeUpper.includes('DELIVERY') || titleLower.includes('rider') || titleLower.includes('nearby') || titleLower.includes('way')) {
      return {
        cardClass: notif.is_read
          ? 'border border-gray-100 bg-white hover:border-orange-200'
          : 'border-l-4 border-l-orange-500 bg-orange-50/80 hover:bg-orange-50',
        badgeBg: 'bg-orange-100 text-orange-600',
        icon: 'fa-motorcycle',
        tag: 'Delivery Alert',
        borderAccent: 'border-l-orange-500'
      };
    }

    // 2. Order Status Update (e.g., "Order packed", "Order placed") -> Green theme from demo
    if (typeUpper.includes('ORDER') || titleLower.includes('packed') || titleLower.includes('placed') || titleLower.includes('delivered')) {
      return {
        cardClass: notif.is_read
          ? 'border border-gray-100 bg-white hover:border-emerald-200'
          : 'border-l-4 border-l-green-500 bg-green-50/80 hover:bg-green-50',
        badgeBg: 'bg-green-100 text-green-700',
        icon: 'fa-boxes-packing',
        tag: 'Order Update',
        borderAccent: 'border-l-green-500'
      };
    }

    // 3. KYC / Address notice -> Indigo/Blue theme
    if (typeUpper.includes('KYC') || typeUpper.includes('ADDRESS') || titleLower.includes('address') || titleLower.includes('kyc') || titleLower.includes('verified')) {
      return {
        cardClass: notif.is_read
          ? 'border border-gray-100 bg-white hover:border-indigo-200'
          : 'border-l-4 border-l-indigo-500 bg-indigo-50/80 hover:bg-indigo-50',
        badgeBg: 'bg-indigo-100 text-indigo-700',
        icon: 'fa-location-dot',
        tag: 'KYC & Address',
        borderAccent: 'border-l-indigo-500'
      };
    }

    // 4. Rewards / Offers -> Amber theme from demo
    return {
      cardClass: notif.is_read
        ? 'border border-gray-100 bg-white hover:border-amber-200'
        : 'border-l-4 border-l-amber-500 bg-amber-50/80 hover:bg-amber-50',
      badgeBg: 'bg-amber-100 text-amber-700',
      icon: 'fa-star',
      tag: 'Rewards & Offers',
      borderAccent: 'border-l-amber-500'
    };
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'ALL') return true;
      const typeUpper = (n.type || '').toUpperCase();
      const titleLower = (n.title || '').toLowerCase();

      if (activeFilter === 'ORDERS') {
        return typeUpper.includes('ORDER') || titleLower.includes('order');
      }
      if (activeFilter === 'DELIVERY') {
        return typeUpper.includes('DELIVERY') || titleLower.includes('rider') || titleLower.includes('nearby');
      }
      if (activeFilter === 'ACCOUNT') {
        return typeUpper.includes('KYC') || typeUpper.includes('ADDRESS') || titleLower.includes('address') || titleLower.includes('kyc');
      }
      if (activeFilter === 'OFFERS') {
        return typeUpper.includes('PROMO') || typeUpper.includes('REWARD') || titleLower.includes('points') || titleLower.includes('coupon');
      }
      return true;
    });
  }, [notifications, activeFilter]);

  // Handle action click
  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      handleToggleRead(notif.id, false);
    }
    if (notif.action_url) {
      onNavigate(notif.action_url);
    }
  };

  return (
    <section id="sec-notifications" className="pt-2 pb-6 space-y-3">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & INBOX CONTROLS                                 */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition"
              aria-label="Back"
            >
              <i className="fa-solid fa-arrow-left text-xs"></i>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-gray-900 tracking-tight">
                Notification Inbox
              </h2>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-coral text-white animate-pulse">
                  {`${unreadCount} unread`}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  All caught up
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Live order tracking, delivery alerts, and account notices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isSlideOut && onCloseSlideOut && (
            <button
              type="button"
              onClick={onCloseSlideOut}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          )}

          {/* Mark All as Read Button */}
          <button
            type="button"
            id="markAllReadBtn"
            disabled={unreadCount === 0 || markingAll}
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <i className={`fa-solid ${markingAll ? 'fa-spinner fa-spin' : 'fa-check-double'} text-xs text-brand-green`}></i>
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CATEGORY FILTER CHIPS                                       */}
      {/* ============================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'ALL', label: 'All Updates', icon: 'fa-inbox' },
          { key: 'DELIVERY', label: 'Delivery Alerts', icon: 'fa-motorcycle' },
          { key: 'ORDERS', label: 'Order Status', icon: 'fa-bag-shopping' },
          { key: 'ACCOUNT', label: 'KYC & Address', icon: 'fa-shield-halved' },
          { key: 'OFFERS', label: 'Rewards & Offers', icon: 'fa-gift' }
        ].map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#18753C] text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className={`fa-solid ${filter.icon} text-[10px]`}></i>
              <span>{filter.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 3. NOTIFICATION LIST matching unified-customer-portal-demo.html */}
      {/* ============================================================== */}
      {loading ? (
        <div className="space-y-2 pt-1">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border border-gray-100 rounded-xl p-4 bg-white animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-1/3"></div>
              <div className="h-3 bg-gray-100 rounded-md w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-green-50 text-brand-green rounded-full flex items-center justify-center text-2xl mx-auto">
            <i className="fa-solid fa-bell-slash"></i>
          </div>
          <h3 className="font-extrabold text-base text-gray-900">No Notifications</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {activeFilter === 'ALL'
              ? 'You are all caught up! When stores pack your groceries or riders arrive, updates will show here.'
              : `No ${activeFilter.toLowerCase()} notifications found.`}
          </p>
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition cursor-pointer"
          >
            Show All Notifications
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((notif) => {
            const visuals = getNotificationVisuals(notif);
            const isUnread = !notif.is_read;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`rounded-r-xl p-4 transition-all relative group cursor-pointer shadow-2xs ${visuals.cardClass}`}
              >
                <div className="flex items-start gap-3">
                  {/* Category icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-2xs ${visuals.badgeBg}`}
                  >
                    <i className={`fa-solid ${visuals.icon}`}></i>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-gray-900">
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-brand-coral shrink-0" title="Unread"></span>
                      )}
                      <span className="text-[10px] text-gray-400 font-medium ml-auto shrink-0">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {notif.message}
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-black/5 text-[11px]">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <i className="fa-regular fa-clock text-[9px]"></i>
                        <span>{visuals.tag}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {notif.action_url && (
                          <span className="text-brand-green font-bold hover:underline flex items-center gap-0.5">
                            <span>Open</span>
                            <i className="fa-solid fa-arrow-right text-[9px]"></i>
                          </span>
                        )}

                        {/* Individual Mark as Read toggle button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(notif.id, notif.is_read, e)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                            isUnread
                              ? 'bg-white/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          title={isUnread ? 'Mark as read' : 'Mark as unread'}
                        >
                          <i className={`fa-solid ${isUnread ? 'fa-check' : 'fa-envelope-open'} text-[9px]`}></i>
                          <span>{isUnread ? 'Mark as read' : 'Read'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
