import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import {
  AlertCircle,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  SlidersHorizontal,
  Layers,
  PackageSearch,
  RefreshCw
} from 'lucide-react';

// Visual Category Icons & Color Accents
const CATEGORY_STYLES = {
  'fresh-produce': { icon: '🥦', gradient: 'from-emerald-600 to-green-700' },
  'dairy-eggs': { icon: '🥛', gradient: 'from-blue-600 to-sky-700' },
  'pantry-staples': { icon: '🌾', gradient: 'from-amber-600 to-yellow-700' },
  'snacks-packaged-food': { icon: '🍿', gradient: 'from-orange-500 to-amber-600' },
  'beverages-drinks': { icon: '🧃', gradient: 'from-cyan-600 to-blue-700' },
  'personal-care': { icon: '🧴', gradient: 'from-rose-500 to-pink-600' },
  'household-cleaning': { icon: '🧹', gradient: 'from-teal-600 to-emerald-700' },
  'fashion-apparel': { icon: '👕', gradient: 'from-purple-600 to-indigo-700' },
  'bakery-confectionery': { icon: '🍞', gradient: 'from-amber-700 to-orange-800' },
  'spices-oils': { icon: '🌶️', gradient: 'from-red-600 to-orange-700' }
};

export default function CategoriesPage({ onAddToCart, onToggleWishlist, wishlist = [] }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productsError, setProductsError] = useState(null);

  const isMountedRef = useRef(true);
  const catsFetchedRef = useRef(false);
  const catsInFlightRef = useRef(false);
  const lastCatKeyRef = useRef(null);
  const inFlightCatKeyRef = useRef(null);
  const productsReqIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Load Categories via Category Tree API (Mahi's API #20) - once on mount (StrictMode safe)
  const fetchCategories = useCallback(async (force = false) => {
    if (catsInFlightRef.current) return;
    if (!force && catsFetchedRef.current) return;
    catsFetchedRef.current = true;
    catsInFlightRef.current = true;
    if (force) {
      setLoadingCategories(true);
      setCategoriesError(null);
    }
    try {
      let list = [];
      try {
        const res = await api.get('/catalog/categories/tree');
        const raw = res.data?.data ?? res.data;
        list = Array.isArray(raw) ? raw : [];
      } catch {
        const flatRes = await api.get('/catalog/categories');
        const flatRaw = flatRes.data?.data ?? flatRes.data;
        list = Array.isArray(flatRaw) ? flatRaw : [];
      }
      if (!isMountedRef.current) return;
      setCategories(list);
      setCategoriesLoaded(true);
      setCategoriesError(null);
      if (list.length > 0) {
        const requestedSlug = searchParams.get('category') || searchParams.get('slug');
        const matched = list.find(c => c.slug === requestedSlug || String(c.id) === requestedSlug);
        setSelectedCategory(prev => prev || matched || list.find(c => c.slug === 'snacks-packaged-food') || list[0]);
      }
    } catch (err) {
      catsFetchedRef.current = false;
      if (!isMountedRef.current) return;
      console.error('Error fetching categories:', err);
      setCategoriesError(err.response?.data?.message || 'Unable to load departments. Please try again.');
    } finally {
      catsInFlightRef.current = false;
      if (isMountedRef.current) setLoadingCategories(false);
    }
  }, [searchParams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories(false);
  }, [fetchCategories]);

  // 2. Fetch products whenever selected category changes (StrictMode safe)
  const fetchCategoryProducts = useCallback(async (cat, force = false) => {
    if (!cat) return;
    const catKey = String(cat.slug || cat.id);
    if (!force && inFlightCatKeyRef.current === catKey) return;
    if (!force && lastCatKeyRef.current === catKey) return;

    lastCatKeyRef.current = catKey;
    inFlightCatKeyRef.current = catKey;
    const reqId = ++productsReqIdRef.current;

    setLoadingProducts(true);
    setProductsError(null);

    try {
      const res = await api.get(`/catalog/categories/${cat.slug}/products`);
      if (!isMountedRef.current || reqId !== productsReqIdRef.current) return;
      const prods = res.data?.data ?? res.data;
      if (!Array.isArray(prods) || prods.length === 0) {
        const fallbackRes = await api.get(`/catalog/search?category=${cat.id}&limit=24`);
        if (!isMountedRef.current || reqId !== productsReqIdRef.current) return;
        setProducts(Array.isArray(fallbackRes.data?.data) ? fallbackRes.data.data : []);
      } else {
        setProducts(prods);
      }
      setProductsLoaded(true);
      setProductsError(null);
    } catch (err) {
      if (lastCatKeyRef.current === catKey) {
        lastCatKeyRef.current = null;
      }
      if (!isMountedRef.current || reqId !== productsReqIdRef.current) return;
      console.error('Error fetching category products:', err);
      setProducts([]);
      setProductsError(err.response?.data?.message || 'Unable to load products for this department.');
    } finally {
      if (inFlightCatKeyRef.current === catKey) {
        inFlightCatKeyRef.current = null;
      }
      if (isMountedRef.current && reqId === productsReqIdRef.current) {
        setLoadingProducts(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCategoryProducts(selectedCategory, false);
    }
  }, [selectedCategory, fetchCategoryProducts]);

  const handleSelectCategory = (cat) => {
    if (loadingProducts && selectedCategory?.id === cat.id) return;
    if (selectedCategory?.id === cat.id) return;
    setProductsLoaded(false);
    setSelectedCategory(cat);
    setSearchParams({ category: cat.slug });
  };



  const styleMeta = selectedCategory ? (CATEGORY_STYLES[selectedCategory.slug] || {
    icon: '🏷️',
    gradient: 'from-emerald-700 to-teal-800'
  }) : null;

  return (
    <div className="animate-fade-in pb-16 space-y-6">
      {/* Category Explorer Hero Banner matching app-header in App.jsx */}
      <div className="app-header rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 -skew-x-12 pointer-events-none"></div>
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 glass px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-2.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Interactive Department Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Shop by Category
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-medium leading-relaxed">
            {categoriesLoaded
              ? `Browse through ${categories.length} departments across Surat stores. Pick a department to see live products with express 14–45 minute delivery.`
              : 'Loading departments across Surat stores with express 14–45 minute delivery.'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout (Blinkit / Zepto / Flipkart Style) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vertical Department Navigation Rail */}
        <aside className="md:col-span-4 lg:col-span-3 bg-white border border-gray-200/80 rounded-3xl p-3 shadow-xs sticky top-20">
          <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Departments {categoriesLoaded ? `(${categories.length})` : ''}
            </span>
          </div>

          <div className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
            {loadingCategories ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="h-12 bg-gray-100 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : categoriesError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{categoriesError}</span>
                </div>
                <button
                  type="button"
                  disabled={loadingCategories}
                  onClick={() => fetchCategories(true)}
                  className="px-3 py-1.5 bg-white border border-red-200 rounded-xl font-bold text-red-800 hover:bg-red-100 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingCategories ? 'animate-spin' : ''}`} /> Retry
                </button>
              </div>
            ) : categoriesLoaded ? (
              categories.map(cat => {
                const isSelected = selectedCategory?.id === cat.id;
                const meta = CATEGORY_STYLES[cat.slug] || { icon: '🏷️' };
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={loadingProducts && isSelected}
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full text-left px-3.5 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20 translate-x-1'
                        : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base shrink-0">{meta.icon}</span>
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'rotate-90 md:rotate-0 text-white' : 'text-gray-400'}`} />
                  </button>
                );
              })
            ) : null}
          </div>
        </aside>

        {/* Right Column: Selected Department Details, Dynamic Filters & Live Products */}
        <section className="md:col-span-8 lg:col-span-9 space-y-5">
          {categoriesLoaded && !categoriesError && selectedCategory && (
            <>
              {/* Department Header Card */}
              <div className="bg-white border border-gray-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${styleMeta.gradient} text-white flex items-center justify-center text-2xl shadow-md shrink-0`}>
                    {styleMeta.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-gray-900">
                        {selectedCategory.name}
                      </h2>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {productsLoaded && !productsError
                        ? `Showing ${products.length} live products from neighbourhood shops`
                        : 'Loading products from neighbourhood shops...'}
                    </p>
                  </div>
                </div>

                {/* Direct Shortcut to Detailed Faceted Browse */}
                <button
                  type="button"
                  onClick={() => navigate(`/browse?categories=${encodeURIComponent(selectedCategory.name)}&category=${selectedCategory.id}&categoryName=${encodeURIComponent(selectedCategory.name)}`)}
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0 border border-gray-200/80"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Open in Browse with Price Filters</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Products Grid (hidden until loaded) */}
              <div>
                {loadingProducts ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <div key={n} className="bg-white rounded-3xl p-4 border border-gray-100 animate-pulse space-y-3">
                        <div className="w-full aspect-square bg-gray-100 rounded-2xl"></div>
                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : productsError ? (
                  <div className="bg-white border border-red-100 rounded-3xl p-8 text-center space-y-3 shadow-xs">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-base text-gray-900">Failed to Load Department Products</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">{productsError}</p>
                    <button
                      type="button"
                      disabled={loadingProducts}
                      onClick={() => fetchCategoryProducts(selectedCategory, true)}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin' : ''}`} /> Retry
                    </button>
                  </div>
                ) : productsLoaded && products.length === 0 ? (
                  <div className="bg-white border border-gray-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
                      <PackageSearch className="w-8 h-8" />
                    </div>
                    <h3 className="font-extrabold text-base text-gray-900">
                      No Products Found in this Department
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Local shops are restocking items in this department. Explore other departments or browse the complete marketplace catalog.
                    </p>
                    <div className="pt-2 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const snacks = categories.find(c => c.slug === 'snacks-packaged-food');
                          if (snacks) handleSelectCategory(snacks);
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Explore Snacks & Food
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/browse')}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Browse All Catalog
                      </button>
                    </div>
                  </div>
                ) : productsLoaded ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map(prod => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        onAddToCart={(id, name) => onAddToCart(id, name)}
                        onToggleWishlist={(id) => onToggleWishlist(id)}
                        wishlist={wishlist}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
