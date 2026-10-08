import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import Pagination from '../components/ui/Pagination';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Filter from '../components/ui/Filter';

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusTab, setStatusTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [modalAction, setModalAction] = useState(''); // 'APPROVE', 'REJECT', 'REQUEST_CHANGES', 'SUSPEND'

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/admin/products', {
        params: {
          page,
          limit: 10,
          status: statusTab,
          search,
          seller: sellerFilter,
          category: categoryFilter
        }
      });
      if (res.data.success) {
        setProducts(res.data.data.products);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [page, statusTab, search, sellerFilter, categoryFilter]);

  const handleActionClick = (product, action) => {
    setSelectedProduct(product);
    setModalAction(action);
    setModerationReason('');
  };

  const handleModerationSubmit = async () => {
    if ((modalAction === 'REJECT' || modalAction === 'REQUEST_CHANGES') && !moderationReason.trim()) {
      alert('Moderation reason is required.');
      return;
    }

    try {
      let endpoint = '';
      if (modalAction === 'APPROVE') endpoint = `/admin/products/${selectedProduct.id}/approve`;
      if (modalAction === 'REJECT') endpoint = `/admin/products/${selectedProduct.id}/reject`;
      if (modalAction === 'REQUEST_CHANGES') endpoint = `/admin/products/${selectedProduct.id}/request-changes`;
      if (modalAction === 'SUSPEND') endpoint = `/admin/products/${selectedProduct.id}/suspend`;

      const res = await apiClient.post(endpoint, { reason: moderationReason });
      
      if (res.data.success) {
        setSelectedProduct(null);
        fetchProducts(); // Refresh list
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Moderation action failed');
      console.error(err);
    }
  };

  const columns = [
    { header: 'Product', accessor: 'name' },
    { header: 'Seller', accessor: 'seller' },
    { header: 'Price', render: (row) => `₹${row.price}` },
    { header: 'Submitted Time', render: (row) => new Date(row.submittedTime).toLocaleString() },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { header: 'Moderation Reason', render: (row) => row.moderationReason ? <span className="text-xs text-red-500">{row.moderationReason}</span> : '-' },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => handleActionClick(row, 'VIEW')} className="text-blue-500 text-xs hover:underline">View Details</button>
          {row.status === 'PENDING' && (
            <>
              <button onClick={() => handleActionClick(row, 'APPROVE')} className="text-green-600 text-xs hover:underline">Approve</button>
              <button onClick={() => handleActionClick(row, 'REJECT')} className="text-red-600 text-xs hover:underline">Reject</button>
              <button onClick={() => handleActionClick(row, 'REQUEST_CHANGES')} className="text-amber-600 text-xs hover:underline">Request Changes</button>
            </>
          )}
          {row.status === 'LIVE' && (
            <button onClick={() => handleActionClick(row, 'SUSPEND')} className="text-red-600 text-xs hover:underline">Suspend</button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold">Product Catalog</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {['ALL', 'LIVE', 'PENDING', 'REJECTED'].map(tab => (
          <button
            key={tab}
            onClick={() => { setStatusTab(tab); setPage(1); }}
            className={`px-4 py-2 text-sm font-bold border-b-2 ${statusTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <input 
          type="text" 
          placeholder="Search products..." 
          className="px-3 py-2 border rounded-xl text-sm outline-none focus:border-indigo-400 min-w-[200px]"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <input 
          type="text" 
          placeholder="Filter by seller..." 
          className="px-3 py-2 border rounded-xl text-sm outline-none focus:border-indigo-400 min-w-[150px]"
          value={sellerFilter}
          onChange={(e) => { setSellerFilter(e.target.value); setPage(1); }}
        />
        <Filter 
          options={[{ value: 'Grains', label: 'Grains' }, { value: 'Pantry', label: 'Pantry' }, { value: 'Beverages', label: 'Beverages' }, { value: 'Dry Fruits', label: 'Dry Fruits' }]} 
          value={categoryFilter} 
          onChange={(v) => { setCategoryFilter(v); setPage(1); }} 
          onReset={() => { setCategoryFilter(''); setPage(1); }}
        />
      </div>

      {/* Error state */}
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>}

      {/* Table */}
      <AdminTable columns={columns} data={products} loading={loading} emptyMessage="No products found." />
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Moderation / Details Modal */}
      {selectedProduct && (
        <Modal 
          isOpen={true} 
          title={modalAction === 'VIEW' ? 'Product Details' : `${modalAction} Product`}
          onClose={() => setSelectedProduct(null)}
          onPrimary={modalAction !== 'VIEW' ? handleModerationSubmit : undefined}
          primaryLabel={modalAction !== 'VIEW' ? 'Submit' : undefined}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-bold text-gray-500">Name:</span> {selectedProduct.name}</div>
              <div><span className="font-bold text-gray-500">Seller:</span> {selectedProduct.seller}</div>
              <div><span className="font-bold text-gray-500">Price:</span> ₹{selectedProduct.price}</div>
              <div><span className="font-bold text-gray-500">Category:</span> {selectedProduct.category}</div>
              <div><span className="font-bold text-gray-500">Brand:</span> {selectedProduct.brand}</div>
              <div><span className="font-bold text-gray-500">Status:</span> <StatusBadge status={selectedProduct.status} /></div>
            </div>

            {selectedProduct.description && (
              <div>
                <span className="font-bold text-gray-500 block">Description:</span>
                <p className="text-gray-700">{selectedProduct.description}</p>
              </div>
            )}

            {(modalAction === 'REJECT' || modalAction === 'REQUEST_CHANGES' || modalAction === 'SUSPEND') && (
              <div>
                <label className="block font-bold text-gray-700 mb-2">Reason (Required):</label>
                <textarea 
                  className="w-full border rounded-xl p-3 outline-none focus:border-indigo-400"
                  rows="3"
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Enter reason..."
                />
              </div>
            )}

            {modalAction === 'APPROVE' && (
              <p className="text-gray-700">Are you sure you want to approve this product?</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
