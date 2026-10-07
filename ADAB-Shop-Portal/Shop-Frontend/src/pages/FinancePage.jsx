import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { useOrders } from '../hooks/useOrders';

export default function FinancePage() {
  const { summary, loading } = useFinance();
  const { orders } = useOrders();

  const [filter, setFilter] = useState('all');
  const [khataList, setKhataList] = useState([
    { id: 'KH-1', store: 'Surat Fashion Hub', theyOwe: 24500, youOwe: 0, dueDate: 'Friday', status: 'pending' },
    { id: 'KH-2', store: 'Gujarat Agro Mill', theyOwe: 0, youOwe: 5600, dueDate: '12 Oct', status: 'pending' },
    { id: 'KH-3', store: 'Vesu Grocery Mart', theyOwe: 31000, youOwe: 0, dueDate: '10 Oct', status: 'pending' },
  ]);

  const totalSalesFromOrders = orders.reduce((sum, o) => sum + (Number(o.total_amount || o.amount) || 0), 0);
  const readyToWithdraw = totalSalesFromOrders > 0 ? totalSalesFromOrders : 38420;

  const handleRemind = (storeName) => {
    alert(`Payment reminder notification sent to ${storeName}.`);
  };

  const handlePay = (id) => {
    setKhataList(prev => prev.map(k => k.id === id ? { ...k, youOwe: 0, status: 'paid' } : k));
    alert('Khata payment initiated successfully!');
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
          <div className="text-2xl font-extrabold text-green-800 mt-1">₹{readyToWithdraw.toLocaleString()}</div>
          <button onClick={() => alert(`Withdrawal request for ₹${readyToWithdraw.toLocaleString()} submitted to HDFC Bank!`)} className="btn-primary w-full mt-3 !text-xs">
            Withdraw to Bank
          </button>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">Available Credit Line</div>
          <div className="text-2xl font-extrabold text-purple-800 mt-1">₹2,31,800</div>
          <div className="text-[10px] text-gray-400 mt-1">Pay back in 14 days • 0% interest</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">Receivables (Others owe you)</div>
          <div className="text-2xl font-extrabold text-amber-800 mt-1">₹55,500</div>
          <div className="text-[10px] text-gray-400 mt-1">From 2 partner shops</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-600 font-bold uppercase">Payables (You owe others)</div>
          <div className="text-2xl font-extrabold text-gray-800 mt-1">
            ₹{khataList.reduce((sum, k) => sum + k.youOwe, 0).toLocaleString()}
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
            <div className="text-xl font-extrabold text-purple-900">₹2,50,000</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 text-center">
            <div className="text-xs text-gray-500">Utilized</div>
            <div className="text-xl font-extrabold">₹18,200</div>
          </div>
          <div className="p-3 rounded-xl bg-green-50 text-center">
            <div className="text-xs text-gray-500">Available</div>
            <div className="text-xl font-extrabold text-green-800">₹2,31,800</div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold mb-3 text-gray-900">Credit Khata (Ledger)</h2>
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 text-xs border-b border-gray-100">
            <tr>
              <th className="pb-2">Merchant Store</th>
              <th className="pb-2">They Owe You</th>
              <th className="pb-2">You Owe Them</th>
              <th className="pb-2">Due Date</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {khataList.map(k => (
              <tr key={k.id}>
                <td className="py-2.5 font-bold text-gray-800">{k.store}</td>
                <td className="py-2.5 text-green-700 font-bold">{k.theyOwe > 0 ? `₹${k.theyOwe.toLocaleString()}` : '—'}</td>
                <td className="py-2.5 text-red-700 font-bold">{k.youOwe > 0 ? `₹${k.youOwe.toLocaleString()}` : '—'}</td>
                <td className="py-2.5 text-xs text-gray-500">{k.dueDate}</td>
                <td className="py-2.5">
                  {k.theyOwe > 0 ? (
                    <button onClick={() => handleRemind(k.store)} className="text-green-700 text-xs font-bold hover:underline">
                      Send Reminder
                    </button>
                  ) : k.youOwe > 0 ? (
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
    </section>
  );
}
