import React, { useEffect, useState } from 'react';
import { driverService, Driver } from '../../services/driverService';
import { logisticsService, LogisticsProvider } from '../../services/logisticsService';
import { useNotification } from '../../context/NotificationContext';
import { Plus, Edit2, Trash2, Users, X, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';

const DriversPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [providers, setProviders] = useState<LogisticsProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Driver>>({
    logistics_provider_id: '',
    driver_name: '',
    mobile: '',
    license_number: '',
    license_expiry_date: '',
    aadhaar_number: '',
    emergency_contact: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    const [driversRes, providersRes] = await Promise.all([
      driverService.getDrivers(selectedProviderFilter),
      logisticsService.getProviders()
    ]);

    if (driversRes.success) {
      setDrivers(driversRes.data);
    } else {
      showError(driversRes.message);
    }

    if (providersRes.success) {
      setProviders(providersRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedProviderFilter]);

  const handleOpenModal = (driver?: Driver) => {
    if (driver) {
      setFormData({
        ...driver,
        license_expiry_date: driver.license_expiry_date ? new Date(driver.license_expiry_date).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        logistics_provider_id: '',
        driver_name: '',
        mobile: '',
        license_number: '',
        license_expiry_date: '',
        aadhaar_number: '',
        emergency_contact: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.driver_name || !formData.mobile || !formData.license_number) {
      return showError('Driver Name, Mobile, and License are required');
    }
    setIsSubmitting(true);

    let res;
    if (formData.id) {
      res = await driverService.updateDriver(formData.id, formData);
    } else {
      res = await driverService.createDriver(formData);
    }

    if (res.success) {
      showSuccess(res.message);
      setIsModalOpen(false);
      loadData();
    } else {
      showError(res.message);
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await driverService.toggleStatus(id, { status: newStatus });
    if (res.success) {
      showSuccess(res.message);
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    } else {
      showError(res.message);
    }
  };

  const handleToggleAvailability = async (id: string, currentAvail: boolean) => {
    const newAvail = !currentAvail;
    const res = await driverService.toggleStatus(id, { is_available: newAvail });
    if (res.success) {
      showSuccess('Availability updated');
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, is_available: newAvail } : d));
    } else {
      showError(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    const res = await driverService.deleteDriver(id);
    if (res.success) {
      showSuccess(res.message);
      loadData();
    } else {
      showError(res.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1.5">
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fleet Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-dark-text-secondary tracking-tight">Drivers</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProviderFilter}
            onChange={(e) => setSelectedProviderFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-100 dark:border-dark-border-primary rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Providers</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.provider_name}</option>
            ))}
            <option value="null">Self (No Provider)</option>
          </select>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Driver
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-app-secondary rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/70 dark:bg-dark-surface-elevated border-b border-gray-100 dark:border-dark-border-primary text-xs uppercase text-gray-500 dark:text-dark-text-muted font-bold">
              <tr>
                <th className="px-6 py-4">Driver Details</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">License / ID</th>
                <th className="px-6 py-4">Availability</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border-primary">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">Loading drivers...</td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">No drivers found.</td>
                </tr>
              ) : (
                drivers.map(driver => (
                  <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-dark-text-secondary">{driver.driver_name}</p>
                      <p className="text-xs text-gray-500">{driver.mobile}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-dark-surface-card text-gray-700 dark:text-dark-text-secondary text-[10px] font-bold rounded-md">
                        {driver.provider_name || 'Self Managed'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs font-bold text-gray-800 dark:text-dark-text-secondary">{driver.license_number}</p>
                      <p className="text-[10px] text-gray-500">Exp: {driver.license_expiry_date ? new Date(driver.license_expiry_date).toLocaleDateString() : 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleAvailability(driver.id, driver.is_available)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-full transition-colors ${
                          driver.is_available ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                        }`}
                      >
                        {driver.is_available ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {driver.is_available ? 'Available' : 'On Trip'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(driver.id, driver.status)}
                        className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-full transition-colors ${
                          driver.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {driver.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenModal(driver)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(driver.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
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
          <div className="bg-white dark:bg-dark-app-secondary rounded-3xl dark:border dark:border-dark-border-secondary w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-secondary">
                {formData.id ? 'Edit Driver' : 'Add Driver'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.driver_name}
                    onChange={e => setFormData({ ...formData, driver_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary text-gray-900 dark:text-dark-text-secondary"
                    placeholder="John Doe"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile *</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary text-gray-900 dark:text-dark-text-secondary"
                    placeholder="10 digit number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Logistics Provider</label>
                  <select
                    value={formData.logistics_provider_id || ''}
                    onChange={e => setFormData({ ...formData, logistics_provider_id: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary text-gray-900 dark:text-dark-text-secondary"
                  >
                    <option value="">Self Managed</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.provider_name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact || ''}
                    onChange={e => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary text-gray-900 dark:text-dark-text-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">License Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.license_number}
                    onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary text-gray-900 dark:text-dark-text-secondary uppercase"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">License Expiry Date</label>
                  <input
                    type="date"
                    value={formData.license_expiry_date || ''}
                    onChange={e => setFormData({ ...formData, license_expiry_date: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary text-gray-900 dark:text-dark-text-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Aadhaar / ID Number</label>
                <input
                  type="text"
                  value={formData.aadhaar_number || ''}
                  onChange={e => setFormData({ ...formData, aadhaar_number: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-dark-surface-card border border-gray-200 dark:border-dark-border-secondary text-gray-900 dark:text-dark-text-secondary"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversPage;
