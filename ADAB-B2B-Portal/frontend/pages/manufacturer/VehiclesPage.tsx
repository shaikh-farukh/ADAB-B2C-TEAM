import React, { useEffect, useState } from 'react';
import { vehicleService, Vehicle } from '../../services/vehicleService';
import { logisticsService, LogisticsProvider } from '../../services/logisticsService';
import { driverService, Driver } from '../../services/driverService';
import { useNotification } from '../../context/NotificationContext';
import { Plus, Edit2, Trash2, Truck, X, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';

const VehiclesPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [providers, setProviders] = useState<LogisticsProvider[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [selectedAvailabilityFilter, setSelectedAvailabilityFilter] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Vehicle>>({
    logistics_provider_id: '',
    driver_id: '',
    vehicle_number: '',
    vehicle_type: '',
    capacity: '',
    insurance_expiry_date: '',
    permit_expiry_date: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    const [vehiclesRes, providersRes, driversRes] = await Promise.all([
      vehicleService.getVehicles(selectedProviderFilter, selectedDriverFilter, selectedAvailabilityFilter),
      logisticsService.getProviders(),
      driverService.getDrivers(selectedProviderFilter) // Only fetch drivers relevant to the provider filter
    ]);

    if (vehiclesRes.success) {
      setVehicles(vehiclesRes.data);
    } else {
      showError(vehiclesRes.message);
    }

    if (providersRes.success) {
      setProviders(providersRes.data);
    }

    if (driversRes.success) {
      setDrivers(driversRes.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedProviderFilter, selectedDriverFilter, selectedAvailabilityFilter]);

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setFormData({
        ...vehicle,
        insurance_expiry_date: vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date).toISOString().split('T')[0] : '',
        permit_expiry_date: vehicle.permit_expiry_date ? new Date(vehicle.permit_expiry_date).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        logistics_provider_id: '',
        driver_id: '',
        vehicle_number: '',
        vehicle_type: '',
        capacity: '',
        insurance_expiry_date: '',
        permit_expiry_date: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_number || !formData.vehicle_type) {
      return showError('Vehicle Number and Type are required');
    }
    setIsSubmitting(true);

    let res;
    if (formData.id) {
      res = await vehicleService.updateVehicle(formData.id, formData);
    } else {
      res = await vehicleService.createVehicle(formData);
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
    const res = await vehicleService.toggleStatus(id, { status: newStatus });
    if (res.success) {
      showSuccess(res.message);
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    } else {
      showError(res.message);
    }
  };

  const handleToggleAvailability = async (id: string, currentAvail: boolean) => {
    const newAvail = !currentAvail;
    const res = await vehicleService.toggleStatus(id, { is_available: newAvail });
    if (res.success) {
      showSuccess('Availability updated');
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, is_available: newAvail } : v));
    } else {
      showError(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    const res = await vehicleService.deleteVehicle(id);
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
            <Truck className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fleet Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-dark-text-secondary tracking-tight">Vehicles</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedProviderFilter}
            onChange={(e) => setSelectedProviderFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Providers</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.provider_name}</option>
            ))}
            <option value="null">Self (No Provider)</option>
          </select>

          <select
            value={selectedDriverFilter}
            onChange={(e) => setSelectedDriverFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Drivers</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.driver_name}</option>
            ))}
            <option value="null">Unassigned</option>
          </select>

          <select
            value={selectedAvailabilityFilter}
            onChange={(e) => setSelectedAvailabilityFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-secondary rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Availability</option>
            <option value="true">Available</option>
            <option value="false">On Trip</option>
          </select>

          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-app-secondary rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
              <tr>
                <th className="px-6 py-4">Vehicle Details</th>
                <th className="px-6 py-4">Assignment</th>
                <th className="px-6 py-4">Compliance</th>
                <th className="px-6 py-4">Availability</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">Loading vehicles...</td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">No vehicles found.</td>
                </tr>
              ) : (
                vehicles.map(vehicle => (
                  <tr key={vehicle.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-dark-text-secondary uppercase">{vehicle.vehicle_number}</p>
                      <p className="text-xs text-gray-500">{vehicle.vehicle_type} {vehicle.capacity ? `• ${vehicle.capacity}` : ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-md w-max">
                          {vehicle.provider_name || 'Self Managed'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold rounded-md w-max ${vehicle.driver_name ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                          {vehicle.driver_name ? `Driver: ${vehicle.driver_name}` : 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] text-gray-500">Ins: {vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-[10px] text-gray-500">Pmt: {vehicle.permit_expiry_date ? new Date(vehicle.permit_expiry_date).toLocaleDateString() : 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleAvailability(vehicle.id, vehicle.is_available)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-full transition-colors ${
                          vehicle.is_available ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                        }`}
                      >
                        {vehicle.is_available ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {vehicle.is_available ? 'Available' : 'On Trip'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(vehicle.id, vehicle.status)}
                        className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-full transition-colors ${
                          vehicle.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {vehicle.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenModal(vehicle)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(vehicle.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
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
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border-primary flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                {formData.id ? 'Edit Vehicle' : 'Add Vehicle'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_number}
                    onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none uppercase"
                    placeholder="MH 01 AB 1234"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Vehicle Type *</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_type}
                    onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="e.g. Mini Truck, Van, Bike"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Logistics Provider</label>
                  <select
                    value={formData.logistics_provider_id || ''}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        logistics_provider_id: e.target.value,
                        driver_id: '' // Reset driver when provider changes
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="">Self Managed</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.provider_name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Assign Driver</label>
                  <select
                    value={formData.driver_id || ''}
                    onChange={e => setFormData({ ...formData, driver_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    <option value="">Unassigned</option>
                    {drivers
                      .filter(d => !formData.logistics_provider_id || d.logistics_provider_id == formData.logistics_provider_id)
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.driver_name} ({d.mobile})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Capacity</label>
                  <input
                    type="text"
                    value={formData.capacity || ''}
                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                    placeholder="e.g. 1 Ton"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={formData.insurance_expiry_date || ''}
                    onChange={e => setFormData({ ...formData, insurance_expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-dark-text-secondary mb-1">Permit Expiry</label>
                  <input
                    type="date"
                    value={formData.permit_expiry_date || ''}
                    onChange={e => setFormData({ ...formData, permit_expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border-primary bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
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
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
