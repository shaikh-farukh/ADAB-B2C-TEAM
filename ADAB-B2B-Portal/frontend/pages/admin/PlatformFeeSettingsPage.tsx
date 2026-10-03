import React, { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import { useNotification } from '../../context/NotificationContext';
import { Save, Settings } from 'lucide-react';

const PlatformFeeSettingsPage: React.FC = () => {
  const [commission, setCommission] = useState('1.0');
  const [techFee, setTechFee] = useState('10.00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/admin/platform-settings');
        if (res.data.success && res.data.data) {
          setCommission(res.data.data.platform_commission_percentage);
          setTechFee(res.data.data.tech_fee);
        }
      } catch (error) {
        showError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.put('/admin/platform-settings', {
        platform_commission_percentage: parseFloat(commission),
        tech_fee: parseFloat(techFee)
      });
      showSuccess('Platform settings updated successfully');
    } catch (error) {
      showError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-200 tracking-tight">Platform Fee Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure global rates applied to platform transactions.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-adab-orange/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-adab-orange" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-200">Commission Take-Rate Engine</h2>
            <p className="text-xs font-medium text-gray-500">Live configuration for B2B financial splits.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
             <div className="w-6 h-6 border-2 border-adab-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Platform Commission Percentage
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100 pl-4 pr-12 py-3.5 text-lg font-bold focus:border-adab-green focus:ring-adab-green transition-colors"
                    placeholder="e.g. 1.0"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-gray-400 font-bold">%</span>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-gray-500">Applied to wholesale POs upon settlement.</p>
              </div>

              <div className="group">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Convenience Tech Fee
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-gray-400 font-bold">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={techFee}
                    onChange={(e) => setTechFee(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100 pl-10 pr-4 py-3.5 text-lg font-bold focus:border-adab-green focus:ring-adab-green transition-colors"
                    placeholder="e.g. 10.00"
                    required
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-gray-500">Flat fee applied directly on checkouts.</p>
              </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-gray-100 dark:border-white/5">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-3 bg-adab-green text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-green-700 transition-all shadow-md shadow-green-900/10 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PlatformFeeSettingsPage;
