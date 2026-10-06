import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, AlertCircle, Upload, X, RefreshCw, Image as ImageIcon, Percent, DollarSign } from 'lucide-react';
import productService from '../../services/productService';

const tierPricingSchema = z.object({
  minQty: z.coerce.number().min(1, 'Minimum quantity is required'),
  maxQty: z.coerce.number().min(1, 'Maximum quantity is required'),
  unitPrice: z.coerce.number().min(0.01, 'Unit price must be > 0'),
}).refine(data => data.maxQty > data.minQty, {
  message: "Max quantity must be greater than min quantity",
  path: ["maxQty"],
});

const productSchema = z.object({
  name: z.string().min(1, 'Product Name is required'),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().min(1, 'Sub-category is required'),
  description: z.string().min(1, 'Description is required'),
  unit: z.enum(['Piece', 'Box', 'Crate', 'Ton']),
  currency: z.enum(['₹', '$', '€']).default('₹'),

  // 3-Tier Prices
  manufacturerPrice: z.coerce.number().min(0.01, 'Manufacturer price must be > 0'),
  distributorPrice: z.coerce.number().min(0.01, 'Distributor price must be > 0'),
  retailPrice: z.coerce.number().min(0.01, 'Retail price must be > 0'),

  moq: z.coerce.number().min(1, 'MOQ must be at least 1'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  hsnCode: z.string().optional().nullable(),
  gstRate: z.coerce.number().min(0, 'GST Rate must be 0 or higher').optional().nullable(),
  isInternational: z.boolean(),
  intlPrice: z.coerce.number().optional().nullable(),
  exportHsCode: z.string().optional().nullable(),
  catalogStatus: z.enum(['active', 'inactive']),
  tierPricing: z.array(tierPricingSchema).optional(),
  product_image: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  // Enforce M <= D <= R
  if (data.manufacturerPrice > data.distributorPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Manufacturer Price must be ≤ Distributor Price",
      path: ["manufacturerPrice"]
    });
  }
  if (data.distributorPrice > data.retailPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Distributor Price must be ≤ Retail Price (MRP)",
      path: ["distributorPrice"]
    });
  }

  if (data.isInternational) {
    if (!data.intlPrice || data.intlPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "International Price is required when international selling is enabled",
        path: ["intlPrice"]
      });
    }
    if (!data.exportHsCode || data.exportHsCode.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Export HS Code is required when international selling is enabled",
        path: ["exportHsCode"]
      });
    }
  }
});

