import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useB2B } from '../hooks/useB2B';
import { useSeller } from '../context/SellerContext';

// --- Order Detail Modal Component ---
function B2BOrderDetailModal({ order, onClose, onUpdateStatus, isUpdating }) {
  if (!order) return null;

  const [activeTab, setActiveTab] = useState('manifest');
  const [transporterInput, setTransporterInput] = useState(order.freight_partner || 'Porter Truck');
  const [waybillInput, setWaybillInput] = useState(order.payment_reference || '');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  const displayId = order.po_number || (order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '#B2B-PO');
  const isBought = order.order_direction === 'BOUGHT';
  const status = String(order.status || 'PLACED').toUpperCase();
  const items = Array.isArray(order.items) ? order.items : [];
  const totalAmount = Number(order.total_amount || 0);

  // Status timeline steps
  const steps = [
    { key: 'REQUESTED_OR_PLACED', label: isBought ? 'Order Placed' : 'Order Received', icon: 'fa-cart-shopping' },
    { key: 'CONFIRMED', label: 'Confirmed', icon: 'fa-check' },
    { key: 'PACKING', label: 'Packing & Ready', icon: 'fa-box' },
    { key: 'IN_TRANSIT', label: 'In Transit / Dispatched', icon: 'fa-truck-fast' },
    { key: 'DELIVERED', label: 'Delivered & Received', icon: 'fa-box-open' }
  ];

  const getStepIndex = (st) => {
    switch (st) {
      case 'REQUESTED':
      case 'PLACED':
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
      case 'APPROVED':
        return 1;
      case 'PACKING':
      case 'PACKED':
        return 2;
      case 'IN_TRANSIT':
      case 'DISPATCHED':
      case 'SHIPPED':
      case 'TRANSIT':
        return 3;
      case 'DELIVERED':
      case 'RECEIVED':
        return 4;
      case 'DECLINED':
      case 'CANCELLED':
      case 'REJECTED':
        return -1;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(status);

  const handleAction = async (nextStatus, extraMetadata = {}) => {
    if (actionLoading || !onUpdateStatus) return;
    try {
      setActionLoading(true);
      await onUpdateStatus(order.id, nextStatus, {
        delivery_method: transporterInput,
        payment_reference: waybillInput,
        ...extraMetadata
      });
      setSuccessNotice(`Order successfully marked as ${nextStatus}!`);
      setTimeout(() => {
        setSuccessNotice('');
      }, 3000);
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 animate-scale-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-orange-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
              isBought ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <i className={`fa-solid ${isBought ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-gray-900">{displayId}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  isBought ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isBought ? 'You Bought (Procurement)' : 'You Sold (Wholesale)'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                  {order.source_label || 'B2B Sourcing'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Partner: <strong className="text-gray-800">{order.partner_name || 'Partner Store'}</strong> ({order.partner_city || 'City'}) • 
                Created on {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
              title="Print Tax Invoice / PO"
            >
              <i className="fa-solid fa-print text-gray-500"></i>
              <span>Print PO</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition font-bold"
              aria-label="Close modal"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-600"></i>
            <span>{successNotice}</span>
          </div>
        )}

        {/* Order Status Stepper */}
        {status !== 'DECLINED' && status !== 'CANCELLED' ? (
          <div className="bg-gray-50/70 border-b border-gray-100 px-5 py-4 shrink-0">
            <div className="grid grid-cols-5 gap-2 max-w-3xl mx-auto">
              {steps.map((st, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;
                return (
                  <div key={st.key} className="flex flex-col items-center text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isPassed 
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' 
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      <i className={`fa-solid ${st.icon}`}></i>
                    </div>
                    <span className={`text-[10px] mt-1 font-bold leading-tight ${
                      isCurrent ? 'text-emerald-700' : isPassed ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 text-xs text-rose-800 flex items-center gap-2 font-bold">
            <i className="fa-solid fa-circle-xmark text-rose-600"></i>
            <span>This order was cancelled / declined. {order.rejection_reason ? `Reason: ${order.rejection_reason}` : ''}</span>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid md:grid-cols-3 gap-5">
            {/* Left 2 Cols: Items & Manifest */}
            <div className="md:col-span-2 space-y-4">
              <div className="card p-4 border border-gray-200 bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-boxes-stacked text-orange-600"></i>
                    <span>Order Items Manifest ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                  </h4>
                  <span className="text-xs font-bold text-gray-500">
                    Wholesale B2B Rate
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    <i className="fa-solid fa-box-open text-3xl mb-2 text-gray-300"></i>
                    <p>No individual item breakdown recorded in manifest.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold">
                          <th className="py-2">Item &amp; Brand</th>
                          <th className="py-2 text-center">Quantity</th>
                          <th className="py-2 text-right">Unit Price</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((it, i) => {
                          const qty = Number(it.quantity || 1);
                          const unitPrice = Number(it.unit_price || it.price || 0);
                          const lineTotal = Number(it.total_price || it.total || (qty * unitPrice));
                          return (
                            <tr key={i} className="hover:bg-gray-50/70 transition">
                              <td className="py-2.5">
                                <div className="font-bold text-gray-900">{it.item_name || 'Wholesale Goods'}</div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                  {it.brand && <span>Brand: <strong className="text-gray-600">{it.brand}</strong></span>}
                                  {it.category_name && <span>• {it.category_name}</span>}
                                </div>
                              </td>
                              <td className="py-2.5 text-center font-bold text-gray-700">
                                {qty} {it.unit || 'pcs'}
                              </td>
                              <td className="py-2.5 text-right font-medium text-gray-600">
                                ₹{unitPrice.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 text-right font-black text-gray-900">
                                ₹{lineTotal.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Subtotal & Financial Breakdown */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Items Subtotal:</span>
                    <span className="font-semibold text-gray-800">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Freight / Transport:</span>
                    <span className="font-semibold text-emerald-700">
                      {order.delivery_fee && Number(order.delivery_fee) > 0 ? `₹${Number(order.delivery_fee).toLocaleString('en-IN')}` : 'Included / Porter'}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>GST / Taxes:</span>
                    <span className="font-semibold text-gray-800">Standard B2B Input Credit</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total Order Value:</span>
                    <span className="text-base font-black text-emerald-700">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Order Notes / Terms */}
              {order.notes && (
                <div className="card p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <i className="fa-solid fa-note-sticky text-amber-600"></i>
                    <span>Order Notes &amp; Instructions</span>
                  </div>
                  <p className="text-amber-800">{order.notes}</p>
                </div>
              )}

              {/* Own Brand Catalog Status Info */}
              {order.source_channel === 'OTHER_STORE_BRANDS' && (
                <div className="card p-3.5 bg-teal-50/90 border border-teal-200 rounded-xl text-xs flex items-start gap-2.5 text-teal-950">
                  <i className="fa-solid fa-shield-halved text-teal-600 mt-0.5 text-sm"></i>
                  <div>
                    <strong className="block font-black text-xs text-teal-900">Own Brand Catalog Listing Active</strong>
                    <span className="text-teal-800 text-[11px] leading-relaxed">
                      This brand product is already active in your store catalog from when your payment was confirmed. Marking delivery received confirms physical boxes have arrived at your shop.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Partner, Logistics & Payment */}
            <div className="space-y-4">
              {/* Partner Store Details */}
              <div className="card p-4 border border-gray-200 bg-white space-y-3">
                <h4 className="font-black text-xs text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-store text-emerald-600"></i>
                  <span>Partner Business Details</span>
                </h4>
                <div>
                  <div className="font-extrabold text-sm text-gray-900">{order.partner_name || 'Partner Store'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{order.partner_role || 'Wholesale Supplier'} • {order.partner_city}</div>
                </div>

                <div className="space-y-1.5 pt-1 text-xs text-gray-600">
                  {order.partner_phone && (
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-phone text-gray-400 w-4"></i>
                      <a href={`tel:${order.partner_phone}`} className="font-semibold text-blue-700 hover:underline">
                        {order.partner_phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-location-dot text-gray-400 w-4"></i>
                    <span>{order.partner_city || 'Gujarat Hub'} • {order.distance || 12.5} km away</span>
                  </div>
                </div>
              </div>

              {/* Freight & Logistics Card */}
              <div className="card p-4 border border-gray-200 bg-white space-y-3">
                <h4 className="font-black text-xs text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-truck text-blue-600"></i>
                  <span>Logistics &amp; Transport</span>
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-gray-800">{order.freight_partner || 'Porter Truck'}</div>
                    <div className="text-[11px] text-gray-500">{order.delivery_method || 'Local Fleet / Inter-Store'}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {order.distance_tier === 'near' ? 'Intra-City (<50km)' : 'Interstate'}
                  </span>
                </div>

                {order.payment_reference && (
                  <div className="p-2 bg-gray-50 rounded-lg text-xs font-mono text-gray-700 flex items-center justify-between">
                    <span>Waybill / LR:</span>
                    <strong className="text-gray-900">{order.payment_reference}</strong>
                  </div>
                )}

                {/* Transporter and Waybill inputs for supplier when packing */}
                {!isBought && status === 'PACKING' && (
                  <div className="p-3 bg-orange-50/80 rounded-xl border border-orange-200 space-y-2 mt-2">
                    <div className="font-bold text-[11px] text-orange-950 flex items-center gap-1.5">
                      <i className="fa-solid fa-truck-ramp-box text-orange-600"></i>
                      <span>Dispatch Details for Porter / Logistics</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">Transporter</label>
                        <input
                          type="text"
                          value={transporterInput}
                          onChange={(e) => setTransporterInput(e.target.value)}
                          placeholder="e.g. Porter, Delhivery"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">Waybill / LR No.</label>
                        <input
                          type="text"
                          value={waybillInput}
                          onChange={(e) => setWaybillInput(e.target.value)}
                          placeholder="e.g. PRT-12891"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Credit Terms */}
              <div className="card p-4 border border-gray-200 bg-white space-y-3">
                <h4 className="font-black text-xs text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-credit-card text-purple-600"></i>
                  <span>Payment &amp; Khata</span>
                </h4>
                <div>
                  <div className="font-bold text-xs text-gray-900">
                    {order.payment_terms === 'ADVANCE_UPI' 
                      ? 'Instant UPI Transfer' 
                      : order.payment_terms?.includes('CREDIT') 
                        ? '14 Days Store Credit (Khata)' 
                        : (order.payment_terms || '14 Days Net Credit')}
                  </div>
                  <div className="text-[11px] text-gray-500">Status: <strong className={order.payment_status === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>{order.payment_status || 'PENDING'}</strong></div>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-shield-halved text-purple-600"></i>
                    <span>Settlement Guarantee</span>
                  </div>
                  <p className="text-[10px] text-purple-800 leading-relaxed">
                    Auto-reconciled with ADAB B2B Ledger. 0% interest within 14-day cycle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block leading-tight">Total Order Value</span>
            <span className="text-lg font-black text-emerald-700">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Contextual Action Buttons */}
            {isBought ? (
              /* Buyer Actions */
              <>
                {(status === 'REQUESTED' || status === 'PLACED' || status === 'PENDING') && (
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 flex items-center gap-1.5">
                    <i className="fa-solid fa-hourglass-start text-gray-400"></i>
                    <span>Awaiting Supplier Acceptance</span>
                  </span>
                )}

                {status === 'CONFIRMED' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                      <i className="fa-solid fa-clock text-amber-600"></i>
                      <span>Supplier Confirmed • Packing in Progress</span>
                    </span>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAction('DELIVERED', { auto_add_stock: order.source_channel !== 'OTHER_STORE_BRANDS' })}
                      className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 underline px-1"
                      title="If you picked up the stock in person from their store"
                    >
                      Already Received in Person?
                    </button>
                  </div>
                )}

                {status === 'PACKING' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-purple-800 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 flex items-center gap-1.5">
                      <i className="fa-solid fa-boxes-packing text-purple-600"></i>
                      <span>Order Being Packed • Awaiting Porter Dispatch</span>
                    </span>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAction('DELIVERED', { auto_add_stock: order.source_channel !== 'OTHER_STORE_BRANDS' })}
                      className="text-[11px] font-bold text-gray-500 hover:text-emerald-700 underline px-1"
                    >
                      Already Received in Person?
                    </button>
                  </div>
                )}

                {(status === 'IN_TRANSIT' || status === 'DISPATCHED' || status === 'SHIPPED') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('DELIVERED', { auto_add_stock: order.source_channel !== 'OTHER_STORE_BRANDS' })}
                    className="btn-primary !text-xs !py-2 !px-4 font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <i className="fa-solid fa-box-open"></i>
                    <span>
                      {order.source_channel === 'OTHER_STORE_BRANDS'
                        ? 'Confirm Physical Delivery Received'
                        : 'Confirm Receipt & Add Stock to Inventory'}
                    </span>
                  </button>
                )}

                {(status === 'DELIVERED' || status === 'RECEIVED') && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>
                      {order.source_channel === 'OTHER_STORE_BRANDS'
                        ? 'Delivery Received • Active in Catalog'
                        : 'Stock Received & Catalog Updated'}
                    </span>
                  </span>
                )}
              </>
            ) : (
              /* Seller / Supplier Actions */
              <>
                {(status === 'REQUESTED' || status === 'PLACED' || status === 'PENDING') && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAction('CONFIRMED')}
                      className="btn-primary !text-xs !py-2 !px-3 font-bold bg-emerald-600 text-white"
                    >
                      <i className="fa-solid fa-check mr-1"></i> Accept Order
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setShowDeclineModal(true)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                    >
                      Decline
                    </button>
                  </>
                )}

                {status === 'CONFIRMED' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('PACKING')}
                    className="btn-primary !text-xs !py-2 !px-3 font-bold bg-blue-600 text-white"
                  >
                    <i className="fa-solid fa-box mr-1"></i> Mark as Packed &amp; Ready
                  </button>
                )}

                {status === 'PACKING' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('IN_TRANSIT', { delivery_method: transporterInput, payment_reference: waybillInput })}
                    className="btn-primary !text-xs !py-2 !px-3 font-bold bg-orange-600 text-white"
                  >
                    <i className="fa-solid fa-truck-fast mr-1"></i> Dispatch &amp; Call Porter / Freight
                  </button>
                )}

                {(status === 'IN_TRANSIT' || status === 'DISPATCHED') && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5">
                    <i className="fa-solid fa-truck-fast"></i>
                    <span>Dispatched via {order.freight_partner || 'Porter'} • En Route to Buyer</span>
                  </span>
                )}

                {(status === 'DELIVERED' || status === 'RECEIVED') && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Order Completed &amp; Delivered</span>
                  </span>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Decline Reason Sub-Modal */}
        {showDeclineModal && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <h4 className="font-extrabold text-sm text-gray-900">Decline Wholesale Order</h4>
              <p className="text-xs text-gray-500">Please provide a reason to notify the buyer store:</p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Out of stock, price revised, delivery zone unreachable..."
                className="w-full h-24 p-2.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-rose-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    handleAction('DECLINED', { rejection_reason: declineReason || 'Declined by seller' });
                    setShowDeclineModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function PartnerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orders, loading, error, refreshOrders, updateStatus } = useB2B();
  const { store } = useSeller();

  // Navigation Filters State (initialized from URL params if present)
  const initialDirection = searchParams.get('direction') || 'all'; // 'all', 'BOUGHT', 'SOLD'
  const initialSource = searchParams.get('source') || 'all'; // 'all', 'NEARBY_KIRANA', 'OTHER_STORE_BRANDS', 'MANUFACTURER'

  const [directionFilter, setDirectionFilter] = useState(initialDirection);
  const [sourceFilter, setSourceFilter] = useState(initialSource);
  const [activeDist, setActiveDist] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Compute KPI statistics
  const totalVolume = useMemo(() => {
    return orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  }, [orders]);

  const boughtOrders = useMemo(() => orders.filter(o => o.order_direction === 'BOUGHT'), [orders]);
  const soldOrders = useMemo(() => orders.filter(o => o.order_direction === 'SOLD'), [orders]);
  const inTransitCount = useMemo(() => orders.filter(o => {
    const s = String(o.status || '').toUpperCase();
    return s === 'IN_TRANSIT' || s === 'DISPATCHED' || s === 'TRANSIT' || s === 'PACKING';
  }).length, [orders]);

  // Distance counts
  const nearCount = useMemo(() => orders.filter(o => !o.distance_tier || o.distance_tier === 'near' || (o.distance && o.distance <= 50)).length, [orders]);
  const farCount = useMemo(() => orders.filter(o => o.distance_tier === 'far' || (o.distance && o.distance > 50 && o.distance <= 1500)).length, [orders]);
  const exportCount = useMemo(() => orders.filter(o => o.distance_tier === 'export' || (o.distance && o.distance > 1500)).length, [orders]);

  // Source channel counts
  const nearbyCount = useMemo(() => orders.filter(o => o.source_channel === 'NEARBY_KIRANA').length, [orders]);
  const brandsCount = useMemo(() => orders.filter(o => o.source_channel === 'OTHER_STORE_BRANDS').length, [orders]);
  const mfgCount = useMemo(() => orders.filter(o => o.source_channel === 'MANUFACTURER' || o.source_channel === 'DISTRIBUTOR').length, [orders]);

  // Master Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      // 1. Direction Filter (Bought vs Sold)
      if (directionFilter !== 'all' && item.order_direction !== directionFilter) {
        return false;
      }

      // 2. Source Channel Filter
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'MANUFACTURER') {
          if (item.source_channel !== 'MANUFACTURER' && item.source_channel !== 'DISTRIBUTOR') return false;
        } else if (item.source_channel !== sourceFilter) {
          return false;
        }
      }

      // 3. Distance Filter
      const dist = (item.distance_tier || (item.distance && item.distance > 50 ? 'far' : 'near') || 'near').toLowerCase();
      if (activeDist !== 'all' && dist !== activeDist) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'all') {
        const s = String(item.status || '').toLowerCase();
        if (statusFilter === 'transit' && !['in_transit', 'dispatched', 'transit'].includes(s)) return false;
        else if (statusFilter === 'delivered' && !['delivered', 'received'].includes(s)) return false;
        else if (statusFilter === 'pending' && !['placed', 'requested', 'pending'].includes(s)) return false;
        else if (statusFilter !== 'transit' && statusFilter !== 'delivered' && statusFilter !== 'pending' && s !== statusFilter) return false;
      }

      // 5. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const poNum = String(item.po_number || item.id || '').toLowerCase();
        const pName = String(item.partner_name || item.store_name || item.supplier_name || '').toLowerCase();
        const city = String(item.partner_city || item.location || '').toLowerCase();
        const itemsText = Array.isArray(item.items) ? item.items.map(i => i.item_name || i.name || '').join(' ').toLowerCase() : String(item.items || '').toLowerCase();

        return poNum.includes(q) || pName.includes(q) || city.includes(q) || itemsText.includes(q);
      }

      return true;
    });
  }, [orders, directionFilter, sourceFilter, activeDist, statusFilter, searchQuery]);

  return (
    <section id="sec-partner" className="space-y-5 fade-in max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-black uppercase tracking-wider">
              B2B Commerce Hub
            </span>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-bold text-gray-500">Universal Sourcing &amp; Wholesale</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <span>B2B Store Orders</span>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {orders.length} Total
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage all inventory restock purchases (Nearby Kiranas, Brand Stores, Factories) and wholesale orders you fulfill.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={refreshOrders}
            className="btn-soft !text-xs !py-2 !px-3 font-bold flex items-center gap-1.5"
            title="Refresh Orders"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin text-orange-600' : 'text-gray-500'}`}></i>
            <span>Refresh</span>
          </button>

          <Link
            to="/creditterms"
            className="card px-3 py-2 text-left text-xs border-orange-200 bg-orange-50 hover:bg-orange-100 transition shadow-xs flex items-center gap-2"
          >
            <i className="fa-solid fa-handshake-angle text-orange-600 text-sm"></i>
            <div>
              <div className="font-extrabold text-orange-950 leading-tight">B2B Khata Credit</div>
              <div className="text-[10px] text-orange-700">14 Days • min ₹5,000</div>
            </div>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total B2B Volume */}
        <div className="card p-3.5 sm:p-4 border border-gray-200/80 bg-white space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-bold">Total B2B Volume</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-receipt"></i>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            ₹{totalVolume.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-gray-400 font-medium">
            {orders.length} total purchase &amp; sales orders
          </div>
        </div>

        {/* You Bought (Procurement) */}
        <div className="card p-3.5 sm:p-4 border border-orange-200 bg-gradient-to-br from-white to-orange-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs text-orange-900">
            <span className="font-bold">You Bought (Stock In)</span>
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-xs">
              <i className="fa-solid fa-arrow-down-left"></i>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-700">
            {boughtOrders.length} orders
          </div>
          <div className="text-[11px] text-orange-800/80 font-medium">
            ₹{boughtOrders.reduce((a, b) => a + Number(b.total_amount || 0), 0).toLocaleString('en-IN')} restock spend
          </div>
        </div>

        {/* You Sold (Wholesale) */}
        <div className="card p-3.5 sm:p-4 border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-900">
            <span className="font-bold">You Sold (Wholesale)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
              <i className="fa-solid fa-arrow-up-right"></i>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {soldOrders.length} orders
          </div>
          <div className="text-[11px] text-emerald-800/80 font-medium">
            ₹{soldOrders.reduce((a, b) => a + Number(b.total_amount || 0), 0).toLocaleString('en-IN')} wholesale sales
          </div>
        </div>

        {/* In Transit / Moving */}
        <div className="card p-3.5 sm:p-4 border border-blue-200 bg-gradient-to-br from-white to-blue-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-900">
            <span className="font-bold">Active in Transit</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
              <i className="fa-solid fa-truck-fast"></i>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700">
            {inTransitCount} shipments
          </div>
          <div className="text-[11px] text-blue-800/80 font-medium">
            Moving via Porter &amp; Freight trucks
          </div>
        </div>
      </div>

      {/* Sourcing Channel Shortcut Quick Bar */}
      <div className="card p-3.5 border border-gray-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Sourcing Channel:</span>
          
          <button
            type="button"
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              sourceFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Sources ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setSourceFilter('NEARBY_KIRANA')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              sourceFilter === 'NEARBY_KIRANA'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <span>📍 Nearby Kiranas</span>
            <span className="text-[10px] opacity-80">({nearbyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceFilter('OTHER_STORE_BRANDS')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              sourceFilter === 'OTHER_STORE_BRANDS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span>🏷️ Other Store Brands</span>
            <span className="text-[10px] opacity-80">({brandsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceFilter('MANUFACTURER')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              sourceFilter === 'MANUFACTURER'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60'
            }`}
          >
            <span>🏭 Factories &amp; Dist.</span>
            <span className="text-[10px] opacity-80">({mfgCount})</span>
          </button>
        </div>

        {/* Quick links to procurement pages */}
        <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 text-xs">
          <Link
            to="/buy"
            className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
          >
            <i className="fa-solid fa-plus-circle"></i> Settle in Nearby
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to="/partnerbrands"
            className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
          >
            <i className="fa-solid fa-handshake"></i> Browse Other Brands
          </Link>
        </div>
      </div>

      {/* Primary Direction & Distance Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Direction Tabs: All vs Bought vs Sold */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDirectionFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              directionFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Directions ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setDirectionFilter('BOUGHT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              directionFilter === 'BOUGHT'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-orange-50'
            }`}
          >
            <i className="fa-solid fa-arrow-down-left text-[10px]"></i>
            <span>You Bought ({boughtOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setDirectionFilter('SOLD')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              directionFilter === 'SOLD'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50'
            }`}
          >
            <i className="fa-solid fa-arrow-up-right text-[10px]"></i>
            <span>You Sold ({soldOrders.length})</span>
          </button>
        </div>

        {/* Distance Filter Chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveDist('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              activeDist === 'all' ? 'tab-on' : 'tab-off'
            }`}
          >
            All Distance
          </button>
          <button
            type="button"
            onClick={() => setActiveDist('near')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              activeDist === 'near' ? 'tab-on' : 'tab-off'
            }`}
          >
            Nearby (&lt;50 km) ({nearCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveDist('far')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              activeDist === 'far' ? 'tab-on' : 'tab-off'
            }`}
          >
            Interstate ({farCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveDist('export')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              activeDist === 'export' ? 'tab-on' : 'tab-off'
            }`}
          >
            Export ({exportCount})
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-3 flex flex-col sm:flex-row gap-2.5 flex-wrap bg-white border border-gray-200">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order #, Partner Store, City, Items..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm outline-none focus:border-orange-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-white font-medium text-gray-700 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Placed / Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="packing">Packing</option>
          <option value="transit">In Transit / Dispatched</option>
          <option value="delivered">Delivered / Received</option>
          <option value="declined">Declined / Cancelled</option>
        </select>
      </div>

      {/* Orders Data Table */}
      <div className="card overflow-hidden border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left min-w-[850px]">
            <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-extrabold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3.5">Order</th>
                <th className="px-4 py-3.5">Partner / Store</th>
                <th className="px-4 py-3.5">Type &amp; Source</th>
                <th className="px-4 py-3.5">Items Manifest</th>
                <th className="px-4 py-3.5">Amount &amp; Terms</th>
                <th className="px-4 py-3.5">Logistics</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-gray-500">
                    <i className="fa-solid fa-spinner fa-spin mr-2 text-orange-600 text-lg"></i>
                    <span>Loading B2B Store Orders...</span>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-rose-600 text-xs">
                    <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
                    <span>{error}</span>
                  </td>
                </tr>
              )}

              {!loading && !error && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-gray-400">
                    <i className="fa-solid fa-store-slash text-4xl mb-2 text-gray-300"></i>
                    <p className="font-bold text-gray-700">No B2B orders match the selected filters.</p>
                    <p className="text-xs text-gray-400 mt-1">Try resetting the filters or check your other sourcing channels.</p>
                  </td>
                </tr>
              )}

              {!loading && !error && filteredOrders.map((order, idx) => {
                const displayId = order.po_number || (order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : `#P-${idx + 8800}`);
                const isBought = order.order_direction === 'BOUGHT';
                const status = String(order.status || 'PLACED').toUpperCase();
                const totalAmt = Number(order.total_amount || 0);

                // Items summary string
                const itemsList = Array.isArray(order.items) ? order.items : [];
                const itemsSummary = itemsList.length > 0
                  ? `${itemsList[0].item_name || 'Goods'} ${itemsList.length > 1 ? `+${itemsList.length - 1} more` : `(x${itemsList[0].quantity || 1})`}`
                  : (order.notes || 'Wholesale Lot');

                return (
                  <tr
                    key={order.id || idx}
                    className="hover:bg-orange-50/40 transition group cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Order ID & Time */}
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-gray-900 group-hover:text-orange-700 transition flex items-center gap-1.5">
                        <span>{displayId}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>

                    {/* Partner Store */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900 leading-tight">
                        {order.partner_name || 'Partner Store'}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{order.partner_city || 'Surat'}</span>
                        <span className="text-gray-300">•</span>
                        <span className="font-semibold text-emerald-700">{order.distance || 12.5} km</span>
                      </div>
                    </td>

                    {/* Type & Channel */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-black ${
                          isBought ? 'text-orange-700' : 'text-emerald-700'
                        }`}>
                          <i className={`fa-solid ${isBought ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}`}></i>
                          <span>{isBought ? 'You Bought' : 'You Sold'}</span>
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md w-fit">
                          {order.source_label || 'Direct B2B'}
                        </span>
                      </div>
                    </td>

                    {/* Items Manifest */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs font-semibold text-gray-800 truncate max-w-[170px]" title={itemsSummary}>
                        {itemsSummary}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {itemsList.length} item line{itemsList.length === 1 ? '' : 's'}
                      </div>
                    </td>

                    {/* Amount & Terms */}
                    <td className="px-4 py-3.5">
                      <div className="font-black text-gray-900">
                        ₹{totalAmt.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-purple-800 font-semibold mt-0.5">
                        {order.payment_terms === 'ADVANCE_UPI' 
                          ? 'Instant UPI' 
                          : order.payment_terms?.includes('CREDIT') 
                            ? '14d Khata' 
                            : (order.payment_terms || '14d Credit')}
                      </div>
                    </td>

                    {/* Logistics */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-xs text-blue-700 flex items-center gap-1">
                        <i className="fa-solid fa-truck text-[11px]"></i>
                        <span>{order.freight_partner || 'Porter'}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {order.distance_tier === 'near' ? 'Local Truck' : 'Interstate'}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                        status === 'DELIVERED' || status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'IN_TRANSIT' || status === 'DISPATCHED'
                            ? 'bg-blue-100 text-blue-800'
                            : status === 'PACKING'
                              ? 'bg-purple-100 text-purple-800'
                              : status === 'DECLINED' || status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span>{status}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 transition"
                      >
                        Details <i className="fa-solid fa-chevron-right ml-1 text-[10px]"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logistics Guidance Footer Card */}
      <div className="card p-4 bg-orange-50/80 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center text-base shrink-0">
            <i className="fa-solid fa-truck"></i>
          </div>
          <div className="text-xs text-orange-950">
            <strong className="block font-black text-sm text-orange-900">
              Universal Store Logistics: No Distance Limit
            </strong>
            <span>
              Orders under 50 km dispatch via Porter tempo / 3-wheeler. Interstate orders route via Delhivery Freight.
              When stock arrives, 1-click updates your digital store inventory automatically.
            </span>
          </div>
        </div>

        <Link
          to="/freight"
          className="btn-primary !text-xs !py-2 !px-4 font-bold shrink-0 self-start sm:self-auto"
        >
          <i className="fa-solid fa-satellite-dish mr-1.5"></i>
          <span>Track Freight Fleet</span>
        </Link>
      </div>

      {/* Order Detail Modal Drawer */}
      {selectedOrder && (
        <B2BOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (orderId, status, metadata) => {
            const updated = await updateStatus(orderId, status, metadata);
            // Sync current selected order with new data
            if (updated) {
              setSelectedOrder(prev => ({ ...prev, ...updated, status }));
            }
          }}
        />
      )}
    </section>
  );
}
