import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { useSeller } from '../context/SellerContext';
import L from 'leaflet';

function OrderItemsModal({ order, onClose }) {
  if (!order) return null;
  const items = Array.isArray(order.items) ? order.items : [];
  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '#9000';
  const displayCustomer = order.customer || order.customer_name || 'Customer';
  const displayAmount = order.amount !== undefined ? order.amount : (order.total_amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-basket-shopping text-emerald-600"></i>
              <span>Order Items • {displayId}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Customer: <span className="font-semibold text-gray-700">{displayCustomer}</span>
              {order.customer_phone && <span className="ml-2 font-mono text-gray-600">({order.customer_phone})</span>}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors text-base font-bold shadow-xs cursor-pointer"
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Items List */}
        <div className="p-5 max-h-[350px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No itemized records found for this order.</p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const qty = Number(item.quantity) || 1;
                  const unitPrice = Number(item.unit_price) || 0;
                  const itemTotal = Number(item.total_price) || (qty * unitPrice);
                  return (
                    <tr key={idx} className="hover:bg-gray-50/70">
                      <td className="py-2.5 font-semibold text-gray-800">{item.name || 'Item'}</td>
                      <td className="py-2.5 text-center font-bold text-gray-600">{qty}</td>
                      <td className="py-2.5 text-right text-gray-500">₹{unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 text-right font-extrabold text-gray-900">₹{itemTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Total Items: <span className="font-extrabold text-gray-800">{items.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase font-bold block leading-tight">Grand Total</span>
              <span className="text-base font-extrabold text-emerald-700">₹{Number(displayAmount).toLocaleString('en-IN')}</span>
            </div>
            <button 
              type="button"
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

function DeclineOrderModal({ order, onClose, onConfirm }) {
  if (!order) return null;
  const [selectedReason, setSelectedReason] = useState('Item(s) Out of Stock');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    { id: 'stock', label: 'Item(s) Out of Stock', icon: 'fa-box-open' },
    { id: 'busy', label: 'Store is Closing / Too Busy', icon: 'fa-clock' },
    { id: 'distance', label: 'Delivery Address Outside Reach', icon: 'fa-route' },
    { id: 'customer', label: 'Customer Requested Cancellation', icon: 'fa-user-xmark' },
    { id: 'pricing', label: 'Price / Catalog Mismatch', icon: 'fa-tag' }
  ];

  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '#9000';
  const displayCustomer = order.customer || order.customer_name || 'Customer';

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
              <h3 className="font-extrabold text-sm text-gray-900">Decline Order • {displayId}</h3>
              <p className="text-[11px] text-gray-500">Customer: <span className="font-semibold text-gray-700">{displayCustomer}</span></p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center text-sm font-bold shadow-2xs cursor-pointer"
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs font-semibold text-gray-700">Please choose a reason for declining this order:</p>
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
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Internal Note (Optional):</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., ran out of inventory"
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
            Keep Order
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className="fa-solid fa-ban text-xs"></i>
            {submitting ? 'Declining...' : 'Confirm Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderMapModal({ order, store, onClose, onUpdateStatus, onDecline }) {
  if (!order) return null;
  const mapContainerRef = useRef(null);
  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '#9000';
  const displayCustomer = order.customer || order.customer_name || 'Customer';
  const addr = order.delivery_address || {};
  const addrText = addr.address_line 
    ? `${addr.address_line}, ${addr.city || 'Surat'} ${addr.pincode || ''}`
    : 'Ring Road, Surat, Gujarat';
  const distance = parseFloat(order.distance) || 2.0;

  // Active Store Location and Details from database
  const storeName = store?.store_name || 'Your Store';
  const storeLat = Number(store?.latitude) || 21.1702;
  const storeLng = Number(store?.longitude) || 72.8311;
  const radiusKm = Number(store?.delivery_radius_km) || 10;

  // Exact Customer Coordinates from delivery_address in orders table
  const hasCoordinates = addr.latitude != null && addr.longitude != null;
  const custLat = hasCoordinates
    ? Number(addr.latitude)
    : (storeLat + (distance / 111) * Math.cos(((parseInt((order.id || '10').replace(/\D/g, '') || 7, 10) * 53) % 360 * Math.PI) / 180));
  const custLng = hasCoordinates
    ? Number(addr.longitude)
    : (storeLng + (distance / (111 * Math.cos((storeLat * Math.PI) / 180))) * Math.sin(((parseInt((order.id || '10').replace(/\D/g, '') || 7, 10) * 53) % 360 * Math.PI) / 180));

  useEffect(() => {
    if (!mapContainerRef.current) return;
    try {
      const leaflet = typeof window !== 'undefined' ? (window.L || L) : null;
      if (!leaflet || !leaflet.map) return;

      const map = leaflet.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([storeLat, storeLng], 12);

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
      }).addTo(map);

      // 1. Delivery Zone Radius Circle (green dashed boundary)
      leaflet.circle([storeLat, storeLng], {
        radius: radiusKm * 1000,
        color: '#22C55E',
        fillColor: '#22C55E',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4'
      }).addTo(map);

      // 2. Store Marker (Green Icon Pin)
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

      // 3. Customer Marker (Blue Icon Pin)
      const customerIcon = leaflet.divIcon({
        className: 'border-0 bg-transparent',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
        html: '<div style="width:32px;height:32px;background:#2563EB;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2.5px solid white;cursor:pointer;"><i class="fa-solid fa-location-dot"></i></div>'
      });
      leaflet.marker([custLat, custLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`<b>${displayCustomer}</b><br>${addrText}<br><b>Distance:</b> ${distance} km`)
        .openPopup();

      // 4. Connecting Delivery Polyline
      leaflet.polyline([[storeLat, storeLng], [custLat, custLng]], {
        color: '#3B82F6',
        weight: 2.5,
        dashArray: '6 6',
        opacity: 0.85
      }).addTo(map);

      // Fit bounds to show store, customer, and boundary
      map.fitBounds([
        [storeLat, storeLng],
        [custLat, custLng]
      ], { padding: [50, 50] });

      return () => {
        map.remove();
      };
    } catch (e) {
      console.warn('Map initialization skipped (e.g. non-browser environment):', e);
    }
  }, [storeLat, storeLng, custLat, custLng, distance, displayCustomer, addrText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-map-location-dot text-blue-600"></i>
              <span>Customer Location • {displayId}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Customer: <span className="font-semibold text-gray-700">{displayCustomer}</span> • <span className="text-green-700 font-bold">{distance} km away</span>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors text-base font-bold shadow-xs cursor-pointer"
            title="Close"
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
          </div>
          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 shrink-0">
            Within Zone ({radiusKm} km)
          </span>
        </div>

        {/* Real Leaflet Map View */}
        <div className="relative h-72 w-full bg-gray-100 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full z-1"></div>
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-800 shadow-sm flex items-center gap-1.5 z-10 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>{storeName} Zone: {radiusKm} km</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <i className="fa-solid fa-motorcycle text-green-600"></i>
            <span>Assigned: Bike / Van delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => alert(`Starting navigation to ${addrText}`)}
              className="btn-soft !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-diamond-turn-right text-xs text-blue-600"></i>
              Directions
            </button>
            {order.status === 'new' && (
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
                  Accept Order
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
                  Decline
                </button>
              </>
            )}
            {(order.status === 'packing' || order.status === 'processing') && (
              <button 
                type="button"
                onClick={async () => {
                  await onUpdateStatus(order.id, 'dispatched');
                  onClose();
                }}
                className="btn-primary !py-1.5 !px-3 !text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <i className="fa-solid fa-paper-plane text-xs"></i>
                Send
              </button>
            )}
            <button 
              type="button"
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

function OrderRow({ order, onUpdateStatus, onViewItems, onOpenMap, onDecline }) {
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">New</span>;
      case 'packing':
      case 'processing': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Packing</span>;
      case 'dispatched':
      case 'shipped': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Dispatched</span>;
      case 'ready': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Ready</span>;
      case 'delivered': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Delivered</span>;
      case 'cancelled':
      case 'declined': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Declined</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">{status || 'Pending'}</span>;
    }
  };

  const getDeliveryBadge = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('fast') || t.includes('express')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">Fast 45m</span>;
    if (t.includes('same')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Same-day</span>;
    if (t.includes('pickup')) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Pickup</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Normal</span>;
  };

  const getActionBtn = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'new') {
      return (
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => onUpdateStatus(order.id, 'packing')} 
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs whitespace-nowrap"
            title="Accept Order"
          >
            Accept
          </button>
          <button 
            type="button"
            onClick={() => onDecline(order)} 
            className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-2xs whitespace-nowrap"
            title="Decline Order"
          >
            Decline
          </button>
        </div>
      );
    }
    if (s === 'packing' || s === 'processing') {
      return (
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => onUpdateStatus(order.id, 'dispatched')} 
            className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs whitespace-nowrap"
            title="Dispatch / Send Package"
          >
            Send
          </button>
          <button 
            type="button"
            onClick={() => onDecline(order)} 
            className="px-2 py-1 rounded-lg text-xs font-bold text-gray-500 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 transition cursor-pointer whitespace-nowrap"
            title="Cancel Order"
          >
            Cancel
          </button>
        </div>
      );
    }
    if (s === 'dispatched' || s === 'shipped') {
      return (
        <button 
          type="button"
          onClick={() => onUpdateStatus(order.id, 'delivered')}
          className="btn-primary !text-xs !py-1 !px-2.5 font-bold cursor-pointer bg-teal-600 hover:bg-teal-700 text-white shadow-2xs flex items-center gap-1 whitespace-nowrap"
          title="Mark Delivered"
        >
          <i className="fa-solid fa-check-double text-[10px]"></i>
          Delivered
        </button>
      );
    }
    if (s === 'delivered') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
          <i className="fa-solid fa-circle-check text-[10px]"></i> Done
        </span>
      );
    }
    if (s === 'cancelled' || s === 'declined') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 whitespace-nowrap">
          <i className="fa-solid fa-ban text-[10px]"></i> Declined
        </span>
      );
    }
    return <button disabled className="btn-soft !text-xs !py-1 !px-2 opacity-50 cursor-not-allowed whitespace-nowrap">Done</button>;
  };

  const itemsList = Array.isArray(order.items) ? order.items : [];
  const itemCount = itemsList.length;

  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '#9000';
  const displayCustomer = order.customer || order.customer_name || 'Customer';
  const displayAmount = order.amount !== undefined ? order.amount : (order.total_amount || 0);
  const displayDistance = order.distance || '1.5';
  const deliveryType = order.delivery_mode || order.delivery_type || (order.id === '#9021' || order.id === '#9018' ? 'fast' : (order.id === '#9020' || order.id === '#9017' ? 'same' : (order.id === '#9015' ? 'pickup' : 'normal')));

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
      <td className="px-4 py-3.5 font-bold text-gray-900">{displayId}</td>
      <td className="px-4 py-3.5 font-medium text-gray-700">{displayCustomer}</td>
      <td className="px-4 py-3.5">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded whitespace-nowrap">
            {displayDistance} km
          </span>
          <button 
            type="button"
            onClick={() => onOpenMap(order)}
            className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer shrink-0 shadow-2xs" 
            title="View on Map"
          >
            <i className="fa-solid fa-location-dot"></i>
          </button>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <button
          type="button"
          onClick={() => onViewItems(order)}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer"
          title="Click to view all items ordered"
        >
          <i className="fa-solid fa-basket-shopping text-[11px] text-emerald-600"></i>
          <span>{itemCount > 0 ? `${itemCount} items` : (order.item_summary || 'Items')}</span>
          <i className="fa-solid fa-chevron-right text-[9px] text-emerald-500 group-hover:translate-x-0.5 transition-transform"></i>
        </button>
      </td>
      <td className="px-4 py-3.5">
        {getDeliveryBadge(deliveryType)}
      </td>
      <td className="px-4 py-3.5 font-bold text-gray-900">
        ₹{displayAmount}
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
  const { orders, loading, error, updateStatus } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mapOrder, setMapOrder] = useState(null);
  const [declineOrder, setDeclineOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const handleStatusUpdate = async (orderId, newStatus) => {
    const success = await updateStatus(orderId, newStatus);
    if (success) {
      const clean = orderId ? orderId.toString().replace(/^#/, '') : '';
      const readable = newStatus === 'packing' ? 'Packing' :
                       newStatus === 'dispatched' ? 'Dispatched' :
                       newStatus === 'delivered' ? 'Delivered' :
                       newStatus === 'cancelled' ? 'Declined' : newStatus;
      setToastMessage(`Order #${clean} status updated to ${readable}`);
      setTimeout(() => setToastMessage(null), 3500);
    }
    return success;
  };

  const filteredOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    const d = (o.delivery_mode || o.delivery_type || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesStatus = statusFilter === 'all' ? true : (
      statusFilter === 'new' ? s === 'new' :
      statusFilter === 'packing' ? (s === 'packing' || s === 'processing') :
      statusFilter === 'dispatched' ? (s === 'dispatched' || s === 'shipped') :
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

  return (
    <section id="sec-orders" className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">App Orders <span className="text-sm font-normal text-green-700">(Nearby Only)</span></h1>
          <p className="text-sm text-gray-500">Customers within your delivery zone — bike/van • not for far locations</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-bold border border-green-200">
            <i className="fa-solid fa-circle-dot mr-1"></i> Zone: <span id="ordersZoneRadius">10 km</span>
          </span>
          <Link to="/zones" className="btn-soft !text-xs">Edit Zone</Link>
        </div>
      </div>

      {/* Delivery Mode Pills */}
      <div className="flex gap-1.5 text-xs font-bold flex-wrap">
        <span className="px-2 py-1 rounded-lg bg-orange-100 text-orange-800">{fastCount} Fast</span>
        <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800">{sameCount} Same-day</span>
        <span className="px-2 py-1 rounded-lg bg-green-100 text-green-800">{normalCount} Normal</span>
        <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-800">{pickupCount} Pickup</span>
      </div>

      {/* Filter Bar */}
      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input 
          type="search" 
          id="ordersSearch" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search order, customer, items..." 
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500"
        />
        <select 
          id="ordersStatus" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All status</option>
          <option value="new">New / Action needed</option>
          <option value="packing">Packing</option>
          <option value="dispatched">Out for delivery</option>
          <option value="ready">Ready for pickup</option>
          <option value="declined">Declined / Cancelled</option>
        </select>
        <select 
          id="ordersDelivery" 
          value={deliveryFilter} 
          onChange={(e) => setDeliveryFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All delivery types</option>
          <option value="fast">Fast</option>
          <option value="same">Same-day</option>
          <option value="normal">Normal / scheduled</option>
          <option value="pickup">Pickup</option>
        </select>
        <button onClick={() => alert('Filtered orders exported')} className="btn-soft !text-xs">
          <i className="fa-solid fa-download mr-1"></i> Export
        </button>
      </div>
      
      {/* Full-Width Orders Table Card */}
      <div className="card overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <tr>
              <th className="px-4 py-3.5">Order</th>
              <th className="px-4 py-3.5">Customer</th>
              <th className="px-4 py-3.5">Distance</th>
              <th className="px-4 py-3.5">Items</th>
              <th className="px-4 py-3.5">Delivery</th>
              <th className="px-4 py-3.5">Total</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-4 py-3.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading orders from server...
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
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {!loading && !error && filteredOrders.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No orders found.</td>
              </tr>
            )}
            {!loading && !error && filteredOrders.map(order => (
              <OrderRow 
                key={order.id} 
                order={order} 
                onUpdateStatus={handleStatusUpdate} 
                onViewItems={setSelectedOrder}
                onOpenMap={setMapOrder}
                onDecline={setDeclineOrder}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="card p-4 bg-green-50 border-green-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <p className="text-sm text-green-800"><i className="fa-solid fa-motorcycle mr-1"></i> <b>App orders are always nearby.</b> Customers outside your zone cannot order from the app.</p>
        <button className="btn-primary !text-xs whitespace-nowrap">Manage Delivery Zone</button>
      </div>

      {/* Itemized Order Modal */}
      {selectedOrder && (
        <OrderItemsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
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
