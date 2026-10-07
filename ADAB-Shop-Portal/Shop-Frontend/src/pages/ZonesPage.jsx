import React from 'react';
import { useDelivery } from '../hooks/useDelivery';

export default function ZonesPage() {
  return (
    <section id="sec-zones" className="space-y-4">
      <div><h1 className="text-xl font-extrabold">Delivery Zones</h1><p className="text-sm text-gray-500">App customers = nearby only • Store buyers = anywhere in India (or export)</p></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 border-2 border-green-200">
          <h2 className="font-bold text-green-800 mb-1"><i className="fa-solid fa-mobile-screen mr-1"></i> Customer App Zone (Nearby)</h2>
          <p className="text-xs text-gray-500 mb-4">Only customers inside this radius can order from your app listing</p>
          <div className="space-y-3">
            <div><label className="text-xs font-bold text-gray-500 block mb-1">Delivery radius from your store</label>
              <select id="inpZoneRadius" onChange={() => {}} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-bold text-lg">
                <option value="3">3 km — hyperlocal</option><option value="5">5 km — neighbourhood</option><option value="10" selected>10 km — city area</option><option value="15">15 km — extended</option><option value="20">20 km — wide area</option>
              </select>
            </div>
            <div className="p-3 rounded-xl bg-green-50 text-sm"><div className="flex justify-between"><span>Customers in zone now</span><span className="font-bold text-green-800">~24,500</span></div><div className="flex justify-between mt-1"><span>Orders possible today</span><span className="font-bold">Yes — 14 active</span></div></div>
            <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs"><i className="fa-solid fa-map text-2xl mb-1"></i><br />Zone preview • green circle on order map</div>
          </div>
          <button onClick={() => {}} className="btn-primary !text-xs w-full mt-3">Save Zone</button>
        </div>
        <div className="card p-5 border-2 border-orange-200">
          <h2 className="font-bold text-orange-800 mb-1"><i className="fa-solid fa-store mr-1"></i> Store-to-Store (No Limit)</h2>
          <p className="text-xs text-gray-500 mb-4">Other shops can order from you regardless of distance</p>
          <ul className="text-sm space-y-2 text-gray-600">
            <li className="flex gap-2"><i className="fa-solid fa-check text-green-600 mt-0.5"></i> <span><b>Nearby (&lt;50 km):</b> Porter truck, same-day possible</span></li>
            <li className="flex gap-2"><i className="fa-solid fa-check text-green-600 mt-0.5"></i> <span><b>Interstate:</b> Delhivery, freight trucks, 2–5 days</span></li>
            <li className="flex gap-2"><i className="fa-solid fa-check text-green-600 mt-0.5"></i> <span><b>Export:</b> customs + international freight</span></li>
            <li className="flex gap-2"><i className="fa-solid fa-check text-green-600 mt-0.5"></i> <span>Credit terms you set apply to all store buyers</span></li>
          </ul>
          <button onClick={() => {}} className="btn-soft !text-xs w-full mt-4">Set Credit Terms for Stores</button>
        </div>
      </div>
    </section>


  );
}
