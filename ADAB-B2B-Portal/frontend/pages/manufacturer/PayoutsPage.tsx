import React, { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Download,
  IndianRupee,
  Landmark,
  Percent,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import payoutService, { PayoutSummary, SettlementRecord } from '../../services/payoutService';
import { useNotification } from '../../context/NotificationContext';

const formatCurrency = (value: number) =>
  `₹ ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:    { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400',  label: 'Pending' },
  processing: { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400',   label: 'Processing' },
  completed:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Completed' },
  failed:     { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400',    label: 'Failed' },
};

const PayoutsPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [manufacturer, setManufacturer] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await payoutService.getPayoutDashboardData();
      if (response.success && 'data' in response) {
        setSettlements(response.data.settlements);
        setSummary(response.data.summary);
        setManufacturer(response.data.manufacturer);
      } else {
        showError(response.message || 'Unable to load payout data.');
      }
    } catch {
      showError('Unable to load payout data.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await payoutService.generateSettlement();
      if (res.success && 'message' in res) {
        showSuccess(res.message);
        loadData();
      } else {
        showError(res.message || 'Settlement generation failed.');
      }
    } catch {
      showError('Settlement generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!settlements.length) return;
    const header = ['Settlement #', 'Gross Amount', 'Commission', 'PG Charges', 'TDS', 'Returns', 'Net Payout', 'Status', 'Date'];
    const rows = settlements.map(s => [
      s.settlementNumber,
      s.totalCollected.toFixed(2),
      s.commission.toFixed(2),
      s.pgCharges.toFixed(2),
      s.tds.toFixed(2),
      s.returnsAmount.toFixed(2),
      s.netPayable.toFixed(2),
      s.status,
      new Date(s.createdAt).toLocaleDateString('en-IN'),
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payouts_Statement_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = filterStatus
    ? settlements.filter(s => s.status === filterStatus)
    : settlements;

  const summaryCards = summary
    ? [
        { label: 'Gross Collections', value: formatCurrency(summary.totalGrossAmount), icon: CircleDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Platform Deductions', value: formatCurrency(summary.totalCommission), icon: Percent, color: 'text-rose-500', bg: 'bg-rose-50' },
        { label: 'Net Payout', value: formatCurrency(summary.totalNetPayout), icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Pending', value: String(summary.pendingPayouts), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Completed', value: String(summary.completedPayouts), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      ]
    : [];

  // Skeleton card
  const SkeletonCard = () => (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse">
      <div className="w-12 h-12 rounded-2xl bg-gray-100" />
      <div className="mt-5 h-3 w-24 bg-gray-100 rounded" />
      <div className="mt-3 h-8 w-28 bg-gray-200 rounded" />
    </div>
  );

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-adab-green mb-1.5">
            <IndianRupee className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Financial Payout Desk</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Payouts & Commission Statements
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            Track completed order payouts, platform deductions, and net settlements.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-adab-green border border-transparent rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:bg-green-800 transition-all shadow-sm disabled:opacity-50"
          >
            <TrendingUp className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Settlement'}
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-adab-green transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : summaryCards.map((card, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.bg}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <p className="mt-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                <p className="mt-2 text-2xl font-black text-gray-900 tracking-tight">{card.value}</p>
              </div>
            ))}
      </section>

      {/* ─── Bank Account Info ─── */}
      {!isLoading && manufacturer && (
        <section className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 md:p-8 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Linked Bank Account</p>
              <h3 className="text-lg font-extrabold">{manufacturer.companyName}</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Name</p>
              <p className="mt-1 text-base font-bold">{manufacturer.bankName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</p>
              <p className="mt-1 text-base font-bold font-mono">{manufacturer.bankAccount}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IFSC Code</p>
              <p className="mt-1 text-base font-bold font-mono">{manufacturer.ifsc}</p>
            </div>
          </div>
        </section>
      )}

      {/* ─── Commission Statement (Code Spec) ─── */}
      {!isLoading && (
        <section className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payout Formula</p>
              <h3 className="text-lg font-extrabold text-gray-900">Commission Calculation Logic</h3>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
            <code className="text-sm font-mono text-gray-800 block">
              <span className="text-blue-600">const</span> netPayout = grossAmount - (grossAmount * (commissionRate / <span className="text-amber-600">100</span>));
            </code>
            <p className="mt-3 text-xs text-gray-500">
              Applied deductions: <strong>Commission (5%)</strong> + <strong>PG Charges (2%)</strong> + <strong>TDS (1%)</strong> + <strong>Returns</strong>
            </p>
          </div>
        </section>
      )}

      {/* ─── Filter Bar ─── */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-adab-green focus:ring-2 focus:ring-green-900/10"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
        </select>
        <span className="text-sm text-gray-500">
          {filtered.length} settlement{filtered.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* ─── Settlement Payout Ledger Table ─── */}
      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-adab-green" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payout Ledger</p>
            <h2 className="text-lg font-extrabold text-gray-900">All Settlement Payouts</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="h-80 animate-pulse bg-gray-50" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CircleDollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">No settlement payouts found.</p>
            <p className="text-sm text-gray-400 mt-1">Generate a settlement to see payouts here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Settlement #</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Amount</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Commission</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">PG Charges</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">TDS</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Returns</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Payout</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => {
                  const cfg = statusConfig[s.status] || statusConfig.pending;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <span className="text-sm font-black text-gray-900">{s.settlementNumber}</span>
                      </td>
                      <td className="px-6 py-5 text-right text-sm font-bold text-gray-700">{formatCurrency(s.totalCollected)}</td>
                      <td className="px-6 py-5 text-right text-sm font-bold text-rose-500">{formatCurrency(s.commission)}</td>
                      <td className="px-6 py-5 text-right text-sm font-bold text-rose-400">{formatCurrency(s.pgCharges)}</td>
                      <td className="px-6 py-5 text-right text-sm font-bold text-rose-400">{formatCurrency(s.tds)}</td>
                      <td className="px-6 py-5 text-right text-sm font-bold text-amber-600">{formatCurrency(s.returnsAmount)}</td>
                      <td className="px-6 py-5 text-right text-sm font-black text-adab-green">{formatCurrency(s.netPayable)}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                        {new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                  <td className="px-6 py-4 text-sm font-black text-gray-900 uppercase tracking-widest">Totals</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-gray-900">{formatCurrency(filtered.reduce((s, r) => s + r.totalCollected, 0))}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-rose-600">{formatCurrency(filtered.reduce((s, r) => s + r.commission, 0))}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-rose-500">{formatCurrency(filtered.reduce((s, r) => s + r.pgCharges, 0))}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-rose-500">{formatCurrency(filtered.reduce((s, r) => s + r.tds, 0))}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-amber-600">{formatCurrency(filtered.reduce((s, r) => s + r.returnsAmount, 0))}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-adab-green">{formatCurrency(filtered.reduce((s, r) => s + r.netPayable, 0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default PayoutsPage;
