import React from 'react';
import { Link } from 'react-router-dom';

export default function ReportsPage() {
  return (
<>
<section id="sec-reports" className="space-y-4">
      <div><h1 className="text-xl font-extrabold">Reports & Analytics</h1><p className="text-sm text-gray-500">Business dashboard — sales, traffic, and inventory insights</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4"><div className="text-xs text-gray-500">Revenue (30d)</div><div className="text-2xl font-extrabold">₹4.8L</div><div className="text-[10px] text-green-600 font-bold">+18%</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Orders (30d)</div><div className="text-2xl font-extrabold">412</div><div className="text-[10px] text-green-600 font-bold">+9%</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Avg Order Value</div><div className="text-2xl font-extrabold">₹1,165</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Conversion Rate</div><div className="text-2xl font-extrabold">3.4%</div></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5"><h3 className="font-bold mb-3">Sales by Channel</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Customer app</span><span className="font-bold">₹3.1L (64%)</span></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-green-500 rounded-full" style={{ width: '64%' }}></div></div><div className="flex justify-between mt-2"><span>Partner stores</span><span className="font-bold">₹1.2L (25%)</span></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-orange-500 rounded-full" style={{ width: '25%' }}></div></div><div className="flex justify-between mt-2"><span>POS walk-in</span><span className="font-bold">₹0.5L (11%)</span></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{ width: '11%' }}></div></div></div></div>
        <div className="card p-5"><h3 className="font-bold mb-3">Top Products (30d)</h3><div className="space-y-2 text-sm"><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>1. Balaji Silk Kurti</span><span className="font-bold">₹42,400</span></div><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>2. Fortune Oil 1L</span><span className="font-bold">₹28,600</span></div><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>3. Basmati Rice 25kg</span><span className="font-bold">₹24,200</span></div><div className="flex justify-between p-2 bg-gray-50 rounded-lg"><span>4. Royal Garam Masala</span><span className="font-bold">₹12,800</span></div></div></div>
      </div>
      <div className="card p-5"><h3 className="font-bold mb-3">Download Reports</h3><div className="grid sm:grid-cols-3 gap-3"><button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-file-csv mr-1"></i> Sales Report</button><button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-file-invoice mr-1"></i> GSTR Summary</button><button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-boxes-stacked mr-1"></i> Inventory Report</button></div></div>
    </section>
</>
  );
}
