import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [createModal, setCreateModal] = useState({ isOpen: false, code: '', title: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '', max_discount_amount: '', usage_limit: '' });

  const fetchOffers = (p = 1) => {
    setLoading(true);
    apiClient.get(`/offers?page=${p}&limit=10&search=${search}&status=${statusFilter}`)
      .then(res => {
        setOffers(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOffers(1);
  }, [search, statusFilter]);

  const handleCreate = () => {
    if (!createModal.code || !createModal.title || !createModal.discount_value) {
      alert('Offer Code, Title, and Discount Value are required.');
      return;
    }
    apiClient.post('/offers', createModal)
      .then(() => {
        setCreateModal({ isOpen: false, code: '', title: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '', max_discount_amount: '', usage_limit: '' });
        fetchOffers(1);
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to create offer'));
  };

  const toggleStatus = (id, currentStatus) => {
    const action = currentStatus ? 'pause' : 'activate';
    apiClient.post(`/offers/${id}/${action}`)
      .then(() => fetchOffers(pagination.page))
      .catch(() => alert(`Failed to ${action} offer`));
  };

  const columns = [
    { header: 'Code', render: (row) => <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{row.code}</span> },
    { header: 'Title', accessor: 'title' },
    { header: 'Type', render: (row) => <span className="text-xs font-semibold uppercase text-slate-600">{row.discount_type}</span> },
    { header: 'Discount Value', render: (row) => <span className="font-extrabold text-slate-800">{row.discount_type === 'PERCENTAGE' ? `${row.discount_value}%` : `₹${row.discount_value}`}</span> },
    { header: 'Min Order', render: (row) => row.min_order_amount ? `₹${row.min_order_amount}` : 'No Min' },
    { header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-2">
        <button onClick={() => toggleStatus(row.id, row.is_active)} className={`text-xs font-bold px-2.5 py-1 rounded-lg text-white ${row.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
          {row.is_active ? 'Pause' : 'Activate'}
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Platform Offers &amp; Coupons</h1>
          <p className="text-xs text-slate-500 mt-1">Manage promotional discounts, coupon codes &amp; eligibility rules</p>
        </div>
        <button onClick={() => setCreateModal({ ...createModal, isOpen: true })} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm">
          + Create Offer
        </button>
      </div>

      <div className="flex gap-3 my-4">
        <input 
          type="text" 
          placeholder="Search by code or title..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="p-2.5 text-xs rounded-xl border border-slate-200 w-64 focus:border-indigo-600 outline-none" 
        />
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)} 
          className="p-2.5 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive / Paused</option>
        </select>
      </div>

      <AdminTable columns={columns} data={offers} loading={loading} emptyMessage="No offers created yet." />
      <Pagination page={pagination.page} total={pagination.total} pageSize={pagination.limit} onPageChange={p => fetchOffers(p)} />

      <Modal
        isOpen={createModal.isOpen}
        title="Create New Platform Offer"
        onClose={() => setCreateModal({ ...createModal, isOpen: false })}
        onPrimary={handleCreate}
        primaryLabel="Create Offer"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
            <input type="text" value={createModal.code} onChange={e => setCreateModal({ ...createModal, code: e.target.value })} placeholder="e.g. SUMMER50" className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
            <input type="text" value={createModal.title} onChange={e => setCreateModal({ ...createModal, title: e.target.value })} placeholder="e.g. 50% Off Summer Sale" className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type *</label>
              <select value={createModal.discount_type} onChange={e => setCreateModal({ ...createModal, discount_type: e.target.value })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value *</label>
              <input type="number" value={createModal.discount_value} onChange={e => setCreateModal({ ...createModal, discount_value: e.target.value })} placeholder="e.g. 50" className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Min Order Amount (₹)</label>
              <input type="number" value={createModal.min_order_amount} onChange={e => setCreateModal({ ...createModal, min_order_amount: e.target.value })} placeholder="e.g. 200" className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount Cap (₹)</label>
              <input type="number" value={createModal.max_discount_amount} onChange={e => setCreateModal({ ...createModal, max_discount_amount: e.target.value })} placeholder="e.g. 100" className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
