import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sellerApi } from '../api/sellerApi';
import { useSeller } from '../context/SellerContext';

export default function BuyNearbyPage() {
  const navigate = useNavigate();
  const { store } = useSeller();

  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'orders'
  const [viewMode, setViewMode] = useState('products'); // 'products' | 'stores'
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [creditInfo, setCreditInfo] = useState({ available_amount: 0, total_limit: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistance, setSelectedDistance] = useState('all');
  const [selectedCat, setSelectedCat] = useState('all');
  const [storeFilter, setStoreFilter] = useState(null); // Filter products by specific store

  // Cart count & feedback
  const [toastMessage, setToastMessage] = useState('');
  const [cartCount, setCartCount] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      return Array.isArray(saved) ? saved.length : 0;
    } catch (e) {
      return 0;
    }
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, storeRes, creditRes, orderRes] = await Promise.allSettled([
        sellerApi.getNearbyCatalog(),
        sellerApi.getNearbyStores(),
        sellerApi.getBuyerCreditBalance(),
        sellerApi.getPurchaseOrders()
      ]);

      let loadedProducts = [];
      if (catRes.status === 'fulfilled') {
        const raw = catRes.value?.data !== undefined ? catRes.value.data : catRes.value;
        loadedProducts = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setProducts(loadedProducts);
      } else {
        setProducts([]);
      }

      let loadedStores = [];
      if (storeRes.status === 'fulfilled') {
        const raw = storeRes.value?.data !== undefined ? storeRes.value.data : storeRes.value;
        loadedStores = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setStores(loadedStores);
      } else {
        setStores([]);
      }

      // If no products have been listed yet, but partner stores exist in the database,
      // default the view to 'stores' so user immediately sees registered partner shops
      if (loadedProducts.length === 0 && loadedStores.length > 0) {
        setViewMode('stores');
      }

      if (creditRes.status === 'fulfilled') {
        const raw = creditRes.value?.data !== undefined ? creditRes.value.data : creditRes.value;
        const info = raw?.data || raw || {};
        setCreditInfo({
          available_amount: Number(info.available_amount || info.total_limit || 0),
          total_limit: Number(info.total_limit || 0)
        });
      }

      if (orderRes.status === 'fulfilled') {
        const raw = orderRes.value?.data !== undefined ? orderRes.value.data : orderRes.value;
        setOrders(Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to load nearby data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCartSync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
        setCartCount(Array.isArray(saved) ? saved.length : 0);
      } catch (e) {
        setCartCount(0);
      }
    };
    window.addEventListener('adab-cart-updated', handleCartSync);
    return () => window.removeEventListener('adab-cart-updated', handleCartSync);
  }, []);

  const handleAddToCart = (item) => {
    try {
      const currentCart = JSON.parse(localStorage.getItem('adab_buy_cart') || '[]');
      const existingIndex = currentCart.findIndex((c) => c.id === item.id);

      if (existingIndex >= 0) {
        currentCart[existingIndex].quantity = (currentCart[existingIndex].quantity || 1) + 1;
      } else {
        currentCart.push({
          id: item.id,
          name: item.name,
          price: Number(item.price || item.mrp || 0),
          mrp: Number(item.mrp || 0),
          store_id: item.store_id,
          store_name: item.store_name,
          distance_km: item.distance_km,
          unit: item.unit || 'unit',
          min_order: Number(item.min_order || 1),
          quantity: Number(item.min_order || 1),
          credit_allowed: item.credit_allowed,
          credit_days: item.credit_days,
          delivery_options: item.delivery_options || []
        });
      }

      localStorage.setItem('adab_buy_cart', JSON.stringify(currentCart));
      window.dispatchEvent(new Event('adab-cart-updated'));
      showToast(`Added ${item.name} to Purchase Cart`);
    } catch (e) {
      console.error('Cart add error:', e);
    }
  };

  const handleBuyNow = (item) => {
    handleAddToCart(item);
    navigate('/buycart');
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.store_name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);

    const matchCat = selectedCat === 'all' || (p.category || '').toLowerCase().includes(selectedCat.toLowerCase());

    const dist = Number(p.distance_km || 0);
    const matchDist = selectedDistance === 'all' || dist <= Number(selectedDistance);

    const matchStore = !storeFilter || p.store_id === storeFilter;

    return matchSearch && matchCat && matchDist && matchStore;
  });

  // Filtered Stores
  const filteredStores = stores.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (s.store_name || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q);

    const matchCat = selectedCat === 'all' || (s.category || '').toLowerCase().includes(selectedCat.toLowerCase());

    const dist = Number(s.distance_km || 0);
    const matchDist = selectedDistance === 'all' || dist <= Number(selectedDistance);

    return matchSearch && matchCat && matchDist;
  });

  // Extract distinct categories
  const categoriesList = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter(Boolean)
        .concat(['Grocery', 'FMCG', 'Dairy', 'Spices', 'Snacks', 'Clothing'])
    )
  );

  return (
    <section id="sec-buy" className="space-y-5 fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 animate-bounce">
          <i className="fa-solid fa-check-circle text-green-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header & Live Balances */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Nearby Kiranas &amp; Restock</h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wide">
              B2B Wholesale
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Restock directly from partner stores within your local logistics radius · or use{' '}
            <Link to="/mastersearch" className="text-blue-700 font-bold hover:underline">
              Search &amp; Buy
            </Link>{' '}
            nationwide.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 font-bold border border-purple-200 flex items-center gap-1.5 shadow-sm">
            <i className="fa-solid fa-credit-card text-purple-600"></i>
            <span>
              Credit:{' '}
              {creditInfo.available_amount > 0
                ? `₹${creditInfo.available_amount.toLocaleString('en-IN')}`
                : '₹0 available'}
            </span>
          </div>
          <Link
            to="/credit-apply"
            className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition flex items-center gap-1"
          >
            <i className="fa-solid fa-plus text-xs"></i> Apply Limit
          </Link>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto hide-scroll">
        <button
          type="button"
          onClick={() => {
            setActiveTab('browse');
            setStoreFilter(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 ${
            activeTab === 'browse'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="fa-solid fa-map-location-dot"></i>
          <span>Browse Nearby</span>
        </button>

        <Link
          to="/buycart"
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 transition flex items-center gap-2"
        >
          <i className="fa-solid fa-cart-shopping text-blue-600"></i>
          <span>Purchase Cart</span>
          {cartCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {cartCount}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="fa-solid fa-receipt"></i>
          <span>My Purchase Orders</span>
          {orders.length > 0 && (
            <span className="bg-gray-200 text-gray-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {orders.length}
            </span>
          )}
        </button>
      </div>

      {/* BROWSE TAB CONTENT */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Filter Toolbar & View Mode Switcher */}
          <div className="card p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white">
            <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products or stores..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm outline-none focus:border-emerald-500 transition"
                />
              </div>

              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium outline-none focus:border-emerald-500 bg-white"
              >
                <option value="all">Any distance</option>
                <option value="5">Within 5 km</option>
                <option value="15">Within 15 km</option>
                <option value="50">Within 50 km (Porter)</option>
              </select>

              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium outline-none focus:border-emerald-500 bg-white"
              >
                <option value="all">All categories</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {storeFilter && (
                <button
                  type="button"
                  onClick={() => setStoreFilter(null)}
                  className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 shrink-0"
                >
                  <i className="fa-solid fa-xmark"></i> Clear Store Filter
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('products')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-boxes-stacked"></i> Products ({filteredProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('stores')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'stores' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <i className="fa-solid fa-store"></i> Shops ({filteredStores.length})
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="card p-12 text-center text-gray-500 text-sm space-y-3">
              <i className="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-600"></i>
              <div className="font-bold text-gray-700">Connecting to live database...</div>
              <p className="text-xs text-gray-400">Loading nearby seller catalogs, credit terms, and delivery zones.</p>
            </div>
          )}

          {/* VIEW MODE: PRODUCTS GRID */}
          {!loading && viewMode === 'products' && (
            <>
              {filteredProducts.length === 0 ? (
                /* Production-Grade Real Empty State */
                <div className="card p-10 sm:p-14 text-center border-dashed border-2 border-gray-200 space-y-4 max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto text-2xl shadow-inner">
                    <i className="fa-solid fa-boxes-stacked"></i>
                  </div>
                  <div>
                    {storeFilter ? (
                      <>
                        <h3 className="text-lg font-extrabold text-gray-900">
                          {stores.find((st) => st.id === storeFilter)?.store_name || 'Selected Store'} Has No Products Yet
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                          This partner store is registered in the directory, but has not published any items in their wholesale catalog yet.
                        </p>
                      </>
                    ) : stores.length > 0 ? (
                      <>
                        <h3 className="text-lg font-extrabold text-gray-900">No Wholesale Products Listed Yet</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                          There are <span className="font-bold text-gray-800">{stores.length} registered partner stores</span> in your directory, but none have published wholesale products yet. You can view their profiles and terms in the Shops directory.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-extrabold text-gray-900">No Other Stores in Your Local Radius Yet</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                          You are currently logged in as <span className="font-bold text-gray-700">{store?.store_name || 'your store'}</span>. In B2B restocking, your own store is excluded from the supplier list.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl text-left border border-gray-200 text-xs text-gray-600 space-y-2">
                    <div className="font-bold text-gray-800 flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-info text-blue-600"></i> How multi-seller restocking works:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-gray-500 pl-1">
                      {stores.length > 0 ? (
                        <>
                          <li>
                            <strong>{stores.length} partner stores found:</strong> {stores.map((s) => s.store_name).join(', ')}.
                          </li>
                          <li>
                            When these sellers list inventory or when a new seller lists products, their live items will automatically appear here.
                          </li>
                        </>
                      ) : (
                        <>
                          <li>When you register a <strong>2nd seller account</strong> or onboard another store, their verified listings will appear here automatically.</li>
                          <li>Their credit policy (e.g. 14 days credit) and delivery zones (Porter / Express) will be loaded live from PostgreSQL.</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="flex gap-2 justify-center pt-2 flex-wrap">
                    {storeFilter ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStoreFilter(null);
                          setViewMode('stores');
                        }}
                        className="btn-primary !text-xs !py-2.5 !px-4 flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-arrow-left"></i> Return to All Shops ({stores.length})
                      </button>
                    ) : stores.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setViewMode('stores')}
                        className="btn-primary !text-xs !py-2.5 !px-4 flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-store"></i> View {stores.length} Registered Shops
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setViewMode('stores')}
                        className="btn-soft !text-xs !py-2.5 !px-4 flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-store"></i> Check Store Directory
                      </button>
                    )}
                    <Link
                      to="/mastersearch"
                      className="btn-soft !text-xs !py-2.5 !px-4 flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-magnifying-glass"></i> Search National FMCG Catalog
                    </Link>
                  </div>
                </div>
              ) : (
                /* Live Real Products Grid */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="card p-4 space-y-3 hover:shadow-md hover:border-emerald-200 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <button
                            type="button"
                            onClick={() => {
                              setViewMode('products');
                              setStoreFilter(p.store_id);
                            }}
                            className="font-semibold text-gray-700 hover:text-emerald-700 hover:underline truncate max-w-[180px]"
                          >
                            <i className="fa-solid fa-store mr-1 text-emerald-600"></i>
                            {p.store_name}
                          </button>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-extrabold text-[10px]">
                            {p.distance_km || 3} km
                          </span>
                        </div>

                        <h3 className="font-extrabold text-gray-900 text-base leading-tight">{p.name}</h3>

                        <div className="flex items-baseline gap-2">
                          <span className="text-emerald-700 font-extrabold text-xl">
                            ₹{Number(p.price || 0).toLocaleString('en-IN')}
                          </span>
                          {p.mrp && Number(p.mrp) > Number(p.price) && (
                            <span className="text-xs text-gray-400 line-through">
                              ₹{Number(p.mrp).toLocaleString('en-IN')}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-normal">
                            / {p.unit || 'unit'} {p.min_order > 1 ? `· min ${p.min_order}` : ''}
                          </span>
                        </div>

                        {/* Credit & Delivery Terms Badges */}
                        <div className="space-y-1 pt-1">
                          <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <i className="fa-solid fa-clock-rotate-left text-amber-600"></i>
                            <span>
                              {p.credit_allowed
                                ? `${p.credit_days || 14} days shop credit eligible`
                                : 'Cash on delivery / UPI'}
                            </span>
                          </div>

                          <div className="text-[10px] text-gray-500 flex items-center gap-1 px-1">
                            <i className="fa-solid fa-truck-fast text-emerald-600"></i>
                            <span>
                              {Array.isArray(p.delivery_options) && p.delivery_options.length > 0
                                ? p.delivery_options[0].zone_name
                                : 'Local Van / Porter delivery'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(p)}
                          className="btn-soft flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1.5"
                        >
                          <i className="fa-solid fa-cart-plus text-emerald-700"></i>
                          <span>Add to Cart</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBuyNow(p)}
                          className="btn-primary flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1.5"
                        >
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* VIEW MODE: STORES DIRECTORY */}
          {!loading && viewMode === 'stores' && (
            <>
              {filteredStores.length === 0 ? (
                /* Empty State for Stores */
                <div className="card p-10 sm:p-14 text-center border-dashed border-2 border-gray-200 space-y-4 max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto text-2xl shadow-inner">
                    <i className="fa-solid fa-map-location-dot"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">No Nearby Partner Stores Found</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                      There are currently no other merchants registered in your delivery radius. Once a 2nd seller signs up and onboards their store, their store profile, location, and wholesale stock will display here.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('products')}
                      className="btn-primary !text-xs !py-2.5 !px-4"
                    >
                      Return to Product View
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Real Stores Cards */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStores.map((s) => (
                    <div
                      key={s.id}
                      className="card p-5 space-y-3 hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-extrabold text-gray-900 text-base">{s.store_name}</h3>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <i className="fa-solid fa-location-dot text-gray-400"></i>
                              <span>
                                {s.city || 'Local Area'} · {s.distance_km || 3} km away
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              s.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {s.is_online ? '● Open' : '○ Closed'}
                          </span>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs text-gray-600 border border-gray-100">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Wholesale Category:</span>
                            <span className="font-bold text-gray-800">{s.category || 'General Store'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Live Catalog:</span>
                            <span className="font-bold text-emerald-700">
                              {s.active_listings_count || 0} items available
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Credit Terms:</span>
                            <span className="font-bold text-purple-800">
                              {s.credit_allowed ? `${s.credit_days || 14} Days Net` : 'Instant Pay'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStoreFilter(s.id);
                            setViewMode('products');
                          }}
                          className="btn-primary flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1"
                        >
                          <i className="fa-solid fa-boxes-stacked"></i> View Products
                        </button>
                        <Link
                          to="/messages"
                          className="btn-soft !text-xs !py-2.5 !px-3 flex items-center justify-center gap-1 text-gray-700 hover:text-emerald-700"
                          title="Message Shopkeeper"
                        >
                          <i className="fa-solid fa-comment-dots"></i>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Credit Limit Banner Callout */}
          <Link
            to="/credit-apply"
            className="card p-4 hover:border-purple-300 border-dashed border-2 border-purple-200 flex items-center gap-3 bg-gradient-to-r from-purple-50/50 to-white transition block"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 text-base">
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
            <div>
              <div className="font-extrabold text-sm text-purple-950">Need higher credit limit to restock inventory?</div>
              <div className="text-xs text-purple-700">Apply for pre-approved ADAB B2B store credit lines (up to ₹5,00,000)</div>
            </div>
            <i className="fa-solid fa-arrow-right ml-auto text-purple-600 pr-1"></i>
          </Link>
        </div>
      )}

      {/* MY PURCHASE ORDERS TAB CONTENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="card p-12 text-center text-gray-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-2xl">
                <i className="fa-solid fa-receipt"></i>
              </div>
              <h3 className="font-extrabold text-gray-900 text-base">No Purchase Orders Placed Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Orders you place with nearby kiranas or FMCG suppliers will show real-time tracking, GST invoices, and delivery statuses here.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="btn-primary !text-xs !py-2 !px-4 mt-2"
              >
                Browse Restock Items
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((po) => (
                <div
                  key={po.id || po.po_number}
                  className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-sm transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 text-sm">#{po.po_number}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          po.status === 'DELIVERED'
                            ? 'bg-green-100 text-green-800'
                            : po.status === 'IN_TRANSIT'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {po.status || 'PACKING'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Supplier: <span className="font-semibold text-gray-700">{po.supplier_name || 'Nearby Hub'}</span> · {po.payment_mode || 'Credit'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-gray-900 text-base">
                      ₹{Number(po.total_amount || 0).toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => alert(`Re-ordering stock from ${po.supplier_name}`)}
                      className="btn-soft !text-xs !py-1.5 !px-3 font-bold"
                    >
                      Re-order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
