import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Filter, Store, X } from 'lucide-react';

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

  // Read URL State
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const categoriesParam = searchParams.get('categories') || '';
  const selectedCategories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];
  const sortBy = searchParams.get('sortBy') || searchParams.get('sortOrder') || 'relevance';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page')) || 1;
  const storeId = searchParams.get('store_id') || searchParams.get('storeId') || selectedStoreId || (selectedStore?.id) || '';

  // Fetch categories dynamically from database
  useEffect(() => {
    api.get('/catalog/categories')
      .then(res => {
        const cats = res.data?.data || res.data || [];
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

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (category) params.append('category', category);
        if (selectedCategories.length > 0) params.append('categories', selectedCategories.join(','));
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
        if (sortBy) {
          params.append('sortBy', sortBy);
          params.append('sortOrder', sortBy);
        }
        if (storeId) {
          params.append('store_id', storeId);
        }
        params.append('page', page);
        params.append('limit', 12);

        const res = await api.get(`/catalog/search?${params.toString()}`);
        setProducts(res.data?.data || []);
        const total = res.data?.pagination?.total ?? (res.data?.data?.length || 0);
        const pages = res.data?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / 12));
        setTotalPages(pages);
      } catch (err) {
        console.error('Error fetching browse products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [q, category, categoriesParam, minPrice, maxPrice, sortBy, storeId, page]);

  // Handlers for Filter changes
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value !== undefined && value !== null && value !== '') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Only reset page to 1 when a filter other than 'page' changes!
    if (key !== 'page') {
      newParams.set('page', 1);
    }
    setSearchParams(newParams);
  };

  const clearStoreFilter = () => {
    if (onClearStore) onClearStore();
    setCurrentStore(null);
    updateFilter('store_id', '');
    updateFilter('storeId', '');
  };

  const handleSelectStore = (store) => {
    if (onSelectStore) onSelectStore(store);
    setCurrentStore(store);
    updateFilter('store_id', store.id);
  };

  const toggleCategoryName = (catName) => {
    const next = selectedCategories.includes(catName)
      ? selectedCategories.filter(c => c !== catName)
      : [...selectedCategories, catName];
    updateFilter('categories', next.join(','));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start animate-fade-in">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 bg-white border border-gray-200 rounded-2xl p-5 shrink-0 sticky top-20">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="font-black text-gray-900">Filters</h2>
        </div>
        
        <div className="space-y-6">
          {/* Store / Shop Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
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
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-gray-500">Categories</h3>
            <div className="space-y-2">
              {categoriesList.map(cat => {
                const catName = cat.name || cat;
                return (
                  <label key={cat.id || catName} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="rounded text-brand-green focus:ring-brand-green" 
                      checked={selectedCategories.includes(catName)}
                      onChange={() => toggleCategoryName(catName)}
                    /> {catName}
                  </label>
                );
              })}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-gray-500">Price Range</h3>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={minPrice}
                onChange={(e) => updateFilter('minPrice', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
              />
              <span className="text-gray-400">-</span>
              <input 
                type="number" 
                placeholder="Max" 
                value={maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content & Product Grid */}
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selected Shop Hero Banner */}
        {currentStore && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur border border-white/25 flex items-center justify-center font-black text-xl text-white shadow-inner shrink-0">
                  {(currentStore.name || 'Store').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/40">
                      OPEN NOW
                    </span>
                    <span className="text-xs text-emerald-200 font-bold flex items-center gap-1">
                      <i className="fa-solid fa-star text-amber-300"></i>
                      {currentStore.rating || '4.8'} Verified Shop
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black mt-1 tracking-tight text-white">{currentStore.name}</h2>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    {currentStore.area || currentStore.address_line || 'Local Merchant'} · {currentStore.distance || '1.2 km'} delivery
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearStoreFilter}
                className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View All Shops</span>
                <i className="fa-solid fa-xmark text-xs ml-0.5"></i>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {currentStore ? `${currentStore.name}` : (q ? `Results for "${q}"` : 'All Products')}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentStore ? `Showing approved items from ${currentStore.name}` : 'Approved fresh essentials from verified local sellers'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 font-medium">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="border-none bg-transparent font-bold text-gray-900 focus:ring-0 cursor-pointer"
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Rated</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-2xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={onAddToCart} 
                  onToggleWishlist={onToggleWishlist}
                  wishlist={wishlist}
                />
              ))}
            </div>
            
            {/* Pagination Controls */}
            <div className="flex justify-center items-center gap-4 mt-10">
              <button 
                disabled={page <= 1}
                onClick={() => updateFilter('page', page - 1)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50 font-bold hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm font-bold text-gray-700">Page {page} of {totalPages}</span>
              <button 
                disabled={page >= totalPages}
                onClick={() => updateFilter('page', page + 1)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
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
              {currentStore 
                ? `There are currently no approved products listed from ${currentStore.name}.` 
                : 'Try adjusting your filters or search criteria.'}
            </p>
            {currentStore && (
              <button
                type="button"
                onClick={clearStoreFilter}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-green text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Browse All Shops
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
