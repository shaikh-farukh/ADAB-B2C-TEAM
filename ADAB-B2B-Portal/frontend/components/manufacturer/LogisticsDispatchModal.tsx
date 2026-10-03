import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  UserCheck,
  Navigation,
  Printer,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Package,
  MapPin,
  QrCode,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { logisticsService, LogisticsProvider } from '../../services/logisticsService';
import { driverService, Driver } from '../../services/driverService';
import { vehicleService, Vehicle } from '../../services/vehicleService';
import { vehicleRouteService, VehicleRoute } from '../../services/vehicleRouteService';
import orderService from '../../services/orderService';
import { useNotification } from '../../context/NotificationContext';

interface LogisticsDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess?: () => void;
}

const DEFAULT_3PL_PARTNERS = [
  { id: '101', provider_name: 'Delhivery Express', contact_person: 'Delhivery Support', mobile: '+9118001036354', type: '3PL Partner' },
  { id: '102', provider_name: 'BlueDart Express', contact_person: 'BlueDart Desk', mobile: '+9118602331234', type: '3PL Partner' },
  { id: '103', provider_name: 'Self-Fleet Logistics', contact_person: 'Internal Transport Mgr', mobile: '+919876543210', type: 'Internal Fleet' }
];

export const LogisticsDispatchModal: React.FC<LogisticsDispatchModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess
}) => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState<'dispatch' | 'label'>('dispatch');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('Delhivery Express');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [routes, setRoutes] = useState<VehicleRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>(
    `TRK-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [dispatchDate, setDispatchDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [dispatchedData, setDispatchedData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLogisticsData();
    }
  }, [isOpen]);

  const fetchLogisticsData = async () => {
    setIsLoadingData(true);
    try {
      const [provRes, drvRes, vehRes, rotRes] = await Promise.all([
        logisticsService.getProviders(),
        driverService.getDrivers(),
        vehicleService.getVehicles(),
        vehicleRouteService.getRoutes()
      ]);

      if (provRes.success && provRes.data && provRes.data.length > 0) {
        setProviders(provRes.data);
      } else {
        setProviders(DEFAULT_3PL_PARTNERS);
      }

      if (drvRes.success && drvRes.data) {
        setDrivers(drvRes.data.filter((d: Driver) => d.status === 'active'));
      }

      if (vehRes.success && vehRes.data) {
        setVehicles(vehRes.data.filter((v: Vehicle) => v.status === 'active'));
      }

      if (rotRes.success && rotRes.data) {
        setRoutes(rotRes.data.filter((r: VehicleRoute) => r.status !== 'deleted'));
      }
    } catch (err) {
      console.error('Error fetching logistics dispatch data:', err);
      setProviders(DEFAULT_3PL_PARTNERS);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (!isOpen) return null;

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.id) {
      showError('Order ID missing');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        transporter_name: selectedProvider,
        vehicle_number: vehicleNumber || (vehicles.find(v => String(v.id) === selectedVehicleId)?.vehicle_number) || 'MH-04-AB-1234',
        tracking_number: trackingNumber,
        dispatch_date: dispatchDate,
        notes: dispatchNotes || 'Dispatched via B2B Logistics Dispatch Portal',
        driver_id: selectedDriverId ? parseInt(selectedDriverId) : undefined,
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId) : undefined
      };

      const res = await orderService.dispatchOrder(order.id, payload);

      if (res.success) {
        // Link vehicle to route if selected
        if (selectedVehicleId && selectedRouteId) {
          await vehicleRouteService.assignVehicleToRoute({
            vehicle_id: parseInt(selectedVehicleId),
            route_id: parseInt(selectedRouteId),
            order_id: order.id,
            driver_id: selectedDriverId ? parseInt(selectedDriverId) : undefined
          });
        }

        showSuccess('Order shipment dispatched successfully!');
        setDispatchedData({
          ...order,
          ...payload,
          provider: selectedProvider
        });
        setActiveTab('label');
        if (onSuccess) onSuccess();
      } else {
        showError(res.message || 'Failed to dispatch shipment');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Dispatch action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Logistics Dispatch & Vehicle Assignment</h2>
              <p className="text-xs text-zinc-400">Order #{order?.order_number || order?.id || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-800 p-1 rounded-lg border border-zinc-700">
              <button
                type="button"
                onClick={() => setActiveTab('dispatch')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'dispatch' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Dispatch Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('label')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'label' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Shipping Label
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-zinc-200">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-zinc-400 font-medium">Loading 3PL providers, fleet drivers & routes...</p>
            </div>
          ) : activeTab === 'dispatch' ? (
            <form onSubmit={handleDispatch} className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  1. Select Logistics Provider (3PL Partner)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {providers.map((prov) => {
                    const name = prov.provider_name || prov.name;
                    const isSelected = selectedProvider === name;
                    return (
                      <button
                        type="button"
                        key={prov.id || name}
                        onClick={() => setSelectedProvider(name)}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                            : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm">{name}</span>
                          {isSelected && <ShieldCheck className="w-4 h-4 text-blue-400" />}
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          {prov.contact_person || 'Verified Logistics'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Driver & Vehicle Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    2. Assign Driver (Optional)
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Assigned Driver</option>
                    {drivers.map((drv) => (
                      <option key={drv.id} value={drv.id}>
                        {drv.driver_name} ({drv.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    3. Assign Vehicle / Fleet
                  </label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      setSelectedVehicleId(e.target.value);
                      const veh = vehicles.find((v) => String(v.id) === e.target.value);
                      if (veh) setVehicleNumber(veh.vehicle_number);
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((veh) => (
                      <option key={veh.id} value={veh.id}>
                        {veh.vehicle_number} - {veh.vehicle_type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Route & Tracking Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    4. Assigned Vehicle Route
                  </label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Pre-defined Route</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.route_name} ({r.source_location || 'North Hub'} → {r.destination_location || 'Destination'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    5. Tracking Number / AWB
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    6. Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Vehicle Number Manual Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Vehicle / Container Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-04-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Dispatch Notes & Handling Instructions
                </label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Handle with care, Temperature sensitive consignment..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching Shipment...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Confirm & Dispatch PO Shipment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Printable Shipping Label View */
            <div className="space-y-6">
              <div
                id="shipping-label-print-area"
                className="bg-white text-black p-6 rounded-2xl border-2 border-black font-sans space-y-6 max-w-xl mx-auto shadow-xl"
              >
                {/* Shipping Label Top Banner */}
                <div className="flex items-center justify-between border-b-4 border-black pb-4">
                  <div>
                    <h1 className="text-2xl font-extrabold uppercase tracking-tight">ADAB B2B LOGISTICS</h1>
                    <p className="text-xs font-semibold text-gray-700">EXPRESS FREIGHT & PO SHIPMENT</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-black text-white text-xs font-extrabold rounded">
                      {selectedProvider.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Tracking & AWB Barcode Simulation */}
                <div className="bg-gray-100 p-4 rounded-xl border border-gray-300 text-center space-y-2">
                  <div className="font-mono text-xl font-extrabold tracking-widest">{trackingNumber}</div>
                  <div className="flex justify-center items-center gap-1 opacity-80">
                    <QrCode className="w-12 h-12 text-black" />
                  </div>
                  <p className="text-[10px] text-gray-500 tracking-wider">TRACKING BARCODE / SOCKET REAL-TIME ENABLED</p>
                </div>

                {/* Addresses Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs border-b-2 border-black pb-4">
                  <div>
                    <span className="font-extrabold uppercase text-gray-500 text-[10px]">SHIP FROM (MANUFACTURER)</span>
                    <p className="font-bold text-sm mt-1">{order?.distributor_company_name || 'ADAB Manufacturer Hub'}</p>
                    <p className="text-gray-600">Central Warehouse - North Hub</p>
                    <p className="text-gray-600">Contact: {order?.distributor_mobile || '+91-9876543210'}</p>
                  </div>
                  <div>
                    <span className="font-extrabold uppercase text-gray-500 text-[10px]">SHIP TO (DESTINATION)</span>
                    <p className="font-bold text-sm mt-1">{order?.distributor_name || 'Registered Distributor'}</p>
                    <p className="text-gray-600">{order?.shipping_address || '123 Commerce St, Sector 4'}</p>
                  </div>
                </div>

                {/* Consignment Details */}
                <div className="grid grid-cols-3 gap-2 text-[11px] bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div>
                    <span className="text-gray-500 font-semibold">ORDER NO:</span>
                    <p className="font-bold">{order?.order_number || order?.id || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold">VEHICLE:</span>
                    <p className="font-bold">{vehicleNumber || 'MH-04-AB-1234'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold">DISPATCH DATE:</span>
                    <p className="font-bold">{dispatchDate}</p>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 text-center border-t border-gray-300 pt-3">
                  This shipment is tracked via ADAB B2B Socket.io Real-Time GPS Engine.
                </div>
              </div>

              {/* Label Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('dispatch')}
                  className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold"
                >
                  ← Back to Details
                </button>
                <button
                  type="button"
                  onClick={handlePrintLabel}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Shipping Label</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticsDispatchModal;
