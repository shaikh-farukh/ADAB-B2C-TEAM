import React from 'react';
import { useDelivery } from '../hooks/useDelivery';

export default function DeliveryPage() {
  const { fleet, loading } = useDelivery();
  return (
    <section id="sec-delivery" className="space-y-4">
      <div><h1 className="text-xl font-extrabold">Delivery Settings</h1><p className="text-sm text-gray-500">Nearby bike/van for app customers • truck/freight for store orders</p></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-bold text-green-800 mb-1"><i className="fa-solid fa-users mr-1"></i> For App Customers (Nearby)</h2>
          <p className="text-xs text-gray-500 mb-4">Only shown to customers inside your <span id="deliveryZoneRef">10 km</span> zone</p>
          <div className="space-y-3">
            <div className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50 flex justify-between items-center"><div><div className="font-bold text-orange-900">âš¡ Fast</div><div className="text-xs text-gray-600 mt-1">Under 1 hour • 5 km • ₹29 fee</div></div><input type="checkbox" checked /></div>
            <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 flex justify-between items-center"><div><div className="font-bold text-blue-900">ðŸšš Same-day</div><div className="text-xs text-gray-600 mt-1">2-4 hours • 15 km • ₹49 fee</div></div><input type="checkbox" checked /></div>
            <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50 flex justify-between items-center"><div><div className="font-bold text-green-900">ðŸ“… Normal</div><div className="text-xs text-gray-600 mt-1">Pick morning/evening slot • Free above ₹399</div></div><input type="checkbox" checked /></div>
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50 flex justify-between items-center"><div><div className="font-bold text-purple-900">ðŸª Pickup</div><div className="text-xs text-gray-600 mt-1">Customer collects from store</div></div><input type="checkbox" checked /></div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Use your own riders, or ADAB will send a partner rider when you're busy.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-orange-800 mb-1"><i className="fa-solid fa-store mr-1"></i> For Other Stores</h2>
          <p className="text-xs text-gray-500 mb-4">Always uses truck / freight — never bike delivery</p>
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-gray-200 flex justify-between items-center"><div><div className="font-bold">Porter</div><div className="text-xs text-gray-500 mt-1">Same city • 2-6 hours</div></div><input type="checkbox" checked /></div>
            <div className="p-4 rounded-xl border border-gray-200 flex justify-between items-center"><div><div className="font-bold">Delhivery</div><div className="text-xs text-gray-500 mt-1">Other cities • 1-3 days</div></div><input type="checkbox" checked /></div>
            <div className="p-4 rounded-xl border border-gray-200 flex justify-between items-center"><div><div className="font-bold">Export freight</div><div className="text-xs text-gray-500 mt-1">International • if enabled</div></div><input type="checkbox" /></div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-blue-50 text-xs text-blue-800"><i className="fa-solid fa-motorcycle mr-1"></i> <b>Partner rider fallback:</b> When your riders are busy, ADAB assigns a nearby partner for customer orders only.</div>
        </div>
      </div>
      <button onClick={() => {}} className="btn-primary">Save Settings</button>
    </section>


  );
}
