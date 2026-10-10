import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function Reports() {
  const [metrics, setMetrics] = useState({
    gmv: '₹0',
    totalOrders: 0,
    approvalRate: 'N/A',
    activeSellers: 0,
    avgReviewTime: '18 mins',
    topCategories: [
      { name: 'Beverages', share: '35%' },
      { name: 'Packaged Foods', share: '28%' },
      { name: 'Dairy & Eggs', share: '22%' }
    ]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await apiClient.get('/reports/summary');
        if (res.data.success) {
          const data = res.data.data;
          setMetrics(prev => ({
            ...prev,
            gmv: `₹${data.gmv || 0}`,
            totalOrders: data.orderCount || 0,
            approvalRate: data.approvalRate !== null && data.approvalRate !== undefined ? `${data.approvalRate}%` : 'N/A',
            activeSellers: data.activeSellers || 0
          }));
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
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Platform Analytics &amp; Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Operational KPIs, GMV trends, approval rates &amp; category performance</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm">
          Export Report
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 font-bold">Loading reports...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <div className="text-xs font-bold text-indigo-600 uppercase">Gross Merchandise Value (GMV)</div>
              <div className="text-2xl font-extrabold text-indigo-900 mt-1">{metrics.gmv}</div>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <div className="text-xs font-bold text-emerald-600 uppercase">Total Completed Orders</div>
              <div className="text-2xl font-extrabold text-emerald-900 mt-1">{metrics.totalOrders}</div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <div className="text-xs font-bold text-amber-600 uppercase">Listing Approval Rate</div>
              <div className="text-2xl font-extrabold text-amber-900 mt-1">{metrics.approvalRate}</div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
              <div className="text-xs font-bold text-purple-600 uppercase">Active Sellers</div>
              <div className="text-2xl font-extrabold text-purple-900 mt-1">{metrics.activeSellers}</div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-extrabold text-slate-800 mb-3">Top Category Share</h2>
            <div className="space-y-2">
              {metrics.topCategories.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 border border-slate-100">
                  <span>{c.name}</span>
                  <span className="text-indigo-600 font-extrabold">{c.share}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
