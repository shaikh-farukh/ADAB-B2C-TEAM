import apiClient from './client';

const buildIdempotencyHeaders = (actionKey) => {
  // 5-second bucket prevents accidental rapid duplicate dispatches or network retries from executing twice
  const bucket = Math.floor(Date.now() / 5000);
  return {
    headers: {
      'Idempotency-Key': `${actionKey}-${bucket}`
    }
  };
};

export const sellerApi = {
  // Auth & OTP Domain
  sendOtp: (payload) => apiClient.post('/auth/send-otp', payload),
  verifyOtp: (payload) => apiClient.post('/auth/verify-otp', payload),

  // Orders Domain
  getOrders: () => apiClient.get('/orders'),
  updateOrderStatus: (orderId, status, driverId = null) =>
    apiClient.patch(
      `/orders/${orderId}/status`,
      { status, driverId },
      buildIdempotencyHeaders(`order-${orderId}-${status}`)
    ),

  // POS Domain
  checkoutPOS: (cart, paymentMethod, customerPhone) =>
    apiClient.post('/pos/sales', { cart, paymentMethod, customerPhone }),

  // Returns Domain
  getReturns: () => apiClient.get('/returns'),
  updateReturnStatus: (returnId, status, rejectionReason = null) =>
    apiClient.patch(
      `/returns/${encodeURIComponent(returnId)}/status`,
      { status, rejectionReason },
      buildIdempotencyHeaders(`return-${returnId}-${status}`)
    ),
  processReturn: (orderId, items, reason, refundType) =>
    apiClient.post('/returns', { orderId, items, reason, refundType }),

  // Fulfillment / Store
  getProducts: () => apiClient.get('/inventory'),
  addProduct: (productData) => apiClient.post('/inventory', productData),

  // B2B Orders (Checkout Order to Wholesaler)
  getB2BOrders: () => apiClient.get('/b2b-orders'),
  placeB2BOrder: (orderData) => apiClient.post('/buystock/purchase-orders', orderData),

  // Coupons & Offers
  getCoupons: () => apiClient.get('/coupons'),

  // Points & Loyalty
  getPoints: () => apiClient.get('/points'),

  // Analytics
  getAnalytics: () => apiClient.get('/analytics'),

  // Dynamic Catalog, Recommendations, Messages
  getNearbyCatalog: (params) => apiClient.get('/nearby-catalog', { params }),
  getNearbyStores: (params) => apiClient.get('/nearby-stores', { params }),
  getBuyerCreditBalance: () => apiClient.get('/credit-balance'),
  getPurchaseOrders: () => apiClient.get('/purchase-orders'),
  getOtherStoreBrands: (params) => apiClient.get('/other-store-brands', { params }),
  addOtherStoreBrandToMyStore: (data) => apiClient.post('/other-store-brands/add-to-store', data),
  getMyAddedOtherStoreBrands: () => apiClient.get('/other-store-brands/my-added'),
  getRecommendations: () => apiClient.get('/recommendations'),
  getThreads: () => apiClient.get('/messages/threads'),
  getMessages: () => apiClient.get('/messages/threads'),
  getThreadMessages: (threadId) => apiClient.get(`/messages/threads/${threadId}`),
  sendThreadMessage: (threadId, content) => apiClient.post(`/messages/threads/${threadId}/messages`, { content }),
  markThreadRead: (threadId) => apiClient.post(`/messages/threads/${threadId}/read`, {}),

  // Finance (Summary, Transactions, Settlements, Withdrawal, Khata, Credit Apply)
  getFinanceSummary: () => apiClient.get('/finance/summary'),
  getFinanceTransactions: () => apiClient.get('/finance/transactions'),
  getFinanceSettlements: () => apiClient.get('/finance/settlements'),
  withdrawToBank: () =>
    apiClient.post('/finance/withdraw', {}, buildIdempotencyHeaders('finance-withdraw')),
  getKhata: () => apiClient.get('/finance/khata'),
  payKhataOrder: (poId) =>
    apiClient.post(
      `/finance/khata/${encodeURIComponent(poId)}/pay`,
      {},
      buildIdempotencyHeaders(`khata-pay-${poId}`)
    ),
  submitCreditApply: (businessDetails) => apiClient.post('/finance/credit-apply', businessDetails)
};




