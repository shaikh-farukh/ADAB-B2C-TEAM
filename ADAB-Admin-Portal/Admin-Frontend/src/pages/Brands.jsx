import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', logo_url: '', description: '', is_active: true });

  const fetchBrands = (p = 1) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: p, limit: 10 });
    if (search) params.append('search', search);

    apiClient.get(`/brands?${params.toString()}`)
      .then(res => {
        setBrands(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch(() => setError('Failed to load brands'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBrands(1);
  }, []);

  const openCreateModal = () => {
    setEditingBrand(null);
    setForm({ name: '', slug: '', logo_url: '', description: '', is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name || '',
      slug: brand.slug || '',
      logo_url: brand.logo_url || '',
      description: brand.description || '',
      is_active: brand.is_active !== undefined ? brand.is_active : true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert('Brand name is required');
      return;
    }

    if (editingBrand) {
      apiClient.patch(`/brands/${editingBrand.id}`, form)
        .then(() => {
          setIsModalOpen(false);
          fetchBrands(pagination.page);
        })
        .catch(err => alert(err.response?.data?.message || 'Failed to update brand'));
    } else {
      apiClient.post('/brands', form)
        .then(() => {
          setIsModalOpen(false);
          fetchBrands(1);
        })
        .catch(err => alert(err.response?.data?.message || 'Failed to create brand'));
    }
  };

  const columns = [
    { header: 'ID', render: (row) => <span className="text-xs font-mono text-slate-500">{row.id?.substring(0,8)}</span> },
    { header: 'Brand Name', render: (row) => <span className="font-bold text-slate-800">{row.name}</span> },
    { header: 'Slug', render: (row) => <span className="text-xs font-mono text-slate-500">{row.slug}</span> },
    { header: 'Description', render: (row) => <span className="text-xs text-slate-500 truncate max-w-xs">{row.description || 'N/A'}</span> },
    { header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    { header: 'Actions', render: (row) => (
      <button onClick={() => openEditModal(row)} className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1 rounded-lg font-bold">Edit</button>
    )}
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Brand Master Governance</h1>
          <p className="text-xs text-slate-500 mt-1">Manage global brand partners, manufacturers &amp; logos</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 text-xs font-extrabold">
          <i className="fa-solid fa-plus"></i> Add Brand
        </button>
      </div>

      <div className="flex gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs max-w-md">
        <input 
          type="text" 
          placeholder="Search brands..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && fetchBrands(1)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600"
        />
        <button onClick={() => fetchBrands(1)} className="btn-primary !px-3 !py-2 shrink-0">Search</button>
      </div>

      {error && <div className="text-rose-600 bg-rose-50 p-3 rounded-xl text-xs font-semibold">{error}</div>}

      <AdminTable columns={columns} data={brands} loading={loading} emptyMessage="No brands found." />

      <div className="mt-4">
        <Pagination page={pagination.page} total={pagination.total} pageSize={pagination.limit} onPageChange={p => fetchBrands(p)} />
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingBrand ? `Edit Brand: ${editingBrand.name}` : 'Add New Brand'}
        onClose={() => setIsModalOpen(false)}
        onPrimary={handleSubmit}
        primaryLabel={editingBrand ? 'Save Changes' : 'Create Brand'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amul" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Custom Slug</label>
              <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="amul" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select value={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Logo Image URL</label>
            <input type="text" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brand details..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
