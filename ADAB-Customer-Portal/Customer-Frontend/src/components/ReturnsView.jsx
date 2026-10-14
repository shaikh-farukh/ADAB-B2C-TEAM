import React, { useState, useEffect, useRef } from 'react';
import { ReturnAPI, OrderAPI } from '../services/api';

/**
 * Returns & Replacements View (sec-returns)
 * 100% Design Parity with unified-customer-portal-demo.html:
 * - New Return Flow: item-level selection, return reason, condition, pickup slot
 * - Photo Evidence: upload URL/file preview before submission
 * - Return Status Cards: pills (REQUESTED, APPROVED, ITEM_PICKED, COMPLETED, REJECTED) & pickup countdown
 * - Refund Tracker: live refund status indicator (INITIATED, PROCESSED, FAILED) & refund mode badge
 */
export default function ReturnsView({
  onBack,
  onNavigate,
  showToast = () => {},
  preselectedOrder = null
}) {
  const [returnsList, setReturnsList] = useState([]);
  const [refundsList, setRefundsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('returns'); // 'returns' | 'refunds'

  // New Return Modal State
  const [isNewReturnModalOpen, setIsNewReturnModalOpen] = useState(Boolean(preselectedOrder));
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(preselectedOrder);
  const [selectedItems, setSelectedItems] = useState(() => {
    if (preselectedOrder?.items && preselectedOrder.items.length > 0) {
      return { [preselectedOrder.items[0].id]: 1 };
    }
    return {};
  });
  const [returnReason, setReturnReason] = useState('');
  const [itemCondition, setItemCondition] = useState('UNOPENED');
  const [pickupSlot, setPickupSlot] = useState('Tomorrow 9:00 AM – 1:00 PM');
  const [refundMode, setRefundMode] = useState('UPI');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Hidden file input ref for device / camera photo selection
  const fileInputRef = useRef(null);

  // Evidence Preview Modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  // Status timeline modal
  const [selectedReturnDetail, setSelectedReturnDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch Returns and Refunds on mount
  const refreshData = async () => {
    setLoading(true);
    try {
      const [returnsRes, refundsRes] = await Promise.allSettled([
        ReturnAPI.getReturns(),
        ReturnAPI.getRefunds()
      ]);

      if (returnsRes.status === 'fulfilled' && returnsRes.value?.data) {
        setReturnsList(returnsRes.value.data);
      }
      if (refundsRes.status === 'fulfilled' && refundsRes.value?.data) {
        setRefundsList(refundsRes.value.data);
      }
    } catch (err) {
      console.warn('Could not fetch returns or refunds:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Pre-selected order from Order Detail view
  useEffect(() => {
    if (preselectedOrder) {
      setSelectedOrder(preselectedOrder);
      const initialItems = {};
      if (preselectedOrder.items && preselectedOrder.items.length > 0) {
        initialItems[preselectedOrder.items[0].id] = 1;
      }
      setSelectedItems(initialItems);
      setIsNewReturnModalOpen(true);
    }
  }, [preselectedOrder]);

  // Load delivered orders when opening modal
  const handleOpenNewReturnModal = async () => {
    setIsNewReturnModalOpen(true);
    if (!selectedOrder) {
      setLoadingOrders(true);
      try {
        const ordersRes = await OrderAPI.getCustomerOrders();
        const orders = ordersRes?.data || [];
        const delivered = orders.filter((o) => (o.order_status || '').toUpperCase() === 'DELIVERED');
        setDeliveredOrders(delivered);
        if (delivered.length > 0) {
          setSelectedOrder(delivered[0]);
          const initialItems = {};
          if (delivered[0].items && delivered[0].items.length > 0) {
            initialItems[delivered[0].items[0].id] = 1;
          }
          setSelectedItems(initialItems);
        }
      } catch (err) {
        console.warn('Could not load delivered orders:', err.message);
      } finally {
        setLoadingOrders(false);
      }
    }
  };

  // Toggle item selection in return modal
  const handleToggleItem = (itemId, maxQty = 1) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = 1;
      }
      return next;
    });
  };

  // Change quantity of selected item
  const handleItemQtyChange = (itemId, qty, maxQty) => {
    const val = Math.max(1, Math.min(maxQty, Number(qty) || 1));
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: val
    }));
  };

  // Handle device / camera file upload for return evidence
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      showToast('⚠️ Only image files (JPEG, PNG, WebP) are allowed');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target.result;
      try {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            setEvidenceUrl(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            setEvidenceUrl(rawDataUrl);
          }
        };
        img.onerror = () => setEvidenceUrl(rawDataUrl);
        img.src = rawDataUrl;
      } catch {
        setEvidenceUrl(rawDataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Submit return request
  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!selectedOrder) {
      showToast('⚠️ Please select an order to return');
      return;
    }

    const itemEntries = Object.entries(selectedItems);
    if (itemEntries.length === 0) {
      showToast('⚠️ Please select at least one item to return');
      return;
    }

    if (!returnReason || !returnReason.trim()) {
      showToast('⚠️ Please provide a reason for the return');
      return;
    }

    setSubmittingReturn(true);
    try {
      const itemsPayload = itemEntries.map(([order_item_id, quantity]) => ({
        order_item_id,
        quantity,
        condition: itemCondition
      }));

      const fullReason = `${returnReason.trim()} · Condition: ${itemCondition} · Slot: ${pickupSlot}`;

      const res = await ReturnAPI.createReturn(selectedOrder.id, {
        reason: fullReason,
        items: itemsPayload,
        evidence_url: evidenceUrl.trim() || null,
        refund_mode: refundMode
      });

      if (res?.data) {
        showToast('✓ Return request submitted successfully');
        setIsNewReturnModalOpen(false);
        // Reset form
        setSelectedItems({});
        setReturnReason('');
        setEvidenceUrl('');
        setSelectedOrder(null);
        await refreshData();
      }
    } catch (err) {
      console.error('Error submitting return:', err);
      showToast(`❌ ${err.message || 'Failed to submit return request'}`);
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Cancel return request
  const handleCancelReturn = async (returnId) => {
    if (!window.confirm('Are you sure you want to cancel this return request?')) return;

    try {
      await ReturnAPI.cancelReturn(returnId);
      showToast('✓ Return request cancelled');
      await refreshData();
    } catch (err) {
      console.error('Error cancelling return:', err);
      showToast(`❌ ${err.message || 'Failed to cancel return'}`);
    }
  };

  // View return details
  const handleViewReturnDetails = async (returnId) => {
    setLoadingDetail(true);
    try {
      const res = await ReturnAPI.getReturnById(returnId);
      if (res?.data) {
        setSelectedReturnDetail(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch return details:', err);
      showToast('⚠️ Could not fetch return details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Return Status Pill Renderer
  const renderStatusPill = (status) => {
    const s = (status || 'REQUESTED').toUpperCase();
    switch (s) {
      case 'REQUESTED':
        return (
          <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <i className="fa-solid fa-clock text-[9px]"></i>
            <span>Review · Requested</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <i className="fa-solid fa-check text-[9px]"></i>
            <span>Approved</span>
          </span>
        );
      case 'ITEM_PICKED':
        return (
          <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <i className="fa-solid fa-box text-[9px]"></i>
            <span>Item Picked</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="text-[10px] font-extrabold bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <i className="fa-solid fa-circle-check text-[9px]"></i>
            <span>Completed</span>
          </span>
        );
      case 'REJECTED':
      default:
        return (
          <span className="text-[10px] font-extrabold bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <i className="fa-solid fa-ban text-[9px]"></i>
            <span>{s === 'REJECTED' ? 'Rejected / Cancelled' : s}</span>
          </span>
        );
    }
  };

  // Refund Status Pill Renderer
  const renderRefundStatusPill = (status, amount) => {
    const s = (status || 'INITIATED').toUpperCase();
    switch (s) {
      case 'PROCESSED':
        return (
          <span className="text-[10px] font-extrabold bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <i className="fa-solid fa-check-double text-[9px]"></i>
            <span>Refunded ₹{parseFloat(amount || 0).toFixed(2)}</span>
          </span>
        );
      case 'INITIATED':
        return (
          <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <i className="fa-solid fa-spinner fa-spin text-[9px]"></i>
            <span>Refund Initiated (₹{parseFloat(amount || 0).toFixed(2)})</span>
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <i className="fa-solid fa-triangle-exclamation text-[9px]"></i>
            <span>Refund Failed</span>
          </span>
        );
    }
  };

  return (
    <section id="sec-returns" className="pt-2 pb-6 space-y-4 max-w-3xl mx-auto w-full">
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 hover:text-black flex items-center justify-center cursor-pointer shadow-xs transition"
              title="Back"
            >
              <i className="fa-solid fa-arrow-left text-xs"></i>
            </button>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-[#0F172A]">Returns &amp; Replacements</h2>
            <p className="text-xs text-gray-500">Track return requests, pickup slots, and refund status</p>
          </div>
        </div>

        {/* New Return Request Action matching unified-customer-portal-demo.html */}
        <button
          type="button"
          onClick={handleOpenNewReturnModal}
          className="green-btn !py-2.5 !px-4 !text-xs !w-auto cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>New return request</span>
        </button>
      </div>

      {/* Segmented Control: Returns List vs Refunds Tracker */}
      <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`flex-1 py-2 text-center rounded-lg transition cursor-pointer ${
            activeTab === 'returns' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'
          }`}
        >
          Returns ({returnsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('refunds')}
          className={`flex-1 py-2 text-center rounded-lg transition cursor-pointer ${
            activeTab === 'refunds' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'
          }`}
        >
          Refunds Tracker ({refundsList.length})
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse pt-2">
          <div className="h-28 bg-gray-100 rounded-2xl"></div>
          <div className="h-28 bg-gray-100 rounded-2xl"></div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. RETURNS LIST TAB                                           */}
      {/* ============================================================== */}
      {!loading && activeTab === 'returns' && (
        <div className="space-y-3">
          {returnsList.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center text-xl mx-auto">
                <i className="fa-solid fa-rotate-left"></i>
              </div>
              <h3 className="font-extrabold text-sm text-gray-800">No Return Requests</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Items delivered within the return window can be returned or replaced with free home pickup.
              </p>
              <button
                type="button"
                onClick={handleOpenNewReturnModal}
                className="green-btn !py-2.5 !w-auto !px-5 text-xs font-bold mx-auto cursor-pointer mt-2"
              >
                + Request a Return
              </button>
            </div>
          ) : (
            returnsList.map((ret, idx) => {
              const returnCode = `#R-${ret.id.slice(0, 4).toUpperCase()}`;
              const status = (ret.status || 'REQUESTED').toUpperCase();
              const isRequested = status === 'REQUESTED';
              const itemsList = ret.items || [];
              const firstItemTitle = itemsList[0]?.product_name || 'Product';
              const isAmber = isRequested;

              return (
                <div
                  key={ret.id || idx}
                  className={`rounded-xl p-4 transition shadow-xs ${
                    isAmber ? 'border border-amber-200 bg-amber-50/60' : 'border border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        <span>{`${returnCode} · ${firstItemTitle}`}</span>
                        {itemsList.length > 1 && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                            +{itemsList.length - 1} more
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
                        Order #{ret.order_number || 'N/A'} · Refund: ₹{parseFloat(ret.refund_amount || 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {renderStatusPill(status)}
                    </div>
                  </div>

                  {/* Return details & pickup countdown */}
                  <div className="text-xs text-gray-600 mt-2.5 flex items-center justify-between border-t border-gray-100/60 pt-2 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-truck-ramp-box text-gray-400"></i>
                      <span>
                        {status === 'REQUESTED'
                          ? 'Pickup in 48 hrs'
                          : status === 'APPROVED'
                          ? 'Pickup scheduled · Tomorrow'
                          : status === 'ITEM_PICKED'
                          ? 'Item received by rider · Inspection pending'
                          : status === 'COMPLETED'
                          ? 'Inspection passed · Refund processed'
                          : 'Return rejected or cancelled'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ret.evidence_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(ret.evidence_url)}
                          className="text-[11px] text-brand-green font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-regular fa-image"></i>
                          <span>Evidence</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleViewReturnDetails(ret.id)}
                        className="text-[11px] text-gray-700 font-bold hover:underline cursor-pointer"
                      >
                        Timeline →
                      </button>

                      {isRequested && (
                        <button
                          type="button"
                          onClick={() => handleCancelReturn(ret.id)}
                          className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer ml-1"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. REFUNDS TRACKER TAB                                         */}
      {/* ============================================================== */}
      {!loading && activeTab === 'refunds' && (
        <div className="space-y-3">
          {refundsList.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center space-y-2 shadow-xs">
              <i className="fa-solid fa-hand-holding-dollar text-3xl text-gray-400"></i>
              <div className="font-bold text-sm text-gray-800">No Refunds on Record</div>
              <p className="text-xs text-gray-500">
                Refunds from returned orders or cancelled items will appear here automatically with instant tracking.
              </p>
            </div>
          ) : (
            refundsList.map((ref, idx) => {
              const status = (ref.refund_status || 'INITIATED').toUpperCase();
              const mode = (ref.refund_mode || 'UPI').toUpperCase();

              return (
                <div
                  key={ref.id || idx}
                  className="border border-gray-100 bg-white rounded-xl p-4 shadow-xs space-y-2.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        <span>Refund #{ref.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {mode}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Amount: <strong className="text-gray-900">₹{parseFloat(ref.amount || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div>{renderRefundStatusPill(status, ref.amount)}</div>
                  </div>

                  <div className="text-xs text-gray-500 flex justify-between items-center border-t border-gray-50 pt-2">
                    <span>
                      {status === 'PROCESSED'
                        ? 'Credited to your account'
                        : status === 'INITIATED'
                        ? 'Estimated credit within 2–4 hours'
                        : 'Contact support for refund retry'}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {new Date(ref.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. NEW RETURN FLOW MODAL (ITEM SELECTION & REASON & SLOTS)     */}
      {/* ============================================================== */}
      {isNewReturnModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-rotate-left text-brand-green text-lg"></i>
                <h3 className="font-extrabold text-base text-gray-900">Request Return / Replacement</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewReturnModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-4">
              {/* Step 1: Select Order */}
              {deliveredOrders.length > 1 && !preselectedOrder && (
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-700">1. Select Delivered Order</label>
                  <select
                    value={selectedOrder?.id || ''}
                    onChange={(e) => {
                      const o = deliveredOrders.find((ord) => ord.id === e.target.value);
                      setSelectedOrder(o);
                      setSelectedItems({});
                    }}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 font-semibold focus:border-brand-green outline-none"
                  >
                    {deliveredOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        {`#${ord.order_number || ord.id.slice(0, 8)} · ₹${parseFloat(ord.grand_total || 0).toFixed(2)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 2: Item Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700">
                  {`Select Items to Return from Order #${selectedOrder?.order_number || selectedOrder?.id?.slice(0, 8) || ''}`}
                </label>

                {loadingOrders ? (
                  <div className="p-4 text-center text-xs text-gray-500">Loading order items...</div>
                ) : !selectedOrder?.items || selectedOrder.items.length === 0 ? (
                  <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
                    No itemized products found for this order.
                  </div>
                ) : (
                  <div className="space-y-2 border border-gray-100 rounded-xl p-3 bg-gray-50/50 max-h-48 overflow-y-auto">
                    {selectedOrder.items.map((item) => {
                      const isChecked = Boolean(selectedItems[item.id]);
                      const maxQty = item.quantity || 1;
                      const selectedQty = selectedItems[item.id] || 1;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded-lg border transition ${
                            isChecked ? 'bg-white border-brand-green/40 shadow-xs' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1 mr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem(item.id, maxQty)}
                              className="accent-brand-green rounded cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-gray-900 leading-tight">
                                {item.product_name || 'Item'}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                ₹{parseFloat(item.price_at_order || item.unit_price || 0).toFixed(2)} each (Qty ordered: {maxQty})
                              </div>
                            </div>
                          </label>

                          {isChecked && maxQty > 1 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-gray-500 font-bold">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                max={maxQty}
                                value={selectedQty}
                                onChange={(e) => handleItemQtyChange(item.id, e.target.value, maxQty)}
                                className="w-12 border border-gray-300 rounded p-1 text-center text-xs font-bold"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Return Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700">Reason for Return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 font-semibold focus:border-brand-green outline-none"
                >
                  <option value="">-- Choose reason --</option>
                  <option value="Wrong size or product received">Wrong size or product received</option>
                  <option value="Defective / Broken / Damaged item">Defective / Broken / Damaged item</option>
                  <option value="Quality not as expected">Quality not as expected</option>
                  <option value="Expired or close to expiry date">Expired or close to expiry date</option>
                  <option value="Item not matching pictures or description">Item not matching pictures or description</option>
                  <option value="Other / Changed mind">Other / Changed mind</option>
                </select>
              </div>

              {/* Step 4: Item Condition & Pickup Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-gray-700">Item Condition</label>
                  <select
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2 text-xs text-gray-800 font-semibold focus:border-brand-green outline-none"
                  >
                    <option value="UNOPENED">Unopened (Original Box)</option>
                    <option value="OPENED_UNUSED">Opened (Unused)</option>
                    <option value="DAMAGED">Damaged / Defective</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-gray-700">Refund Preference</label>
                  <select
                    value={refundMode}
                    onChange={(e) => setRefundMode(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2 text-xs text-gray-800 font-semibold focus:border-brand-green outline-none"
                  >
                    <option value="UPI">UPI (Fastest · 2-4 hrs)</option>
                    <option value="WALLET">ADAB Wallet (Instant)</option>
                    <option value="CARD">Original Payment Card</option>
                  </select>
                </div>
              </div>

              {/* Pickup Slot Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700">Pickup Time Slot</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    'Tomorrow 9 AM – 1 PM',
                    'Tomorrow 2 PM – 6 PM',
                    'Day After 10 AM – 2 PM'
                  ].map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => setPickupSlot(slot)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer ${
                        pickupSlot === slot
                          ? 'border-brand-green bg-green-50 text-brand-green'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 5: Photo Evidence with Live Thumbnail Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 flex justify-between items-center">
                  <span>Photo Evidence (Optional)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Helps instant approval</span>
                </label>

                {/* Hidden native file input for return evidence */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="return-photo-file-input"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#18753C] border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
                    title="Upload photo from device / camera"
                  >
                    <i className="fa-solid fa-camera text-xs"></i>
                    <span>Upload Photo</span>
                  </button>

                  <div className="flex-1 flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/photos/item_damage.jpg"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:border-brand-green outline-none"
                    />
                    {evidenceUrl && (
                      <button
                        type="button"
                        onClick={() => setEvidenceUrl('')}
                        className="px-2.5 py-1 text-xs text-gray-400 hover:text-red-500 cursor-pointer"
                        title="Clear photo"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Evidence Photo Preview */}
                {evidenceUrl && (
                  <div className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-xl mt-1">
                    <img
                      src={evidenceUrl}
                      alt="Evidence preview"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/100x100?text=Invalid+Image';
                      }}
                    />
                    <div className="text-xs text-gray-600">
                      <div className="font-bold">Photo preview verified</div>
                      <div className="text-[10px] text-gray-400">Attached to return inspection metadata</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="green-btn !py-3.5 !text-sm font-extrabold w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingReturn ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                      <span>Submitting Return Request...</span>
                    </>
                  ) : (
                    <span>Submit Return Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PHOTO PREVIEW MODAL                                         */}
      {/* ============================================================== */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl space-y-3 p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-xs text-gray-800">Return Photo Evidence</span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="text-gray-500 hover:text-black cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <img
              src={previewPhotoUrl}
              alt="Evidence photo"
              className="w-full max-h-80 object-contain rounded-lg border border-gray-200"
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. RETURN DETAIL TIMELINE MODAL                                */}
      {/* ============================================================== */}
      {selectedReturnDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-gray-100">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">
                  Return #{selectedReturnDetail.id.slice(0, 8).toUpperCase()}
                </h3>
                <span className="text-[10px] text-gray-500">Status &amp; Inspection Audit</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Status History Timeline */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-700">Timeline Milestones</div>
              <div className="space-y-2 border-l-2 border-brand-green/30 pl-3 ml-2">
                {selectedReturnDetail.history && selectedReturnDetail.history.length > 0 ? (
                  selectedReturnDetail.history.map((h, i) => (
                    <div key={h.id || i} className="text-xs space-y-0.5 relative">
                      <div className="w-2 h-2 rounded-full bg-brand-green absolute -left-[17px] top-1"></div>
                      <div className="font-bold text-gray-800 uppercase text-[11px]">{h.status}</div>
                      {h.notes && <div className="text-gray-500 text-[10px]">{h.notes}</div>}
                      <div className="text-[10px] text-gray-400">
                        {new Date(h.created_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500">Initial request recorded.</div>
                )}
              </div>
            </div>

            {/* Return Items Breakdown */}
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="text-xs font-bold text-gray-700">Items in Return</div>
              {selectedReturnDetail.items?.map((it) => (
                <div key={it.id} className="text-xs flex justify-between text-gray-600 bg-gray-50 p-2 rounded-lg">
                  <span>{it.product_name} (×{it.quantity})</span>
                  <span className="font-bold text-gray-900">₹{parseFloat(it.refund_amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
