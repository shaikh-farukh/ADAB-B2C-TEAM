import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  AlertTriangle,
  Package,
  PackageSearch,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye
} from 'lucide-react';
import TierPriceWidget from '../../components/distributor/TierPriceWidget';
import distributorService from '../../services/distributorService';
import { useNotification } from '../../context/NotificationContext';

/**
 * Responsibility: Displays the available inventory for distributors to procure.
 * Features: RBAC Masked 3-tier pricing, unit badges, search filtering, category tabs, server-side pagination, and "Add to Order" functionality.
 */
const ProductCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [showCartToast, setShowCartToast] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 1
  });

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await distributorService.getCatalogCategories();
      if (response.success) {
        setCategories(['all', ...(response.data || [])]);
      }
    } catch (err) {
      console.error("Failed to load catalog categories");
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit
      };
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const response = await distributorService.getCatalog(params);
      if (response.success) {
        setProducts(response.data || []);
        if (response.pagination) {
          setPaginationInfo({
            total: response.pagination.total || response.count || 0,
            totalPages: response.pagination.totalPages || 1
          });
        }
      } else {
        showError(response.message || "Failed to load catalog");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Error fetching catalog data");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, page, limit, showError]);

  const fetchCartCount = useCallback(async () => {
    try {
      const response = await distributorService.getCart();
      if (response.success && response.data) {
        setCartItemsCount(response.count || 0);
      }
    } catch (err) {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchCartCount();
  }, [fetchCategories, fetchCartCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCatalog]);

  const handleAddToCart = async (product: any) => {
    const qty = quantities[product.id] || product.moq || 1;
    try {
      const response = await distributorService.addToCart({
        product_id: Number(product.id),
        quantity: qty
      });

      if (response.success) {
        setCartItemsCount(prev => prev + 1);
        setShowCartToast(true);
        setTimeout(() => setShowCartToast(false), 2000);
        showSuccess(response.message || "Added to cart");
        fetchCartCount();
      } else {
        showError(response.message || "Failed to add item to cart");
      }
    } catch (err: any) {
      showError(err.response?.data?.message || "Could not add to cart");
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20 md:pb-24">
      {/* Standardized Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 mb-1.5">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Procurement Catalog</span>
            <span className="ml-2 flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
              <ShieldCheck className="w-3 h-3" /> RBAC Price Protection Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-200 tracking-tight">Active Wholesale Inventory</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Procure materials directly with 3-tier distributor pricing and live stock tracking.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link to="/distributor/cart" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-3 shadow-sm flex items-center gap-5 hover:border-emerald-500 transition-all group">
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              {cartItemsCount > 0 && <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white">{cartItemsCount}</span>}
            </div>
            <div className="text-left border-l border-gray-100 pl-5">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Items Selected</p>
              <p className="text-sm font-black text-gray-900 dark:text-gray-200 leading-none">View Procurement Cart</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search catalog by product name or code..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${categoryFilter === cat ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm animate-pulse h-[380px]">
              <div className="bg-gray-100 dark:bg-gray-800 h-44" />
              <div className="p-6 space-y-4">
                <div className="bg-gray-100 dark:bg-gray-800 h-3 w-1/4 rounded" />
                <div className="bg-gray-200 dark:bg-gray-700 h-5 w-3/4 rounded" />
                <div className="bg-gray-100 dark:bg-gray-800 h-10 w-full rounded-2xl mt-8" />
              </div>
            </div>
          ))
        ) : products.length > 0 ? (
          products.map((product) => {
            const isOutOfStock = product.stock_quantity === 0;
            const unitStr = product.unit || 'Piece';
            const priceVal = Number(product.distributor_price || product.price || 0);
            const mPriceVal = product.manufacturer_price ? Number(product.manufacturer_price) : null;
            const rPriceVal = product.retail_price ? Number(product.retail_price) : null;

            return (
              <div 
                key={product.id} 
                onClick={() => navigate(`/distributor/catalog/view/${product.id}`)}
                className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative border-b-4 hover:border-b-adab-green"
              >
                {/* Fixed height image container with subtle brand gradient overlay */}
                <div className="h-56 w-full bg-gradient-to-b from-gray-50/80 to-gray-100/50 dark:from-gray-800/60 dark:to-gray-900/80 flex items-center justify-center border-b border-gray-100 dark:border-gray-800/80 relative p-6 overflow-hidden">
                  {product.product_image ? (
                    <img 
                      src={product.product_image} 
                      alt={product.product_name} 
                      className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-sm" 
                    />
                  ) : (
                    <Package className="w-14 h-14 text-gray-300 dark:text-gray-600 group-hover:scale-110 transition-transform duration-500" />
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-lg backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-2xs">
                      {unitStr}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-2xs ${product.international_selling === 'Yes' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-adab-green/10 text-adab-darkGreen border-adab-green/30 dark:bg-adab-green/20 dark:text-adab-green'}`}>
                      {product.international_selling === 'Yes' ? 'Export' : 'Domestic'}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-adab-orange uppercase tracking-widest">{product.category}</span>
                    {product.sku && (
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {product.sku}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-adab-green transition-colors line-clamp-2 min-h-[3rem] leading-snug">
                    {product.product_name}
                  </h3>

                  <p className="text-[11px] font-medium text-gray-400 mb-4 truncate">
                    Mfr: <span className="font-semibold text-gray-600 dark:text-gray-300">{product.manufacturer_name}</span>
                  </p>

                  {/* Pricing Box - Styled with Logo Inspired Accents */}
                  <div className="bg-gray-50/80 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2 mb-4 text-xs">
                    {mPriceVal !== null && (
                      <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-[11px]">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-gray-400">Mfr Cost:</span>
                        <span className="font-bold">{product.currency || '₹'}{mPriceVal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-adab-darkGreen dark:text-adab-green font-extrabold">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-700 dark:text-gray-300">Wholesale:</span>
                      <span className="text-base font-black text-adab-darkGreen dark:text-adab-green">{product.currency || '₹'}{priceVal.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">/ {unitStr}</span></span>
                    </div>
                    {rPriceVal !== null && (
                      <div className="flex justify-between items-center text-gray-400 pt-1.5 border-t border-gray-200/60 dark:border-gray-700/60 text-[11px]">
                        <span className="uppercase text-[9px] font-bold tracking-wider">Retail MRP:</span>
                        <span className="font-semibold">{product.currency || '₹'}{rPriceVal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {product.tier_pricing && Array.isArray(product.tier_pricing) && product.tier_pricing.length > 0 && (
                    <div className="mb-4">
                      <TierPriceWidget
                        tiers={product.tier_pricing}
                        basePrice={priceVal}
                      />
                    </div>
                  )}

                  <div className="mt-auto pt-2 flex items-center justify-between text-xs font-bold text-gray-500 mb-4">
                    <span className="text-[11px] text-gray-400 font-semibold">MOQ: <strong className="text-gray-700 dark:text-gray-300">{product.moq || 1} {unitStr}s</strong></span>
                    <span className={`text-[11px] font-extrabold ${isOutOfStock ? 'text-rose-500' : 'text-adab-green'}`}>
                      {isOutOfStock ? 'Out of Stock' : `${(product.stock_quantity || 0).toLocaleString()} In Stock`}
                    </span>
                  </div>

                  {/* Actions Row */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/distributor/catalog/view/${product.id}`);
                      }}
                      className="w-full py-3 px-3 bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center gap-1.5 group/btn"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-adab-green transition-colors" />
                      View Details
                    </button>

                    {!isOutOfStock ? (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }} 
                        className="w-full py-3 px-3 bg-adab-green hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md shadow-adab-green/20 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Add
                      </button>
                    ) : (
                      <button 
                        type="button"
                        disabled
                        className="w-full py-3 px-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-not-allowed"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                        Empty
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 border-dashed rounded-3xl flex flex-col items-center">
            <PackageSearch className="w-16 h-16 text-gray-200 mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-200 tracking-tight">No active items in catalog</h3>
            <p className="text-gray-500 mt-2">Adjust search terms or request catalog access from your manufacturer partner.</p>
          </div>
        )}
      </div>

      {/* Server-Side Pagination Controls */}
      {paginationInfo.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">
            Page <span className="text-gray-900 dark:text-white font-bold">{page}</span> of <span className="text-gray-900 dark:text-white font-bold">{paginationInfo.totalPages}</span> ({paginationInfo.total} items)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {[...Array(paginationInfo.totalPages)].map((_, idx) => (
              <button
                key={idx + 1}
                onClick={() => setPage(idx + 1)}
                className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all ${page === idx + 1 ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {idx + 1}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(paginationInfo.totalPages, p + 1))}
              disabled={page >= paginationInfo.totalPages}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Cart Toast Notification */}
      {showCartToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-sm tracking-wide uppercase">Item Added to Procurement Selection</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalogPage;
