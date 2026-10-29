import React, { useState, useEffect } from 'react';
import { sellerApi } from '../api/sellerApi';
import listingService from '../services/listingService';
import { useTranslation } from '../context/LanguageContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export default function ReportsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total_orders: 0, total_revenue: 0, avg_order_value: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue' | 'orders'

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await sellerApi.getAnalytics();
        // Axios interceptor unwraps to { success: true, data: { chartData: [...], summary: { total_orders, total_revenue } } }
        const payload = res?.data !== undefined ? res.data : res;
        const summary = payload?.summary || (payload?.total_orders !== undefined ? payload : {});
        const chart = Array.isArray(payload?.chartData) ? payload.chartData : [];

        const totalRev = Number(summary.total_revenue || 0);
        const totalOrd = Number(summary.total_orders || 0);
        const aov = totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0;

        setStats({
          total_revenue: totalRev,
          total_orders: totalOrd,
          avg_order_value: aov
        });
        setChartData(chart);
      } catch (e) {
        console.error('Failed to load sales analytics:', e);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  // Export 1: Sales Report CSV
  const handleExportSalesCSV = () => {
    if (chartData.length === 0) {
      alert('No sales ledger entries available to export.');
      return;
    }
    const headers = ['Date', 'Orders Count', 'Total Revenue (INR)', 'Average Order Value (INR)'];
    const rows = chartData.map(d => {
      const rev = Number(d.revenue || 0);
      const ords = Number(d.orders || 0);
      const ticket = ords > 0 ? (rev / ords).toFixed(2) : '0.00';
      return [d.name, ords, rev.toFixed(2), ticket];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `sales_report_${Date.now()}.csv`, 'text/csv');
  };

  // Export 2: GSTR Compliance Summary CSV
  const handleExportGSTR = () => {
    const totalRev = Number(stats.total_revenue || 0);
    const taxable = Number((totalRev / 1.05).toFixed(2));
    const cgst = Number(((totalRev - taxable) / 2).toFixed(2));
    const sgst = cgst;

    const headers = ['Financial Period', 'Taxable Sales (INR)', 'CGST 2.5% (INR)', 'SGST 2.5% (INR)', 'Gross Invoice Value (INR)'];
    const row = ['Last 30 Days', taxable, cgst, sgst, totalRev.toFixed(2)];

    const csvContent = [headers.join(','), row.join(',')].join('\n');
    downloadFile(csvContent, `gstr_summary_${Date.now()}.csv`, 'text/csv');
  };

  // Export 3: Inventory Ledger CSV
  const handleExportInventory = async () => {
    try {
      const res = await listingService.getListings({ limit: 100 });
      const items = res.data || [];
      const headers = ['Item SKU/ID', 'Product Title', 'Selling Price (INR)', 'Current Stock Qty', 'Active Status'];
      const rows = items.map(p => [
        `"${p.id}"`,
        `"${p.title.replace(/"/g, '""')}"`,
        Number(p.sell_price || 0).toFixed(2),
        p.stock_qty || 0,
        p.is_active ? 'ACTIVE' : 'INACTIVE'
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadFile(csvContent, `inventory_report_${Date.now()}.csv`, 'text/csv');
    } catch (err) {
      console.error('Inventory export error:', err);
      alert('Failed to export inventory ledger.');
    }
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="sec-reports" className="space-y-4">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{t('reportsTitle', 'Reports & Analytics')}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t('reportsSubtitle', 'Business dashboard — live sales, order volume, and channel breakdown')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Cycle:</span>
          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg">
            Last 30 Days (Rolling)
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-gray-500">{t('totalRevenue', 'Total Revenue')}</div>
          <div className="text-2xl font-extrabold mt-1 text-gray-900">
            ₹{Number(stats.total_revenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
            <i className="fa-solid fa-arrow-trend-up"></i>
            <span>Live store settlement</span>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-500">{t('totalOrders', 'Total Orders')}</div>
          <div className="text-2xl font-extrabold mt-1 text-gray-900">
            {stats.total_orders || 0}
          </div>
          <div className="text-[10px] text-indigo-600 font-bold mt-0.5 flex items-center gap-1">
            <i className="fa-solid fa-bag-shopping"></i>
            <span>Processed orders</span>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-500">{t('avgOrderValue', 'Avg Order Value')}</div>
          <div className="text-2xl font-extrabold mt-1 text-gray-900">
            ₹{Math.round(Number(stats.avg_order_value || 0)).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
            <i className="fa-solid fa-receipt"></i>
            <span>Per order basket</span>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-500">{t('platformHealth', 'Platform Health')}</div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-700">100%</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
            <i className="fa-solid fa-signal"></i>
            <span>All services active</span>
          </div>
        </div>
      </div>

      {/* Analytics Chart & Breakdown */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Sales & Volume Trajectory</h3>
            <p className="text-[11px] text-gray-400">Day-by-day sales activity recorded in PostgreSQL</p>
          </div>
          <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('revenue')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeTab === 'revenue' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Revenue Trend (₹)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeTab === 'orders' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Order Volume
            </button>
          </div>
        </div>

        {/* Visual Chart */}
        <div className="h-64 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              Loading sales trajectory...
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'revenue' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportsColorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    formatter={(val) => [`₹${val}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#reportsColorRevenue)" />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    formatter={(val) => [`${val} orders`, 'Orders']}
                  />
                  <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4">
              <i className="fa-solid fa-chart-line text-2xl text-gray-300 mb-2"></i>
              <span>No recorded orders yet in the past 30 days.</span>
            </div>
          )}
        </div>

        {/* Itemized Daily Sales Table */}
        {chartData.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Recorded Sales Breakdown</h4>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-extrabold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Orders Count</th>
                    <th className="py-2.5 px-3 text-right">Daily Revenue</th>
                    <th className="py-2.5 px-3 text-right">Average Basket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {chartData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                      <td className="py-2.5 px-3 font-bold text-indigo-900">{row.name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold text-[11px]">
                          {row.orders} orders
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                        ₹{Number(row.revenue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-600 font-mono">
                        ₹{row.orders > 0 ? Math.round(Number(row.revenue) / row.orders) : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">{t('downloadExportReports', 'Download Export Reports')}</h3>
        <p className="text-xs text-gray-500 mb-3">Download audit-ready CSV exports generated on the fly from live database records</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <button 
            type="button"
            onClick={handleExportSalesCSV} 
            className="btn-soft !text-xs !py-2.5 flex items-center justify-center gap-2 cursor-pointer hover:!bg-indigo-50 hover:!text-indigo-700"
          >
            <i className="fa-solid fa-file-csv text-indigo-600 text-sm"></i>
            <span>Sales Report</span>
          </button>

          <button 
            type="button"
            onClick={handleExportGSTR} 
            className="btn-soft !text-xs !py-2.5 flex items-center justify-center gap-2 cursor-pointer hover:!bg-emerald-50 hover:!text-emerald-700"
          >
            <i className="fa-solid fa-file-invoice text-emerald-600 text-sm"></i>
            <span>GSTR Summary</span>
          </button>

          <button 
            type="button"
            onClick={handleExportInventory} 
            className="btn-soft !text-xs !py-2.5 flex items-center justify-center gap-2 cursor-pointer hover:!bg-amber-50 hover:!text-amber-700"
          >
            <i className="fa-solid fa-boxes-stacked text-amber-600 text-sm"></i>
            <span>Inventory Report</span>
          </button>
        </div>
      </div>
    </section>
  );
}
