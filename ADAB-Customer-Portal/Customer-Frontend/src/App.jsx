import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './App.css';
import FloatingCartBar from './components/FloatingCartBar';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import SearchPage from './pages/SearchPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductPage from './pages/ProductPage';
import WishlistPage from './pages/WishlistPage';
import AccountPage from './pages/AccountPage';
import { CartAPI, CheckoutAPI, WishlistAPI, OrderAPI } from './services/api';
import { api } from './api/api';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.substring(1) || 'home';
  const setActiveTab = (tab) => navigate(`/${tab === 'home' ? '' : tab}`);
  const [points] = useState(2840);
  
  const [storeCount, setStoreCount] = useState(48); // default mock, replaced by API

  useEffect(() => {
    api.get('/catalog/stores').then(res => {
      if (res.data?.success && res.data?.data) {
        setStoreCount(res.data.data.length || 48);
      }
    }).catch(err => console.error("Failed to fetch stores in App", err));
  }, []);
  const [unreadNotifications] = useState(4);
  const [cartData, setCartData] = useState({
    items: [],
    summary: { subtotal: 0, grand_total: 0, delivery_fee: 29, discount: 0 }
  });
  const [loadingCart, setLoadingCart] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [validationIssues, setValidationIssues] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const mockUserId = "11111111-1111-1111-1111-111111111111"; // Using a valid mock UUID since database expects UUID

  // Search autocomplete state from Day 1
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const res = await api.get(`/catalog/suggest?q=${encodeURIComponent(searchQuery)}`);
          setSuggestions(res.data?.data || []);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Error fetching suggestions", err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Load cart from backend
  const refreshCart = async () => {
    try {
      setLoadingCart(true);
      const res = await CartAPI.getCart();
      if (res.status === 'success' && res.data) {
        setCartData({
          cart: res.data.cart,
          items: res.data.items || [],
          stores: res.data.stores || [],
          summary: res.data.summary || { subtotal: 0, grand_total: 0, delivery_fee: 29, discount: 0 }
        });
      }
    } catch (err) {
      console.warn('Could not fetch cart from backend:', err.message);
    } finally {
      setLoadingCart(false);
    }
  };

  const refreshOrders = async () => {
    try {
      const res = await OrderAPI.getOrders();
      if (res.status === 'success' && res.data) {
        setOrdersList(res.data);
        if (res.data.length > 0 && !activeOrder) {
          setActiveOrder(res.data[0]);
        }
      }
    } catch (err) {
      console.warn('Could not fetch orders:', err.message);
    }
  };

  useEffect(() => {
    refreshCart();
    refreshWishlist();
    refreshOrders();
  }, []);

  const refreshWishlist = async () => {
    try {
      const res = await WishlistAPI.getWishlist(mockUserId);
      if (res.success) {
        setWishlist(res.wishlist || []);
      }
    } catch (err) {
      console.warn('Could not fetch wishlist:', err.message);
    }
  };

  const handleToggleWishlist = async (listingId) => {
    try {
      const isWishlisted = wishlist.includes(listingId);
      if (isWishlisted) {
        await WishlistAPI.removeItem(mockUserId, listingId);
        setWishlist(wishlist.filter(id => id !== listingId));
        showToast(`Removed from wishlist`);
      } else {
        await WishlistAPI.addItem(mockUserId, listingId);
        setWishlist([...wishlist, listingId]);
        showToast(`Added to wishlist`);
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      showToast('Error updating wishlist');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Place Order Handler (Checkout -> Orders transition)
  const handlePlaceOrder = async (orderPayload) => {
    try {
      setPlacingOrder(true);
      const res = await CheckoutAPI.placeOrder(orderPayload);
      if (res.status === 'success' && res.data) {
        setActiveOrder(res.data);
        await refreshCart();
        await refreshOrders();
        showToast('🎉 Order placed successfully! Tracking live dispatch...');
        setActiveTab('orders');
      } else {
        throw new Error(res.message || 'Failed to place order');
      }
    } catch (err) {
      showToast(`Order failed: ${err.message}`);
      throw err;
    } finally {
      setPlacingOrder(false);
    }
  };

  // Add sample item to cart
  const handleAddSampleItem = async (listingId = 'c0cae12d-82cb-4e14-82e0-aedd859a0179', name = 'Moong Dal 1kg') => {
    try {
      showToast(`Adding ${name} to cart...`);
      await CartAPI.addItem(listingId, 1);
      await refreshCart();
      showToast(`Added ${name}!`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Update item quantity (+ / -)
  const handleUpdateCartQty = async (itemId, delta) => {
    try {
      setValidationIssues([]);
      await CartAPI.updateItem(itemId, delta);
      await refreshCart();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Apply discount coupon
  const handleApplyCoupon = async (code) => {
    try {
      const res = await CartAPI.applyCoupon(code);
      await refreshCart();
      const saved = res.data?.summary?.discount || res.data?.discount || 0;
      showToast(saved > 0 ? `🎉 Saved ₹${saved} with ${code}!` : `Coupon ${code} applied`);
      return res.data;
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
      throw err;
    }
  };

  // Remove discount coupon
  const handleRemoveCoupon = async () => {
    try {
      await CartAPI.removeCoupon();
      await refreshCart();
      showToast('Coupon removed');
    } catch (err) {
      showToast(`Error: ${err.message}`);
      throw err;
    }
  };

  // Clear cart
  const handleClearCart = async () => {
    try {
      setValidationIssues([]);
      for (const item of cartData.items) {
        await CartAPI.removeItem(item.cart_item_id || item.id);
      }
      await refreshCart();
      showToast('Cart cleared');
    } catch (err) {
      showToast(`Error clearing cart: ${err.message}`);
    }
  };

  // Proceed to Checkout with live cart validation (Day 2 Frontend Task 3)
  const handleProceedToCheckout = async () => {
    try {
      setLoadingCart(true);
      const payload = {
        client_subtotal: Number(cartData.summary?.subtotal || 0),
        client_total: Number(cartData.summary?.grand_total || 0),
        client_items: (cartData.items || []).map((it) => ({
          listing_id: it.listing_id || it.id,
          name: it.product_name || it.name,
          price: Number(it.sell_price || it.price || 0),
          quantity: Number(it.quantity || 1)
        }))
      };

      const valRes = await CartAPI.validateCart(payload);
      const data = valRes?.data || {};
      const isValid = (data.is_valid ?? data.isValid) === true;
      const issues = data.issues || data.stock_issues || [];

      if (!isValid && issues.length > 0) {
        setValidationIssues(issues);
        const issueMsgs = issues.map((iss) => {
          const name = iss.name || iss.product_name || 'Item';
          if (iss.issue === 'OUT_OF_STOCK' || iss.type === 'OUT_OF_STOCK') {
            return `"${name}" is Out of Stock`;
          }
          if (iss.issue === 'INSUFFICIENT_STOCK' || iss.type === 'INSUFFICIENT_STOCK') {
            const avail = iss.available_stock ?? iss.available_quantity ?? 0;
            return `"${name}": only ${avail} available`;
          }
          if (iss.issue === 'PRICE_CHANGED' || iss.type === 'PRICE_CHANGED') {
            const newPrice = iss.current_price ?? iss.new_price ?? 0;
            return `"${name}" price changed to ₹${newPrice}`;
          }
          return iss.message || 'Cart item update needed';
        });

        showToast(`⚠️ Cannot proceed: ${issueMsgs.slice(0, 2).join('. ')}`);
        await refreshCart();
        return false;
      }

      // Valid: clear issues and navigate to checkout
      setValidationIssues([]);
      setActiveTab('checkout');
      return true;
    } catch (err) {
      console.warn('Cart validation check warning:', err.message);
      showToast(`⚠️ Validation check warning: ${err.message}`);
      return false;
    } finally {
      setLoadingCart(false);
    }
  };

  const totalItemCount = cartData.items.reduce((acc, it) => acc + Number(it.quantity), 0);
  const grandTotal = cartData.summary?.grand_total || cartData.summary?.subtotal || 0;

  // Calculate distinct stores in cart
  const storeNames = [...new Set(cartData.items.map(it => it.store_name || it.store || 'ADAB Store'))];
  const displayStoreName = storeNames.length > 1
    ? `${storeNames.length} shops`
    : (storeNames[0] || 'View cart');

  return (
    <div className="min-h-screen bg-[#F6F9F6] text-[#0F172A] flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast" id="toast">
          {toastMessage}
        </div>
      )}

      {/* Website Top Navigation (shown on tablets/desktops >= 900px matching unified-customer-portal-demo.html) */}
      <header className="site-nav" id="siteNav">
        <div className="site-nav-inner">
          <button type="button" className="site-logo" onClick={() => setActiveTab('home')}>
            <i>A</i>ADAB
          </button>
          <nav className="site-links">
            <button
              type="button"
              className={`site-link ${activeTab === 'home' ? 'on' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Explore
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'stores' ? 'on' : ''}`}
              onClick={() => setActiveTab('stores')}
            >
              Shops
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'categories' ? 'on' : ''}`}
              onClick={() => setActiveTab('stores')}
            >
              Categories
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'offers' ? 'on' : ''}`}
              onClick={() => {
                showToast('Viewing available store coupons & discounts');
                setActiveTab('cart');
              }}
            >
              Offers
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'orders' ? 'on' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'account' ? 'on' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
          </nav>
          <div className="site-actions">
            <button
              type="button"
              className="site-btn"
              onClick={() => setActiveTab('search')}
              aria-label="Search"
            >
              <i className="fa-solid fa-magnifying-glass"></i>Search
            </button>
            <button
              type="button"
              className="site-btn"
              onClick={() => showToast(`ADAB Reward Points Balance: ${points.toLocaleString('en-IN')}`)}
            >
              <i className="fa-solid fa-star" style={{ color: '#F59E0B' }}></i>
              <span id="navPoints">{points.toLocaleString('en-IN')}</span>
            </button>
            <button
              type="button"
              className="site-btn"
              onClick={() => showToast('No unread notifications')}
              aria-label="Notifications"
            >
              <i className="fa-solid fa-bell"></i>
              {unreadNotifications > 0 && <span className="site-badge">{unreadNotifications}</span>}
            </button>
            <button
              type="button"
              className="site-btn"
              onClick={() => showToast('Signed in as Guest Customer')}
            >
              <i className="fa-solid fa-user"></i>
              <span id="navAuth">Sign In</span>
            </button>
            <button
              type="button"
              className="site-btn primary"
              onClick={() => setActiveTab('cart')}
            >
              <i className="fa-solid fa-cart-shopping"></i>Cart
              {totalItemCount > 0 && (
                <span className="site-badge" id="navCart">
                  {totalItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main App Header (Shown on Home) */}
      {activeTab === 'home' && (
        <header id="appHeader" className="app-header sticky top-0 z-40 text-white">
          <div className="page px-4 pt-4 pb-5">
            {/* Top Bar: Brand + Action Buttons (hidden on >=900px by CSS) */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-extrabold text-lg shadow-sm">
                  A
                </div>
                <div>
                  <div className="font-extrabold text-sm tracking-tight">ADAB</div>
                  <div className="text-[10px] text-green-100 font-semibold">{storeCount} local stores · Surat</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => showToast('Signed in as Guest Customer')}
                  className="glass px-2.5 h-9 rounded-full flex items-center gap-1.5 text-xs font-bold transition hover:bg-white/30 cursor-pointer"
                >
                  <i className="fa-solid fa-user"></i>
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast('No unread alerts')}
                  className="glass w-9 h-9 rounded-full flex items-center justify-center relative transition hover:bg-white/30 cursor-pointer"
                >
                  <i className="fa-solid fa-bell text-sm"></i>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-coral rounded-full text-[8px] font-bold flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('wishlist')}
                  className="glass w-9 h-9 rounded-full flex items-center justify-center relative transition hover:bg-white/30 cursor-pointer text-brand-coral"
                >
                  <i className="fa-solid fa-heart text-sm"></i>
                  {wishlist.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-coral text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => showToast(`ADAB Reward Points: ${points.toLocaleString('en-IN')}`)}
                  className="glass px-2.5 h-9 rounded-full flex items-center gap-1 text-xs font-bold transition hover:bg-white/30 cursor-pointer"
                >
                  <i className="fa-solid fa-star text-amber-300"></i>
                  <span>{points.toLocaleString('en-IN')}</span>
                </button>
              </div>
            </div>

            {/* Location Delivery Selector */}
            <button
              type="button"
              onClick={() => showToast(`Delivery zone verified: Surat Ring Road (${storeCount} stores connected)`)}
              className="flex items-center gap-2 mb-3 text-left w-full group cursor-pointer"
            >
              <i className="fa-solid fa-location-dot text-brand-coral text-base"></i>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-green-100 uppercase tracking-wider">
                  Deliver to
                </div>
                <div className="font-extrabold text-sm truncate flex items-center gap-1">
                  Home · Ring Road, Surat
                  <i className="fa-solid fa-chevron-down text-[9px] opacity-70 group-hover:translate-y-0.5 transition-transform"></i>
                </div>
              </div>
              <span className="delivery-pill shrink-0">
                <i className="fa-solid fa-bolt mr-1"></i>14–45 min
              </span>
            </button>

            {/* Hero Copy (shown on desktop >= 900px matching demo) */}
            <div className="hero-copy">
              <h1>
                Your neighbourhood shops,<br className="hidden md:block" /> delivered in minutes.
              </h1>
              <p>
                Groceries, dairy, fashion and more from {storeCount} trusted local stores in Surat — one cart, one delivery.
              </p>
            </div>

            {/* Search Input with autocomplete suggestions */}
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="search-pill w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 text-left text-gray-800 shadow-sm">
                <i className="fa-solid fa-magnifying-glass text-brand-green text-lg"></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search for fresh groceries, fashion, electronics..."
                  className="w-full bg-transparent border-none text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                    className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden text-gray-800">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(suggestion);
                        setShowSuggestions(false);
                        navigate(`/search?q=${encodeURIComponent(suggestion)}`);
                      }}
                      className="px-4 py-3 hover:bg-green-50 cursor-pointer text-sm font-semibold text-gray-700 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <i className="fa-solid fa-magnifying-glass text-gray-400 text-xs"></i>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}
            </form>

            {/* Hero Stats (shown on desktop >= 900px matching demo) */}
            <div className="hero-stats">
              <span>🏪 {storeCount} local stores</span>
              <span>⚡ 14–45 min delivery</span>
              <span>⭐ Earn rewards on every order</span>
              <span>🔒 Secure payments</span>
            </div>
          </div>
        </header>
      )}

      {/* Subpage Header (Shown on Cart/Checkout/Orders/Track/Other screens) */}
      {activeTab !== 'home' && activeTab !== 'search' && (
        <div id="subHeader" className="subpage-header">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'track') setActiveTab('orders');
              else if (activeTab === 'checkout') setActiveTab('cart');
              else setActiveTab('home');
            }}
            className="w-8 h-8 flex items-center justify-center -ml-1 text-gray-700 hover:text-black cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <h1 id="subHeaderTitle" className="font-extrabold text-base flex-1 capitalize">
            {activeTab === 'cart'
              ? 'Your Cart'
              : activeTab === 'checkout'
              ? 'Checkout'
              : activeTab === 'orders'
              ? 'Your Orders'
              : activeTab === 'track'
              ? 'Track Delivery'
              : activeTab === 'stores' || activeTab === 'browse'
              ? 'Browse Products'
              : activeTab.startsWith('product/')
              ? 'Product Details'
              : activeTab}
          </h1>
        </div>
      )}

      {/* Main Dynamic Content Area */}
      <main className="page px-4 pt-4 pb-28 flex-1">
        {/* Home Screen (Catalog, Deals, Stores, Trending by Mahi) */}
        {activeTab === 'home' && (
          <HomePage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
            onNavigate={(tab) => {
              if (tab === 'track') setActiveTab('track');
              else if (tab === 'stores') setActiveTab('stores');
              else if (tab.startsWith('search')) setActiveTab('search');
              else if (tab === 'cart') setActiveTab('cart');
              else if (tab === 'orders') setActiveTab('orders');
              else setActiveTab(tab);
            }}
          />
        )}

        {/* Real Search Screen */}
        {activeTab === 'search' && (
          <SearchPage 
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)} 
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
          />
        )}

        {/* Product Detail Page */}
        {activeTab.startsWith('product/') && (
          <ProductDetailPage 
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
          />
        )}

        {/* Stores / Browse Products Screen (Mahi's BrowsePage) */}
        {(activeTab === 'stores' || activeTab === 'browse') && (
          <BrowsePage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
          />
        )}

        {/* Wishlist Page */}
        {activeTab === 'wishlist' && (
          <WishlistPage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
          />
        )}

        {/* Account Page */}
        {activeTab === 'account' && (
          <AccountPage onNavigate={setActiveTab} />
        )}

        {/* Shopping Cart Screen (Task 3: sec-cart) */}
        {activeTab === 'cart' && (
          <CartView
            cartData={cartData}
            onUpdateQty={handleUpdateCartQty}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            onStartShopping={() => setActiveTab('home')}
            onProceedToCheckout={handleProceedToCheckout}
            validationIssues={validationIssues}
            onClearValidationIssues={() => setValidationIssues([])}
            loading={loadingCart}
          />
        )}

        {/* Checkout Screen (Task 4: sec-checkout) */}
        {activeTab === 'checkout' && (
          <CheckoutView
            cartData={cartData}
            onPlaceOrder={handlePlaceOrder}
            onBackToCart={() => setActiveTab('cart')}
            loading={placingOrder}
          />
        )}

        {/* Orders Screen (sec-orders) */}
        {activeTab === 'orders' && (
          <section id="sec-orders" className="pt-2 pb-4 space-y-3">
            {ordersList.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-brand-green mx-auto mb-3">
                  <i className="fa-solid fa-bag-shopping text-2xl"></i>
                </div>
                <h3 className="font-extrabold text-base text-gray-900 mb-1">No Orders Placed Yet</h3>
                <p className="text-xs text-gray-500 mb-4">Explore local stores to place your first order with fast delivery.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('stores')}
                  className="site-btn primary mx-auto"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              ordersList.map((order, idx) => {
                const storeName = order.seller_orders?.[0]?.store_name || order.seller_orders?.[0]?.seller_name || 'Shabbir Grocery Shop';
                const isLive = order.order_status === 'PLACED' || order.order_status === 'PROCESSING' || order.order_status === 'DISPATCHED';
                const orderNum = order.order_number || (order.id && order.id.slice(0, 8)) || `ORD-${idx + 1000}`;
                const dateStr = order.created_at
                  ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Recent';

                if (idx === 0 && isLive) {
                  return (
                    <div
                      key={order.id || idx}
                      className="border border-green-200 bg-green-50 rounded-2xl p-4 cursor-pointer hover:shadow-md transition"
                      onClick={() => {
                        setActiveOrder(order);
                        setActiveTab('track');
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-extrabold text-base text-gray-900">
                            #{orderNum}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {storeName} · ₹{parseFloat(order.grand_total).toFixed(2)}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-orange-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {order.order_status === 'PLACED' ? 'ON THE WAY' : order.order_status}
                        </span>
                      </div>
                      <div className="order-track-bar mb-2">
                        <div className="order-track-fill" style={{ width: '72%' }}></div>
                      </div>
                      <div className="text-xs text-brand-green font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-motorcycle"></i>
                        <span>Arriving in {order.eta_minutes || 18} min · Ramesh (Rider)</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={order.id || idx}
                    className="border border-gray-100 bg-white rounded-2xl p-4 shadow-sm hover:border-gray-200 transition cursor-pointer"
                    onClick={() => {
                      setActiveOrder(order);
                      setActiveTab('track');
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-sm text-gray-900">#{orderNum}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {storeName} · ₹{parseFloat(order.grand_total).toFixed(2)} · {dateStr}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        order.order_status === 'DELIVERED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.order_status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* Track Delivery Screen (sec-track) */}
        {activeTab === 'track' && (
          <section id="sec-track" className="pt-2 pb-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-3xl p-5 text-center shadow-sm">
              <div className="text-3xl font-extrabold text-brand-green">
                {activeOrder?.eta_minutes || 18} min
              </div>
              <div className="text-sm font-bold text-gray-800 mt-1">
                Ramesh is on the way with your order
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Order #{activeOrder?.order_number || (activeOrder?.id && activeOrder.id.slice(0, 8)) || (activeOrder?.order_id && activeOrder.order_id.slice(0, 8)) || 'ORD-9028'} · Dispatched instantly
              </div>
            </div>

            {/* Telemetry Tracking Visual */}
            <div className="bg-emerald-950 text-white rounded-3xl p-5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Live GPS Telemetry</span>
                </div>
                <span className="text-[11px] text-gray-300 font-semibold">Speed: 28 km/h</span>
              </div>
              <div className="py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm shrink-0">
                    <i className="fa-solid fa-store text-emerald-400"></i>
                  </div>
                  <div className="text-xs">
                    <div className="text-gray-400 text-[10px]">PICKUP STORE</div>
                    <div className="font-bold">{activeOrder?.seller_orders?.[0]?.store_name || activeOrder?.seller_orders?.[0]?.seller_name || 'Shabbir Grocery Shop'}</div>
                  </div>
                </div>
                <div className="ml-4 pl-4 border-l-2 border-dashed border-white/20 py-1 text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <i className="fa-solid fa-motorcycle"></i>
                  <span>Rider in transit via Vesu Main Road (1.2 km away)</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm shrink-0">
                    <i className="fa-solid fa-location-dot text-brand-coral"></i>
                  </div>
                  <div className="text-xs">
                    <div className="text-gray-400 text-[10px]">DELIVERY DESTINATION</div>
                    <div className="font-bold">{activeOrder?.shipping_address_line || activeOrder?.delivery_address?.address_line || activeOrder?.delivery_address || 'Vesu, Surat'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rider & Store Info */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="border border-gray-100 bg-white rounded-2xl p-3 shadow-sm">
                <div className="text-[11px] text-gray-500 font-medium">Rider</div>
                <div className="font-extrabold text-gray-900 mt-0.5">Ramesh</div>
              </div>
              <div className="border border-gray-100 bg-white rounded-2xl p-3 shadow-sm">
                <div className="text-[11px] text-gray-500 font-medium">Store</div>
                <div className="font-extrabold text-xs text-gray-900 mt-0.5 truncate">
                  {activeOrder?.seller_orders?.[0]?.store_name || activeOrder?.seller_orders?.[0]?.seller_name || 'Shabbir Grocery Shop'}
                </div>
              </div>
              <div className="border border-gray-100 bg-white rounded-2xl p-3 shadow-sm">
                <div className="text-[11px] text-gray-500 font-medium">Packages</div>
                <div className="font-extrabold text-gray-900 mt-0.5">
                  {activeOrder?.seller_orders?.length || activeOrder?.seller_orders_count || 1} pkg
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => showToast('Calling rider Ramesh (+91 98251 00213)...')}
              className="green-btn flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-phone"></i>
              <span>Call Rider</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800 py-2 cursor-pointer"
            >
              ← Back to Orders
            </button>
          </section>
        )}

        {/* Other Tab Placeholders */}
        {activeTab !== 'home' &&
          activeTab !== 'cart' &&
          activeTab !== 'checkout' &&
          activeTab !== 'orders' &&
          activeTab !== 'track' &&
          activeTab !== 'search' &&
          activeTab !== 'stores' &&
          activeTab !== 'browse' &&
          activeTab !== 'wishlist' &&
          activeTab !== 'account' &&
          !activeTab.startsWith('product/') && (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-200">
              <h2 className="font-extrabold text-lg capitalize">{activeTab} Section</h2>
              <p className="text-xs text-gray-500 mt-1">Ready for upcoming roadmap screens.</p>
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="green-btn !py-2.5 !w-auto px-5 text-xs font-bold mt-4 cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          )}
      </main>

      {/* Website Footer (Desktop >= 900px matching unified-customer-portal-demo.html) */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <h4 style={{ fontSize: '18px' }}>ADAB</h4>
            <p style={{ fontSize: '13px', lineHeight: '1.7', maxWidth: '320px' }}>
              Your local stores, one place. Supporting neighbourhood businesses across Surat with fast, reliable delivery.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <a onClick={() => setActiveTab('stores')}>All shops</a>
            <a onClick={() => setActiveTab('stores')}>Categories</a>
            <a onClick={() => {
              showToast('Viewing offers & coupons');
              setActiveTab('cart');
            }}>Offers</a>
          </div>
          <div>
            <h4>Account</h4>
            <a onClick={() => setActiveTab('orders')}>My orders</a>
            <a onClick={() => showToast('Wallet balance: ₹0')}>Wallet</a>
            <a onClick={() => showToast(`Rewards Points: ${points}`)}>Rewards</a>
          </div>
          <div>
            <h4>Support</h4>
            <a onClick={() => showToast('Help centre: support@adab.shop')}>Help centre</a>
            <a onClick={() => showToast('Frequently asked questions')}>FAQs</a>
            <a onClick={() => showToast('Returns & refund policy')}>Returns</a>
          </div>
          <div className="copy">
            © 2026 ADAB · Surat, Gujarat · Made for local businesses
          </div>
        </div>
      </footer>

      {/* Floating Cart Bar (Task 2) */}
      {activeTab !== 'cart' && activeTab !== 'checkout' && (
        <FloatingCartBar
          itemCount={totalItemCount}
          totalPrice={grandTotal}
          storeName={displayStoreName}
          onOpenCart={() => setActiveTab('cart')}
        />
      )}

      {/* Bottom Navigation matching unified-customer-portal-demo.html */}
      <nav className="bottom-nav">
        <div className="page flex justify-around py-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`nav-tab flex flex-col items-center gap-0.5 py-1.5 px-3 cursor-pointer ${
              activeTab === 'home' ? 'nav-tab-on' : 'nav-tab-off'
            }`}
          >
            <i className="fa-solid fa-compass text-[22px]"></i>
            <span className="text-[10px] font-bold">Explore</span>
            <span className="nav-dot"></span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={`nav-tab flex flex-col items-center gap-0.5 py-1.5 px-3 cursor-pointer ${
              activeTab === 'stores' ? 'nav-tab-on' : 'nav-tab-off'
            }`}
          >
            <i className="fa-solid fa-store text-[22px]"></i>
            <span className="text-[10px] font-bold">Shops</span>
            <span className="nav-dot"></span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`nav-tab flex flex-col items-center gap-0.5 py-1.5 px-3 relative cursor-pointer ${
              activeTab === 'orders' ? 'nav-tab-on' : 'nav-tab-off'
            }`}
          >
            <i className="fa-solid fa-bag-shopping text-[22px]"></i>
            <span className="text-[10px] font-bold">Orders</span>
            <span className="nav-dot"></span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-brand-coral rounded-full"></span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`nav-tab flex flex-col items-center gap-0.5 py-1.5 px-3 cursor-pointer ${
              activeTab === 'account' ? 'nav-tab-on' : 'nav-tab-off'
            }`}
          >
            <i className="fa-solid fa-circle-user text-[22px]"></i>
            <span className="text-[10px] font-bold">You</span>
            <span className="nav-dot"></span>
          </button>
        </div>
      </nav>
    </div>
  );
}
