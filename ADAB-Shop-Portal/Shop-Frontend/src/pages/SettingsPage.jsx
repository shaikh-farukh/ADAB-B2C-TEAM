import React from 'react';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  return (
<>
<section id="sec-settings" className="space-y-4">
      <div><h1 className="text-xl font-extrabold">Store Settings</h1><p className="text-sm text-gray-500">Profile, business details, delivery zones, and preferences</p></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4">
          <h3 className="font-bold">Store Profile</h3>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">Store Name</label><input value="Shri Balaji Store" className="w-full px-3 py-2.5 rounded-xl border border-gray-200"  /></div>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">Owner Name</label><input value="Rajesh Patel" className="w-full px-3 py-2.5 rounded-xl border border-gray-200"  /></div>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">Phone</label><input value="+91 98765 43210" className="w-full px-3 py-2.5 rounded-xl border border-gray-200"  /></div>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">Address</label><textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200" rows="2">Ring Road, Surat, Gujarat 395002</textarea></div>
          <button onClick={() => {}} className="btn-primary !text-xs">Save Profile</button>
        </div>
        <div className="card p-5 space-y-4">
          <h3 className="font-bold">Business & Tax</h3>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">GSTIN</label><input value="24AAAAA0000A1Z5" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-mono bg-green-50" readonly  /></div>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">PAN</label><input value="AAAAA0000A" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-mono"  /></div>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">FSSAI</label><input value="10020021000492" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 font-mono"  /></div>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">Store Type</label><select className="w-full px-3 py-2.5 rounded-xl border border-gray-200"><option>Grocery & General</option><option>Clothing & Fashion</option><option>Restaurant / Food</option><option>Pharmacy</option><option>Mixed</option></select></div>
        </div>
        <div className="card p-5 space-y-3">
          <h3 className="font-bold">Delivery & Hours</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked  /> Fast delivery (under 1 hr)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked  /> Same-day delivery</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked  /> Store pickup</label>
          <div><label className="text-xs font-bold text-gray-500 block mb-1">Open Hours</label><input value="8:00 AM – 10:00 PM" className="w-full px-3 py-2.5 rounded-xl border border-gray-200"  /></div>
        </div>
        <div className="card p-5 space-y-3">
          <h3 className="font-bold">Language</h3>
          <select id="settingsLang" onChange={() => {}} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold">
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="gu">ગુજરાતી (Gujarati)</option>
          </select>
          <p className="text-xs text-gray-500">Changes menu and main labels instantly</p>
        </div>
        <div className="card p-5 space-y-3">
          <h3 className="font-bold">Notifications Preferences</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked  /> New orders (SMS + app)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked  /> Low stock alerts</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked  /> Payment settlements</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox"  /> Marketing tips</label>
          <button onClick={() => {}} className="btn-primary !text-xs mt-2">Save Preferences</button>
        </div>
      </div>
    </section>
</>
  );
}
