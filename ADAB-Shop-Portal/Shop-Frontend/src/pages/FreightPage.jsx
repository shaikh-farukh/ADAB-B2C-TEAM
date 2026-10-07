import React from 'react';
import { Link } from 'react-router-dom';

export default function FreightPage() {
  return (
<>
<section id="sec-freight" className="space-y-4">
      <div><h1 className="text-xl font-extrabold">Freight Tracking</h1><p className="text-sm text-gray-500">Track truck & freight shipments for store-to-store orders (nearby and far)</p></div>
      <div className="space-y-3">
        <div className="card p-4 border-l-4 border-blue-500"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><div className="font-bold">#P-8822 · Porter · AWB PRTR88221</div><div className="text-xs text-gray-500">To Surat Fashion Hub · 12 km · Kurtis x50</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Out for delivery</span></div><div className="mt-3 flex gap-2 text-[10px] font-bold"><span className="px-2 py-1 rounded bg-green-100 text-green-800">✓ Picked up</span><span className="px-2 py-1 rounded bg-green-100 text-green-800">✓ In transit</span><span className="px-2 py-1 rounded bg-blue-100 text-blue-800">→ Delivering</span><span className="px-2 py-1 rounded bg-gray-100 text-gray-400">Delivered</span></div></div>
        <div className="card p-4 border-l-4 border-amber-500"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><div className="font-bold">#P-8819 · Delhivery · AWB DLVR99102</div><div className="text-xs text-gray-500">From Punjab Grain Co · 1,240 km · Basmati 500kg</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">In transit — ETA 2 days</span></div><div className="mt-3 flex gap-2 text-[10px] font-bold"><span className="px-2 py-1 rounded bg-green-100 text-green-800">✓ Dispatched</span><span className="px-2 py-1 rounded bg-amber-100 text-amber-800">→ Hub Surat</span><span className="px-2 py-1 rounded bg-gray-100 text-gray-400">Out for delivery</span><span className="px-2 py-1 rounded bg-gray-100 text-gray-400">Delivered</span></div><button onClick={() => {}} className="text-blue-700 text-xs font-bold mt-2">Track on Delhivery →</button></div>
        <div className="card p-4 border-l-4 border-indigo-500"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><div className="font-bold">#P-8818 · Export · BL EXP-2026-441</div><div className="text-xs text-gray-500">To Al-Rashid Trading, Dubai · Spices export</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">Customs clearance</span></div><div className="mt-3 flex gap-2 text-[10px] font-bold"><span className="px-2 py-1 rounded bg-green-100 text-green-800">✓ Packed</span><span className="px-2 py-1 rounded bg-green-100 text-green-800">✓ Port Nhava Sheva</span><span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800">→ Customs</span><span className="px-2 py-1 rounded bg-gray-100 text-gray-400">Shipped</span></div></div>
        <div className="card p-4 border-l-4 border-green-500"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><div className="font-bold">#P-8821 · Porter · AWB PRTR88209</div><div className="text-xs text-gray-500">From Gujarat Agro Mill · 3 km · Oil 50L</div></div><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Delivered yesterday</span></div></div>
      </div>
      <button onClick={() => {}} className="btn-soft !text-xs"><i className="fa-solid fa-store mr-1"></i> View All Store Orders</button>
    </section>
</>
  );
}
