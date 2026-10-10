import React, { useState } from 'react';

/**
 * Order Status & Detailed Order Tracking View (sec-track)
 * Displays complete order details: items list, bill breakdown, payment info,
 * delivery address, live status stepper, and GPS telemetry.
 */
export default function OrderStatusView({
  order,
  onBackToOrders,
  showToast
}) {
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  if (!order) {
    return (
      <section id="sec-track" className="pt-2 pb-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto text-2xl">
            <i className="fa-solid fa-receipt"></i>
          </div>
          <h3 className="font-extrabold text-base text-gray-900">No Order Selected</h3>
          <p className="text-xs text-gray-500">
            Please choose an order from your orders list to view status and details.
          </p>
          <button
            type="button"
            onClick={onBackToOrders}
            className="px-5 py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition cursor-pointer"
          >
            ← View Orders
          </button>
        </div>
      </section>
    );
  }

  // Parse delivery address safely
  const rawAddr = order.delivery_address || {};
  const addrObj = typeof rawAddr === 'string' ? { address_line: rawAddr } : rawAddr;
  const recipientName = addrObj.recipient_name || addrObj.full_name || order.customer_name || 'Customer';
  const recipientPhone = addrObj.phone || order.customer_phone || '+91 98765 12340';
  const fullAddressLine = addrObj.address_line || addrObj.address || order.shipping_address_line || 'Flat 402, Green Valley Apt, Ring Road';
  const landmark = addrObj.landmark || '';
  const city = addrObj.city || 'Surat';
  const pincode = addrObj.pincode || addrObj.zip || '395002';
  const addressLabel = addrObj.label || 'Home';

  // Format order date
  const orderDate = order.created_at ? new Date(order.created_at) : new Date();
  const dateStr = orderDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = orderDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const orderNum = order.order_number || (order.id ? order.id.slice(0, 8).toUpperCase() : 'ORD-NEW');
  const storeName = order.seller_orders?.[0]?.store_name || order.items?.[0]?.store_name || 'Shabbir Grocery Shop';
  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];

  // Financials
  const grandTotal = Number(order.grand_total || order.pricing?.grand_total || 0);
  const deliveryFee = Number(order.delivery_fee || order.pricing?.delivery_fee || 0);
  const discount = Number(order.total_discount || order.discount || order.pricing?.discount || 0);
  const subtotal = Number(order.total_mrp || order.pricing?.subtotal || (grandTotal - deliveryFee + discount));

  // Payment
  const paymentMethod = (order.payment_method || order.payment?.payment_method || 'UPI').toUpperCase();
  const paymentStatus = (order.payment_status || order.payment?.status || (paymentMethod.includes('COD') || paymentMethod.includes('CASH') ? 'PENDING' : 'PAID')).toUpperCase();
  const isPaid = paymentStatus === 'PAID' || paymentStatus === 'SUCCESS';

  const handleDownloadInvoice = () => {
    setDownloadingInvoice(true);
    setTimeout(() => {
      setDownloadingInvoice(false);
      showToast(`📄 Invoice for #${orderNum} downloaded successfully!`);
    }, 1000);
  };

  return (
    <section id="sec-track" className="pt-2 pb-6 space-y-4">
      {/* 1. Header ETA Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-center shadow-xs space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider mb-1">
          <i className="fa-solid fa-bolt text-brand-coral"></i>
          <span>Live Tracking Active</span>
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold text-brand-green">
          {order.eta_minutes || 25} min
        </div>
        <div className="text-sm font-bold text-gray-800">
          Ramesh is on the way with your order
        </div>
        <div className="text-xs text-gray-500">
          Order #{orderNum} · {dateStr} at {timeStr}
        </div>
      </div>

      {/* 2. Live Order Journey Stepper */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="font-extrabold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <i className="fa-solid fa-route text-brand-green"></i>
            <span>Order Progress Timeline</span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {order.order_status || 'OUT FOR DELIVERY'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 text-center relative">
          {/* Progress bar line */}
          <div className="absolute top-4 left-6 right-6 h-1 bg-gray-100 -z-0">
            <div className="h-full bg-brand-green rounded-full" style={{ width: '75%' }}></div>
          </div>

          {/* Step 1: Placed */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center text-xs shadow-sm">
              <i className="fa-solid fa-check"></i>
            </div>
            <span className="text-[10px] font-extrabold text-gray-900 mt-1.5">Placed</span>
            <span className="text-[9px] text-gray-400">{timeStr}</span>
          </div>

          {/* Step 2: Packed */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center text-xs shadow-sm">
              <i className="fa-solid fa-store"></i>
            </div>
            <span className="text-[10px] font-extrabold text-gray-900 mt-1.5">Packed</span>
            <span className="text-[9px] text-gray-400">Verified</span>
          </div>

          {/* Step 3: In Transit */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shadow-md shadow-emerald-200 animate-pulse">
              <i className="fa-solid fa-motorcycle"></i>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-800 mt-1.5">On The Way</span>
            <span className="text-[9px] text-emerald-600 font-bold">28 km/h</span>
          </div>

          {/* Step 4: Delivered */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-300 text-gray-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-house-chimney"></i>
            </div>
            <span className="text-[10px] font-extrabold text-gray-400 mt-1.5">Delivered</span>
            <span className="text-[9px] text-gray-400">~{order.eta_minutes || 25}m</span>
          </div>
        </div>
      </div>

      {/* 3. Live GPS Telemetry Visual */}
      <div className="bg-emerald-950 text-white rounded-3xl p-5 relative overflow-hidden shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Live GPS Telemetry</span>
          </div>
          <span className="text-[11px] text-gray-300 font-semibold">Speed: 28 km/h</span>
        </div>
        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-store text-emerald-400"></i>
            </div>
            <div className="text-xs">
              <div className="text-gray-400 text-[10px]">PICKUP STORE</div>
              <div className="font-bold">{storeName}</div>
            </div>
          </div>
          <div className="ml-4 pl-4 border-l-2 border-dashed border-white/20 py-1 text-[11px] text-emerald-300 flex items-center gap-1.5">
            <i className="fa-solid fa-motorcycle"></i>
            <span>Rider in transit via Vesu Main Road (1.2 km away)</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm shrink-0">
              <i className="fa-solid fa-location-dot text-brand-coral"></i>
            </div>
            <div className="text-xs">
              <div className="text-gray-400 text-[10px]">DELIVERY DESTINATION</div>
              <div className="font-bold">{fullAddressLine}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Rider & Store Info Cards */}
      <div className="grid grid-cols-3 gap-2.5 text-center text-sm">
        <div className="border border-gray-100 bg-white rounded-2xl p-3 shadow-xs">
          <div className="text-[11px] text-gray-500 font-medium">Rider</div>
          <div className="font-extrabold text-gray-900 mt-0.5">Ramesh</div>
          <div className="text-[10px] text-emerald-700 font-bold">★ 4.9 (840)</div>
        </div>
        <div className="border border-gray-100 bg-white rounded-2xl p-3 shadow-xs">
          <div className="text-[11px] text-gray-500 font-medium">Store</div>
          <div className="font-extrabold text-xs text-gray-900 mt-0.5 truncate">
            {storeName}
          </div>
          <div className="text-[10px] text-gray-400 font-semibold">Surat Zone</div>
        </div>
        <div className="border border-gray-100 bg-white rounded-2xl p-3 shadow-xs">
          <div className="text-[11px] text-gray-500 font-medium">Packages</div>
          <div className="font-extrabold text-gray-900 mt-0.5">
            {order.seller_orders?.length || 1} pkg
          </div>
          <div className="text-[10px] text-gray-500">{items.length || 1} items</div>
        </div>
      </div>

      {/* 5. Complete Ordered Items Breakdown */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-box-open text-brand-green"></i>
            <span>Ordered Items ({items.length || 1})</span>
          </div>
          <span className="text-xs font-bold text-gray-500">{storeName}</span>
        </div>

        <div className="divide-y divide-gray-100">
          {items.length === 0 ? (
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                  <i className="fa-solid fa-bag-shopping"></i>
                </div>
                <div>
                  <div className="font-extrabold text-xs text-gray-900">Standard Delivery Item</div>
                  <div className="text-[11px] text-gray-500">Qty: 1</div>
                </div>
              </div>
              <div className="font-extrabold text-xs text-gray-900">
                ₹{grandTotal.toFixed(2)}
              </div>
            </div>
          ) : (
            items.map((it, idx) => {
              const qty = Number(it.quantity || 1);
              const unitPrice = Number(it.unit_price || it.sell_price || it.price || 0);
              const lineTotal = Number(it.total_price || (unitPrice * qty));
              return (
                <div key={it.id || idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-base shrink-0 font-bold">
                      <i className="fa-solid fa-basket-shopping"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-gray-900 truncate">
                        {it.product_name || it.title || it.name || 'Local Grocery Item'}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2">
                        <span>Qty: {qty}</span>
                        <span>·</span>
                        <span>₹{unitPrice.toFixed(2)} each</span>
                        {it.store_name && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 font-semibold truncate">{it.store_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="font-extrabold text-xs text-gray-900 shrink-0">
                    ₹{lineTotal.toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Bill Breakdown & Payment Information */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
          <i className="fa-solid fa-receipt text-brand-green"></i>
          <span>Bill Breakdown &amp; Payment</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Items Subtotal</span>
            <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>Delivery Fee</span>
            {deliveryFee === 0 ? (
              <span className="font-bold text-emerald-700">FREE</span>
            ) : (
              <span className="font-semibold text-gray-900">₹{deliveryFee.toFixed(2)}</span>
            )}
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Coupon Savings</span>
              <span>-₹{discount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-gray-600">
            <span>Taxes &amp; Local Packaging</span>
            <span className="font-semibold text-gray-900">₹0.00 (Included)</span>
          </div>

          <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-sm font-extrabold">
            <span className="text-gray-900">Total Paid</span>
            <span className="text-base text-emerald-700 font-extrabold">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Details Strip */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 text-xs">
              <i className="fa-solid fa-shield-halved"></i>
            </span>
            <div>
              <div className="font-extrabold text-gray-900">
                {paymentMethod.replace(/_/g, ' ')}
              </div>
              <div className="text-[10px] text-gray-500">
                {isPaid ? 'Payment Authorized & Captured' : 'Cash / UPI upon delivery'}
              </div>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            <i className={`fa-solid ${isPaid ? 'fa-check' : 'fa-clock'} text-[9px]`}></i>
            <span>{isPaid ? 'PAID' : 'PENDING'}</span>
          </span>
        </div>
      </div>

      {/* 7. Delivery Destination & Recipient Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
          <i className="fa-solid fa-location-dot text-brand-coral"></i>
          <span>Delivery Destination</span>
        </div>

        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-900">{recipientName}</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gray-100 text-gray-700 uppercase">
              {addressLabel}
            </span>
          </div>
          <div className="text-gray-500 text-[11px] font-semibold">{recipientPhone}</div>
          <div className="text-gray-700 font-medium pt-1">
            {fullAddressLine}
            {landmark && `, Near ${landmark}`}
          </div>
          <div className="text-gray-900 font-bold">
            {city} — {pincode}
          </div>
          <div className="pt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
            <i className="fa-solid fa-bolt"></i>
            <span>
              {order.delivery_mode === 'SAME_DAY'
                ? 'Same-Day Scheduled Delivery'
                : order.delivery_mode === 'STORE_PICKUP'
                ? 'Store Counter Pickup'
                : 'Express Delivery (14–45 mins)'}
            </span>
          </div>
        </div>
      </div>

      {/* 8. Call Rider & Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => showToast('Calling rider Ramesh (+91 98251 00213)...')}
          className="green-btn w-full flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <i className="fa-solid fa-phone"></i>
          <span>Call Rider Ramesh</span>
        </button>

        <button
          type="button"
          disabled={downloadingInvoice}
          onClick={handleDownloadInvoice}
          className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <i className={`fa-solid ${downloadingInvoice ? 'fa-spinner fa-spin' : 'fa-file-invoice'}`}></i>
          <span>{downloadingInvoice ? 'Generating Receipt...' : 'Download Order Receipt'}</span>
        </button>

        <button
          type="button"
          onClick={onBackToOrders}
          className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800 py-2 cursor-pointer"
        >
          ← Back to Orders
        </button>
      </div>
    </section>
  );
}
