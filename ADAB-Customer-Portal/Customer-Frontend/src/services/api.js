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
  placeOrder: (orderPayload) =>
    apiRequest('/checkout/place-order', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    })
};

export const OrderAPI = {
  getOrders: (userId) => apiRequest(`/orders?customer_id=${userId}`),
  getOrderById: (orderId) => apiRequest(`/orders/${orderId}`)
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
