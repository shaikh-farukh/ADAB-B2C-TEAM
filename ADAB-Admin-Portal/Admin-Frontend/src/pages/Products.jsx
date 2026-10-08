import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import AdminTable from '../components/ui/AdminTable';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [filters, setFilters] = useState({ search: '', category_id: '', brand_id: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetails, setProductDetails] = useState(null);

  // Forms
  const [productForm, setProductForm] = useState({ title: '', category_id: '', brand_id: '', slug: '', description: '', barcode: '', is_active: true });
  const [variantForm, setVariantForm] = useState({ sku: '', variant_name: '', pack_size: '', weight_in_grams: '', mrp: '', base_cost: '', barcode: '', is_active: true });

  const fetchProducts = (p = 1) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: p, limit: 10 });
    if (filters.search) params.append('search', filters.search);
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.brand_id) params.append('brand_id', filters.brand_id);
    if (filters.status) params.append('status', filters.status);

    apiClient.get(`/products?${params.toString()}`)
      .then(res => {
        setProducts(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  };

  const fetchCategoryAndBrandOptions = () => {
    apiClient.get('/categories').then(res => setCategories(res.data.data || [])).catch(() => {});
    apiClient.get('/brands').then(res => setBrands(res.data.data || [])).catch(() => {});
  };

  useEffect(() => {
    fetchCategoryAndBrandOptions();
    fetchProducts(1);
  }, []);

  const handleCreateProduct = () => {
    if (!productForm.title.trim()) {
      alert('Product title is required');
      return;
    }
    apiClient.post('/products', productForm)
      .then(() => {
        setIsCreateModalOpen(false);
        setProductForm({ title: '', category_id: '', brand_id: '', slug: '', description: '', barcode: '', is_active: true });
        fetchProducts(1);
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to create product'));
  };

  const handleUpdateProduct = () => {
    if (!selectedProduct) return;
    apiClient.patch(`/products/${selectedProduct.id}`, productForm)
      .then(() => {
        setIsEditModalOpen(false);
        fetchProducts(pagination.page);
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to update product'));
  };

  const handleCreateVariant = () => {
    if (!selectedProduct) return;
    if (!variantForm.sku || !variantForm.variant_name || !variantForm.pack_size || !variantForm.mrp) {
      alert("Fields SKU, Variant Name, Pack Size, and MRP are required");
      return;
    }
    apiClient.post(`/products/${selectedProduct.id}/variants`, variantForm)
      .then(() => {
        setIsVariantModalOpen(false);
        setVariantForm({ sku: '', variant_name: '', pack_size: '', weight_in_grams: '', mrp: '', base_cost: '', barcode: '', is_active: true });
        openDetailsModal(selectedProduct);
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to create variant'));
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setProductForm({
      title: product.title || '',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      slug: product.slug || '',
      description: product.description || '',
      barcode: product.barcode || '',
      is_active: product.is_active !== undefined ? product.is_active : true
    });
    setIsEditModalOpen(true);
  };

  const openDetailsModal = (product) => {
    setSelectedProduct(product);
    apiClient.get(`/products/${product.id}`)
      .then(res => {
        setProductDetails(res.data.data || product);
        setIsDetailsModalOpen(true);
      })
      .catch(() => {
        setProductDetails(product);
        setIsDetailsModalOpen(true);
      });
  };

  const openVariantModal = (product) => {
    setSelectedProduct(product);
    setIsVariantModalOpen(true);
  };

  const columns = [
    { header: 'ID', render: (row) => <span className="text-xs font-mono text-slate-500">{row.id?.substring(0,8)}</span> },
    { header: 'Title', render: (row) => <span className="font-bold text-slate-800">{row.title || row.name}</span> },
    { header: 'Category', render: (row) => <span className="text-xs font-semibold text-slate-600">{row.category_name || row.category_id || 'N/A'}</span> },
    { header: 'Brand', render: (row) => <span className="text-xs font-semibold text-slate-600">{row.brand_name || row.brand_id || 'N/A'}</span> },
    { header: 'Barcode', render: (row) => <span className="text-xs font-mono text-slate-500">{row.barcode || 'N/A'}</span> },
    { header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    { header: 'Actions', render: (row) => (
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => openDetailsModal(row)} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-bold">Details</button>
        <button onClick={() => openEditModal(row)} className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-bold">Edit</button>
        <button onClick={() => openVariantModal(row)} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-lg font-bold">+ Variant</button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Product Master Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">Manage global product catalog masters, variants &amp; associated seller listings</p>
        </div>
        <button 
          onClick={() => {
            setProductForm({ title: '', category_id: '', brand_id: '', slug: '', description: '', barcode: '', is_active: true });
            setIsCreateModalOpen(true);
          }} 
          className="btn-primary flex items-center gap-2 text-xs font-extrabold"
        >
          <i className="fa-solid fa-plus"></i> Add Product Master
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <input 
          type="text" 
          placeholder="Search by title or barcode..." 
          value={filters.search} 
          onChange={e => setFilters({ ...filters, search: e.target.value })} 
          onKeyDown={e => e.key === 'Enter' && fetchProducts(1)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600"
        />
        <select 
          value={filters.category_id} 
          onChange={e => setFilters({ ...filters, category_id: e.target.value })} 
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select 
          value={filters.brand_id} 
          onChange={e => setFilters({ ...filters, brand_id: e.target.value })} 
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600"
        >
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select 
            value={filters.status} 
            onChange={e => setFilters({ ...filters, status: e.target.value })} 
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-600"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button onClick={() => fetchProducts(1)} className="btn-primary !px-3 !py-2 shrink-0">Filter</button>
        </div>
      </div>

      {error && <div className="text-rose-600 bg-rose-50 p-3 rounded-xl text-xs font-semibold">{error}</div>}

      <AdminTable columns={columns} data={products} loading={loading} emptyMessage="No product masters found." />

      <div className="mt-4">
        <Pagination page={pagination.page} total={pagination.total} pageSize={pagination.limit} onPageChange={p => fetchProducts(p)} />
      </div>

      {/* Create Product Master Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        title="Add Product Master"
        onClose={() => setIsCreateModalOpen(false)}
        onPrimary={handleCreateProduct}
        primaryLabel="Create Product"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Product Title *</label>
            <input type="text" value={productForm.title} onChange={e => setProductForm({ ...productForm, title: e.target.value })} placeholder="e.g. Organic Whole Milk 1L" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select value={productForm.category_id} onChange={e => setProductForm({ ...productForm, category_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600">
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
              <select value={productForm.brand_id} onChange={e => setProductForm({ ...productForm, brand_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600">
                <option value="">Select Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Custom Slug</label>
              <input type="text" value={productForm.slug} onChange={e => setProductForm({ ...productForm, slug: e.target.value })} placeholder="organic-milk-1l" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Barcode</label>
              <input type="text" value={productForm.barcode} onChange={e => setProductForm({ ...productForm, barcode: e.target.value })} placeholder="8901234567890" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-indigo-600" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea rows={2} value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} placeholder="Product overview & details..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
          </div>
        </div>
      </Modal>

      {/* Edit Product Master Modal */}
      <Modal
        isOpen={isEditModalOpen}
        title={`Edit Product Master: ${selectedProduct?.title || ''}`}
        onClose={() => setIsEditModalOpen(false)}
        onPrimary={handleUpdateProduct}
        primaryLabel="Save Changes"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Product Title</label>
            <input type="text" value={productForm.title} onChange={e => setProductForm({ ...productForm, title: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select value={productForm.category_id} onChange={e => setProductForm({ ...productForm, category_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600">
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
              <select value={productForm.brand_id} onChange={e => setProductForm({ ...productForm, brand_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600">
                <option value="">Select Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Barcode</label>
              <input type="text" value={productForm.barcode} onChange={e => setProductForm({ ...productForm, barcode: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Active Status</label>
              <select value={productForm.is_active} onChange={e => setProductForm({ ...productForm, is_active: e.target.value === 'true' })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-indigo-600">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Variant Modal */}
      <Modal
        isOpen={isVariantModalOpen}
        title={`Add Variant to '${selectedProduct?.title || ''}'`}
        onClose={() => setIsVariantModalOpen(false)}
        onPrimary={handleCreateVariant}
        primaryLabel="Create Variant"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SKU *</label>
              <input type="text" value={variantForm.sku} onChange={e => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder="MILK-1L-VAR1" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Variant Name *</label>
              <input type="text" value={variantForm.variant_name} onChange={e => setVariantForm({ ...variantForm, variant_name: e.target.value })} placeholder="1 Litre Tetra Pack" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pack Size *</label>
              <input type="text" value={variantForm.pack_size} onChange={e => setVariantForm({ ...variantForm, pack_size: e.target.value })} placeholder="1 L" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Weight in Grams</label>
              <input type="number" value={variantForm.weight_in_grams} onChange={e => setVariantForm({ ...variantForm, weight_in_grams: e.target.value })} placeholder="1000" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Printed MRP *</label>
              <input type="number" step="0.01" value={variantForm.mrp} onChange={e => setVariantForm({ ...variantForm, mrp: e.target.value })} placeholder="65.00" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Cost</label>
              <input type="number" step="0.01" value={variantForm.base_cost} onChange={e => setVariantForm({ ...variantForm, base_cost: e.target.value })} placeholder="52.00" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-600" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        title={`Product Details: ${productDetails?.title || selectedProduct?.title || ''}`}
        onClose={() => setIsDetailsModalOpen(false)}
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div><span className="font-bold text-slate-500">ID:</span> <span className="font-mono">{productDetails?.id}</span></div>
            <div><span className="font-bold text-slate-500">Barcode:</span> {productDetails?.barcode || 'N/A'}</div>
            <div><span className="font-bold text-slate-500">Category:</span> {productDetails?.category_name || productDetails?.category_id || 'N/A'}</div>
            <div><span className="font-bold text-slate-500">Brand:</span> {productDetails?.brand_name || productDetails?.brand_id || 'N/A'}</div>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-800 mb-2">Variants ({productDetails?.variants?.length || 0})</h4>
            {productDetails?.variants && productDetails.variants.length > 0 ? (
              <div className="space-y-1.5">
                {productDetails.variants.map((v, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">{v.variant_name} ({v.pack_size})</div>
                      <div className="text-[11px] text-slate-500 font-mono">SKU: {v.sku}</div>
                    </div>
                    <div className="font-extrabold text-indigo-700">₹{v.mrp}</div>
                  </div>
                ))}
              </div>
            ) : <div className="text-slate-400 italic">No variants created for this master product.</div>}
          </div>

          <div>
            <h4 className="font-extrabold text-slate-800 mb-2">Associated Seller Listings ({productDetails?.listings?.length || 0})</h4>
            {productDetails?.listings && productDetails.listings.length > 0 ? (
              <div className="space-y-1.5">
                {productDetails.listings.map((l, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">{l.title}</div>
                      <div className="text-[11px] text-slate-500">Store: {l.store_name || l.store_id}</div>
                    </div>
                    <StatusBadge status={l.approval_status || l.status} />
                  </div>
                ))}
              </div>
            ) : <div className="text-slate-400 italic">No seller listings linked yet.</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
