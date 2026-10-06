import React, { useCallback, useEffect, useState } from 'react';
import {
  CircleDollarSign,
  Landmark,
  Percent,
  RefreshCw,
  ShieldCheck,
  Wallet,
  WalletCards,
  Download,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import paymentService from '../../services/paymentService';
import { useNotification } from '../../context/NotificationContext';

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const SettlementsPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<any>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  // Filters
  const [distributors, setDistributors] = useState<any[]>([]);
  const [distributorId, setDistributorId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (distributorId) params[useAuthStore.getState().role === 'distributor' ? 'shop_id' : 'distributor_id'] = distributorId;
      if (status) params.status = status;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const response = await paymentService.getManufacturerSettlementData(params);
      if (response.success) setData(response.data);
      else showError('Unable to load settlement data.');
    } catch {
      showError('Unable to load settlement data.');
    } finally {
      setIsLoading(false);
    }
  }, [distributorId, status, dateFrom, dateTo, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerateSettlement = async () => {
    setIsGenerating(true);
    const res = await paymentService.generateSettlement();
    if (res.success) {
      showSuccess(res.message);
      loadData();
    } else {
      showError(res.message);
    }
    setIsGenerating(false);
  };

  const handleMarkCompleted = async (id: string) => {
    const res = await paymentService.updateSettlementStatus(id, 'completed');
    if (res.success) {
      showSuccess(res.message);
      loadData();
    } else {
      showError(res.message);
    }
  };

  const handleExport = () => {
    if (!data?.settlements) return;
    const rows = [
      ['Settlement Number', 'Manufacturer', 'Total Invoice Amount', 'Total Collected', 'Commission', 'PG Charges', 'Returns', 'TDS', 'Net Payable', 'Status', 'Created At'],
      ...data.settlements.map((s: any) => [
        s.settlementNumber,
        s.manufacturerName,
        s.totalInvoiceAmount,
        s.totalCollected,
        s.commission,
        s.pgCharges,
        s.returnsAmount,
        s.tdsAmount,
        s.netPayable,
        s.status,
        new Date(s.createdAt).toLocaleDateString()
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Settlements_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summaryCards = data
    ? [
        { label: 'Collected', value: formatCurrency(data.summary.totalCollected), icon: CircleDollarSign, tone: 'text-adab-green bg-green-50' },
        { label: 'Pending Net Payable', value: formatCurrency(data.summary.pendingNetPayable), icon: Wallet, tone: 'text-adab-orange bg-orange-50' },
        { label: 'Returns', value: formatCurrency(data.summary.totalReturns), icon: WalletCards, tone: 'text-red-500 bg-red-50' },
        { label: 'Active Payouts', value: data.summary.activePayouts, icon: Landmark, tone: 'text-blue-500 bg-blue-50' },
      ]
    : [];

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1.5">
            <Wallet className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Manufacturer Settlement Desk</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-dark-text-secondary tracking-tight">Settlement & Payouts</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            Financial reconciliation and payouts management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateSettlement}
            disabled={isGenerating}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-adab-green border border-transparent rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:bg-green-800 transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Settlement'}
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-adab-green transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-app-secondary p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border-secondary flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Distributor</label>
          <select
            value={distributorId}
            onChange={(e) => setDistributorId(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 dark:text-dark-text-secondary text-sm rounded-xl px-4 py-2.5 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10"
          >
            <option value="">{useAuthStore.getState().role === 'distributor' ? 'All Shops' : 'All Distributors'}</option>
            {distributors.map(d => (
              <option key={d.id} value={d.id}>{d.company_name}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-40 bg-gray-50 border border-gray-200 text-gray-900 dark:text-dark-text-secondary text-sm rounded-xl px-4 py-2.5 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-auto bg-gray-50 border border-gray-200 text-gray-900 dark:text-dark-text-secondary text-sm rounded-xl px-4 py-2.5 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-auto bg-gray-50 border border-gray-200 text-gray-900 dark:text-dark-text-secondary text-sm rounded-xl px-4 py-2.5 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10"
          />
        </div>

        <button
          onClick={handleExport}
          className="px-6 py-2.5 bg-gray-900 text-white dark:bg-dark-app-secondary rounded-2xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center w-full sm:w-auto"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {(isLoading ? Array.from({ length: 4 }) : summaryCards).map((card: any, index) => (
          <div key={index} className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-2xl p-6 shadow-sm">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-8 w-28 bg-gray-200 rounded" />
              </div>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.tone}`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <p className="mt-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                <p className="mt-2 text-3xl font-black text-gray-900 dark:text-dark-text-secondary tracking-tight">{card.value}</p>
              </>
            )}
          </div>
        ))}
      </section>

      <div className="space-y-8">
        {isLoading
          ? Array.from({ length: 1 }).map((_, index) => (
              <div key={index} className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-3xl h-96 animate-pulse shadow-sm" />
            ))
          : data?.settlements?.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-dark-app-secondary rounded-3xl border border-gray-100 dark:border-dark-border-primary">
              <p className="text-gray-500 font-bold">No settlements found.</p>
            </div>
          ) : data?.settlements?.map((settlement: any) => (
              <section key={settlement.id} className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-3xl shadow-sm overflow-hidden">
                <div className="px-6 py-6 border-b border-gray-100 dark:border-dark-border-secondary flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface-card/50 transition-colors" onClick={() => toggleExpand(settlement.id)}>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Settlement Batch</p>
                      <span className="inline-flex px-3 py-1 rounded-full bg-orange-50 text-adab-orange text-[9px] font-black uppercase tracking-widest">
                        {settlement.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-dark-text-secondary mt-1">{settlement.id.toUpperCase()}</h2>
                    <div className="flex items-center flex-wrap gap-3 sm:gap-4 mt-2">
                      <p className="text-sm text-gray-500 font-bold">
                        {settlement.manufacturerName ? `${settlement.manufacturerName} | ` : ''}{new Date(settlement.createdAt).toLocaleDateString()}
                      </p>
                      <div className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block" />
                      <p className="text-sm text-adab-green font-black">
                        Collected: {formatCurrency(settlement.totalCollected)}
                      </p>
                      <div className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block" />
                      <p className="text-sm text-blue-500 font-black">
                        Net: {formatCurrency(settlement.netPayable)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {settlement.payout && (
                      <div className="px-4 py-2 rounded-2xl bg-gray-50 dark:bg-dark-surface-elevated border border-gray-200 dark:border-dark-border-secondary">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payout Ref</p>
                        <p className="text-sm font-extrabold text-gray-900 dark:text-dark-text-secondary mt-1">{settlement.payout.transactionRef}</p>
                      </div>
                    )}
                    {settlement.status !== 'completed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkCompleted(settlement.id); }}
                        className="ml-2 inline-flex px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                      >
                        Mark Completed
                      </button>
                    )}
                    <button
                      className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                    >
                      {expandedIds.includes(settlement.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {expandedIds.includes(settlement.id) && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 p-6 bg-gray-50/30 dark:bg-gray-900/50">
                  <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 border border-green-100 dark:border-green-500/20 p-5">
                        <p className="text-[10px] font-black text-adab-green uppercase tracking-[0.2em]">Total Collected</p>
                        <p className="mt-2 text-3xl font-black text-gray-900 dark:text-dark-text-secondary">{formatCurrency(settlement.totalCollected)}</p>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-100 dark:border-blue-500/20 p-5">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Net Payable</p>
                        <p className="mt-2 text-3xl font-black text-gray-900 dark:text-dark-text-secondary">{formatCurrency(settlement.netPayable)}</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-gray-200">
                      <table className="w-full min-w-[760px]">
                        <thead>
                          <tr className="bg-gray-50/70 border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Collected</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Returns</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {settlement.invoices?.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-4 text-sm text-gray-500 font-bold">No invoices found</td>
                            </tr>
                          ) : settlement.invoices.map((invoice: any) => (
                            <tr key={invoice.id}>
                              <td className="px-6 py-5">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-gray-900">{invoice.invoiceNumber}</span>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{invoice.orderNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right text-sm font-bold text-gray-700">{formatCurrency(invoice.totalAmount)}</td>
                              <td className="px-6 py-5 text-right text-sm font-bold text-adab-green">{formatCurrency(invoice.paidAmount)}</td>
                              <td className="px-6 py-5 text-right text-sm font-bold text-adab-orange">{formatCurrency(invoice.creditedAmount)}</td>
                              <td className="px-6 py-5 text-right text-sm font-black text-gray-900">{formatCurrency(invoice.balanceAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-3xl border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-2xl bg-gray-50 text-gray-700 flex items-center justify-center">
                          <Percent className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Deductions</p>
                          <h3 className="text-lg font-extrabold text-gray-900">Settlement math</h3>
                        </div>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Commission</span>
                          <span className="font-black text-gray-900">{formatCurrency(settlement.commission)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>PG Charges</span>
                          <span className="font-black text-gray-900">{formatCurrency(settlement.pgCharges)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Returns</span>
                          <span className="font-black text-gray-900">{formatCurrency(settlement.returnsAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>TDS</span>
                          <span className="font-black text-gray-900">{formatCurrency(settlement.tdsAmount)}</span>
                        </div>
                        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Net Payable</span>
                          <span className="text-lg font-black text-adab-green">{formatCurrency(settlement.netPayable)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-gray-50 border border-gray-200 p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-2xl bg-white text-adab-green flex items-center justify-center border border-gray-200">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payout Status</p>
                          <h3 className="text-lg font-extrabold text-gray-900">Transfer lifecycle</h3>
                        </div>
                      </div>
                      {settlement.payout ? (
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>
                            Amount scheduled: <span className="font-black text-gray-900">{formatCurrency(settlement.payout.amount)}</span>
                          </p>
                          <p>
                            Status: <span className="font-black text-adab-orange uppercase">{settlement.payout.status}</span>
                          </p>
                          <p>
                            Target account: <span className="font-black text-gray-900">{data.manufacturer.bankAccount}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No payout has been created for this batch yet.</p>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </section>
            ))}
      </div>
    </div>
  );
};

export default SettlementsPage;
