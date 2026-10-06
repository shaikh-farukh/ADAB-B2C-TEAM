import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  DollarSign, 
  Boxes, 
  Globe, 
  Info,
  ShieldCheck,
  ShoppingCart,
  FileText,
  Package,
  Building2,
  Tag,
  Layers,
  Award,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import TierPriceWidget from '../../components/distributor/TierPriceWidget';
import distributorService from '../../services/distributorService';
import { useNotification } from '../../context/NotificationContext';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await distributorService.getProductDetails(id);
        if (response.success && response.data) {
          setProduct(response.data);
          setQuantity(response.data.moq || 1);
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

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAdding(true);
    try {
      const response = await distributorService.addToCart({
        product_id: Number(product.id),
        quantity: quantity
      });
      
      if (response.success) {
        showSuccess(response.message || "Added to cart successfully");
        navigate('/distributor/cart');
      } else {
        showError(response.message || "Failed to add to cart");
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse pb-24">
        <div className="flex flex-col lg:flex-row justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
          <div className="space-y-3">
            <div className="bg-gray-200 dark:bg-gray-800 h-4 w-32 rounded-lg" />
            <div className="bg-gray-300 dark:bg-gray-700 h-9 w-80 rounded-xl" />
          </div>
          <div className="bg-gray-200 dark:bg-gray-800 h-16 w-64 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl h-80" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl h-32" />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl h-48" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-center px-4">
        <div className="bg-rose-50 dark:bg-rose-950/40 p-5 rounded-3xl mb-4 border border-rose-100 dark:border-rose-900/40">
          <Info className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Product Record Unavailable</h2>
        <p className="text-gray-500 text-sm max-w-sm mt-2 font-medium">The requested item might have been archived or removed from the active wholesale catalog.</p>
        <button 
          onClick={() => navigate('/distributor/catalog')} 
          className="mt-6 px-6 py-3 bg-adab-green text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-md shadow-adab-green/20"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const unitStr = product.unit || 'Piece';
  const priceVal = Number(product.distributor_price || product.price || 0);
  const mPriceVal = product.manufacturer_price ? Number(product.manufacturer_price) : null;
  const rPriceVal = product.retail_price ? Number(product.retail_price) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-adab-green transition-colors mb-3 group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>BACK</span>
          </button>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Product ID Pill */}
              <span className="text-[11px] font-mono font-black text-adab-green bg-adab-green/10 border border-adab-green/30 px-3 py-1 rounded-xl shadow-xs">
                ID: #{product.id}
              </span>
              
              {/* SKU Pill */}
              <span className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-xl">
                SKU: {product.sku || 'N/A'}
              </span>

              {/* Category Pill */}
              <span className="text-[11px] font-black text-adab-orange uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-xl border border-orange-200/60 dark:border-orange-900/40">
                {product.category}
              </span>

              {/* Scope Pill */}
              <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-xl border ${product.international_selling === 'Yes' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'}`}>
                {product.international_selling === 'Yes' ? 'Global Export Item' : 'Domestic Wholesale Only'}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mt-1">
              {product.product_name}
            </h1>
          </div>
        </div>

        {/* Action Header Card */}
        <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-md">
          <div className="text-right pr-4 border-r border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wholesale Unit Rate</p>
            <p className="text-2xl font-black text-adab-darkGreen dark:text-adab-green">
              {product.currency || '₹'}{priceVal.toFixed(2)}
            </p>
          </div>

          {(product?.stock_quantity ?? 0) > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Quantity</span>
                <input 
                  type="number" 
                  min={product?.moq || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(product?.moq || 1, Number(e.target.value)))}
                  className="w-20 border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl px-2 py-2 text-center font-bold text-sm focus:outline-none focus:border-adab-green"
                />
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={isAdding}
                className="px-6 py-3.5 bg-adab-green hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-adab-green/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {isAdding ? 'Adding...' : 'Add to Order'}
              </button>
            </div>
          ) : (
            <div className="px-5 py-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-600 dark:text-rose-400 font-extrabold text-xs uppercase tracking-wider">
              Currently Out of Stock
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Media & Highlights (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Image Showcase */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
            
            {/* Top Badges overlaying image box */}
            <div className="w-full flex items-center justify-between mb-4 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-adab-green/10 border border-adab-green/30 text-adab-darkGreen dark:text-adab-green font-mono text-xs font-black">
                <Tag className="w-3.5 h-3.5 text-adab-green" />
                ID: #{product.id}
              </span>
              
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-mono text-xs font-bold">
                SKU: {product.sku || 'N/A'}
              </span>
            </div>

            {/* Product Image Container */}
            <div className="w-full h-80 flex items-center justify-center bg-gradient-to-b from-gray-50 via-emerald-50/20 to-gray-100/50 dark:from-gray-800/40 dark:via-emerald-950/10 dark:to-gray-850/40 rounded-2xl p-6 relative border border-gray-100 dark:border-gray-800 group-hover:border-adab-green/30 transition-colors">
              {product?.product_image ? (
                <img 
                  src={product.product_image} 
                  alt={product.product_name} 
                  className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-lg" 
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-2">
                  <Package className="w-24 h-24 stroke-[1.5]" />
                  <span className="text-xs font-semibold text-gray-400">No Product Image Available</span>
                </div>
              )}
            </div>

            {/* Quick Badges below image */}
            <div className="w-full mt-6 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-adab-green/10 text-adab-darkGreen dark:text-adab-green flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Manufacturer</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-200 truncate">{product?.manufacturer_name || 'ADAB Network'}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-adab-orange/10 text-adab-orange flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Stock Unit</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-200">{unitStr}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Tier Card */}
          {product?.tier_pricing && Array.isArray(product.tier_pricing) && product.tier_pricing.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <TrendingDown className="w-5 h-5 text-adab-green" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-900 dark:text-white">Bulk Discount Tiers</h3>
              </div>
              <TierPriceWidget tiers={product.tier_pricing} basePrice={priceVal} />
            </div>
          )}

          {/* Quality & Assurance Banner */}
          <div className="bg-gradient-to-r from-adab-green/10 via-emerald-500/5 to-transparent border border-adab-green/20 rounded-3xl p-6 flex items-start gap-4">
            <ShieldCheck className="w-8 h-8 text-adab-green shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white mb-1">
                ADAB Verified Quality Guarantee
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                This item is verified directly from manufacturer inventory with automated batch tracking and guaranteed delivery window protection.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Financials & Specifications (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 3-Tier Pricing Breakdown Panel */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-adab-green" />
              Wholesale Financial Structure
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Card 1: Buy Price */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Buy Price (Mfr)</span>
                <p className="text-2xl font-black text-emerald-900 dark:text-emerald-300 mt-2">
                  {mPriceVal !== null ? `${product?.currency || '₹'}${mPriceVal.toFixed(2)}` : 'N/A'}
                </p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-semibold mt-1">Direct Manufacturer Cost</p>
              </div>

              {/* Card 2: Wholesale Rate */}
              <div className="bg-adab-green/10 dark:bg-adab-green/20 p-5 rounded-2xl border-2 border-adab-green/40">
                <span className="text-[10px] font-black uppercase tracking-wider text-adab-darkGreen dark:text-adab-green">Wholesale Rate</span>
                <p className="text-2xl font-black text-adab-darkGreen dark:text-adab-green mt-2">
                  {product?.currency || '₹'}{priceVal.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold mt-1">Per {unitStr}</p>
              </div>

              {/* Card 3: Retail MRP */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Suggested MRP</span>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-200 mt-2">
                  {rPriceVal !== null ? `${product?.currency || '₹'}${rPriceVal.toFixed(2)}` : 'N/A'}
                </p>
                <p className="text-[10px] text-gray-400 font-semibold mt-1">End-consumer Ceiling</p>
              </div>
            </div>

            {/* International rate if applicable */}
            {product?.international_price && (
              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-300">International Export Rate</p>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400">Applicable for overseas fulfillment orders</p>
                  </div>
                </div>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  ${Number(product.international_price).toFixed(2)} USD
                </span>
              </div>
            )}
          </div>

          {/* Specifications & Inventory Metadata Grid */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-adab-orange" />
              Inventory & Logistics Specs
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Stock</p>
                <p className={`text-xl font-black mt-1 ${(product?.stock_quantity ?? 0) > 0 ? 'text-gray-900 dark:text-white' : 'text-rose-500'}`}>
                  {(product?.stock_quantity || 0).toLocaleString()} <span className="text-xs font-semibold text-gray-400">{unitStr}s</span>
                </p>
              </div>

              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Minimum Order (MOQ)</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                  {product?.moq || 1} <span className="text-xs font-semibold text-gray-400">{unitStr}s</span>
                </p>
              </div>

              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</p>
                <p className="text-sm font-bold text-adab-orange mt-1 truncate">
                  {product?.category || 'General'}
                </p>
              </div>

              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fulfillment Scope</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1">
                  {product?.international_selling === 'Yes' ? 'Global Export' : 'Domestic Only'}
                </p>
              </div>

              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Record ID</p>
                <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400 mt-1">
                  #{product?.id}
                </p>
              </div>

              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU Number</p>
                <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400 mt-1 truncate">
                  {product?.sku || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Product Overview / Description Box */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-adab-green" />
              Product Description & Overview
            </h3>
            <p className="text-sm md:text-base leading-relaxed text-gray-600 dark:text-gray-300 font-medium">
              {product?.description || "No specific product description provided by the manufacturer."}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
