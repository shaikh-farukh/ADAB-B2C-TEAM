import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function Orders() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'exceptions'
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Selected Order Detail Modal State
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Update Status Modal State
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    newStatus: 'CONFIRMED',
    notes: '',
    submitting: false
  });

  // Fetch Orders List
  const fetchOrders = useCallback((page = 1) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: page,
      limit: 10,
      search: searchTerm,
      status: statusFilter,
      payment_status: paymentStatusFilter,
      exceptions: activeTab === 'exceptions' ? 'true' : 'false'
    });

    apiClient.get(`/orders?${params.toString()}`)
      .then(res => {
        if (res.data.success) {
          setOrders(res.data.data || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load orders', err);
        setError(err.response?.data?.message || 'Failed to load orders');
      })
      .finally(() => setLoading(false));
  }, [searchTerm, statusFilter, paymentStatusFilter, activeTab]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  // Fetch Order Detail for Selected ID
  const fetchOrderDetail = useCallback((orderId) => {
    if (!orderId) return;
    setDetailLoading(true);
    setDetailError(null);

    apiClient.get(`/orders/${orderId}`)
      .then(res => {
        if (res.data.success) {
          setOrderDetail(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load order detail', err);
        setDetailError(err.response?.data?.message || 'Failed to load order detail');
      })
      .finally(() => setDetailLoading(false));
  }, []);

  const handleOpenDetail = (id) => {
    setSelectedOrderId(id);
    fetchOrderDetail(id);
  };

  const handleCloseDetail = () => {
    setSelectedOrderId(null);
    setOrderDetail(null);
    setDetailError(null);
  };

  const handleOpenStatusModal = () => {
    if (!orderDetail) return;
    setStatusModal({
      isOpen: true,
      newStatus: orderDetail.order_status || 'CONFIRMED',
      notes: '',
      submitting: false
    });
  };

  const handleStatusSubmit = () => {
    if (!selectedOrderId || !statusModal.newStatus) return;
    setStatusModal(prev => ({ ...prev, submitting: true }));

    apiClient.patch(`/orders/${selectedOrderId}/status`, {
      status: statusModal.newStatus,
      notes: statusModal.notes
    })
      .then(res => {
        if (res.data.success) {
          setStatusModal({ isOpen: false, newStatus: 'CONFIRMED', notes: '', submitting: false });
          // Refresh order detail & list seamlessly
          fetchOrderDetail(selectedOrderId);
          fetchOrders(pagination.page);
        }
      })
      .catch(err => {
        alert(err.response?.data?.message || 'Failed to update order status');
        setStatusModal(prev => ({ ...prev, submitting: false }));
      });
  };

  const columns = [
    {
      header: 'Order #',
      accessor: 'order_number',
      render: (row) => (
        <div>
          <button 
            onClick={() => handleOpenDetail(row.id)}
            className="font-bold text-indigo-600 hover:underline text-left block"
          >
            {row.order_number}
          </button>
          <span className="text-[11px] text-gray-400">
            {new Date(row.created_at).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-800">{row.customer_name || 'Guest Customer'}</div>
          <div className="text-xs text-gray-500">{row.customer_phone || row.customer_email || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Delivery Mode',
      accessor: 'delivery_mode',
      render: (row) => (
        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium">
          {row.delivery_mode || 'EXPRESS_30M'}
        </span>
      )
    },
    {
      header: 'Grand Total',
      render: (row) => (
        <span className="font-bold text-slate-800">
          ₹{Number(row.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Payment Status',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge status={row.payment_status} />
          <span className="text-[10px] text-gray-400 font-mono">{row.payment_method}</span>
        </div>
      )
    },
    {
      header: 'Order Status',
      render: (row) => <StatusBadge status={row.order_status} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => handleOpenDetail(row.id)}
          className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition"
        >
          View Details
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Orders Management</h1>
          <p className="text-sm text-slate-500">Monitor, inspect, and update customer order lifecycle across sellers</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => setActiveTab('exceptions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'exceptions' ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-600 hover:text-rose-800'
            }`}
          >
            <i className="fa-solid fa-triangle-exclamation"></i>
            Order Exceptions
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search by order #, customer name, phone or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl outline-none focus:border-indigo-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-xl outline-none focus:border-indigo-400 bg-white"
        >
          <option value="">All Order Statuses</option>
          <option value="PLACED">PLACED</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="PREPARING">PREPARING</option>
          <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="RETURNED">RETURNED</option>
        </select>

        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-xl outline-none focus:border-indigo-400 bg-white"
        >
          <option value="">All Payment Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="PAID">PAID</option>
          <option value="AUTHORIZED">AUTHORIZED</option>
          <option value="FAILED">FAILED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>

        {(searchTerm || statusFilter || paymentStatusFilter) && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter(''); setPaymentStatusFilter(''); }}
            className="text-xs text-indigo-600 font-bold px-2 py-2 hover:underline shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <AdminTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyMessage={activeTab === 'exceptions' ? 'No order exceptions requiring attention.' : 'No orders found matching the filters.'}
      />

      {/* Pagination */}
      {!loading && orders.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => fetchOrders(p)}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <Modal
          isOpen={true}
          onClose={handleCloseDetail}
          title={`Order Details - #${orderDetail?.order_number || selectedOrderId}`}
        >
          {detailLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium">Loading Order Details...</div>
          ) : detailError ? (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm">{detailError}</div>
          ) : orderDetail ? (
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
              
              {/* Order Header Summary */}
              <div className="bg-slate-50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-slate-200/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-800">{orderDetail.order_number}</span>
                    <StatusBadge status={orderDetail.order_status} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Placed on {new Date(orderDetail.created_at).toLocaleString()} • Delivery Mode: <span className="font-semibold text-slate-700">{orderDetail.delivery_mode}</span>
                  </div>
                </div>

                <button
                  onClick={handleOpenStatusModal}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition shadow-sm"
                >
                  <i className="fa-solid fa-pen-to-square mr-1.5"></i> Update Status
                </button>
              </div>

              {/* Customer & Delivery Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Info</h3>
                  <div className="text-sm font-semibold text-slate-800">{orderDetail.customer_name || 'Guest User'}</div>
                  <div className="text-xs text-slate-600"><i className="fa-solid fa-phone w-4 text-slate-400"></i> {orderDetail.customer_phone || 'N/A'}</div>
                  <div className="text-xs text-slate-600"><i className="fa-solid fa-envelope w-4 text-slate-400"></i> {orderDetail.customer_email || 'N/A'}</div>
                </div>

                <div className="card p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipping & Delivery Address</h3>
                  <div className="text-xs text-slate-700 leading-relaxed font-medium">
                    {orderDetail.delivery_address ? (
                      typeof orderDetail.delivery_address === 'string' ? orderDetail.delivery_address : (
                        <div>
                          <div>{orderDetail.delivery_address.recipient_name || orderDetail.delivery_address.name}</div>
                          <div>{orderDetail.delivery_address.address_line || orderDetail.delivery_address.address}</div>
                          <div>{orderDetail.delivery_address.city}, {orderDetail.delivery_address.pincode}</div>
                        </div>
                      )
                    ) : 'No delivery address recorded'}
                  </div>
                  {orderDetail.eta_minutes && (
                    <div className="text-xs text-indigo-600 font-semibold mt-1">
                      <i className="fa-solid fa-clock mr-1"></i> ETA: {orderDetail.eta_minutes} mins
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & Payment Breakdown */}
              <div className="card p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border">
                    <span className="text-slate-500 block">Total MRP</span>
                    <span className="font-bold text-slate-700">₹{Number(orderDetail.total_mrp || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border">
                    <span className="text-slate-500 block">Discount</span>
                    <span className="font-bold text-green-600">-₹{Number(orderDetail.total_discount || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border">
                    <span className="text-slate-500 block">Delivery Fee</span>
                    <span className="font-bold text-slate-700">₹{Number(orderDetail.delivery_fee || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-indigo-600 block font-semibold">Grand Total</span>
                    <span className="font-extrabold text-indigo-900 text-sm">₹{Number(orderDetail.grand_total || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t">
                  <span className="text-slate-500">Payment Method: <strong className="text-slate-700">{orderDetail.payment_method}</strong></span>
                  <span>Payment Status: <StatusBadge status={orderDetail.payment_status} /></span>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ordered Items ({orderDetail.items?.length || 0})</h3>
                <div className="border rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Store</th>
                        <th className="p-3">Unit Price</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orderDetail.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-slate-800">{item.product_name}</td>
                          <td className="p-3 text-slate-600">{item.store_name || 'Store'}</td>
                          <td className="p-3 text-slate-600">₹{Number(item.unit_price).toFixed(2)}</td>
                          <td className="p-3 text-slate-800 font-bold">{item.quantity}</td>
                          <td className="p-3 text-right font-bold text-slate-900">₹{Number(item.total_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shipments & Tracking */}
              {orderDetail.shipments && orderDetail.shipments.length > 0 && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipment & Tracking Information</h3>
                  {orderDetail.shipments.map((ship, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{ship.carrier_name}</span>
                        <StatusBadge status={ship.status} />
                      </div>
                      <div className="text-slate-600">
                        Tracking Number: <span className="font-mono font-semibold text-slate-800">{ship.tracking_number || 'N/A'}</span>
                      </div>
                      {ship.shipped_at && <div className="text-slate-500">Shipped: {new Date(ship.shipped_at).toLocaleString()}</div>}
                      {ship.delivered_at && <div className="text-slate-500">Delivered: {new Date(ship.delivered_at).toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Status History */}
              {orderDetail.status_history && orderDetail.status_history.length > 0 && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Status Audit Trail</h3>
                  <div className="space-y-2 text-xs">
                    {orderDetail.status_history.map((hist, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 pb-2 border-b last:border-0 last:pb-0">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">
                            Status changed from <span className="text-slate-500">{hist.previous_status}</span> → <span className="text-indigo-600">{hist.new_status}</span>
                          </div>
                          {hist.notes && <div className="text-slate-600 italic mt-0.5">"{hist.notes}"</div>}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            By {hist.changed_by_name || 'System / Admin'} on {new Date(hist.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </Modal>
      )}

      {/* Update Status Modal */}
      {statusModal.isOpen && (
        <Modal
          isOpen={true}
          onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
          title="Update Order Status"
        >
          <div className="space-y-4 text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Status</label>
              <select
                value={statusModal.newStatus}
                onChange={(e) => setStatusModal(prev => ({ ...prev, newStatus: e.target.value }))}
                className="w-full p-2.5 border rounded-xl outline-none focus:border-indigo-400 bg-white"
              >
                <option value="PLACED">PLACED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PREPARING">PREPARING</option>
                <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="RETURNED">RETURNED</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Audit Notes / Reason (Optional)</label>
              <textarea
                rows={3}
                placeholder="Reason for status change..."
                value={statusModal.notes}
                onChange={(e) => setStatusModal(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2.5 border rounded-xl outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border text-slate-600 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={statusModal.submitting}
                onClick={handleStatusSubmit}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {statusModal.submitting ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
