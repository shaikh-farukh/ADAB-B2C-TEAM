import React from 'react';

/**
 * Success pill displaying confirmation of an updated order status.
 */
export default function OrderStatusUpdatedCard({ widget }) {
  if (!widget) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">
        <i className="fa-solid fa-check"></i>
      </div>
      <div>
        <div className="text-[11px] text-emerald-950 font-bold">
          Order #{widget.orderNumber} Updated!
        </div>
        <div className="text-[10px] text-emerald-700">
          Status transitioned to <span className="font-extrabold uppercase">{widget.newStatus}</span>
        </div>
      </div>
    </div>
  );
}
