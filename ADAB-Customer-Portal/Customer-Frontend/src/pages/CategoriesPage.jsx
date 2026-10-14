import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import { 
  Sparkles, 
  ChevronRight, 
  ArrowUpRight, 
  SlidersHorizontal,
  Layers,
  PackageSearch,
  Filter,
  CheckCircle2,
  Store
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
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // 1. Load Categories via Category Tree API (Mahi's API #20)
  useEffect(() => {
    let isCurrent = true;
    api.get('/catalog/categories/tree')
      .then(res => {
        if (!isCurrent) return;
        const list = res.data?.data || res.data || [];
        setCategories(list);
        if (list.length > 0) {
          const requestedSlug = searchParams.get('category') || searchParams.get('slug');
          const matched = list.find(c => c.slug === requestedSlug || String(c.id) === requestedSlug);
          setSelectedCategory(matched || list[0]);
        }
      })
      .catch(() => {
        // Fallback to flat categories if tree fails
        return api.get('/catalog/categories').then(flatRes => {
          if (!isCurrent) return;
          const flatList = flatRes.data?.data || flatRes.data || [];
          setCategories(flatList);
          if (flatList.length > 0) setSelectedCategory(flatList[0]);
        });
      })
      .finally(() => {
        if (isCurrent) setLoadingCategories(false);
      });

    return () => { isCurrent = false; };
  }, []);

  // 2. Fetch products whenever selected category changes
  useEffect(() => {
    if (!selectedCategory) return;
    let isCurrent = true;
    setLoadingProducts(true);
    setActiveFilter('ALL');

    // Use Mahi's canonical endpoint: /catalog/categories/:slug/products
    api.get(`/catalog/categories/${selectedCategory.slug}/products`)
      .then(res => {
        if (!isCurrent) return;
        let prods = res.data?.data || res.data || [];
        if (!Array.isArray(prods) || prods.length === 0) {
          // Fallback search by category id
          return api.get(`/catalog/search?category=${selectedCategory.id}&limit=24`)
            .then(fallbackRes => {
              if (!isCurrent) return;
              setProducts(fallbackRes.data?.data || []);
            });
        } else {
          setProducts(prods);
        }
      })
      .catch(err => {
        if (!isCurrent) return;
        console.error('Error fetching category products:', err);
        setProducts([]);
      })
      .finally(() => {
        if (isCurrent) setLoadingProducts(false);
      });

    return () => { isCurrent = false; };
  }, [selectedCategory]);

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSearchParams({ category: cat.slug });
  };

  // 3. Dynamic Production-Level Filter Generation
  // If the DB has real subcategories (cat.children.length > 0), use DB subcategories.
  // Otherwise, dynamically derive real brand and price pills from the actual live products!
  const filterOptions = useMemo(() => {
    // Case A: Real DB subcategories exist
    if (selectedCategory?.children && selectedCategory.children.length > 0) {
      return [
        { id: 'ALL', label: `All in ${selectedCategory.name.split(' ')[0]}`, count: products.length, type: 'all' },
        ...selectedCategory.children.map(child => ({
          id: `child_${child.id}`,
          label: child.name,
          slug: child.slug,
          type: 'child_category'
        }))
      ];
    }

    // Case B: No subcategories in DB yet -> Dynamically generate from live products!
    const options = [
      { id: 'ALL', label: `All Items (${products.length})`, type: 'all' }
    ];

    if (products.length === 0) return options;

    // Extract unique brands / store names from live products
    const brandsSet = new Set();
    products.forEach(p => {
      const brand = p.brand_tag || (p.name ? p.name.split(' ')[0] : null);
      if (brand && brand.length > 2 && !['Pack', '1kg', '500g'].includes(brand)) {
        brandsSet.add(brand);
      }
    });

    brandsSet.forEach(brand => {
      const count = products.filter(p => 
        (p.name || '').toLowerCase().includes(brand.toLowerCase()) ||
        (p.brand_tag || '').toLowerCase() === brand.toLowerCase()
      ).length;
      if (count > 0) {
        options.push({ id: `brand_${brand}`, label: `${brand} (${count})`, brandName: brand, type: 'brand' });
      }
    });

    // Check for Under ₹50 quick filter
    const under50Count = products.filter(p => (p.price || p.sell_price || 0) <= 50).length;
    if (under50Count > 0 && under50Count < products.length) {
      options.push({ id: 'price_under_50', label: `Under ₹50 (${under50Count})`, maxPrice: 50, type: 'price' });
    }

    // Check for In-Stock filter
    const inStockCount = products.filter(p => (p.stock_qty || 0) > 0).length;
    if (inStockCount > 0 && inStockCount < products.length) {
      options.push({ id: 'in_stock_only', label: `In Stock Only (${inStockCount})`, type: 'stock' });
    }

    return options;
  }, [selectedCategory, products]);

  // 4. Apply selected dynamic filter
  const displayedProducts = useMemo(() => {
    if (activeFilter === 'ALL') return products;

    const selectedOpt = filterOptions.find(opt => opt.id === activeFilter);
    if (!selectedOpt) return products;

    if (selectedOpt.type === 'brand') {
      return products.filter(p => 
        (p.name || '').toLowerCase().includes(selectedOpt.brandName.toLowerCase()) ||
        (p.brand_tag || '').toLowerCase() === selectedOpt.brandName.toLowerCase()
      );
    }

    if (selectedOpt.type === 'price') {
      return products.filter(p => (p.price || p.sell_price || 0) <= selectedOpt.maxPrice);
    }

    if (selectedOpt.type === 'stock') {
      return products.filter(p => (p.stock_qty || 0) > 0);
    }

    if (selectedOpt.type === 'child_category') {
      return products.filter(p => 
        (p.name || '').toLowerCase().includes(selectedOpt.label.toLowerCase())
      );
    }

    return products;
  }, [products, activeFilter, filterOptions]);

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
            Browse through {categories.length} departments across Surat stores. Pick a department to see live products with express 14–45 minute delivery.
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
              Departments ({categories.length})
            </span>
          </div>

          <div className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
            {loadingCategories ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="h-12 bg-gray-100 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              categories.map(cat => {
                const isSelected = selectedCategory?.id === cat.id;
                const meta = CATEGORY_STYLES[cat.slug] || { icon: '🏷️' };
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full text-left px-3.5 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
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
            )}
          </div>
        </aside>

        {/* Right Column: Selected Department Details, Dynamic Filters & Live Products */}
        <section className="md:col-span-8 lg:col-span-9 space-y-5">
          {selectedCategory && (
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
                      Showing {products.length} live products from neighbourhood shops
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

              {/* Dynamic Quick Filters (Real Data: Subcategories if available, or Brands & Price) */}
              {filterOptions.length > 1 && (
                <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-2xs">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-2 px-1 flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-emerald-600" />
                    <span>Quick Filter</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto hide-scroll pb-1">
                    {filterOptions.map(opt => {
                      const isActive = activeFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setActiveFilter(opt.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-emerald-800 border-emerald-800 text-white shadow-xs font-extrabold'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Products Grid */}
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
                ) : displayedProducts.length === 0 ? (
                  <div className="bg-white border border-gray-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
                      <PackageSearch className="w-8 h-8" />
                    </div>
                    <h3 className="font-extrabold text-base text-gray-900">
                      No Products Found for this Selection
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      {activeFilter !== 'ALL'
                        ? 'Try clearing the active filter pill above to view all items in this department.'
                        : 'Local shops are restocking items in this department. Explore other departments or browse the complete marketplace catalog.'}
                    </p>
                    <div className="pt-2 flex justify-center gap-2">
                      {activeFilter !== 'ALL' ? (
                        <button
                          type="button"
                          onClick={() => setActiveFilter('ALL')}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Show All in {selectedCategory.name}
                        </button>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayedProducts.map(prod => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        onAddToCart={(id, name) => onAddToCart(id, name)}
                        onToggleWishlist={(id) => onToggleWishlist(id)}
                        wishlist={wishlist}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
