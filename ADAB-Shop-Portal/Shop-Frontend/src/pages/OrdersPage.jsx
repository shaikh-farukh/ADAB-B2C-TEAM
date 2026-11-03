import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';
import L from 'leaflet';
import OrderItemsModal from '../components/orders/OrderItemsModal';

function DeclineOrderModal({ order, onClose, onConfirm }) {
  if (!order) return null;
  const { t } = useTranslation();
  const reasons = [
    { id: 'stock', label: t('reasonOutOfStock', 'Item(s) Out of Stock'), icon: 'fa-box-open' },
    { id: 'busy', label: t('reasonStoreBusy', 'Store is Closing / Too Busy'), icon: 'fa-clock' },
    { id: 'distance', label: t('reasonOutsideReach', 'Delivery Address Outside Reach'), icon: 'fa-route' },
    { id: 'customer', label: t('reasonCustomerRequested', 'Customer Requested Cancellation'), icon: 'fa-user-xmark' },
    { id: 'pricing', label: t('reasonPriceMismatch', 'Price / Catalog Mismatch'), icon: 'fa-tag' }
  ];

  const [selectedReason, setSelectedReason] = useState(reasons[0].label);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '—';
  const displayCustomer = order.customer || order.customer_name || t('colCustomer', 'Customer');

  const handleDecline = async () => {
    setSubmitting(true);
    await onConfirm(order.id, selectedReason, note);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-orange-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold shadow-2xs">
              <i className="fa-solid fa-ban"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">{t('declineModalTitle', 'Decline Order • {id}', { id: displayId })}</h3>
              <p className="text-[11px] text-gray-500">{t('orderModalCustomer', 'Customer: ')}<span className="font-semibold text-gray-700">{displayCustomer}</span></p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center text-sm font-bold shadow-2xs cursor-pointer"
            title={t('orderModalClose', 'Close')}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs font-semibold text-gray-700">{t('declineModalPrompt', 'Please choose a reason for declining this order:')}</p>
          <div className="space-y-2">
            {reasons.map((r) => (
              <label 
                key={r.id} 
                onClick={() => setSelectedReason(r.label)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${selectedReason === r.label ? 'border-rose-300 bg-rose-50/60 text-rose-900 font-bold' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
              >
                <span className="flex items-center gap-2">
                  <i className={`fa-solid ${r.icon} text-gray-400 w-4 text-center ${selectedReason === r.label ? 'text-rose-600' : ''}`}></i>
                  <span>{r.label}</span>
                </span>
                <input 
                  type="radio" 
                  name="decline_reason" 
                  checked={selectedReason === r.label} 
                  onChange={() => setSelectedReason(r.label)}
                  className="accent-rose-600 cursor-pointer"
                />
              </label>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{t('declineInternalNote', 'Internal Note (Optional):')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('declineNotePlaceholder', 'e.g., ran out of inventory')}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-rose-400 outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-soft !py-1.5 !px-3 !text-xs font-bold cursor-pointer"
          >
            {t('declineBtnKeepOrder', 'Keep Order')}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className="fa-solid fa-ban text-xs"></i>
            {submitting ? t('declineBtnDeclining', 'Declining...') : t('declineBtnConfirm', 'Confirm Decline')}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderMapModal({ order, store, onClose, onUpdateStatus, onDecline }) {
  if (!order) return null;
  const { t } = useTranslation();
  const mapContainerRef = useRef(null);
  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '—';
  const displayCustomer = order.customer || order.customer_name || t('colCustomer', 'Customer');
  const addr = order.delivery_address || {};
  const addrText = [addr.address_line, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || t('orderModalNoAddress', 'No delivery address recorded');
  const addressString = addrText;
  const distance = order.distance != null ? parseFloat(order.distance) : null;

  // Active Store Location and Details from database
  const storeName = store?.store_name || 'Store';
  const hasStoreCoords = store?.latitude != null && store?.longitude != null;
  const storeLat = hasStoreCoords ? Number(store.latitude) : null;
  const storeLng = hasStoreCoords ? Number(store.longitude) : null;
  const radiusKm = Number(store?.delivery_radius_km ?? 0);

  // Exact Customer Coordinates from delivery_address in orders table
  const rawCustLat = addr.latitude ?? addr.lat ?? order.delivery_latitude ?? order.latitude ?? null;
  const rawCustLng = addr.longitude ?? addr.lng ?? order.delivery_longitude ?? order.longitude ?? null;
  const hasCustomerCoords = rawCustLat != null && rawCustLng != null && !isNaN(Number(rawCustLat)) && !isNaN(Number(rawCustLng));
  const custLat = hasCustomerCoords ? Number(rawCustLat) : null;
  const custLng = hasCustomerCoords ? Number(rawCustLng) : null;

  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = async (e) => {
    if (e) e.stopPropagation();
    const coordsText = hasCustomerCoords ? `\nCoordinates: ${custLat.toFixed(6)}, ${custLng.toFixed(6)}` : '';
    const textToCopy = `${addressString}${coordsText}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.warn('Failed to copy address:', err);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || (!hasStoreCoords && !hasCustomerCoords)) return;
    try {
      const leaflet = typeof window !== 'undefined' ? (window.L || L) : null;
      if (!leaflet || !leaflet.map) return;

      const centerLat = hasStoreCoords ? storeLat : custLat;
      const centerLng = hasStoreCoords ? storeLng : custLng;

      const map = leaflet.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([centerLat, centerLng], 12);

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      if (hasStoreCoords && radiusKm > 0) {
        leaflet.circle([storeLat, storeLng], {
          radius: radiusKm * 1000,
          color: '#22C55E',
          fillColor: '#22C55E',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '6 4'
        }).addTo(map);
      }

      if (hasStoreCoords) {
        const storeIcon = leaflet.divIcon({
          className: 'border-0 bg-transparent',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
          html: '<div style="width:32px;height:32px;background:#15803D;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:pointer;"><i class="fa-solid fa-store"></i></div>'
        });
        leaflet.marker([storeLat, storeLng], { icon: storeIcon })
          .addTo(map)
          .bindPopup(`<b>${storeName}</b><br>${radiusKm} km delivery radius`);
      }

      if (hasCustomerCoords) {
        const customerIcon = leaflet.divIcon({
          className: 'border-0 bg-transparent',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
          html: '<div style="width:32px;height:32px;background:#2563EB;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:pointer;"><i class="fa-solid fa-location-dot"></i></div>'
        });
        leaflet.marker([custLat, custLng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`<b>${displayCustomer}</b><br>${addrText}${distance != null ? `<br><b>Distance:</b> ${distance} km` : ''}${hasCustomerCoords ? `<br><span style="font-family:monospace;font-size:10px;color:#2563eb;font-weight:bold;">📍 ${custLat.toFixed(6)}, ${custLng.toFixed(6)}</span>` : ''}`)
          .openPopup();
      }

      if (hasStoreCoords && hasCustomerCoords) {
        leaflet.polyline([[storeLat, storeLng], [custLat, custLng]], {
          color: '#3B82F6',
          weight: 2.5,
          dashArray: '6 6',
          opacity: 0.85
        }).addTo(map);

        map.fitBounds([
          [storeLat, storeLng],
          [custLat, custLng]
        ], { padding: [50, 50] });
      }

      return () => {
        map.remove();
      };
    } catch (e) {
      console.warn('Map initialization skipped:', e);
    }
  }, [hasStoreCoords, hasCustomerCoords, storeLat, storeLng, custLat, custLng, radiusKm, distance, displayCustomer, addrText, storeName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-map-location-dot text-blue-600"></i>
              <span>{t('mapModalTitle', 'Customer Location • {id}', { id: displayId })}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('orderModalCustomer', 'Customer: ')}<span className="font-semibold text-gray-700">{displayCustomer}</span>
              {distance != null && (
                <> • <span className="text-green-700 font-bold">{t('orderModalDistanceAway', '{distance} km away', { distance })}</span></>
              )}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors text-base font-bold shadow-xs cursor-pointer"
            title={t('orderModalClose', 'Close')}
          >
            &times;
          </button>
        </div>

        {/* Delivery Details */}
        <div className="p-4 bg-blue-50/40 border-b border-blue-100/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <div className="font-bold text-gray-900">{addr.full_name || displayCustomer}</div>
            <div className="text-gray-600 truncate">{addrText}</div>
            {order.customer_phone && (
              <div className="text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                <i className="fa-solid fa-phone text-[10px] text-gray-400"></i> {order.customer_phone}
              </div>
            )}
            {hasCustomerCoords ? (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200 mt-1.5 w-fit">
                <i className="fa-solid fa-location-crosshairs text-[10px] text-blue-600"></i>
                <span>{custLat.toFixed(6)}, {custLng.toFixed(6)}</span>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <i className="fa-solid fa-location-slash text-[9px]"></i>
                <span>{t('mapModalNoCoords', 'No GPS Coordinates')}</span>
              </div>
            )}
          </div>
          {radiusKm > 0 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 shrink-0">
              {t('ordersZoneBadge', 'Zone: {radius} km', { radius: radiusKm })}
            </span>
          )}
        </div>

        {/* Real Leaflet Map View */}
        <div className="relative h-72 w-full bg-gray-100 overflow-hidden flex items-center justify-center">
          {hasStoreCoords || hasCustomerCoords ? (
            <>
              <div ref={mapContainerRef} className="w-full h-full z-1"></div>
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-800 shadow-sm flex items-center gap-1.5 z-10 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>{t('mapModalStoreZone', '{storeName} Zone: {radius} km', { storeName, radius: radiusKm })}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500 p-4 text-center">
              {t('mapModalNoGps', 'GPS coordinates not recorded for this delivery address.')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <i className="fa-solid fa-motorcycle text-green-600"></i>
            <span>{t('mapModalDeliveryMode', 'Delivery Mode: {mode}', { mode: order.delivery_mode || t('deliveryBadgeNormal', 'Normal') })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleCopyAddress}
              className={`!py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 rounded-xl border transition cursor-pointer shadow-2xs active:scale-95 ${
                copiedAddress 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
              }`}
              title={t('mapModalCopyAddress', 'Copy Address')}
            >
              <i className={`fa-solid ${copiedAddress ? 'fa-check text-emerald-600' : 'fa-copy text-blue-600'}`}></i>
              <span>{copiedAddress ? t('mapModalCopied', 'Copied!') : t('mapModalCopyAddress', 'Copy Address')}</span>
            </button>
            {((order.status || '').toLowerCase() === 'new') && (
              <>
                <button 
                  type="button"
                  onClick={async () => {
                    await onUpdateStatus(order.id, 'packing');
                    onClose();
                  }}
                  className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                  {t('orderModalAcceptOrder', 'Accept Order')}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onDecline) onDecline(order);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-ban text-xs"></i>
                  {t('orderModalDecline', 'Decline')}
                </button>
              </>
            )}
            {((order.status || '').toLowerCase() === 'packing' || (order.status || '').toLowerCase() === 'processing') && (
              <>
                <button 
                  type="button"
                  onClick={async () => {
                    await onUpdateStatus(order.id, 'packed');
                    onClose();
                  }}
                  className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  <i className="fa-solid fa-box text-xs"></i>
                  {t('orderActionPack', 'Pack')}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onDecline) onDecline(order);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-ban text-xs"></i>
                  {t('orderModalDecline', 'Decline')}
                </button>
              </>
            )}
            {((order.status || '').toLowerCase() === 'packed') && (
              <>
                <button 
                  type="button"
                  onClick={async () => {
                    await onUpdateStatus(order.id, 'dispatched');
                    onClose();
                  }}
                  className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                  {t('orderActionSend', 'Send')}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onDecline) onDecline(order);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-ban text-xs"></i>
                  {t('orderModalDecline', 'Decline')}
                </button>
              </>
            )}
            {((order.status || '').toLowerCase() === 'dispatched' || (order.status || '').toLowerCase() === 'shipped') && (
              <button 
                type="button"
                onClick={async () => {
                  await onUpdateStatus(order.id, 'delivered');
                  onClose();
                }}
                className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
              >
                <i className="fa-solid fa-check-double text-xs"></i>
                {t('orderActionDelivered', 'Delivered')}
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="btn-soft !py-1.5 !px-3 !text-xs font-bold cursor-pointer"
            >
              {t('orderModalClose', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, onUpdateStatus, onViewItems, onOpenMap, onDecline, isUpdating = false }) {
  const { t } = useTranslation();

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">{t('statusBadgeNew', 'New')}</span>;
      case 'packing':
      case 'processing': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{t('statusBadgePacking', 'Packing')}</span>;
      case 'packed': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">{t('statusBadgePacked', 'Packed')}</span>;
      case 'dispatched':
      case 'shipped': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">{t('statusBadgeDispatched', 'Dispatched')}</span>;
      case 'ready': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">{t('statusBadgeReady', 'Ready')}</span>;
      case 'delivered': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">{t('statusBadgeDelivered', 'Delivered')}</span>;
      case 'cancelled':
      case 'declined': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">{t('statusBadgeDeclined', 'Declined')}</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">{status || t('statusBadgePending', 'Pending')}</span>;
    }
  };

  const getDeliveryBadge = (type) => {
    const dType = (type || '').toLowerCase();
    if (dType.includes('fast') || dType.includes('express')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">{t('deliveryBadgeFast', 'Fast 45m')}</span>;
    if (dType.includes('same')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{t('deliveryBadgeSame', 'Same-day')}</span>;
    if (dType.includes('pickup')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">{t('deliveryBadgePickup', 'Pickup')}</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">{t('deliveryBadgeNormal', 'Normal')}</span>;
  };

  const getActionBtn = (status) => {
    if (isUpdating) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 whitespace-nowrap select-none">
          <i className="fa-solid fa-spinner fa-spin text-[10px]"></i> {t('orderUpdating', 'Updating...')}
        </span>
      );
    }

    const s = (status || '').toLowerCase();
    if (s === 'new') {
      return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'packing'); }} 
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipAcceptOrder', 'Accept Order')}
          >
            {t('orderActionAccept', 'Accept')}
          </button>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onDecline(order); }} 
            className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipDeclineOrder', 'Decline Order')}
          >
            {t('orderActionDecline', 'Decline')}
          </button>
        </div>
      );
    }
    if (s === 'packing' || s === 'processing') {
      return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'packed'); }} 
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipPackOrder', 'Mark Order Packed')}
          >
            {t('orderActionPack', 'Pack')}
          </button>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onDecline(order); }} 
            className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipDeclineOrder', 'Decline Order')}
          >
            {t('orderActionDecline', 'Decline')}
          </button>
        </div>
      );
    }
    if (s === 'packed') {
      return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'dispatched'); }} 
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipSendPackage', 'Dispatch / Send Package')}
          >
            {t('orderActionSend', 'Send')}
          </button>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onDecline(order); }} 
            className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipDeclineOrder', 'Decline Order')}
          >
            {t('orderActionDecline', 'Decline')}
          </button>
        </div>
      );
    }
    if (s === 'dispatched' || s === 'shipped') {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            disabled={isUpdating}
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'delivered'); }}
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-teal-600 hover:bg-teal-700 text-white shadow-2xs flex items-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('tooltipMarkDelivered', 'Mark Delivered')}
          >
            <i className="fa-solid fa-check-double text-[10px]"></i>
            {t('orderActionDelivered', 'Delivered')}
          </button>
        </div>
      );
    }
    if (s === 'delivered') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
          <i className="fa-solid fa-circle-check text-[10px]"></i> {t('statusBadgeDone', 'Done')}
        </span>
      );
    }
    if (s === 'cancelled' || s === 'declined') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 whitespace-nowrap">
          <i className="fa-solid fa-ban text-[10px]"></i> {t('statusBadgeDeclined', 'Declined')}
        </span>
      );
    }
    return <button disabled className="btn-soft !text-xs !py-1 !px-2 opacity-50 cursor-not-allowed whitespace-nowrap">{t('statusBadgeDone', 'Done')}</button>;
  };

  const itemsList = Array.isArray(order.items) ? order.items : [];
  const itemCount = itemsList.length;

  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '—';
  const displayCustomer = order.customer || order.customer_name || t('colCustomer', 'Customer');
  const displayAmount = order.amount !== undefined ? order.amount : (order.total_amount || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const discount = Number(order.total_discount || 0);
  const rawGrandTotal = Math.max(0, Number(displayAmount) + deliveryFee - discount);
  const displayGrandTotal = Number.isInteger(rawGrandTotal) ? rawGrandTotal : rawGrandTotal.toFixed(2);
  const displayDistance = order.distance != null ? `${order.distance} km` : '—';
  const deliveryType = order.delivery_mode || order.delivery_type || 'normal';

  return (
    <tr 
      onClick={() => onViewItems(order)}
      className="border-b border-gray-100 hover:bg-emerald-50/50 cursor-pointer transition select-none group"
      title={t('orderRowClickToView', 'Click to view order details & invoice')}
    >
      <td className="px-4 py-3.5 font-bold text-gray-900">
        <div className="flex flex-col">
          <span className="group-hover:text-emerald-700 transition-colors">{displayId}</span>
          {order.invoice_number ? (
            <span className="text-[10px] font-mono font-medium text-emerald-700 mt-0.5 inline-flex items-center gap-1">
              <i className="fa-solid fa-file-invoice text-[9px]"></i>
              {order.invoice_number}
            </span>
          ) : (
            order.created_at ? (
              <span className="text-[10px] font-medium text-gray-400 mt-0.5">
                {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            ) : null
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 font-medium text-gray-700">
        <div>{displayCustomer}</div>
        {order.customer_phone && <div className="text-[11px] font-mono text-gray-400">{order.customer_phone}</div>}
      </td>
      <td className="px-4 py-3.5">
        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded whitespace-nowrap inline-flex items-center gap-1">
          <i className="fa-solid fa-route text-[9px] text-green-700"></i>
          {displayDistance}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span 
          title={t('viewItemsTooltip', 'Click to view all items ordered')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
        >
          <i className="fa-solid fa-basket-shopping text-[11px] text-emerald-600"></i>
          <span>{itemCount > 0 ? t('itemsCount', '{count} items', { count: itemCount }) : (order.item_summary || t('itemsCount', '0 items', { count: 0 }))}</span>
        </span>
      </td>
      <td className="px-4 py-3.5">
        {getDeliveryBadge(deliveryType)}
      </td>
      <td className="px-4 py-3.5 font-bold text-gray-900">
        <div className="text-sm font-extrabold text-emerald-700">₹{displayGrandTotal}</div>
        {((order.payment_method || '').toUpperCase() === 'CASH_ON_DELIVERY' || (order.payment_method || '').toUpperCase() === 'COD') ? (
          <span className="text-[10px] font-bold text-amber-700 block whitespace-nowrap">
            <i className="fa-solid fa-hand-holding-dollar mr-0.5 text-[9px]"></i> COD
          </span>
        ) : (
          order.tax_amount != null && order.tax_amount > 0 ? (
            <span className="text-[10px] font-medium text-emerald-700 block whitespace-nowrap">
              {t('orderRowTaxIncluded', 'Incl. ₹{tax} GST', { tax: Number(order.tax_amount).toFixed(2) })}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-gray-400 block whitespace-nowrap">
              {t('orderRowGstInclusive', 'Incl. 5% GST')}
            </span>
          )
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        {getStatusBadge(order.status)}
      </td>
      <td className="px-4 py-3.5">
        {getActionBtn(order.status)}
      </td>
    </tr>
  );
}

export default function OrdersPage() {
  const { store } = useSeller();
  const { t } = useTranslation();
  const { orders, loading, error, updatingIds, updateStatus } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mapOrder, setMapOrder] = useState(null);
  const [declineOrder, setDeclineOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const isOrderUpdating = (order) => {
    if (!order || !updatingIds) return false;
    const clean = order.id ? order.id.toString().replace(/^#/, '') : '';
    return Boolean(updatingIds[order.id] || updatingIds[clean]);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    const prevOrder = orders.find(o => o.id === orderId);
    const prevStatus = (prevOrder?.status || '').toLowerCase();
    const success = await updateStatus(orderId, newStatus);
    if (success) {
      const clean = orderId ? orderId.toString().replace(/^#/, '') : '';
      let msg = `Order #${clean} status updated`;
      if (newStatus === 'packing') {
        msg = t('toastOrderAccepted', 'Order #{id} accepted (ORDER_ACCEPTED) • Moved to Packing', { id: clean });
      } else if (newStatus === 'packed') {
        msg = t('toastOrderPacked', 'Order #{id} packed (ORDER_PACKED)', { id: clean });
      } else if (newStatus === 'dispatched') {
        msg = t('toastOrderShipped', 'Order #{id} shipped (ORDER_SHIPPED)', { id: clean });
      } else if (newStatus === 'delivered') {
        msg = t('toastOrderDelivered', 'Order #{id} marked Delivered', { id: clean });
      } else if (newStatus === 'cancelled') {
        msg = prevStatus === 'new'
          ? t('toastOrderDeclinedStockRestored', 'Order #{id} declined (ORDER_CANCELLED) • Listing stock restored', { id: clean })
          : t('toastOrderCancelledStockRestored', 'Order #{id} cancelled (ORDER_CANCELLED) • Listing stock restored', { id: clean });
      }
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
    }
    return success;
  };

  const filteredOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    const d = (o.delivery_mode || o.delivery_type || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesStatus = statusFilter === 'all' ? true : (
      statusFilter === 'new' ? s === 'new' :
      statusFilter === 'packing' ? (s === 'packing' || s === 'processing' || s === 'packed') :
      statusFilter === 'dispatched' ? (s === 'dispatched' || s === 'shipped') :
      statusFilter === 'delivered' ? s === 'delivered' :
      statusFilter === 'ready' ? s === 'ready' :
      statusFilter === 'declined' ? (s === 'cancelled' || s === 'declined') : true
    );
    const matchesDelivery = deliveryFilter === 'all' ? true : (
      deliveryFilter === 'fast' ? (d.includes('fast') || d.includes('express')) :
      deliveryFilter === 'same' ? d.includes('same') :
      deliveryFilter === 'pickup' ? d.includes('pickup') :
      (!d.includes('fast') && !d.includes('express') && !d.includes('same') && !d.includes('pickup'))
    );
    const matchesSearch = !q ? true : (
      (o.id && o.id.toString().toLowerCase().includes(q)) ||
      (o.customer && o.customer.toLowerCase().includes(q)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (Array.isArray(o.items) && o.items.some(it => (it.name || '').toLowerCase().includes(q))) ||
      (typeof o.items === 'string' && o.items.toLowerCase().includes(q)) ||
      (o.item_summary && o.item_summary.toLowerCase().includes(q))
    );
    return matchesStatus && matchesDelivery && matchesSearch;
  });

  const handleExportCSV = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      setToastMessage(t('toastExportNoOrders', 'No orders available to export'));
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const headers = [
      'Order ID',
      'Invoice Number',
      'Order Date',
      'Customer Name',
      'Customer Phone',
      'Delivery Address',
      'Customer Coordinates',
      'Distance (km)',
      'Delivery Mode',
      'Delivery Fee (INR)',
      'Discount (INR)',
      'Items Summary',
      'Payment Method',
      'Payment Status',
      'Taxable Amount (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'Total GST (INR)',
      'Grand Total (INR)',
      'Order Status'
    ];

    const escapeCsvCell = (val) => {
      if (val == null) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = filteredOrders.map(o => {
      const displayId = o.id ? (o.id.toString().startsWith('#') ? o.id : `#${o.id}`) : '';
      const invNum = o.invoice_number || '';

      let dateStr = '';
      if (o.created_at) {
        try {
          const d = new Date(o.created_at);
          dateStr = isNaN(d.getTime()) ? String(o.created_at) : d.toLocaleString('en-IN');
        } catch (e) {
          dateStr = String(o.created_at);
        }
      } else if (o.invoice_date) {
        try {
          const d = new Date(o.invoice_date);
          dateStr = isNaN(d.getTime()) ? String(o.invoice_date) : d.toLocaleString('en-IN');
        } catch (e) {
          dateStr = String(o.invoice_date);
        }
      }

      const customerName = o.customer || o.customer_name || '';
      const phone = o.customer_phone || '';

      let addressStr = '';
      if (typeof o.delivery_address === 'string') {
        addressStr = o.delivery_address;
      } else if (o.delivery_address && typeof o.delivery_address === 'object') {
        const a = o.delivery_address;
        addressStr = [a.address_line, a.city, a.state, a.pincode].filter(Boolean).join(', ');
      } else if (typeof o.address === 'string') {
        addressStr = o.address;
      }

      const addrObj = (o.delivery_address && typeof o.delivery_address === 'object') ? o.delivery_address : {};
      const rawLat = addrObj.latitude ?? addrObj.lat ?? o.delivery_latitude ?? o.latitude ?? null;
      const rawLng = addrObj.longitude ?? addrObj.lng ?? o.delivery_longitude ?? o.longitude ?? null;
      const hasCoords = rawLat != null && rawLng != null && !isNaN(Number(rawLat)) && !isNaN(Number(rawLng));
      const coords = hasCoords ? `${Number(rawLat).toFixed(6)}, ${Number(rawLng).toFixed(6)}` : '';

      const distance = o.distance != null ? o.distance : '';
      const deliveryMode = o.delivery_mode || o.delivery_type || 'normal';

      let itemsStr = '';
      if (Array.isArray(o.items)) {
        itemsStr = o.items.map(it => {
          const name = it.name || 'Item';
          const qty = it.quantity != null ? it.quantity : 1;
          const price = it.total_price != null ? it.total_price : (it.unit_price != null ? it.unit_price * qty : null);
          return price != null ? `${name} (x${qty} - ₹${price})` : `${name} (x${qty})`;
        }).join('; ');
      } else if (typeof o.items === 'string') {
        itemsStr = o.items;
      } else if (o.item_summary) {
        itemsStr = o.item_summary;
      }

      const payMethod = o.payment_method ? o.payment_method.toUpperCase() : 'PREPAID';
      const payStatus = o.payment_status ? o.payment_status.toUpperCase() : 'PAID';

      const total = o.amount !== undefined ? Number(o.amount) : (Number(o.total_amount) || 0);
      const recordedTax = o.tax_amount != null && !isNaN(Number(o.tax_amount)) ? Number(o.tax_amount) : null;
      const computedTax = Math.round((total * 5 / 105) * 100) / 100;
      const taxAmount = recordedTax != null ? recordedTax : computedTax;
      const taxableAmount = Math.max(0, Math.round((total - taxAmount) * 100) / 100);
      const cgst = (taxAmount / 2).toFixed(2);
      const sgst = (taxAmount / 2).toFixed(2);

      const status = o.status || 'new';

      return [
        displayId,
        invNum,
        dateStr,
        customerName,
        phone,
        addressStr,
        coords,
        distance,
        deliveryMode,
        Number(o.delivery_fee || 0).toFixed(2),
        Number(o.total_discount || 0).toFixed(2),
        itemsStr,
        payMethod,
        payStatus,
        taxableAmount.toFixed(2),
        cgst,
        sgst,
        taxAmount.toFixed(2),
        total.toFixed(2),
        status
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const today = new Date().toISOString().split('T')[0];
    const filename = `orders_export_${today}.csv`;

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      if (typeof window !== 'undefined') {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, filename);
        } else {
          const url = (window.URL && typeof window.URL.createObjectURL === 'function')
            ? window.URL.createObjectURL(blob)
            : (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : null);

          if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              if (window.URL && typeof window.URL.revokeObjectURL === 'function') {
                window.URL.revokeObjectURL(url);
              }
            }, 100);
          }
        }
      }
      setToastMessage(t('toastExportOrders', 'Exported {count} orders to CSV', { count: filteredOrders.length }));
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const fastCount = orders.filter(o => {
    const d = (o.delivery_mode || o.delivery_type || '').toLowerCase();
    return d.includes('fast') || d.includes('express');
  }).length;
  const sameCount = orders.filter(o => (o.delivery_mode || o.delivery_type || '').toLowerCase().includes('same')).length;
  const normalCount = orders.filter(o => {
    const d = (o.delivery_mode || o.delivery_type || '').toLowerCase();
    return !d.includes('fast') && !d.includes('express') && !d.includes('same') && !d.includes('pickup');
  }).length;
  const pickupCount = orders.filter(o => (o.delivery_mode || o.delivery_type || '').toLowerCase().includes('pickup')).length;

  const statusTabs = [
    { key: 'all', label: t('tabAll', 'All'), count: orders.length },
    { key: 'new', label: t('tabNew', 'New'), count: orders.filter(o => (o.status || '').toLowerCase() === 'new').length },
    { key: 'packing', label: t('tabProcessing', 'Processing'), count: orders.filter(o => ['packing', 'processing', 'packed'].includes((o.status || '').toLowerCase())).length },
    { key: 'dispatched', label: t('tabDispatched', 'Shipped'), count: orders.filter(o => ['dispatched', 'shipped'].includes((o.status || '').toLowerCase())).length },
    { key: 'delivered', label: t('tabDelivered', 'Delivered'), count: orders.filter(o => (o.status || '').toLowerCase() === 'delivered').length },
    { key: 'declined', label: t('tabCancelled', 'Cancelled'), count: orders.filter(o => ['cancelled', 'declined'].includes((o.status || '').toLowerCase())).length }
  ];

  return (
    <section id="sec-orders" className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{t('ordersHeaderTitle', 'App Orders')} <span className="text-sm font-normal text-green-700">{t('ordersHeaderNearbyOnly', '(Nearby Only)')}</span></h1>
          <p className="text-sm text-gray-500">{t('ordersHeaderSubtitle', 'Customers within your delivery zone — bike/van • not for far locations')}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-bold border border-green-200">
            <i className="fa-solid fa-circle-dot mr-1"></i> {t('ordersZoneBadge', 'Zone: {radius} km', { radius: store?.delivery_radius_km ?? 0 })}
          </span>
          <Link to="/zones" className="btn-soft !text-xs">{t('ordersEditZone', 'Edit Zone')}</Link>
        </div>
      </div>

      {/* Status Tabs: All, New, Processing, Shipped, Delivered, Cancelled */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {statusTabs.map(tab => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                active
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                active ? 'bg-emerald-800 text-emerald-100' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Delivery Mode Pills */}
      <div className="flex gap-1.5 text-xs font-bold flex-wrap">
        <span className="px-2 py-1 rounded-lg bg-orange-100 text-orange-800">{t('ordersPillFast', '{count} Fast', { count: fastCount })}</span>
        <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800">{t('ordersPillSameDay', '{count} Same-day', { count: sameCount })}</span>
        <span className="px-2 py-1 rounded-lg bg-green-100 text-green-800">{t('ordersPillNormal', '{count} Normal', { count: normalCount })}</span>
        <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-800">{t('ordersPillPickup', '{count} Pickup', { count: pickupCount })}</span>
      </div>

      {/* Filter Bar */}
      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input 
          type="search" 
          id="ordersSearch" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('ordersSearchPlaceholder', 'Search order, customer, items...')} 
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
        />
        <select 
          id="ordersStatus" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">{t('ordersFilterAllStatus', 'All status')}</option>
          <option value="new">{t('ordersFilterNew', 'New / Action needed')}</option>
          <option value="packing">{t('ordersFilterPacking', 'Processing / Packing')}</option>
          <option value="dispatched">{t('ordersFilterDispatched', 'Shipped / Out for delivery')}</option>
          <option value="delivered">{t('ordersFilterDelivered', 'Delivered')}</option>
          <option value="declined">{t('ordersFilterDeclined', 'Declined / Cancelled')}</option>
        </select>
        <select 
          id="ordersDelivery" 
          value={deliveryFilter} 
          onChange={(e) => setDeliveryFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">{t('ordersFilterAllDeliveryTypes', 'All delivery types')}</option>
          <option value="fast">{t('ordersFilterFast', 'Fast')}</option>
          <option value="same">{t('ordersFilterSame', 'Same-day')}</option>
          <option value="normal">{t('ordersFilterNormal', 'Normal / scheduled')}</option>
          <option value="pickup">{t('ordersFilterPickup', 'Pickup')}</option>
        </select>
        <button 
          type="button"
          onClick={handleExportCSV} 
          className="btn-soft !text-xs cursor-pointer flex items-center gap-1.5"
          title={t('ordersExportTitle', 'Export filtered orders to CSV')}
        >
          <i className="fa-solid fa-download mr-1"></i> {t('ordersBtnExport', 'Export')}
        </button>
      </div>
      
      {/* Full-Width Orders Table Card */}
      <div className="card overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <tr>
              <th className="px-4 py-3.5">{t('colOrder', 'Order')}</th>
              <th className="px-4 py-3.5">{t('colCustomer', 'Customer')}</th>
              <th className="px-4 py-3.5">{t('colDistance', 'Distance')}</th>
              <th className="px-4 py-3.5">{t('colItems', 'Items')}</th>
              <th className="px-4 py-3.5">{t('colDelivery', 'Delivery')}</th>
              <th className="px-4 py-3.5">{t('colGrandTotal', 'Grand Total')}</th>
              <th className="px-4 py-3.5 text-center">{t('colStatus', 'Status')}</th>
              <th className="px-4 py-3.5">{t('colAction', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && orders.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> {t('ordersLoadingFromServer', 'Loading orders from server...')}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs inline-flex flex-col sm:flex-row items-center gap-2 max-w-lg mx-auto">
                    <div className="flex items-center gap-1.5 font-bold">
                      <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                      <span>{error}</span>
                    </div>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded font-bold text-[10px] shrink-0"
                    >
                      {t('ordersRetry', 'Retry')}
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {!(loading && orders.length === 0) && !error && filteredOrders.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">{t('ordersNoOrdersFound', 'No orders found.')}</td>
              </tr>
            )}
            {!(loading && orders.length === 0) && !error && filteredOrders.map(order => (
              <OrderRow 
                key={order.id} 
                order={order} 
                onUpdateStatus={handleStatusUpdate} 
                onViewItems={setSelectedOrder}
                onOpenMap={setMapOrder}
                onDecline={setDeclineOrder}
                isUpdating={isOrderUpdating(order)}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="card p-4 bg-green-50 border-green-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <p className="text-sm text-green-800"><i className="fa-solid fa-motorcycle mr-1"></i> <b>{t('ordersBottomBannerText', 'App orders are always nearby. Customers outside your zone cannot order from the app.')}</b></p>
        <button className="btn-primary !text-xs whitespace-nowrap">{t('ordersManageDeliveryZone', 'Manage Delivery Zone')}</button>
      </div>

      {/* Itemized Order Detail Modal with Integrated Map */}
      {selectedOrder && (
        <OrderItemsModal 
          order={selectedOrder} 
          store={store}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleStatusUpdate}
          onDecline={setDeclineOrder}
          isUpdating={isOrderUpdating(selectedOrder)}
        />
      )}

      {/* Delivery Map Popup Modal */}
      {mapOrder && (
        <OrderMapModal 
          order={mapOrder} 
          store={store}
          onClose={() => setMapOrder(null)} 
          onUpdateStatus={handleStatusUpdate}
          onDecline={setDeclineOrder}
        />
      )}

      {/* Decline Order Reason Modal */}
      {declineOrder && (
        <DeclineOrderModal 
          order={declineOrder}
          onClose={() => setDeclineOrder(null)}
          onConfirm={async (orderId, reason, note) => {
            await handleStatusUpdate(orderId, 'cancelled');
          }}
        />
      )}

      {/* Real-time Status Feedback Toast */}
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
