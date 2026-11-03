import React from 'react';

/**
 * Renders batch or single orders needing fulfillment with Pack button and status indicators.
 */
export default function OrderPackCard({ widget, messageId, actionLoading, onPackOrder, onPackAll, onSelectOrder }) {
  if (!widget?.orders || !Array.isArray(widget.orders)) return null;

  const allPacked = widget.orders.every((o) => o.status === 'PACKED' || o.status === 'PREPARING' || o.isPacked);
  const isPackingAll = actionLoading[`pack_all_${messageId}`];

  return (
    <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1.5">
      {widget.orders.map((o) => {
        const cleanId = (o.actionId || o.id).toString().replace(/^#/, '');
        const isPacking = actionLoading[`pack_${cleanId}`];
        const isPacked = o.status === 'PACKED' || o.status === 'PREPARING' || o.isPacked;

        return (
          <div
            key={o.id}
            className="p-2 bg-gray-50 hover:bg-gray-100/70 rounded-xl flex items-center justify-between gap-2 border border-gray-100 transition-colors"
          >
            <div
              onClick={() => onSelectOrder && onSelectOrder(o)}
              className="flex-1 cursor-pointer group/row min-w-0"
              title="Click to view order details, items breakdown & map"
            >
              <div className="font-bold text-gray-900 group-hover/row:text-indigo-600 transition-colors flex items-center gap-1.5 truncate">
                <span>{o.id} • {o.customer}</span>
                <i className="fa-solid fa-up-right-from-square text-[9px] text-gray-400 group-hover/row:text-indigo-500 opacity-60 group-hover/row:opacity-100 transition shrink-0"></i>
              </div>
              <div className="text-[10px] text-gray-500 truncate">₹{o.amount} • {o.items}</div>
            </div>
            {isPacked ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0">
                <i className="fa-solid fa-check"></i> Packed
              </span>
            ) : (
              <button
                onClick={() => onPackOrder(o, messageId)}
                disabled={isPacking || (!o.actionId && !o.id)}
                className={`px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs shrink-0 ${
                  isPacking ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <i className={`fa-solid ${isPacking ? 'fa-spinner fa-spin' : 'fa-box'}`}></i>
                {isPacking ? 'Packing...' : 'Pack Order'}
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={() => onPackAll(widget.orders, messageId)}
        disabled={allPacked || isPackingAll}
        className={`w-full mt-1.5 py-1.5 font-extrabold rounded-lg text-[11px] transition flex items-center justify-center gap-1.5 shadow-xs ${
          allPacked
            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            : isPackingAll
            ? 'bg-emerald-500 text-white cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
        }`}
      >
        <i
          className={`fa-solid ${
            isPackingAll ? 'fa-spinner fa-spin' : allPacked ? 'fa-circle-check' : 'fa-boxes-packing'
          }`}
        ></i>
        {isPackingAll ? 'Packing All Orders...' : allPacked ? 'All Orders Packed' : 'Pack All Pending Orders'}
      </button>
    </div>
  );
}
