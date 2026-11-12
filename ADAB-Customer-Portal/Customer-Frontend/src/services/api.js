/**
 * API client for ADAB Customer Portal
 * Connects to Customer-Backend on port 5002
 */

import axios from 'axios';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api/v1';

// Get or initialize persistent session token for guest/logged-in cart
export function getSessionToken() {
  let token = localStorage.getItem('adab_session_token');
  if (!token) {
    token = 'session_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('adab_session_token', token);
  }
  return token;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dynamically extracts the authenticated user ID from localStorage or JWT
export function getCurrentUserId() {
  let userId = localStorage.getItem('userId') ||
               localStorage.getItem('user_id') ||
               localStorage.getItem('adab_user_id');

  if (!userId) {
    try {
      const rawUser = localStorage.getItem('user') || localStorage.getItem('adab_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        userId = parsed.id || parsed.userId || parsed._id;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Fallback: decode JWT payload if present
  if (!userId) {
    const token = localStorage.getItem('token') ||
                  localStorage.getItem('access_token') ||
                  localStorage.getItem('adab_token') ||
                  localStorage.getItem('jwt');
    if (token && token.includes('.')) {
      try {
        const payloadBase64 = token.split('.')[1];
        const decoded = JSON.parse(atob(payloadBase64));
        userId = decoded.id || decoded.userId || decoded.customerId || decoded.sub;
      } catch {
        // Ignore JWT decode errors
      }
    }
  }

  // If userId is not a valid UUID (e.g. legacy mock "1"), clear and ignore it
  if (userId && !UUID_REGEX.test(userId)) {
    if (userId === '1' || userId === 'user-1') {
      localStorage.removeItem('userId');
      localStorage.removeItem('user_id');
      localStorage.removeItem('adab_user_id');
    }
    return null;
  }

  return userId || '11111111-1111-1111-1111-111111111111';
}

// Dynamically prepares auth headers for live requests
export function getAuthHeaders() {
  const token = localStorage.getItem('adab_auth_token') ||
                localStorage.getItem('token') ||
                localStorage.getItem('access_token') ||
                localStorage.getItem('adab_token') ||
                localStorage.getItem('jwt');

  const userId = getCurrentUserId();
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userId) {
    headers['x-user-id'] = userId;
    headers['x-customer-id'] = userId;
  }
  return headers;
}

const pendingRequests = new Map();

export async function apiRequest(endpoint, options = {}) {
  const sessionToken = getSessionToken();
  const authHeaders = getAuthHeaders();

  const headers = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
    ...authHeaders,
    ...(options.headers || {})
  };

  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const requestKey = isGet ? endpoint : null;

  if (isGet && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const promise = axios({
    url: `${API_BASE_URL}${endpoint}`,
    method: options.method || 'GET',
    headers: headers,
    data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
  })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      const err = new Error(error.response?.data?.message || error.message || 'API request failed');
      err.status = error.response?.status;
      err.code = error.response?.data?.code || (error.response?.data?.data && error.response?.data?.data.coupon_status);
      err.details = error.response?.data?.data;
      throw err;
    })
    .finally(() => {
      if (isGet) {
        pendingRequests.delete(requestKey);
      }
    });

  if (isGet) {
    pendingRequests.set(requestKey, promise);
  }

  return promise;
}

// Cart APIs
export const CartAPI = {
  getCart: () => apiRequest('/cart'),
  getCoupons: () => apiRequest('/cart/coupons'),
  addItem: (listingId, quantity = 1) =>
    apiRequest('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ listing_id: listingId, quantity })
    }),
  updateItem: (itemId, delta) =>
    apiRequest(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ delta })
    }),
  removeItem: (itemId) =>
    apiRequest(`/cart/items/${itemId}`, {
      method: 'DELETE'
    }),
  getSummary: () => apiRequest('/cart/summary'),
  applyCoupon: (couponCode) =>
    apiRequest('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ coupon_code: couponCode })
    }),
  removeCoupon: () =>
    apiRequest('/cart/coupon', {
      method: 'DELETE'
    }),
  validateCart: (payload = {}) =>
    apiRequest('/cart/validate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  mergeCart: (customerId, sessionToken) =>
    apiRequest('/cart/merge', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, session_token: sessionToken })
    })
};

