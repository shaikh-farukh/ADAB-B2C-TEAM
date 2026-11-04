import React, { useState, useMemo } from 'react';

const STATUS_PRIORITY = {
  NEW: 1,
  PLACED: 1,
  ACCEPTED: 2,
  PREPARING: 2,
  PACKED: 3,
  DISPATCHED: 4,
  SHIPPED: 4,
  DELIVERED: 5,
  CANCELLED: 6,
  RETURNED: 6
};

/**
 * Renders a full, categorized and sorted card list of store customer orders
 * with one-click inspection popups and quick packing actions.
 */
export default function OrderListCard({
  widget,
  messageId,
  actionLoading,
  onAcceptOrder,
  onAcceptAll,
  onPackOrder,
  onPackAll,
  onSelectOrder
}) {
  const [filter, setFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setVisibleCount(10);
  };

  if (!widget?.orders || !Array.isArray(widget.orders) || widget.orders.length === 0) {
    return null;
  }

  // Count by status category
  const counts = useMemo(() => {
    let pending = 0;
    let packed = 0;
    let delivered = 0;
    let cancelled = 0;

    for (const o of widget.orders) {
      const st = (o.status || '').toUpperCase();
      if (['NEW', 'PLACED', 'ACCEPTED', 'PREPARING'].includes(st) && !o.isPacked) {
        pending++;
      } else if (st === 'PACKED' || o.isPacked) {
        packed++;
      } else if (st === 'DELIVERED') {
        delivered++;
      } else if (st === 'CANCELLED' || st === 'RETURNED') {
        cancelled++;
      }
    }

    return {
      ALL: widget.orders.length,
      PENDING: pending,
      PACKED: packed,
      DELIVERED: delivered,
      CANCELLED: cancelled
    };
  }, [widget.orders]);

  // Sort orders: Actionable pending orders first -> packed -> delivered -> cancelled, then by newest
  const sortedOrders = useMemo(() => {
    const list = [...widget.orders].sort((a, b) => {
      const stA = (a.status || '').toUpperCase();
      const stB = (b.status || '').toUpperCase();
      const pA = a.isPacked ? 3 : (STATUS_PRIORITY[stA] || 99);
      const pB = b.isPacked ? 3 : (STATUS_PRIORITY[stB] || 99);

      if (pA !== pB) return pA - pB;

      // Secondary: newest created_at date first
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;

      return (b.id || '').toString().localeCompare((a.id || '').toString());
    });

    if (filter === 'PENDING') {
      return list.filter(
        (o) => ['NEW', 'PLACED', 'ACCEPTED', 'PREPARING'].includes((o.status || '').toUpperCase()) && !o.isPacked
      );
    }
    if (filter === 'DELIVERED') {
      return list.filter((o) => (o.status || '').toUpperCase() === 'DELIVERED');
    }
    if (filter === 'CANCELLED') {
      return list.filter((o) => ['CANCELLED', 'RETURNED'].includes((o.status || '').toUpperCase()));
    }
    return list;
  }, [widget.orders, filter]);

  const displayedOrders = useMemo(() => {
    return sortedOrders.slice(0, visibleCount);
  }, [sortedOrders, visibleCount]);

  const hasMore = visibleCount < sortedOrders.length;
  const remainingCount = Math.min(10, sortedOrders.length - visibleCount);

  const pendingOrders = useMemo(() => {
    return widget.orders.filter(
      (o) => ['NEW', 'PLACED', 'ACCEPTED', 'PREPARING'].includes((o.status || '').toUpperCase()) && !o.isPacked
    );
  }, [widget.orders]);

  const newOrders = useMemo(() => {
    return widget.orders.filter(
      (o) => ['NEW', 'PLACED'].includes((o.status || '').toUpperCase()) && !o.isPacked
    );
  }, [widget.orders]);

  const acceptedOrders = useMemo(() => {
    return widget.orders.filter(
      (o) => ['ACCEPTED', 'PREPARING'].includes((o.status || '').toUpperCase()) && !o.isPacked
    );
  }, [widget.orders]);

  const isPackingAll = actionLoading[`pack_all_${messageId}`];
  const isAcceptingAll = actionLoading[`accept_all_${messageId}`];

  return (
    <div className="space-y-2">
      {/* Header with Title and Filter Tabs */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
          <i className="fa-solid fa-boxes-stacked text-indigo-600"></i>
          <span>
            Store Orders ({hasMore ? `${displayedOrders.length} of ${sortedOrders.length}` : sortedOrders.length})
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => handleFilterChange('ALL')}
            className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
              filter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({counts.ALL})
          </button>
          {counts.PENDING > 0 && (
            <button
              type="button"
              onClick={() => handleFilterChange('PENDING')}
              className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                filter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Pending ({counts.PENDING})
            </button>
          )}
          {counts.DELIVERED > 0 && (
            <button
              type="button"
              onClick={() => handleFilterChange('DELIVERED')}
              className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                filter === 'DELIVERED'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              Delivered ({counts.DELIVERED})
            </button>
          )}
          {counts.CANCELLED > 0 && (
            <button
              type="button"
              onClick={() => handleFilterChange('CANCELLED')}
              className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                filter === 'CANCELLED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Cancelled ({counts.CANCELLED})
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
            No orders match the selected filter.
          </div>
        ) : (
          displayedOrders.map((o) => {
            const cleanId = (o.actionId || o.id).toString().replace(/^#/, '');
            const isPacking = actionLoading[`pack_${cleanId}`];
            const isAccepting = actionLoading[`accept_${cleanId}`];
            const st = (o.status || '').toUpperCase();
            const isDelivered = st === 'DELIVERED';
            const isDispatched = st === 'DISPATCHED' || st === 'SHIPPED';
            const isCancelled = st === 'CANCELLED' || st === 'RETURNED';
            const isPacked = st === 'PACKED' || o.isPacked;
            const isNew = ['NEW', 'PLACED'].includes(st) && !isPacked;
            const isAccepted = ['ACCEPTED', 'PREPARING'].includes(st) && !isPacked;

            return (
              <div
                key={o.id}
                className="p-2 bg-gray-50 hover:bg-gray-100/80 rounded-xl flex items-center justify-between gap-2 border border-gray-100 transition-colors shadow-2xs"
              >
                {/* Left: Clickable details block */}
                <div
                  onClick={() => onSelectOrder && onSelectOrder(o)}
                  className="flex-1 cursor-pointer group/row min-w-0"
                  title="Click to view full order details & delivery map"
                >
                  <div className="font-bold text-gray-900 group-hover/row:text-indigo-600 transition-colors flex items-center gap-1.5 truncate text-xs">
                    <span>{o.id} • {o.customer}</span>
                    <i className="fa-solid fa-up-right-from-square text-[9px] text-gray-400 group-hover/row:text-indigo-500 opacity-60 group-hover/row:opacity-100 transition shrink-0"></i>
                  </div>
                  <div className="text-[10px] text-gray-500 truncate flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-gray-800">₹{o.amount}</span>
                    <span>•</span>
                    <span className="truncate">{o.items}</span>
                  </div>
                </div>

                {/* Right: Status badge & Action */}
                <div className="shrink-0 flex items-center gap-1.5">
                  {isDelivered && (
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                      <i className="fa-solid fa-check-double text-[9px]"></i> Delivered
                    </span>
                  )}

                  {isDispatched && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                      <i className="fa-solid fa-truck text-[9px]"></i> Dispatched
                    </span>
                  )}

                  {isCancelled && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                      <i className="fa-solid fa-ban text-[9px]"></i> Cancelled
                    </span>
                  )}

                  {isPacked && !isDelivered && !isDispatched && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                      <i className="fa-solid fa-check text-[9px]"></i> Packed
                    </span>
                  )}

                  {isNew && (
                    <button
                      type="button"
                      onClick={() => onAcceptOrder && onAcceptOrder(o, messageId)}
                      disabled={isAccepting || (!o.actionId && !o.id)}
                      className={`px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs ${
                        isAccepting ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                      title="Accept Order"
                    >
                      <i className={`fa-solid ${isAccepting ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                      {isAccepting ? 'Accepting...' : 'Accept'}
                    </button>
                  )}

                  {isAccepted && (
                    <button
                      type="button"
                      onClick={() => onPackOrder && onPackOrder(o, messageId)}
                      disabled={isPacking || (!o.actionId && !o.id)}
                      className={`px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs ${
                        isPacking ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                      title="Mark as Packed"
                    >
                      <i className={`fa-solid ${isPacking ? 'fa-spinner fa-spin' : 'fa-box'}`}></i>
                      {isPacking ? 'Packing...' : 'Pack'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show Next 10 Orders button */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((prev) => prev + 10)}
          className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 hover:text-indigo-900 font-bold rounded-xl text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-200/80 shadow-2xs mt-1"
        >
          <i className="fa-solid fa-chevron-down text-[10px]"></i>
          <span>Show Next {remainingCount} Orders ({sortedOrders.length - visibleCount} remaining)</span>
        </button>
      )}

      {/* Batch Actions: Accept new orders first; once all accepted, allow packing */}
      {newOrders.length > 0 ? (
        <button
          type="button"
          onClick={() => onAcceptAll && onAcceptAll(newOrders, messageId)}
          disabled={isAcceptingAll}
          className={`w-full mt-1.5 py-1.5 font-extrabold rounded-lg text-[11px] transition flex items-center justify-center gap-1.5 shadow-xs ${
            isAcceptingAll
              ? 'bg-emerald-500 text-white cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
          }`}
        >
          <i className={`fa-solid ${isAcceptingAll ? 'fa-spinner fa-spin' : 'fa-check-double'}`}></i>
          {isAcceptingAll
            ? 'Accepting All Incoming Orders...'
            : `Accept All New Orders (${newOrders.length})`}
        </button>
      ) : acceptedOrders.length > 0 ? (
        <button
          type="button"
          onClick={() => onPackAll && onPackAll(acceptedOrders, messageId)}
          disabled={isPackingAll}
          className={`w-full mt-1.5 py-1.5 font-extrabold rounded-lg text-[11px] transition flex items-center justify-center gap-1.5 shadow-xs ${
            isPackingAll
              ? 'bg-indigo-500 text-white cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
          }`}
        >
          <i className={`fa-solid ${isPackingAll ? 'fa-spinner fa-spin' : 'fa-boxes-packing'}`}></i>
          {isPackingAll
            ? 'Packing All Pending Orders...'
            : `Pack All Pending Orders (${acceptedOrders.length})`}
        </button>
      ) : null}
    </div>
  );
}
