import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

export const SocketStatusBadge: React.FC = () => {
  const { isConnected, isConnecting } = useSocket();

  if (isConnected) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full shadow-xs"
        title="Real-time Socket.io server connected"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <Wifi className="w-3 h-3 text-green-600" />
        <span className="hidden sm:inline">Connected</span>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full shadow-xs"
        title="Attempting to re-establish real-time connection..."
      >
        <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
        <span className="hidden sm:inline">Reconnecting</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full shadow-xs"
      title="Real-time socket offline"
    >
      <span className="h-2 w-2 rounded-full bg-red-500"></span>
      <WifiOff className="w-3 h-3 text-red-600" />
      <span className="hidden sm:inline">Offline</span>
    </div>
  );
};

export default SocketStatusBadge;
