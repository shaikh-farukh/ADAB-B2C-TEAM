import React from 'react';

/**
 * Renders batch or single orders needing fulfillment with Pack button and status indicators.
 */
export default function OrderPackCard({
  widget,
  messageId,
  actionLoading,
  onAcceptOrder,
  onAcceptAll,
  onPackOrder,
  onPackAll,
  onSelectOrder
}) {
  if (!widget?.orders || !Array.isArray(widget.orders)) return null;

  const allPacked = widget.orders.every(
    (o) => ['PACKED', 'PREPARING', 'DISPATCHED', 'DELIVERED'].includes((o.status || '').toUpperCase()) || o.isPacked
  );
  const isPackingAll = actionLoading[`pack_all_${messageId}`];
  const isAcceptingAll = actionLoading[`accept_all_${messageId}`];

  const newOrders = widget.orders.filter(
    (o) => ['NEW', 'PLACED'].includes((o.status || '').toUpperCase()) && !o.isPacked
  );
  const acceptedOrders = widget.orders.filter(
    (o) => ['ACCEPTED', 'PREPARING'].includes((o.status || '').toUpperCase()) && !o.isPacked
  );

  return (
    <div className="space-y-1.5">
      {widget.orders.map((o) => {
        const cleanId = (o.actionId || o.id).toString().replace(/^#/, '');
        const isPacking = actionLoading[`pack_${cleanId}`];
        const isAccepting = actionLoading[`accept_${cleanId}`];
        const st = (o.status || '').toUpperCase();
        const isDelivered = st === 'DELIVERED';
        const isDispatched = st === 'DISPATCHED' || st === 'SHIPPED';
        const isPacked = st === 'PACKED' || o.isPacked;
        const isNew = ['NEW', 'PLACED'].includes(st) && !isPacked;
        const isAccepted = ['ACCEPTED', 'PREPARING'].includes(st) && !isPacked;

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
            {isDelivered ? (
              <span className="px-2 py-0.5 bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0">
                <i className="fa-solid fa-check-double"></i> Delivered
              </span>
            ) : isDispatched ? (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0">
                <i className="fa-solid fa-truck"></i> Dispatched
              </span>
            ) : isPacked ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0">
                <i className="fa-solid fa-check"></i> Packed
              </span>
            ) : isNew ? (
              <button
                onClick={() => onAcceptOrder && onAcceptOrder(o, messageId)}
                disabled={isAccepting || (!o.actionId && !o.id)}
                className={`px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs shrink-0 ${
                  isAccepting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                title="Accept Order"
              >
                <i className={`fa-solid ${isAccepting ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {isAccepting ? 'Accepting...' : 'Accept Order'}
              </button>
            ) : (
              <button
                onClick={() => onPackOrder && onPackOrder(o, messageId)}
                disabled={isPacking || (!o.actionId && !o.id)}
                className={`px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs shrink-0 ${
                  isPacking ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                title="Pack Order"
              >
                <i className={`fa-solid ${isPacking ? 'fa-spinner fa-spin' : 'fa-box'}`}></i>
                {isPacking ? 'Packing...' : 'Pack Order'}
              </button>
            )}
          </div>
        );
      })}

      {newOrders.length > 0 ? (
        <button
          onClick={() => onAcceptAll && onAcceptAll(newOrders, messageId)}
          disabled={isAcceptingAll}
          className={`w-full mt-1.5 py-1.5 font-extrabold rounded-lg text-[11px] transition flex items-center justify-center gap-1.5 shadow-xs ${
            isAcceptingAll
              ? 'bg-emerald-500 text-white cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
          }`}
        >
          <i className={`fa-solid ${isAcceptingAll ? 'fa-spinner fa-spin' : 'fa-check-double'}`}></i>
          {isAcceptingAll ? 'Accepting All Orders...' : `Accept All New Orders (${newOrders.length})`}
        </button>
      ) : (
        <button
          onClick={() => onPackAll && onPackAll(acceptedOrders, messageId)}
          disabled={allPacked || isPackingAll || acceptedOrders.length === 0}
          className={`w-full mt-1.5 py-1.5 font-extrabold rounded-lg text-[11px] transition flex items-center justify-center gap-1.5 shadow-xs ${
            allPacked || acceptedOrders.length === 0
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : isPackingAll
              ? 'bg-indigo-500 text-white cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
          }`}
        >
          <i
            className={`fa-solid ${
              isPackingAll ? 'fa-spinner fa-spin' : allPacked ? 'fa-circle-check' : 'fa-boxes-packing'
            }`}
          ></i>
          {isPackingAll
            ? 'Packing All Orders...'
            : allPacked
            ? 'All Orders Packed'
            : `Pack All Accepted Orders (${acceptedOrders.length})`}
        </button>
      )}
    </div>
  );
}
