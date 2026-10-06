import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Upload,
  PlusCircle,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import { ProductForm, ProductFormData } from '../../components/manufacturer/ProductForm';

const ProductManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [productImage, setProductImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [hierarchy, setHierarchy] = useState<Record<string, string[]>>({});

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
      setProductImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProductImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const handleFormSubmit = async (data: ProductFormData) => {
    setIsSaving(true);

    // Map to backend contract
    const payload = {
      product_name: data.name,
      product_image: data.product_image || productImage,
      category: data.category,
      sub_category: data.subCategory,
      description: data.description,
      manufacturer_price: data.manufacturerPrice,
      distributor_price: data.distributorPrice,
      retail_price: data.retailPrice,
      price: data.retailPrice,
      unit: data.unit,
      currency: data.currency,
      moq: data.moq,
      stock_quantity: data.stock,
      international_selling: data.isInternational,
      international_price: data.intlPrice,
      export_hs_code: data.exportHsCode,
      hsn_code: data.hsnCode,
      gst_rate: data.gstRate,
      status: data.catalogStatus,
      tier_pricing: data.tierPricing,
    };

    try {
      const response = await productService.addProduct(payload);
      if (response.success) {
        showSuccess(response.message || "Product listed successfully");
        navigate('/manufacturer/products', { replace: true });
      } else {
        showError(response.message || "Failed to create product listing");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Network error while saving product");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerSubmit = () => {
    document.getElementById('product-form-submit')?.click();
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-dark-text-primary tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
            New Product Listing
          </h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500 font-medium">Define your production item specs and market preferences.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => navigate('/manufacturer/products')}
            className="w-full sm:w-auto px-6 py-2.5 text-gray-500 dark:text-dark-text-muted font-bold uppercase text-xs tracking-widest hover:text-gray-900 dark:hover:text-dark-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={triggerSubmit}
            className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-white rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all shadow-lg active:scale-[0.98]
              ${!isSaving
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-gray-300 cursor-not-allowed opacity-80'}`}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {isSaving ? 'Processing...' : 'Save Product'}
          </button>
        </div>
      </div>

      <div className="w-full">
        <ProductForm 
          categories={hierarchy} 
          onSubmit={handleFormSubmit} 
          isSaving={isSaving} 
        />
      </div>
    </div>
  );
};

export default ProductManagementPage;
