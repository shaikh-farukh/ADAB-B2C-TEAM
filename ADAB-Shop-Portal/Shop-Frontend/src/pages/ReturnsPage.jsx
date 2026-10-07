import React, { useState } from 'react';

export default function ReturnsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [returnsList, setReturnsList] = useState([
    { id: '#R-441', orderId: '#9015', customer: 'Anita Desai', product: 'Balaji Silk Kurti (M)', reason: 'Wrong size', reasonKey: 'size', amount: 899, status: 'pending' },
    { id: '#R-440', orderId: '#9008', customer: 'Vikram Patel', product: 'Fortune Oil 1L', reason: 'Damaged in transit', reasonKey: 'damage', amount: 165, status: 'pending' },
    { id: '#R-439', orderId: '#8992', customer: 'Sneha Rao', product: 'Maggi Noodles 70g x6', reason: 'Changed mind', reasonKey: 'mind', amount: 120, status: 'pending' },
  ]);

  const handleAction = (id, newStatus) => {
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

  return (
    <section id="sec-returns" className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Returns &amp; Refunds</h1>
        <p className="text-sm text-gray-500">Manage customer return requests — like Amazon Seller Central returns</p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-gray-500">Pending Action</div>
          <div className="text-2xl font-extrabold text-red-600">
            {returnsList.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Approved This Month</div>
          <div className="text-2xl font-extrabold">12</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Refund Amount</div>
          <div className="text-2xl font-extrabold">₹4,280</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Return Rate</div>
          <div className="text-2xl font-extrabold text-green-700">1.2%</div>
        </div>
      </div>

      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input 
          type="search" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search return, order, customer..." 
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-500" 
        />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All status</option>
          <option value="pending">Pending action</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select 
          value={reasonFilter} 
          onChange={(e) => setReasonFilter(e.target.value)} 
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
        >
          <option value="all">All reasons</option>
          <option value="size">Wrong size</option>
          <option value="damage">Damaged</option>
          <option value="mind">Changed mind</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[700px]">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="px-4 py-3">Return ID</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-gray-400">No returns match your filters.</td>
              </tr>
            ) : (
              filteredReturns.map((r) => (
                <tr key={r.id} className="filter-row return-row">
                  <td className="px-4 py-3 font-bold text-gray-900">{r.id}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{r.orderId}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.customer}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{r.product}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.reason}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">₹{r.amount}</td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' ? (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleAction(r.id, 'approved')} 
                          className="btn-primary !text-xs !py-1.5 !px-3"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleAction(r.id, 'rejected')} 
                          className="btn-soft !text-xs !py-1.5 !px-3"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${r.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {r.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
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
