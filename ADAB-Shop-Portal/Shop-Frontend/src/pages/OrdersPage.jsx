import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
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

function OrderMapModal({ order, onClose, onUpdateStatus }) {
  if (!order) return null;
  const mapContainerRef = useRef(null);
  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '#9000';
  const displayCustomer = order.customer || order.customer_name || 'Customer';
  const addr = order.delivery_address || {};
  const addrText = addr.address_line 
    ? `${addr.address_line}, ${addr.city || 'Surat'} ${addr.pincode || ''}`
    : 'Ring Road, Surat, Gujarat';
  const distance = parseFloat(order.distance) || 2.0;

  // Store Location (Surat merchant base)
  const storeLat = 21.1702;
  const storeLng = 72.8311;

  // Calculate customer location based on distance and order seed
  const angle = ((parseInt((order.id || '10').replace(/\D/g, '') || 7, 10) * 53) % 360);
  const rad = (angle * Math.PI) / 180;
  const custLat = storeLat + (distance / 111) * Math.cos(rad);
  const custLng = storeLng + (distance / (111 * Math.cos((storeLat * Math.PI) / 180))) * Math.sin(rad);

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

      // 1. Delivery Zone Radius Circle (10 km green dashed boundary)
      leaflet.circle([storeLat, storeLng], {
        radius: 10 * 1000,
        color: '#22C55E',
        fillColor: '#22C55E',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4'
      }).addTo(map);

      // 2. Store Marker (Green Store Pin)
      const storeIcon = leaflet.divIcon({
        className: 'custom-store-pin',
        html: '<div style="background:#15803D;color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;display:flex;align-items:center;gap:4px;"><i class="fa-solid fa-store"></i> Your Store</div>'
      });
      leaflet.marker([storeLat, storeLng], { icon: storeIcon })
        .addTo(map)
        .bindPopup('<b>Shri Balaji Store</b><br>10 km delivery radius');

      // 3. Customer Marker (Blue Location Pin)
      const customerIcon = leaflet.divIcon({
        className: 'custom-cust-pin',
        html: `<div style="background:#2563EB;color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;display:flex;align-items:center;gap:4px;"><i class="fa-solid fa-location-dot"></i> ${displayCustomer} (${distance} km)</div>`
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
            Within Zone (10 km)
          </span>
        </div>

        {/* Real Leaflet Map View */}
        <div className="relative h-72 w-full bg-gray-100 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full z-1"></div>
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-800 shadow-sm flex items-center gap-1.5 z-10 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Store Zone Radius: 10 km</span>
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

function OrderRow({ order, onUpdateStatus, onViewItems, onOpenMap }) {
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">New</span>;
      case 'packing':
      case 'processing': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Packing</span>;
      case 'dispatched':
      case 'shipped': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Dispatched</span>;
      case 'ready': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Ready</span>;
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
    if (s === 'new') return <button onClick={() => onUpdateStatus(order.id, 'packing')} className="btn-primary !text-xs !py-1 !px-2">Accept</button>;
    if (s === 'packing' || s === 'processing') return <button onClick={() => onUpdateStatus(order.id, 'dispatched')} className="btn-primary !text-xs !py-1 !px-2">Send</button>;
    if (s === 'dispatched' || s === 'shipped') return <button disabled className="btn-soft !text-xs !py-1 !px-2 opacity-75">In Transit</button>;
    return <button disabled className="btn-soft !text-xs !py-1 !px-2 opacity-50 cursor-not-allowed">Done</button>;
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
        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">
          {displayDistance} km
        </span>
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
      <td className="px-4 py-3.5 flex items-center gap-2">
        <button 
          type="button"
          onClick={() => onOpenMap(order)}
          className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer" 
          title="View on Map"
        >
          <i className="fa-solid fa-location-dot"></i>
        </button>
        {getActionBtn(order.status)}
      </td>
    </tr>
  );
}

export default function OrdersPage() {
  const { orders, loading, error, updateStatus } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mapOrder, setMapOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    const d = (o.delivery_mode || o.delivery_type || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesStatus = statusFilter === 'all' ? true : (
      statusFilter === 'new' ? s === 'new' :
      statusFilter === 'packing' ? (s === 'packing' || s === 'processing') :
      statusFilter === 'dispatched' ? (s === 'dispatched' || s === 'shipped') :
      statusFilter === 'ready' ? s === 'ready' : true
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
              <th className="px-4 py-3.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading orders from server...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center">
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
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No orders found.</td>
              </tr>
            )}
            {!loading && !error && filteredOrders.map(order => (
              <OrderRow 
                key={order.id} 
                order={order} 
                onUpdateStatus={updateStatus} 
                onViewItems={setSelectedOrder}
                onOpenMap={setMapOrder}
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
          onClose={() => setMapOrder(null)} 
          onUpdateStatus={updateStatus}
        />
      )}
    </section>
  );
}
