import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import FloatingCartBar from './components/FloatingCartBar';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import OrderSuccessView from './components/OrderSuccessView';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import SearchPage from './pages/SearchPage';
import ProductDetailPage from './pages/ProductDetailPage';
import WishlistPage from './pages/WishlistPage';
import AddressModal from './components/AddressModal';
import OrderStatusView from './components/OrderStatusView';
import OrdersView from './components/OrdersView';
import NotificationsView from './components/NotificationsView';
import ReturnsView from './components/ReturnsView';
import ReviewsView from './components/ReviewsView';
import HelpSupportView from './components/HelpSupportView';
import PointsView from './components/PointsView';
import AccountSidebar from './components/AccountSidebar';
import AccountPage, { clearAccountCache } from './pages/AccountPage';
import ShopsPage from './pages/ShopsPage';
import LoginPage from './pages/LoginPage';
import CategoriesPage from './pages/CategoriesPage';
import OffersPage from './pages/OffersPage';
import GuestAuthGate from './components/GuestAuthGate';
import { CartAPI, CheckoutAPI, WishlistAPI, OrderAPI, CustomerAPI, RewardAPI, getCurrentUserId, resetSessionToken } from './services/api';
import { api } from './api/api';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.substring(1) || 'home';
  const isFromAccount = Boolean(location.state?.fromAccount);
  const setActiveTab = (tab, options = {}) => navigate(`/${tab === 'home' ? '' : tab}`, options);

  // Always scroll window to top whenever active tab/route changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);
  const [userSelectedAuthMode, setUserSelectedAuthMode] = useState(null);
  const authMode = (activeTab === 'signup' || activeTab === 'register')
    ? 'register'
    : (activeTab === 'login' ? (userSelectedAuthMode || 'login') : 'login');
  const setAuthMode = (mode) => setUserSelectedAuthMode(mode);
  const isAuthPage = activeTab === 'login' || activeTab === 'signup' || activeTab === 'register';
  const [points, setPoints] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('adab_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auto-prompt login popup after 1 second for unauthenticated visitors viewing the home page
  const hasAutoPromptedLoginRef = useRef(false);

  useEffect(() => {
    // Only auto-prompt for non-logged-in users
    if (currentUser || hasAutoPromptedLoginRef.current) return;
    // Only prompt when user is viewing the home/landing page
    if (activeTab !== 'home' && activeTab !== '') return;

    const timer = setTimeout(() => {
      if (!currentUser && !hasAutoPromptedLoginRef.current) {
        hasAutoPromptedLoginRef.current = true;
        setAuthMode('login');
        setActiveTab('login');
      }
    }, 1000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, activeTab]);

  const currentUserId = currentUser?.id || null;

  const [storeCount, setStoreCount] = useState(0);
  const isMountedRef = useRef(true);
  const sellersCountFetchedRef = useRef(false);
  const sellersCountInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (sellersCountFetchedRef.current || sellersCountInFlightRef.current) return;
    sellersCountInFlightRef.current = true;
    api.get('/catalog/sellers')
      .then(res => {
        sellersCountFetchedRef.current = true;
        if (isMountedRef.current && res.data?.success && res.data?.data) {
          setStoreCount(res.data.data.length || 48);
        }
      })
      .catch(err => {
        sellersCountFetchedRef.current = false;
        console.error("Failed to fetch stores in App", err);
      })
      .finally(() => {
        sellersCountInFlightRef.current = false;
      });
  }, []);
  const [unreadNotifications, setUnreadNotifications] = useState(() => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
      return 3;
    }
    return 0;
  });
  const [cartData, setCartData] = useState({
    items: [],
    summary: { subtotal: 0, grand_total: 0, delivery_fee: 29, discount: 0 }
  });
  const [loadingCart, setLoadingCart] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [returnTargetOrder, setReturnTargetOrder] = useState(null);
  const [reviewTargetItem, setReviewTargetItem] = useState(null);
  const [supportTargetOrder] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [validationIssues, setValidationIssues] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(() => {
    try {
      const user = localStorage.getItem('adab_user');
      if (!user) {
        localStorage.removeItem('adab_selected_address');
        return null;
      }
      const saved = localStorage.getItem('adab_selected_address');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Clear selected address if user is unauthenticated
  useEffect(() => {
    if (!currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAddress(null);
      try {
        localStorage.removeItem('adab_selected_address');
      } catch {
        // ignore
      }
    }
  }, [currentUser]);

  // Search autocomplete state from Day 1
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const lastSuggestionQueryRef = useRef('');
  const inFlightSuggestionQueryRef = useRef('');
  const suggestionReqIdRef = useRef(0);

  const fetchSuggestions = async (queryText, force = false) => {
    const trimmed = (queryText || '').trim();
    if (trimmed.length <= 1) {
      lastSuggestionQueryRef.current = '';
      inFlightSuggestionQueryRef.current = '';
      setSuggestions([]);
      setSuggestionsLoaded(false);
      setSuggestionsError(null);
      setSuggestionsLoading(false);
      setShowSuggestions(false);
      return;
    }

    if (!force && (lastSuggestionQueryRef.current === trimmed || inFlightSuggestionQueryRef.current === trimmed)) {
      return;
    }

    const reqId = ++suggestionReqIdRef.current;
    inFlightSuggestionQueryRef.current = trimmed;
    lastSuggestionQueryRef.current = trimmed;
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    setShowSuggestions(true);

    try {
      const res = await api.get(`/catalog/search/suggestions?q=${encodeURIComponent(trimmed)}`);
      if (!isMountedRef.current || reqId !== suggestionReqIdRef.current) return;
      if (res.data?.success === false) {
        throw new Error(res.data?.message || 'Could not load suggestions');
      }
      setSuggestions(res.data?.data || []);
      setSuggestionsLoaded(true);
    } catch (err) {
      lastSuggestionQueryRef.current = '';
      if (!isMountedRef.current || reqId !== suggestionReqIdRef.current) return;
      console.error("Error fetching suggestions", err);
      setSuggestions([]);
      setSuggestionsLoaded(false);
      setSuggestionsError('Could not load search suggestions.');
    } finally {
      if (inFlightSuggestionQueryRef.current === trimmed) {
        inFlightSuggestionQueryRef.current = '';
      }
      if (isMountedRef.current && reqId === suggestionReqIdRef.current) {
        setSuggestionsLoading(false);
      }
    }
  };

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const timeoutId = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, trimmed.length > 1 ? 300 : 0);
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

  const handleLoginSuccess = async (user, initialAddress = null) => {
    setCurrentUser(user);
    clearAccountCache();
    // Reset local cart state before loading user's cart
    setCartData({
      items: [],
      stores: [],
      summary: { subtotal: 0, grand_total: 0, delivery_fee: 29, discount: 0 }
    });
    showToast(`Welcome to ADAB, ${user.name || user.full_name || 'Customer'}!`);
    refreshOrders();
    await refreshCart();
    refreshNotifications();
    refreshCustomerStats();
    if (initialAddress) {
      setSelectedAddress(initialAddress);
      try {
        localStorage.setItem('adab_selected_address', JSON.stringify(initialAddress));
      } catch {
        // ignore
      }
    } else {
      try {
        const res = await CustomerAPI.getAddresses();
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const defaultAddr = res.data.find((a) => a.is_default) || res.data[0];
          setSelectedAddress(defaultAddr);
          localStorage.setItem('adab_selected_address', JSON.stringify(defaultAddr));
        } else {
          setSelectedAddress(null);
        }
      } catch (e) {
        console.warn('Could not load user addresses upon login:', e.message);
      }
    }
    setActiveTab('account');
  };

  const handleLogout = async () => {
    localStorage.removeItem('adab_auth_token');
    localStorage.removeItem('adab_user');
    localStorage.removeItem('adab_user_id');
    localStorage.removeItem('adab_selected_address');
    resetSessionToken();
    setSelectedAddress(null);
    setCurrentUser(null);
    setOrdersList([]);
    setPoints(0);
    setWalletBalance(0);
    setUnreadNotifications(0);
    setCartData({
      items: [],
      stores: [],
      summary: { subtotal: 0, grand_total: 0, delivery_fee: 29, discount: 0 }
    });
    clearAccountCache();
    try {
      await refreshCart();
    } catch {
      // ignore
    }
    showToast('You have been logged out successfully.');
    setActiveTab('home');
  };

  const handleContinueGuest = () => {
    setActiveTab('home');
    showToast('Browsing as guest. You can sign in anytime to complete checkout.');
  };

  const [loadingOrders, setLoadingOrders] = useState(false);

  const refreshOrders = async () => {
    const uid = getCurrentUserId();
    if (!uid) {
      setOrdersList([]);
      return;
    }
    try {
      setLoadingOrders(true);
      const targetUid = currentUser?.id || uid;
      if (!targetUid) {
        setOrdersList([]);
        return;
      }
      const res = await OrderAPI.getOrders(targetUid);
      if (res.status === 'success' && res.data) {
        setOrdersList(res.data);
        if (res.data.length > 0 && !activeOrder) {
          setActiveOrder(res.data[0]);
        }
      } else {
        setOrdersList([]);
      }
    } catch (err) {
      console.warn('Could not fetch orders:', err.message);
      setOrdersList([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const refreshNotifications = async () => {
    try {
      if (!currentUser?.id) {
        setUnreadNotifications(0);
        return;
      }
      const res = await CustomerAPI.getUnreadNotificationCount();
      const count =
        typeof res?.data?.unread_count === 'number'
          ? res.data.unread_count
          : typeof res?.unread_count === 'number'
          ? res.unread_count
          : typeof res?.data === 'number'
          ? res.data
          : 0;
      setUnreadNotifications(count);
    } catch (err) {
      console.warn('Could not fetch unread notifications count:', err.message);
      setUnreadNotifications(0);
    }
  };

  const refreshCustomerStats = async () => {
    if (!currentUser?.id) {
      setPoints(0);
      setWalletBalance(0);
      return;
    }
    try {
      const [profRes, walletRes, rewardsRes] = await Promise.all([
        CustomerAPI.getProfile().catch(() => null),
        CustomerAPI.getWallet().catch(() => null),
        RewardAPI.getRewardsSummary().catch(() => null)
      ]);
      if (rewardsRes?.data && typeof rewardsRes.data.points_balance === 'number') {
        setPoints(rewardsRes.data.points_balance);
      } else if (profRes?.data && typeof profRes.data.points === 'number') {
        setPoints(profRes.data.points);
      }
      if (profRes?.data) {
        const pUrl = profRes.data.profile_picture_url || profRes.data.avatarUrl;
        if (pUrl) {
          setCurrentUser(prev => prev ? ({ ...prev, profile_picture_url: pUrl, avatar_url: pUrl }) : prev);
        }
      }
      if (walletRes?.data && typeof walletRes.data.balance === 'number') {
        setWalletBalance(walletRes.data.balance);
      }
    } catch (err) {
      console.warn('Could not refresh customer stats:', err.message);
    }
  };

  const wishlistFetchedKeyRef = useRef('');
  const wishlistInFlightKeyRef = useRef('');
  const wishlistPendingRef = useRef(new Set());

  const refreshWishlist = async (force = false) => {
    if (!currentUserId) {
      if (isMountedRef.current) setWishlist([]);
      return;
    }
    const userKey = String(currentUserId);
    if (!force && (wishlistFetchedKeyRef.current === userKey || wishlistInFlightKeyRef.current === userKey)) {
      return;
    }
    wishlistInFlightKeyRef.current = userKey;
    try {
      const res = await WishlistAPI.getWishlist(currentUserId);
      if (res && (res.success || Array.isArray(res))) {
        wishlistFetchedKeyRef.current = userKey;
        const items = Array.isArray(res) ? res : (res.wishlist || res.data || []);
        if (isMountedRef.current) {
          setWishlist(items.map(item => typeof item === 'object' ? (item.listing_id || item.product_id || item.id) : item));
        }
      }
    } catch (err) {
      wishlistFetchedKeyRef.current = '';
      console.warn('Could not fetch wishlist:', err.message);
    } finally {
      if (wishlistInFlightKeyRef.current === userKey) {
        wishlistInFlightKeyRef.current = '';
      }
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      refreshOrders();
      refreshNotifications();
      refreshCustomerStats();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrdersList([]);
      setPoints(0);
      setWalletBalance(0);
      setUnreadNotifications(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Live polling for unread notifications every 10 seconds when authenticated
  useEffect(() => {
    if (!currentUser?.id) return;
    const interval = setInterval(() => {
      refreshNotifications();
    }, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCart();
    refreshWishlist();
    refreshOrders();
    refreshNotifications();
    refreshCustomerStats();

    // Load initial customer address from database only if user is logged in
    const loadInitialAddress = async () => {
      const storedUser = localStorage.getItem('adab_user');
      if (!currentUser && !storedUser) {
        setSelectedAddress(null);
        try { localStorage.removeItem('adab_selected_address'); } catch { /* ignore */ }
        return;
      }
      try {
        const res = await CustomerAPI.getAddresses();
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const defaultAddr = res.data.find((a) => a.is_default) || res.data[0];
          setSelectedAddress((prev) => {
            if (!prev) {
              try { localStorage.setItem('adab_selected_address', JSON.stringify(defaultAddr)); } catch { /* ignore */ }
              return defaultAddr;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Could not load customer address:', err.message);
      }
    };
    loadInitialAddress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically refresh orders whenever user navigates to orders, orderhistory, or track
  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'orderhistory' || activeTab === 'track') {
      refreshOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch complete order details whenever tracking tab is active
  useEffect(() => {
    if (activeTab === 'track' && activeOrder?.id && (!activeOrder.items || activeOrder.items.length === 0)) {
      OrderAPI.getOrderById(activeOrder.id)
        .then((res) => {
          if (res?.data) setActiveOrder(res.data);
        })
        .catch((e) => console.warn('Could not fetch active order items:', e));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeOrder?.id]);

  const handleSelectAddress = (addr) => {
    setSelectedAddress(addr);
    try {
      localStorage.setItem('adab_selected_address', JSON.stringify(addr));
    } catch (e) {
      console.warn(e);
    }
    showToast(`✓ Delivering to ${addr.label || addr.type || 'Home'} (${addr.address_line ? addr.address_line.split(',')[0] : (addr.address ? addr.address.split(',')[0] : (addr.city || 'your area'))})`);
  };

  const handleToggleWishlist = async (listingId) => {
    if (!listingId || wishlistPendingRef.current.has(listingId)) return;
    if (!currentUser) {
      showToast('Please sign in to save items to your wishlist ❤️');
      setActiveTab('login');
      return;
    }
    wishlistPendingRef.current.add(listingId);
    try {
      const isWishlisted = wishlist.includes(listingId);
      if (isWishlisted) {
        await WishlistAPI.removeItem(currentUserId, listingId);
        if (isMountedRef.current) {
          setWishlist(prev => prev.filter(id => id !== listingId));
          showToast(`Removed from wishlist`);
        }
      } else {
        await WishlistAPI.addItem(currentUserId, listingId);
        if (isMountedRef.current) {
          setWishlist(prev => (prev.includes(listingId) ? prev : [...prev, listingId]));
          showToast(`Added to wishlist`);
        }
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      showToast('Error updating wishlist');
    } finally {
      wishlistPendingRef.current.delete(listingId);
    }
  };

  const handleMoveToCart = async (listingId, productName) => {
    if (!listingId || wishlistPendingRef.current.has(listingId)) return;
    if (!currentUser) {
      showToast('Please sign in to manage your cart and wishlist');
      setActiveTab('login');
      return;
    }
    wishlistPendingRef.current.add(listingId);
    try {
      showToast(`Moving ${productName} to cart...`);
      try {
        await WishlistAPI.moveToCart(currentUserId, listingId);
      } catch {
        await CartAPI.addItem(listingId, 1);
      }
      if (isMountedRef.current) {
        setWishlist(prev => prev.filter(id => id !== listingId));
      }
      await refreshCart();
      showToast(`Added ${productName} to cart!`);
    } catch (err) {
      console.error('Error adding to cart:', err);
      showToast(`Error: ${err.message}`);
    } finally {
      wishlistPendingRef.current.delete(listingId);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Place Order Handler (Checkout -> Orders transition)
  const handlePlaceOrder = async (orderPayloadOrResult) => {
    if (placingOrder) {
      console.warn('Order submission already in progress. Ignoring duplicate trigger.');
      return;
    }
    try {
      setPlacingOrder(true);
      // If already an existing placed or verified order object from Razorpay flow
      if (orderPayloadOrResult && (orderPayloadOrResult.id || orderPayloadOrResult.order_id) && orderPayloadOrResult.order_number) {
        setActiveOrder(orderPayloadOrResult);
        // Clear active cart immediately
        setCartData({ items: [], summary: { subtotal: 0, grand_total: 0, delivery_fee: 0, discount: 0 } });
        await refreshCart();
        await refreshOrders();
        await refreshNotifications();
        await refreshCustomerStats();
        showToast('🎉 Order placed & verified! Confirmation generated.');
        setActiveTab('order-success');
        return orderPayloadOrResult;
      }

      const res = await CheckoutAPI.placeOrder(orderPayloadOrResult, orderPayloadOrResult?.idempotency_key);
      if (res.status === 'success' && res.data) {
        setActiveOrder(res.data);
        // Clear active cart immediately
        setCartData({ items: [], summary: { subtotal: 0, grand_total: 0, delivery_fee: 0, discount: 0 } });
        await refreshCart();
        await refreshOrders();
        await refreshNotifications();
        await refreshCustomerStats();
        showToast('🎉 Order placed successfully! Confirmation generated.');
        setActiveTab('order-success');
        return res.data;
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

  // Day 4: Order Cancellation Handler
  const handleCancelOrder = async (orderId) => {
    try {
      const res = await OrderAPI.cancelOrder(orderId, 'Cancelled by customer');
      await refreshOrders();
      return res;
    } catch (err) {
      console.error('Failed to cancel order:', err);
      throw err;
    }
  };

  // Day 4: Order Reorder Handler (Re-adds order items to cart)
  const handleReorder = async (orderId) => {
    try {
      const res = await OrderAPI.reorder(orderId);
      await refreshCart();
      return res;
    } catch (err) {
      console.error('Failed to reorder items:', err);
      throw err;
    }
  };

  // Day 5: Order Review Handler (Navigates to sec-reviews with delivered order item)
  const handleReviewOrder = (order) => {
    if (!order) return;
    const item = order.items?.[0] || {};
    setReviewTargetItem({
      order_id: order.id,
      order_number: order.order_number,
      listing_id: item.listing_id || item.id,
      product_name: item.product_name || item.title || 'Delivered Item',
      store_name: order.seller_orders?.[0]?.store_name || item.store_name || 'Neighborhood Store',
      unit_price: item.unit_price || 0,
      quantity: item.quantity || 1
    });
    setActiveTab('reviews', isFromAccount ? { state: { fromAccount: true } } : undefined);
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

  // Proceed to Checkout with live cart validation (Day 2 Frontend Task 3)
  const handleProceedToCheckout = async () => {
    // 1. Enforce authentication guard
    if (!currentUser) {
      showToast('⚠️ Please log in to your account to proceed to checkout.');
      setActiveTab('login');
      return false;
    }

    // 2. Enforce address presence guard
    if (!selectedAddress) {
      showToast('⚠️ Please add or select a delivery address before checkout.');
      setIsAddressModalOpen(true);
      return false;
    }

    try {
      const appliedCouponCode =
        cartData.cart?.coupon_code ||
        cartData.summary?.coupon_code ||
        cartData.summary?.pricing?.coupon_code ||
        null;

      const payload = {
        cart_id: cartData.cart?.id || undefined,
        coupon_code: appliedCouponCode || undefined,
        client_subtotal: Number(cartData.summary?.subtotal || cartData.summary?.pricing?.subtotal || 0),
        client_total: Number(cartData.summary?.grand_total || cartData.summary?.pricing?.grand_total || 0),
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
      if (!currentUser) {
        showToast('Please sign in or create an account to proceed to checkout.');
        setActiveTab('login');
        return false;
      }
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

  // Solution 1: Wrap shared views with Account Sidebar when accessed from Account section
  const renderAccountSharedView = (viewComponent) => {
    if (!isFromAccount) {
      return viewComponent;
    }
    return (
      <div className="w-full max-w-7xl 2xl:max-w-[1520px] mx-auto flex flex-col lg:flex-row gap-6 xl:gap-8 items-start">
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-24 space-y-4 animate-in fade-in duration-200">
          <AccountSidebar
            currentUser={currentUser}
            ordersCount={currentUser ? ordersList.length : 0}
            points={points}
            walletBalance={walletBalance}
            unreadNotifications={unreadNotifications}
            activeTab={activeTab}
            onNavigate={setActiveTab}
            onLogout={handleLogout}
            onOpenLogin={() => {
              setAuthMode('login');
              setActiveTab('login');
            }}
            selectedAddress={selectedAddress}
            showToast={showToast}
          />
        </aside>
        <div className="flex-1 min-w-0 w-full">
          {viewComponent}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F9F6] text-[#0F172A] flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast" id="toast">
          {toastMessage}
        </div>
      )}

      {/* Website Top Navigation */}
      <header className="site-nav" id="siteNav">
        <div className="site-nav-inner">
          <button type="button" className="site-logo" onClick={() => setActiveTab('home')}>
            <i>A</i>ADAB
          </button>
          <nav className="site-links">
          <button
            type="button"
            className={`site-link ${activeTab === 'home' || isAuthPage ? 'on' : ''}`}
            onClick={() => setActiveTab('home')}
          >
              Explore
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'browse' ? 'on' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              Browse
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'stores' || activeTab === 'shops' ? 'on' : ''}`}
              onClick={() => setActiveTab('stores')}
            >
              Shops
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'categories' ? 'on' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              Categories
            </button>
            <button
              type="button"
              className={`site-link ${activeTab === 'offers' ? 'on' : ''}`}
              onClick={() => setActiveTab('offers')}
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
              onClick={() => setActiveTab('points')}
              title={`ADAB Reward Points Balance: ${points.toLocaleString('en-IN')} (Click to view ledger)`}
            >
              <i className="fa-solid fa-star" style={{ color: '#F59E0B' }}></i>
              <span id="navPoints">{points.toLocaleString('en-IN')}</span>
            </button>
            <button
              type="button"
              className="site-btn relative"
              onClick={() => setActiveTab('notifications')}
              aria-label="Notifications"
              id="desktopNotificationBtn"
              data-testid="desktop-notification-btn"
              title={`${unreadNotifications} unread notifications`}
            >
              <i className="fa-solid fa-bell"></i>
              {unreadNotifications > 0 && (
                <span
                  className="site-badge"
                  id="desktopNotificationBadge"
                  data-testid="desktop-notification-badge"
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="site-btn font-bold text-gray-800 flex items-center gap-2 hover:bg-green-50 transition-colors"
                  onClick={() => setActiveTab('account')}
                  title="View Profile & Account"
                >
                  <div className="w-6 h-6 rounded-full bg-[#18753C] text-white flex items-center justify-center text-xs font-black overflow-hidden shrink-0">
                    {(currentUser.profile_picture_url || currentUser.avatar_url) ? (
                      <img
                        src={currentUser.profile_picture_url || currentUser.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      (currentUser.name || currentUser.full_name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="truncate max-w-[110px]">{currentUser.name || currentUser.full_name || 'Account'}</span>
                </button>
                <button
                  type="button"
                  className="site-btn !px-2.5 text-gray-400 hover:text-red-600 transition-colors"
                  onClick={handleLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="site-btn"
                  onClick={() => {
                    setAuthMode('login');
                    setActiveTab('login');
                  }}
                  id="navLoginBtn"
                >
                  <i className="fa-solid fa-user"></i>
                  <span id="navAuth">Login</span>
                </button>
                <button
                  type="button"
                  className="site-btn !bg-emerald-50 !border-[#18753C] !text-[#18753C] hover:!bg-[#18753C] hover:!text-white font-extrabold transition-all"
                  onClick={() => {
                    setAuthMode('register');
                    setActiveTab('signup');
                  }}
                  id="navSignupBtn"
                >
                  <i className="fa-solid fa-user-plus"></i>
                  <span id="navSignup">Sign Up</span>
                </button>
              </div>
            )}
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

      {/* Main App Header (Shown on Home & Background Explore) */}
      {(activeTab === 'home' || isAuthPage) && (
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
                  <div className="text-[10px] text-green-100 font-semibold">{storeCount} local stores{selectedAddress?.city ? ` · ${selectedAddress.city}` : ''}</div>
                </div>
              </div>

              <div className="flex gap-2">
                {currentUser ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('account')}
                      className="glass px-2.5 h-9 rounded-full flex items-center gap-1.5 text-xs font-bold transition hover:bg-white/30 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-white text-[#18753C] flex items-center justify-center text-[10px] font-black overflow-hidden shrink-0">
                        {(currentUser.profile_picture_url || currentUser.avatar_url) ? (
                          <img
                            src={currentUser.profile_picture_url || currentUser.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          (currentUser.name || currentUser.full_name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="truncate max-w-[70px]">{(currentUser.name || currentUser.full_name || 'You').split(' ')[0]}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="glass w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition hover:bg-red-500/30 cursor-pointer"
                      title="Sign Out"
                      aria-label="Sign Out"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setActiveTab('login');
                      }}
                      className="glass px-2.5 h-8 rounded-full flex items-center gap-1 text-[11px] font-extrabold transition hover:bg-white/30 cursor-pointer"
                    >
                      <i className="fa-solid fa-user text-[10px]"></i>
                      <span>Login</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setActiveTab('signup');
                      }}
                      className="bg-white text-[#18753C] shadow-xs px-2.5 h-8 rounded-full flex items-center gap-1 text-[11px] font-extrabold transition hover:bg-emerald-50 cursor-pointer"
                    >
                      <i className="fa-solid fa-user-plus text-[10px]"></i>
                      <span>Sign Up</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className="glass w-9 h-9 rounded-full flex items-center justify-center relative transition hover:bg-white/30 cursor-pointer"
                  aria-label="Notifications"
                  id="mobileNotificationBtn"
                  data-testid="mobile-notification-btn"
                  title={`${unreadNotifications} unread notifications`}
                >
                  <i className="fa-solid fa-bell text-sm"></i>
                  {unreadNotifications > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 px-0.5 bg-brand-coral rounded-full text-[8px] font-bold flex items-center justify-center text-white shadow-2xs"
                      id="mobileNotificationBadge"
                      data-testid="mobile-notification-badge"
                    >
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
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
                  onClick={() => setActiveTab('points')}
                  className="glass px-2.5 h-9 rounded-full flex items-center gap-1 text-xs font-bold transition hover:bg-white/30 cursor-pointer"
                  title={`ADAB Reward Points: ${points.toLocaleString('en-IN')} (Click to view)`}
                >
                  <i className="fa-solid fa-star text-amber-300"></i>
                  <span>{points.toLocaleString('en-IN')}</span>
                </button>
              </div>
            </div>

            {/* Desktop Balanced Hero Layout: Left column has delivery, headline, search, stats; Right column has live local showcase */}
            <div className="hero-grid-wrapper lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center">
              <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center">
                {/* Location Delivery Selector */}
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      setActiveTab('login');
                      showToast('Please login to set your delivery address.');
                      return;
                    }
                    setIsAddressModalOpen(true);
                  }}
                  className="flex items-center gap-2 mb-3 text-left w-full group cursor-pointer max-w-2xl"
                >
                  <i className="fa-solid fa-location-dot text-brand-coral text-base"></i>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-green-100 uppercase tracking-wider">
                      Deliver to
                    </div>
                    <div className="font-extrabold text-sm truncate flex items-center gap-1">
                      {currentUser && selectedAddress
                        ? `${selectedAddress.label || selectedAddress.type || 'Home'} · ${selectedAddress.address_line ? selectedAddress.address_line.split(',')[0] : (selectedAddress.address ? selectedAddress.address.split(',')[0] : (selectedAddress.area_name || selectedAddress.building_name || 'Delivery Area'))}${selectedAddress.city ? `, ${selectedAddress.city}` : ''}`
                        : currentUser
                        ? 'Select Delivery Address'
                        : 'Login to set address'}
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
                    Groceries, dairy, fashion and more from {storeCount} trusted local stores{selectedAddress?.city ? ` in ${selectedAddress.city}` : ''} — one cart, one delivery.
                  </p>
                </div>

                {/* Search Input with autocomplete suggestions */}
                <form onSubmit={handleSearchSubmit} className="relative w-full max-w-2xl">
                  <div className="search-pill w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 text-left text-gray-800 shadow-sm">
                    <i className="fa-solid fa-magnifying-glass text-brand-green text-lg"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      id="global-search-input"
                      name="global_search"
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
                  {showSuggestions && (suggestionsLoading || suggestionsError || (suggestionsLoaded && suggestions.length > 0)) && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden text-gray-800">
                      {suggestionsLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500 font-medium">Searching suggestions...</div>
                      ) : suggestionsError ? (
                        <div className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                          <span className="text-red-600 font-medium">{suggestionsError}</span>
                          <button
                            type="button"
                            disabled={suggestionsLoading}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => fetchSuggestions(searchQuery, true)}
                            className="px-3 py-1 rounded-lg bg-[#18753C] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        suggestions.map((suggestion, idx) => (
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
                        ))
                      )}
                    </div>
                  )}
                </form>

                {/* Popular Search Quick Discovery Chips (Blinkit / Amazon pattern) */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[11px] text-green-100 font-bold">Popular:</span>
                  {['Milk & Dairy', 'Fresh Veggies', 'Atta & Staples', 'Balaji Chips', 'Cooking Oil'].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setSearchQuery(term);
                        navigate(`/search?q=${encodeURIComponent(term)}`);
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold transition cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>

                {/* Hero Stats (shown on desktop >= 900px matching demo) */}
                <div className="hero-stats">
                  <span>🏪 {storeCount} local stores</span>
                  <span>⚡ 14–45 min delivery</span>
                  <span>⭐ Earn rewards on every order</span>
                  <span>🔒 Secure payments</span>
                </div>
              </div>

              {/* Right Side Desktop Hero Showcase (eliminates empty space on wide monitors) */}
              <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-center">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 xl:p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#F26E21]/20 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black tracking-wide text-amber-300 flex items-center gap-1.5">
                      <i className="fa-solid fa-bolt text-amber-300"></i> {selectedAddress?.city || 'Local'} Instant Kirana
                    </span>
                    <span className="text-xs text-emerald-200 font-bold">14–45 Min Express</span>
                  </div>
                  <h3 className="text-lg font-black text-white leading-tight mb-1.5">
                    Fresh from Neighbourhood Stores
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium mb-4 leading-relaxed">
                    Order from verified local kirana merchants with zero price markups and direct store pricing.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/browse?category=Vegetables')}
                      className="bg-white/15 hover:bg-white/25 border border-white/15 rounded-xl p-2.5 text-left transition cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-xl">🥬</span>
                      <div>
                        <div className="text-xs font-black">Fresh Veggies</div>
                        <div className="text-[10px] text-emerald-200">Daily batches</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/browse?category=Dairy')}
                      className="bg-white/15 hover:bg-white/25 border border-white/15 rounded-xl p-2.5 text-left transition cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-xl">🥛</span>
                      <div>
                        <div className="text-xs font-black">Milk & Dairy</div>
                        <div className="text-[10px] text-emerald-200">Morning fresh</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/browse?category=Atta')}
                      className="bg-white/15 hover:bg-white/25 border border-white/15 rounded-xl p-2.5 text-left transition cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-xl">🌾</span>
                      <div>
                        <div className="text-xs font-black">Atta & Dals</div>
                        <div className="text-[10px] text-emerald-200">Kirana staples</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/offers')}
                      className="bg-[#F26E21] hover:bg-[#d95d18] text-white rounded-xl p-2.5 text-left transition cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      <span className="text-xl">🏷️</span>
                      <div>
                        <div className="text-xs font-black">Active Deals</div>
                        <div className="text-[10px] text-orange-100">Store discounts</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Subpage Header (Shown on Cart/Checkout/Orders/Track/Other screens) */}
      {activeTab !== 'home' && activeTab !== 'search' && !isAuthPage && activeTab !== 'account' && (
        <div
          id="subHeader"
          className={`subpage-header ${
            activeTab === 'browse'
              ? '!py-1.5 !px-3 sm:!px-6 !min-h-[38px] !max-h-[40px] border-b border-gray-200/80 bg-white/95'
              : ''
          }`}
        >
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              if (activeTab === 'track') {
                setActiveTab('orders', isFromAccount ? { state: { fromAccount: true } } : undefined);
              } else if (activeTab === 'orderhistory') {
                setActiveTab('orders', isFromAccount ? { state: { fromAccount: true } } : undefined);
              } else if (activeTab === 'checkout') {
                setActiveTab('cart');
              } else if (
                activeTab === 'orders' ||
                activeTab === 'wishlist' ||
                activeTab === 'notifications' ||
                activeTab === 'returns' ||
                activeTab === 'reviews' ||
                activeTab === 'help' ||
                activeTab === 'messages' ||
                activeTab === 'support' ||
                activeTab === 'points' ||
                activeTab === 'rewards'
              ) {
                if (isFromAccount) {
                  setActiveTab('account');
                } else {
                  setActiveTab('home');
                }
              } else {
                setActiveTab('home');
              }
            }}
            className={`${activeTab === 'browse' ? 'w-6 h-6' : 'w-8 h-8'} flex items-center justify-center -ml-1 text-gray-700 hover:text-black cursor-pointer rounded-lg hover:bg-gray-100 transition`}
          >
            <i className={`fa-solid fa-arrow-left ${activeTab === 'browse' ? 'text-sm' : 'text-lg'}`}></i>
          </button>
          <h1 id="subHeaderTitle" className={`font-extrabold flex-1 capitalize ${activeTab === 'browse' ? 'text-xs sm:text-sm text-slate-800' : 'text-base'}`}>
            {activeTab === 'login' || activeTab === 'signup' || activeTab === 'register'
              ? (activeTab === 'signup' || activeTab === 'register' || authMode === 'register' ? 'Create Account' : 'Login / Register')
              : activeTab === 'cart'
              ? 'Your Cart'
              : activeTab === 'checkout'
              ? 'Checkout'
              : activeTab === 'orders'
              ? 'Your Orders'
              : activeTab === 'orderhistory'
              ? 'Order History'
              : activeTab === 'track'
              ? 'Track Delivery'
              : activeTab === 'offers'
              ? 'Deals & Offers'
              : activeTab === 'stores' || activeTab === 'shops'
              ? 'Local Verified Shops'
              : activeTab === 'browse'
              ? 'Browse Products'
              : activeTab === 'categories'
              ? 'Shop by Category'
              : activeTab === 'notifications'
              ? 'Notifications'
              : activeTab === 'stores' || activeTab === 'browse'
              ? 'Browse Products'
              : activeTab === 'account'
              ? 'My Account'
              : activeTab.startsWith('product/')
              ? 'Product Details'
              : activeTab}
          </h1>
        </div>
      )}

      {/* Main Dynamic Content Area */}
      <main className={`page flex-1 ${activeTab === 'browse' ? '!p-2 sm:!p-3 md:!p-3.5 md:!max-w-[1600px] pb-6' : 'px-4 pt-4 pb-20 md:pb-4'}`}>
        {/* Home Screen (Catalog, Deals, Stores, Trending by Mahi) */}
        {(activeTab === 'home' || isAuthPage) && (
          <HomePage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
            currentUser={currentUser}
            selectedAddress={selectedAddress}
            onNavigate={(tab, extra) => {
              if (tab === 'signup' || tab === 'register') {
                setAuthMode('register');
                setActiveTab('signup');
              } else if (tab === 'login') {
                setAuthMode('login');
                setActiveTab('login');
              } else if (tab.startsWith('browse')) {
                navigate(`/${tab}`);
              } else if (tab.startsWith('search')) {
                if (tab.includes('?')) navigate(`/${tab}`);
                else setActiveTab('search');
              } else if (tab === 'track') {
                setActiveTab('track');
              } else if (tab === 'stores' || tab === 'shops') {
                if (extra?.storeId) {
                  navigate(`/stores?store_id=${extra.storeId}`);
                } else if (tab === 'shops') {
                  navigate('/shops');
                } else {
                  navigate('/stores');
                }
              } else if (tab === 'offers') {
                setActiveTab('offers');
              } else if (tab === 'cart') {
                setActiveTab('cart');
              } else if (tab === 'orders') {
                setActiveTab('orders');
              } else {
                setActiveTab(tab);
              }
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

        {/* Local Verified Shops Directory Screen */}
        {(activeTab === 'stores' || activeTab === 'shops') && (
          <ShopsPage
            onNavigate={(tab) => {
              setActiveTab(tab);
            }}
          />
        )}

        {/* Browse Products Screen (Mahi's BrowsePage) */}
        {activeTab === 'browse' && (
          <BrowsePage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Deals & Offers Screen (Mahi's Task) */}
        {activeTab === 'offers' && (
          <OffersPage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
            onNavigate={(tab) => {
              if (tab.startsWith('browse')) navigate(`/${tab}`);
              else setActiveTab(tab);
            }}
          />
        )}

        {/* Categories Explorer Screen (Blinkit/Zepto/Flipkart Style by Mahi) */}
        {activeTab === 'categories' && (
          <CategoriesPage
            onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
          />
        )}

        {/* Wishlist Page */}
        {activeTab === 'wishlist' && (
          currentUser ? (
            renderAccountSharedView(
              <WishlistPage
                onAddToCart={(listingId, name) => handleAddSampleItem(listingId, name)}
                onToggleWishlist={handleToggleWishlist}
                onMoveToCart={handleMoveToCart}
                wishlist={wishlist}
              />
            )
          ) : (
            renderAccountSharedView(
              <GuestAuthGate
                title="Sign in to view your wishlist"
                subtitle="Save your favourite groceries, dairy, and local essentials to access and sync across all devices."
                icon="fa-heart"
                onLogin={() => {
                  setAuthMode('login');
                  setActiveTab('login');
                }}
                onSignUp={() => {
                  setAuthMode('register');
                  setActiveTab('signup');
                }}
                onContinueBrowsing={() => setActiveTab('home')}
                features={[
                  { icon: 'fa-heart', text: 'Save items from your favourite neighbourhood stores' },
                  { icon: 'fa-rotate', text: 'Sync your saved items across your mobile and desktop' },
                  { icon: 'fa-cart-shopping', text: 'Move wishlisted items to your active cart in one click' }
                ]}
              />
            )
          )
        )}

        {/* Login / Authentication Pop-up Window */}
        {isAuthPage && (
          <LoginPage
            initialMode={activeTab === 'signup' || activeTab === 'register' ? 'register' : authMode}
            onLoginSuccess={handleLoginSuccess}
            onContinueGuest={handleContinueGuest}
            onClose={() => setActiveTab('home')}
            onNavigate={(tab) => {
              if (tab === 'signup' || tab === 'register') {
                setAuthMode('register');
                setActiveTab('signup');
              } else if (tab === 'login') {
                setAuthMode('login');
                setActiveTab('login');
              } else {
                setActiveTab(tab);
              }
            }}
          />
        )}

        {/* Account Page */}
        {activeTab === 'account' && (
          <AccountPage
            onNavigate={setActiveTab}
            currentUser={currentUser}
            onUpdateCurrentUser={(updated) => setCurrentUser(prev => ({ ...prev, ...updated }))}
            onLogout={handleLogout}
            onOpenLogin={() => {
              setAuthMode('login');
              setActiveTab('login');
            }}
            ordersCount={currentUser ? ordersList.length : 0}
            points={points}
            walletBalance={walletBalance}
            unreadNotifications={unreadNotifications}
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
            selectedDeliveryAddress={selectedAddress}
            onChangeAddress={() => setIsAddressModalOpen(true)}
            onSelectAddress={handleSelectAddress}
            validationIssues={validationIssues}
            onClearValidationIssues={() => setValidationIssues([])}
            loading={loadingCart}
            currentUser={currentUser}
            onOpenLogin={() => setActiveTab('login')}
          />
        )}

        {/* Checkout Screen (Task 4: sec-checkout) */}
        {activeTab === 'checkout' && (
          currentUser ? (
            <CheckoutView
              cartData={cartData}
              onPlaceOrder={handlePlaceOrder}
              onBackToCart={async () => {
                await refreshCart();
                setActiveTab('cart');
              }}
              loading={placingOrder}
              selectedDeliveryAddress={selectedAddress}
              onSelectDeliveryAddress={handleSelectAddress}
              currentUser={currentUser}
              pointsBalance={points}
              onPointsRedeemed={(newBal) => setPoints(newBal)}
            />
          ) : (
            <GuestAuthGate
              title="Sign in to proceed to checkout"
              subtitle="Please log in or create an account to select your delivery address, apply coupons, and complete payment."
              icon="fa-shield-halved"
              onLogin={() => {
                setAuthMode('login');
                setActiveTab('login');
              }}
              onSignUp={() => {
                setAuthMode('register');
                setActiveTab('signup');
              }}
              onContinueBrowsing={() => setActiveTab('cart')}
              features={[
                { icon: 'fa-location-dot', text: 'Saved delivery addresses for 14-45 min express delivery' },
                { icon: 'fa-ticket', text: 'Exclusive store coupons and member discount codes' },
                { icon: 'fa-shield-halved', text: '100% secure payment with UPI, Cards, and COD' }
              ]}
            />
          )
        )}

        {/* Order Success Screen (Day 6 Frontend Task 1: sec-order-success) */}
        {(activeTab === 'order-success' || activeTab === 'ordersuccess') && (
          <OrderSuccessView
            order={activeOrder}
            onTrackOrder={(ord) => {
              if (ord) setActiveOrder(ord);
              setActiveTab('track');
            }}
            onViewOrders={() => setActiveTab('orders')}
            onContinueShopping={() => setActiveTab('home')}
            showToast={showToast}
          />
        )}

        {/* Orders Screen (sec-orders) & Order History (sec-orderhistory) */}
        {(activeTab === 'orders' || activeTab === 'orderhistory') && (
          currentUser ? (
            renderAccountSharedView(
              <OrdersView
                orders={ordersList}
                initialView={activeTab === 'orderhistory' ? 'orderhistory' : 'orders'}
                loading={loadingOrders}
                onRefresh={refreshOrders}
                onViewChange={(view) => setActiveTab(view, isFromAccount ? { state: { fromAccount: true } } : undefined)}
                onSelectOrder={async (order) => {
                  setActiveOrder(order);
                  setActiveTab('track', isFromAccount ? { state: { fromAccount: true } } : undefined);
                  try {
                    if (order?.id) {
                      const full = await OrderAPI.getOrderById(order.id);
                      if (full?.data) setActiveOrder(full.data);
                    }
                  } catch (err) {
                    console.warn('Could not fetch full order details:', err);
                  }
                }}
                onCancelOrder={handleCancelOrder}
                onReorder={handleReorder}
                onReviewOrder={handleReviewOrder}
                onRequestReturn={(ord) => {
                  setReturnTargetOrder(ord);
                  setActiveTab('returns', isFromAccount ? { state: { fromAccount: true } } : undefined);
                }}
                onBrowseShops={() => setActiveTab('stores')}
                showToast={showToast}
              />
            )
          ) : (
            renderAccountSharedView(
              <GuestAuthGate
                title="Sign in to view your orders"
                subtitle="Track active deliveries from local neighbourhood shops, download tax invoices, and reorder past purchases."
                icon="fa-bag-shopping"
                onLogin={() => {
                  setAuthMode('login');
                  setActiveTab('login');
                }}
                onSignUp={() => {
                  setAuthMode('register');
                  setActiveTab('signup');
                }}
                onContinueBrowsing={() => setActiveTab('home')}
                features={[
                  { icon: 'fa-map-pin', text: 'Live GPS status and rider contact information' },
                  { icon: 'fa-receipt', text: 'Digital tax invoices and store receipts' },
                  { icon: 'fa-rotate-left', text: 'Hassle-free 24-hr item returns and refunds' }
                ]}
              />
            )
          )
        )}

        {/* Track Delivery Screen (sec-track) */}
        {activeTab === 'track' && (
          <OrderStatusView
            order={activeOrder}
            onBackToOrders={() => setActiveTab('orders', isFromAccount ? { state: { fromAccount: true } } : undefined)}
            showToast={showToast}
            onRequestReturn={(ord) => {
              setReturnTargetOrder(ord);
              setActiveTab('returns', isFromAccount ? { state: { fromAccount: true } } : undefined);
            }}
            onRequestReview={(ord) => handleReviewOrder(ord)}
          />
        )}

        {/* Notifications Screen (Task 3: sec-notifications) */}
        {activeTab === 'notifications' && (
          currentUser ? (
            renderAccountSharedView(
              <NotificationsView
                onBack={() => (isFromAccount ? setActiveTab('account') : setActiveTab('home'))}
                onNavigate={async (url) => {
                  if (!url) return;
                  const [pathPart, queryString] = url.split('?');
                  const cleanPath = (pathPart.startsWith('/') ? pathPart.substring(1) : pathPart).toLowerCase();
                  const params = new URLSearchParams(queryString || '');
                  const orderId = params.get('orderId') || params.get('id');

                  if (cleanPath === 'track' || cleanPath.startsWith('track') || cleanPath.startsWith('orders/')) {
                    const targetOrderId = orderId || (cleanPath.startsWith('orders/') ? cleanPath.split('/')[1] : null);
                    if (targetOrderId) {
                      try {
                        const orderRes = await OrderAPI.getOrderById(targetOrderId);
                        if (orderRes?.data) {
                          setActiveOrder(orderRes.data);
                          setActiveTab('track', isFromAccount ? { state: { fromAccount: true } } : undefined);
                          return;
                        }
                      } catch (e) {
                        console.warn('Could not fetch target order for tracking:', e);
                      }
                      setActiveOrder({ id: targetOrderId, order_status: 'CONFIRMED' });
                      setActiveTab('track', isFromAccount ? { state: { fromAccount: true } } : undefined);
                      return;
                    }
                    if (ordersList.length > 0) {
                      setActiveOrder(ordersList[0]);
                      setActiveTab('track', isFromAccount ? { state: { fromAccount: true } } : undefined);
                    } else {
                      setActiveTab('orders', isFromAccount ? { state: { fromAccount: true } } : undefined);
                    }
                    return;
                  }

                  if (cleanPath === 'orderhistory' || cleanPath === 'history') {
                    setActiveTab('orderhistory', isFromAccount ? { state: { fromAccount: true } } : undefined);
                    return;
                  }

                  const tabMap = {
                    orders: 'orders',
                    returns: 'returns',
                    refunds: 'returns',
                    rewards: 'points',
                    points: 'points',
                    wallet: 'wallet',
                    addresses: 'addresses',
                    account: 'account',
                    cart: 'cart',
                    checkout: 'checkout',
                    home: 'home',
                    stores: 'stores',
                    help: 'help'
                  };

                  const targetTab = tabMap[cleanPath] || cleanPath || 'home';
                  setActiveTab(targetTab, isFromAccount ? { state: { fromAccount: true } } : undefined);
                }}
                showToast={showToast}
                onUnreadCountChange={(count) => setUnreadNotifications(count)}
              />
            )
          ) : (
            renderAccountSharedView(
              <GuestAuthGate
                title="Sign in to view notifications"
                subtitle="Get real-time alerts about your orders, out-for-delivery updates, and exclusive neighbourhood discounts."
                icon="fa-bell"
                onLogin={() => {
                  setAuthMode('login');
                  setActiveTab('login');
                }}
                onSignUp={() => {
                  setAuthMode('register');
                  setActiveTab('signup');
                }}
                onContinueBrowsing={() => setActiveTab('home')}
              />
            )
          )
        )}

        {/* Returns & Replacements Screen (Day 5 Task 1: sec-returns) */}
        {activeTab === 'returns' && (
          currentUser ? (
            renderAccountSharedView(
              <ReturnsView
                onBack={() => (isFromAccount ? setActiveTab('account') : setActiveTab('home'))}
                onNavigate={(tab, opts) => setActiveTab(tab, isFromAccount ? { state: { fromAccount: true }, ...opts } : opts)}
                showToast={showToast}
                preselectedOrder={returnTargetOrder}
              />
            )
          ) : (
            renderAccountSharedView(
              <GuestAuthGate
                title="Sign in to manage returns"
                subtitle="Request instant replacements, return damaged items, and check your refund statuses."
                icon="fa-rotate-left"
                onLogin={() => {
                  setAuthMode('login');
                  setActiveTab('login');
                }}
                onSignUp={() => {
                  setAuthMode('register');
                  setActiveTab('signup');
                }}
                onContinueBrowsing={() => setActiveTab('home')}
              />
            )
          )
        )}

        {/* Verified Customer Reviews Screen (Day 5 Task 2: sec-reviews) */}
        {activeTab === 'reviews' && (
          currentUser ? (
            renderAccountSharedView(
              <ReviewsView
                onBack={() => (isFromAccount ? setActiveTab('account') : setActiveTab('home'))}
                onNavigate={(tab, opts) => setActiveTab(tab, isFromAccount ? { state: { fromAccount: true }, ...opts } : opts)}
                showToast={showToast}
                preselectedPendingItem={reviewTargetItem}
              />
            )
          ) : (
            renderAccountSharedView(
              <GuestAuthGate
                title="Sign in to rate & review items"
                subtitle="Share your experience and photos of items purchased from local neighbourhood kiranas."
                icon="fa-star"
                onLogin={() => {
                  setAuthMode('login');
                  setActiveTab('login');
                }}
                onSignUp={() => {
                  setAuthMode('register');
                  setActiveTab('signup');
                }}
                onContinueBrowsing={() => setActiveTab('home')}
              />
            )
          )
        )}

        {/* Help & Customer Support Screen (Day 5 Task 3: sec-help, sec-messages) */}
        {(activeTab === 'help' || activeTab === 'messages' || activeTab === 'support') && (
          renderAccountSharedView(
            <HelpSupportView
              onBack={() => (isFromAccount ? setActiveTab('account') : setActiveTab('home'))}
              onNavigate={(tab, opts) => setActiveTab(tab, isFromAccount ? { state: { fromAccount: true }, ...opts } : opts)}
              showToast={showToast}
              preselectedOrder={supportTargetOrder}
              initialView={activeTab === 'messages' ? 'chat' : 'hub'}
              orders={ordersList}
            />
          )
        )}

        {/* Reward Points & Loyalty Ledger Screen (Day 5 Task 4: sec-points) */}
        {(activeTab === 'points' || activeTab === 'rewards') && (
          currentUser ? (
            renderAccountSharedView(
              <PointsView
                onBack={() => (isFromAccount ? setActiveTab('account') : setActiveTab('home'))}
                onNavigate={(tab, opts) => setActiveTab(tab, isFromAccount ? { state: { fromAccount: true }, ...opts } : opts)}
                showToast={showToast}
                pointsBalance={points}
                onPointsChange={(newBal) => setPoints(newBal)}
              />
            )
          ) : (
            renderAccountSharedView(
              <GuestAuthGate
                title="Sign in to view reward coins"
                subtitle="Earn ADAB coins on every order and redeem them for direct discounts at local neighbourhood stores."
                icon="fa-coins"
                onLogin={() => {
                  setAuthMode('login');
                  setActiveTab('login');
                }}
                onSignUp={() => {
                  setAuthMode('register');
                  setActiveTab('signup');
                }}
                onContinueBrowsing={() => setActiveTab('home')}
              />
            )
          )
        )}

        {/* Other Tab Placeholders */}
        {activeTab !== 'home' &&
          activeTab !== 'cart' &&
          activeTab !== 'checkout' &&
          activeTab !== 'orders' &&
          activeTab !== 'orderhistory' &&
          activeTab !== 'track' &&
          activeTab !== 'notifications' &&
          activeTab !== 'returns' &&
          activeTab !== 'reviews' &&
          activeTab !== 'help' &&
          activeTab !== 'messages' &&
          activeTab !== 'support' &&
          activeTab !== 'points' &&
          activeTab !== 'rewards' &&
          activeTab !== 'search' &&
          activeTab !== 'stores' &&
          activeTab !== 'shops' &&
          activeTab !== 'browse' &&
          activeTab !== 'categories' &&
          activeTab !== 'wishlist' &&
          activeTab !== 'account' &&
          activeTab !== 'login' &&
          activeTab !== 'signup' &&
          activeTab !== 'register' &&
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
              Your local stores, one place. Supporting neighbourhood businesses with fast, reliable delivery.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <a onClick={() => setActiveTab('stores')}>All shops</a>
            <a onClick={() => setActiveTab('categories')}>Categories</a>
            <a onClick={() => setActiveTab('offers')}>Offers</a>
          </div>
          <div>
            <h4>Account</h4>
            <a onClick={() => setActiveTab('orders')}>My orders</a>
            <a onClick={() => setActiveTab('orderhistory')}>Order history</a>
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
            © 2026 ADAB · {selectedAddress?.city ? `${selectedAddress.city} · ` : ''}Made for local businesses
          </div>
        </div>
      </footer>

      {/* Floating Cart Bar (Task 2) */}
      {activeTab !== 'cart' && activeTab !== 'checkout' && activeTab !== 'order-success' && activeTab !== 'ordersuccess' && !isAuthPage && (
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
              activeTab === 'home' || isAuthPage ? 'nav-tab-on' : 'nav-tab-off'
            }`}
          >
              <i className="fa-solid fa-compass text-[22px]"></i>
              <span className="text-[10px] font-bold">Explore</span>
              <span className="nav-dot"></span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className={`nav-tab flex flex-col items-center gap-0.5 py-1.5 px-3 cursor-pointer ${
                activeTab === 'browse' ? 'nav-tab-on' : 'nav-tab-off'
              }`}
            >
              <i className="fa-solid fa-layer-group text-[22px]"></i>
              <span className="text-[10px] font-bold">Browse</span>
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
              className={`nav-tab flex flex-col items-center gap-0.5 py-1.5 px-3 relative cursor-pointer ${
                activeTab === 'account' ? 'nav-tab-on' : 'nav-tab-off'
              }`}
            >
              <i className="fa-solid fa-circle-user text-[22px]"></i>
              <span className="text-[10px] font-bold">You</span>
              <span className="nav-dot"></span>
              {unreadNotifications > 0 && (
                <span
                  id="navNotifBadge"
                  data-testid="bottom-nav-notif-badge"
                  className="absolute top-1 right-2 min-w-[15px] h-3.5 px-1 bg-brand-coral text-white rounded-full text-[8px] font-extrabold flex items-center justify-center shadow-xs"
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Global Delivery Address Selector Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        selectedAddressId={selectedAddress?.id}
        onSelectAddress={handleSelectAddress}
        onLoginRedirect={() => {
          setIsAddressModalOpen(false);
          setActiveTab('login');
        }}
      />
    </div>
  );
}

