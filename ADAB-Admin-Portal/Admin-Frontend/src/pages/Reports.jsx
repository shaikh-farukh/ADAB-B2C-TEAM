import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await apiClient.get('/reports/summary');
        if (res.data.success) {
          setSummary(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          Export Report
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading reports...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-500">Total GMV</h3>
            <p className="text-2xl font-bold mt-2">₹{summary?.gmv || 0}</p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-500">Total Orders</h3>
            <p className="text-2xl font-bold mt-2">{summary?.orderCount || 0}</p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-500">Approval Rate</h3>
            <p className="text-2xl font-bold mt-2">{summary?.approvalRate !== null && summary?.approvalRate !== undefined ? `${summary.approvalRate}%` : 'N/A'}</p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-500">Active Sellers</h3>
            <p className="text-2xl font-bold mt-2">{summary?.activeSellers || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
