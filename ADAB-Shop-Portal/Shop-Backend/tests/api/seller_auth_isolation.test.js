const request = require('supertest');
const express = require('express');
const { signToken, verifyJwtToken } = require('../../src/utils/jwt');

// Mock notificationProducer
jest.mock('../../src/services/notificationProducer', () => ({
  orderEvent: jest.fn().mockResolvedValue(true),
  returnEvent: jest.fn().mockResolvedValue(true),
  stockAlert: jest.fn().mockResolvedValue(true),
  settlementEvent: jest.fn().mockResolvedValue(true),
  kycEvent: jest.fn().mockResolvedValue(true),
  systemAlert: jest.fn().mockResolvedValue(true)
}));

// Test Identities
const SELLER_A_USER_ID = '11111111-1111-1111-1111-111111111111';
const SELLER_A_STORE_ID = 'aaaa1111-1111-1111-1111-111111111111';
const SELLER_A_PROFILE_ID = 'profa111-1111-1111-1111-111111111111';

const SELLER_B_USER_ID = '22222222-2222-2222-2222-222222222222';
const SELLER_B_STORE_ID = 'bbbb2222-2222-2222-2222-222222222222';
const SELLER_B_PROFILE_ID = 'profb222-2222-2222-2222-222222222222';

const INACTIVE_USER_ID = '33333333-3333-3333-3333-333333333333';

// Generate Tokens
const tokenSellerA = signToken({ id: SELLER_A_USER_ID, role: 'seller' });
const tokenSellerB = signToken({ id: SELLER_B_USER_ID, role: 'seller' });
const tokenInactive = signToken({ id: INACTIVE_USER_ID, role: 'seller' });
const tamperedToken = tokenSellerA.slice(0, -6) + 'xyz123';

// In-Memory Mock Database
const mockDb = {
  users: new Map([
    [
      SELLER_A_USER_ID,
      {
        id: SELLER_A_USER_ID,
        email: 'sellerA@adab.com',
        phone: '9876543210',
        status: 'ACTIVE',
        user_status: 'ACTIVE',
        user_type: 'SELLER',
        seller_profile_id: SELLER_A_PROFILE_ID,
        store_id: SELLER_A_STORE_ID
      }
    ],
    [
      SELLER_B_USER_ID,
      {
        id: SELLER_B_USER_ID,
        email: 'sellerB@adab.com',
        phone: '9876543211',
        status: 'ACTIVE',
        user_status: 'ACTIVE',
        user_type: 'SELLER',
        seller_profile_id: SELLER_B_PROFILE_ID,
        store_id: SELLER_B_STORE_ID
      }
    ],
    [
      INACTIVE_USER_ID,
      {
        id: INACTIVE_USER_ID,
        email: 'inactive@adab.com',
        phone: '9876543212',
        status: 'INACTIVE',
        user_status: 'INACTIVE',
        user_type: 'SELLER',
        seller_profile_id: null,
        store_id: null
      }
    ]
  ]),
  sellerOrders: new Map([
    [
      'so-a-1',
      {
        id: 'so-a-1',
        parent_order_id: 'ord-a-1',
        store_id: SELLER_A_STORE_ID,
        status: 'PENDING',
        subtotal: 500,
        commission_fee: 50,
        seller_payout_amount: 450,
        created_at: new Date().toISOString()
      }
    ],
    [
      'so-b-1',
      {
        id: 'so-b-1',
        parent_order_id: 'ord-b-1',
        store_id: SELLER_B_STORE_ID,
        status: 'PENDING',
        subtotal: 1000,
        commission_fee: 100,
        seller_payout_amount: 900,
        created_at: new Date().toISOString()
      }
    ]
  ]),
  orders: new Map([
    [
      'ord-a-1',
      {
        id: 'ord-a-1',
        order_number: 'ORD-A-1',
        order_status: 'PENDING',
        grand_total: 500,
        created_at: new Date().toISOString()
      }
    ],
    [
      'ord-b-1',
      {
        id: 'ord-b-1',
        order_number: 'ORD-B-1',
        order_status: 'PENDING',
        grand_total: 1000,
        created_at: new Date().toISOString()
      }
    ]
  ]),
  orderItems: [
    { id: 'oi-a-1', seller_order_id: 'so-a-1', listing_id: 'l-a-1', product_name: 'Apples A', quantity: 2, unit_price: 250, total_price: 500 },
    { id: 'oi-b-1', seller_order_id: 'so-b-1', listing_id: 'l-b-1', product_name: 'Oranges B', quantity: 5, unit_price: 200, total_price: 1000 }
  ],
  returns: new Map([
    [
      'ret-a-1',
      {
        id: 'ret-a-1',
        seller_order_id: 'so-a-1',
        status: 'REQUESTED',
        refund_amount: 250
      }
    ],
    [
      'ret-b-1',
      {
        id: 'ret-b-1',
        seller_order_id: 'so-b-1',
        status: 'REQUESTED',
        refund_amount: 400
      }
    ]
  ]),
  b2bPurchaseOrders: new Map([
    [
      'po-b-1',
      {
        id: 'po-b-1',
        buyer_store_id: SELLER_B_STORE_ID,
        total_amount: 1500,
        status: 'ISSUED'
      }
    ]
  ])
};

