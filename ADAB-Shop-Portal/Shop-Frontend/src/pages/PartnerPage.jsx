import React from 'react';
import { useB2B } from '../hooks/useB2B';

export default function PartnerPage() {
  const { orders, loading } = useB2B();
  return (
    <section id="sec-partner" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Store-to-Store Orders <span className="text-sm font-normal text-orange-700">(Any Distance)</span></h1>
          <p className="text-sm text-gray-500">Other shops can order from nearby OR far away — truck & freight, no radius limit</p>
        </div>
        <button onClick={() => {}} className="card px-4 py-2 text-left text-xs border-orange-200 bg-orange-50"><span className="font-bold text-orange-900">Credit:</span> <span id="partnerCreditBadge">14 days</span> • min ₹5k • <span className="text-green-700 underline">Edit</span></button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => {}} id="ptAll" className="px-3 py-1.5 rounded-full text-xs font-bold tab-on">All (8)</button>
        <button onClick={() => {}} id="ptNear" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">Nearby (&lt;50 km)</button>
        <button onClick={() => {}} id="ptFar" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">Far / Interstate</button>
        <button onClick={() => {}} id="ptExport" className="px-3 py-1.5 rounded-full text-xs font-bold tab-off">Export</button>
      </div>
      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input type="search" id="partnerSearch" oninput="filterPartnerOrders()" placeholder="Search store, order, items..." className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500" />
        <select id="partnerStatus" onChange={() => {}} className="px-3 py-2 rounded-xl border border-gray-200 text-sm"><option value="all">All status</option><option value="packing">Packing</option><option value="transit">In transit</option><option value="delivered">Delivered</option><option value="scheduled">Scheduled</option><option value="customs">Customs / export</option></select>
        <select id="partnerType" onChange={() => {}} className="px-3 py-2 rounded-xl border border-gray-200 text-sm"><option value="all">Buy or sell</option><option value="sold">You sold</option><option value="bought">You bought</option></select>
        <select id="partnerPayment" onChange={() => {}} className="px-3 py-2 rounded-xl border border-gray-200 text-sm"><option value="all">All payments</option><option value="credit">On credit</option><option value="paid">Paid / wire</option></select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[800px]">
          <thead className="bg-gray-50 text-gray-500 text-xs"><tr><th className="px-3 py-3">Order</th><th className="px-3 py-3">Store</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Freight</th><th className="px-3 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-100" id="partnerOrderBody">
            <tr className="partner-row filter-row" data-dist="near" data-status="transit" data-type="sold" data-payment="credit"><td className="px-3 py-3 font-bold">#P-8822</td><td className="px-3 py-3">Surat Fashion Hub</td><td className="px-3 py-3"><span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">12 km • Surat</span></td><td className="px-3 py-3"><span className="text-green-700 font-bold text-xs">You sold</span></td><td className="px-3 py-3 text-xs text-gray-600">Kurtis x50</td><td className="px-3 py-3 text-xs">₹24,500 • 14d credit</td><td className="px-3 py-3 text-xs font-bold text-blue-700">Porter</td><td className="px-3 py-3 text-xs">In transit</td></tr>
            <tr className="partner-row filter-row" data-dist="near" data-status="delivered" data-type="bought" data-payment="paid"><td className="px-3 py-3 font-bold">#P-8821</td><td className="px-3 py-3">Gujarat Agro Mill</td><td className="px-3 py-3"><span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">3 km • Surat</span></td><td className="px-3 py-3"><span className="text-orange-700 font-bold text-xs">You bought</span></td><td className="px-3 py-3 text-xs text-gray-600">Oil 50L</td><td className="px-3 py-3 text-xs">₹5,600 • 420 pts</td><td className="px-3 py-3 text-xs font-bold text-blue-700">Porter</td><td className="px-3 py-3 text-xs">Delivered</td></tr>
            <tr className="partner-row filter-row" data-dist="near" data-status="scheduled" data-type="sold" data-payment="credit"><td className="px-3 py-3 font-bold">#P-8820</td><td className="px-3 py-3">Vesu Grocery Mart</td><td className="px-3 py-3"><span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">2.4 km</span></td><td className="px-3 py-3"><span className="text-green-700 font-bold text-xs">You sold</span></td><td className="px-3 py-3 text-xs text-gray-600">Rice 500kg</td><td className="px-3 py-3 text-xs">₹31,000 • credit</td><td className="px-3 py-3 text-xs font-bold text-blue-700">Porter</td><td className="px-3 py-3 text-xs">Scheduled</td></tr>
            <tr className="partner-row filter-row" data-dist="far" data-status="transit" data-type="bought" data-payment="credit"><td className="px-3 py-3 font-bold">#P-8819</td><td className="px-3 py-3">Punjab Grain Co</td><td className="px-3 py-3"><span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">1,240 km • Ludhiana</span></td><td className="px-3 py-3"><span className="text-orange-700 font-bold text-xs">You bought</span></td><td className="px-3 py-3 text-xs text-gray-600">Basmati 500kg</td><td className="px-3 py-3 text-xs">₹31,000 • credit</td><td className="px-3 py-3 text-xs font-bold text-amber-700">Delhivery Freight</td><td className="px-3 py-3 text-xs">In transit</td></tr>
            <tr className="partner-row filter-row" data-dist="far" data-status="packing" data-type="sold" data-payment="credit"><td className="px-3 py-3 font-bold">#P-8817</td><td className="px-3 py-3">Mumbai Spice Traders</td><td className="px-3 py-3"><span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">280 km • Mumbai</span></td><td className="px-3 py-3"><span className="text-green-700 font-bold text-xs">You sold</span></td><td className="px-3 py-3 text-xs text-gray-600">Masala lot</td><td className="px-3 py-3 text-xs">₹18,400 • 21d credit</td><td className="px-3 py-3 text-xs font-bold text-amber-700">Delhivery</td><td className="px-3 py-3 text-xs">Packing</td></tr>
            <tr className="partner-row filter-row" data-dist="far" data-status="transit" data-type="bought" data-payment="credit"><td className="px-3 py-3 font-bold">#P-8816</td><td className="px-3 py-3">Jaipur Textile Hub</td><td className="px-3 py-3"><span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">890 km • Jaipur</span></td><td className="px-3 py-3"><span className="text-orange-700 font-bold text-xs">You bought</span></td><td className="px-3 py-3 text-xs text-gray-600">Fabric roll</td><td className="px-3 py-3 text-xs">₹42,000 • credit</td><td className="px-3 py-3 text-xs font-bold text-amber-700">Freight truck</td><td className="px-3 py-3 text-xs">ETA 3 days</td></tr>
            <tr className="partner-row filter-row" data-dist="export" data-status="customs" data-type="sold" data-payment="paid"><td className="px-3 py-3 font-bold">#P-8818</td><td className="px-3 py-3">Al-Rashid Trading</td><td className="px-3 py-3"><span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Dubai, UAE</span></td><td className="px-3 py-3"><span className="text-green-700 font-bold text-xs">You sold</span></td><td className="px-3 py-3 text-xs text-gray-600">Spices export</td><td className="px-3 py-3 text-xs">₹1.85L • wire</td><td className="px-3 py-3 text-xs font-bold text-indigo-700">Export freight</td><td className="px-3 py-3 text-xs">Customs</td></tr>
            <tr className="partner-row filter-row" data-dist="export" data-status="transit" data-type="bought" data-payment="paid"><td className="px-3 py-3 font-bold">#P-8815</td><td className="px-3 py-3">NY Foods Inc</td><td className="px-3 py-3"><span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">USA</span></td><td className="px-3 py-3"><span className="text-orange-700 font-bold text-xs">You bought</span></td><td className="px-3 py-3 text-xs text-gray-600">Packaging</td><td className="px-3 py-3 text-xs">$2,400</td><td className="px-3 py-3 text-xs font-bold text-indigo-700">Air cargo</td><td className="px-3 py-3 text-xs">In transit</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center"><div className="text-xs text-gray-500">Nearby (&lt;50km)</div><div className="font-extrabold text-green-700">3 orders</div></div>
        <div className="card p-3 text-center"><div className="text-xs text-gray-500">Far / Interstate</div><div className="font-extrabold text-amber-700">3 orders</div></div>
        <div className="card p-3 text-center"><div className="text-xs text-gray-500">Export</div><div className="font-extrabold text-indigo-700">2 orders</div></div>
        <div className="card p-3 text-center"><div className="text-xs text-gray-500">Points this week</div><div className="font-extrabold text-amber-600">+980 pts</div></div>
      </div>
      <div className="card p-4 bg-orange-50 border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-orange-800"><i className="fa-solid fa-truck mr-1"></i> <b>Store orders have no distance limit.</b> Nearby = Porter truck. Far = Delhivery/freight. International = export. Track all in <button onClick={() => {}} className="underline font-bold">Freight Tracking</button>.</p>
        <button onClick={() => {}} className="btn-primary !text-xs">Track Shipments</button>
      </div>
    </section>


  );
}
