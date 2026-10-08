import apiClient from './client';

export const sellerApi = {
  // Orders Domain
  getOrders: () => apiClient.get('/orders'),
  updateOrderStatus: (orderId, status, driverId = null) => 
    apiClient.patch(`/orders/${orderId}/status`, { status, driverId }),
  
  // POS Domain
  checkoutPOS: (cart, paymentMethod, customerPhone) => 
    apiClient.post('/pos/sales', { cart, paymentMethod, customerPhone }),
    
  // Returns Domain
  getReturns: () => apiClient.get('/returns'),
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
  getNearbyCatalog: () => apiClient.get('/nearby-catalog'),
  getRecommendations: () => apiClient.get('/recommendations'),
  getMessages: () => apiClient.get('/messages'),

  // Finance (Credit Apply & Khata)
  getFinanceSummary: () => apiClient.get('/finance/summary'),
  getKhata: () => apiClient.get('/finance/khata'),
  submitCreditApply: (businessDetails) => apiClient.post('/finance/credit-apply', businessDetails)
};




