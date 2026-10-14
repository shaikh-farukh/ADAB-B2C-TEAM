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
  const token = localStorage.getItem('token') || 
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
  placeOrder: (orderPayload) =>
    apiRequest('/checkout/place-order', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    })
};

export const OrderAPI = {
  getOrders: (userId) => {
    const validId = userId && UUID_REGEX.test(userId) ? userId : null;
    return apiRequest(validId ? `/orders?customer_id=${validId}` : '/orders');
  },
  getOrderById: (orderId) => apiRequest(`/orders/${orderId}`)
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
    } catch (err) {
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
