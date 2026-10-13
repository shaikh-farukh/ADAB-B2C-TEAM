import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [actions, setActions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/dashboard').catch(() => ({ data: {} })),
      apiClient.get('/dashboard/actions').catch(() => ({ data: { data: [] } })),
      apiClient.get('/notifications').catch(() => ({ data: { data: [] } }))
    ])
      .then(([dashRes, actRes, notifRes]) => {
        setData(dashRes.data || {});
        setActions(actRes.data?.data || []);
        setNotifications(notifRes.data?.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading dashboard...</div>;
  if (error) return <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold">Error loading dashboard: {error}</div>;

  return (
    <div className="space-y-5">
      {/* Banner matching unified visual reference */}
      <div className="dashboard-hero-banner p-6 sm:p-7 rounded-2xl text-white overflow-hidden relative shadow-md">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute right-20 -top-10 w-40 h-40 bg-purple-500/15 rounded-full blur-xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Platform Snapshot
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Manage Seller &amp; Customer Portals
          </h1>
          <p className="text-indigo-100/90 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
            All shop registrations, customer accounts, and catalog products flow here for review, compliance, and moderation.
          </p>
        </div>
      </div>

      {/* 4 Stat Cards matching reference */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border-l-4 border-l-amber-400">
          <div className="text-xs text-slate-500 font-bold">Pending Approvals</div>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">{data?.pendingApprovals ?? 0}</div>
          <Link to="/approvals" className="text-xs text-indigo-600 font-bold mt-2 inline-block hover:underline">
            Review queue →
          </Link>
        </div>

        <div className="card p-4 border-l-4 border-l-green-500">
          <div className="text-xs text-slate-500 font-bold">Active Sellers</div>
          <div className="text-3xl font-extrabold text-green-700 mt-1">{data?.activeSellers ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Out of {data?.totalSellers ?? 0} total registered</div>
        </div>

        <div className="card p-4 border-l-4 border-l-blue-500">
          <div className="text-xs text-slate-500 font-bold">Active Customers</div>
          <div className="text-3xl font-extrabold text-blue-700 mt-1">{data?.activeCustomers ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Out of {data?.totalCustomers ?? 0} total</div>
        </div>

        <div className="card p-4 border-l-4 border-l-violet-500">
          <div className="text-xs text-slate-500 font-bold">Live Products</div>
          <div className="text-3xl font-extrabold text-violet-700 mt-1">{data?.totalProducts ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Catalog master listings</div>
        </div>
      </div>

      {/* Two Column Grid: Actions Queue & Notifications */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Needs your action */}
        <div className="card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-clock text-amber-500"></i>
              <span>Needs Your Action</span>
            </h2>
            <Link to="/approvals" className="text-xs text-indigo-600 font-bold hover:underline">
              View All →
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            {actions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic">No urgent moderation actions required.</div>
            ) : (
              actions.slice(0, 5).map((act, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                  <div>
                    <div className="font-bold text-slate-800">{act.title || act.entityName || 'Pending Review'}</div>
                    <div className="text-[11px] text-slate-500">
                      Type: <span className="uppercase font-semibold">{act.type || 'MODERATION'}</span>
                    </div>
                  </div>
                  <Link
                    to="/approvals"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs"
                  >
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="card p-5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-bell text-indigo-600"></i>
              <span>Recent Alerts &amp; Notifications</span>
            </h2>
            <span className="text-[10px] text-slate-400 font-bold">{notifications.length} Total</span>
          </div>

          <div className="space-y-2 text-xs">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic">No recent platform notifications.</div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">{n.title || n.type || 'Platform Notice'}</div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{n.message || n.content}</p>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
