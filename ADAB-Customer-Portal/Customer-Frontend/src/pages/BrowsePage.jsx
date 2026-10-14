import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { Filter, SlidersHorizontal, X } from 'lucide-react';

let browseCategoriesCache = null;

export default function BrowsePage({ onAddToCart, onToggleWishlist, wishlist }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [categoriesList, setCategoriesList] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Read URL State
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const categoryNameParam = searchParams.get('categoryName') || '';
  const categoriesParam = searchParams.get('categories') || '';
  const rawCategories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];

  // Derive active selected category names across ?categories=..., ?category=..., and ?categoryName=...
  // Automatically activates and checks the category checkbox when redirected from CategoriesPage or HomePage
  const selectedCategories = useMemo(() => {
    if (rawCategories.length > 0) {
      return rawCategories;
    }
    if (categoryNameParam) {
      return [categoryNameParam];
    }
    if (category && categoriesList.length > 0) {
      const match = categoriesList.find(c => 
        String(c.id) === String(category) || 
        c.slug === category || 
        c.name.toLowerCase() === category.toLowerCase()
      );
      if (match) return [match.name];
    }
    return [];
  }, [rawCategories.join(','), categoryNameParam, category, categoriesList]);

  const storeId = searchParams.get('storeId') || searchParams.get('store') || '';
  const storeName = searchParams.get('storeName') || '';
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

  // Fetch products cleanly without triggering premature net::ERR_CANCELED DevTools errors
  useEffect(() => {
    let isCurrent = true;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        
        // Pass category filters: prioritize selectedCategories (names) or fallback to single category
        if (selectedCategories.length > 0) {
          params.append('categories', selectedCategories.join(','));
        } else if (category) {
          params.append('category', category);
        }

        if (storeId) params.append('storeId', storeId);
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
  }, [q, category, categoryNameParam, categoriesParam, selectedCategories.join(','), storeId, storeName, minPrice, maxPrice, sortBy, page]);

  // Handlers for Filter changes
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    const currentValue = newParams.get(key);
    // Prevent duplicate reload if setting same value
    if (String(currentValue || '') === String(value || '')) {
      return;
    }
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

  const toggleCategoryName = (catName) => {
    const next = selectedCategories.includes(catName)
      ? selectedCategories.filter(c => c !== catName)
      : [...selectedCategories, catName];

    const newParams = new URLSearchParams(searchParams);
    // Clean up single category query parameters to prevent query conflicts
    newParams.delete('category');
    newParams.delete('categoryName');

    if (next.length > 0) {
      newParams.set('categories', next.join(','));
    } else {
      newParams.delete('categories');
    }
    newParams.set('page', 1);
    setSearchParams(newParams);
  };

  const clearStoreFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('storeId');
    newParams.delete('storeName');
    newParams.delete('store');
    newParams.set('page', 1);
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
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
        {(selectedCategories.length > 0 || minPrice || maxPrice || storeId || category || categoryNameParam) && (
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-bold text-brand-green hover:underline cursor-pointer"
          >
            Reset All
          </button>
        )}
      </div>

      {storeId && (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Filtered By Shop</span>
            <button
              onClick={clearStoreFilter}
              className="text-[10px] text-gray-400 hover:text-red-600 font-bold hover:underline cursor-pointer"
            >
              Remove ✕
            </button>
          </div>
          <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#18753C]"></span>
            <span className="truncate">{storeName || 'Selected Store'}</span>
          </div>
        </div>
      )}
      
      <div>
        <h3 className="text-xs font-extrabold mb-3 uppercase tracking-wider text-gray-500">
          Categories ({categoriesList.length})
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {categoriesList.map(cat => {
            const catName = cat.name || cat;
            const isChecked = selectedCategories.includes(catName) ||
              (selectedCategories.length === 0 && (
                category === String(cat.id) ||
                category === cat.slug ||
                category === catName ||
                categoryNameParam === catName
              ));
            return (
              <label key={cat.id || catName} className="flex items-center gap-2.5 text-xs cursor-pointer select-none py-1 hover:text-brand-green transition">
                <input 
                  type="checkbox" 
                  className="rounded text-brand-green focus:ring-brand-green w-4 h-4 accent-[#18753C]" 
                  checked={isChecked}
                  onChange={() => toggleCategoryName(catName)}
                /> 
                <span className={isChecked ? 'font-bold text-emerald-800' : 'text-gray-600'}>{catName}</span>
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
        {/* Clean Modern Storefront Header */}
        {storeId ? (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 shadow-xs">
                  <i className="fa-solid fa-store text-2xl"></i>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <i className="fa-solid fa-circle-check text-emerald-600 text-[10px]"></i> Verified Shop
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      <i className="fa-solid fa-bolt text-amber-500 mr-1"></i> Express 15-30m
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                    {storeName || 'Partner Store'}
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing products available directly from this merchant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  onClick={clearStoreFilter}
                  className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <span>View All Stores</span>
                  <span className="text-gray-400 font-normal">✕</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Inventory:</span>
                <span className="text-xs font-extrabold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {products.length} Products Found
                </span>
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

        {/* Active Filter Chips */}
        {(selectedCategories.length > 0 || minPrice || maxPrice) && (
          <div className="flex flex-wrap items-center gap-2 mb-5 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100/80">
            <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-700" />
              Active:
            </span>
            {selectedCategories.map(catName => (
              <span
                key={catName}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-emerald-800 border border-emerald-200 shadow-2xs"
              >
                <span>{catName}</span>
                <button
                  type="button"
                  onClick={() => toggleCategoryName(catName)}
                  className="hover:text-red-600 font-bold cursor-pointer text-xs leading-none ml-0.5"
                  title={`Remove ${catName}`}
                >
                  ✕
                </button>
              </span>
            ))}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-700 border border-gray-200 shadow-2xs">
                <span>Price: ₹{minPrice || 0} - ₹{maxPrice || '∞'}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('minPrice');
                    newParams.delete('maxPrice');
                    newParams.set('page', 1);
                    setSearchParams(newParams);
                  }}
                  className="hover:text-red-600 font-bold cursor-pointer text-xs leading-none ml-0.5"
                  title="Remove Price Filter"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-extrabold text-emerald-700 hover:text-emerald-950 hover:underline cursor-pointer ml-auto"
            >
              Clear All
            </button>
          </div>
        )}

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
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <i className="fa-solid fa-store-slash text-2xl"></i>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1">No products match your criteria</h3>
            <p className="text-gray-500 text-xs mb-4">Try clearing active category filters or price limits to view more products.</p>
            <button
              onClick={clearAllFilters}
              className="px-5 py-2.5 bg-brand-green text-white font-bold text-xs rounded-xl hover:bg-green-700 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
