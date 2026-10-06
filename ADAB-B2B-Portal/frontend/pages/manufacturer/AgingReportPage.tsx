import React, { useState, useEffect } from 'react';
import { Download, Search, FileText, Calendar, Filter, Users } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import paymentService from '../../services/paymentService';

const AgingReportPage: React.FC = () => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [distributorId, setDistributorId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDistributors = async () => {
      try {
        const { default: apiClient } = await import('../../services/apiClient');
        const res = await apiClient.get(useAuthStore.getState().role === 'distributor' ? '/distributors/shops' : '/manufacturers/distributors');
        if (res.data?.success) setDistributors(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch distributors', err);
      }
    };
    fetchDistributors();
  }, []);

  useEffect(() => {
    fetchAgingReport();
  }, [distributorId]);

  const fetchAgingReport = async () => {
    setIsLoading(true);
    const params: any = { group_by: useAuthStore.getState().role === 'distributor' ? 'shop' : 'distributor' };
    if (distributorId) params[useAuthStore.getState().role === 'distributor' ? 'shop_id' : 'distributor_id'] = distributorId;

    const res = await paymentService.getAgingReport(params);
    if (res.success) {
      const data = res.data;
      setReportData(Array.isArray(data) ? data : []);
    } else {
      setReportData([]);
    }
    setIsLoading(false);
  };

  const handleExport = () => {
    if (!reportData.length) return;
    const rows = [
      ['Distributor Name', '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total Outstanding'],
      ...reportData.map(row => [
        row.distributor_name,
        row['0-30'] || 0,
        row['31-60'] || 0,
        row['61-90'] || 0,
        row['90+'] || 0,
        row.total || 0
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Aging_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const safeData = Array.isArray(reportData) ? reportData : [];
  const total0to30 = safeData.reduce((acc, curr) => acc + parseFloat(curr['0-30'] || 0), 0);
  const total31to60 = safeData.reduce((acc, curr) => acc + parseFloat(curr['31-60'] || 0), 0);
  const total61to90 = safeData.reduce((acc, curr) => acc + parseFloat(curr['61-90'] || 0), 0);
  const total90plus = safeData.reduce((acc, curr) => acc + parseFloat(curr['90+'] || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-dark-text-secondary uppercase tracking-tight">Aging Report</h1>
          <p className="text-sm text-gray-500 font-bold mt-2">Accounts Receivable Analysis by Distributor</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-surface-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border-primary flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest mb-2">{useAuthStore.getState().role === 'distributor' ? 'Filter by Shop' : 'Filter by Distributor'}</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={distributorId}
              onChange={(e) => setDistributorId(e.target.value)}
              className="w-full bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-primary text-gray-900 dark:text-dark-text-primary text-sm rounded-xl pl-12 pr-4 py-3 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10 appearance-none [color-scheme:light] dark:[color-scheme:dark]"
            >
              <option value="">{useAuthStore.getState().role === 'distributor' ? 'All Shops' : 'All Distributors'}</option>
              {distributors.map(d => (
                <option key={d.id} value={d.id}>{d.company_name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="px-6 py-3 bg-gray-900 text-white dark:bg-dark-app-secondary rounded-2xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center w-full md:w-auto"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-dark-app-secondary p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border-primary">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">0 - 30 Days Total</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-dark-text-secondary">₹{total0to30.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-dark-app-secondary p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border-primary">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">31 - 60 Days Total</h3>
            <p className="text-3xl font-black text-orange-600">₹{total31to60.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-dark-app-secondary p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border-primary">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">61 - 90 Days Total</h3>
            <p className="text-3xl font-black text-red-500">₹{total61to90.toFixed(2)}</p>
          </div>
          <div className="p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
            <h3 className="text-[10px] font-black text-red-600 dark:text-red-500 uppercase tracking-widest mb-2">90+ Days Total</h3>
            <p className="text-3xl font-black text-red-700 dark:text-red-400">₹{total90plus.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-dark-surface-elevated border-b border-gray-100 dark:border-dark-border-primary">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">{useAuthStore.getState().role === 'distributor' ? 'Shop Name' : 'Distributor Name'}</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">0-30 Days</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">31-60 Days</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">61-90 Days</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">90+ Days</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 dark:text-dark-text-secondary uppercase tracking-widest">Total Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border-primary">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold">Loading report...</td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-dark-text-secondary font-bold">No aging records found</p>
                  </td>
                </tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-dark-surface-elevated transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-dark-text-secondary">{(useAuthStore.getState().role === 'distributor' ? row.shop_name : row.distributor_name) || 'Unknown'}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-600 dark:text-dark-text-secondary">₹{parseFloat(row['0-30'] || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-orange-600">₹{parseFloat(row['31-60'] || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-500">₹{parseFloat(row['61-90'] || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-black text-red-700">₹{parseFloat(row['90+'] || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-dark-text-secondary">₹{parseFloat(row.total || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgingReportPage;
