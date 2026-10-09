import { useEffect, useState } from 'react';

export default function Reports() {
  const [metrics, setMetrics] = useState({
    gmv: '₹1,245,800',
    totalOrders: 1420,
    approvalRate: '94.5%',
    avgReviewTime: '18 mins',
    topCategories: [
      { name: 'Beverages', share: '35%' },
      { name: 'Packaged Foods', share: '28%' },
      { name: 'Dairy & Eggs', share: '22%' }
    ]
  });

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Platform Analytics &amp; Reports</h1>
        <p className="text-xs text-slate-500 mt-1">Operational KPIs, GMV trends, approval rates &amp; category performance</p>
      </div>

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
          <div className="text-xs font-bold text-purple-600 uppercase">Avg Moderation Time</div>
          <div className="text-2xl font-extrabold text-purple-900 mt-1">{metrics.avgReviewTime}</div>
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
    </div>
  );
}