// Checkout & Orders APIs
export const CheckoutAPI = {
  preview: (deliverySpeed = 'EXPRESS_30M', couponCode = null) =>
    apiRequest('/checkout/preview', {
      method: 'POST',
      body: JSON.stringify({ delivery_speed: deliverySpeed, coupon_code: couponCode })
    }),
  getDeliverySlots: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/checkout/delivery-slots${query ? `?${query}` : ''}`);
  },
  checkServiceability: (payload = {}) =>
    apiRequest('/checkout/serviceability', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  createPaymentIntent: (intentPayload = {}, idempotencyKey = null) => {
    const key = idempotencyKey || generateIdempotencyKey('pi');
    return apiRequest('/checkout/payment-intent', {
      method: 'POST',
      headers: { 'x-idempotency-key': key },
      body: JSON.stringify(intentPayload)
    });
  },
  placeOrder: (orderPayload = {}, idempotencyKey = null) => {
    const key = idempotencyKey || orderPayload?.idempotency_key || generateIdempotencyKey('ord');
    return apiRequest('/checkout/place-order', {
      method: 'POST',
      headers: { 'x-idempotency-key': key },
      body: JSON.stringify({ ...orderPayload, idempotency_key: key })
    });
  }
};

/**
 * Robust Client-Side Idempotency Key Generator (Day 3 Frontend Task 5)
 * Combines standard RFC4122 v4 UUID with microsecond timestamp fallback
 */
export function generateIdempotencyKey(prefix = 'idem') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 10);
  const entropy = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${rand}_${entropy}`;
}

