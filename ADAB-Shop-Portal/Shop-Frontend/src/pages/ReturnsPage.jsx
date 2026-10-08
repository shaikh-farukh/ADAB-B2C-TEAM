import React, { useState, useEffect } from 'react';
import { useOrders } from '../hooks/useOrders';
import { sellerApi } from '../api/sellerApi';

export default function ReturnsPage() {
  const { orders } = useOrders();
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await sellerApi.getReturns();
      const raw = res?.data !== undefined ? res.data : res;
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setReturnsList(list);
    } catch (err) {
      setError(err.message || 'Failed to load return requests');
      setReturnsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleAction = async (id, newStatus) => {
    // Local optimistic update
    setReturnsList(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };


  const filteredReturns = returnsList.filter(item => {
    const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;
    const matchesReason = reasonFilter === 'all' ? true : item.reasonKey === reasonFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ? true : (
      item.id.toLowerCase().includes(q) ||
      item.orderId.toLowerCase().includes(q) ||
      item.customer.toLowerCase().includes(q) ||
      item.product.toLowerCase().includes(q)
    );
    return matchesStatus && matchesReason && matchesSearch;
  });

  const pendingCount = returnsList.filter(r => r.status === 'pending').length;
  const approvedCount = returnsList.filter(r => r.status === 'approved').length;
  const totalRefundAmount = returnsList.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);

  return (
    <section id="sec-returns" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Returns &amp; Refunds</h1>
        <p className="text-sm text-gray-500">Manage customer return requests, inspection decisions, and refund approvals</p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-gray-500">Pending Action</div>
          <div className="text-2xl font-extrabold text-red-600 mt-1">
            {pendingCount}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Need merchant review</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Approved Returns</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">{approvedCount}</div>
          <div className="text-[10px] text-green-600 font-bold mt-0.5">Processed successfully</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Total Refunded</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">₹{totalRefundAmount}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Credited to customers</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Return Rate</div>
          <div className="text-2xl font-extrabold text-green-700 mt-1">
            {orders.length > 0 ? `${((returnsList.length / orders.length) * 10).toFixed(1)}%` : '0.8%'}
          </div>
          <div className="text-[10px] text-green-600 font-bold mt-0.5">Healthy threshold</div>
        </div>
      </div>

      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input 
          type="search" 
          placeholder="Search by ID, customer, product..." 
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
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select 
          value={reasonFilter} 
          onChange={(e) => setReasonFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All Reasons</option>
          <option value="size">Wrong Size</option>
          <option value="damage">Damaged in transit</option>
          <option value="mind">Changed mind</option>
        </select>
      </div>

      <div className="card overflow-x-auto shadow-sm">
        <table className="w-full text-sm text-left min-w-[640px]">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-200">
            <tr>
              <th className="px-3 py-3">Return ID</th>
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">Reason</th>
              <th className="px-3 py-3">Refund</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-3 py-6 text-center text-gray-500">No returns match the selected filter.</td>
              </tr>
            ) : (
              filteredReturns.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-3 font-bold text-gray-900">{item.id}</td>
                  <td className="px-3 py-3 font-medium text-gray-700">{item.orderId}</td>
                  <td className="px-3 py-3">{item.customer}</td>
                  <td className="px-3 py-3 font-medium text-gray-800">{item.product}</td>
                  <td className="px-3 py-3 text-xs text-gray-600">{item.reason}</td>
                  <td className="px-3 py-3 font-bold text-gray-900">₹{item.amount}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      item.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {item.status === 'pending' ? (
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleAction(item.id, 'approved')} 
                          className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleAction(item.id, 'rejected')} 
                          className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Resolved</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
