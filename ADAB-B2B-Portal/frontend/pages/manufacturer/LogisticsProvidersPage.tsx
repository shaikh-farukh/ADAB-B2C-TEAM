import React, { useEffect, useState } from 'react';
import { logisticsService, LogisticsProvider } from '../../services/logisticsService';
import { useNotification } from '../../context/NotificationContext';
import { Plus, Edit2, Trash2, Truck, X, Save } from 'lucide-react';

const LogisticsProvidersPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [providers, setProviders] = useState<LogisticsProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<LogisticsProvider>>({
    provider_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    address: '',
    gst_number: ''
  });

  const loadProviders = async () => {
    setIsLoading(true);
    const res = await logisticsService.getProviders();
    if (res.success) {
      setProviders(res.data);
    } else {
      showError(res.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleOpenModal = (provider?: LogisticsProvider) => {
    if (provider) {
      setFormData(provider);
    } else {
      setFormData({ provider_name: '', contact_person: '', mobile: '', email: '', address: '', gst_number: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.provider_name) {
      return showError('Provider name is required');
    }
    setIsSubmitting(true);

    let res;
    if (formData.id) {
      res = await logisticsService.updateProvider(formData.id, formData);
    } else {
      res = await logisticsService.createProvider(formData);
    }

    if (res.success) {
      showSuccess(res.message);
      setIsModalOpen(false);
      loadProviders();
    } else {
      showError(res.message);
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await logisticsService.toggleStatus(id, newStatus);
    if (res.success) {
      showSuccess(res.message);
      setProviders(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } else {
      showError(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this provider?')) return;
    const res = await logisticsService.deleteProvider(id);
    if (res.success) {
      showSuccess(res.message);
      loadProviders();
    } else {
      showError(res.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-adab-orange mb-1.5">
            <Truck className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Logistics Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-dark-text-secondary tracking-tight">Logistics Providers</h1>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-adab-orange text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-700 transition-all shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Provider
        </button>
      </div>

      <div className="bg-white dark:bg-dark-app-secondary rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border-secondary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
              <tr>
                <th className="px-6 py-4">Provider Info</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">Loading providers...</td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">No logistics providers found.</td>
                </tr>
              ) : (
                providers.map(provider => (
                  <tr key={provider.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-dark-text-secondary">{provider.provider_name}</p>
                      <p className="text-xs text-gray-500">GST: {provider.gst_number || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-dark-text-secondary">{provider.contact_person}</p>
                      <p className="text-xs text-gray-500">{provider.mobile} | {provider.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(provider.id, provider.status)}
                        className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-full transition-colors ${
                          provider.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {provider.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenModal(provider)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(provider.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-app-secondary rounded-3xl dark:border dark:border-dark-border-secondary w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border-primary flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                {formData.id ? 'Edit Logistics Provider' : 'Add Logistics Provider'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Provider Name *</label>
                <input
                  type="text"
                  required
                  value={formData.provider_name}
                  onChange={e => setFormData({ ...formData, provider_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-adab-orange/20 outline-none"
                  placeholder="e.g. BlueDart Logistics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-adab-orange/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-adab-orange/20 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-adab-orange/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">GST Number</label>
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={e => setFormData({ ...formData, gst_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-adab-orange/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-adab-orange/20 outline-none"
                />
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-dark-border-primary flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-surface-elevated hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-adab-orange hover:bg-orange-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsProvidersPage;
