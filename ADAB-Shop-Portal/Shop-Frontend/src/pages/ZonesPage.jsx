import React, { useState } from 'react';
import { useSeller } from '../context/SellerContext';
import { useOrders } from '../hooks/useOrders';

export default function ZonesPage() {
  const { store } = useSeller();
  const { orders } = useOrders();
  const initialRadius = store?.delivery_radius_km ? parseInt(store.delivery_radius_km, 10).toString() : '10';

  const [radius, setRadius] = useState(initialRadius);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const activeOrdersCount = orders.length;

  return (
    <section id="sec-zones" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Delivery Zones &amp; Coverage</h1>
        <p className="text-sm text-gray-500">Nearby App Customers = Hyperlocal Radius • B2B Store Buyers = Nationwide</p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
          Delivery radius updated to {radius} km!
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 border-2 border-green-200">
          <h2 className="font-bold text-green-800 mb-1 flex items-center gap-1.5">
            <i className="fa-solid fa-mobile-screen"></i>
            <span>Customer App Zone (Hyperlocal)</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">Only customers inside this radius can browse and order from your store catalog</p>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Select Delivery Radius</label>
              <select 
                id="inpZoneRadius" 
                value={radius}
                onChange={(e) => setRadius(e.target.value)} 
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-bold text-base outline-none focus:border-green-600"
              >
                <option value="3">3 km — Hyperlocal (Fast 30m)</option>
                <option value="5">5 km — Neighbourhood (45m)</option>
                <option value="10">10 km — City Area (Standard)</option>
                <option value="15">15 km — Extended Metro</option>
                <option value="20">20 km — Outer Suburbs</option>
              </select>
            </div>
            
            <div className="p-3 rounded-xl bg-green-50 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Active City</span>
                <span className="font-bold text-green-800">{store?.city || 'Surat'}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Orders Today</span>
                <span className="font-bold text-green-800">{activeOrdersCount} in progress</span>
              </div>
            </div>

            <div className="h-40 bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 text-xs border border-gray-200">
              <i className="fa-solid fa-map-location-dot text-2xl mb-1 text-green-600"></i>
              <span>Active {radius} km Hyperlocal Delivery Circle</span>
            </div>
          </div>
          
          <button onClick={handleSave} className="btn-primary !text-xs w-full mt-3">Save Zone Radius</button>
        </div>

        <div className="card p-5 border-2 border-orange-200">
          <h2 className="font-bold text-orange-800 mb-1 flex items-center gap-1.5">
            <i className="fa-solid fa-store"></i>
            <span>B2B Store-to-Store (Nationwide / Export)</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">Other registered merchants and shops can order wholesale with no radius restriction</p>
          
          <ul className="text-sm space-y-2 text-gray-600">
            <li className="flex gap-2">
              <i className="fa-solid fa-check text-green-600 mt-0.5"></i>
              <span><b>Intracity (&lt;50 km):</b> Porter mini-trucks with same-day delivery</span>
            </li>
            <li className="flex gap-2">
              <i className="fa-solid fa-check text-green-600 mt-0.5"></i>
              <span><b>Interstate:</b> Delhivery freight cargo (2–4 business days)</span>
            </li>
            <li className="flex gap-2">
              <i className="fa-solid fa-check text-green-600 mt-0.5"></i>
              <span><b>Export Trade:</b> Customs cleared air/sea freight logistics</span>
            </li>
          </ul>

          <div className="mt-6 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900">
            <i className="fa-solid fa-shield-halved mr-1"></i>
            <b>Wholesale Protection:</b> B2B pricing and bulk packaging are applied automatically.
          </div>
        </div>
      </div>
    </section>
  );
}
