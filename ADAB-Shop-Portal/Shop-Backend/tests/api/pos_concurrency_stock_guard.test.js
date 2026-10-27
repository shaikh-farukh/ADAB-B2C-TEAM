const request = require('supertest');
const express = require('express');
const { signToken } = require('../../src/utils/jwt');

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
const STORE_A_ID = 'aaaa1111-1111-1111-1111-111111111111';
const USER_A_ID = '11111111-1111-1111-1111-111111111111';
const tokenSellerA = signToken({ id: USER_A_ID, role: 'seller' });

const STORE_B_ID = 'bbbb2222-2222-2222-2222-222222222222';
const USER_B_ID = '22222222-2222-2222-2222-222222222222';
const tokenSellerB = signToken({ id: USER_B_ID, role: 'seller' });

// Mock Listings & Store State
const mockListings = new Map([
  ['11111111-0000-0000-0000-000000000001', {
    id: '11111111-0000-0000-0000-000000000001',
    store_id: STORE_A_ID,
    title: 'Tata Salt 1kg',
    sell_price: 28,
    stock_qty: 5,
    is_active: true
  }],
  ['11111111-0000-0000-0000-000000000002', {
    id: '11111111-0000-0000-0000-000000000002',
    store_id: STORE_A_ID,
    title: 'Amul Butter 500g',
    sell_price: 275,
    stock_qty: 2,
    is_active: true
  }],
  ['22222222-0000-0000-0000-000000000001', {
    id: '22222222-0000-0000-0000-000000000001',
    store_id: STORE_B_ID,
    title: 'Store B Exclusive Rice',
    sell_price: 450,
    stock_qty: 50,
    is_active: true
  }]
]);

// Mock Credit Applications
const mockCreditApplications = [
  { id: 'ca-a-1', store_id: STORE_A_ID, business_name: 'Store A Mart', requested_amount: 50000, status: 'PENDING' },
  { id: 'ca-b-1', store_id: STORE_B_ID, business_name: 'Store B Bazaar', requested_amount: 150000, status: 'APPROVED' }
];

// Mock PostgreSQL pool
jest.mock('../../db', () => ({
  query: jest.fn(async (sql, params = []) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    // User lookup
    if (normalized.includes('FROM users u')) {
      const userId = params[0];
      if (userId === USER_A_ID) {
        return {
          rows: [{
            id: USER_A_ID,
            status: 'ACTIVE',
            user_type: 'SELLER',
            role: 'seller',
            store_id: STORE_A_ID
          }]
        };
      }
      if (userId === USER_B_ID) {
        return {
          rows: [{
            id: USER_B_ID,
            status: 'ACTIVE',
            user_type: 'SELLER',
            role: 'seller',
            store_id: STORE_B_ID
          }]
        };
      }
      return { rows: [] };
    }

    // Credit applications query
    if (normalized.includes('FROM credit_applications') && normalized.includes('store_id = $1')) {
      const storeId = params[0];
      const matched = mockCreditApplications.filter(ca => ca.store_id === storeId);
      return { rows: matched };
    }

    return { rows: [] };
  }),

  connect: jest.fn(async () => {
    let inTx = false;
    return {
      query: jest.fn(async (sql, params = []) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized === 'BEGIN') {
          inTx = true;
          return { rows: [] };
        }
        if (normalized === 'COMMIT') {
          inTx = false;
          return { rows: [] };
        }
        if (normalized === 'ROLLBACK') {
          inTx = false;
          return { rows: [] };
        }

        // Insert into orders
        if (normalized.includes('INSERT INTO orders')) {
          return {
            rows: [{
              id: 'ord-test-pos-1',
              order_number: params[0],
              customer_id: params[1],
              grand_total: params[3],
              created_at: new Date().toISOString()
            }]
          };
        }

        // Insert into seller_orders
        if (normalized.includes('INSERT INTO seller_orders')) {
          return {
            rows: [{
              id: 'so-test-pos-1',
              parent_order_id: params[0],
              store_id: params[1],
              subtotal: params[2],
              status: 'DELIVERED'
            }]
          };
        }

        // SELECT ... FOR UPDATE (Row Lock)
        if (normalized.includes('FROM seller_listings WHERE id = $1 AND store_id = $2 FOR UPDATE')) {
          const [listingId, storeId] = params;
          const listing = mockListings.get(listingId);
          if (listing && listing.store_id === storeId) {
            return { rows: [{ id: listing.id, title: listing.title, stock_qty: listing.stock_qty }] };
          }
          return { rows: [] };
        }

        // Insert into order_items
        if (normalized.includes('INSERT INTO order_items')) {
          return { rows: [{ id: 'oi-test-1' }] };
        }

        // Update seller_listings stock_qty
        if (normalized.includes('UPDATE seller_listings') && normalized.includes('SET stock_qty = GREATEST(0, stock_qty - $1)')) {
          const [qtyToDeduct, listingId, storeId] = params;
          const listing = mockListings.get(listingId);
          if (listing && listing.store_id === storeId) {
            listing.stock_qty = Math.max(0, listing.stock_qty - qtyToDeduct);
            if (listing.stock_qty === 0) {
              listing.is_active = false;
            }
          }
          return { rowCount: 1 };
        }

        return { rows: [] };
      }),
      release: jest.fn()
    };
  })
}));

