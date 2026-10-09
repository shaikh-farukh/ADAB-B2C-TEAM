import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export default function Settings() {
  const [settings, setSettings] = useState({
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
          setSettings(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.patch('/settings', settings);
      if (res.data.success) {
        setMessage('Settings saved successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>
      
      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">
          {message}
        </div>
      )}

      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Approval Rules</h2>
          <label className="flex items-center space-x-3">
            <input 
              type="checkbox" 
              checked={settings.autoApproveProducts}
              onChange={(e) => setSettings({...settings, autoApproveProducts: e.target.checked})}
              className="h-5 w-5 text-indigo-600 rounded"
            />
            <span>Auto-approve trusted seller products</span>
          </label>
          <label className="flex items-center space-x-3 mt-3">
            <input 
              type="checkbox" 
              checked={settings.requireDocuments}
              onChange={(e) => setSettings({...settings, requireDocuments: e.target.checked})}
              className="h-5 w-5 text-indigo-600 rounded"
            />
            <span>Require business documents for sellers</span>
          </label>
        </div>

        <hr className="border-slate-200" />

        <div>
          <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
          <label className="flex items-center space-x-3">
            <input 
              type="checkbox" 
              checked={settings.notifyOnNewSeller}
              onChange={(e) => setSettings({...settings, notifyOnNewSeller: e.target.checked})}
              className="h-5 w-5 text-indigo-600 rounded"
            />
            <span>Email me on new seller registration</span>
          </label>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