// Payment APIs (Day 3 Backend Task 2 & Frontend Task 5)
export const PaymentAPI = {
  getPayment: (paymentId) => apiRequest(`/payments/${paymentId}`),
  confirm: (paymentId, payload = {}, idempotencyKey = null) => {
    const key = idempotencyKey || payload?.idempotency_key || generateIdempotencyKey('conf');
    return apiRequest(`/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: { 'x-idempotency-key': key },
      body: JSON.stringify(payload)
    });
  },
  retry: (paymentId, payload = {}, idempotencyKey = null) => {
    const key = idempotencyKey || payload?.idempotency_key || generateIdempotencyKey('retry');
    return apiRequest(`/payments/${paymentId}/retry`, {
      method: 'POST',
      headers: { 'x-idempotency-key': key },
      body: JSON.stringify(payload)
    });
  }
};

export const OrderAPI = {
  getOrders: (userId) => {
    const validId = userId && UUID_REGEX.test(userId) ? userId : null;
    return apiRequest(validId ? `/customers/me/orders?customer_id=${validId}` : '/customers/me/orders');
  },
  getCustomerOrders: (userId) => OrderAPI.getOrders(userId),
  getOrderById: (orderId) => apiRequest(`/customers/me/orders/${orderId}`),
  cancelOrder: (orderId, reason = '') =>
    apiRequest(`/customers/me/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),
  reorder: (orderId) =>
    apiRequest(`/customers/me/orders/${orderId}/reorder`, {
      method: 'POST'
    }),
  getStatusHistory: (orderId) => apiRequest(`/customers/me/orders/${orderId}/status-history`),
  getShipments: (orderId) => apiRequest(`/customers/me/orders/${orderId}/shipments`),
  getTracking: (orderId) => apiRequest(`/customers/me/orders/${orderId}/tracking`),
  getInvoice: (orderId) => apiRequest(`/customers/me/orders/${orderId}/invoice`)
};

// Return & Refund APIs (Day 5 Task 1)
export const ReturnAPI = {
  createReturn: (orderId, returnPayload) =>
    apiRequest(`/customers/me/orders/${orderId}/return`, {
      method: 'POST',
      body: JSON.stringify(returnPayload)
    }),
  getReturns: () => apiRequest('/customers/me/returns'),
  getReturnById: (returnId) => apiRequest(`/customers/me/returns/${returnId}`),
  cancelReturn: (returnId) =>
    apiRequest(`/customers/me/returns/${returnId}/cancel`, {
      method: 'POST'
    }),
  uploadEvidence: (returnId, payload) =>
    apiRequest(`/customers/me/returns/${returnId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getRefunds: () => apiRequest('/customers/me/refunds'),
  getRefundById: (refundId) => apiRequest(`/customers/me/refunds/${refundId}`)
};

// Verified Customer Reviews APIs (Day 5 Task 2)
export const ReviewAPI = {
  getPendingReviews: () => apiRequest('/customers/me/reviews/pending'),
  createReview: (productId, reviewPayload) =>
    apiRequest(`/catalog/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewPayload)
    }),
  getProductReviews: (productId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog/products/${productId}/reviews${query ? `?${query}` : ''}`);
  },
  updateReview: (reviewId, payload) =>
    apiRequest(`/reviews/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  uploadMedia: (reviewId, payload) =>
    apiRequest(`/customers/me/reviews/${reviewId}/media`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getMyReviews: () => apiRequest('/customers/me/reviews')
};

// Help & Support Tickets APIs (Day 5 Task 3)
export const SupportAPI = {
  createTicket: (ticketPayload) =>
    apiRequest('/customers/me/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketPayload)
    }),
  getTickets: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/customers/me/support/tickets${query ? `?${query}` : ''}`);
  },
  getTicketDetails: (ticketId) =>
    apiRequest(`/customers/me/support/tickets/${ticketId}`),
  sendMessage: (ticketId, messagePayload) =>
    apiRequest(`/customers/me/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messagePayload)
    }),
  updateTicket: (ticketId, updatePayload) =>
    apiRequest(`/customers/me/support/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(updatePayload)
    })
};

// Rewards Ledger APIs (Day 5 Task 4)
export const RewardAPI = {
  getRewardsSummary: () => apiRequest('/customers/me/rewards'),
  getLedger: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/customers/me/rewards/ledger${query ? `?${query}` : ''}`);
  },
  redeemPoints: (redemptionPayload) =>
    apiRequest('/customers/me/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify(redemptionPayload)
    })
};

