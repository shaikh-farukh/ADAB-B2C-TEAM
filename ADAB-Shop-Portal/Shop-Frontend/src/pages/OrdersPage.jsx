import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';

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

function OrderRow({ order, onUpdateStatus, onViewItems }) {
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
      <td className="px-3 py-3 font-bold text-gray-900">{displayId}</td>
      <td className="px-3 py-3 font-medium text-gray-700">{displayCustomer}</td>
      <td className="px-3 py-3">
        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">
          {displayDistance} km
        </span>
      </td>
      <td className="px-3 py-3">
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
      <td className="px-3 py-3">
        {getDeliveryBadge(deliveryType)}
      </td>
      <td className="px-3 py-3 font-bold text-gray-900">
        ₹{displayAmount}
      </td>
      <td className="px-3 py-3 flex items-center gap-2">
        <button className="text-blue-600 text-xs font-bold" title="View on Map">
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
      {/* Exact Prototype Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold">App Orders <span className="text-sm font-normal text-green-700">(Nearby Only)</span></h1>
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
      
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
              <tr>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Distance</th>
                <th className="px-3 py-3">Items</th>
                <th className="px-3 py-3">Delivery</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center text-gray-500">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading orders from server...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center">
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
                  <td colSpan="7" className="px-3 py-6 text-center text-gray-500">No orders found.</td>
                </tr>
              )}
              {!loading && !error && filteredOrders.map(order => (
                <OrderRow 
                  key={order.id} 
                  order={order} 
                  onUpdateStatus={updateStatus} 
                  onViewItems={setSelectedOrder}
                />
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="card p-4 shadow-sm h-[380px] flex flex-col">
          <h3 className="font-bold mb-1"><i className="fa-solid fa-map-location-dot text-green-700 mr-1"></i> Nearby Delivery Map</h3>
          <p className="text-[10px] text-gray-500 mb-2">Only customers inside <span id="mapZoneLabel">10 km</span> radius appear on app</p>
          <div id="orderMap" className="flex-1 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400">
            [ Map Component Placeholder ]
          </div>
        </div>
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
    </section>
  );
}
