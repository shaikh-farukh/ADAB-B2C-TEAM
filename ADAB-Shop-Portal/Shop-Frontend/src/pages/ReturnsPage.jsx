import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from '../hooks/useOrders';
import { sellerApi } from '../api/sellerApi';
import { useTranslation } from '../context/LanguageContext';

function ReturnDetailModal({ item, onClose, onAction, isBusy = false }) {
  const [rejectNote, setRejectNote] = useState(item?.rejectionReason || '');
  const itemsSum = Array.isArray(item?.items) && item.items.length > 0
    ? item.items.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0)
    : 0;
  const maxRefundAmount = Number(
    (itemsSum > 0 ? itemsSum : null) ?? item?.itemTotalPrice ?? item?.amount ?? item?.paymentAmount ?? 0
  );
  const productPolicy = Array.isArray(item?.items) && item?.items[0]?.refund_percentage != null
    ? item.items[0]
    : null;
  const defaultPct = productPolicy?.refund_percentage != null
    ? Number(productPolicy.refund_percentage)
    : (item?.refundPercentage != null ? Number(item?.refundPercentage) : 100);

  const [regulatedRefundAmount, setRegulatedRefundAmount] = useState(() => {
    return Number(((maxRefundAmount * defaultPct) / 100).toFixed(2));
  });

  const orderSummary = item?.orderSummary || {
    orderNumber: item?.orderId,
    grandTotal: item?.orderGrandTotal ?? item?.paymentAmount ?? (item?.amount || 0),
    itemsSubtotal: item?.storeSubtotal ?? item?.itemTotalPrice ?? (item?.amount || 0),
    deliveryFee: item?.deliveryFee ?? 0,
    paymentMethod: item?.paymentMethod || 'N/A',
    paymentStatus: item?.paymentRecordStatus || item?.paymentStatus || 'PAID'
  };

  const orderItemsToDisplay = Array.isArray(item?.allOrderItems) && item.allOrderItems.length > 0
    ? item.allOrderItems
    : (Array.isArray(item?.items) && item.items.length > 0 ? item.items : [
        {
          product_name: item?.productName || item?.product || 'Order Item',
          quantity: item?.quantity || 1,
          unit_price: item?.unitPrice,
          total_price: item?.itemTotalPrice || item?.amount,
          is_returned: true,
          returned_quantity: item?.quantity || 1
        }
      ]);

  if (!item) return null;

  const addr = item.deliveryAddress || {};
  const addressString =
    [addr.address_line, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') ||
    'No address recorded on order';

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(iso);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl lg:max-w-5xl w-full overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-rotate-left text-emerald-700 text-sm"></i>
              <h3 className="font-extrabold text-base text-gray-900">
                Return Detail • {item.id}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                item.status === 'pending'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : item.status === 'rejected'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}>
                {item.status === 'pending'
                  ? 'Awaiting Seller Approval'
                  : item.status === 'rejected'
                  ? 'Rejected'
                  : 'Refund Approved'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Order <span className="font-bold text-gray-800">{item.orderId}</span> • Requested {formatDate(item.requested_at)}
            </p>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center text-base font-bold shadow-2xs cursor-pointer disabled:opacity-50"
          >
            &times;
          </button>
        </div>

        {/* Body - 2 Columns */}
        <div className="p-6 overflow-y-auto text-xs space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: Full Order Info & Highlighting What Was Returned */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100 text-gray-900 font-extrabold text-xs uppercase tracking-wide">
                <i className="fa-solid fa-file-invoice text-blue-600"></i>
                <span>Order Information &amp; History</span>
              </div>

              {/* Customer & Delivery Address */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1">
                <div className="text-[10px] font-bold uppercase text-gray-400">Customer &amp; Delivery Details</div>
                <div className="font-bold text-gray-900 text-sm">
                  {item.customer}
                  {item.customerPhone && (
                    <span className="ml-2 font-mono text-xs font-normal text-gray-600">({item.customerPhone})</span>
                  )}
                </div>
                <div className="text-gray-600 flex items-start gap-1.5 mt-1">
                  <i className="fa-solid fa-location-dot text-emerald-600 mt-0.5"></i>
                  <span>{addressString}</span>
                </div>
              </div>

              {/* Original Order Items with Return Highlighting */}
              <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Order Items Breakdown ({orderItemsToDisplay.length})
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Highlighted = Returned
                  </span>
                </div>

                <div className="space-y-2">
                  {orderItemsToDisplay.map((prod, idx) => {
                    const isReturned = prod.is_returned || (
                      Array.isArray(item.items) && item.items.some(ri => (
                        (ri.order_item_id && prod.order_item_id && ri.order_item_id === prod.order_item_id) ||
                        (ri.product_name && prod.product_name && ri.product_name.toLowerCase() === prod.product_name.toLowerCase())
                      ))
                    );
                    const matchingReturnItem = Array.isArray(item.items) && item.items.find(ri => (
                      (ri.order_item_id && prod.order_item_id && ri.order_item_id === prod.order_item_id) ||
                      (ri.product_name && prod.product_name && ri.product_name.toLowerCase() === prod.product_name.toLowerCase())
                    ));
                    const returnedQty = prod.returned_quantity || matchingReturnItem?.quantity || (isReturned ? (item.quantity || 1) : 0);
                    const orderedQty = Number(prod.quantity || 1);
                    const keptQty = Math.max(0, orderedQty - returnedQty);
                    const unitPrice = Number(prod.unit_price || 0);
                    const totalOrderedPrice = Number(prod.total_price || (unitPrice * orderedQty));
                    const returnedAmount = unitPrice * returnedQty;
                    const keptAmount = unitPrice * keptQty;

                    return (
                      <div
                        key={prod.order_item_id || prod.return_item_id || idx}
                        className={`p-3 rounded-xl border transition ${
                          isReturned
                            ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                            : 'bg-gray-50/50 border-gray-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5 flex-wrap">
                              <span>{prod.product_name || 'Order Item'}</span>
                              {isReturned ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-400 inline-flex items-center gap-1">
                                  <i className="fa-solid fa-rotate-left text-[8px]"></i>
                                  Returned ({returnedQty} of {orderedQty} unit{orderedQty > 1 ? 's' : ''})
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-200 text-gray-600">
                                  Kept by Customer ({orderedQty}x)
                                </span>
                              )}
                            </div>

                            <div className="mt-1 space-y-0.5 text-[11px]">
                              <div className="text-gray-700">
                                Ordered: <strong>{orderedQty} unit(s)</strong> @ ₹{unitPrice.toLocaleString('en-IN')} = <strong>₹{totalOrderedPrice.toFixed(2)}</strong>
                              </div>
                              {isReturned && (
                                <div className="text-amber-800 font-semibold flex items-center gap-2 flex-wrap">
                                  <span>• Returning: <strong>{returnedQty} unit(s)</strong> (₹{returnedAmount.toFixed(2)})</span>
                                  {keptQty > 0 && (
                                    <span className="text-gray-600 font-normal">• Kept: <strong>{keptQty} unit(s)</strong> (₹{keptAmount.toFixed(2)})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-gray-400 font-bold uppercase">Ordered Subtotal</div>
                            <div className="font-extrabold text-xs text-gray-900">
                              ₹{totalOrderedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Original Order Summary Card */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <i className="fa-solid fa-receipt text-blue-600"></i>
                    <span>Original Order Summary</span>
                  </span>
                  <span className="text-[11px] font-bold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-200">
                    {orderSummary.orderNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <div className="text-[10px] text-gray-500">Items Subtotal</div>
                    <div className="font-bold text-gray-900">
                      ₹{Number(orderSummary.itemsSubtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Delivery Fee</div>
                    <div className="font-bold text-gray-700">
                      ₹{Number(orderSummary.deliveryFee || 0).toFixed(2)}
                      <span className="block text-[9px] font-semibold text-amber-700">Non-refundable</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Total Paid at Checkout</div>
                    <div className="font-bold text-gray-900">
                      ₹{Number(orderSummary.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Checkout Payment</div>
                    <div className="font-bold text-emerald-800 uppercase flex items-center gap-1 flex-wrap">
                      <span>{orderSummary.paymentMethod || 'CARD'}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-md border border-emerald-200">
                        PAID
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Return & Refund Settlement, Condition & "How Much" */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100 text-gray-900 font-extrabold text-xs uppercase tracking-wide">
                <i className="fa-solid fa-hand-holding-dollar text-emerald-700"></i>
                <span>Return &amp; Refund Settlement</span>
              </div>

              {/* Returned Item Details & Condition */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    Returned Product &amp; Condition
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-900 border border-emerald-300">
                    Condition: {item.itemCondition || 'UNOPENED'}
                  </span>
                </div>

                <div className="divide-y divide-emerald-200/60 bg-white p-3 rounded-xl border border-emerald-200/80">
                  {(Array.isArray(item.items) && item.items.length > 0
                    ? item.items
                    : [
                        {
                          product_name: item.productName || item.product,
                          quantity: item.quantity || 1,
                          unit_price: item.unitPrice,
                          reason: item.reason,
                          item_condition: item.itemCondition,
                          current_listing_stock: item.currentListingStock
                        }
                      ]
                  ).map((prod, idx) => (
                    <div key={prod.return_item_id || prod.order_item_id || idx} className="py-2 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-extrabold text-sm text-gray-900">
                          {prod.product_name || 'Order Item'}
                        </div>
                        {prod.current_listing_stock != null && (
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase">Stock</span>
                            <span className="text-xs font-extrabold text-emerald-700">{prod.current_listing_stock} units</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-[11px] flex-wrap">
                        <span>Units to Refund: <strong className="text-emerald-950 bg-emerald-100 px-1.5 py-0.5 rounded font-black">{prod.quantity || 1} unit(s)</strong></span>
                        {prod.unit_price != null && (
                          <span>• Refund Value: <strong>₹{(Number(prod.unit_price || 0) * Number(prod.quantity || 1)).toFixed(2)}</strong></span>
                        )}
                        {prod.item_condition && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {prod.item_condition}
                          </span>
                        )}
                      </div>
                      {prod.reason && (
                        <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-1">
                          Reason: <span className="font-semibold text-gray-800">{prod.reason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {productPolicy && (
                  <div className="text-[11px] text-emerald-900 bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-300 flex items-center justify-between">
                    <span>Policy: <strong>{productPolicy.refund_percentage ?? 100}% Refundable</strong></span>
                    <span>Return Window: <strong>{productPolicy.return_window_days ?? 7} days</strong></span>
                  </div>
                )}

                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[11px] font-bold text-gray-600">Returned Item Value</span>
                  <span className="text-sm font-black text-gray-900">
                    ₹{Number(maxRefundAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* How Much: Regulate Refund Amount section (when pending approval) */}
              {item.status === 'pending' && (
                <div className="p-3.5 rounded-xl bg-white border border-emerald-300 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[11px] font-bold uppercase text-emerald-900 flex items-center gap-1.5">
                      <i className="fa-solid fa-sliders text-emerald-700"></i>
                      <span>Regulate Customer Refund Amount</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Original: <strong className="text-gray-800">₹{maxRefundAmount.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2 text-gray-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        max={maxRefundAmount}
                        step="0.01"
                        value={regulatedRefundAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val)) setRegulatedRefundAmount('');
                          else setRegulatedRefundAmount(Math.min(maxRefundAmount, Math.max(0, val)));
                        }}
                        className="w-full pl-7 pr-3 py-1.5 text-xs font-bold border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-emerald-950"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setRegulatedRefundAmount(maxRefundAmount)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                        title="100% Full Refund"
                      >
                        100%
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegulatedRefundAmount(Number((maxRefundAmount * 0.8).toFixed(2)))}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                        title="80% Partial Refund (20% Restocking Fee)"
                      >
                        80%
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegulatedRefundAmount(Number((maxRefundAmount * 0.5).toFixed(2)))}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                        title="50% Partial Refund (Damage / Restocking)"
                      >
                        50%
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1.5 border-t border-gray-100">
                    <span>
                      {Number(regulatedRefundAmount) < maxRefundAmount ? (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <i className="fa-solid fa-circle-minus text-[10px]"></i>
                          <span>Deduction / Restocking: ₹{(maxRefundAmount - Number(regulatedRefundAmount || 0)).toFixed(2)}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Full 100% Refund</span>
                      )}
                    </span>
                    <span className="font-bold text-emerald-900 text-xs">
                      Approved Refund: ₹{Number(regulatedRefundAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Rejection Note */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Rejection Note (used if declining):
                    </label>
                    <input
                      type="text"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Optional reason if declining return request..."
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:border-emerald-600 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Resolved State Display */}
              {item.status !== 'pending' && (
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-gray-500">Refund Settlement Record</div>
                  <div className="text-sm font-extrabold text-emerald-800">
                    Refund Amount: ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  {item.resolved_at && (
                    <div className="text-[11px] text-gray-500">
                      Resolved on: <span className="font-semibold text-gray-700">{formatDate(item.resolved_at)}</span>
                    </div>
                  )}
                  {item.status === 'rejected' && item.rejectionReason && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] mt-2">
                      <span className="font-bold block text-[10px] uppercase">Rejection Reason</span>
                      <span>{item.rejectionReason}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-gray-500">
            Status: <span className="font-bold text-gray-800 uppercase">{item.rawStatus || item.status}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.status === 'pending' && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onAction(item, 'approved', null, regulatedRefundAmount)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isBusy ? 'Saving...' : `Approve Refund (₹${Number(regulatedRefundAmount || 0).toLocaleString('en-IN')})`}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onAction(item, 'rejected', rejectNote)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {item.status === 'approved' && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onAction(item, 'restocked')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                  <span>{isBusy ? 'Saving...' : `Add Back (+${item.quantity || 1})`}</span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onAction(item, 'discarded')}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Discard Item
                </button>
              </>
            )}
            <button
              type="button"
              disabled={isBusy}
              onClick={onClose}
              className="btn-soft !py-1.5 !px-3 !text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const { t } = useTranslation();
  const { orders } = useOrders();
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [returnsList, setReturnsList] = useState(() => {
    try {
      const cached = localStorage.getItem('seller_returns_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [processingIds, setProcessingIds] = useState({});
  const inFlightRef = useRef(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  const fetchReturns = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const res = await sellerApi.getReturns();
      const raw = res?.data !== undefined ? res.data : res;
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setReturnsList(list);
      try {
        localStorage.setItem('seller_returns_cache', JSON.stringify(list));
      } catch (e) {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adab-returns-updated', { detail: { count: list.length, returns: list } }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load return requests');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns(true);
  }, []);

  const handleAction = async (item, nextStatus, customRejectionNote = null, customRefundAmount = null) => {
    const targetId = item.returnUuid || item.id;
    if (!targetId || inFlightRef.current.has(targetId)) return;

    inFlightRef.current.add(targetId);
    setProcessingIds(prev => ({ ...prev, [item.id]: true, [targetId]: true }));

    try {
      const rejectionReason =
        nextStatus === 'rejected'
          ? (customRejectionNote && customRejectionNote.trim()
              ? customRejectionNote.trim()
              : 'Return declined after seller review')
          : null;

      const res = (customRefundAmount !== null && customRefundAmount !== undefined)
        ? await sellerApi.updateReturnStatus(targetId, nextStatus, rejectionReason, customRefundAmount)
        : await sellerApi.updateReturnStatus(targetId, nextStatus, rejectionReason);
      const payload = res?.data || res || {};

      const applyRowUpdate = (r) => ({
        ...r,
        status: payload.status || nextStatus,
        rawStatus: payload.rawStatus || r.rawStatus,
        itemCondition: payload.itemCondition || r.itemCondition,
        amount: payload.refundAmount !== undefined ? Number(payload.refundAmount) : (customRefundAmount !== null ? Number(customRefundAmount) : r.amount),
        refundPercentage: payload.refundPercentage !== undefined ? Number(payload.refundPercentage) : r.refundPercentage,
        paymentStatus: payload.paymentStatus || r.paymentStatus,
        paymentRecordStatus: payload.paymentRecordStatus || r.paymentRecordStatus,
        rejectionReason: payload.rejectionReason !== undefined ? payload.rejectionReason : r.rejectionReason,
        resolved_at: payload.resolved_at || r.resolved_at,
        items: Array.isArray(payload.items) && payload.items.length > 0 ? payload.items : r.items,
        currentListingStock:
          payload.currentListingStock !== undefined && payload.currentListingStock !== null
            ? Number(payload.currentListingStock)
            : r.currentListingStock
      });

      // Smooth in-place update of ONLY the target row after DB confirms (no table blink!)
      setReturnsList(prev =>
        prev.map(r => {
          if (r.id !== item.id && r.returnUuid !== item.returnUuid) return r;
          return applyRowUpdate(r);
        })
      );

      setSelectedReturn(prev => {
        if (!prev || (prev.id !== item.id && prev.returnUuid !== item.returnUuid)) return prev;
        return applyRowUpdate(prev);
      });

      if (nextStatus === 'approved') {
        setToastMessage(
          `Return ${item.id} approved • ₹${item.amount} refund recorded in payments. Awaiting item at store to Add Back or Discard.`
        );
      } else if (nextStatus === 'restocked') {
        const restocked = payload.restockedQty ?? (item.quantity || 1);
        setToastMessage(
          `Item ${item.id} reached store • +${restocked} unit(s) added back to product catalog`
        );
      } else if (nextStatus === 'discarded') {
        setToastMessage(
          `Item ${item.id} reached store • Ditched from relisting (stock unchanged)`
        );
      } else {
        setToastMessage(`Return ${item.id} rejected • No stock or refund changes applied`);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update return status');
    } finally {
      inFlightRef.current.delete(targetId);
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[item.id];
        delete next[targetId];
        return next;
      });
    }
  };

  const filteredReturns = returnsList.filter(item => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'approved'
        ? ['approved', 'restocked', 'discarded'].includes(item.status)
        : item.status === statusFilter;
    const matchesReason = reasonFilter === 'all' ? true : item.reasonKey === reasonFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ? true : (
      (item.id || '').toLowerCase().includes(q) ||
      (item.orderId || '').toLowerCase().includes(q) ||
      (item.customer || '').toLowerCase().includes(q) ||
      (item.product || '').toLowerCase().includes(q)
    );
    return matchesStatus && matchesReason && matchesSearch;
  });

  const pendingCount = returnsList.filter(r => r.status === 'pending').length;
  const awaitingStoreCount = returnsList.filter(r => r.status === 'approved').length;
  const approvedTotalCount = returnsList.filter(r => ['approved', 'restocked', 'discarded'].includes(r.status)).length;
  const totalRefundAmount = returnsList
    .filter(r => ['approved', 'restocked', 'discarded'].includes(r.status))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const returnRatePct = orders.length > 0
    ? `${((returnsList.length / orders.length) * 100).toFixed(1)}%`
    : '0.0%';

  const renderStatusBadge = (status) => {
    if (status === 'pending') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">
          {t('pendingReview', 'PENDING REVIEW')}
        </span>
      );
    }
    if (status === 'approved') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 whitespace-nowrap">
          {t('returnsAwaitingItem', 'AWAITING ITEM')}
        </span>
      );
    }
    if (status === 'restocked') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 whitespace-nowrap">
          {t('returnsRestocked', 'RESTOCKED')}
        </span>
      );
    }
    if (status === 'discarded') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700 whitespace-nowrap">
          {t('discarded', 'DISCARDED')}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 whitespace-nowrap">
        {t('rejected', 'REJECTED')}
      </span>
    );
  };

  return (
    <section id="sec-returns" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{t('returnsTitle', 'Returns & Refunds')}</h1>
          <p className="text-sm text-gray-500">{t('returnsSubtitle', '1. Approve or reject return requests • 2. Once item reaches store, Add Back to catalog or Discard')}</p>
        </div>
        <button
          type="button"
          onClick={() => fetchReturns(false)}
          className="btn-soft !text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-rotate-right"></i>
          <span>Sync</span>
        </button>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-gray-500">Pending Review</div>
          <div className="text-2xl font-extrabold text-red-600 mt-1">
            {pendingCount}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Need merchant approval</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">In Transit to Store</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{awaitingStoreCount}</div>
          <div className="text-[10px] text-blue-600 font-bold mt-0.5">Ready for Add Back / Discard</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Total Refunded ({approvedTotalCount})</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">₹{totalRefundAmount.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Consumed from payment domain</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Return Rate</div>
          <div className="text-2xl font-extrabold text-green-700 mt-1">
            {returnRatePct}
          </div>
          <div className="text-[10px] text-green-600 font-bold mt-0.5">
            {returnsList.length} of {orders.length} store orders
          </div>
        </div>
      </div>

      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input 
          type="search" 
          placeholder="Search by Return ID, Order #, Customer..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600" 
        />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved / Completed</option>
          <option value="restocked">Restocked to Catalog</option>
          <option value="discarded">Discarded</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span><i className="fa-solid fa-triangle-exclamation mr-1.5"></i>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold cursor-pointer">✕</button>
        </div>
      )}

      <div className="card overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left min-w-[600px]">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Return ID</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Refund &amp; Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading return requests from database...
                </td>
              </tr>
            ) : filteredReturns.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">No returns found in database for the selected filter.</td>
              </tr>
            ) : (
              filteredReturns.map(item => {
                const isBusy = Boolean(processingIds[item.id] || processingIds[item.returnUuid]);
                return (
                  <tr
                    key={item.returnUuid || item.id}
                    onClick={() => setSelectedReturn(item)}
                    className="hover:bg-gray-50 transition cursor-pointer"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{item.orderId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.customer}</div>
                      {item.customerPhone && (
                        <div className="text-[10px] font-mono text-gray-400">{item.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">₹{Number(item.amount || 0).toLocaleString('en-IN')}</div>
                      {item.paymentMethod && (
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">
                          {item.paymentMethod} • {item.paymentRecordStatus || item.paymentStatus || 'PAID'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {isBusy ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 whitespace-nowrap select-none">
                            <i className="fa-solid fa-spinner fa-spin text-[10px]"></i> Saving...
                          </span>
                        ) : item.status === 'pending' ? (
                          <>
                            <button 
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAction(item, 'approved')} 
                              className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                              {t('returnsApprove', 'Approve')}
                            </button>
                            <button 
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAction(item, 'rejected')} 
                              className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                              {t('returnsReject', 'Reject')}
                            </button>
                          </>
                        ) : item.status === 'approved' ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAction(item, 'restocked')}
                              title="Product reached store in sellable condition — add back to catalog stock"
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center gap-1"
                            >
                              <i className="fa-solid fa-plus text-[10px]"></i>
                              <span>{t('returnsAddBack', `Add Back (+${item.quantity || 1})`, { count: item.quantity || 1 })}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAction(item, 'discarded')}
                              title="Product reached store damaged/unsellable — ditch from relisting"
                              className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                              {t('returnsDiscard', 'Discard')}
                            </button>
                          </>
                        ) : item.status === 'restocked' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold whitespace-nowrap">
                            <i className="fa-solid fa-circle-check text-[11px]"></i>
                            {t('returnsAddedToCatalog', `Added to Catalog (+${item.quantity || 1})`, { count: item.quantity || 1 })}
                          </span>
                        ) : item.status === 'discarded' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-semibold whitespace-nowrap">
                            <i className="fa-solid fa-box-archive text-[11px]"></i>
                            Ditched from Relisting
                          </span>
                        ) : (
                          <span className="text-xs text-rose-600 font-semibold italic whitespace-nowrap">
                            Request Declined
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedReturn && (
        <ReturnDetailModal
          item={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onAction={handleAction}
          isBusy={Boolean(processingIds[selectedReturn.id] || processingIds[selectedReturn.returnUuid])}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2.5 transition-all border border-gray-700">
          <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
          <span>{toastMessage}</span>
          <button 
            type="button"
            onClick={() => setToastMessage(null)} 
            className="ml-2 text-gray-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
