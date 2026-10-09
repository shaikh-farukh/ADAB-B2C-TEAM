import { useState } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState({
    autoApprovalEnabled: false,
    requireRejectionReason: true,
    emailNotifications: true,
    maxListingPerSeller: 100
  });
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Admin Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure global approval policies, moderation rules &amp; operational limits</p>
      </div>

      {saved && <div className="p-3 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl">Settings saved successfully!</div>}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800">Require Rejection Reason</div>
            <div className="text-xs text-slate-500">Enforce mandatory notes/reasons when rejecting listings or returns</div>
          </div>
          <input type="checkbox" checked={settings.requireRejectionReason} onChange={e => setSettings({ ...settings, requireRejectionReason: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800">Audit Trail Notifications</div>
            <div className="text-xs text-slate-500">Send email alerts for sensitive admin actions</div>
          </div>
          <input type="checkbox" checked={settings.emailNotifications} onChange={e => setSettings({ ...settings, emailNotifications: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Max Active Listings per Seller</label>
          <input type="number" value={settings.maxListingPerSeller} onChange={e => setSettings({ ...settings, maxListingPerSeller: Number(e.target.value) })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
        </div>

        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">
          Save Settings
        </button>
      </form>
    </div>
  );
}
