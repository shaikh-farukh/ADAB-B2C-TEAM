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
  getOrders: (config) => apiClient.get('/orders', config),
  updateOrderStatus: (orderId, status, driverId = null) =>
    apiClient.patch(
      `/orders/${orderId}/status`,
      { status, driverId },
      buildIdempotencyHeaders(`order-${orderId}-${status}`)
    ),

  // POS Domain
  checkoutPOS: (cart, paymentMethod, customerPhone) =>
    apiClient.post('/pos/checkout-sale', { cart, paymentMethod, customerPhone }),

  // Returns Domain
  getReturns: (config) => apiClient.get('/returns', config),
  updateReturnStatus: (returnId, status, rejectionReason = null, ...rest) => {
    const body = { status, rejectionReason };
    if (rest.length > 0 && rest[0] !== null && rest[0] !== undefined) {
      body.refundAmount = rest[0];
    }
    return apiClient.patch(
      `/returns/${encodeURIComponent(returnId)}/status`,
      body,
      buildIdempotencyHeaders(`return-${returnId}-${status}`)
    );
  },
  processReturn: (orderId, items, reason, refundType) =>
    apiClient.post('/returns', { orderId, items, reason, refundType }),

  // Fulfillment / Store (Pointing to /listings with /inventory backwards-compatible alias)
  getProducts: (params) => apiClient.get('/listings', { params }),
  addProduct: (productData) => apiClient.post('/listings', productData),

  // B2B Orders (Checkout Order to Wholesaler & Store-to-Store)
  getB2BOrders: (config) => apiClient.get('/b2b-orders', config),
  updateB2BOrderStatus: (orderId, status, metadata = {}) =>
    apiClient.patch(
      `/b2b-orders/${encodeURIComponent(orderId)}/status`,
      { status, ...metadata },
      buildIdempotencyHeaders(`b2b-order-${orderId}-${status}`)
    ),
  placeB2BOrder: (orderData) => apiClient.post('/purchase-orders', orderData),

  // Coupons & Offers
  getCoupons: () => apiClient.get('/coupons'),

  // Points & Loyalty
  getPoints: () => apiClient.get('/points'),

  // Analytics
  getAnalytics: () => apiClient.get('/analytics'),

  // Dynamic Catalog, Recommendations, Messages
  getNearbyCatalog: (params) => apiClient.get('/nearby-catalog', { params }),
  getNearbyStores: (params) => apiClient.get('/nearby-stores', { params }),
  getBuyerCreditBalance: (config) => apiClient.get('/credit-balance', config),
  getPurchaseOrders: (params) => apiClient.get('/purchase-orders', { params }),
  createPurchaseOrder: (orderData) =>
    apiClient.post(
      '/purchase-orders',
      orderData,
      buildIdempotencyHeaders(`po-create-${Date.now()}`)
    ),
  getOtherStoreBrands: (params) => apiClient.get('/other-store-brands', { params }),
  addOtherStoreBrandToMyStore: (data) => apiClient.post('/other-store-brands/add-to-store', data),
  getMyAddedOtherStoreBrands: (config) => apiClient.get('/other-store-brands/my-added', config),
  getPurchasedBrandsReadyToPublish: () => apiClient.get('/other-store-brands/purchased-ready'),
  requestResaleStock: (data) => apiClient.post('/other-store-brands/request-stock', data),
  getIncomingResaleRequests: (config) => apiClient.get('/other-store-brands/incoming-requests', config),
  approveResaleRequest: (orderId) => apiClient.post(`/other-store-brands/requests/${orderId}/approve`),
  declineResaleRequest: (orderId, reason) => apiClient.post(`/other-store-brands/requests/${orderId}/decline`, { reason }),
  confirmAndPayResaleOrder: (orderId, paymentData) =>
    apiClient.post(
      `/other-store-brands/orders/${orderId}/confirm-pay`,
      paymentData,
      buildIdempotencyHeaders(`resale-pay-${orderId}`)
    ),
  toggleBlockResellerStore: (buyerStoreId, block) =>
    apiClient.post(`/other-store-brands/resellers/${buyerStoreId}/toggle-block`, { block }),
  getBrandDistributionAnalytics: (config) => apiClient.get('/brand-distribution-analytics', config),
  toggleListingB2B: (listingId) => apiClient.post(`/listings/${listingId}/toggle-b2b`),
  getRecommendations: () => apiClient.get('/recommendations'),
  getThreads: () => apiClient.get('/messages/threads'),
  getMessages: () => apiClient.get('/messages/threads'),
  getThreadMessages: (threadId) => apiClient.get(`/messages/threads/${threadId}/messages`),
  sendThreadMessage: (threadId, content) => apiClient.post(`/messages/threads/${threadId}/messages`, { content }),
  markThreadRead: (threadId) => apiClient.post(`/messages/threads/${threadId}/read`, {}),

  // Finance (Summary, Transactions, Settlements, Withdrawal, Khata, Credit Apply)
  getFinanceSummary: (config) => apiClient.get('/finance/financial-summary', config),
  getFinanceTransactions: (config) => apiClient.get('/finance/transactions', config),
  getFinanceSettlements: (config) => apiClient.get('/finance/settlements', config),
  withdrawToBank: () =>
    apiClient.post('/finance/withdraw', {}, buildIdempotencyHeaders('finance-withdraw')),
  getKhata: (config) => apiClient.get('/finance/khata-ledger', config),
  payKhataOrder: (poId) =>
    apiClient.post(
      `/finance/khata/${encodeURIComponent(poId)}/pay`,
      {},
      buildIdempotencyHeaders(`khata-pay-${poId}`)
    ),
  submitCreditApply: (businessDetails) => apiClient.post('/finance/credit-apply', businessDetails),
  getBankPartners: () => apiClient.get('/finance/bank-partners'),
  getCreditApplications: () => apiClient.get('/finance/credit-applications'),

  // National FMCG Master Catalog Domain
  getMasterCatalog: (params) => apiClient.get('/catalog/master', { params }),
  getMasterProductById: (id) => apiClient.get(`/catalog/${id}/product-details`),
  adoptMasterCatalogItem: (data) => apiClient.post('/catalog/adopt', data),
  orderRestockCases: (data) => apiClient.post('/catalog/restock', data),
  bulkOrderRestockCases: (data) => apiClient.post('/catalog/bulk-restock', data),

  // Store Credit Terms & Rules
  getCreditTerms: () => apiClient.get('/credit-terms'),
  updateCreditGiveTerms: (data) =>
    apiClient.put('/credit-terms/give', data, buildIdempotencyHeaders('credit-give')),
  updateCreditBuyLimits: (data) =>
    apiClient.put('/credit-terms/buy', data, buildIdempotencyHeaders('credit-buy'))
};




