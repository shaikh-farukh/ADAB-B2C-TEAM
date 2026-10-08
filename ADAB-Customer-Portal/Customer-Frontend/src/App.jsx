import { useState, useEffect } from 'react';
import './App.css';
import FloatingCartBar from './components/FloatingCartBar';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import { CartAPI, CheckoutAPI } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [points] = useState(2840);
  const [unreadNotifications] = useState(4);
  const [cartData, setCartData] = useState({
    items: [],
    summary: { subtotal: 0, grand_total: 0, delivery_fee: 29, discount: 0 }
  });
  const [loadingCart, setLoadingCart] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [validationIssues, setValidationIssues] = useState([]);

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

  useEffect(() => {
    refreshCart();
  }, []);

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
            <i>A</i>ADAB Shop
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
              onClick={() => showToast('Guest profile active · Surat')}
            >
              Account
            </button>
          </nav>
          <div className="site-actions">
            <button
              type="button"
              className="site-btn"
              onClick={() => setActiveTab('stores')}
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
                  <div className="font-extrabold text-sm tracking-tight">ADAB Shop</div>
                  <div className="text-[10px] text-green-100 font-semibold">48 local stores · Surat</div>
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
              onClick={() => showToast('Delivery zone verified: Surat Ring Road (48 stores connected)')}
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
                Groceries, dairy, fashion and more from 48 trusted local stores in Surat — one cart, one delivery.
              </p>
            </div>

            {/* Search Pill */}
            <div
              onClick={() => setActiveTab('stores')}
              className="search-pill w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 text-left text-gray-800 cursor-pointer"
            >
              <i className="fa-solid fa-magnifying-glass text-brand-green text-lg"></i>
              <span className="text-gray-400 text-sm font-medium">Search shops, products, brands...</span>
            </div>

            {/* Hero Stats (shown on desktop >= 900px matching demo) */}
            <div className="hero-stats">
              <span>🏪 48 local stores</span>
              <span>⚡ 14–45 min delivery</span>
              <span>⭐ Earn rewards on every order</span>
              <span>🔒 Secure payments</span>
            </div>
          </div>
        </header>
      )}

      {/* Subpage Header (Shown on Cart/Checkout/Orders/Track/Other screens) */}
      {activeTab !== 'home' && (
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
              : activeTab}
          </h1>
          <button
            type="button"
            onClick={() => setActiveTab('cart')}
            className="relative w-9 h-9 flex items-center justify-center rounded-full bg-brand-light text-brand-green cursor-pointer"
          >
            <i className="fa-solid fa-cart-shopping"></i>
            {totalItemCount > 0 && (
              <span id="subCartBadge" className="absolute -top-1 -right-1 w-4 h-4 bg-brand-coral text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Main Dynamic Content Area */}
      <main className="page px-4 pt-4 pb-28 flex-1">
        {/* Home Screen (Catalog, Deals, Stores, Trending by Mahi) */}
        {activeTab === 'home' && (
          <HomePage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onNavigate={(tab) => {
              if (tab === 'track') setActiveTab('track');
              else if (tab === 'stores' || tab.startsWith('search')) setActiveTab('stores');
              else if (tab === 'cart') setActiveTab('cart');
              else if (tab === 'orders') setActiveTab('orders');
              else setActiveTab(tab);
            }}
          />
        )}

        {/* Stores / Browse Products Screen (Mahi's BrowsePage) */}
        {activeTab === 'stores' && (
          <BrowsePage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
          />
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
            {activeOrder ? (
              <div
                className="border border-green-200 bg-green-50 rounded-2xl p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => setActiveTab('track')}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-extrabold text-base text-gray-900">
                      #{activeOrder.order_number || (activeOrder.order_id && activeOrder.order_id.slice(0, 8)) || '9021'}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {activeOrder.seller_orders?.[0]?.seller_name || 'Shri Balaji Store'} · ₹{activeOrder.grand_total}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-orange-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {activeOrder.order_status === 'PLACED' ? 'ON THE WAY' : activeOrder.order_status}
                  </span>
                </div>
                <div className="order-track-bar mb-2">
                  <div className="order-track-fill" style={{ width: '72%' }}></div>
                </div>
                <div className="text-xs text-brand-green font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-motorcycle"></i>
                  <span>Arriving in {activeOrder.eta_minutes || 18} min · Ramesh (Rider)</span>
                </div>
              </div>
            ) : (
              <div
                className="border border-green-200 bg-green-50 rounded-2xl p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => setActiveTab('track')}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-extrabold text-base text-gray-900">#9021</div>
                    <div className="text-xs text-gray-600 mt-0.5">Shri Balaji Store · ₹840</div>
                  </div>
                  <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-1 rounded-full uppercase tracking-wider">
                    ON THE WAY
                  </span>
                </div>
                <div className="order-track-bar mb-2">
                  <div className="order-track-fill" style={{ width: '72%' }}></div>
                </div>
                <div className="text-xs text-brand-green font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-motorcycle"></i>
                  <span>Arriving in 18 min · Ramesh (Rider)</span>
                </div>
              </div>
            )}

            {/* Previous sample orders matching demo */}
            <div
              className="border border-gray-100 bg-white rounded-2xl p-4 shadow-sm hover:border-gray-200 transition cursor-pointer"
              onClick={() => setActiveTab('track')}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-extrabold text-sm text-gray-900">#9018</div>
                  <div className="text-xs text-gray-600 mt-0.5">Balaji Silk Kurti M · ₹899 · Shri Balaji</div>
                </div>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold">
                  PACKING
                </span>
              </div>
            </div>

            <div className="border border-gray-100 bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center text-xs">
              <div>
                <div className="font-extrabold text-gray-900">#9010</div>
                <div className="text-gray-500 mt-0.5">Yesterday · ₹560 · Delivered</div>
              </div>
              <button
                type="button"
                onClick={() => showToast('Reorder items added to cart')}
                className="text-brand-green font-bold text-xs border border-brand-green px-3 py-1.5 rounded-xl hover:bg-green-50 cursor-pointer"
              >
                Reorder
              </button>
            </div>

            <button
              type="button"
              onClick={() => showToast('Viewing past order history archive...')}
              className="w-full text-center text-brand-green font-bold text-sm py-2 hover:underline cursor-pointer"
            >
              View past orders →
            </button>
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
                Order #{activeOrder?.order_number || (activeOrder?.order_id && activeOrder.order_id.slice(0, 8)) || '9021'} · Dispatched instantly
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
                    <div className="font-bold">{activeOrder?.seller_orders?.[0]?.seller_name || 'Shri Balaji Supermarket'}</div>
                  </div>
                </div>
                <div className="ml-4 pl-4 border-l-2 border-dashed border-white/20 py-1 text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <i className="fa-solid fa-motorcycle"></i>
                  <span>Rider in transit via Ring Road Flyover (1.2 km away)</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm shrink-0">
                    <i className="fa-solid fa-location-dot text-brand-coral"></i>
                  </div>
                  <div className="text-xs">
                    <div className="text-gray-400 text-[10px]">DELIVERY DESTINATION</div>
                    <div className="font-bold">Flat 402, Green Valley Apt, Ring Road, Surat</div>
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
                  {activeOrder?.seller_orders?.[0]?.seller_name || 'Balaji Store'}
                </div>
              </div>
              <div className="border border-gray-100 bg-white rounded-2xl p-3 shadow-sm">
                <div className="text-[11px] text-gray-500 font-medium">Packages</div>
                <div className="font-extrabold text-gray-900 mt-0.5">
                  {activeOrder?.seller_orders_count || 1} pkg
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
          activeTab !== 'track' && (
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
            <h4 style={{ fontSize: '18px' }}>ADAB Shop</h4>
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
            © 2026 ADAB Shop · Surat, Gujarat · Made for local businesses
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
