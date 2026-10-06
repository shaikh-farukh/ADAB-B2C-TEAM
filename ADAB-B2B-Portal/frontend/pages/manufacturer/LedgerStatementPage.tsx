import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search, Filter, IndianRupee, FileText, ArrowUpRight, ArrowDownRight, CreditCard, Layers, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import paymentService from '../../services/paymentService';
import apiClient from '../../services/apiClient';

const LedgerStatementPage: React.FC = () => {
  const isDistributor = useAuthStore.getState().role === 'distributor';
  const entityLabel = isDistributor ? 'Shop' : 'Distributor';
  const entitiesLabel = isDistributor ? 'Shops' : 'Distributors';

  const [entities, setEntities] = useState<any[]>([]);
  const [globalInvoices, setGlobalInvoices] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const [entries, setEntries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for Detail View
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [txType, setTxType] = useState<string>('All');

  // View Toggle for Detail View
  const [viewMode, setViewMode] = useState<'ledger' | 'invoice'>('ledger');

  useEffect(() => {
    // Initial Load: Fetch entities and global invoices
    const initFetch = async () => {
      setIsLoading(true);
      try {
        const [entitiesRes, invoicesRes] = await Promise.all([
          apiClient.get(isDistributor ? '/distributors/shops' : '/manufacturers/distributors'),
          paymentService.getInvoices({})
        ]);

        if (entitiesRes.data?.success) {
          setEntities(entitiesRes.data.data || []);
        }
        if (invoicesRes.success) {
          setGlobalInvoices(invoicesRes.data || []);
        }
      } catch (err) {
        console.error('Failed to initialize ledger view', err);
      } finally {
        setIsLoading(false);
      }
    };
    initFetch();
  }, [isDistributor]);

  useEffect(() => {
    if (!selectedEntityId) return;
    const fetchDetailData = async () => {
      setIsLoading(true);
      try {
        const params: any = {};
        params[isDistributor ? 'shop_id' : 'distributor_id'] = selectedEntityId;
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;
        if (txType !== 'All') params.type = txType;

        const [ledgerRes, invoicesRes] = await Promise.all([
          viewMode === 'ledger' ? paymentService.getLedgerEntries(params) : Promise.resolve({ success: true, data: [] }),
          viewMode === 'invoice' ? paymentService.getInvoices(params) : Promise.resolve({ success: true, data: [] })
        ]);

        if (ledgerRes.success) {
          setEntries(ledgerRes.data || []);
        }
        if (invoicesRes.success) {
          setInvoices(invoicesRes.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetailData();
  }, [selectedEntityId, dateFrom, dateTo, txType, viewMode, isDistributor]);

  // Summary Data Calculation for Default View
  const summaryData = useMemo(() => {
    return entities.map(entity => {
      const entityInvs = globalInvoices.filter(i => (isDistributor ? i.shop_id : i.distributor_id) === entity.id);
      const totalInvoiced = entityInvs.reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0);
      const totalPaid = entityInvs.reduce((acc, curr) => acc + parseFloat(curr.paid_amount || 0), 0);
      const totalCredit = entityInvs.reduce((acc, curr) => acc + parseFloat(curr.credited_amount || 0), 0);
      const outstanding = Math.max(totalInvoiced - totalPaid - totalCredit, 0);

      return {
        id: entity.id,
        name: isDistributor ? (entity.shop_name || entity.company_name || entity.company) : (entity.company_name || entity.company),
        totalInvoiced,
        totalPaid,
        totalCredit,
        outstanding
      };
    });
  }, [entities, globalInvoices, isDistributor]);

  // Computed Ledger Entries (Chronological with Running Balance)
  const chronologicalEntries = useMemo(() => {
    let runningBalance = 0;
    return [...entries]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(e => {
        const debit = parseFloat(e.debit || 0);
        const credit = parseFloat(e.credit || 0);
        runningBalance += (debit - credit);
        return { ...e, computedBalance: runningBalance };
      });
  }, [entries]);

  const handleExport = () => {
    if (!selectedEntityId) {
      // Export Summary
      const rows = [
        [entityLabel + ' Name', 'Total Invoiced', 'Total Paid', 'Credit Notes', 'Outstanding Balance'],
        ...summaryData.map(e => [
          e.name,
          e.totalInvoiced.toFixed(2),
          e.totalPaid.toFixed(2),
          e.totalCredit.toFixed(2),
          e.outstanding.toFixed(2)
        ])
      ];
      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${entitiesLabel}_Ledger_Summary.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (viewMode === 'invoice') {
      const rows = [
        ['Invoice Number', 'Invoice Date', 'Invoice Amount', 'Paid Amount', 'Credit Amount', 'Outstanding Amount', 'Status'],
        ...invoices.map(i => {
          const outstanding = Math.max(parseFloat(i.total_amount) - parseFloat(i.paid_amount || 0) - parseFloat(i.credited_amount || 0), 0);
          return [
            i.invoice_number,
            new Date(i.created_at).toLocaleDateString(),
            parseFloat(i.total_amount || 0).toFixed(2),
            parseFloat(i.paid_amount || 0).toFixed(2),
            parseFloat(i.credited_amount || 0).toFixed(2),
            outstanding.toFixed(2),
            i.status
          ]
        })
      ];
      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "Invoice_Drilldown.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const rows = [
        ['Date', 'Transaction Type', 'Reference Number', 'Debit', 'Credit', 'Running Balance'],
        ...chronologicalEntries.map(e => [
          new Date(e.created_at).toLocaleDateString(),
          e.type,
          e.reference_id || e.description,
          parseFloat(e.debit || 0).toFixed(2),
          parseFloat(e.credit || 0).toFixed(2),
          parseFloat(e.computedBalance || 0).toFixed(2)
        ])
      ];
      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "Ledger_Statement.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!selectedEntityId) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-dark-text-secondary uppercase tracking-tight">{entitiesLabel} Ledger</h1>
            <p className="text-sm text-gray-500 font-bold mt-2">Select a {entityLabel.toLowerCase()} to view their complete financial record</p>
          </div>
          <button
            onClick={handleExport}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Summary
          </button>
        </div>

        <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{entityLabel} Name</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Invoiced (₹)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid (₹)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Credit Notes (₹)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-bold">Loading...</td>
                  </tr>
                ) : summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-bold">No {entitiesLabel.toLowerCase()} found</td>
                  </tr>
                ) : summaryData.map((d, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedEntityId(d.id);
                      setViewMode("ledger");
                      setDateFrom("");
                      setDateTo("");
                      setTxType("All");
                    }}
                  >
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-dark-text-secondary flex items-center text-adab-green underline">
                      {d.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-600">{d.totalInvoiced.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">{d.totalPaid.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-purple-600">{d.totalCredit.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-black text-red-600">{d.outstanding.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Find selected entity name
  const activeEntity = entities.find(e => e.id === selectedEntityId);
  const activeEntityName = activeEntity ? (isDistributor ? (activeEntity.shop_name || activeEntity.company_name || activeEntity.company) : (activeEntity.company_name || activeEntity.company)) : 'Selected Entity';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <button
            onClick={() => setSelectedEntityId(null)}
            className="flex items-center text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:text-dark-text-secondary mb-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to {entitiesLabel}
          </button>
          <h1 className="text-3xl font-black text-gray-900 dark:text-dark-text-secondary uppercase tracking-tight">{activeEntityName}</h1>
          <p className="text-sm text-gray-500 font-bold mt-1">Ledger & Invoices</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'ledger' ? 'bg-white text-gray-900 dark:text-dark-text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-dark-text-secondary'}`}
          >
            Ledger
          </button>
          <button
            onClick={() => setViewMode('invoice')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'invoice' ? 'bg-white text-gray-900 dark:text-dark-text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-dark-text-secondary'}`}
          >
            Invoices
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        {viewMode === 'ledger' && (
          <div className="w-full md:w-auto">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction Type</label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="w-full md:w-48 bg-gray-50 border border-gray-200 text-gray-900 dark:text-dark-text-secondary text-sm rounded-xl px-4 py-2.5 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10"
            >
              <option value="All">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="payment">Payment</option>
              <option value="credit_note">Credit Note</option>
              <option value="settlement">Settlement</option>
            </select>
          </div>
        )}

        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-auto bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-auto bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10"
          />
        </div>

        <button
          onClick={handleExport}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center w-full sm:w-auto"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </button>
      </div>

      <div className="bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'ledger' ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Type</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference Number</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Debit (₹)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Credit (₹)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold">Loading...</td>
                  </tr>
                ) : chronologicalEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold">No ledger entries found</td>
                  </tr>
                ) : chronologicalEntries.map((e, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-600 capitalize">{e.type?.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-gray-500">{e.reference_id || e.description}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-600">{parseFloat(e.debit) > 0 ? parseFloat(e.debit).toFixed(2) : '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">{parseFloat(e.credit) > 0 ? parseFloat(e.credit).toFixed(2) : '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{parseFloat(e.computedBalance).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice Number</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice Date</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice Amount (₹)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid Amount (₹)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Credit Amount (₹)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding (₹)</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-bold">Loading...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-bold">No invoices found</td>
                  </tr>
                ) : invoices.map((i, idx) => {
                  const outstanding = parseFloat(i.total_amount) - parseFloat(i.paid_amount || 0) - parseFloat(i.credited_amount || 0);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{i.invoice_number}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{new Date(i.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{parseFloat(i.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-600">{parseFloat(i.paid_amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold text-purple-600">{parseFloat(i.credited_amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold text-red-600">{Math.max(outstanding, 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-gray-100 text-[10px] uppercase font-black rounded-lg">{i.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LedgerStatementPage;
