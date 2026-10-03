import React, { useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { Truck, Navigation, Activity, Wifi, WifiOff, Clock, ShieldCheck } from 'lucide-react';

export interface LocationPayload {
  orderId: string | number;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  driverId?: string | number | null;
}

interface LiveShipmentTrackerProps {
  orderId: string | number;
  initialLocation?: LocationPayload | null;
}

export const LiveShipmentTracker: React.FC<LiveShipmentTrackerProps> = ({ orderId, initialLocation = null }) => {
  const [location, setLocation] = useState<LocationPayload | null>(initialLocation);
  const [history, setHistory] = useState<LocationPayload[]>([]);

  const { isConnected, isConnecting } = useSocket({
    event: 'LOCATION_MOVED',
    handler: (data: LocationPayload) => {
      if (String(data.orderId) === String(orderId)) {
        setLocation(data);
        setHistory((prev) => [data, ...prev].slice(0, 5));
      }
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 font-sans">
      {/* Header / Status Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-50 text-adab-green rounded-lg border border-green-100">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Live Shipment Tracker</h3>
            <p className="text-xs text-gray-500">Shipment / Order #{orderId}</p>
          </div>
        </div>

        {/* Real-time Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Wifi className="w-3.5 h-3.5 animate-pulse" /> Live Tracking
            </span>
          ) : isConnecting ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3.5 h-3.5 animate-spin" /> Connecting...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              <WifiOff className="w-3.5 h-3.5" /> Offline Mode
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!location ? (
        <div className="py-10 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
          <Navigation className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-bounce" />
          <p className="text-sm font-medium text-gray-700">Awaiting initial location broadcast...</p>
          <p className="text-xs text-gray-400 mt-1">Updates will display automatically when the driver moves.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                <Navigation className="w-3.5 h-3.5 text-blue-500" /> Latitude
              </div>
              <p className="text-lg font-bold text-gray-900">{location.latitude.toFixed(6)}° N</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                <Navigation className="w-3.5 h-3.5 text-blue-500" /> Longitude
              </div>
              <p className="text-lg font-bold text-gray-900">{location.longitude.toFixed(6)}° E</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                <Activity className="w-3.5 h-3.5 text-emerald-500" /> Speed
              </div>
              <p className="text-lg font-bold text-gray-900">{location.speed} km/h</p>
            </div>
          </div>

          {/* Delivery Progress Bar */}
          <div className="p-4 bg-emerald-50/40 rounded-lg border border-emerald-100">
            <div className="flex justify-between items-center text-xs font-semibold text-emerald-900 mb-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Delivery Progress
              </span>
              <span>In Transit</span>
            </div>
            <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-600 h-2 rounded-full w-2/3 transition-all duration-500"></div>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 mt-2">
              <span>Dispatched</span>
              <span>Last ping: {new Date(location.timestamp).toLocaleTimeString()}</span>
              <span>Destination</span>
            </div>
          </div>

          {/* Recent Location Pings List */}
          {history.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent Location Pings</h4>
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-gray-600">
                      Lat: <strong className="text-gray-800">{item.latitude.toFixed(4)}</strong>, Long: <strong className="text-gray-800">{item.longitude.toFixed(4)}</strong>
                    </span>
                    <span className="text-gray-500 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveShipmentTracker;
