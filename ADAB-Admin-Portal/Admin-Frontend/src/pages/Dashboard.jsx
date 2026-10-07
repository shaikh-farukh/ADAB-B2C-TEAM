import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/dashboard')
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="text-red-500">Error loading dashboard: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="space-y-5">
      <div className="card p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm">Platform snapshot</p>
          <h1 className="text-2xl font-extrabold mt-1">Admin Dashboard</h1>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border-l-4 border-l-amber-400">
          <div className="text-xs text-gray-500">Pending Approvals</div>
          <div className="text-3xl font-extrabold text-amber-600">{data.pendingApprovals}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-green-500">
          <div className="text-xs text-gray-500">Active Sellers</div>
          <div className="text-3xl font-extrabold text-green-700">{data.activeSellers}</div>
          <div className="text-[10px] text-gray-400 mt-1">Out of {data.totalSellers} total</div>
        </div>
        <div className="card p-4 border-l-4 border-l-blue-500">
          <div className="text-xs text-gray-500">Active Customers</div>
          <div className="text-3xl font-extrabold text-blue-700">{data.activeCustomers}</div>
          <div className="text-[10px] text-gray-400 mt-1">Out of {data.totalCustomers} total</div>
        </div>
      </div>
    </div>
  );
}
