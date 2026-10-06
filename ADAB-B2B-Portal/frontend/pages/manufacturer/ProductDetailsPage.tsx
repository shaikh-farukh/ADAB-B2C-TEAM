import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  DollarSign, 
  Boxes, 
  Globe, 
  Info,
  ShieldCheck,
  Edit3,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Tag
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import productService from '../../services/productService';
import { useNotification } from '../../context/NotificationContext';

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showWarning } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await productService.getProductById(id);
        if (response.success && response.data) {
          setProduct(response.data);
        } else {
          showError(response.message || "Product not found");
        }
      } catch (err: any) {
        showError(err.response?.data?.message || "Internal network error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, showError]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      const response = await productService.deleteProduct(id);
      if (response.success) {
        showWarning("Product removed from catalog");
        navigate('/manufacturer/products');
      } else {
        showError(response.message || "Failed to delete product");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Network error during deletion");
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (!isLoading && !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <Info className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Product Not Found</h2>
        <button onClick={() => navigate('/manufacturer/products')} className="mt-6 font-bold text-adab-green hover:underline uppercase tracking-widest text-xs">Return to Catalog</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-gray-100 dark:border-gray-800 pb-10">
        <div className="flex-1">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-adab-green transition-colors mb-6 group">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
          </button>
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="bg-gray-100 dark:bg-gray-800 h-10 w-2/3 rounded-xl" />
              <div className="bg-gray-50 dark:bg-gray-850 h-4 w-1/3 rounded-lg" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <StatusBadge status={product?.status || ''} className="px-4 py-1" />
                <span className="text-[11px] font-mono font-black text-adab-green bg-adab-green/10 border border-adab-green/30 px-3 py-1 rounded-xl shadow-xs">
                  ID: #{product?.id}
                </span>
                <span className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-xl">
                  SKU: {product?.sku || 'N/A'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-2">{product?.product_name}</h1>
              <p className="text-base text-gray-500 font-medium max-w-2xl">{product?.category} &bull; {product?.sub_category || 'General'}</p>
            </>
          )}
        </div>
        {!isLoading && (
          <div className="flex flex-wrap items-center gap-3">
             <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center justify-center px-6 py-4 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/40 text-red-500 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-95"
            >
              <Trash2 className="w-5 h-5 mr-3" />
              Delete Product
            </button>
            <button 
              onClick={() => navigate(`/manufacturer/products/edit/${id}`)}
              className="inline-flex items-center justify-center px-8 py-4 bg-adab-orange text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 shadow-xl shadow-orange-900/10 transition-all active:scale-95"
            >
              <Edit3 className="w-5 h-5 mr-3" />
              Edit Details
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Media & Metadata Column */}
        <div className="lg:col-span-5 space-y-6">
          {isLoading ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm animate-pulse h-80" />
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
              {/* Product Badges Bar */}
              <div className="w-full flex items-center justify-between mb-4 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-adab-green/10 border border-adab-green/30 text-adab-darkGreen dark:text-adab-green font-mono text-xs font-black">
                  <Tag className="w-3.5 h-3.5 text-adab-green" />
                  ID: #{product?.id}
                </span>
                
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-mono text-xs font-bold">
                  SKU: {product?.sku || 'N/A'}
                </span>
              </div>

              {/* Main Product Image Container */}
              <div className="w-full h-80 flex items-center justify-center bg-gradient-to-b from-gray-50 via-emerald-50/20 to-gray-100/50 dark:from-gray-800/40 dark:via-emerald-950/10 dark:to-gray-850/40 rounded-2xl p-6 relative border border-gray-100 dark:border-gray-800 group-hover:border-adab-green/30 transition-colors">
                {product?.product_image ? (
                  <img 
                    src={product.product_image} 
                    alt={product.product_name} 
                    className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-lg" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-2">
                    <Boxes className="w-20 h-24 stroke-[1.5]" />
                    <span className="text-xs font-semibold text-gray-400">No Image Uploaded</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logistics & Scope summary cards */}
          {!isLoading && product && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available Inventory</p>
                  <p className={`text-2xl font-black tracking-tight ${product.stock_quantity > 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>
                    {product.stock_quantity?.toLocaleString() || 0} <span className="text-xs font-bold text-gray-400">UNITS</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">MOQ</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{product.moq || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Details Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {isLoading ? (
             <div className="space-y-6 animate-pulse">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 h-48" />
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 h-32" />
             </div>
          ) : (
            <>
              {/* 3-Tier Financial Structure Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-adab-green" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-900 dark:text-white">Wholesale Financial Structure</h3>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">3-Tier Pricing</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-teal-50/60 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/40">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">MFR Cost</span>
                    <p className="text-xl font-black text-teal-900 dark:text-teal-300 mt-1">
                      {product.currency || '₹'}{Number(product.manufacturer_price || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-adab-green/10 dark:bg-adab-green/20 p-4 rounded-2xl border-2 border-adab-green/40">
                    <span className="text-[10px] font-black uppercase tracking-wider text-adab-darkGreen dark:text-adab-green">Distributor Price</span>
                    <p className="text-xl font-black text-adab-darkGreen dark:text-adab-green mt-1">
                      {product.currency || '₹'}{Number(product.distributor_price || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Retail MRP</span>
                    <p className="text-xl font-black text-gray-800 dark:text-gray-200 mt-1">
                      {product.currency || '₹'}{Number(product.retail_price || product.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Intelligence / Overview */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
                <div className="pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 mb-4">
                  <FileText className="w-5 h-5 text-adab-green" />
                  <h3 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest">Product Intelligence</h3>
                </div>
                <div>
                  <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
                    {product?.description || "No specific product description provided."}
                  </p>
                </div>
              </div>

              {/* Scope & Export Banner */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-50 dark:bg-orange-950/40 p-3 rounded-2xl text-adab-orange">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Market Reach Scope</p>
                    <p className="text-base font-black text-gray-900 dark:text-white uppercase mt-0.5">
                      {product.international_selling === 'Yes' ? 'Global Export Item' : 'Domestic Wholesale Only'}
                    </p>
                  </div>
                </div>

                {product.international_price && (
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/40">
                    ${Number(product.international_price).toFixed(2)} USD
                  </span>
                )}
              </div>

              {/* Certification & Quality */}
              <div className="bg-adab-green/5 border border-adab-green/20 rounded-3xl p-6 flex items-start gap-4">
                <ShieldCheck className="w-7 h-7 text-adab-green shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white text-xs uppercase tracking-widest mb-1">CERTIFICATION & QUALITY</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                    This product undergoes rigorous industrial quality audits and is certified for global distribution across your approved partner networks.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowDeleteConfirm(false)} />
          <div className="bg-white border border-gray-200 rounded-[2rem] w-full max-w-md p-10 shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-8 mx-auto shadow-inner">
               <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 text-center tracking-tight leading-none mb-3 uppercase">Delete Permanent?</h3>
            <p className="text-gray-500 text-center text-sm font-medium leading-relaxed mb-10">
              Are you sure you want to delete this product listing? This will remove it from all distributor catalogs immediately.
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
                className="w-full py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all active:scale-95"
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

export default ProductDetailsPage;