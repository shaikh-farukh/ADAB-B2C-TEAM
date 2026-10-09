/**
 * API client for ADAB Customer Portal
 * Connects to Customer-Backend on port 5002
 */

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

export async function apiRequest(endpoint, options = {}) {
  const sessionToken = getSessionToken();
  const headers = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'API request failed');
    error.status = response.status;
    error.code = data.code || (data.data && data.data.coupon_status);
    error.details = data.data;
    throw error;
  }
  return data;
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
  getOrders: () => apiRequest('/orders'),
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
    })
};
