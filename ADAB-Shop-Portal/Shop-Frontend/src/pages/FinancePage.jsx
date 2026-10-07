import React from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';

export default function FinancePage() {
  const { summary, loading } = useFinance();
  return (
    <section id="sec-money" className="space-y-4">
      <div><h1 className="text-xl font-extrabold">Money & Credit</h1><p className="text-sm text-gray-500">Your earnings, bank payouts, and credit for buying stock</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border-2 border-green-200 bg-green-50"><div className="text-xs text-gray-600">Ready to withdraw</div><div className="text-2xl font-extrabold text-green-800 mt-1">₹38,420</div><button onClick={() => {}} className="btn-primary w-full mt-3 !text-xs">Withdraw Now</button></div>
        <div className="card p-4"><div className="text-xs text-gray-600">Credit you can use to buy</div><div className="text-2xl font-extrabold text-purple-800 mt-1">₹2,50,000</div><div className="text-[10px] text-gray-400 mt-1">Pay back in 14 days • 0% interest</div></div>
        <div className="card p-4"><div className="text-xs text-gray-600">Others owe you</div><div className="text-2xl font-extrabold text-amber-800 mt-1">₹64,500</div><div className="text-[10px] text-gray-400 mt-1">3 stores • due Friday</div></div>
        <div className="card p-4"><div className="text-xs text-gray-600">You owe others</div><div className="text-2xl font-extrabold text-gray-800 mt-1">₹18,200</div><div className="text-[10px] text-gray-400 mt-1">Due in 8 days</div></div>
      </div>
      <div className="card p-5 border-2 border-purple-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div><h2 className="font-extrabold text-lg">Your Credit Limit</h2><p className="text-sm text-gray-500">Buy stock now, pay later — no interest for 14 days</p></div>
          <button onClick={() => {}} className="btn-primary text-sm whitespace-nowrap"><i className="fa-solid fa-plus mr-1"></i> Apply for More Credit</button>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div className="p-3 rounded-xl bg-purple-50 text-center"><div className="text-xs text-gray-500">Approved Limit</div><div className="text-xl font-extrabold text-purple-900">₹2,50,000</div></div>
          <div className="p-3 rounded-xl bg-gray-50 text-center"><div className="text-xs text-gray-500">Used</div><div className="text-xl font-extrabold">₹18,200</div></div>
          <div className="p-3 rounded-xl bg-green-50 text-center"><div className="text-xs text-gray-500">Available</div><div className="text-xl font-extrabold text-green-800">₹2,31,800</div></div>
        </div>
        <h3 className="font-bold text-sm mb-2">Credit Applications</h3>
        <div className="space-y-2 text-sm" id="creditAppsList">
          <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200"><div><div className="font-bold">₹2,50,000 limit approved</div><div className="text-xs text-gray-500">Applied 15 Aug 2026 • Approved 17 Aug</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-200 text-green-900">Active</span></div>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="font-bold mb-3">Settlement Flow</h2>
        <div className="flex flex-col sm:flex-row gap-2 text-center text-xs">
          <div className="flex-1 p-3 rounded-xl bg-gray-50"><div className="font-bold text-gray-900">1. Customer pays</div><div className="text-gray-500 mt-1">UPI, card, or cash at counter</div></div>
          <div className="hidden sm:flex items-center text-gray-300">â†’</div>
          <div className="flex-1 p-3 rounded-xl bg-gray-50"><div className="font-bold text-gray-900">2. ADAB holds safely</div><div className="text-gray-500 mt-1">You earn reward points too</div></div>
          <div className="hidden sm:flex items-center text-gray-300">â†’</div>
          <div className="flex-1 p-3 rounded-xl bg-green-50"><div className="font-bold text-green-800">3. Money in your bank</div><div className="text-gray-500 mt-1">Next day by 11:30 PM</div></div>
        </div>
        <button onClick={() => {}} className="btn-soft mt-4 !text-xs">Settle Credit with Surat Fashion Hub</button>
      </div>
      <div className="card p-5">
        <h2 className="font-bold mb-3">Credit Khata (Ledger)</h2>
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 text-xs"><tr><th className="pb-2">Store</th><th className="pb-2">They owe you</th><th className="pb-2">You owe them</th><th className="pb-2">Due date</th><th className="pb-2">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="py-2 font-bold">Surat Fashion Hub</td><td className="py-2 text-green-700 font-bold">₹24,500</td><td className="py-2">—</td><td className="py-2 text-xs">Friday</td><td className="py-2"><button onClick={() => {}} className="text-green-700 text-xs font-bold">Remind</button></td></tr>
            <tr><td className="py-2 font-bold">Gujarat Agro Mill</td><td className="py-2">—</td><td className="py-2 text-red-700 font-bold">₹5,600</td><td className="py-2 text-xs">12 Oct</td><td className="py-2"><button onClick={() => {}} className="text-green-700 text-xs font-bold">Pay</button></td></tr>
            <tr><td className="py-2 font-bold">Vesu Grocery Mart</td><td className="py-2 text-green-700 font-bold">₹31,000</td><td className="py-2">—</td><td className="py-2 text-xs">10 Oct</td><td className="py-2"><button onClick={() => {}} className="text-green-700 text-xs font-bold">Remind</button></td></tr>
          </tbody>
        </table>
      </div>
      <div className="card p-5">
        <h2 className="font-bold mb-3">Invoices</h2>
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 text-xs"><tr><th className="pb-2">Invoice</th><th className="pb-2">Date</th><th className="pb-2">Party</th><th className="pb-2">Amount</th><th className="pb-2">Status</th><th className="pb-2">PDF</th></tr></thead>
          <tbody className="divide-y divide-gray-100"><tr><td className="py-2 font-mono text-xs">INV-2026-1842</td><td className="py-2 text-xs">02 Oct 2026</td><td className="py-2 font-bold">Surat Fashion Hub</td><td className="py-2 font-bold">₹24,500</td><td className="py-2 text-xs">Credit • Due Fri</td><td className="py-2"><button onClick={() => {}} className="text-green-700 text-xs font-bold">PDF</button></td></tr><tr><td className="py-2 font-mono text-xs">INV-2026-1841</td><td className="py-2 text-xs">01 Oct 2026</td><td className="py-2 font-bold">Customer batch</td><td className="py-2 font-bold">₹18,420</td><td className="py-2 text-xs">Settled</td><td className="py-2"><button onClick={() => {}} className="text-green-700 text-xs font-bold">PDF</button></td></tr><tr><td className="py-2 font-mono text-xs">INV-2026-1840</td><td className="py-2 text-xs">30 Sep 2026</td><td className="py-2 font-bold">Gujarat Agro Mill</td><td className="py-2 font-bold">₹5,600</td><td className="py-2 text-xs">Paid</td><td className="py-2"><button onClick={() => {}} className="text-green-700 text-xs font-bold">PDF</button></td></tr><tr><td className="py-2 font-mono text-xs">INV-2026-1839</td><td className="py-2 text-xs">29 Sep 2026</td><td className="py-2 font-bold">Export — Dubai</td><td className="py-2 font-bold">₹1,85,000</td><td className="py-2 text-xs">Pending</td><td className="py-2"><button onClick={() => {}} className="text-green-700 text-xs font-bold">PDF</button></td></tr><tr><td className="py-2 font-mono text-xs">INV-2026-1838</td><td className="py-2 text-xs">28 Sep 2026</td><td className="py-2 font-bold">Vesu Grocery Mart</td><td className="py-2 font-bold">₹31,000</td><td className="py-2 text-xs">Due 10 Oct</td><td className="py-2"><button onClick={() => {}} className="text-green-700 text-xs font-bold">PDF</button></td></tr></tbody>
        </table>
      </div>
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="font-bold">Recent Transactions</h2>
          <div className="flex gap-2 flex-wrap">
            <select id="txType" onChange={() => {}} className="px-3 py-2 rounded-xl border border-gray-200 text-sm"><option value="all">All types</option><option value="credit">Credit</option><option value="upi">UPI / customer</option><option value="withdraw">Withdrawal</option><option value="pos">POS cash</option></select>
            <input type="search" id="txSearch" oninput="filterTransactions()" placeholder="Search..." className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none w-40" />
          </div>
        </div>
        <div className="space-y-2 text-sm" id="txList">
          <div className="tx-item flex justify-between p-2 rounded-lg bg-gray-50" data-type="upi"><span>Customer UPI — Order #9021</span><span className="text-green-700 font-bold">+₹840</span></div>
          <div className="tx-item flex justify-between p-2 rounded-lg bg-gray-50" data-type="withdraw"><span>Withdrawal to HDFC Bank</span><span className="text-red-600 font-bold">-₹18,420</span></div>
          <div className="tx-item flex justify-between p-2 rounded-lg bg-gray-50" data-type="credit"><span>Store credit — Surat Fashion Hub</span><span className="text-green-700 font-bold">+₹24,500</span></div>
          <div className="tx-item flex justify-between p-2 rounded-lg bg-gray-50" data-type="credit"><span>Stock purchase — Gujarat Agro Mill</span><span className="text-red-600 font-bold">-₹5,600</span></div>
          <div className="tx-item flex justify-between p-2 rounded-lg bg-gray-50" data-type="pos"><span>POS cash — Bill #POS-441</span><span className="text-green-700 font-bold">+₹1,240</span></div>
        </div>
      </div>
    </section>


  );
}
