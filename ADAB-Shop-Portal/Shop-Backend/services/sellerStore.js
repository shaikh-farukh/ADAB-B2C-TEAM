const pool = require('../db');
const { OrderStatus, ShipmentStatus, ReturnStatus, InventoryTransactionType } = require('../enums/statusEnums');

// Canonical mock seed data matching unified-one-portal-demo.html
let memoryInventory = [
  { id: 1, name: 'Tata Salt 1kg', sku: '8901001100123', category: 'Grocery', price: 28, mrp: 28, stock: 50, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 2, name: 'Loose Basmati Rice', sku: 'L-BAS-001', category: 'Grocery', price: 90, mrp: 110, stock: 480, reserved: 10, unit: 'kg', warehouseId: 'wh-1', status: 'active' },
  { id: 3, name: 'Balaji Silk Kurti', sku: 'BAL-KRT-001', category: 'Fashion', price: 899, mrp: 1299, stock: 84, reserved: 4, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 4, name: 'Shahi Paneer', sku: 'SH-PAN-001', category: 'Dairy', price: 240, mrp: 240, stock: 12, reserved: 2, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 5, name: 'Fortune Sunflower Oil 1L', sku: '8906001123456', category: 'Grocery', price: 165, mrp: 185, stock: 120, reserved: 5, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 6, name: 'Amul Taaza Milk 500ml', sku: '8901030865123', category: 'Dairy', price: 28, mrp: 28, stock: 200, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 7, name: 'A2 Gir Cow Ghee 1L', sku: '8909876543210', category: 'Grocery', price: 1250, mrp: 1499, stock: 18, reserved: 1, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 8, name: 'Maggi Noodles 70g', sku: '8900000000000', category: 'Grocery', price: 20, mrp: 20, stock: 10, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 9, name: 'Organic Quinoa 500g', sku: '8901234567890', category: 'Grocery', price: 220, mrp: 280, stock: 45, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 10, name: 'Turmeric Powder 200g', sku: 'TUR-POW-200', category: 'Spices', price: 45, mrp: 60, stock: 85, reserved: 0, unit: 'kg', warehouseId: 'wh-1', status: 'active' },
  { id: 11, name: 'Organic Turmeric 200g', sku: 'ORG-TUR-200', category: 'Spices', price: 145, mrp: 199, stock: 30, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'pending' },
  { id: 12, name: 'Handmade Diya Set', sku: 'BAL-DIY-001', category: 'Grocery', price: 199, mrp: 299, stock: 60, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'pending' },
  { id: 13, name: 'Premium Basmati 5kg', sku: 'BAL-BAS-5KG', category: 'Grocery', price: 620, mrp: 750, stock: 0, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'draft' },
  { id: 14, name: 'Amul Butter 500g', sku: '8901030865100', category: 'Dairy', price: 285, mrp: 295, stock: 0, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
  { id: 20, name: 'Paneer 200g', sku: '8900000000019', category: 'Dairy', price: 80, mrp: 80, stock: 8, reserved: 0, unit: 'pcs', warehouseId: 'wh-1', status: 'active' },
];

let memoryWarehouses = [
  { id: 'wh-1', name: 'Main Store Warehouse', address: 'Ring Road, Vesu, Surat', capacity: 5000, active: true },
  { id: 'wh-2', name: 'Cold Storage Room A', address: 'Vesu Sub-branch, Surat', capacity: 1500, active: true },
];

let memoryTransfers = [];
let memoryTransactions = [];

let memoryOrders = [
  { id: '#9021', customer: 'Pooja Sharma', phone: '+91 98765 12340', items: 'Rice, Oil, Salt', amount: 840, payment: 'UPI', status: 'new', date: 'Today 10:42', address: 'B-402, Green City, Vesu' },
  { id: '#9020', customer: 'Karan Mehta', phone: '+91 91234 56789', items: 'Kurti L', amount: 899, payment: 'COD', status: 'shipped', date: 'Today 09:15', address: 'A-12, Royal Plaza, Surat' },
  { id: '#9019', customer: 'Anita Desai', phone: '+91 98250 11223', items: 'Ghee, Paneer', amount: 1240, payment: 'UPI', status: 'new', date: 'Today 08:30', address: 'Shop 4, City Center, Adajan' },
  { id: '#9018', customer: 'Rahul Jain', phone: '+91 99887 22334', items: 'Vegetables', amount: 560, payment: 'Wallet', status: 'ready', date: 'Yesterday', address: '14, Shanti Nagar, Vesu' },
  { id: '#9017', customer: 'Sneha Patel', phone: '+91 98980 33445', items: 'Milk, Bread', amount: 320, payment: 'UPI', status: 'shipped', date: 'Yesterday', address: 'Flat 5, Sunshine Heights' },
  { id: '#9016', customer: 'Divya Nair', phone: '+91 97230 44556', items: 'Kurti x3', amount: 2100, payment: 'COD', status: 'new', date: 'Yesterday', address: '22, Orchid Enclave' },
  { id: '#9015', customer: 'Amit Shah', phone: '+91 98240 55667', items: 'Oil 5L, Rice 10kg', amount: 1850, payment: 'UPI', status: 'processing', date: 'Sep 29', address: '3B, Silver Palms, Surat' },
  { id: '#9014', customer: 'Neha Gupta', phone: '+91 99887 76655', items: 'Tea, Sugar, Salt', amount: 210, payment: 'UPI', status: 'processing', date: 'Sep 29', address: '101, Galaxy Tower' },
  { id: '#9013', customer: 'Vikram Singh', phone: '+91 98700 11223', items: 'Ghee 1L', amount: 1250, payment: 'COD', status: 'ready', date: 'Sep 29', address: 'Plot 7, Diamond City' },
  { id: '#9012', customer: 'Priya Nair', phone: '+91 98250 33445', items: 'Kurti, Dupatta', amount: 1599, payment: 'UPI', status: 'shipped', date: 'Sep 28', address: '202, Royal Residency' },
  { id: '#9011', customer: 'Rohit Sharma', phone: '+91 97120 77889', items: 'Maggi x10', amount: 200, payment: 'Wallet', status: 'delivered', date: 'Sep 28', address: '44, Lake View Apts' },
  { id: '#9010', customer: 'Pooja Sharma', phone: '+91 98765 12340', items: 'Kurti, Rice', amount: 1520, payment: 'UPI', status: 'delivered', date: 'Sep 27', address: 'B-402, Green City, Vesu' },
  { id: '#9009', customer: 'Meena Shah', phone: '+91 98765 00002', items: 'Quinoa, Ghee', amount: 800, payment: 'UPI', status: 'processing', date: 'Sep 27', address: '12, Shanti Kunj, Vesu' },
  { id: '#9008', customer: 'Farhan Khan', phone: '+91 98765 00004', items: 'Spice set', amount: 450, payment: 'COD', status: 'cancelled', date: 'Sep 26', address: '9, Ring Road Market' },
  { id: '#9007', customer: 'Anita Desai', phone: '+91 98250 11223', items: 'Oil 1L', amount: 165, payment: 'UPI', status: 'new', date: 'Today 07:00', address: 'Shop 4, City Center, Adajan' },
];

let memoryShipments = [
  { id: 'SHIP-9020', orderId: '#9020', customer: 'Karan Mehta', carrier: 'Shadowfax / Hyperlocal', trackingNumber: 'SFX-998822', status: 'IN_TRANSIT', rider: 'Sanjay', distance: '4.8 km', eta: '18 min', events: [{ time: 'Today 09:20', status: 'Picked up by rider' }, { time: 'Today 09:35', status: 'In transit to delivery address' }] },
  { id: 'SHIP-9018', orderId: '#9018', customer: 'Rahul Jain', carrier: 'ADAB Self Delivery', trackingNumber: 'ADAB-0012', status: 'READY', rider: 'Awaiting assignment', distance: '0.8 km', eta: '30 min', events: [{ time: 'Yesterday 17:00', status: 'Packed and marked ready for pickup' }] },
];

let memoryReturns = [
  { id: '#R-441', orderId: '#9010', product: 'Balaji Silk Kurti', customer: 'Pooja Sharma', reason: 'Wrong size', amount: 899, status: 'pending', date: 'Yesterday' },
  { id: '#R-440', orderId: '#9005', product: 'A2 Cow Ghee 1L', customer: 'Karan Mehta', reason: 'Damaged in transit', amount: 1250, status: 'pending', date: 'Oct 01' },
  { id: '#R-439', orderId: '#9002', product: 'Fortune Oil 1L', customer: 'Anita Desai', reason: 'Wrong item', amount: 165, status: 'pending', date: 'Sep 30' },
  { id: '#R-430', orderId: '#8998', product: 'Tata Salt 1kg', customer: 'Sneha Patel', reason: 'Expired', amount: 28, status: 'approved', date: 'Sep 28' },
];

let memorySettlements = [
  { id: '#SET-2024', period: 'Sep 16–30', gross: 214200, fees: -10710, net: 203490, status: 'Paid', date: '30 Sep 2026' },
  { id: '#SET-2025', period: 'Oct 1–15', gross: 128940, fees: -6447, net: 122493, status: 'Processing', date: '15 Oct 2026' },
];

let memoryPurchaseOrders = [
  { id: '#PO-821', supplier: 'Gujarat Agro Mill', items: 'Oil 50L', amount: 5600, status: 'Delivered', date: 'Yesterday' },
  { id: '#PO-819', supplier: 'Punjab Grain Co', items: 'Basmati 500kg', amount: 31000, status: 'In Transit', date: '01 Oct 2026' },
  { id: '#PO-816', supplier: 'Jaipur Textile Hub', items: 'Fabric Roll', amount: 42000, status: 'In Transit', date: '28 Sep 2026' },
];

let memoryReviews = [
  { id: 'rev-1', customer: 'Pooja Sharma', rating: 5, comment: 'Beautiful Balaji Silk Kurti! Fabric is amazing and delivery was super fast.', date: '2 days ago', orderId: '#9010', replies: [] },
  { id: 'rev-2', customer: 'Karan Mehta', rating: 4, comment: 'Good quality rice. Packaging could be better.', date: '5 days ago', orderId: '#9005', replies: [] },
  { id: 'rev-3', customer: 'Anita Desai', rating: 2, comment: 'Received wrong item. Expected Fortune Oil but got different brand.', date: 'Needs response', orderId: '#9002', replies: [] },
];

let memoryNotifications = [
  { id: 'notif-1', title: 'New order #9021 received', detail: 'Pooja Sharma · ₹840 · Fast delivery', time: '2 minutes ago', type: 'order', read: false },
  { id: 'notif-2', title: 'Product approved by admin', detail: '"Organic Turmeric 200g" is now live on customer app', time: '3 hours ago', type: 'product', read: false },
  { id: 'notif-3', title: 'Low stock alert', detail: 'Maggi Noodles 70g — only 10 left', time: '5 hours ago', type: 'stock', read: false },
  { id: 'notif-4', title: 'Settlement processed', detail: '₹18,420 transferred to HDFC Bank ****4521', time: 'Yesterday', type: 'finance', read: true },
  { id: 'notif-5', title: 'New review received', detail: '5★ review on "Balaji Silk Kurti" from Pooja Sharma', time: 'Yesterday', type: 'review', read: true },
];

let memoryPosSessions = [];
let memoryPosSales = [];

// Helper to attempt DB query safely with timeout
async function safeQuery(sql, params = []) {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  } catch (err) {
    return null; // Signals fallback to memory store
  }
}

