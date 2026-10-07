import React from 'react';
import { useB2B } from '../hooks/useB2B';

export default function PartnerPage() {
  const { orders, loading, error } = useB2B();
  const [activeDist, setActiveDist] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredOrders = orders.filter(item => {
    const dist = (item.distance_tier || (item.distance && item.distance > 50 ? 'far' : 'near') || 'near').toLowerCase();
    const status = (item.status || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesDist = activeDist === 'all' ? true : dist === activeDist;
    const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
    const matchesQuery = !q ? true : (
      (item.id && item.id.toString().toLowerCase().includes(q)) ||
      (item.store_name && item.store_name.toLowerCase().includes(q)) ||
      (item.supplier_name && item.supplier_name.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (typeof item.items === 'string' && item.items.toLowerCase().includes(q))
    );

    return matchesDist && matchesStatus && matchesQuery;
  });

  const nearCount = orders.filter(o => !o.distance_tier || o.distance_tier === 'near' || (o.distance && o.distance <= 50)).length;
  const farCount = orders.filter(o => o.distance_tier === 'far' || (o.distance && o.distance > 50)).length;
  const exportCount = orders.filter(o => o.distance_tier === 'export' || (o.location && o.location.toLowerCase().includes('export'))).length;

  return (
    <section id="sec-partner" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Store-to-Store Orders <span className="text-sm font-normal text-orange-700">(Any Distance)</span></h1>
          <p className="text-sm text-gray-500">Other shops can order from nearby OR far away — truck &amp; freight, no radius limit</p>
        </div>
        <button onClick={() => {}} className="card px-4 py-2 text-left text-xs border-orange-200 bg-orange-50"><span className="font-bold text-orange-900">Credit:</span> <span id="partnerCreditBadge">14 days</span> • min ₹5k • <span className="text-green-700 underline">Edit</span></button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveDist('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeDist === 'all' ? 'tab-on' : 'tab-off'}`}>All ({orders.length})</button>
        <button onClick={() => setActiveDist('near')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeDist === 'near' ? 'tab-on' : 'tab-off'}`}>Nearby (&lt;50 km) ({nearCount})</button>
        <button onClick={() => setActiveDist('far')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeDist === 'far' ? 'tab-on' : 'tab-off'}`}>Far / Interstate ({farCount})</button>
        <button onClick={() => setActiveDist('export')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeDist === 'export' ? 'tab-on' : 'tab-off'}`}>Export ({exportCount})</button>
      </div>

      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input 
          type="search" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search store, order, items..." 
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500" 
        />
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="packing">Packing</option>
          <option value="transit">In transit</option>
          <option value="delivered">Delivered</option>
          <option value="scheduled">Scheduled</option>
          <option value="customs">Customs / export</option>
        </select>
      </div>

      <div className="card overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left min-w-[800px]">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <tr>
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Store / Partner</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Items</th>
              <th className="px-3 py-3">Payment</th>
              <th className="px-3 py-3">Freight</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan="8" className="px-3 py-6 text-center text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading B2B orders...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan="8" className="px-3 py-6 text-center text-red-500 text-xs">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filteredOrders.length === 0 && (
              <tr>
                <td colSpan="8" className="px-3 py-6 text-center text-gray-500">No B2B orders found.</td>
              </tr>
            )}
            {!loading && !error && filteredOrders.map((order, idx) => {
              const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : `#P-${idx + 8800}`;
              const storeName = order.store_name || order.supplier_name || order.store || 'Partner Store';
              const location = order.location || order.supplier_city || 'Local Hub';
              const orderType = order.order_type || (idx % 2 === 0 ? 'You sold' : 'You bought');
              const items = Array.isArray(order.items) ? order.items.map(i => i.name || i.product_id).join(', ') : (order.items || order.item_details || 'Bulk stock items');
              const payment = order.payment_terms || (order.amount ? `₹${Number(order.amount).toLocaleString('en-IN')}` : (order.total_amount ? `₹${Number(order.total_amount).toLocaleString('en-IN')}` : 'Credit'));
              const freight = order.freight_partner || order.freight_service || 'Porter / Freight';
              const status = order.status || 'In transit';

              return (
                <tr key={order.id || idx} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-3 font-bold text-gray-900">{displayId}</td>
                  <td className="px-3 py-3 font-medium">{storeName}</td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      {location}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-bold text-xs ${orderType.includes('sold') ? 'text-green-700' : 'text-orange-700'}`}>
                      {orderType}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 truncate max-w-[160px]" title={items}>
                    {items}
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold">
                    {payment}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-blue-700">
                    {freight}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center"><div className="text-xs text-gray-500">Nearby (&lt;50km)</div><div className="font-extrabold text-green-700">{nearCount} orders</div></div>
        <div className="card p-3 text-center"><div className="text-xs text-gray-500">Far / Interstate</div><div className="font-extrabold text-amber-700">{farCount} orders</div></div>
        <div className="card p-3 text-center"><div className="text-xs text-gray-500">Export</div><div className="font-extrabold text-indigo-700">{exportCount} orders</div></div>
        <div className="card p-3 text-center"><div className="text-xs text-gray-500">Active Volume</div><div className="font-extrabold text-amber-600">{orders.length} total</div></div>
      </div>

      <div className="card p-4 bg-orange-50 border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <p className="text-sm text-orange-800"><i className="fa-solid fa-truck mr-1"></i> <b>Store orders have no distance limit.</b> Nearby = Porter truck. Far = Delhivery/freight. International = export.</p>
        <button onClick={() => {}} className="btn-primary !text-xs">Track Shipments</button>
      </div>
    </section>
  );
}

