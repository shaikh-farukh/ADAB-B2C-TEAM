import React from 'react';

/**
 * Interactive card displaying store open/closed status, hours, delivery radius,
 * and direct one-tap toggles for Store Status & Voice Soundbox.
 */
export default function StoreStatusCard({ widget, messageId, actionLoading, onToggleStore, onToggleSoundbox }) {
  if (!widget) return null;

  const isTogglingStore = actionLoading[`store_toggle_${messageId}`];

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-2">
      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-extrabold text-gray-900 text-xs">{widget.storeName}</div>
            <div className="text-[10px] text-gray-500">
              {widget.businessHours} • {widget.deliveryRadiusKm} km radius
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              widget.isOpen
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            {widget.isOpen ? '● Open' : '○ Closed'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-2.5">
          <button
            onClick={() => onToggleStore(widget.isOpen, messageId)}
            disabled={isTogglingStore}
            className={`py-1 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              widget.isOpen
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            } ${isTogglingStore ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <i
              className={`fa-solid ${
                isTogglingStore ? 'fa-spinner fa-spin' : widget.isOpen ? 'fa-door-closed' : 'fa-door-open'
              }`}
            ></i>
            {isTogglingStore ? 'Updating...' : widget.isOpen ? 'Close Store' : 'Open Store'}
          </button>
          <button
            onClick={() => onToggleSoundbox(widget.soundboxEnabled, messageId)}
            className={`py-1 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              widget.soundboxEnabled
                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <i
              className={`fa-solid ${widget.soundboxEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}
            ></i>
            {widget.soundboxEnabled ? 'Soundbox ON' : 'Muted'}
          </button>
        </div>
      </div>
    </div>
  );
}
