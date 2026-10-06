const sellerStore = require('../services/sellerStore');
const { OrderStatus, ReturnStatus } = require('../enums/statusEnums');

// === INVENTORY CONTROLLERS ===
exports.getInventory = async (req, res) => {
  try {
    const dbRows = await sellerStore.safeQuery('SELECT * FROM inventory ORDER BY updated_at DESC LIMIT 100');
    const data = (dbRows && dbRows.length > 0) ? dbRows : (await sellerStore.getInventory());
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const product = await sellerStore.addProduct(req.body);
    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getInventoryBySku = async (req, res) => {
  try {
    const { sku } = req.params;
    const dbRows = await sellerStore.safeQuery('SELECT * FROM inventory WHERE sku = $1', [sku]);
    const item = (dbRows && dbRows[0]) || (await sellerStore.getInventoryBySku(sku));
    if (!item) return res.status(404).json({ success: false, message: 'SKU not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.adjustInventory = async (req, res) => {
  try {
    const { sku, adjustment, reason } = req.body;
    if (!sku || adjustment === undefined) {
      return res.status(400).json({ success: false, message: 'sku and adjustment required' });
    }
    const updated = await sellerStore.adjustInventory(sku, adjustment, reason);
    if (!updated) return res.status(404).json({ success: false, message: 'SKU not found' });
    res.json({ success: true, message: 'Inventory adjusted', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const data = await sellerStore.getLowStock();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getInventoryHistory = async (req, res) => {
  try {
    const data = await sellerStore.getInventoryHistory();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getWarehouses = async (req, res) => {
  try {
    const dbRows = await sellerStore.safeQuery('SELECT * FROM warehouses LIMIT 50');
    const data = dbRows || (await sellerStore.getWarehouses());
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const wh = await sellerStore.createWarehouse(req.body);
    res.status(201).json({ success: true, data: wh });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const data = await sellerStore.getTransfers();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createTransfer = async (req, res) => {
  try {
    const t = await sellerStore.createTransfer(req.body);
    res.status(201).json({ success: true, data: t });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === ORDERS CONTROLLERS ===
exports.getOrders = async (req, res) => {
  try {
    const dbRows = await sellerStore.safeQuery('SELECT * FROM seller_orders ORDER BY created_at DESC LIMIT 100');
    const data = (dbRows && dbRows.length > 0) ? dbRows : (await sellerStore.getOrders());
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await sellerStore.getOrderById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await sellerStore.updateOrderStatus(id, OrderStatus.PROCESSING);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: `Order ${id} accepted`, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.packOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await sellerStore.updateOrderStatus(id, OrderStatus.READY);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: `Order ${id} packed and ready`, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.shipOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await sellerStore.updateOrderStatus(id, OrderStatus.SHIPPED);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: `Order ${id} shipped`, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await sellerStore.updateOrderStatus(id, OrderStatus.CANCELLED);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: `Order ${id} cancelled`, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === FULFILLMENT CONTROLLERS ===
exports.getShipments = async (req, res) => {
  try {
    const data = await sellerStore.getShipments();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getShipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const s = await sellerStore.getShipmentById(id);
    if (!s) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, data: s });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createShipment = async (req, res) => {
  try {
    const s = await sellerStore.createShipment(req.body);
    res.status(201).json({ success: true, data: s });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addTrackingEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { event } = req.body;
    const s = await sellerStore.addTrackingEvent(id, event || 'Updated status');
    res.json({ success: true, data: s });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === RETURNS CONTROLLERS ===
exports.getReturns = async (req, res) => {
  try {
    const data = await sellerStore.getReturns();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await sellerStore.getReturnById(id);
    if (!r) return res.status(404).json({ success: false, message: 'Return not found' });
    res.json({ success: true, data: r });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.approveReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await sellerStore.updateReturnStatus(id, ReturnStatus.APPROVED);
    res.json({ success: true, message: 'Return approved', data: r });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.rejectReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await sellerStore.updateReturnStatus(id, ReturnStatus.REJECTED);
    res.json({ success: true, message: 'Return rejected', data: r });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.completeReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await sellerStore.updateReturnStatus(id, ReturnStatus.COMPLETED);
    res.json({ success: true, message: 'Return completed and refund issued', data: r });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === FINANCE & SETTLEMENTS ===
exports.getFinanceSummary = async (req, res) => {
  try {
    const data = await sellerStore.getFinanceSummary();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSettlements = async (req, res) => {
  try {
    const data = await sellerStore.getSettlements();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.submitCreditApply = async (req, res) => {
  try {
    const data = await sellerStore.submitCreditApplication(req.body);
    res.status(201).json({ success: true, message: 'Credit application submitted', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === ANALYTICS ===
exports.getAnalytics = async (req, res) => {
  try {
    const data = await sellerStore.getAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === REVIEWS ===
exports.getReviews = async (req, res) => {
  try {
    const data = await sellerStore.getReviews();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.replyReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const data = await sellerStore.replyReview(id, reply);
    res.json({ success: true, message: 'Reply submitted', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === BUY STOCK / PURCHASE ORDERS ===
exports.getPurchaseOrders = async (req, res) => {
  try {
    const data = await sellerStore.getPurchaseOrders();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const data = await sellerStore.createPurchaseOrder(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === POS ===
exports.createPosSale = async (req, res) => {
  try {
    const data = await sellerStore.createPosSale(req.body);
    res.status(201).json({ success: true, message: 'POS Sale recorded', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// === NOTIFICATIONS ===
exports.getNotifications = async (req, res) => {
  try {
    const data = await sellerStore.getNotifications();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await sellerStore.markNotificationRead(id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