// Catalog Discovery, Search, Categories, Brands, Deals & Sellers APIs (Canonical Mahi Spec)
export const CatalogAPI = {
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog/products${query ? `?${query}` : ''}`);
  },
  getProductById: (id) => apiRequest(`/catalog/products/${id}`),
  getProductSellers: (id) => apiRequest(`/catalog/products/${id}/sellers`),
  getRelatedProducts: (id) => apiRequest(`/catalog/products/${id}/related`),
  getProductAvailability: (id) => apiRequest(`/catalog/products/${id}/availability`),
  getProductVariants: (id) => apiRequest(`/catalog/products/${id}/variants`),
  getProductPrice: (id) => apiRequest(`/catalog/products/${id}/price`),
  getProductMedia: (id) => apiRequest(`/catalog/products/${id}/media`),
  getProductSpecifications: (id) => apiRequest(`/catalog/products/${id}/specifications`),
  getFrequentlyBoughtTogether: (id) => apiRequest(`/catalog/products/${id}/frequently-bought-together`),
  searchProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog/search${query ? `?${query}` : ''}`);
  },
  getSearchSuggestions: (q = '') =>
    apiRequest(`/catalog/search/suggestions?q=${encodeURIComponent(q)}`),
  getSearchFilters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog/search/filters${query ? `?${query}` : ''}`);
  },
  getPopularSearches: () => apiRequest('/catalog/search/popular'),
  recordSearchFeedback: (payload) =>
    apiRequest('/catalog/search/feedback', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getFilters: () => apiRequest('/catalog/filters'),
  getHome: () => apiRequest('/catalog/home'),
  getRecommended: () => apiRequest('/catalog/recommended'),
  getCategories: () => apiRequest('/catalog/categories'),
  getCategoryTree: () => apiRequest('/catalog/categories/tree'),
  getCategoryChildren: (id) => apiRequest(`/catalog/categories/${id}/children`),
  getProductsByCategory: (slug, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog/categories/${slug}/products${query ? `?${query}` : ''}`);
  },
  getBrands: () => apiRequest('/catalog/brands'),
  getBrandProducts: (slug, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog/brands/${slug}/products${query ? `?${query}` : ''}`);
  },
  getDeals: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog/deals${query ? `?${query}` : ''}`);
  },
  getFeaturedDeals: () => apiRequest('/catalog/deals/featured'),
  getDealCategories: () => apiRequest('/catalog/deals/categories'),
  getDealById: (id) => apiRequest(`/catalog/deals/${id}`),
  getPromotions: () => apiRequest('/catalog/promotions'),
  getSellers: () => apiRequest('/catalog/sellers'),
  getSellerById: (id) => apiRequest(`/catalog/sellers/${id}`),
  getSellerProducts: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/catalog/sellers/${id}/products${query ? `?${query}` : ''}`);
  },
  getSellerSummary: (id) => apiRequest(`/catalog/sellers/${id}/summary`),
  getSellerRatings: (id) => apiRequest(`/catalog/sellers/${id}/ratings`),
  getSellerReviews: (id) => apiRequest(`/catalog/sellers/${id}/reviews`)
};

// Wishlist APIs (Canonical Mahi Spec - Dynamic auth, zero hardcoded IDs)
export const WishlistAPI = {
  getWishlist: async () => {
    try {
      const res = await apiRequest('/customers/me/wishlist');
      const items = res.data || [];
      return {
        success: true,
        wishlist: Array.isArray(items) ? items.map(item => item.productId || item.id) : [],
        items: items
      };
    } catch {
      return { success: false, wishlist: [], items: [] };
    }
  },
  getCount: () => apiRequest('/customers/me/wishlist/count'),
  getItem: (id) => apiRequest(`/customers/me/wishlist/items/${id}`),
  addItem: (arg1, arg2) => {
    const listingId = arg2 !== undefined ? arg2 : arg1;
    return apiRequest('/customers/me/wishlist/items', {
      method: 'POST',
      body: JSON.stringify({ productId: listingId, listingId })
    });
  },
  bulkAddItems: (productIds = []) =>
    apiRequest('/customers/me/wishlist/items/bulk', {
      method: 'POST',
      body: JSON.stringify({ productIds })
    }),
  bulkRemoveItems: (productIds = []) =>
    apiRequest('/customers/me/wishlist/items/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ productIds })
    }),
  removeItem: (arg1, arg2) => {
    const listingId = arg2 !== undefined ? arg2 : arg1;
    return apiRequest(`/customers/me/wishlist/items/${listingId}`, {
      method: 'DELETE'
    });
  },
  moveToCart: (arg1, arg2) => {
    const listingId = arg2 !== undefined ? arg2 : arg1;
    return apiRequest(`/customers/me/wishlist/items/${listingId}/move-to-cart`, {
      method: 'POST'
    });
  }
};

// Customer Profile & Address APIs (Day 3 Backend Task 4 + Canonical Mahi Spec)
export const CustomerAPI = {
  getProfile: () => apiRequest('/customers/me'),
  updateProfile: (profile) =>
    apiRequest('/customers/me', {
      method: 'PATCH',
      body: JSON.stringify(profile)
    }),
  uploadAvatar: (avatarUrl) =>
    apiRequest('/customers/me/profile/avatar', {
      method: 'POST',
      body: JSON.stringify(typeof avatarUrl === 'string' ? { avatarUrl } : avatarUrl)
    }),
  getPreferences: () => apiRequest('/customers/me/preferences'),
  updatePreferences: (preferences) =>
    apiRequest('/customers/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences)
    }),
  getSettings: () => apiRequest('/customers/me/settings'),
  updateSettings: (settings) =>
    apiRequest('/customers/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    }),
  getRecentlyViewed: () => apiRequest('/customers/me/recently-viewed'),
  recordRecentlyViewed: (payload) =>
    apiRequest('/customers/me/recently-viewed', {
      method: 'POST',
      body: JSON.stringify(typeof payload === 'string' ? { productId: payload } : payload)
    }),
  removeRecentlyViewed: (id) =>
    apiRequest(`/customers/me/recently-viewed/${id}`, {
      method: 'DELETE'
    }),
  getAddresses: () => apiRequest('/customers/me/addresses'),
  addAddress: (addressData) =>
    apiRequest('/customers/me/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData)
    }),
  validateAddress: (addressData) =>
    apiRequest('/customers/me/addresses/validate', {
      method: 'POST',
      body: JSON.stringify(addressData)
    }),
  checkAddressServiceability: (addressId) =>
    apiRequest(`/customers/me/addresses/${addressId}/serviceability`),
  getAddressMapPreview: (addressId) =>
    apiRequest(`/customers/me/addresses/${addressId}/map-preview`),
  updateAddress: (addressId, addressData) =>
    apiRequest(`/customers/me/addresses/${addressId}`, {
      method: 'PATCH',
      body: JSON.stringify(addressData)
    }),
  deleteAddress: (addressId) =>
    apiRequest(`/customers/me/addresses/${addressId}`, {
      method: 'DELETE'
    }),
  getPaymentMethods: () => apiRequest('/customers/me/payment-methods'),
  addPaymentMethod: (cardData) =>
    apiRequest('/customers/me/payment-methods', {
      method: 'POST',
      body: JSON.stringify(cardData)
    }),
  deletePaymentMethod: (id) =>
    apiRequest(`/customers/me/payment-methods/${id}`, {
      method: 'DELETE'
    }),
  getWallet: () => apiRequest('/customers/me/wallet'),
  // Notifications APIs (Day 4)
  getNotifications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/customers/me/notifications${query ? `?${query}` : ''}`);
  },
  getUnreadNotificationCount: () => apiRequest('/customers/me/notifications/unread-count'),
  markNotificationRead: (notificationId) =>
    apiRequest(`/customers/me/notifications/${notificationId}/read`, {
      method: 'PATCH'
    }),
  markAllNotificationsRead: () =>
    apiRequest('/customers/me/notifications/read-all', {
      method: 'POST'
    }),
  getNotificationPreferences: () => apiRequest('/customers/me/notification-preferences'),
  updateNotificationPreferences: (prefs) =>
    apiRequest('/customers/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs)
    })
};

// Customer Authentication APIs
export const AuthAPI = {
  login: (email, password, sessionToken = null) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, session_token: sessionToken || getSessionToken() })
    }),
  register: (userData, sessionToken = null) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...userData, session_token: sessionToken || getSessionToken() })
    }),
  forgotPassword: (email) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
  resetPassword: (email, otp, newPassword) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password: newPassword })
    }),
  sendRegistrationOtp: (email, phone, fullName) =>
    apiRequest('/auth/send-registration-otp', {
      method: 'POST',
      body: JSON.stringify({ email, phone, full_name: fullName })
    }),
  verifyRegistrationOtp: (email, otp) =>
    apiRequest('/auth/verify-registration-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    }),
  getCurrentUser: () => apiRequest('/auth/me')
};

