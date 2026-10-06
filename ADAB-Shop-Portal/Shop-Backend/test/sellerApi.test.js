const test = require('node:test');
const assert = require('node:assert');
const app = require('../server');

let server;
let baseUrl;

test.before((t, done) => {
  server = app.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    done();
  });
});

test.after((t, done) => {
  if (server) {
    server.close(done);
  } else {
    done();
  }
});

test('GET /api/health should return ok status and service name', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.strictEqual(data.service, 'ADAB-Shop-Portal Backend (Seller Domain)');
});

test('GET /api/v1/seller/inventory should return inventory list', async () => {
  const res = await fetch(`${baseUrl}/api/v1/seller/inventory`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length > 0);
});

test('POST /api/v1/seller/inventory should create a new product', async () => {
  const newProduct = {
    name: 'Test Turmeric Pack 500g',
    sku: 'TEST-TUR-500',
    category: 'Spices',
    price: 95,
    mrp: 120,
    stock: 40
  };
  const res = await fetch(`${baseUrl}/api/v1/seller/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProduct)
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.name, 'Test Turmeric Pack 500g');
});

test('GET /api/v1/seller/orders should return orders list', async () => {
  const res = await fetch(`${baseUrl}/api/v1/seller/orders`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length > 0);
});

test('POST /api/v1/seller/orders/:id/accept should update order status', async () => {
  const res = await fetch(`${baseUrl}/api/v1/seller/orders/%239019/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.status, 'processing');
});

test('POST /api/v1/seller/pos/sales should process a checkout POS transaction', async () => {
  const salePayload = {
    items: [
      { id: 1, name: 'Tata Salt 1kg', price: 28, qty: 2 }
    ],
    totalAmount: 56,
    paymentMethod: 'upi',
    buyerType: 'Customer'
  };
  const res = await fetch(`${baseUrl}/api/v1/seller/pos/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(salePayload)
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.totalAmount, 56);
});

test('POST /api/v1/seller/returns/:id/approve should approve return request', async () => {
  const res = await fetch(`${baseUrl}/api/v1/seller/returns/%23R-441/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.status, 'approved');
});

test('POST /api/v1/seller/buystock/purchase-orders should create B2B purchase order', async () => {
  const poPayload = {
    poNumber: 'PO-999',
    items: [{ name: 'Amul Butter 500g', price: 285, qty: 10 }],
    totalAmount: 2850,
    paymentMethod: 'shop-credit',
    deliveryMethod: 'porter'
  };
  const res = await fetch(`${baseUrl}/api/v1/seller/buystock/purchase-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(poPayload)
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.poNumber, 'PO-999');
});

test('POST /api/v1/seller/finance/credit-apply should submit credit loan application', async () => {
  const creditPayload = {
    amount: 500000,
    bank: 'HDFC Bank',
    purpose: 'Festival Stock Expansion',
    tenor: '24 mos'
  };
  const res = await fetch(`${baseUrl}/api/v1/seller/finance/credit-apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creditPayload)
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.amount, 500000);
});

test('GET /api/v1/seller/analytics/overview should return analytics KPI metrics', async () => {
  const res = await fetch(`${baseUrl}/api/v1/seller/analytics/overview`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.totalRevenue !== undefined);
  assert.ok(data.data.ordersCount !== undefined);
});
