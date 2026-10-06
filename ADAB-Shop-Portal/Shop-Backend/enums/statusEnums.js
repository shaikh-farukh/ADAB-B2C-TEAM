// Canonical domain status enums for ADAB Seller
const OrderStatus = {
  NEW: 'new',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PROCESSING: 'processing',
  READY: 'ready',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const ShipmentStatus = {
  CREATED: 'CREATED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
};

const ReturnStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
};

const InventoryTransactionType = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  RESERVE: 'RESERVE',
  RELEASE: 'RELEASE',
  TRANSFER: 'TRANSFER',
};

module.exports = {
  OrderStatus,
  ShipmentStatus,
  ReturnStatus,
  InventoryTransactionType,
};
