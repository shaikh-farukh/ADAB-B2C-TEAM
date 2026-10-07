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
  processReturn: (orderId, items, reason, refundType) =>
    apiClient.post('/v1/seller/returns', { orderId, items, reason, refundType }),
    
  // Fulfillment / Store
  getProducts: () => apiClient.get('/v1/seller/inventory'),
  addProduct: (productData) => apiClient.post('/v1/seller/inventory', productData),
  
  // B2B Orders (Checkout Order to Wholesaler)
  placeB2BOrder: (orderData) => apiClient.post('/v1/seller/buystock/purchase-orders', orderData),
  
  // Finance (Credit Apply)
  getFinanceSummary: () => apiClient.get('/v1/seller/finance/summary'),
  submitCreditApply: (businessDetails) => apiClient.post('/v1/seller/finance/credit-apply', businessDetails)
};
