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
  const [editModal, setEditModal] = useState({ isOpen: false, id: null, code: '', title: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '', max_discount_amount: '' });
  const [validateModal, setValidateModal] = useState({ isOpen: false, code: '', cart_amount: 500, result: null, error: null, loading: false });

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

  const handleUpdate = () => {
    if (!editModal.id) return;
    apiClient.patch(`/offers/${editModal.id}`, editModal)
      .then(() => {
        setEditModal({ isOpen: false, id: null, code: '', title: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '', max_discount_amount: '' });
        fetchOffers(pagination.page);
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to update offer'));
  };

  const handleDelete = (id, code) => {
    if (!window.confirm(`Are you sure you want to deactivate offer '${code}'?`)) return;
    apiClient.delete(`/offers/${id}`)
      .then(() => fetchOffers(pagination.page))
      .catch(err => alert('Failed to delete offer'));
  };

  const handleValidate = () => {
    if (!validateModal.code) return;
    setValidateModal(prev => ({ ...prev, loading: true, result: null, error: null }));
    apiClient.post('/offers/validate', {
      code: validateModal.code.trim(),
      cart_amount: Number(validateModal.cart_amount || 0)
    })
      .then(res => {
        setValidateModal(prev => ({ ...prev, result: res.data, loading: false }));
      })
      .catch(err => {
        setValidateModal(prev => ({
          ...prev,
          error: err.response?.data?.message || 'Coupon validation failed',
          loading: false
        }));
      });
  };

  const openEdit = (row) => {
    setEditModal({
      isOpen: true,
      id: row.id,
      code: row.code,
      title: row.title || row.code,
      discount_type: row.discount_type || 'PERCENTAGE',
      discount_value: row.discount_value,
      min_order_amount: row.min_order_amount || row.min_order_value || '',
      max_discount_amount: row.max_discount_amount || row.max_discount_cap || ''
    });
  };

  const toggleStatus = (id, currentStatus) => {
    const call = currentStatus 
      ? apiClient.post(`/offers/${id}/pause`) 
      : apiClient.post(`/offers/${id}/activate`);
    call
      .then(() => fetchOffers(pagination.page))
      .catch(() => alert(`Failed to ${currentStatus ? 'pause' : 'activate'} offer`));
  };

  const columns = [
    { header: 'Code', render: (row) => <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{row.code}</span> },
    { header: 'Title', accessor: 'title' },
    { header: 'Type', render: (row) => <span className="text-xs font-semibold uppercase text-slate-600">{row.discount_type}</span> },
    { header: 'Discount Value', render: (row) => <span className="font-extrabold text-slate-800">{row.discount_type === 'PERCENTAGE' ? `${row.discount_value}%` : `₹${row.discount_value}`}</span> },
    { header: 'Min Order', render: (row) => row.min_order_amount ? `₹${row.min_order_amount}` : 'No Min' },
    { header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => openEdit(row)} className="text-xs font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
          Edit
        </button>
        <button onClick={() => toggleStatus(row.id, row.is_active)} className={`text-xs font-bold px-2 py-1 rounded text-white ${row.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
          {row.is_active ? 'Pause' : 'Activate'}
        </button>
        <button onClick={() => handleDelete(row.id, row.code)} className="text-xs font-bold px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600">
          Delete
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
        <div className="flex gap-2">
          <button onClick={() => setValidateModal({ isOpen: true, code: '', cart_amount: 500, result: null, error: null, loading: false })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm">
            <i className="fa-solid fa-magnifying-glass mr-1.5"></i> Validate Code
          </button>
          <button onClick={() => setCreateModal({ ...createModal, isOpen: true })} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm">
            + Create Offer
          </button>
        </div>
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

      {/* Create Offer Modal */}
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

      {/* Edit Offer Modal */}
      <Modal
        isOpen={editModal.isOpen}
        title={`Edit Offer: ${editModal.code}`}
        onClose={() => setEditModal({ isOpen: false, id: null, code: '', title: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '', max_discount_amount: '' })}
        onPrimary={handleUpdate}
        primaryLabel="Save Changes"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
            <input type="text" value={editModal.title} onChange={e => setEditModal({ ...editModal, title: e.target.value })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
              <select value={editModal.discount_type} onChange={e => setEditModal({ ...editModal, discount_type: e.target.value })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value</label>
              <input type="number" value={editModal.discount_value} onChange={e => setEditModal({ ...editModal, discount_value: e.target.value })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Min Order Amount (₹)</label>
              <input type="number" value={editModal.min_order_amount} onChange={e => setEditModal({ ...editModal, min_order_amount: e.target.value })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount Cap (₹)</label>
              <input type="number" value={editModal.max_discount_amount} onChange={e => setEditModal({ ...editModal, max_discount_amount: e.target.value })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Validate Coupon Modal */}
      <Modal
        isOpen={validateModal.isOpen}
        title="Check & Validate Coupon Code"
        onClose={() => setValidateModal({ isOpen: false, code: '', cart_amount: 500, result: null, error: null, loading: false })}
        onPrimary={handleValidate}
        primaryLabel={validateModal.loading ? 'Checking...' : 'Check Code'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code</label>
            <input type="text" value={validateModal.code} onChange={e => setValidateModal({ ...validateModal, code: e.target.value })} placeholder="e.g. WELCOME50" className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none uppercase font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cart Amount (₹)</label>
            <input type="number" value={validateModal.cart_amount} onChange={e => setValidateModal({ ...validateModal, cart_amount: e.target.value })} placeholder="500" className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
          </div>

          {validateModal.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
              {validateModal.error}
            </div>
          )}

          {validateModal.result && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <i className="fa-solid fa-circle-check text-emerald-600"></i> Coupon is Valid &amp; Applicable!
              </div>
              <div>Discount Calculated: <span className="font-extrabold text-emerald-700">₹{validateModal.result.discount_amount}</span></div>
              <div>Final Cart Amount: <span className="font-extrabold">₹{validateModal.result.final_amount}</span></div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
