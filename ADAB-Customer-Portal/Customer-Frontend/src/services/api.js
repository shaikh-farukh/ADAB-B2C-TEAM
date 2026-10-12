/**
 * API client for ADAB Customer Portal
 * Connects to Customer-Backend on port 5002
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5002/api/v1';

// Get or initialize persistent session token for guest/logged-in cart
export function getSessionToken() {
  let token = localStorage.getItem('adab_session_token');
  if (!token) {
    token = 'session_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('adab_session_token', token);
  }
  return token;
}

const pendingRequests = new Map();

export async function apiRequest(endpoint, options = {}) {
  const sessionToken = getSessionToken();
  const headers = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
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
      return response.data; // axios already parses JSON, and our backend returns { success: true, data: ... } 
    })
    .catch((error) => {
      // Re-throw in the format the app expects
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
  getOrders: (userId) => apiRequest(userId ? `/customers/me/orders?customer_id=${userId}` : '/customers/me/orders'),
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

// Wishlist APIs
export const WishlistAPI = {
  getWishlist: (userId) => apiRequest(`/wishlist/${userId}`),
  addItem: (userId, listingId) =>
    apiRequest('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ userId, listingId })
    }),
  removeItem: (userId, listingId) =>
    apiRequest('/wishlist', {
      method: 'DELETE',
      body: JSON.stringify({ userId, listingId })
    }),
  moveToCart: (userId, listingId) => 
    apiRequest(`/wishlist/items/${listingId}/move-to-cart/${userId}`, {
      method: 'POST'
    })
};

// Customer Profile & Address APIs (Day 3 Backend Task 4)
export const CustomerAPI = {
  getProfile: () => apiRequest('/customers/me'),
  updateProfile: (profile) =>
    apiRequest('/customers/me', {
      method: 'PATCH',
      body: JSON.stringify(profile)
    }),
  getAddresses: () => apiRequest('/customers/me/addresses'),
  addAddress: (addressData) =>
    apiRequest('/customers/me/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData)
    }),
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

