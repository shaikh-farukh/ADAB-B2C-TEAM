import React, { useState } from 'react';
import { useSeller } from '../context/SellerContext';

export default function DeliveryPage() {
  const { store } = useSeller();
  const radius = store?.delivery_radius_km ? `${parseInt(store.delivery_radius_km, 10)} km` : '10 km';

  const [fastDelivery, setFastDelivery] = useState(true);
  const [sameDay, setSameDay] = useState(true);
  const [normalDelivery, setNormalDelivery] = useState(true);
  const [pickup, setPickup] = useState(true);

  const [porter, setPorter] = useState(true);
  const [delhivery, setDelhivery] = useState(true);
  const [exportFreight, setExportFreight] = useState(false);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <section id="sec-delivery" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Delivery Settings</h1>
        <p className="text-sm text-gray-500">Hyperlocal bike/van for app customers • Truck &amp; national logistics for store orders</p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
          Delivery settings saved successfully!
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-bold text-green-800 mb-1 flex items-center gap-1.5">
            <i className="fa-solid fa-users text-green-700"></i>
            <span>For App Customers (Hyperlocal)</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Only visible to customers inside your <b>{radius}</b> operating zone
          </p>
          <div className="space-y-3">
            <label className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50 flex justify-between items-center cursor-pointer">
              <div>
                <div className="font-bold text-orange-900">⚡ Fast Delivery</div>
                <div className="text-xs text-gray-600 mt-1">Under 1 hour • up to 5 km zone</div>
              </div>
              <input type="checkbox" checked={fastDelivery} onChange={(e) => setFastDelivery(e.target.checked)} className="w-5 h-5 text-orange-600 rounded" />
            </label>
            <label className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 flex justify-between items-center cursor-pointer">
              <div>
                <div className="font-bold text-blue-900">🚚 Same-Day Delivery</div>
                <div className="text-xs text-gray-600 mt-1">2–4 hours • whole city area</div>
              </div>
              <input type="checkbox" checked={sameDay} onChange={(e) => setSameDay(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
            </label>
            <label className="p-4 rounded-xl border-2 border-green-200 bg-green-50 flex justify-between items-center cursor-pointer">
              <div>
                <div className="font-bold text-green-900">📅 Standard Scheduled</div>
                <div className="text-xs text-gray-600 mt-1">Morning / Evening slot delivery</div>
              </div>
              <input type="checkbox" checked={normalDelivery} onChange={(e) => setNormalDelivery(e.target.checked)} className="w-5 h-5 text-green-600 rounded" />
            </label>
            <label className="p-4 rounded-xl border border-purple-200 bg-purple-50 flex justify-between items-center cursor-pointer">
              <div>
                <div className="font-bold text-purple-900">🏪 Store Counter Pickup</div>
                <div className="text-xs text-gray-600 mt-1">Customer collects directly from counter</div>
              </div>
              <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} className="w-5 h-5 text-purple-600 rounded" />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-3">Riders dispatch directly from your shop counter.</p>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-orange-800 mb-1 flex items-center gap-1.5">
            <i className="fa-solid fa-store text-orange-600"></i>
            <span>For B2B Store Orders (Intercity &amp; Bulk)</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">Utilizes commercial truck &amp; freight carriers</p>
          <div className="space-y-3">
            <label className="p-4 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer">
              <div>
                <div className="font-bold text-gray-900">Porter (Intra-city LCV)</div>
                <div className="text-xs text-gray-500 mt-1">Same city wholesale • 2–6 hours</div>
              </div>
              <input type="checkbox" checked={porter} onChange={(e) => setPorter(e.target.checked)} className="w-5 h-5 text-green-700 rounded" />
            </label>
            <label className="p-4 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer">
              <div>
                <div className="font-bold text-gray-900">Delhivery &amp; Express Cargo</div>
                <div className="text-xs text-gray-500 mt-1">Nationwide surface express • 1–3 days</div>
              </div>
              <input type="checkbox" checked={delhivery} onChange={(e) => setDelhivery(e.target.checked)} className="w-5 h-5 text-green-700 rounded" />
            </label>
            <label className="p-4 rounded-xl border border-gray-200 flex justify-between items-center cursor-pointer">
              <div>
                <div className="font-bold text-gray-900">Export Freight (Air / Sea)</div>
                <div className="text-xs text-gray-500 mt-1">International shipments (requires IEC)</div>
              </div>
              <input type="checkbox" checked={exportFreight} onChange={(e) => setExportFreight(e.target.checked)} className="w-5 h-5 text-green-700 rounded" />
            </label>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-blue-50 text-xs text-blue-800">
            <i className="fa-solid fa-circle-info mr-1"></i>
            <b>Automatic Fallback:</b> When your riders are busy, ADAB automatically dispatches fleet partners.
          </div>
        </div>
      </div>
      
      <button onClick={handleSave} className="btn-primary">Save Delivery Configuration</button>
    </section>
  );
}