const sellerRoutes = require('../../src/routes/seller');
const app = express();
app.use(express.json());
app.use('/api/v1/seller', sellerRoutes);

describe('POS Concurrency Stock Guard & Multi-Store Isolation', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('1. POS Concurrency & Stock Guard (FOR UPDATE locking)', () => {
    it('successfully processes sale and decrements stock when requested quantity <= stock_qty', async () => {
      const listingId = '11111111-0000-0000-0000-000000000001';
      const initialStock = mockListings.get(listingId).stock_qty; // 5

      const res = await request(app)
        .post('/api/v1/seller/pos/sales')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({
          cart: [{ id: listingId, name: 'Tata Salt 1kg', price: 28, qty: 2 }],
          paymentMethod: 'cash',
          customerPhone: '9876543210'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receipt_id).toMatch(/^POS-\d+/);
      expect(mockListings.get(listingId).stock_qty).toBe(initialStock - 2);
    });

    it('returns HTTP 409 Conflict with INSUFFICIENT_STOCK when requested quantity exceeds available stock', async () => {
      const listingId = '11111111-0000-0000-0000-000000000001';
      const currentStock = mockListings.get(listingId).stock_qty; // 3

      const res = await request(app)
        .post('/api/v1/seller/pos/sales')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({
          cart: [{ id: listingId, name: 'Tata Salt 1kg', price: 28, qty: 10 }], // requested 10 > 3
          paymentMethod: 'cash',
          customerPhone: '9876543210'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('INSUFFICIENT_STOCK');
      expect(res.body.error).toContain('Tata Salt 1kg');
      // Stock must not be decremented
      expect(mockListings.get(listingId).stock_qty).toBe(currentStock);
    });

    it('marks listing inactive when stock is depleted to zero', async () => {
      const listingId = '11111111-0000-0000-0000-000000000002'; // stock_qty is 2
      expect(mockListings.get(listingId).stock_qty).toBe(2);
      expect(mockListings.get(listingId).is_active).toBe(true);

      const res = await request(app)
        .post('/api/v1/seller/pos/sales')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({
          cart: [{ id: listingId, name: 'Amul Butter 500g', price: 275, qty: 2 }],
          paymentMethod: 'upi',
          customerPhone: '9876543211'
        });

      expect(res.status).toBe(201);
      expect(mockListings.get(listingId).stock_qty).toBe(0);
      expect(mockListings.get(listingId).is_active).toBe(false);
    });
  });

  describe('2. Multi-Store Isolation (Cross-Store Data & Inventory Leak Protection)', () => {
    it('prevents Store A from modifying or deducting Store B inventory', async () => {
      const storeBListingId = '22222222-0000-0000-0000-000000000001';
      const storeBInitialStock = mockListings.get(storeBListingId).stock_qty; // 50

      // Store A attempts to sell Store B's listing
      await request(app)
        .post('/api/v1/seller/pos/sales')
        .set('Authorization', `Bearer ${tokenSellerA}`)
        .send({
          cart: [{ id: storeBListingId, name: 'Store B Exclusive Rice', price: 450, qty: 5 }],
          paymentMethod: 'cash'
        });

      // Store B's stock MUST remain completely untouched at 50
      expect(mockListings.get(storeBListingId).stock_qty).toBe(storeBInitialStock);
    });

    it('isolates credit applications between Store A and Store B', async () => {
      const resA = await request(app)
        .get('/api/v1/seller/finance/credit-applications')
        .set('Authorization', `Bearer ${tokenSellerA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
      expect(resA.body.data.every(ca => ca.store_id === STORE_A_ID)).toBe(true);
      expect(resA.body.data.some(ca => ca.store_id === STORE_B_ID)).toBe(false);

      const resB = await request(app)
        .get('/api/v1/seller/finance/credit-applications')
        .set('Authorization', `Bearer ${tokenSellerB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.success).toBe(true);
      expect(resB.body.data.every(ca => ca.store_id === STORE_B_ID)).toBe(true);
      expect(resB.body.data.some(ca => ca.store_id === STORE_A_ID)).toBe(false);
    });
  });
});
