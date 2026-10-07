import apiClient from './client';

export const sellerApi = {
  // Orders Domain
  getOrders: () => apiClient.get('/v1/seller/orders'),
  updateOrderStatus: (orderId, status, driverId = null) => 
    apiClient.patch(`/v1/seller/orders/${orderId}/status`, { status, driverId }),
  
  // POS Domain
  checkoutPOS: (cart, paymentMethod, customerPhone) => 
    apiClient.post('/v1/seller/pos/sales', { cart, paymentMethod, customerPhone }),
    
  // Returns Domain
  getReturns: () => apiClient.get('/v1/seller/returns'),
  processReturn: (orderId, items, reason, refundType) =>
    apiClient.post('/v1/seller/returns', { orderId, items, reason, refundType }),
    
  // Fulfillment / Store
  getProducts: () => apiClient.get('/v1/seller/inventory'),
  addProduct: (productData) => apiClient.post('/v1/seller/inventory', productData),
  
  // B2B Orders (Checkout Order to Wholesaler)
  getB2BOrders: () => apiClient.get('/v1/seller/b2b-orders'),
  placeB2BOrder: (orderData) => apiClient.post('/v1/seller/buystock/purchase-orders', orderData),
  
  // Coupons & Offers
  getCoupons: () => apiClient.get('/v1/seller/coupons'),
  
  // Points & Loyalty
  getPoints: () => apiClient.get('/v1/seller/points'),
  
  // Analytics
  getAnalytics: () => apiClient.get('/v1/seller/analytics'),

  // Dynamic Catalog, Recommendations, Messages
  getNearbyCatalog: () => apiClient.get('/v1/seller/nearby-catalog'),
  getRecommendations: () => apiClient.get('/v1/seller/recommendations'),
  getMessages: () => apiClient.get('/v1/seller/messages'),

  // Finance (Credit Apply & Khata)
  getFinanceSummary: () => apiClient.get('/v1/seller/finance/summary'),
  getKhata: () => apiClient.get('/v1/seller/finance/khata'),
  submitCreditApply: (businessDetails) => apiClient.post('/v1/seller/finance/credit-apply', businessDetails)
};