export type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  categories: Record<string, string[]>;
  onSubmit: (data: ProductFormData) => void;
  isSaving: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, categories, onSubmit, isSaving }) => {
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema as any),
    defaultValues: {
      name: '',
      category: '',
      subCategory: '',
      description: '',
      unit: 'Piece',
      currency: '₹',
      manufacturerPrice: undefined,
      distributorPrice: undefined,
      retailPrice: undefined,
      moq: 1,
      stock: 0,
      hsnCode: '',
      gstRate: 18,
      isInternational: false,
      intlPrice: undefined,
      exportHsCode: '',
      catalogStatus: 'active',
      tierPricing: [],
      product_image: null,
      ...initialData,
    } as any
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tierPricing",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.product_image || null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const watchCategory = watch('category');
  const watchIsInternational = watch('isInternational');
  const watchCatalogStatus = watch('catalogStatus');
  const watchMPrice = watch('manufacturerPrice');
  const watchDPrice = watch('distributorPrice');
  const watchRPrice = watch('retailPrice');
  const watchCurrency = watch('currency') || '₹';

  const subCategoryOptions = watchCategory ? categories[watchCategory] || [] : [];

  // Live Margins Calculation
  const distMargin = watchMPrice && watchDPrice && watchDPrice > 0
    ? (((watchDPrice - watchMPrice) / watchDPrice) * 100).toFixed(1)
    : '0.0';

  const retailMargin = watchDPrice && watchRPrice && watchRPrice > 0
    ? (((watchRPrice - watchDPrice) / watchRPrice) * 100).toFixed(1)
    : '0.0';

  const totalDiscount = watchMPrice && watchRPrice && watchRPrice > 0
    ? (((watchRPrice - watchMPrice) / watchRPrice) * 100).toFixed(1)
    : '0.0';

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit');
      return;
    }

    // Validate extension
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid format. JPG, PNG, and WebP are allowed.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(20);

    try {
      // Create local preview
      const localUrl = URL.createObjectURL(file);
      setImagePreview(localUrl);

      setUploadProgress(50);
      const uploadRes = await productService.uploadImage(file, 'products');

      setUploadProgress(100);
      if (uploadRes.success && uploadRes.url) {
        setValue('product_image', uploadRes.url, { shouldValidate: true });
        setImagePreview(uploadRes.url);
      } else {
        throw new Error(uploadRes.message || 'Upload failed');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Image upload to MinIO failed');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setValue('product_image', '', { shouldValidate: true });
    setUploadError(null);
  };

  const renderError = (error?: { message?: string }) => {
    if (error && error.message) {
      return (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-500">
          <AlertCircle className="w-3.5 h-3.5" />
          {error.message}
        </div>
      );
    }
    return null;
  };

  const inputClasses = (error: boolean) => `
    w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm bg-white dark:bg-dark-surface-elevated text-gray-900 dark:text-dark-text-primary
    ${error ? 'border-red-500/50 dark:border-red-900/50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-300 dark:border-dark-border-secondary focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'}
  `;

  return (
    <form id="product-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">

      {/* MinIO Image Upload Section */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-dark-text-primary mb-4 pb-2 border-b dark:border-dark-border-primary flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-emerald-600" />
          Product Image (MinIO Storage)
        </h3>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-48 h-48 border-2 border-dashed border-gray-300 dark:border-dark-border-primary rounded-2xl flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-surface-card overflow-hidden relative group">
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Product Preview" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="p-2 bg-white text-gray-800 rounded-full cursor-pointer hover:bg-gray-100">
                    <RefreshCw className="w-4 h-4" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileChange} className="hidden" />
                  </label>
                  <button type="button" onClick={handleRemoveImage} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100/50 transition-colors p-4 text-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">Click to upload image</span>
                <span className="text-[10px] text-gray-400 dark:text-dark-text-muted mt-1">JPG, PNG, WebP (Max 5MB)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex-1 space-y-3 text-sm text-gray-600">
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs space-y-1">
              <p className="font-semibold text-emerald-900 dark:text-emerald-300">⚡ MinIO Secured Storage</p>
              <p>Uploaded images are stored directly in the high-performance MinIO Object Store bucket (<code className="bg-emerald-100 px-1 rounded text-emerald-800">adab-uploads</code>).</p>
            </div>

            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-emerald-600">
                  <span>Uploading to MinIO...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4" />
                {uploadError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Identity & Hierarchy */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-dark-text-primary mb-6 pb-2 border-b dark:border-dark-border-primary">Identity & Classification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
            <select
              {...register('category')}
              onChange={(e) => {
                setValue('category', e.target.value, { shouldValidate: true });
                setValue('subCategory', '');
              }}
              className={inputClasses(!!errors.category)}
            >
              <option value="">Select Category</option>
              {Object.keys(categories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            {renderError(errors.category)}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sub-category</label>
            <select
              {...register('subCategory')}
              disabled={!watchCategory}
              className={`${inputClasses(!!errors.subCategory)} ${!watchCategory ? 'opacity-50' : ''}`}
            >
              <option value="">Select Sub-category</option>
              {subCategoryOptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
            {renderError(errors.subCategory)}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name</label>
            <input
              type="text"
              {...register('name')}
              className={inputClasses(!!errors.name)}
              placeholder="e.g. Premium Cotton Textiles - Grade A"
            />
            {renderError(errors.name)}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={4}
              {...register('description')}
              className={`resize-none ${inputClasses(!!errors.description)}`}
              placeholder="Provide complete technical specifications and packaging details..."
            />
            {renderError(errors.description)}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Packaging Unit</label>
            <select {...register('unit')} className={inputClasses(!!errors.unit)}>
              <option value="Piece">Piece</option>
              <option value="Box">Box</option>
              <option value="Crate">Crate</option>
              <option value="Ton">Ton</option>
            </select>
            {renderError(errors.unit)}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Currency Symbol</label>
            <select {...register('currency')} className={inputClasses(!!errors.currency)}>
              <option value="₹">₹ INR (Indian Rupee)</option>
              <option value="$">$ USD (US Dollar)</option>
              <option value="€">€ EUR (Euro)</option>
            </select>
          </div>

        </div>
      </div>

      {/* 3-Tier Pricing Model */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6 pb-2 border-b dark:border-dark-border-primary">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-dark-text-primary">3-Tier Pricing Matrix</h3>
            <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">Strict Hierarchy Invariant: Manufacturer Price ≤ Distributor Price ≤ Retail Price (MRP)</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-600 uppercase tracking-widest">{watchCatalogStatus}</span>
            <button
              type="button"
              onClick={() => setValue('catalogStatus', watchCatalogStatus === 'active' ? 'inactive' : 'active')}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-offset-2 focus:ring-2 focus:ring-emerald-500/20 ${watchCatalogStatus === 'active' ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${watchCatalogStatus === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-teal-50/60 dark:bg-teal-950/20 p-4 rounded-xl border border-teal-200 dark:border-teal-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider">1. Manufacturer Cost</label>
              <span className="text-[10px] bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100 font-semibold px-2 py-0.5 rounded">Tier 1</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-semibold text-gray-500">{watchCurrency}</span>
              <input
                type="number"
                step="0.01"
                {...register('manufacturerPrice')}
                className={`pl-8 ${inputClasses(!!errors.manufacturerPrice)}`}
                placeholder="0.00"
              />
            </div>
            {renderError(errors.manufacturerPrice)}
            <p className="text-[11px] text-teal-700 dark:text-teal-400">Factory production cost base.</p>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">2. Distributor Price</label>
              <span className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-semibold px-2 py-0.5 rounded">Tier 2</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-semibold text-gray-500">{watchCurrency}</span>
              <input
                type="number"
                step="0.01"
                {...register('distributorPrice')}
                className={`pl-8 ${inputClasses(!!errors.distributorPrice)}`}
                placeholder="0.00"
              />
            </div>
            {renderError(errors.distributorPrice)}
            <p className="text-[11px] text-amber-700 dark:text-amber-400">Wholesale price offered to bulk buyers.</p>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">3. Retail MRP Price</label>
              <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-semibold px-2 py-0.5 rounded">Tier 3</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-semibold text-gray-500">{watchCurrency}</span>
              <input
                type="number"
                step="0.01"
                {...register('retailPrice')}
                className={`pl-8 ${inputClasses(!!errors.retailPrice)}`}
                placeholder="0.00"
              />
            </div>
            {renderError(errors.retailPrice)}
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Consumer Maximum Retail Price.</p>
          </div>
        </div>

        {/* Live Margin Calculation Widget */}
        <div className="mt-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold">Live Profit Margin Analytics:</span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-gray-400 block">Distributor Margin:</span>
              <span className="font-bold text-sm text-amber-400">{distMargin}%</span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-gray-400 block">Retail Margin:</span>
              <span className="font-bold text-sm text-emerald-400">{retailMargin}%</span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-gray-400 block">Total Max Discount:</span>
              <span className="font-bold text-sm text-adab-green">{totalDiscount}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Details */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-dark-text-primary mb-6 pb-2 border-b dark:border-dark-border-primary">Inventory & Compliance</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock Quantity</label>
            <input
              type="number"
              {...register('stock')}
              className={inputClasses(!!errors.stock)}
              placeholder="0"
            />
            {renderError(errors.stock)}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">MOQ (Minimum Order Qty)</label>
            <input
              type="number"
              {...register('moq')}
              className={inputClasses(!!errors.moq)}
              placeholder="50"
            />
            {renderError(errors.moq)}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">GST Rate (%)</label>
            <input
              type="number"
              step="0.01"
              {...register('gstRate')}
              className={inputClasses(!!errors.gstRate)}
              placeholder="18"
            />
            {renderError(errors.gstRate)}
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Domestic HSN Code</label>
            <input
              type="text"
              {...register('hsnCode')}
              className={inputClasses(!!errors.hsnCode)}
              placeholder="e.g. 3901"
            />
            {renderError(errors.hsnCode)}
          </div>
        </div>
      </div>

      {/* Volume Tier Pricing */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6 pb-2 border-b dark:border-dark-border-primary">
          <h3 className="font-bold text-gray-900 dark:text-dark-text-primary">Custom Volume Discounts</h3>
          <button
            type="button"
            onClick={() => append({ minQty: 0, maxQty: 0, unitPrice: 0 })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Tier
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No custom volume tiers defined. 3-tier distributor pricing will be used.</p>
        ) : (
          <div className="space-y-4">
            {fields.map((field: any, index: number) => (
              <div key={field.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    {...register(`tierPricing.${index}.minQty`)}
                    className={inputClasses(!!errors?.tierPricing?.[index]?.minQty)}
                  />
                  {renderError(errors?.tierPricing?.[index]?.minQty)}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Max Quantity</label>
                  <input
                    type="number"
                    {...register(`tierPricing.${index}.maxQty`)}
                    className={inputClasses(!!errors?.tierPricing?.[index]?.maxQty)}
                  />
                  {renderError(errors?.tierPricing?.[index]?.maxQty)}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price ({watchCurrency})</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`tierPricing.${index}.unitPrice`)}
                    className={inputClasses(!!errors?.tierPricing?.[index]?.unitPrice)}
                  />
                  {renderError(errors?.tierPricing?.[index]?.unitPrice)}
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market Reach */}
      <div className="bg-white dark:bg-dark-app-secondary border border-gray-200 dark:border-dark-border-primary rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-dark-text-primary mb-6 pb-2 border-b dark:border-dark-border-primary">International Market Reach</h3>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Export Eligibility</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setValue('isInternational', true)}
                className={`flex-1 py-3 border-2 rounded-xl font-bold text-sm transition-all ${watchIsInternational ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-500' : 'border-gray-200 dark:border-dark-border-secondary text-gray-500 dark:text-dark-text-secondary hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                Enabled for Cross-Border
              </button>
              <button
                type="button"
                onClick={() => setValue('isInternational', false)}
                className={`flex-1 py-3 border-2 rounded-xl font-bold text-sm transition-all ${!watchIsInternational ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' : 'border-gray-200 dark:border-dark-border-secondary text-gray-500 dark:text-dark-text-secondary hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                Domestic Only
              </button>
            </div>
          </div>

          {watchIsInternational && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">International Price ({watchCurrency})</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('intlPrice')}
                  className={inputClasses(!!errors.intlPrice)}
                  placeholder="0.00"
                />
                {renderError(errors.intlPrice)}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Export HS Code</label>
                <input
                  type="text"
                  {...register('exportHsCode')}
                  className={inputClasses(!!errors.exportHsCode)}
                  placeholder="e.g. 3901.10"
                />
                {renderError(errors.exportHsCode)}
              </div>
            </div>
          )}
        </div>
      </div>

      <button type="submit" id="product-form-submit" className="hidden">Submit</button>
    </form>
  );
};
