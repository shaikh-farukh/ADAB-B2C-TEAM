import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export default function Settings() {
  const [settings, setSettings] = useState({
    autoApprovalEnabled: false,
    requireRejectionReason: true,
    emailNotifications: true,
    maxListingPerSeller: 100,
    autoApproveProducts: false,
    requireDocuments: true,
    notifyOnNewSeller: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/settings');
        if (res.data.success && res.data.data) {
          setSettings((prev) => ({ ...prev, ...res.data.data }));
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiClient.patch('/settings', settings);
      if (res.data.success) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading Settings...</div>;

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Admin Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure global approval policies, moderation rules &amp; operational limits</p>
      </div>

      {message && (
        <div className={`p-3 font-bold text-xs rounded-xl ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Admin Policies */}
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
        
        {/* Approval Rules (from Devika) */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800">Auto-approve Products</div>
            <div className="text-xs text-slate-500">Auto-approve trusted seller products</div>
          </div>
          <input type="checkbox" checked={settings.autoApproveProducts} onChange={e => setSettings({ ...settings, autoApproveProducts: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800">Require Documents</div>
            <div className="text-xs text-slate-500">Require business documents for sellers</div>
          </div>
          <input type="checkbox" checked={settings.requireDocuments} onChange={e => setSettings({ ...settings, requireDocuments: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800">Notify on New Seller</div>
            <div className="text-xs text-slate-500">Email me on new seller registration</div>
          </div>
          <input type="checkbox" checked={settings.notifyOnNewSeller} onChange={e => setSettings({ ...settings, notifyOnNewSeller: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Max Active Listings per Seller</label>
          <input type="number" value={settings.maxListingPerSeller} onChange={e => setSettings({ ...settings, maxListingPerSeller: Number(e.target.value) })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
        </div>

        <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
