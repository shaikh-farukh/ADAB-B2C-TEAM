
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';

export default function AdminHeader() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const fetchHeaderData = () => {
    // 1. Fetch unread notifications count
    apiClient.get('/notifications/unread-count')
      .then(res => {
        if (res.data && res.data.count !== undefined) {
          setUnreadCount(res.data.count);
        }
      })
      .catch(() => {});

    // 2. Fetch pending approvals count
    apiClient.get('/approvals/counts')
      .then(res => {
        if (res.data && res.data.data && res.data.data.pending !== undefined) {
          setPendingCount(res.data.data.pending);
        }
      })
      .catch(() => {});

    // 3. Current authenticated user profile (Contract #26: GET /auth/me)
    apiClient.get('/auth/me')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setUser(res.data.data);
          try { localStorage.setItem('user', JSON.stringify(res.data.data)); } catch (e) {}
        }
      })
      .catch(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch (e) {}
        }
      });
  };

  useEffect(() => {
    fetchHeaderData();
  }, []);

  const openNotifications = () => {
    setShowNotifs(!showNotifs);
    setShowUserMenu(false);
    if (!showNotifs) {
      apiClient.get('/notifications')
        .then(res => {
          setNotifications(res.data.data || []);
        })
        .catch(() => {});
    }
  };

  const markAsRead = (id) => {
    apiClient.post(`/notifications/${id}/read`)
      .then(() => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      })
      .catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="admin-header text-white sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-extrabold shadow-lg">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <div className="font-extrabold leading-tight text-sm sm:text-base">ADAB Admin</div>
            <div className="text-[11px] text-indigo-200 hidden xs:block">Platform control</div>
          </div>
        </Link>

        {/* Global Search Header Input */}
        <div className="flex-1 min-w-[140px] max-w-md mx-2">
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 text-xs"></i>
            <input
              type="search"
              placeholder="Search platform resources..."
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-indigo-200 outline-none focus:bg-white/15"
            />
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Pending Approvals Quick Pill */}
          <Link
            to="/approvals"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-500/30 text-amber-100 text-xs font-bold border border-amber-400/40 hover:bg-amber-500/40 transition-colors"
          >
            <i className="fa-solid fa-clock"></i>
            <span className="hidden sm:inline">Pending</span>
            <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full font-extrabold">
              {pendingCount}
            </span>
          </Link>

          {/* Notifications Bell Button */}
          <div className="relative">
            <button
              onClick={openNotifications}
              className="relative w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white transition-colors border border-white/15"
              title="Notifications"
            >
              <i className="fa-solid fa-bell"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 z-50 p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-bell text-indigo-600"></i>
                    <span>Notifications</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{unreadCount} unread</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 italic">No notifications found</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border transition-colors ${n.is_read ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-indigo-50/50 border-indigo-100 text-slate-800 font-semibold'}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="font-bold text-slate-900 text-xs">{n.title || n.type || 'Alert'}</div>
                          {!n.is_read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold shrink-0"
                            >
                              Read
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{n.message || n.content}</p>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/15 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center text-[10px] font-bold">
                SA
              </div>
              <span className="hidden sm:inline">Super Admin</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-indigo-200"></i>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 z-50 p-3 space-y-2">
                <div className="pb-2 border-b border-slate-100">
                  <div className="font-bold text-xs text-slate-900">Administrator</div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email || 'superadmin@adab.com'}</div>
                  <span className="inline-block mt-1 text-[9px] uppercase font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    Active Admin
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
