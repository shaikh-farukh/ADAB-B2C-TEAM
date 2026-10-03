import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Save,
  Package,
  Tag,
  IndianRupee,
  Boxes,
  Globe,
  Layers,
  CheckCircle2,
  AlertCircle,
  Hash,
  Trash2,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';

const ProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();

  const [initialData, setInitialData] = useState<any>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hierarchy, setHierarchy] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFrameClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev: any) => ({ ...prev, product_image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData((prev: any) => ({ ...prev, product_image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const response = await productService.getProductById(id);
        if (response.success && response.data) {
          setInitialData(response.data);
          setFormData({ ...response.data });
        }
      } catch (err) {
        showError("Failed to load product for editing");
      }
    };
    fetchProduct();
  }, [id, showError]);

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const categoriesResponse = await categoryService.getCategories();
        const categories = categoriesResponse?.data || [];
        const entries = await Promise.all(
          categories.map(async (cat: any) => {
            const subRes = await categoryService.getSubcategories(cat.id);
            const subData = subRes?.data || [];
            return [
              cat.category_name,
              subData.map((s: any) => s.subcategory_name)
            ] as const;
          })
        );
        setHierarchy(Object.fromEntries(entries));
      } catch {
        setHierarchy({});
      }
    };

    fetchHierarchy();
  }, []);

  // Derived sub-categories
  const subCategoryOptions = useMemo(() => {
    return formData?.category ? hierarchy[formData.category] || [] : [];
  }, [formData?.category, hierarchy]);

  if (!formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs text-center">Loading Product Data...</p>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'category') {
      setFormData((prev: any) => ({ ...prev, category: value, sub_category: '' }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [name]: name === 'price' || name === 'manufacturer_price' || name === 'distributor_price' || name === 'retail_price' || name === 'stock_quantity' || name === 'moq' || name === 'international_price' || name === 'gst_rate'
          ? (value === '' ? '' : parseFloat(value))
          : value
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    // 3-Tier Pricing Validation
    const mP = Number(formData.manufacturer_price || (Number(formData.retail_price || formData.price || 0) * 0.70));
    const dP = Number(formData.distributor_price || (Number(formData.retail_price || formData.price || 0) * 0.85));
    const rP = Number(formData.retail_price || formData.price || 0);

    if (mP > dP || dP > rP) {
      showError("Invalid pricing hierarchy: Manufacturer Price ≤ Distributor Price ≤ Retail Price (MRP)");
      return;
    }

    setIsSaving(true);

    const deltaPayload: any = {};
    Object.keys(formData).forEach(key => {
      if (formData[key] !== initialData[key] && key !== 'id' && formData[key] !== '') {
        deltaPayload[key] = formData[key];
      }
    });

    if (Object.keys(deltaPayload).length === 0) {
      showSuccess("No changes detected.");
      navigate(`/manufacturer/products/view/${id}`, { replace: true });
      return;
    }

    try {
      const response = await productService.updateProduct(id, deltaPayload);
      if (response.success) {
        showSuccess(response.message || "Product updated successfully");
        navigate(`/manufacturer/products/view/${id}`, { replace: true });
      } else {
        showError(response.message || "Failed to update product");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Network error while saving updates");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const response = await productService.deleteProduct(id);
      if (response.success) {
        showWarning("Product removed from catalog");
        navigate('/manufacturer/products', { replace: true });
      } else {
        showError("Failed to delete product");
      }
    } catch (err) {
      showError("Network error during deletion");
    }
  };

  const inputClasses = "w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-app-primary border border-gray-200 dark:border-dark-border-primary rounded-lg outline-none transition-all focus:ring-2 focus:ring-adab-green/20 focus:border-adab-green dark:focus:border-adab-green focus:bg-white dark:focus:bg-dark-surface-hover text-sm font-medium text-gray-900 dark:text-gray-100";

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8 mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-adab-green transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Discard Changes
          </button>
          <div className="flex items-center gap-3 text-adab-orange mb-1">
            <Tag className="w-5 h-5" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]">Editing Product</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight break-words">
              SKU: {formData.sku || 'N/A'}
            </h1>
            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700">
              ID: {id}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="space-y-6 md:col-span-1">
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl overflow-hidden shadow-sm p-6">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Product Visual</h3>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={handleUploadFrameClick}
              className="aspect-square bg-gray-50 dark:bg-dark-surface-card border-2 border-dashed border-gray-200 dark:border-dark-border-primary rounded-2xl flex flex-col items-center justify-center text-gray-400 group hover:border-adab-green/50 dark:hover:border-adab-green/50 transition-colors cursor-pointer p-4 overflow-hidden relative"
            >
              {formData.product_image ? (
                <>
                  <img
                    src={formData.product_image}
                    alt="Product Preview"
                    className="w-full h-full object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                    <Upload className="w-8 h-8" />
                    <span className="text-xs font-bold uppercase tracking-wider">Change Image</span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 md:w-12 md:h-12 mb-3 group-hover:text-adab-green transition-colors" />
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Upload Frame</p>
                  <p className="text-[9px] mt-1 italic text-center">800x800 industrial spec</p>
                </>
              )}
            </div>
          </div>

          {/* System Identifiers (Read-Only) */}
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Identifiers (Read Only)</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Product ID</label>
                <input
                  type="text"
                  value={id || ''}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono font-bold text-gray-600 dark:text-gray-300 cursor-not-allowed text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">SKU Number</label>
                <input
                  type="text"
                  value={formData.sku || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono font-bold text-gray-600 dark:text-gray-300 cursor-not-allowed text-xs outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border-primary bg-gray-50/50 dark:bg-dark-surface-card flex items-center gap-3">
              <Package className="w-5 h-5 text-adab-green" />
              <h3 className="font-bold text-gray-900 text-sm md:text-base">Identity & Hierarchy</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={inputClasses}
                    required
                  >
                    <option value="">Select Category</option>
                    {Object.keys(hierarchy).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Sub-Category</label>
                  <select
                    name="sub_category"
                    value={formData.sub_category}
                    onChange={handleInputChange}
                    disabled={!formData.category}
                    className={inputClasses}
                    required
                  >
                    <option value="">Select Sub-category</option>
                    {subCategoryOptions.map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Product Display Name</label>
                <input
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  className={inputClasses}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Technical Description</label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`${inputClasses} resize-none`}
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border-primary bg-gray-50/50 dark:bg-dark-surface-card flex items-center gap-3">
              <IndianRupee className="w-5 h-5 text-adab-green" />
              <h3 className="font-bold text-gray-900 text-sm md:text-base">Commercial & Inventory</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Currency Symbol</label>
                <select
                  name="currency"
                  value={formData.currency || '₹'}
                  onChange={handleInputChange}
                  className={inputClasses}
                >
                  <option value="₹">₹ INR (Indian Rupee)</option>
                  <option value="$">$ USD (US Dollar)</option>
                  <option value="€">€ EUR (Euro)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Manufacturer Price ({formData.currency || '₹'})</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">{formData.currency || '₹'}</span>
                  <input
                    name="manufacturer_price"
                    type="number"
                    step="0.01"
                    value={formData.manufacturer_price ?? ''}
                    onChange={handleInputChange}
                    placeholder="Base cost"
                    className={`${inputClasses} pl-8`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Distributor Price ({formData.currency || '₹'})</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">{formData.currency || '₹'}</span>
                  <input
                    name="distributor_price"
                    type="number"
                    step="0.01"
                    value={formData.distributor_price ?? ''}
                    onChange={handleInputChange}
                    placeholder="Wholesale price"
                    className={`${inputClasses} pl-8`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Retail Price / MRP ({formData.currency || '₹'})</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">{formData.currency || '₹'}</span>
                  <input
                    name="retail_price"
                    type="number"
                    step="0.01"
                    value={formData.retail_price ?? formData.price ?? ''}
                    onChange={handleInputChange}
                    placeholder="End-user MRP"
                    className={`${inputClasses} pl-8`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Packaging Unit</label>
                <select
                  name="unit"
                  value={formData.unit || 'Piece'}
                  onChange={handleInputChange}
                  className={inputClasses}
                  required
                >
                  <option value="Piece">Piece</option>
                  <option value="Box">Box</option>
                  <option value="Crate">Crate</option>
                  <option value="Ton">Ton</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Stock Level</label>
                <div className="relative">
                  <Boxes className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    name="stock_quantity"
                    type="number"
                    value={formData.stock_quantity ?? ''}
                    onChange={handleInputChange}
                    className={`${inputClasses} pl-10`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">MOQ Units</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    name="moq"
                    type="number"
                    value={formData.moq ?? ''}
                    onChange={handleInputChange}
                    className={`${inputClasses} pl-10`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Domestic HSN Code</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    name="hsn_code"
                    type="text"
                    value={formData.hsn_code || ''}
                    onChange={handleInputChange}
                    className={`${inputClasses} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">GST Rate (%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">%</span>
                  <input
                    name="gst_rate"
                    type="number"
                    step="0.01"
                    value={formData.gst_rate || ''}
                    onChange={handleInputChange}
                    className={`${inputClasses} pl-8`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border-primary bg-gray-50/50 dark:bg-dark-surface-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-adab-orange" />
                <h3 className="font-bold text-gray-900 text-sm md:text-base">Visibility, Market Scope & Global Pricing</h3>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${formData.international_selling ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/40 dark:text-orange-400' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                {formData.international_selling ? 'International Enabled' : 'Domestic Only'}
              </span>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">International Market Selling</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData((p: any) => ({ ...p, international_selling: true }))}
                      className={`flex-1 flex items-center justify-center py-2.5 border-2 rounded-xl font-bold transition-all text-sm ${formData.international_selling ? 'border-adab-orange bg-orange-50 text-adab-orange' : 'border-gray-200 text-gray-500'}`}
                    >
                      Export Enabled
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p: any) => ({ ...p, international_selling: false, international_price: '' }))}
                      className={`flex-1 flex items-center justify-center py-2.5 border-2 rounded-xl font-bold transition-all text-sm ${!formData.international_selling ? 'border-adab-green bg-green-50 text-adab-green' : 'border-gray-200 text-gray-500'}`}
                    >
                      Domestic Only
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Listing Status</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData((p: any) => ({ ...p, status: 'active' }))}
                      className={`flex-1 flex items-center justify-center py-2.5 border-2 rounded-xl font-bold transition-all text-sm ${formData.status === 'active' ? 'border-adab-green bg-green-50 text-adab-green' : 'border-gray-200 text-gray-500'}`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p: any) => ({ ...p, status: 'inactive' }))}
                      className={`flex-1 flex items-center justify-center py-2.5 border-2 rounded-xl font-bold transition-all text-sm ${formData.status === 'inactive' ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 text-gray-500'}`}
                    >
                      Archived
                    </button>
                  </div>
                </div>
              </div>

              {/* International Price Section */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    International Unit Price ($ USD)
                  </label>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {formData.international_selling ? 'Required for Export' : 'Setting a price will enable International Selling'}
                  </span>
                </div>
                <div className="relative max-w-md">
                  <span className="absolute left-3 top-2.5 text-amber-600 font-bold">$</span>
                  <input
                    name="international_price"
                    type="number"
                    step="0.01"
                    value={formData.international_price ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p: any) => ({
                        ...p,
                        international_price: val === '' ? '' : parseFloat(val),
                        international_selling: val !== '' && parseFloat(val) > 0 ? true : p.international_selling
                      }));
                    }}
                    placeholder="e.g. 15.50"
                    className={`${inputClasses} pl-8 border-amber-200 focus:border-adab-orange focus:ring-adab-orange/20`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400 uppercase">USD</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Set global export rate in USD for international buyers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-3 flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate(`/manufacturer/products/view/${id}`)}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3 rounded-xl font-bold text-white transition-all shadow-lg active:scale-[0.98]
              ${isSaving ? 'bg-gray-400' : 'bg-adab-green hover:bg-green-800'}`}
          >
            {isSaving ? (
              <>
                <CheckCircle2 className="w-5 h-5 animate-pulse" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Commit Changes
              </>
            )}
          </button>
        </div>
      </form>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowDeleteConfirm(false)} />
          <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-[2rem] w-full max-w-md p-10 shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-8 mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 text-center tracking-tight leading-none mb-3 uppercase">Delete Product?</h3>
            <p className="text-gray-500 text-center text-sm font-medium leading-relaxed mb-10">
              This action will permanently remove <span className="font-bold text-gray-900">{formData.product_name}</span> from the system.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                className="w-full py-4 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-red-900/20 hover:bg-red-600 transition-all active:scale-95"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-4 bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary text-gray-500 dark:text-gray-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductEditPage;