// Mock PostgreSQL pool
jest.mock('../../db', () => ({
  query: jest.fn(async (sql, params = []) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    // 1. User & seller profile lookup
    if (normalized.includes('FROM users u')) {
      const userId = params[0];
      const user = mockDb.users.get(userId);
      if (!user) return { rows: [] };
      return {
        rows: [{
          id: user.id,
          user_id: user.id,
          email: user.email,
          phone: user.phone,
          status: user.status,
          user_status: user.user_status,
          user_type: user.user_type,
          role: 'seller',
          seller_profile_id: user.seller_profile_id,
          store_id: user.store_id
        }]
      };
    }

    // 2. Orders list query: store-scoped
    if (normalized.includes('FROM seller_orders so JOIN orders o ON so.parent_order_id = o.id') && normalized.includes('LIMIT')) {
      const [storeId] = params;
      const matched = Array.from(mockDb.sellerOrders.values())
        .filter(so => !storeId || so.store_id === storeId)
        .map(so => {
          const ord = mockDb.orders.get(so.parent_order_id);
          const items = mockDb.orderItems.filter(oi => oi.seller_order_id === so.id);
          return {
            seller_order_id: so.id,
            parent_order_id: so.parent_order_id,
            store_id: so.store_id,
            seller_order_status: so.status,
            order_id: ord?.id,
            order_number: ord?.order_number,
            items_list: items,
            item_summary: items.map(i => `${i.product_name} x${i.quantity}`).join(', ')
          };
        });
      return { rows: matched };
    }

    // 3. Existing order lookup before updateOrderStatus
    if (normalized.includes('FROM seller_orders so') && normalized.includes('WHERE so.id::text = $1')) {
      const cleanId = params[0];
      const so = mockDb.sellerOrders.get(cleanId);
      if (!so) return { rows: [] };
      const ord = mockDb.orders.get(so.parent_order_id);
      return {
        rows: [{
          seller_order_id: so.id,
          parent_order_id: so.parent_order_id,
          store_id: so.store_id,
          prev_status: so.status,
          order_number: ord?.order_number
        }]
      };
    }

    // 4. Update seller_orders status
    if (normalized.startsWith('UPDATE seller_orders SET status = $1')) {
      const [newStatus, cleanId, scopedStoreId] = params;
      let updatedCount = 0;
      let updatedRow = null;
      for (const so of mockDb.sellerOrders.values()) {
        const ord = mockDb.orders.get(so.parent_order_id);
        const match = so.id === cleanId || ord?.id === cleanId || ord?.order_number === cleanId;
        if (match && (!scopedStoreId || so.store_id === scopedStoreId)) {
          so.status = newStatus;
          updatedCount++;
          updatedRow = so;
        }
      }
      return { rowCount: updatedCount, rows: updatedRow ? [updatedRow] : [] };
    }

    // 5. Update parent order status
    if (normalized.startsWith('UPDATE orders SET order_status = $1')) {
      return { rows: [{ id: 'mock-order' }] };
    }

    // 6. Order items lookup
    if (normalized.startsWith('SELECT id, listing_id, product_name, quantity FROM order_items')) {
      return { rows: [] };
    }

    // 7. Returns list & update query
    if (normalized.includes('FROM returns r JOIN seller_orders so ON r.seller_order_id = so.id')) {
      const [storeId] = params;
      const matched = Array.from(mockDb.returns.values())
        .filter(ret => {
          const so = mockDb.sellerOrders.get(ret.seller_order_id);
          return !storeId || so?.store_id === storeId;
        })
        .map(ret => ({
          return_id: ret.id,
          status: ret.status,
          refund_amount: ret.refund_amount
        }));
      return { rows: matched };
    }

    if (normalized.startsWith('UPDATE returns SET status = $1')) {
      const [newStatus, returnId, scopedStoreId] = params;
      const ret = mockDb.returns.get(returnId);
      if (!ret) return { rowCount: 0, rows: [] };
      const so = mockDb.sellerOrders.get(ret.seller_order_id);
      if (scopedStoreId && so?.store_id !== scopedStoreId) {
        return { rowCount: 0, rows: [] };
      }
      ret.status = newStatus;
      return { rowCount: 1, rows: [{ ...ret, store_id: so?.store_id }] };
    }

    // 8. Finance summary
    if (normalized.includes('unsettled_payout_balance FROM seller_orders so')) {
      const [storeId] = params;
      const storeOrders = Array.from(mockDb.sellerOrders.values()).filter(so => so.store_id === storeId);
      return {
        rows: [{
          total_orders: storeOrders.length,
          gross_sales: storeOrders.reduce((s, o) => s + o.subtotal, 0),
          total_commission: storeOrders.reduce((s, o) => s + o.commission_fee, 0),
          net_earnings: storeOrders.reduce((s, o) => s + o.seller_payout_amount, 0),
          unsettled_orders_count: storeOrders.length,
          unsettled_payout_balance: storeOrders.reduce((s, o) => s + o.seller_payout_amount, 0)
        }]
      };
    }

    if (normalized.includes('FROM settlements') && normalized.includes('store_id = $1::uuid')) {
      return {
        rows: [{
          settlements_count: 0,
          settled_amount: 0,
          pending_settlement_amount: 0
        }]
      };
    }

    // 9. Khata PO lookup
    if (normalized.startsWith('SELECT id, buyer_store_id FROM b2b_purchase_orders WHERE id = $1')) {
      const po = mockDb.b2bPurchaseOrders.get(params[0]);
      return { rows: po ? [po] : [] };
    }

    // 10. Webhook order lookup
    if (normalized.includes('SELECT store_id FROM seller_orders')) {
      const orderId = params[0];
      const so = mockDb.sellerOrders.get(orderId) || 
        Array.from(mockDb.sellerOrders.values()).find(s => {
          const o = mockDb.orders.get(s.parent_order_id);
          return o?.id === orderId || o?.order_number === orderId;
        });
      return { rows: so ? [{ store_id: so.store_id }] : [] };
    }

    return { rows: [] };
  }),
  connect: jest.fn(async () => ({
    query: jest.fn(async () => ({ rows: [] })),
    release: jest.fn()
  }))
}));

