import React, { useState, useEffect } from 'react';
import sellerService from '../services/sellerService';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [profileData, setProfileData] = useState(null);
  const [storeData, setStoreData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, storeRes, settingsRes] = await Promise.all([
        sellerService.getProfile(),
        sellerService.getStore(),
        sellerService.getSettings()
      ]);
      if (profileRes.success) setProfileData(profileRes.data);
      if (storeRes.success) setStoreData(storeRes.data);
      if (settingsRes.success) setSettingsData(settingsRes.data);
    } catch (err) {
      setError("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await sellerService.updateProfile(profileData);
      if (res.success) setSuccess(true);
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await sellerService.updateStore(storeData);
      if (res.success) setSuccess(true);
    } catch (err) {
      setError("Failed to update store");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await sellerService.updateSettings(settingsData);
      if (res.success) setSuccess(true);
    } catch (err) {
      setError("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center font-bold text-gray-500 fade-in">Loading Configuration...</div>;

  return (
    <div className="fade-in max-w-4xl mx-auto py-2">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Configuration</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Manage your store's public profile, legal details, and operational settings.</p>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-8 px-1">
        {[
          { id: 'profile', icon: 'fa-id-badge', label: 'Legal & Profile' },
          { id: 'store', icon: 'fa-store', label: 'Store Details' },
          { id: 'settings', icon: 'fa-sliders', label: 'Operations' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSuccess(false); setError(null); }}
            className={`pb-3 px-2 text-sm font-extrabold flex items-center gap-2 transition-all ${
              activeTab === tab.id 
                ? 'text-brand-dark border-b-2 border-brand-dark' 
                : 'text-gray-400 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
            }`}
          >
            <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3"><i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5"></i><p className="text-sm font-bold text-red-800">{error}</p></div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3"><i className="fa-solid fa-circle-check text-green-500 mt-0.5"></i><p className="text-sm font-bold text-green-800">Changes saved successfully!</p></div>}

      {/* Profile Form */}
      {activeTab === 'profile' && profileData && (
        <form onSubmit={handleSaveProfile} className="card p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Legal Entity Details</h2>
              <p className="text-xs text-gray-500 font-medium">As registered with government authorities</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Legal Name / Company Name</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={profileData.legal_name || ''} onChange={e => setProfileData({...profileData, legal_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">GSTIN</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={profileData.gstin || ''} onChange={e => setProfileData({...profileData, gstin: e.target.value})} required placeholder="24AAAAA0000A1Z5" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">PAN</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={profileData.pan || ''} onChange={e => setProfileData({...profileData, pan: e.target.value})} required placeholder="ABCDE1234F" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Entity Type</label>
              <select className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={profileData.entity_type || ''} onChange={e => setProfileData({...profileData, entity_type: e.target.value})}>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Partnership">Partnership</option>
                <option value="Private Limited">Private Limited</option>
              </select>
            </div>
          </div>
          <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary py-3 px-8 shadow-sm flex items-center gap-2">
              {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> Save Legal Details</>}
            </button>
          </div>
        </form>
      )}

      {/* Store Form */}
      {activeTab === 'store' && storeData && (
        <form onSubmit={handleSaveStore} className="card p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl">
              <i className="fa-solid fa-shop"></i>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">Public Storefront</h2>
              <p className="text-xs text-gray-500 font-medium">This information is visible to customers on the app</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Store Display Name</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={storeData.store_name || ''} onChange={e => setStoreData({...storeData, store_name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Support Phone</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={storeData.phone || ''} onChange={e => setStoreData({...storeData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Primary Category</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={storeData.category || ''} onChange={e => setStoreData({...storeData, category: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Store Address</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white mb-3" value={storeData.address_line || ''} onChange={e => setStoreData({...storeData, address_line: e.target.value})} placeholder="Street address" />
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={storeData.city || ''} onChange={e => setStoreData({...storeData, city: e.target.value})} placeholder="City" />
            </div>
          </div>
          <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary py-3 px-8 shadow-sm flex items-center gap-2">
              {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> Save Storefront</>}
            </button>
          </div>
        </form>
      )}

      {/* Settings Form */}
      {activeTab === 'settings' && settingsData && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="card p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                <i className="fa-solid fa-truck-fast"></i>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Operations & Delivery</h2>
                <p className="text-xs text-gray-500 font-medium">Control how and when you receive orders</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors bg-gray-50/50">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400">
                    <i className="fa-solid fa-store"></i>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">Store Status</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Turn off to temporarily stop receiving new orders</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settingsData.is_online} onChange={e => setSettingsData({...settingsData, is_online: e.target.checked})} />
                  <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-5 border border-gray-100 rounded-2xl hover:border-gray-200 transition-colors bg-gray-50/50">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-amber-500">
                    <i className="fa-solid fa-volume-high"></i>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">Soundbox Alerts</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Play loud audio notification on new orders</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settingsData.soundbox_enabled} onChange={e => setSettingsData({...settingsData, soundbox_enabled: e.target.checked})} />
                  <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-dark shadow-inner"></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Open Time</label>
                <input type="time" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={settingsData.open_time || ''} onChange={e => setSettingsData({...settingsData, open_time: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Close Time</label>
                <input type="time" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={settingsData.close_time || ''} onChange={e => setSettingsData({...settingsData, close_time: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Delivery Radius (km)</label>
                <div className="relative">
                  <input type="number" step="0.1" className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:border-brand-dark focus:ring-2 focus:ring-green-50 transition-all bg-gray-50 focus:bg-white" value={settingsData.delivery_radius_km || ''} onChange={e => setSettingsData({...settingsData, delivery_radius_km: parseFloat(e.target.value)})} />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">km</div>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-gray-100 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary py-3 px-8 shadow-sm flex items-center gap-2">
                {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-check"></i> Save Operations</>}
              </button>
            </div>
          </div>
        </form>
      )}

    </div>
  );
};

export default Settings;
