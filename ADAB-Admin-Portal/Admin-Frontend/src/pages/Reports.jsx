import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('summary'); // summary, sales, orders, returns, reviews, sellers, customers
  const [metrics, setMetrics] = useState({
    gmv: '₹0',
    totalOrders: 0,
    approvalRate: 'N/A',
    activeSellers: 0
  });
  const [tabData, setTabData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const fetchSummary = async () => {
    try {
      const res = await apiClient.get('/reports/summary');
      if (res.data.success) {
        const data = res.data.data;
        setMetrics({
          gmv: `₹${Number(data.gmv || 0).toLocaleString()}`,
          totalOrders: data.orderCount || 0,
          approvalRate: data.approvalRate !== null && data.approvalRate !== undefined ? `${data.approvalRate}%` : 'N/A',
          activeSellers: data.activeSellers || 0
        });
      }
    } catch (err) {
      console.error('Failed to load reports summary', err);
    }
  };

  const REPORT_ENDPOINTS = {
    sales: '/reports/sales',
    orders: '/reports/orders',
    sellers: '/reports/sellers',
    customers: '/reports/customers',
    returns: '/reports/returns',
    reviews: '/reports/reviews'
  };

  const fetchTabData = async (tab) => {
    if (tab === 'summary') return;
    setLoading(true);
    try {
      const endpoint = REPORT_ENDPOINTS[tab] || `/reports/${tab}`;
      const res = await apiClient.get(endpoint);
      if (res.data.success) {
        setTabData(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error(`Failed to load ${tab} report`, err);
      setTabData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchSummary().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'summary') {
      fetchTabData(activeTab);
    }
  }, [activeTab]);

  const handleExport = async () => {
    setExporting(true);
    setExportMsg('');
    try {
      const type = activeTab === 'summary' ? 'sales' : activeTab;
      const res = await apiClient.post('/reports/export', { report_type: type });
      if (res.data.success) {
        setExportMsg(`Export completed! ${res.data.message || 'Report generated successfully.'}`);
        setTimeout(() => setExportMsg(''), 4000);
      }
    } catch (err) {
      setExportMsg('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Platform Analytics &amp; Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Operational KPIs, GMV trends, breakdown reports &amp; CSV export</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          <i className="fa-solid fa-file-arrow-down"></i>
          <span>{exporting ? 'Exporting...' : `Export ${activeTab.toUpperCase()} Report`}</span>
        </button>
      </div>

      {exportMsg && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-indigo-600"></i>
          <span>{exportMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
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

      {/* Report Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-extrabold pt-2">
        {['summary', 'sales', 'orders', 'returns', 'reviews', 'sellers', 'customers'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-3.5 rounded-t-xl uppercase transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-indigo-50 border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Data Table */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-bold">Loading report data...</div>
      ) : activeTab === 'summary' ? (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
          <div className="font-extrabold text-slate-800 text-sm">Summary Overview</div>
          <p>Live summary metrics are populated from authoritative orders and seller profile database records.</p>
          <p>Click on the tabs above to view granular daily breakdowns for Sales, Orders, Returns, Reviews, and Portals.</p>
        </div>
      ) : tabData.length === 0 ? (
        <div className="p-8 text-center text-slate-400 italic">No records returned for {activeTab} report.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {Object.keys(tabData[0] || {}).map((col) => (
                  <th key={col} className="p-3 font-extrabold text-slate-700 uppercase">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tabData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  {Object.values(row).map((val, cIdx) => (
                    <td key={cIdx} className="p-3 font-medium text-slate-700">
                      {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? 'N/A')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
