import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';
import { useTranslation } from '../context/LanguageContext';

function SettlementDetailModal({ settlement, onClose }) {
  const { t } = useTranslation();
  if (!settlement) return null;
  const items = Array.isArray(settlement.items) ? settlement.items : [];

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(iso);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-file-invoice-dollar text-emerald-700 text-sm"></i>
              <h3 className="font-extrabold text-base text-gray-900">
                {t('financeSettlementBreakdownModal', `Settlement Breakdown • ${settlement.settlement_cycle}`, { cycle: settlement.settlement_cycle })}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('financeSettledAt', 'Settled:')} <span className="font-semibold text-gray-700">{formatDate(settlement.settled_at || settlement.created_at)}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {settlement.status}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center text-base font-bold shadow-2xs cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 border-b border-gray-100 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-gray-200">
            <div className="text-[10px] text-gray-400 font-bold uppercase">{t('financeGrossSales', 'Gross Sales')}</div>
            <div className="text-sm font-extrabold text-gray-900 mt-0.5">
              ₹{Number(settlement.total_sales || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-gray-200">
            <div className="text-[10px] text-gray-400 font-bold uppercase">{t('financePlatformFee', 'Platform Fee')}</div>
            <div className="text-sm font-extrabold text-rose-600 mt-0.5">
              -₹{Number(settlement.total_commission || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="text-[10px] text-emerald-700 font-bold uppercase">{t('financeNetDisbursed', 'Net Disbursed')}</div>
            <div className="text-sm font-extrabold text-emerald-800 mt-0.5">
              ₹{Number(settlement.net_payable || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-5 max-h-[320px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No itemized orders found for this settlement batch.</p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Order</th>
                  <th className="pb-2 text-right">Gross Subtotal</th>
                  <th className="pb-2 text-right">Commission</th>
                  <th className="pb-2 text-right">Net Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-gray-50">
                    <td className="py-2.5 font-bold text-gray-800">
                      {it.order_number
                        ? (String(it.order_number).startsWith('#') ? it.order_number : `#${it.order_number}`)
                        : it.seller_order_id}
                    </td>
                    <td className="py-2.5 text-right text-gray-700">
                      ₹{Number(it.gross_subtotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 text-right text-rose-600">
                      -₹{Number(it.commission_fee || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-700">
                      ₹{Number(it.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {items.length} order(s) included in settlement batch
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-soft !py-1.5 !px-3.5 !text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const { t } = useTranslation();
  const [finance, setFinance] = useState({
    balance: 0,
    unsettled_orders_count: 0,
    total_orders: 0,
    gross_sales: 0,
    total_commission: 0,
    net_earnings: 0,
    total_refunded: 0,
    refunded_count: 0,
    settled_amount: 0,
    pending_settlement_amount: 0,
    settlements_count: 0,
    sanctioned_limit: 0,
    utilized_credit: 0,
    available_credit: 0,
    credit_due_date: null,
    is_credit_locked: false,
    receivables: 0,
    payables: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [khataList, setKhataList] = useState([]);
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [payingKhataId, setPayingKhataId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [error, setError] = useState(null);
  const withdrawLockRef = useRef(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadFinanceData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const [finRes, txRes, stlRes, khataRes] = await Promise.all([
        sellerApi.getFinanceSummary?.() || Promise.resolve(null),
        sellerApi.getFinanceTransactions?.() || Promise.resolve([]),
        sellerApi.getFinanceSettlements?.() || Promise.resolve([]),
        sellerApi.getKhata?.() || Promise.resolve([])
      ]);

      const extractData = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

      const finData = extractData(finRes);
      if (finData && typeof finData === 'object') {
        setFinance(prev => ({ ...prev, ...finData }));
      }
      const txData = extractData(txRes);
      if (Array.isArray(txData)) {
        setTransactions(txData);
      }
      const stlData = extractData(stlRes);
      if (Array.isArray(stlData)) {
        setSettlements(stlData);
      }
      const khataData = extractData(khataRes);
      if (Array.isArray(khataData)) {
        setKhataList(khataData);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load finance data');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData(true);
  }, []);

  const handleWithdraw = async () => {
    if (withdrawLockRef.current || withdrawing || Number(finance.balance) <= 0) return;
    withdrawLockRef.current = true;
    setWithdrawing(true);
    setError(null);

    try {
      const res = await sellerApi.withdrawToBank();
      const created = res?.data?.data || res?.data || {};
      showToast(
        `Settlement ${created.settlement_cycle || ''} created • ₹${Number(created.net_payable || finance.balance).toLocaleString('en-IN')} settled for ${created.items_count || finance.unsettled_orders_count} order(s)`
      );
      await loadFinanceData(false);
      setActiveTab('settlements');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Withdrawal failed');
    } finally {
      withdrawLockRef.current = false;
      setWithdrawing(false);
    }
  };

  const handlePayKhata = async (item) => {
    if (!item?.id || payingKhataId) return;
    setPayingKhataId(item.id);
    setError(null);
    try {
      await sellerApi.payKhataOrder(item.id);
      setKhataList(prev =>
        prev.map(k => (k.id === item.id ? { ...k, you_owe: 0, status: 'PAID', payment_terms: 'ADVANCE_UPI' } : k))
      );
      setFinance(prev => ({
        ...prev,
        payables: Math.max(0, Number(prev.payables || 0) - Number(item.you_owe || 0))
      }));
      showToast(`Khata PO ${item.po_number || ''} settled with ${item.store}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update Khata payment');
    } finally {
      setPayingKhataId(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(iso);
    }
  };

  return (
    <section id="sec-money" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{t('financeTitle', 'Money, Settlements & Bank Credit')}</h1>
          <p className="text-sm text-gray-500">
            {t('financeSubtitle', 'Payout-ready summary, order transactions & fee breakdowns, bank settlements, and B2B credit khata')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadFinanceData(false)}
          className="btn-soft !text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-rotate-right"></i>
          <span>{t('financeSyncLedger', 'Sync Ledger')}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span><i className="fa-solid fa-triangle-exclamation mr-1.5"></i>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* Top 4 Payout & Earnings KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border-2 border-green-200 bg-green-50">
          <div className="text-xs text-gray-600 font-bold uppercase">{t('financePayoutReadyBalance', 'Payout-Ready Balance')}</div>
          <div className="text-2xl font-extrabold text-green-800 mt-1">
            ₹{Number(finance.balance || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-green-700 mt-0.5">
            {t('financeUnsettledStoreOrders', `${finance.unsettled_orders_count || 0} unsettled store order(s)`, { count: finance.unsettled_orders_count || 0 })}
          </div>
          <button
            type="button"
            disabled={withdrawing || Number(finance.balance) <= 0}
            onClick={handleWithdraw}
            className="btn-primary w-full mt-3 !text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {withdrawing ? t('financeProcessingSettlement', 'Processing Settlement...') : t('financeWithdrawToBank', 'Withdraw to Bank')}
          </button>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">{t('financeGrossSales', 'Gross Sales')} ({finance.total_orders || 0} orders)</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">
            ₹{Number(finance.gross_sales || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">
            {t('financeCommissionDeducted', `Commission Deducted: -₹${Number(finance.total_commission || 0).toLocaleString('en-IN')}`, { amount: Number(finance.total_commission || 0).toLocaleString('en-IN') })}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {t('financeNetOrderEarnings', `Net Order Earnings: ₹${Number(finance.net_earnings || 0).toLocaleString('en-IN')}`, { amount: Number(finance.net_earnings || 0).toLocaleString('en-IN') })}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">{t('financeSettledToBank', `Settled to Bank (${finance.settlements_count || 0})`, { count: finance.settlements_count || 0 })}</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            ₹{Number(finance.settled_amount || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Refund Deductions ({finance.refunded_count || 0}): -₹{Number(finance.total_refunded || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">{t('financeWorkingCapitalCredit', 'Working Capital Credit')}</div>
          <div className="text-2xl font-extrabold text-purple-800 mt-1">
            ₹{Number(finance.available_credit || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Sanctioned: ₹{Number(finance.sanctioned_limit || 0).toLocaleString('en-IN')} • Utilized: ₹{Number(finance.utilized_credit || 0).toLocaleString('en-IN')}
          </div>
          <Link to="/credit-apply" className="inline-block text-xs font-bold text-purple-700 hover:underline mt-1.5">
            {t('financeApplyManageCredit', 'Apply / Manage Credit →')}
          </Link>
        </div>
      </div>

      {/* Ledger Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'transactions'
              ? 'bg-emerald-700 text-white shadow-2xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <i className="fa-solid fa-receipt"></i>
          <span>{t('financeTransactionsTabFull', `Transactions & Fee Breakdown (${transactions.length})`, { count: transactions.length })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settlements')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'settlements'
              ? 'bg-emerald-700 text-white shadow-2xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <i className="fa-solid fa-building-columns"></i>
          <span>{t('financeSettlementsTab', `Settlements (${settlements.length})`, { count: settlements.length })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('khata')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'khata'
              ? 'bg-emerald-700 text-white shadow-2xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <i className="fa-solid fa-book"></i>
          <span>{t('financeKhataTab', `B2B Credit Khata (${khataList.length})`, { count: khataList.length })}</span>
        </button>
      </div>

      {/* TAB 1: Transactions Ledger & Fee Breakdown */}
      {activeTab === 'transactions' && (
        <div className="card overflow-x-auto shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-gray-900">Order Transactions &amp; Fee Breakdown</h2>
              <p className="text-xs text-gray-500">Per-order gross sales, platform commission fee, refund deductions, and net seller payout</p>
            </div>
          </div>
          <table className="w-full text-sm text-left min-w-[780px]">
            <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Gross Subtotal</th>
                <th className="px-4 py-3 text-right">Commission Fee</th>
                <th className="px-4 py-3 text-right">Refund</th>
                <th className="px-4 py-3 text-right">Net Payout</th>
                <th className="px-4 py-3 text-center">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-6 text-center text-gray-500 text-xs">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> {t('financeLoadingLedger', 'Loading transaction ledger...')}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-6 text-center text-gray-500 text-xs">
                    {t('financeNoTransactions', 'No order transactions recorded for this store yet.')}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition text-xs">
                    <td className="px-4 py-3 font-bold text-gray-900">{tx.order_number}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(tx.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{tx.customer}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-700 uppercase">{tx.payment_method || 'N/A'}</span>
                      {tx.payment_status && (
                        <span className="block text-[10px] text-gray-400">{tx.payment_status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ₹{Number(tx.gross_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 font-semibold">
                      -₹{Number(tx.commission_fee || 0).toLocaleString('en-IN')}
                      <span className="block text-[10px] text-gray-400">({tx.commission_rate_pct || 0}%)</span>
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 font-semibold">
                      {Number(tx.refund_deduction) > 0
                        ? `-₹${Number(tx.refund_deduction).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                      ₹{Number(tx.net_payout || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.settlement_status === 'PAID' || tx.settlement_status === 'PROCESSED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          SETTLED ({tx.settlement_cycle || 'PAID'})
                        </span>
                      ) : tx.settlement_status === 'CANCELLED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                          CANCELLED
                        </span>
                      ) : tx.settlement_status === 'REFUNDED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          REFUNDED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          UNSETTLED
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Settlements List & Detail Modal */}
      {activeTab === 'settlements' && (
        <div className="card overflow-x-auto shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-gray-900">Settlement Batches</h2>
              <p className="text-xs text-gray-500">Completed and pending payout settlements to your registered bank account</p>
            </div>
          </div>
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Settlement Cycle</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right">Gross Sales</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Net Payable</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-gray-500 text-xs">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading settlements...
                  </td>
                </tr>
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-gray-500 text-xs">
                    No settlement batches created yet. Click &ldquo;Withdraw to Bank&rdquo; above to settle your payout-ready balance.
                  </td>
                </tr>
              ) : (
                settlements.map((stl) => (
                  <tr key={stl.id} className="hover:bg-gray-50 transition text-xs">
                    <td className="px-4 py-3 font-bold text-gray-900">{stl.settlement_cycle}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(stl.settled_at || stl.created_at)}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{stl.items_count || 0}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ₹{Number(stl.total_sales || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 font-semibold">
                      -₹{Number(stl.total_commission || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                      ₹{Number(stl.net_payable || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {stl.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSettlement(stl)}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
                      >
                        {t('financeViewBreakdown', 'View Breakdown')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: B2B Credit Khata */}
      {activeTab === 'khata' && (
        <div className="card overflow-x-auto shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-sm text-gray-900">B2B Credit Khata (Purchase Order Ledger)</h2>
              <p className="text-xs text-gray-500">
                Receivables: ₹{Number(finance.receivables || 0).toLocaleString('en-IN')} • Payables: ₹{Number(finance.payables || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <table className="w-full text-sm text-left min-w-[680px]">
            <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">PO #</th>
                <th className="px-4 py-3">Partner Store</th>
                <th className="px-4 py-3">They Owe You</th>
                <th className="px-4 py-3">You Owe Them</th>
                <th className="px-4 py-3">Terms / Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-gray-500 text-xs">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading Khata balances...
                  </td>
                </tr>
              ) : khataList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-gray-500 text-xs">
                    No active B2B Khata purchase orders found for this store.
                  </td>
                </tr>
              ) : (
                khataList.map((k, idx) => (
                  <tr key={k.id || idx} className="hover:bg-gray-50 transition text-xs">
                    <td className="px-4 py-3 font-bold text-gray-900">{k.po_number || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{k.store}</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">
                      {Number(k.they_owe) > 0 ? `₹${Number(k.they_owe).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-rose-700 font-bold">
                      {Number(k.you_owe) > 0 ? `₹${Number(k.you_owe).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="font-semibold text-gray-700">{k.payment_terms || '—'}</span>
                      {k.due_date && <span className="block text-[10px] text-gray-400">Due: {k.due_date}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        k.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {Number(k.you_owe) > 0 ? (
                        <button
                          type="button"
                          disabled={payingKhataId === k.id}
                          onClick={() => handlePayKhata(k)}
                          className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                        >
                          {payingKhataId === k.id ? 'Settling...' : t('financeMarkPaid', 'Mark Paid')}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-semibold">{t('settled', 'Settled')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedSettlement && (
        <SettlementDetailModal
          settlement={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2.5 transition-all border border-gray-700">
          <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
