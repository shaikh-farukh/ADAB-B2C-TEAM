import React, { useState, useEffect, useMemo } from 'react';

/**
 * OrdersView Component (Day 4 Frontend Task 1)
 * Displays "My Orders" active cards (#sec-orders) and "Order History" (#sec-orderhistory)
 * with real live search, reorder, cancellation, and animated progress tracking matching
 * project arch/unified-customer-portal-demo.html
 */
export default function OrdersView({
  orders = [],
  onSelectOrder,
  onCancelOrder,
  onReorder,
  onBrowseShops,
  onViewChange,
  initialView = 'orders',
  loading = false,
  onRefresh = () => {},
  showToast = () => {},
  onReviewOrder
}) {
  const [currentView, setCurrentView] = useState(initialView); // 'orders' | 'orderhistory'
  const [searchQuery, setSearchQuery] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [reorderingOrderId, setReorderingOrderId] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);

  // Sync currentView when initialView prop changes
  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  const handleSwitchView = (view) => {
    setCurrentView(view);
    if (onViewChange) {
      onViewChange(view);
    }
  };

  // Group active orders vs completed/cancelled past orders directly from real backend orders
  const activeOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      const status = (o.order_status || '').toUpperCase();
      return status !== 'DELIVERED' && status !== 'CANCELLED' && status !== 'RETURNED';
    });
  }, [orders]);

  const pastOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      const status = (o.order_status || '').toUpperCase();
      return status === 'DELIVERED' || status === 'CANCELLED' || status === 'RETURNED';
    });
  }, [orders]);

  // Filter orders by live search input (#ohSearch)
  const filteredPastOrders = useMemo(() => {
    const listToFilter = searchQuery.trim() ? (orders || []) : pastOrders;
    if (!searchQuery.trim()) return pastOrders;
    const q = searchQuery.toLowerCase().trim();
    return (listToFilter || []).filter((o) => {
      const orderNum = (o.order_number || o.id || '').toLowerCase();
      const status = (o.order_status || '').toLowerCase();
      const storeName = (o.seller_orders?.[0]?.store_name || o.seller_orders?.[0]?.seller_name || '').toLowerCase();
      const itemsMatch = (o.items || []).some((it) =>
        (it.product_name || '').toLowerCase().includes(q)
      );
      return orderNum.includes(q) || status.includes(q) || storeName.includes(q) || itemsMatch;
    });
  }, [orders, pastOrders, searchQuery]);

  // Calculate track progress percentage
  const getProgressWidth = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED') return '100%';
    if (s === 'OUT_FOR_DELIVERY' || s === 'DISPATCHED' || s === 'SHIPPED') return '72%';
    if (s === 'PREPARING' || s === 'PACKED') return '45%';
    if (s === 'ACCEPTED' || s === 'CONFIRMED') return '25%';
    return '15%'; // PLACED
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'OUT_FOR_DELIVERY' || s === 'DISPATCHED') {
      return (
        <span className="text-[10px] font-bold bg-orange-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
          ON THE WAY
        </span>
      );
    }
    if (s === 'PREPARING' || s === 'PACKED') {
      return (
        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
          PACKING
        </span>
      );
    }
    if (s === 'DELIVERED') {
      return (
        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
          DELIVERED
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
          CANCELLED
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
        {s || 'PLACED'}
      </span>
    );
  };

  // Handle Cancel confirmation
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    try {
      setCancellingOrderId(cancelModalOrder.id);
      await onCancelOrder(cancelModalOrder.id);
      showToast(`✓ Order #${cancelModalOrder.order_number || cancelModalOrder.id.slice(0, 8)} cancelled`);
      setCancelModalOrder(null);
    } catch (err) {
      showToast(`⚠️ Cancellation failed: ${err.message}`);
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Handle Reorder action
  const handleReorderClick = async (order, e) => {
    e.stopPropagation();
    try {
      setReorderingOrderId(order.id);
      await onReorder(order.id);
      showToast(`🎉 Items re-added to your cart!`);
    } catch (err) {
      showToast(`⚠️ Reorder failed: ${err.message}`);
    } finally {
      setReorderingOrderId(null);
    }
  };

  const formatOrderDate = (dateStr) => {
    if (!dateStr) return 'Yesterday';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => handleSwitchView('orders')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer ${
            currentView === 'orders'
              ? 'bg-[#18753C] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>Active Orders</span>
          {activeOrders.length > 0 && (
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                currentView === 'orders' ? 'bg-white text-[#18753C]' : 'bg-green-100 text-[#18753C]'
              }`}
            >
              {activeOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSwitchView('orderhistory')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer ${
            currentView === 'orderhistory'
              ? 'bg-[#18753C] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>Order History</span>
          {pastOrders.length > 0 && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentView === 'orderhistory' ? 'bg-white text-[#18753C]' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {pastOrders.length}
            </span>
          )}
        </button>

        {/* Live Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto p-2 rounded-xl text-gray-500 hover:text-[#18753C] hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
          title="Refresh orders from live database"
          aria-label="Refresh orders"
        >
          <i className={`fa-solid fa-arrows-rotate text-sm ${loading ? 'animate-spin text-[#18753C]' : ''}`}></i>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse pt-2">
          <div className="h-32 bg-gray-100 rounded-2xl"></div>
          <div className="h-28 bg-gray-100 rounded-2xl"></div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. ACTIVE ORDERS VIEW (sec-orders)                             */}
      {/* ============================================================== */}
      {!loading && currentView === 'orders' && (
        <section id="sec-orders" className="pt-2 pb-4 space-y-3">
          {activeOrders.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center space-y-3">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-brand-green mx-auto text-2xl">
                <i className="fa-solid fa-bag-shopping"></i>
              </div>
              <h3 className="font-extrabold text-base text-gray-900">No Active Orders</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                You don't have any in-progress deliveries right now. You can browse nearby shops or check your past order history.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBrowseShops}
                  className="px-5 py-2.5 bg-[#18753C] text-white font-bold text-xs rounded-xl hover:bg-[#156030] transition cursor-pointer"
                >
                  Browse Products
                </button>
                {pastOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSwitchView('orderhistory')}
                    className="px-5 py-2.5 bg-gray-100 text-gray-800 font-bold text-xs rounded-xl hover:bg-gray-200 transition cursor-pointer"
                  >
                    View Past Orders ({pastOrders.length})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {activeOrders.map((order, idx) => {
                const storeName =
                  order.seller_orders?.[0]?.store_name ||
                  order.seller_orders?.[0]?.seller_name ||
                  'Shabbir Grocery Shop';
                const orderNum =
                  order.order_number ||
                  (order.id ? order.id.slice(0, 8).toUpperCase() : `ORD-${idx + 1000}`);
                const status = (order.order_status || 'PLACED').toUpperCase();
                const progressWidth = getProgressWidth(status);
                const etaMins = order.eta_minutes || 18;
                const canCancel =
                  status === 'PLACED' || status === 'CONFIRMED' || status === 'NEW' || status === 'PREPARING';

                // First active order rendered with high-contrast emerald card matching demo
                if (idx === 0) {
                  return (
                    <div
                      key={order.id || idx}
                      className="border border-green-200 bg-green-50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => onSelectOrder && onSelectOrder(order)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-extrabold text-base text-gray-900 tracking-tight">
                              {`#${orderNum}`}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {`${storeName} · ₹${parseFloat(order.grand_total || 0).toFixed(2)}`}
                            </div>
                          </div>
                          <div>{getStatusBadge(status)}</div>
                        </div>

                        {/* Animated progress track bar */}
                        <div className="order-track-bar mb-2">
                          <div
                            className="order-track-fill"
                            style={{ width: progressWidth }}
                          ></div>
                        </div>

                        {/* Live ETA and Rider */}
                        <div className="text-xs text-brand-green font-bold flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <i className="fa-solid fa-motorcycle text-sm"></i>
                            <span>{`Arriving in ${etaMins} min · Ramesh`}</span>
                          </div>
                          <span className="text-[11px] font-extrabold flex items-center gap-1 text-[#047857] hover:underline">
                            Track live <i className="fa-solid fa-arrow-right text-[10px]"></i>
                          </span>
                        </div>
                      </div>

                      {/* Cancel Order Action */}
                      {canCancel && (
                        <div className="mt-3 pt-3 border-t border-green-200/60 flex justify-between items-center text-xs">
                          <span className="text-gray-500 text-[11px]">
                            Need to change items or address?
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelModalOrder(order);
                            }}
                            className="text-red-600 hover:text-red-700 font-bold bg-white/80 hover:bg-white border border-red-200 px-3 py-1 rounded-lg transition-colors cursor-pointer text-[11px]"
                          >
                            Cancel order
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                // Subsequent active orders rendered matching packing/processing card
                return (
                  <div
                    key={order.id || idx}
                    className="border border-gray-100 bg-white rounded-2xl p-4 shadow-sm hover:border-gray-200 transition"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => onSelectOrder && onSelectOrder(order)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-extrabold text-sm text-gray-900">{`#${orderNum}`}</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {`${storeName} · ₹${parseFloat(order.grand_total || 0).toFixed(2)}`}
                          </div>
                        </div>
                        <div>{getStatusBadge(status)}</div>
                      </div>
                      <div className="order-track-bar mb-2">
                        <div
                          className="order-track-fill"
                          style={{ width: progressWidth }}
                        ></div>
                      </div>
                    </div>

                    {canCancel && (
                      <div className="mt-2 pt-2 border-t border-gray-50 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelModalOrder(order);
                          }}
                          className="text-red-600 hover:text-red-700 font-bold text-xs cursor-pointer"
                        >
                          Cancel order
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* View Past Orders Link matching demo */}
              <button
                type="button"
                onClick={() => handleSwitchView('orderhistory')}
                className="w-full text-center text-brand-green font-bold text-sm py-2 hover:underline cursor-pointer transition"
              >
                View past orders →
              </button>
            </>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* 2. ORDER HISTORY VIEW (sec-orderhistory)                       */}
      {/* ============================================================== */}
      {!loading && currentView === 'orderhistory' && (
        <section id="sec-orderhistory" className="pt-2 pb-4 space-y-3">
          {/* Live Search Input (#ohSearch) */}
          <div className="relative">
            <input
              type="search"
              id="ohSearch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-green bg-white shadow-xs transition"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Past Orders Rows */}
          {filteredPastOrders.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-2">
              <i className="fa-solid fa-receipt text-2xl text-gray-400"></i>
              <div className="font-bold text-sm text-gray-800">
                {searchQuery ? 'No orders match your search' : 'No past orders found'}
              </div>
              <p className="text-xs text-gray-500">
                {searchQuery
                  ? 'Try searching by order number, store name, or product title.'
                  : 'Delivered and completed orders will appear here.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-brand-green font-bold hover:underline mt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredPastOrders.map((order, idx) => {
              const orderNum =
                order.order_number ||
                (order.id ? order.id.slice(0, 8).toUpperCase() : `ORD-${idx + 9000}`);
              const status = (order.order_status || 'DELIVERED').toUpperCase();
              const storeName =
                order.seller_orders?.[0]?.store_name ||
                order.seller_orders?.[0]?.seller_name ||
                'Local Store';
              const isDelivered = status === 'DELIVERED';
              const isCancelled = status === 'CANCELLED';
              const canCancel =
                status === 'PLACED' || status === 'CONFIRMED' || status === 'NEW' || status === 'PREPARING';

              const dateStr = formatOrderDate(order.created_at);

              const itemsPreview =
                order.items && order.items.length > 0
                  ? order.items.map((it) => it.product_name).slice(0, 2).join(', ') +
                    (order.items.length > 2 ? ` +${order.items.length - 2} more` : '')
                  : 'Groceries';

              return (
                <div
                  key={order.id || idx}
                  className="oh-row border border-gray-100 bg-white rounded-xl p-4 flex justify-between items-center shadow-xs hover:border-gray-200 transition cursor-pointer"
                  data-status={status.toLowerCase()}
                  onClick={() => onSelectOrder && onSelectOrder(order)}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{`#${orderNum}`}</span>
                      {getStatusBadge(status)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {`${dateStr} · ₹${parseFloat(order.grand_total || 0).toFixed(2)} · ${storeName} (${itemsPreview})`}
                    </div>
                  </div>

                  {/* Reorder Button */}
                  {isDelivered && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={reorderingOrderId === order.id}
                        onClick={(e) => handleReorderClick(order, e)}
                        className="text-brand-green hover:bg-green-50 font-bold text-xs border border-brand-green px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {reorderingOrderId === order.id ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                            <span>Adding...</span>
                          </>
                        ) : (
                          <span>Reorder</span>
                        )}
                      </button>

                      {onReviewOrder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReviewOrder(order);
                          }}
                          className="text-amber-800 hover:bg-amber-50 font-bold text-xs border border-amber-300 bg-amber-50/50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Rate & Review this order"
                        >
                          <i className="fa-solid fa-star text-amber-500 text-[10px]"></i>
                          <span>Rate</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cancel Button */}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelModalOrder(order);
                      }}
                      className="text-red-600 hover:text-red-700 font-bold text-xs border border-red-200 hover:bg-red-50 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Cancel order
                    </button>
                  )}

                  {isCancelled && (
                    <span className="text-xs text-gray-400 font-semibold italic">
                      Returned / Cancelled
                    </span>
                  )}
                </div>
              );
            })
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* CANCEL ORDER CONFIRMATION MODAL                                */}
      {/* ============================================================== */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleIn">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div className="text-center">
              <h3 className="font-black text-base text-gray-900">Cancel This Order?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to cancel order #{cancelModalOrder.order_number || cancelModalOrder.id.slice(0, 8)}? Items and amounts will be updated automatically.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={cancellingOrderId === cancelModalOrder.id}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {cancellingOrderId === cancelModalOrder.id ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
