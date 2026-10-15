import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { 
  Tag, 
  Sparkles, 
  Percent, 
  Clock, 
  Copy, 
  Check, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  Flame, 
  Gift, 
  RefreshCw, 
  X, 
  Search,
  AlertCircle,
  Info,
  Heart,
  Store,
  Truck,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

/**
 * Clean Decoupled API Response Mapper
 * Keeps backend response schema separate from UI state.
 */
function mapDealFromApi(deal) {
  if (!deal) return null;
  const price = Number(deal.price ?? deal.sell_price ?? 0);
  const mrp = Number(deal.mrp ?? price);
  const discountPercent = Number(
    deal.discountPercent ?? 
    (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0)
  );
  const discountAmount = Number(
    deal.discountAmount ?? 
    (mrp > price ? parseFloat((mrp - price).toFixed(2)) : 0)
  );
  const stockQty = Number(deal.stock_qty ?? 0);

  return {
    id: deal.id || deal.listing_id,
    listing_id: deal.listing_id || deal.id,
    productId: deal.productId || deal.product_id || deal.id,
    title: deal.title || deal.name || 'Marketplace Deal',
    description: deal.description || 'Special discounted offer verified on ADAB B2C Marketplace.',
    price,
    mrp,
    discount: deal.discount || (discountPercent > 0 ? `${discountPercent}% OFF` : 'Special Value'),
    discountPercent,
    discountAmount,
    code: deal.code || (discountPercent > 0 ? `SAVE${discountPercent}` : 'ADABDEAL'),
    featured: Boolean(deal.featured ?? (discountPercent >= 10)),
    categorySlug: deal.categorySlug || 'all-deals',
    categoryName: deal.categoryName || 'General Deals',
    brandName: deal.brandName || deal.brand_tag || 'Fresh Farms',
    sellerName: deal.sellerName || deal.storeName || 'Verified Merchant',
    sellerRating: Number(deal.sellerRating || 5.0),
    storeId: deal.storeId || deal.store_id || null,
    unit: deal.unit || 'Pack',
    sku: deal.sku || 'SKU-DEAL',
    minOrder: Number(deal.minOrder ?? price),
    minOrderQty: Number(deal.minOrderQty ?? 1),
    stock_qty: stockQty,
    in_stock: Boolean(deal.in_stock ?? (stockQty > 0)),
    validTill: deal.validTill || '31 Oct 2026',
    deliveryEstimate: deal.deliveryEstimate || '14-45 mins Express Delivery available',
    returnPolicy: deal.returnPolicy || '7 Days Returnable',
    image: deal.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
    images: Array.isArray(deal.images) && deal.images.length > 0 
      ? deal.images 
      : [deal.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80'],
    rating: Number(deal.rating || 4.8),
    reviews: Number(deal.reviews || deal.review_count || 12),
    specs: deal.specs || {
      brand: deal.brandName || 'Fresh Farms',
      unit: deal.unit || 'Pack',
      seller: deal.sellerName || 'Verified Merchant',
      stock: stockQty > 0 ? `${stockQty} units available` : 'Out of stock'
    }
  };
}

export default function OffersPage({ onAddToCart, onToggleWishlist, wishlist = [], onNavigate }) {
  const navigate = useNavigate();

  // State Management
  const [deals, setDeals] = useState([]);
  const [dealCategories, setDealCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [minDiscountFilter, setMinDiscountFilter] = useState(0);
  const [sortBy, setSortBy] = useState('discount_desc'); // discount_desc | price_asc | price_desc | rating_desc

  // Deal Details Modal State (API #2: GET /api/v1/catalog/deals/:id)
  const [activeDealId, setActiveDealId] = useState(null);
  const [selectedDealDetail, setSelectedDealDetail] = useState(null);
  const [loadingDealDetail, setLoadingDealDetail] = useState(false);
  const [dealDetailError, setDealDetailError] = useState(null);

  // Copy Code Feedback
  const [copiedCode, setCopiedCode] = useState(null);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 2800);
  };

  // 1. Fetch Deals, Deal Categories, and Live Coupons from API Contract
  const fetchOffersData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsRes, categoriesRes, couponsRes] = await Promise.all([
        api.get('/catalog/deals').catch(() => ({ data: { data: [] } })),
        api.get('/catalog/deals/categories').catch(() => ({ data: { data: [] } })),
        api.get('/cart/coupons').catch(() => ({ data: { data: { coupons: [] } } }))
      ]);

      const rawDeals = dealsRes.data?.data || dealsRes.data || [];
      const mappedDeals = Array.isArray(rawDeals) ? rawDeals.map(mapDealFromApi) : [];
      const rawCategories = categoriesRes.data?.data || categoriesRes.data || [];
      const rawCoupons = couponsRes.data?.data?.coupons || couponsRes.data?.coupons || [];

      setDeals(mappedDeals);
      setDealCategories(rawCategories);
      setCoupons(rawCoupons);
    } catch (err) {
      console.error('Failed to load deals & offers:', err);
      setError('Unable to load current offers. Please verify your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffersData();
  }, []);

  // 2. Fetch Single Deal Details (API #2: GET /api/v1/catalog/deals/:id)
  const handleOpenDealDetails = async (dealId) => {
    if (!dealId) return;
    setActiveDealId(dealId);
    setLoadingDealDetail(true);
    setDealDetailError(null);
    try {
      const res = await api.get(`/catalog/deals/${dealId}`);
      if (res.data?.success && res.data?.data) {
        setSelectedDealDetail(mapDealFromApi(res.data.data));
      } else {
        const fallback = deals.find(d => d.id === dealId) || null;
        setSelectedDealDetail(fallback);
      }
    } catch (err) {
      console.error('Error fetching deal details:', err);
      const fallback = deals.find(d => d.id === dealId) || null;
      if (fallback) {
        setSelectedDealDetail(fallback);
      } else {
        setDealDetailError(err.response?.data?.message || 'Failed to load details for this deal.');
      }
    } finally {
      setLoadingDealDetail(false);
    }
  };

  const handleCloseDealDetails = () => {
    setActiveDealId(null);
    setSelectedDealDetail(null);
    setDealDetailError(null);
  };

  // 3. Copy Code Handler
  const handleCopyCode = (code, e) => {
    if (e) e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Promo code "${code}" copied to clipboard!`);
    setTimeout(() => {
      setCopiedCode(prev => prev === code ? null : prev);
    }, 2500);
  };

  // 4. Add to Cart Handler
  const handleAddToCartClick = (deal, e) => {
    if (e) e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(deal.listing_id || deal.id, deal.title);
      showToast(`Added "${deal.title}" to cart at ₹${deal.price}!`);
    }
  };

  // 5. Wishlist Toggle Handler
  const handleWishlistClick = (deal, e) => {
    if (e) e.stopPropagation();
    if (onToggleWishlist) {
      const targetId = deal.listing_id || deal.id;
      onToggleWishlist(targetId);
      const isCurrentlyWishlisted = wishlist.some(w => (w.listing_id || w.id || w) === targetId);
      showToast(isCurrentlyWishlisted ? `Removed "${deal.title}" from wishlist` : `Saved "${deal.title}" to wishlist ❤️`);
    }
  };

  // 6. Navigation Helper
  const navigateTo = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate('/' + path);
    }
  };

  // 7. Filtered & Sorted Deals
  const filteredDeals = useMemo(() => {
    let result = deals.filter(deal => {
      // Search matching title, code, category, brand, store
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (deal.title || '').toLowerCase().includes(q) ||
        (deal.code || '').toLowerCase().includes(q) ||
        (deal.categoryName || '').toLowerCase().includes(q) ||
        (deal.brandName || '').toLowerCase().includes(q) ||
        (deal.sellerName || '').toLowerCase().includes(q);

      // Category matching
      const matchesCategory = selectedCategory === 'ALL' || 
        deal.categorySlug === selectedCategory ||
        deal.categoryName?.toLowerCase() === selectedCategory.toLowerCase();

      // Minimum Discount matching
      const matchesDiscount = minDiscountFilter === 0 || deal.discountPercent >= minDiscountFilter;

      return matchesSearch && matchesCategory && matchesDiscount;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'discount_desc') {
        return b.discountPercent - a.discountPercent;
      } else if (sortBy === 'price_asc') {
        return a.price - b.price;
      } else if (sortBy === 'price_desc') {
        return b.price - a.price;
      } else if (sortBy === 'rating_desc') {
        return b.rating - a.rating;
      }
      return 0;
    });

    return result;
  }, [deals, searchQuery, selectedCategory, minDiscountFilter, sortBy]);

  // Featured Flash Deals (Deals marked featured or >= 10% discount)
  const featuredDeals = useMemo(() => {
    return deals.filter(d => d.featured).slice(0, 4);
  }, [deals]);

  const isItemWishlisted = (id) => {
    return wishlist.some(w => (w.listing_id || w.id || w) === id);
  };

  return (
    <div className="animate-fade-in pb-16 max-w-7xl mx-auto px-3 sm:px-6">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-gray-700/50 flex items-center gap-2.5 animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner - Rich Emerald Glassmorphism Theme */}
      <div className="mb-6 app-header rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg text-white">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 -skew-x-12 pointer-events-none"></div>
        <div className="absolute -right-10 -bottom-10 w-52 h-52 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="glass px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Special Offers
            </span>
            <span className="bg-amber-400 text-gray-950 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-600" /> Active Platform & Seller Deals
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Deals & Offers
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1.5 font-medium leading-relaxed">
            Discover verified merchant discounts, limited-time flash deals, and exclusive coupon codes across your neighborhood stores.
          </p>

          {/* Search bar inside header */}
          <div className="mt-5 relative max-w-md">
            <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search deals by product, code, brand or store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-900 border-0 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-semibold placeholder-gray-400 shadow-md outline-none focus:ring-2 focus:ring-emerald-300 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {loading ? (
        <div className="space-y-6">
          <div className="flex gap-2 pb-2 overflow-x-auto hide-scroll">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-28 bg-gray-200 rounded-xl animate-pulse shrink-0"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm h-72 animate-pulse flex flex-col justify-between">
                <div className="bg-gray-200 rounded-xl h-36 mb-3"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-9 bg-gray-200 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="bg-white rounded-3xl border border-red-100 p-8 text-center max-w-md mx-auto shadow-sm my-8">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-gray-900 text-base mb-1">Failed to Load Deals</h3>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button 
            onClick={fetchOffersData}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 mx-auto shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Filters & Sorting Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scroll pb-1">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white text-gray-700 border border-gray-200/80 hover:border-emerald-400 hover:text-emerald-700'
                }`}
              >
                <Tag className="w-3.5 h-3.5" /> All Deals ({deals.length})
              </button>
              {dealCategories.map((cat) => (
                <button
                  key={cat.slug || cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === cat.slug
                      ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-white text-gray-700 border border-gray-200/80 hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === cat.slug ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Filter by Min Discount & Sort Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-white border border-gray-200/80 rounded-xl p-1 shadow-2xs text-xs font-extrabold text-gray-600">
                <button
                  onClick={() => setMinDiscountFilter(0)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${minDiscountFilter === 0 ? 'bg-emerald-700 text-white font-black' : 'hover:text-emerald-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setMinDiscountFilter(10)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${minDiscountFilter === 10 ? 'bg-emerald-700 text-white font-black' : 'hover:text-emerald-700'}`}
                >
                  10%+
                </button>
                <button
                  onClick={() => setMinDiscountFilter(15)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${minDiscountFilter === 15 ? 'bg-emerald-700 text-white font-black' : 'hover:text-emerald-700'}`}
                >
                  15%+
                </button>
              </div>

              {/* Sort By Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-200/80 text-gray-700 text-xs font-extrabold rounded-xl px-3 py-2 pr-8 shadow-2xs outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                >
                  <option value="discount_desc">Highest Discount</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating_desc">Highest Rated</option>
                </select>
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Featured Flash Deals Carousel / Hero Banners */}
          {selectedCategory === 'ALL' && !searchQuery && minDiscountFilter === 0 && featuredDeals.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" /> Featured Flash Deals
                  </h2>
                </div>
                <span className="text-xs font-bold text-gray-500">Highest Verified Savings</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredDeals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => handleOpenDealDetails(deal.id)}
                    className="group relative bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl p-5 overflow-hidden shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

                    <div className="relative z-10 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-amber-400 text-gray-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-2xs">
                            FEATURED DEAL
                          </span>
                          <span className="text-xs font-bold text-emerald-100 flex items-center gap-1">
                            <Store className="w-3 h-3 text-emerald-300" /> {deal.sellerName}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white leading-snug group-hover:text-emerald-200 transition">
                          {deal.title}
                        </h3>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-amber-300">
                            {deal.discount}
                          </span>
                          <span className="text-xs text-emerald-100 font-semibold">
                            Now ₹{deal.price} <span className="line-through text-white/50">₹{deal.mrp}</span>
                          </span>
                        </div>
                      </div>

                      {deal.image && (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 shrink-0 shadow-inner p-1">
                          <img 
                            src={deal.image} 
                            alt={deal.title}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80';
                            }}
                            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-emerald-100">Code:</span>
                        <span className="bg-white/20 backdrop-blur font-mono font-black px-2 py-0.5 rounded text-white tracking-wider">
                          {deal.code}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(deal.code, e)}
                          className="hover:text-amber-300 transition text-emerald-100 p-1 cursor-pointer"
                          title="Copy Promo Code"
                        >
                          {copiedCode === deal.code ? (
                            <Check className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleAddToCartClick(deal, e)}
                          className="bg-amber-400 hover:bg-amber-300 text-gray-950 px-3 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3" /> Quick Add
                        </button>
                        <div className="flex items-center gap-1 font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                          <span>Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Filtered Deals Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">
                  {selectedCategory === 'ALL' ? 'Active Store & Category Deals' : 'Deals in this Category'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Showing {filteredDeals.length} active promotions verified from local merchant catalog
                </p>
              </div>
            </div>

            {filteredDeals.length === 0 ? (
              /* Empty / Validation State */
              <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center shadow-xs">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Tag className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-gray-900 text-base mb-1">No Matching Deals Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5 leading-relaxed">
                  {searchQuery 
                    ? `No active promotions match "${searchQuery}". Check your spelling or try searching for another product.` 
                    : minDiscountFilter > 0 
                    ? `No deals currently meet the ${minDiscountFilter}% minimum discount filter.` 
                    : 'There are no active deals matching the selected criteria.'}
                </p>
                <button
                  onClick={() => { 
                    setSelectedCategory('ALL'); 
                    setSearchQuery(''); 
                    setMinDiscountFilter(0); 
                    setSortBy('discount_desc'); 
                  }}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                >
                  Clear All Filters & Reset
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDeals.map((deal) => {
                  const wishlisted = isItemWishlisted(deal.listing_id || deal.id);

                  return (
                    <div
                      key={deal.id}
                      className="group bg-white rounded-3xl border border-gray-200/80 hover:border-emerald-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between shadow-2xs"
                      onClick={() => handleOpenDealDetails(deal.id)}
                    >
                      <div>
                        {/* Image & Discount Badge */}
                        <div className="relative h-44 bg-gray-50 overflow-hidden flex items-center justify-center">
                          <img 
                            src={deal.image} 
                            alt={deal.title}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                          {/* Discount Badge */}
                          <div className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-xl shadow-sm tracking-wide">
                            {deal.discount}
                          </div>

                          {/* Wishlist Heart Toggle */}
                          <button
                            type="button"
                            onClick={(e) => handleWishlistClick(deal, e)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur text-gray-500 hover:text-red-500 hover:bg-white flex items-center justify-center transition shadow-sm cursor-pointer z-10"
                            title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                          >
                            <Heart className={`w-4 h-4 ${wishlisted ? 'text-red-500 fill-red-500' : ''}`} />
                          </button>

                          {/* Category Tag */}
                          <div className="absolute bottom-3 left-3 text-white text-[11px] font-bold flex items-center gap-1.5">
                            <span className="bg-white/20 backdrop-blur px-2 py-0.5 rounded-lg text-white">
                              {deal.categoryName}
                            </span>
                            <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Valid till {deal.validTill}
                            </span>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-4">
                          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
                            <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Store className="w-3 h-3" /> {deal.sellerName}
                            </span>
                            <span className="font-semibold text-gray-400">
                              {deal.unit}
                            </span>
                          </div>

                          <h3 className="font-black text-sm text-gray-900 group-hover:text-emerald-700 transition line-clamp-1 leading-snug">
                            {deal.title}
                          </h3>

                          {/* Price & Savings Row */}
                          <div className="flex items-baseline justify-between mt-2.5">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-black text-gray-900">
                                ₹{deal.price}
                              </span>
                              {deal.mrp > deal.price && (
                                <span className="text-xs text-gray-400 line-through">
                                  ₹{deal.mrp}
                                </span>
                              )}
                            </div>
                            {deal.discountAmount > 0 && (
                              <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Save ₹{deal.discountAmount}
                              </span>
                            )}
                          </div>

                          {/* Stock Availability */}
                          <div className="mt-2 text-[11px] flex items-center justify-between font-semibold">
                            <span className={deal.stock_qty > 0 ? 'text-emerald-700 flex items-center gap-1' : 'text-red-500'}>
                              <span className={`w-1.5 h-1.5 rounded-full ${deal.stock_qty > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              {deal.stock_qty > 0 ? `In Stock (${deal.stock_qty} left)` : 'Out of Stock'}
                            </span>
                            <span className="text-gray-400">
                              Min Order: {deal.minOrder ? `₹${deal.minOrder}` : 'None'}
                            </span>
                          </div>

                          {/* Promo Code Strip */}
                          <div className="mt-3.5 bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-emerald-700" />
                              <code className="text-xs font-black text-gray-900 tracking-wider">
                                {deal.code}
                              </code>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleCopyCode(deal.code, e)}
                              className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-50 transition flex items-center gap-1 cursor-pointer"
                            >
                              {copiedCode === deal.code ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="p-4 pt-0 flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleAddToCartClick(deal, e)}
                          disabled={deal.stock_qty <= 0}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                            deal.stock_qty > 0
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> ADD TO CART
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDealDetails(deal.id);
                          }}
                          className="px-3.5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
                          title="View Deal Details"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Store Coupons & Vouchers Section (API: /cart/coupons) */}
          {coupons.length > 0 && (
            <div className="mt-10 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <h2 className="text-base font-black text-gray-900 tracking-tight">
                      Available Store Coupons & Vouchers
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Apply these coupons during checkout to maximize your savings across neighborhood stores
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('cart')}
                  className="text-brand-green text-xs font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to Cart</span>
                  <span>→</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {coupons.map((cp, idx) => {
                  const discountDisplay = cp.discount_type === 'PERCENTAGE' 
                    ? `${parseInt(cp.discount_value)}% OFF` 
                    : `Flat ₹${parseInt(cp.discount_value)} OFF`;

                  return (
                    <div 
                      key={cp.code || idx}
                      className="bg-white rounded-2xl border border-dashed border-gray-300 p-4 shadow-2xs hover:border-emerald-500 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                            COUPON
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {cp.min_order_value > 0 ? `Min ₹${parseInt(cp.min_order_value)}` : 'No Min'}
                          </span>
                        </div>
                        <div className="font-black text-base text-gray-900">
                          {discountDisplay}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                          {cp.description || 'Eligible on orders matching minimum value'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                        <code className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg">
                          {cp.code}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(cp.code)}
                          className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 transition flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode === cp.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deal Details Modal (API #2: GET /api/v1/catalog/deals/:id) */}
      {activeDealId && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCloseDealDetails}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-scale-up max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDealDetail ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-gray-500">Querying live deal details from PostgreSQL...</p>
              </div>
            ) : selectedDealDetail ? (
              <div className="overflow-y-auto">
                {/* Modal Header Cover */}
                <div className="relative h-48 bg-emerald-800">
                  <img 
                    src={selectedDealDetail.image} 
                    alt={selectedDealDetail.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

                  <button
                    onClick={handleCloseDealDetails}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="bg-amber-400 text-gray-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-2xs">
                      {selectedDealDetail.categoryName || 'Marketplace Deal'}
                    </span>
                    <h3 className="text-xl font-black mt-1 leading-tight text-white">
                      {selectedDealDetail.title}
                    </h3>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4">
                  {/* Merchant & Store Info */}
                  <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="font-extrabold text-gray-900">{selectedDealDetail.sellerName}</div>
                        <div className="text-[10px] text-gray-500">Verified Marketplace Merchant</div>
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-900 font-extrabold text-[11px] px-2 py-0.5 rounded-md">
                      ★ {selectedDealDetail.sellerRating} Rating
                    </span>
                  </div>

                  {/* Price & Discount Strip */}
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                        Deal Price
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-black text-emerald-950">
                          ₹{selectedDealDetail.price}
                        </span>
                        {selectedDealDetail.mrp > selectedDealDetail.price && (
                          <span className="text-xs text-gray-400 line-through">
                            ₹{selectedDealDetail.mrp}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase text-red-600 tracking-wider">
                        Discount Rate
                      </span>
                      <div className="text-lg font-black text-red-600 mt-0.5">
                        {selectedDealDetail.discount}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {selectedDealDetail.description}
                  </p>

                  {/* Promo Code Box */}
                  <div>
                    <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Coupon / Promo Code
                    </label>
                    <div className="flex items-center justify-between border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl p-3">
                      <code className="text-base font-black text-emerald-900 tracking-wider font-mono">
                        {selectedDealDetail.code}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(selectedDealDetail.code)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        {copiedCode === selectedDealDetail.code ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Delivery & Policies */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2.5 rounded-xl flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-extrabold text-gray-900 text-[11px]">Express Delivery</div>
                        <div className="text-[10px] text-gray-500">14-45 mins available</div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-xl flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-extrabold text-gray-900 text-[11px]">7-Day Returns</div>
                        <div className="text-[10px] text-gray-500">Hassle-free guarantee</div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        handleAddToCartClick(selectedDealDetail, e);
                        handleCloseDealDetails();
                      }}
                      disabled={selectedDealDetail.stock_qty <= 0}
                      className={`flex-1 py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                        selectedDealDetail.stock_qty > 0 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" /> 
                      {selectedDealDetail.stock_qty > 0 ? `Add to Cart (₹${selectedDealDetail.price})` : 'Out of Stock'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseDealDetails();
                        if (selectedDealDetail.categorySlug) {
                          navigateTo(`browse?categories=${encodeURIComponent(selectedDealDetail.categoryName || '')}&category=${encodeURIComponent(selectedDealDetail.categorySlug)}`);
                        } else {
                          navigateTo('browse');
                        }
                      }}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
                    >
                      Shop Category
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-xs text-red-500">{dealDetailError || 'Deal not found or inactive.'}</p>
                <button
                  onClick={handleCloseDealDetails}
                  className="mt-3 px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