module.exports = {
  safeQuery,
  // INVENTORY
  getInventory: async () => memoryInventory,
  getInventoryBySku: async (sku) => memoryInventory.find(i => i.sku === sku),
  adjustInventory: async (sku, adjustment, reason) => {
    const item = memoryInventory.find(i => i.sku === sku);
    if (!item) return null;
    item.stock = Math.max(0, item.stock + Number(adjustment));
    memoryTransactions.push({
      id: 'tx-' + Date.now(),
      sku,
      adjustment: Number(adjustment),
      reason: reason || 'Manual Adjustment',
      timestamp: new Date().toISOString()
    });
    return item;
  },
  getLowStock: async () => memoryInventory.filter(i => i.stock <= 20),
  getInventoryHistory: async () => memoryTransactions,
  getWarehouses: async () => memoryWarehouses,
  createWarehouse: async (wh) => {
    const newWh = { id: 'wh-' + Date.now(), ...wh, active: true };
    memoryWarehouses.push(newWh);
    return newWh;
  },
  getTransfers: async () => memoryTransfers,
  createTransfer: async (transfer) => {
    const t = { id: 'TRF-' + Date.now(), ...transfer, status: 'PENDING', createdAt: new Date().toISOString() };
    memoryTransfers.push(t);
    return t;
  },

  // ORDERS
  getOrders: async () => memoryOrders,
  getOrderById: async (id) => memoryOrders.find(o => o.id === id),
  updateOrderStatus: async (id, newStatus) => {
    const order = memoryOrders.find(o => o.id === id);
    if (!order) return null;
    order.status = newStatus;
    return order;
  },

  // SHIPMENTS & FULFILLMENT
  getShipments: async () => memoryShipments,
  getShipmentById: async (id) => memoryShipments.find(s => s.id === id || s.orderId === id),
  createShipment: async (shipmentData) => {
    const s = {
      id: 'SHIP-' + Date.now(),
      ...shipmentData,
      status: 'CREATED',
      events: [{ time: 'Just now', status: 'Shipment created' }]
    };
    memoryShipments.push(s);
    return s;
  },
  addTrackingEvent: async (shipmentId, eventText) => {
    const s = memoryShipments.find(sh => sh.id === shipmentId);
    if (s) s.events.push({ time: 'Just now', status: eventText });
    return s;
  },

  // RETURNS
  getReturns: async () => memoryReturns,
  getReturnById: async (id) => memoryReturns.find(r => r.id === id),
  updateReturnStatus: async (id, status) => {
    const ret = memoryReturns.find(r => r.id === id);
    if (ret) ret.status = status;
    return ret;
  },

  // FINANCE & SETTLEMENTS
  getFinanceSummary: async () => ({
    grossRevenue: 428400,
    totalFees: 21420,
    netEarnings: 406980,
    pendingPayout: 38420,
    bankAccount: 'HDFC Bank ****4521'
  }),
  getSettlements: async () => memorySettlements,

  // ANALYTICS
  getAnalytics: async () => ({
    totalRevenue: 428000,
    ordersCount: 412,
    avgOrderValue: 1040,
    uniqueCustomers: 286,
    categorySplit: [
      { category: 'Grocery', percentage: 62 },
      { category: 'Fashion', percentage: 22 },
      { category: 'Dairy', percentage: 10 },
      { category: 'Other', percentage: 6 }
    ]
  }),

  // REVIEWS
  getReviews: async () => memoryReviews,
  replyReview: async (id, replyText) => {
    const rev = memoryReviews.find(r => r.id === id);
    if (rev) rev.replies.push({ reply: replyText, date: 'Just now' });
    return rev;
  },

  // BUY STOCK / PO
  getPurchaseOrders: async () => memoryPurchaseOrders,
  createPurchaseOrder: async (po) => {
    const newPo = { id: '#PO-' + Math.floor(100 + Math.random() * 900), ...po, status: 'In Transit', date: 'Today' };
    memoryPurchaseOrders.unshift(newPo);
    return newPo;
  },

  // POS
  createPosSale: async (saleData) => {
    const sale = { id: 'POS-' + Date.now(), ...saleData, date: new Date().toISOString() };
    memoryPosSales.push(sale);
    return sale;
  },

  // NOTIFICATIONS
  getNotifications: async () => memoryNotifications,
  markNotificationRead: async (id) => {
    const n = memoryNotifications.find(item => item.id === id);
    if (n) n.read = true;
    return n;
  }
};
