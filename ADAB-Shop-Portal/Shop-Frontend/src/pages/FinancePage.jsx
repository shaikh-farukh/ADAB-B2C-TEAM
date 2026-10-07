import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';

export default function FinancePage() {
  const [finance, setFinance] = useState({
    balance: 0,
    available_credit: 250000,
    sanctioned_limit: 250000,
    utilized_credit: 0
  });
  const [khataList, setKhataList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFinanceData() {
      try {
        setLoading(true);
        const [finRes, khataRes] = await Promise.all([
          sellerApi.getFinanceSummary().catch(() => ({ data: { success: false } })),
          sellerApi.getKhata().catch(() => ({ data: { success: false } }))
        ]);

        if (finRes.data && finRes.data.success) {
          setFinance(finRes.data.data);
        }
        if (khataRes.data && khataRes.data.success) {
          setKhataList(khataRes.data.data || []);
        }
      } catch (err) {
        console.error('Error loading finance data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFinanceData();
  }, []);

  const totalPayables = khataList.reduce((sum, k) => sum + (Number(k.you_owe) || 0), 0);
  const totalReceivables = khataList.reduce((sum, k) => sum + (Number(k.they_owe) || 0), 0);

  const handleRemind = (storeName) => {
    alert(`Payment reminder notification sent to ${storeName}.`);
  };

  const handlePay = (id) => {
    setKhataList(prev => prev.map(k => k.id === id ? { ...k, you_owe: 0, status: 'paid' } : k));
    alert('Payment initiated successfully!');
  };

  return (
    <section id="sec-money" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Money &amp; Bank Credit</h1>
        <p className="text-sm text-gray-500">Live account balance, automatic bank settlements, and merchant B2B credit khata</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border-2 border-green-200 bg-green-50">
          <div className="text-xs text-gray-600 font-bold uppercase">Ready to withdraw</div>
          <div className="text-2xl font-extrabold text-green-800 mt-1">
            ₹{Number(finance.balance || 0).toLocaleString('en-IN')}
          </div>
          <button 
            disabled={finance.balance <= 0}
            onClick={() => alert(`Withdrawal request for ₹${Number(finance.balance).toLocaleString('en-IN')} submitted!`)} 
            className="btn-primary w-full mt-3 !text-xs disabled:opacity-50"
          >
            Withdraw to Bank
          </button>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">Available Credit Line</div>
          <div className="text-2xl font-extrabold text-purple-800 mt-1">
            ₹{Number(finance.available_credit || 250000).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Pay back in 14 days • 0% interest</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">Receivables (Others owe you)</div>
          <div className="text-2xl font-extrabold text-amber-800 mt-1">
            ₹{totalReceivables.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">From partner shops</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">Payables (You owe others)</div>
          <div className="text-2xl font-extrabold text-gray-800 mt-1">
            ₹{totalPayables.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Active supplier balances</div>
        </div>
      </div>

      <div className="card p-5 border-2 border-purple-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-extrabold text-lg text-gray-900">Your Working Capital Credit</h2>
            <p className="text-sm text-gray-500">Buy stock from national brands and local kiranas now — repay in 14 days</p>
          </div>
          <Link to="/credit-apply" className="btn-primary text-sm whitespace-nowrap">
            <i className="fa-solid fa-plus mr-1"></i> Apply for More Credit
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div className="p-3 rounded-xl bg-purple-50 text-center">
            <div className="text-xs text-gray-500">Sanctioned Limit</div>
            <div className="text-xl font-extrabold text-purple-900">
              ₹{Number(finance.sanctioned_limit || 250000).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 text-center">
            <div className="text-xs text-gray-500">Utilized</div>
            <div className="text-xl font-extrabold">
              ₹{Number(finance.utilized_credit || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-green-50 text-center">
            <div className="text-xs text-gray-500">Available</div>
            <div className="text-xl font-extrabold text-green-800">
              ₹{Number(finance.available_credit || 250000).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold mb-3 text-gray-900">Credit Khata (Ledger)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-500 text-xs border-b border-gray-100">
              <tr>
                <th className="pb-2">Merchant Store / Supplier</th>
                <th className="pb-2">They Owe You</th>
                <th className="pb-2">You Owe Them</th>
                <th className="pb-2">Due Date</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-gray-500 text-xs">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading Khata balances...
                  </td>
                </tr>
              )}
              {!loading && khataList.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-gray-500 text-xs">
                    No active Khata balances. All merchant dues settled.
                  </td>
                </tr>
              )}
              {!loading && khataList.map((k, idx) => (
                <tr key={k.id || idx}>
                  <td className="py-2.5 font-bold text-gray-800">{k.store || 'Partner Store'}</td>
                  <td className="py-2.5 text-green-700 font-bold">{Number(k.they_owe) > 0 ? `₹${Number(k.they_owe).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="py-2.5 text-red-700 font-bold">{Number(k.you_owe) > 0 ? `₹${Number(k.you_owe).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="py-2.5 text-xs text-gray-500">{k.due_date || '14 Days'}</td>
                  <td className="py-2.5">
                    {Number(k.they_owe) > 0 ? (
                      <button onClick={() => handleRemind(k.store)} className="text-green-700 text-xs font-bold hover:underline">
                        Send Reminder
                      </button>
                    ) : Number(k.you_owe) > 0 ? (
                      <button onClick={() => handlePay(k.id)} className="px-2.5 py-1 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-800">
                        Pay Now
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

