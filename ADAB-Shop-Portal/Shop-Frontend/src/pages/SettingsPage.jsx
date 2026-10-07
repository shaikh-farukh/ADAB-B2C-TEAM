import React, { useState, useEffect } from 'react';
import { useSeller } from '../context/SellerContext';

export default function SettingsPage() {
  const { profile, store } = useSeller();

  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (store || profile) {
      setStoreName(store?.store_name || '');
      setOwnerName(profile?.full_name || '');
      setPhone(profile?.phone || store?.phone || '');
      setAddress(store?.address_line ? `${store.address_line}, ${store.city || ''}, ${store.state || ''} ${store.pincode || ''}` : '');
      setGstin(profile?.gstin || '');
    }
  }, [store, profile]);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <section id="sec-settings" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Store Settings</h1>
        <p className="text-sm text-gray-500">Profile, business details, delivery zones, and preferences</p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
          Settings updated successfully!
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={handleSave} className="card p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Store Profile</h3>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Store Name</label>
            <input 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)} 
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Owner Name</label>
            <input 
              value={ownerName} 
              onChange={(e) => setOwnerName(e.target.value)} 
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Phone</label>
            <input 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Address</label>
            <textarea 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-dark" 
              rows="2" 
            />
          </div>
          <button type="submit" className="btn-primary !text-xs">Save Profile</button>
        </form>

        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Business &amp; Tax</h3>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">GSTIN</label>
            <input 
              value={gstin || '24AAAAA0000A1Z5'} 
              onChange={(e) => setGstin(e.target.value)} 
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-mono bg-green-50 text-sm" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">KYC Status</label>
            <div className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-xs text-green-700">
              {profile?.kyc_status || 'VERIFIED'}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Store Category</label>
            <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
              <option>{store?.category || 'Grocery & General'}</option>
              <option>Clothing &amp; Fashion</option>
              <option>Restaurant / Food</option>
              <option>Pharmacy</option>
              <option>Mixed</option>
            </select>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-gray-900">Delivery &amp; Hours</h3>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" defaultChecked /> Fast delivery (under 1 hr)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" defaultChecked /> Same-day delivery
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" defaultChecked /> Store pickup
          </label>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Operating Hours</label>
            <input 
              defaultValue={`${store?.open_time || '08:00 AM'} – ${store?.close_time || '10:00 PM'}`} 
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" 
            />
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-gray-900">Notification Preferences</h3>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" defaultChecked /> New orders (SMS + app)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" defaultChecked /> Low stock alerts
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" defaultChecked /> Payment settlements
          </label>
          <button onClick={handleSave} className="btn-primary !text-xs mt-2">Save Preferences</button>
        </div>
      </div>
    </section>
  );
}
