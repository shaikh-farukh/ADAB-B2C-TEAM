import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import ImageUploadWidget from '../components/ui/ImageUploadWidget';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [allCategoriesList, setAllCategoriesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const initialForm = {
    name: '',
    slug: '',
    parent_id: '',
    icon_class: '',
    image_url: '',
    image_public_id: '',
    is_active: true,
    display_order: 0
  };

  const [form, setForm] = useState(initialForm);

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

  const fetchParentOptions = () => {
    apiClient.get('/categories?limit=200')
      .then(res => setAllCategoriesList(res.data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCategories(1);
    fetchParentOptions();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name || '',
      slug: cat.slug || '',
      parent_id: cat.parent_id !== null && cat.parent_id !== undefined ? String(cat.parent_id) : '',
      icon_class: cat.icon_class || '',
      image_url: cat.image_url || '',
      image_public_id: cat.image_public_id || '',
      is_active: cat.is_active !== undefined ? cat.is_active : true,
      display_order: cat.display_order !== undefined ? cat.display_order : 0
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (cat) => {
    setDeletingCategory(cat);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert('Category name is required');
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      parent_id: form.parent_id ? parseInt(form.parent_id, 10) : null,
      icon_class: form.icon_class.trim() || null,
      image_url: form.image_url.trim() || null,
      image_public_id: form.image_public_id.trim() || null,
      is_active: Boolean(form.is_active),
      display_order: parseInt(form.display_order, 10) || 0
    };

    if (editingCategory) {
      apiClient.patch(`/categories/${editingCategory.id}`, payload)
        .then(() => {
          setIsModalOpen(false);
          fetchCategories(pagination.page);
          fetchParentOptions();
        })
        .catch(err => alert(err.response?.data?.message || 'Failed to update category'));
    } else {
      apiClient.post('/categories', payload)
        .then(() => {
          setIsModalOpen(false);
          fetchCategories(1);
          fetchParentOptions();
        })
        .catch(err => alert(err.response?.data?.message || 'Failed to create category'));
    }
  };

  const handleDeleteConfirm = () => {
    if (!deletingCategory) return;
    setDeleteError(null);

    apiClient.delete(`/categories/${deletingCategory.id}`)
      .then(() => {
        setIsDeleteModalOpen(false);
        setDeletingCategory(null);
        fetchCategories(pagination.page);
        fetchParentOptions();
      })
      .catch(err => {
        setDeleteError(err.response?.data?.message || 'Failed to delete category');
      });
  };

  const columns = [
    { 
      header: 'ID', 
      render: (row) => <span className="text-xs font-mono text-slate-500 font-semibold">{row.id}</span> 
    },
    {
      header: 'Icon / Image',
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Normal-sized thumbnail (w-9 h-9, 36px) */}
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
            {row.image_url ? (
              <img
                src={row.image_url}
                alt={row.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/60x60?text=Cat';
                }}
              />
            ) : (
              <i className={`${row.icon_class || 'fa-solid fa-shapes'} text-slate-400 text-sm`}></i>
            )}
          </div>
          {row.image_public_id && (
            <span className="text-[10px] font-mono text-slate-400 max-w-[100px] truncate" title={row.image_public_id}>
              {row.image_public_id}
            </span>
          )}
        </div>
      )
    },
    { 
      header: 'Category Name', 
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 block text-xs">{row.name}</span>
          <span className="text-[11px] font-mono text-slate-400">{row.slug}</span>
        </div>
      ) 
    },
    { 
      header: 'Parent Level', 
      render: (row) => {
        if (!row.parent_id) {
          return <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">Top Level</span>;
        }
        const parent = allCategoriesList.find(c => c.id === row.parent_id);
        return (
          <span className="text-xs text-slate-600">
            {parent ? parent.name : `Parent #${row.parent_id}`}
          </span>
        );
      } 
    },
    { 
      header: 'Display Order', 
      render: (row) => <span className="text-xs font-semibold text-slate-700">{row.display_order || 0}</span> 
    },
    { 
      header: 'Status', 
      render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} /> 
    },
    { 
      header: 'Actions', 
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => openEditModal(row)} 
            className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-bold transition-colors"
          >
            Edit
          </button>
          <button 
            onClick={() => openDeleteModal(row)} 
            className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 px-2.5 py-1 rounded-lg font-bold transition-colors"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Category Governance</h1>
          <p className="text-xs text-slate-500 mt-1">Manage product categories, subcategories, image icons &amp; taxonomy order</p>
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

      {/* Create / Edit Modal with Normal-Sized Image Upload Widget */}
      <Modal
        isOpen={isModalOpen}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Category'}
        onClose={() => setIsModalOpen(false)}
        onPrimary={handleSubmit}
        primaryLabel={editingCategory ? 'Save Changes' : 'Create Category'}
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              placeholder="e.g. Dairy &amp; Bakery" 
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" 
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Custom Slug</label>
              <input 
                type="text" 
                value={form.slug} 
                onChange={e => setForm({ ...form, slug: e.target.value })} 
                placeholder="dairy-bakery" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600 font-mono" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Parent Category</label>
              <select 
                value={form.parent_id} 
                onChange={e => setForm({ ...form, parent_id: e.target.value })} 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600"
              >
                <option value="">None (Top-Level Category)</option>
                {allCategoriesList
                  .filter(c => !editingCategory || c.id !== editingCategory.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Normal-sized Image CRUD / Upload Box */}
          <ImageUploadWidget
            label="Category Icon / Banner"
            imageUrl={form.image_url}
            imagePublicId={form.image_public_id}
            folder="adab/categories"
            onChange={({ imageUrl, imagePublicId }) => {
              setForm(prev => ({
                ...prev,
                image_url: imageUrl,
                image_public_id: imagePublicId
              }));
            }}
            onRemove={() => {
              setForm(prev => ({
                ...prev,
                image_url: '',
                image_public_id: ''
              }));
            }}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
              <input 
                type="number" 
                value={form.display_order} 
                onChange={e => setForm({ ...form, display_order: parseInt(e.target.value, 10) || 0 })} 
                placeholder="0" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select 
                value={form.is_active ? 'true' : 'false'} 
                onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })} 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Delete Category"
        onClose={() => setIsDeleteModalOpen(false)}
        onPrimary={handleDeleteConfirm}
        primaryLabel="Delete Category"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-700">
            Are you sure you want to delete category <strong className="text-rose-600">{deletingCategory?.name}</strong>?
          </p>
          <p className="text-slate-500 text-[11px]">
            This action cannot be undone. Categories with active subcategories or assigned products cannot be removed until reassigned.
          </p>
          {deleteError && (
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl font-semibold border border-rose-200">
              {deleteError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
