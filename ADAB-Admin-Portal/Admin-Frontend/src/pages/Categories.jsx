import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', parent_id: '', icon_class: '', image_url: '', is_active: true, display_order: 0 });

  const fetchCategories = (p = 1) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: p, limit: 10 });
    if (search) params.append('search', search);

    apiClient.get(`/categories?${params.toString()}`)
      .then(res => {
        setCategories(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories(1);
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm({ name: '', slug: '', parent_id: '', icon_class: '', image_url: '', is_active: true, display_order: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name || '',
      slug: cat.slug || '',
      parent_id: cat.parent_id || '',
      icon_class: cat.icon_class || '',
      image_url: cat.image_url || '',
      is_active: cat.is_active !== undefined ? cat.is_active : true,
      display_order: cat.display_order || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert('Category name is required');
      return;
    }

    if (editingCategory) {
      apiClient.patch(`/categories/${editingCategory.id}`, form)
        .then(() => {
          setIsModalOpen(false);
          fetchCategories(pagination.page);
        })
        .catch(err => alert(err.response?.data?.message || 'Failed to update category'));
    } else {
      apiClient.post('/categories', form)
        .then(() => {
          setIsModalOpen(false);
          fetchCategories(1);
        })
        .catch(err => alert(err.response?.data?.message || 'Failed to create category'));
    }
  };

  const columns = [
    { header: 'ID', render: (row) => <span className="text-xs font-mono text-slate-500">{row.id}</span> },
    { header: 'Category Name', render: (row) => <span className="font-bold text-slate-800">{row.name}</span> },
    { header: 'Slug', render: (row) => <span className="text-xs font-mono text-slate-500">{row.slug}</span> },
    { header: 'Parent ID', render: (row) => <span className="text-xs text-slate-500">{row.parent_id || 'Top Level'}</span> },
    { header: 'Display Order', render: (row) => <span className="text-xs font-semibold">{row.display_order || 0}</span> },
    { header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    { header: 'Actions', render: (row) => (
      <button onClick={() => openEditModal(row)} className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1 rounded-lg font-bold">Edit</button>
    )}
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Category Governance</h1>
          <p className="text-xs text-slate-500 mt-1">Manage product hierarchy, sub-categories &amp; taxonomy order</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 text-xs font-extrabold">
          <i className="fa-solid fa-plus"></i> Add Category
        </button>
      </div>

      <div className="flex gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs max-w-md">
        <input 
          type="text" 
          placeholder="Search categories..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && fetchCategories(1)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600"
        />
        <button onClick={() => fetchCategories(1)} className="btn-primary !px-3 !py-2 shrink-0">Search</button>
      </div>

      {error && <div className="text-rose-600 bg-rose-50 p-3 rounded-xl text-xs font-semibold">{error}</div>}

      <AdminTable columns={columns} data={categories} loading={loading} emptyMessage="No categories found." />

      <div className="mt-4">
        <Pagination page={pagination.page} total={pagination.total} pageSize={pagination.limit} onPageChange={p => fetchCategories(p)} />
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
        onClose={() => setIsModalOpen(false)}
        onPrimary={handleSubmit}
        primaryLabel={editingCategory ? 'Save Changes' : 'Create Category'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dairy & Bakery" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Custom Slug</label>
              <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="dairy-bakery" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Parent Category ID</label>
              <input type="number" value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })} placeholder="Optional parent ID" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
              <input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: parseInt(e.target.value, 10) || 0 })} placeholder="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select value={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
