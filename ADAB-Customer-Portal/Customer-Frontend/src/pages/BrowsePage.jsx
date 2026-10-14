import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Filter, Store, SlidersHorizontal, X } from 'lucide-react';

let browseCategoriesCache = null;

export default function BrowsePage({ 
  onAddToCart, 
  onToggleWishlist, 
  wishlist,
  selectedStoreId = null,
  selectedStore = null,
  onSelectStore,
  onClearStore
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [categoriesList, setCategoriesList] = useState([]);
  const [storesList, setStoresList] = useState([]);
  const [currentStore, setCurrentStore] = useState(selectedStore || null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Read URL State
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const categoriesParam = searchParams.get('categories') || '';
  const selectedCategories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];
  const storeId = searchParams.get('store_id') || searchParams.get('storeId') || searchParams.get('store') || selectedStoreId || (selectedStore?.id) || '';
  const storeName = searchParams.get('storeName') || currentStore?.name || '';
  const sortBy = searchParams.get('sortBy') || searchParams.get('sortOrder') || 'relevance';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page')) || 1;

  // Fetch categories dynamically from database with deduplication cache
  useEffect(() => {
    if (browseCategoriesCache) {
      setCategoriesList(browseCategoriesCache);
      return;
    }
    api.get('/catalog/categories')
      .then(res => {
        const cats = res.data?.data || res.data || [];
        browseCategoriesCache = cats;
        setCategoriesList(cats);
      })
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  // Fetch stores list dynamically from database
  useEffect(() => {
    api.get('/catalog/stores')
      .then(res => {
        const list = res.data?.data || res.data || [];
        setStoresList(list);
      })
      .catch(err => console.error('Error fetching stores:', err));
  }, []);

  // Sync store details
  useEffect(() => {
    if (storeId) {
      if (selectedStore && String(selectedStore.id) === String(storeId)) {
        setCurrentStore(selectedStore);
      } else {
        const match = storesList.find(s => String(s.id) === String(storeId));
        if (match) {
          setCurrentStore(match);
        } else {
          // Fetch store details by ID from API
          api.get(`/catalog/stores/${storeId}`)
            .then(res => {
              if (res.data?.success && res.data?.data) {
                setCurrentStore(res.data.data);
              }
            })
            .catch(() => {});
        }
      }
    } else {
      setCurrentStore(null);
    }
  }, [storeId, storesList, selectedStore]);

  // Fetch products cleanly without triggering premature net::ERR_CANCELED DevTools errors
  useEffect(() => {
    let isCurrent = true;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (category) params.append('category', category);
        if (selectedCategories.length > 0) params.append('categories', selectedCategories.join(','));
        if (storeId) {
          params.append('storeId', storeId);
          params.append('store_id', storeId);
        }
        if (storeName) params.append('storeName', storeName);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
        if (sortBy) {
          params.append('sortBy', sortBy);
          params.append('sortOrder', sortBy);
        }
        params.append('page', page);
        params.append('limit', 12);

        const res = await api.get(`/catalog/search?${params.toString()}`);
        
        if (!isCurrent) return;

        setProducts(res.data?.data || []);
        const total = res.data?.pagination?.total ?? (res.data?.data?.length || 0);
        const pages = res.data?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / 12));
        setTotalPages(pages);
      } catch (err) {
        if (!isCurrent) return;
        console.error('Error fetching browse products:', err);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isCurrent = false;
    };
  }, [q, category, categoriesParam, storeId, storeName, minPrice, maxPrice, sortBy, page]);

  // Handlers for Filter changes
  const updateFilter = (key, value) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      if (key !== 'page') {
        newParams.set('page', '1');
      }
      return newParams;
    });
  };

  const clearStoreFilter = () => {
    if (onClearStore) onClearStore();
    setCurrentStore(null);
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('store_id');
      newParams.delete('storeId');
      newParams.delete('storeName');
      newParams.delete('store');
      newParams.set('page', '1');
      return newParams;
    });
  };

  const handleSelectStore = (store) => {
    if (String(store.id) === String(storeId)) {
      clearStoreFilter();
      return;
    }
    if (onSelectStore) onSelectStore(store);
    setCurrentStore(store);
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('storeId');
      newParams.delete('storeName');
      newParams.set('store_id', store.id);
      newParams.set('page', '1');
      return newParams;
    });
  };

  const toggleCategoryName = (catName) => {
    const next = selectedCategories.includes(catName)
      ? selectedCategories.filter(c => c !== catName)
      : [...selectedCategories, catName];
    updateFilter('categories', next.join(','));
  };

  const clearAllFilters = () => {
    if (onClearStore) onClearStore();
    setCurrentStore(null);
    const newParams = new URLSearchParams();
    if (q) newParams.set('q', q);
    setSearchParams(newParams);
  };

  const filterContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h2 className="font-black text-gray-900 text-sm">Filters & Facets</h2>
        </div>
        {(selectedCategories.length > 0 || minPrice || maxPrice || storeId) && (
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-bold text-brand-green hover:underline cursor-pointer"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Store / Shop Filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-emerald-600" /> Shops
          </h3>
          {storeId && (
            <button
              type="button"
              onClick={clearStoreFilter}
              className="text-[11px] font-bold text-brand-green hover:underline cursor-pointer"
            >
              All Shops
            </button>
          )}
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={clearStoreFilter}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
              !storeId ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>All Local Shops</span>
            {!storeId && <i className="fa-solid fa-check text-xs"></i>}
          </button>
          {storesList.map(s => {
            const isSelected = String(s.id) === String(storeId);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectStore(s)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                  isSelected ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="truncate max-w-[170px]">{s.name}</span>
                {isSelected && <i className="fa-solid fa-check text-xs"></i>}
              </button>
            );
          })}
        </div>
      </div>
      
      <div>
        <h3 className="text-xs font-extrabold mb-3 uppercase tracking-wider text-gray-500">
          Categories ({categoriesList.length})
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {categoriesList.map(cat => {
            const catName = cat.name || cat;
            const isChecked = selectedCategories.includes(catName);
            return (
              <label key={cat.id || catName} className="flex items-center gap-2.5 text-xs cursor-pointer select-none py-1 hover:text-brand-green transition">
                <input 
                  type="checkbox" 
                  className="rounded text-brand-green focus:ring-brand-green w-4 h-4 accent-[#18753C]" 
                  checked={isChecked}
                  onChange={() => toggleCategoryName(catName)}
                /> 
                <span className={isChecked ? 'font-bold text-gray-900' : 'text-gray-600'}>{catName}</span>
              </label>
            );
          })}
        </div>
      </div>
      
      <div>
        <h3 className="text-xs font-extrabold mb-3 uppercase tracking-wider text-gray-500">Price Range (₹)</h3>
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            placeholder="Min" 
            value={minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-2.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-green outline-none" 
          />
          <span className="text-gray-400 font-bold">-</span>
          <input 
            type="number" 
            placeholder="Max" 
            value={maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-2.5 text-xs bg-gray-50 focus:bg-white focus:border-brand-green outline-none" 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start animate-fade-in relative pb-16 md:pb-6">
      {/* Desktop Sidebar Filters */}
      <aside className="hidden md:block w-64 bg-white border border-gray-200 rounded-3xl p-5 shrink-0 sticky top-24 shadow-sm">
        {filterContent}
      </aside>

      {/* Mobile Bottom Filter Sheet / Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
          ></div>
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <span className="font-extrabold text-base text-gray-900">Filter Products</span>
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {filterContent}
            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { clearAllFilters(); setIsMobileFilterOpen(false); }}
                className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-xs text-gray-700"
              >
                Clear
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 bg-brand-green text-white rounded-xl font-extrabold text-xs shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Grid & Controls */}
      <div className="flex-1 w-full">
        {/* Search Input Bar (Supports Day 1 Test & Fast Lookup) */}
        <div className="relative mb-5">
          <input 
            type="text" 
            placeholder="Search shops, products..." 
            value={q}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 pl-11 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none shadow-xs placeholder-gray-400"
          />
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          {q && (
            <button
              onClick={() => updateFilter('q', '')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selected Shop Hero Banner */}
        {(currentStore || storeId) && (
          <div 
            className="mb-6 rounded-2xl shop-hero text-white p-5 shadow-lg relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #059669 100%)', 
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.35)'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md shrink-0"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.22)', 
                    border: '1.5px solid rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                >
                  {(currentStore?.name || storeName || 'Store').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm"
                      style={{ 
                        background: '#10B981', 
                        color: '#ffffff', 
                        border: '1px solid #34D399', 
                        letterSpacing: '0.02em' 
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      OPEN NOW
                    </span>
                    <span 
                      className="text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.18)', 
                        color: '#F0FDF4', 
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                      }}
                    >
                      <i className="fa-solid fa-star text-amber-300 text-xs"></i>
                      <span>{currentStore?.rating || '4.8'} Verified Shop</span>
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight text-white drop-shadow-xs">
                    {currentStore?.name || storeName || 'Partner Store'}
                  </h2>
                  <p className="text-xs mt-1 font-medium flex items-center gap-1.5" style={{ color: '#D1FAE5' }}>
                    <i className="fa-solid fa-location-dot text-emerald-300 text-[11px]"></i>
                    <span>{currentStore?.area || currentStore?.address_line || 'Local Merchant'} · {currentStore?.distance || '1.2 km'} delivery</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  onClick={clearStoreFilter}
                  className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>All Shops</span>
                  <span className="text-white/70 font-normal">✕</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Control Bar with Sort & Mobile Trigger */}
        <div className="flex items-center justify-between mb-5 bg-white p-3.5 md:p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div>
            {!storeId ? (
              <>
                <h1 className="text-lg md:text-xl font-black text-gray-900">
                  {q ? `Results for "${q}"` : 'Marketplace Catalog'}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">Showing approved listings with express delivery</p>
              </>
            ) : (
              <div>
                <h1 className="text-lg md:text-xl font-black text-gray-900">
                  {currentStore ? `${currentStore.name}` : (storeName || 'Partner Store')}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentStore ? `Showing approved items from ${currentStore.name}` : (storeId ? `Showing approved items from ${storeName || 'this shop'}` : 'Approved fresh essentials from verified local sellers')}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {selectedCategories.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-green text-white text-[10px] flex items-center justify-center">
                  {selectedCategories.length}
                </span>
              )}
            </button>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200/60 px-3 py-1.5 rounded-xl">
              <span className="text-gray-400 font-bold hidden sm:inline">Sort by:</span>
              <select 
                value={sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="border-none bg-transparent font-extrabold text-gray-800 focus:ring-0 cursor-pointer text-xs outline-none"
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-2xl aspect-[3/4] border border-gray-100"></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            {/* Properly Spaced 3-Column Responsive Grid (Only for Browse Page) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={onAddToCart} 
                  onToggleWishlist={onToggleWishlist}
                  wishlist={wishlist}
                  customClassName="h-full border-gray-200/80 hover:shadow-lg hover:border-emerald-500/50 transition-all duration-300"
                />
              ))}
            </div>
            
            {/* Pagination Controls */}
            <div className="flex justify-center items-center gap-3 mt-12">
              <button 
                disabled={page <= 1}
                onClick={() => updateFilter('page', page - 1)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs disabled:opacity-40 font-bold hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed shadow-sm transition"
              >
                Previous
              </button>
              <span className="text-xs font-extrabold text-gray-700 bg-white border border-gray-100 px-3.5 py-2 rounded-xl shadow-sm">
                Page {page} of {totalPages}
              </span>
              <button 
                disabled={page >= totalPages}
                onClick={() => updateFilter('page', page + 1)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed shadow-sm transition"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-store-slash text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No approved products found</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              {currentStore || storeId
                ? `There are currently no approved products listed from ${currentStore?.name || storeName || 'this shop'}.` 
                : 'Try adjusting your filters or search criteria.'}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              {(currentStore || storeId) && (
                <button
                  type="button"
                  onClick={clearStoreFilter}
                  className="px-4 py-2 rounded-xl bg-brand-green text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Browse All Shops
                </button>
              )}
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