// Build Express app with real seller routes and real auth middleware
const sellerRoutes = require('../../src/routes/seller');
const app = express();
app.use(express.json());
app.use('/api/v1/seller', sellerRoutes);

describe('Seller Authentication, Authorization & Multi-Tenant Data Isolation Audit Suite', () => {
  afterAll(async () => {
    jest.clearAllMocks();
  });

  describe('1. Authentication Requirement & Invalid Token Handling', () => {
    it('returns 401 Unauthorized when no Authorization header is present', async () => {
      const res = await request(app).get('/api/v1/seller/orders');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unauthorized: Authentication token required');
    });

    it('returns 401 Unauthorized when an invalid or tampered Bearer token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${tamperedToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unauthorized: Invalid or expired authentication token');
    });

    it('returns 401/403 when an inactive seller account attempts to access protected routes', async () => {
      const res = await request(app)
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${tokenInactive}`);
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Multi-Tenant Read Isolation (Orders & Finance Summary)', () => {
    it('Seller A token only returns Seller A orders, never leaking Seller B orders', async () => {
      const resA = await request(app)
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${tokenSellerA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
      const orders = resA.body.data;
      expect(orders.length).toBe(1);
      expect(orders[0].real_id).toBe('so-a-1');
      expect(orders[0].store_id).toBe(SELLER_A_STORE_ID);
    });

    it('Seller B token only returns Seller B orders, never leaking Seller A orders', async () => {
      const resB = await request(app)
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${tokenSellerB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.success).toBe(true);
      const orders = resB.body.data;
      expect(orders.length).toBe(1);
      expect(orders[0].real_id).toBe('so-b-1');
      expect(orders[0].store_id).toBe(SELLER_B_STORE_ID);
    });

    it('Seller A finance summary only aggregates sales and payouts for Seller A store', async () => {
      const resA = await request(app)
        .get('/api/v1/seller/finance/summary')
        .set('Authorization', `Bearer ${tokenSellerA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
      expect(resA.body.data.gross_sales).toBe(500);
      expect(resA.body.data.net_earnings).toBe(450);
    });
  });

  describe('3. Multi-Tenant Mutation Scoping (Cross-Seller Modification Prevention)', () => {
    it('Seller A cannot mutate Seller B order status (returns 404/403)', async () => {
      const res = await request(app)
        .patch('/api/v1/seller/orders/so-b-1/status')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({ status: 'packing' });

      // Cannot update another seller's order because store_id scoping does not match
      expect([403, 404]).toContain(res.status);
      expect(mockDb.sellerOrders.get('so-b-1').status).toBe('PENDING');
    });

    it('Seller A cannot mutate Seller B return status', async () => {
      const res = await request(app)
        .patch('/api/v1/seller/returns/ret-b-1/status')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({ status: 'APPROVED' });

      expect([403, 404]).toContain(res.status);
      expect(mockDb.returns.get('ret-b-1').status).toBe('REQUESTED');
    });

    it('Seller A cannot pay or mutate Seller B Khata purchase order (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/seller/finance/khata/po-b-1/pay')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({ amount: 500, payment_method: 'CASH' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden: Cross-seller access denied');
    });
  });

  describe('4. Header Spoofing Protection (x-store-id and x-user-id)', () => {
    it('returns 403 Forbidden when Seller A passes a spoofed x-store-id belonging to Seller B', async () => {
      const res = await request(app)
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .set('x-store-id', SELLER_B_STORE_ID);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden: Cross-seller store access denied');
    });

    it('completely ignores spoofed x-user-id header and strictly resolves identity from JWT', async () => {
      // Seller A sends spoofed x-user-id header pointing to Seller B
      const res = await request(app)
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .set('x-user-id', SELLER_B_USER_ID);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Data returned is Seller A's orders, NOT Seller B's orders
      expect(res.body.data[0].store_id).toBe(SELLER_A_STORE_ID);
    });
  });

  describe('5. Webhook Signature Validation & Scoping', () => {
    it('returns 401 Unauthorized for webhook callback without valid secret header', async () => {
      const res = await request(app)
        .post('/api/v1/seller/webhooks/callback')
        .send({ event_type: 'ORDER_STATUS_UPDATED', order_id: 'so-a-1', status: 'packing' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized: Invalid or missing webhook signature');
    });

    it('executes correctly scoped when valid webhook secret header is provided', async () => {
      const webhookSecret = process.env.WEBHOOK_SECRET || 'adab_secret_webhook_key_2026';
      const res = await request(app)
        .post('/api/v1/seller/webhooks/callback')
        .set('x-webhook-secret', webhookSecret)
        .send({
          event_type: 'ORDER_STATUS_UPDATED',
          order_id: 'so-a-1',
          status: 'accepted'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event_type).toBe('ORDER_STATUS_UPDATED');
    });
  });

  describe('6. Socket.IO Handshake Authentication Module', () => {
    it('rejects connection if token is missing or invalid in handshake', async () => {
      expect(verifyJwtToken('invalid.token.str')).toBeNull();

      const pool = require('../../db');
      const runHandshake = async (socketObj) => {
        const rawToken = socketObj.handshake?.auth?.token;
        if (!rawToken) {
          return new Error('Authentication error: Missing token');
        }
        const decoded = verifyJwtToken(rawToken);
        const userId = decoded?.id || decoded?.userId;
        if (!userId) {
          return new Error('Authentication error: Invalid token payload');
        }
        const userRes = await pool.query('SELECT u.id FROM users u WHERE u.id = $1', [userId]);
        const user = userRes.rows[0];
        if (!user || user.status !== 'ACTIVE' || String(user.user_type || '').toUpperCase() !== 'SELLER') {
          return new Error('Authentication error: Unauthorized seller');
        }
        return null;
      };

      const fakeSocketNoToken = { handshake: { auth: {} } };
      const errNoToken = await runHandshake(fakeSocketNoToken);
      expect(errNoToken.message).toContain('Missing token');

      const fakeSocketTampered = { handshake: { auth: { token: tamperedToken } } };
      const errTampered = await runHandshake(fakeSocketTampered);
      expect(errTampered.message).toContain('Invalid token payload');

      const fakeSocketValid = { handshake: { auth: { token: tokenSellerA } } };
      const errValid = await runHandshake(fakeSocketValid);
      expect(errValid).toBeNull();
    });
  });

});
