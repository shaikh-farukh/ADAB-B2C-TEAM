const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

// Simulated in-memory database state for full E2E chain & security audit
const mockDbState = {
  stores: new Map(),
  listings: new Map(),
  inventory: new Map(),
  orders: new Map(),
  sellerOrders: new Map(),
  orderItems: [],
  payments: new Map(),
  returns: new Map(),
  returnItems: [],
  settlements: [],
  settlementItems: [],
  b2bPurchaseOrders: new Map(),
  queryLog: []
};

function resetMockDbState() {
  mockDbState.stores.clear();
  mockDbState.listings.clear();
  mockDbState.inventory.clear();
  mockDbState.orders.clear();
  mockDbState.sellerOrders.clear();
  mockDbState.orderItems = [];
  mockDbState.payments.clear();
  mockDbState.returns.clear();
  mockDbState.returnItems = [];
  mockDbState.settlements = [];
  mockDbState.settlementItems = [];
  mockDbState.b2bPurchaseOrders.clear();
  mockDbState.queryLog = [];

  // Seed Seller A (Mayank/Shabbir Store) and Seller B (Another Seller Store for cross-seller isolation tests)
  mockDbState.stores.set('user-seller-a', {
    id: '11111111-1111-1111-1111-111111111111',
    owner_id: 'sp-seller-a',
    store_name: 'ADAB Fresh Mart (Store A)',
    city: 'Surat',
    address_line: 'Ring Road',
    delivery_radius_km: 8,
    latitude: 21.1702,
    longitude: 72.8311
  });

  mockDbState.stores.set('user-seller-b', {
    id: '22222222-2222-2222-2222-222222222222',
    owner_id: 'sp-seller-b',
    store_name: 'Other Seller Store B',
    city: 'Surat',
    address_line: 'Adajan',
    delivery_radius_km: 5,
    latitude: 21.1959,
    longitude: 72.7933
  });
}

const mockPool = {
  query: jest.fn(async (sql, params = []) => {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();
    mockDbState.queryLog.push({ sql: normalizedSql, params });

    // 0. User & Store lookup in requireSellerAuth middleware
    if (normalizedSql.includes('FROM users u') && normalizedSql.includes('seller_profiles sp') && normalizedSql.includes('stores s')) {
      const userId = params[0];
      if (userId === 'user-nonexistent' || userId === 'user-inactive') return { rows: [] };
      if (userId === 'user-no-profile') {
        return {
          rows: [{
            id: userId,
            user_id: userId,
            email: `${userId}@adab.com`,
            phone: '9876543210',
            status: 'ACTIVE',
            user_status: 'ACTIVE',
            user_type: 'SELLER',
            seller_profile_id: null,
            store_id: null
          }]
        };
      }
      const store = mockDbState.stores.get(userId);
      return {
        rows: [{
          id: userId,
          user_id: userId,
          email: `${userId}@adab.com`,
          phone: '9876543210',
          status: 'ACTIVE',
          user_status: 'ACTIVE',
          user_type: 'SELLER',
          seller_profile_id: store ? store.owner_id : `sp-${userId}`,
          store_id: store ? store.id : null
        }]
      };
    }

    // 1. Store lookup by user_id
    if (normalizedSql.includes('FROM stores s JOIN seller_profiles sp')) {
      const userId = params[0];
      const store = mockDbState.stores.get(userId);
      return { rows: store ? [store] : [] };
    }

    // 2. Profile lookup
    if (normalizedSql.includes('FROM users u LEFT JOIN seller_profiles sp')) {
      const userId = params[0];
      if (userId === 'user-nonexistent' || userId === 'user-no-profile') return { rows: [] };
      return {
        rows: [{
          id: userId,
          full_name: 'Mayank Seller',
          email: 'seller@adab.com',
          phone: '9876543210',
          status: 'ACTIVE',
          kyc_status: 'APPROVED'
        }]
      };
    }

    // 3. Get Orders (with store scoping, status filter, search, limit, offset)
    if (normalizedSql.includes('FROM seller_orders so JOIN orders o ON so.parent_order_id = o.id') && normalizedSql.includes('LIMIT $4::int OFFSET $5::int')) {
      const [storeId, statusFilter, searchFilter, limit, offset] = params;
      let rows = Array.from(mockDbState.sellerOrders.values()).map(so => {
        const ord = mockDbState.orders.get(so.parent_order_id);
        const items = mockDbState.orderItems
          .filter(oi => oi.seller_order_id === so.id)
          .map(oi => ({
            id: oi.id,
            listing_id: oi.listing_id,
            name: oi.product_name,
            quantity: oi.quantity,
            unit_price: oi.unit_price,
            total_price: oi.total_price
          }));
        return {
          seller_order_id: so.id,
          parent_order_id: so.parent_order_id,
          store_id: so.store_id,
          store_latitude: 21.1702,
          store_longitude: 72.8311,
          seller_order_status: so.status,
          store_subtotal: so.subtotal,
          commission_fee: so.commission_fee,
          seller_payout_amount: so.seller_payout_amount,
          seller_order_created_at: so.created_at,
          order_id: ord.id,
          order_number: ord.order_number,
          created_at: ord.created_at,
          order_status: ord.order_status,
          payment_method: ord.payment_method,
          payment_status: ord.payment_status,
          delivery_mode: ord.delivery_mode,
          amount: ord.grand_total,
          delivery_address: ord.delivery_address,
          customer: ord.customer_name,
          customer_phone: ord.customer_phone,
          items_list: items,
          item_summary: items.map(i => `${i.name} (x${i.quantity})`).join(', ')
        };
      });

      if (storeId) {
        rows = rows.filter(r => r.store_id === storeId);
      }
      if (statusFilter) {
        rows = rows.filter(r => r.seller_order_status.toUpperCase() === statusFilter.toUpperCase());
      }
      if (searchFilter) {
        const needle = searchFilter.replace(/%/g, '').toLowerCase();
        rows = rows.filter(r =>
          r.order_number.toLowerCase().includes(needle) ||
          (r.customer || '').toLowerCase().includes(needle)
        );
      }
      rows = rows.slice(offset, offset + limit);
      return { rows };
    }

    // 4. Existing seller_orders lookup before status update
    if (normalizedSql.includes('SELECT so.id as seller_order_id, so.parent_order_id, so.store_id, so.status as prev_status')) {
      const cleanId = params[0];
      const matches = [];
      for (const so of mockDbState.sellerOrders.values()) {
        const ord = mockDbState.orders.get(so.parent_order_id);
        if (
          so.id === cleanId ||
          ord?.id === cleanId ||
          ord?.order_number === cleanId ||
          ord?.order_number === `ORD-${cleanId}`
        ) {
          matches.push({
            seller_order_id: so.id,
            parent_order_id: so.parent_order_id,
            store_id: so.store_id,
            prev_status: so.status,
            order_number: ord?.order_number
          });
        }
      }
      return { rows: matches };
    }

    // 5. Update seller_orders status
    if (normalizedSql.startsWith('UPDATE seller_orders SET status = $1')) {
      const [newStatus, cleanId, scopedStoreId] = params;
      for (const so of mockDbState.sellerOrders.values()) {
        const ord = mockDbState.orders.get(so.parent_order_id);
        const idMatches =
          so.id === cleanId ||
          ord?.id === cleanId ||
          ord?.order_number === cleanId ||
          ord?.order_number === `ORD-${cleanId}`;
        const storeMatches = !scopedStoreId || so.store_id === scopedStoreId;
        if (idMatches && storeMatches) {
          so.status = newStatus;
        }
      }
      return { rowCount: 1, rows: [] };
    }

    // 6. Update parent orders status
    if (normalizedSql.startsWith('UPDATE orders SET order_status = $1')) {
      const [newOrderStatus, cleanId] = params;
      let updatedOrder = null;
      for (const ord of mockDbState.orders.values()) {
        if (ord.id === cleanId || ord.order_number === cleanId || ord.order_number === `ORD-${cleanId}`) {
          ord.order_status = newOrderStatus;
          updatedOrder = ord;
        }
      }
      return { rows: updatedOrder ? [updatedOrder] : [] };
    }

    // 7. Order items lookup for stock adjustment
    if (normalizedSql.startsWith('SELECT id, listing_id, product_name, quantity FROM order_items WHERE seller_order_id = $1')) {
      const sellerOrderId = params[0];
      return {
        rows: mockDbState.orderItems.filter(oi => oi.seller_order_id === sellerOrderId)
      };
    }

    // 8. Listing stock increment / decrement
    if (normalizedSql.startsWith('UPDATE seller_listings SET stock_qty =')) {
      const [qty, listingId] = params;
      const listing = mockDbState.listings.get(listingId);
      if (listing) {
        if (normalizedSql.includes('- $1::int')) {
          listing.stock_qty = Math.max(0, listing.stock_qty - Number(qty));
        } else {
          listing.stock_qty = listing.stock_qty + Number(qty);
        }
        return { rows: [{ stock_qty: listing.stock_qty }] };
      }
      return { rows: [] };
    }

    if (normalizedSql.startsWith('UPDATE inventory SET stock_quantity =')) {
      const [qty, listingId] = params;
      const inv = mockDbState.inventory.get(listingId);
      if (inv) {
        if (normalizedSql.includes('- $1::numeric')) {
          inv.stock_quantity = Math.max(0, inv.stock_quantity - Number(qty));
        } else {
          inv.stock_quantity = inv.stock_quantity + Number(qty);
        }
      }
      return { rows: [] };
    }

    // 9. Get Returns (with store scoping, status filter, search, limit, offset)
    if (normalizedSql.includes('FROM returns r JOIN seller_orders so ON r.seller_order_id = so.id') && normalizedSql.includes('LIMIT $4::int OFFSET $5::int')) {
      const [storeId, statusFilter, searchFilter, limit, offset] = params;
      let rows = Array.from(mockDbState.returns.values()).map(ret => {
        const so = mockDbState.sellerOrders.get(ret.seller_order_id);
        const ord = mockDbState.orders.get(ret.order_id);
        const pay = mockDbState.payments.get(ret.order_id);
        const rItems = mockDbState.returnItems.filter(ri => ri.return_id === ret.id);
        const firstRi = rItems[0] || {};
        const firstOi = mockDbState.orderItems.find(oi => oi.id === firstRi.order_item_id) || {};
        const listing = mockDbState.listings.get(firstOi.listing_id);

        return {
          ...ret,
          store_id: so.store_id,
          store_subtotal: so.subtotal,
          order_number: ord.order_number,
          grand_total: ord.grand_total,
          order_payment_method: ord.payment_method,
          payment_status: ord.payment_status,
          delivery_address: ord.delivery_address,
          customer_name: ord.customer_name,
          customer_phone: ord.customer_phone,
          payment_id: pay?.id || null,
          payment_amount: pay?.amount || null,
          payment_currency: 'INR',
          payment_method: pay?.payment_method || null,
          payment_record_status: pay?.status || null,
          return_item_id: firstRi.id,
          order_item_id: firstRi.order_item_id,
          return_qty: firstRi.quantity,
          return_item_refund_amount: firstRi.refund_amount,
          item_condition: firstRi.item_condition,
          listing_id: firstOi.listing_id,
          product_name: firstOi.product_name,
          order_qty: firstOi.quantity,
          unit_price: firstOi.unit_price,
          item_total_price: firstOi.total_price,
          current_listing_stock: listing?.stock_qty ?? null,
          items_list: rItems.map(ri => {
            const oi = mockDbState.orderItems.find(o => o.id === ri.order_item_id) || {};
            const sl = mockDbState.listings.get(oi.listing_id);
            return {
              return_item_id: ri.id,
              order_item_id: oi.id,
              listing_id: oi.listing_id,
              product_name: oi.product_name,
              quantity: ri.quantity,
              unit_price: oi.unit_price,
              total_price: ri.refund_amount,
              reason: ret.reason,
              item_condition: ri.item_condition,
              current_listing_stock: sl?.stock_qty ?? null
            };
          })
        };
      });

      if (storeId) rows = rows.filter(r => r.store_id === storeId);
      if (statusFilter) rows = rows.filter(r => r.status.toUpperCase() === statusFilter.toUpperCase());
      if (searchFilter) {
        const needle = searchFilter.replace(/%/g, '').toLowerCase();
        rows = rows.filter(r =>
          r.order_number.toLowerCase().includes(needle) ||
          (r.reason || '').toLowerCase().includes(needle)
        );
      }
      return { rows: rows.slice(offset, offset + limit) };
    }

    // 10. Single Return lookup before updateReturnStatus
    if (normalizedSql.includes('FROM returns r JOIN seller_orders so ON r.seller_order_id = so.id') && normalizedSql.includes('WHERE r.id::text = $1')) {
      const [cleanId, shortPrefix] = params;
      for (const ret of mockDbState.returns.values()) {
        if (ret.id === cleanId || ret.id.slice(0, 4).toUpperCase() === shortPrefix) {
          const so = mockDbState.sellerOrders.get(ret.seller_order_id);
          const ord = mockDbState.orders.get(ret.order_id);
          const pay = mockDbState.payments.get(ret.order_id);
          const firstRi = mockDbState.returnItems.find(ri => ri.return_id === ret.id) || {};
          const firstOi = mockDbState.orderItems.find(oi => oi.id === firstRi.order_item_id) || {};
          const listing = mockDbState.listings.get(firstOi.listing_id);
          return {
            rows: [{
              ...ret,
              store_id: so.store_id,
              order_number: ord.order_number,
              grand_total: ord.grand_total,
              payment_status: ord.payment_status,
              payment_id: pay?.id,
              payment_amount: pay?.amount,
              payment_method: pay?.payment_method,
              payment_record_status: pay?.status,
              return_item_id: firstRi.id,
              order_item_id: firstRi.order_item_id,
              return_qty: firstRi.quantity,
              return_item_refund_amount: firstRi.refund_amount,
              item_condition: firstRi.item_condition,
              listing_id: firstOi.listing_id,
              product_name: firstOi.product_name,
              order_qty: firstOi.quantity,
              item_total_price: firstOi.total_price,
              current_listing_stock: listing?.stock_qty ?? null
            }]
          };
        }
      }
      return { rows: [] };
    }

    // 11. Return status updates
    if (normalizedSql.startsWith("UPDATE returns SET status = 'APPROVED'")) {
      const [retId, refundAmt] = params;
      const ret = mockDbState.returns.get(retId);
      if (ret) {
        ret.status = 'APPROVED';
        ret.refund_amount = ret.refund_amount ?? refundAmt;
      }
      return { rows: [] };
    }
    if (normalizedSql.startsWith("UPDATE orders SET payment_status = 'REFUNDED'")) {
      const [ordId] = params;
      const ord = mockDbState.orders.get(ordId);
      if (ord) {
        ord.payment_status = 'REFUNDED';
        ord.order_status = 'RETURNED';
      }
      return { rows: [] };
    }
    if (normalizedSql.startsWith("UPDATE payments SET status = 'REFUNDED'")) {
      const [ordId] = params;
      const pay = mockDbState.payments.get(ordId);
      if (pay) pay.status = 'REFUNDED';
      return { rows: [] };
    }
    if (normalizedSql.startsWith("UPDATE returns SET status = 'COMPLETED'")) {
      const [retId] = params;
      const ret = mockDbState.returns.get(retId);
      if (ret) {
        ret.status = 'COMPLETED';
        ret.resolved_at = new Date().toISOString();
      }
      return { rows: [] };
    }
    if (normalizedSql.startsWith("UPDATE return_items SET item_condition = 'RESTOCKED'")) {
      const [retId] = params;
      mockDbState.returnItems.forEach(ri => {
        if (ri.return_id === retId) ri.item_condition = 'RESTOCKED';
      });
      return { rows: [] };
    }
    if (normalizedSql.includes('FROM return_items ri LEFT JOIN order_items oi ON ri.order_item_id = oi.id WHERE ri.return_id = $1')) {
      const [retId] = params;
      const rows = mockDbState.returnItems
        .filter(ri => ri.return_id === retId)
        .map(ri => {
          const oi = mockDbState.orderItems.find(o => o.id === ri.order_item_id) || {};
          return {
            qty: ri.quantity,
            listing_id: oi.listing_id,
            product_name: oi.product_name
          };
        });
      return { rows };
    }
    if (normalizedSql.includes('FROM return_items ri_all LEFT JOIN order_items oi_all')) {
      const [retId] = params;
      const rows = mockDbState.returnItems
        .filter(ri => ri.return_id === retId)
        .map(ri => {
          const oi = mockDbState.orderItems.find(o => o.id === ri.order_item_id) || {};
          const sl = mockDbState.listings.get(oi.listing_id);
          return {
            return_item_id: ri.id,
            order_item_id: oi.id,
            listing_id: oi.listing_id,
            product_name: oi.product_name,
            quantity: ri.quantity,
            unit_price: oi.unit_price,
            total_price: ri.refund_amount,
            item_condition: ri.item_condition,
            current_listing_stock: sl?.stock_qty ?? null
          };
        });
      return { rows };
    }

    // 12. Finance Summary queries
    if (normalizedSql.includes('unsettled_payout_balance FROM seller_orders so')) {
      const [storeId] = params;
      const storeOrders = Array.from(mockDbState.sellerOrders.values()).filter(
        so => (!storeId || so.store_id === storeId) && so.status !== 'CANCELLED'
      );
      const settledIds = new Set(mockDbState.settlementItems.map(si => si.seller_order_id));
      let unsettledBalance = 0;
      let unsettledCount = 0;
      for (const so of storeOrders) {
        if (!settledIds.has(so.id)) {
          unsettledCount++;
          const refunded = Array.from(mockDbState.returns.values())
            .filter(r => r.seller_order_id === so.id && ['APPROVED', 'ITEM_PICKED', 'COMPLETED'].includes(r.status))
            .reduce((s, r) => s + Number(r.refund_amount || 0), 0);
          unsettledBalance += Math.max(0, Number(so.seller_payout_amount) - refunded);
        }
      }
      return {
        rows: [{
          total_orders: storeOrders.length,
          gross_sales: storeOrders.reduce((s, o) => s + Number(o.subtotal), 0),
          total_commission: storeOrders.reduce((s, o) => s + Number(o.commission_fee), 0),
          net_earnings: storeOrders.reduce((s, o) => s + Number(o.seller_payout_amount), 0),
          unsettled_orders_count: unsettledCount,
          unsettled_payout_balance: unsettledBalance
        }]
      };
    }
    if (normalizedSql.includes('total_refunded FROM returns r')) {
      const [storeId] = params;
      const storeReturns = Array.from(mockDbState.returns.values()).filter(r => {
        const so = mockDbState.sellerOrders.get(r.seller_order_id);
        return (!storeId || so?.store_id === storeId) && ['APPROVED', 'ITEM_PICKED', 'COMPLETED'].includes(r.status);
      });
      return {
        rows: [{
          refunded_count: storeReturns.length,
          total_refunded: storeReturns.reduce((s, r) => s + Number(r.refund_amount || 0), 0)
        }]
      };
    }
    if (normalizedSql.includes('FROM settlements') && (normalizedSql.includes('store_id = $1::uuid') || normalizedSql.includes('($1::uuid IS NULL OR store_id = $1::uuid)'))) {
      const [storeId] = params;
      const list = mockDbState.settlements.filter(s => !storeId || s.store_id === storeId);
      return {
        rows: [{
          settlements_count: list.length,
          settled_amount: list.reduce((s, x) => s + Number(x.net_payable || 0), 0),
          pending_settlement_amount: 0
        }]
      };
    }
    if (normalizedSql.includes('FROM credit_ledgers')) {
      return { rows: [] };
    }
    if (normalizedSql.includes('FROM b2b_purchase_orders WHERE $1::uuid IS NOT NULL')) {
      return { rows: [{ receivables: 0, payables: 0 }] };
    }

    // 13. Khata PO ownership check
    if (normalizedSql.startsWith('SELECT id, buyer_store_id FROM b2b_purchase_orders WHERE id = $1')) {
      const po = mockDbState.b2bPurchaseOrders.get(params[0]);
      return { rows: po ? [po] : [] };
    }

    return { rows: [] };
  }),
  connect: jest.fn(async () => ({
    query: jest.fn(async (sql, params = []) => {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      if (normalizedSql === 'BEGIN' || normalizedSql === 'COMMIT' || normalizedSql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (normalizedSql.includes('FOR UPDATE OF so')) {
        const [storeId] = params;
        const settledIds = new Set(mockDbState.settlementItems.map(si => si.seller_order_id));
        const rows = Array.from(mockDbState.sellerOrders.values())
          .filter(so => so.store_id === storeId && so.status !== 'CANCELLED' && !settledIds.has(so.id))
          .map(so => {
            const refunded = Array.from(mockDbState.returns.values())
              .filter(r => r.seller_order_id === so.id && ['APPROVED', 'ITEM_PICKED', 'COMPLETED'].includes(r.status))
              .reduce((s, r) => s + Number(r.refund_amount || 0), 0);
            return {
              seller_order_id: so.id,
              subtotal: so.subtotal,
              commission_fee: so.commission_fee,
              seller_payout_amount: so.seller_payout_amount,
              refunded_amount: refunded
            };
          });
        return { rows };
      }
      if (normalizedSql.startsWith('INSERT INTO settlements')) {
        const [storeId, cycle, totalSales, totalCommission, netPayable] = params;
        const settlement = {
          id: `stl-${mockDbState.settlements.length + 1}`,
          store_id: storeId,
          settlement_cycle: cycle,
          total_sales: totalSales,
          total_commission: totalCommission,
          total_tax_deducted: 0,
          net_payable: netPayable,
          status: 'PAID',
          settled_at: new Date().toISOString()
        };
        mockDbState.settlements.push(settlement);
        return { rows: [settlement] };
      }
      if (normalizedSql.startsWith('INSERT INTO settlement_items')) {
        const [settlementId, sellerOrderId, amount] = params;
        mockDbState.settlementItems.push({
          id: `si-${mockDbState.settlementItems.length + 1}`,
          settlement_id: settlementId,
          seller_order_id: sellerOrderId,
          amount
        });
        return { rows: [] };
      }
      return { rows: [] };
    }),
    release: jest.fn()
  })),
  on: jest.fn(),
  end: jest.fn()
};

jest.mock('../../db', () => mockPool);

jest.mock('../../src/services/notificationProducer', () => ({
  orderEvent: jest.fn().mockResolvedValue(true),
  returnResolved: jest.fn().mockResolvedValue(true),
  profileUpdated: jest.fn().mockResolvedValue(true),
  storeUpdated: jest.fn().mockResolvedValue(true),
  settingsChanged: jest.fn().mockResolvedValue(true)
}));

// Mock ListingService for Shabbir's Listing -> Admin Approval -> Publish step in the E2E chain
jest.mock('../../src/services/listing', () => ({
  createListing: jest.fn(async (storeId, body) => {
    const id = 'listing-e2e-1';
    const listing = {
      id,
      store_id: storeId,
      title: body.title || 'Premium Basmati Rice 5kg',
      mrp: Number(body.mrp || 600),
      sell_price: Number(body.sell_price || 500),
      stock_qty: Number(body.stock_qty || 20),
      status: 'DRAFT'
    };
    mockDbState.listings.set(id, listing);
    mockDbState.inventory.set(id, { listing_id: id, stock_quantity: listing.stock_qty, reserved_quantity: 0 });
    return listing;
  }),
  submitListing: jest.fn(async (storeId, id) => {
    const listing = mockDbState.listings.get(id);
    listing.status = 'PENDING_APPROVAL';
    return listing;
  }),
  adminReviewListing: jest.fn(async (storeId, id, status) => {
    const listing = mockDbState.listings.get(id);
    listing.status = status || 'APPROVED';
    return listing;
  }),
  publishListing: jest.fn(async (storeId, id) => {
    const listing = mockDbState.listings.get(id);
    listing.status = 'PUBLISHED';
    return listing;
  }),
  getListingById: jest.fn(async (storeId, id) => mockDbState.listings.get(id))
}));

// Mock minioService to avoid network call in tests
jest.mock('../../src/services/minioService', () => ({
  uploadImage: jest.fn().mockResolvedValue('http://mock-minio/image.png')
}));

const sellerRoutes = require('../../src/routes/seller');
const listingRoutes = require('../../src/routes/listing');
const { idempotencyStore } = require('../../src/middlewares/idempotency');
const { generateJwtToken } = require('../../src/utils/jwt');

const tokenSellerA = generateJwtToken({ id: 'user-seller-a', role: 'SELLER' });
const tokenSellerB = generateJwtToken({ id: 'user-seller-b', role: 'SELLER' });
const tokenSellerNoProfile = generateJwtToken({ id: 'user-no-profile', role: 'SELLER' });

const sellerAHeaders = {
  Authorization: `Bearer ${tokenSellerA}`,
  'x-store-id': '11111111-1111-1111-1111-111111111111'
};

const sellerBHeaders = {
  Authorization: `Bearer ${tokenSellerB}`,
  'x-store-id': '22222222-2222-2222-2222-222222222222'
};

const app = express();
app.use(express.json());
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/seller/listings', listingRoutes);

describe('DAY 7: Full Seller Flow E2E & Production Hardening Suite', () => {
  beforeEach(() => {
    resetMockDbState();
    idempotencyStore.clear();
    jest.clearAllMocks();
  });

  describe('1. Full Seller Flow E2E: Listing -> Admin Approved -> Purchase -> Accept -> Pack -> Ship -> Deliver -> Return -> Refund -> Settlement', () => {
    it('executes the complete cross-domain seller lifecycle end-to-end with accurate stock, refund, and settlement math', async () => {

      // STEP 1: Shabbir creates a listing with initial stock = 20, sell_price = 500
      const createRes = await request(app)
        .post('/api/v1/seller/listings')
        .set(sellerAHeaders)
        .send({ title: 'Premium Basmati Rice 5kg', mrp: 600, sell_price: 500, stock_qty: 20 });
      expect(createRes.status).toBe(201);
      expect(createRes.body.status).toBe('DRAFT');
      expect(createRes.body.stock_qty).toBe(20);
      const listingId = createRes.body.id;

      // STEP 2: Submit -> Admin Approve -> Publish
      const submitRes = await request(app)
        .post(`/api/v1/seller/listings/${listingId}/submit`)
        .set(sellerAHeaders);
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.status).toBe('PENDING_APPROVAL');

      const approveRes = await request(app)
        .post(`/api/v1/seller/listings/${listingId}/admin-review`)
        .set(sellerAHeaders)
        .send({ status: 'APPROVED' });
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('APPROVED');

      const publishRes = await request(app)
        .post(`/api/v1/seller/listings/${listingId}/publish`)
        .set(sellerAHeaders);
      expect(publishRes.status).toBe(200);
      expect(publishRes.body.status).toBe('PUBLISHED');

      // STEP 3: Customer places order for 2 units (₹1000 gross, ₹50 commission, ₹950 net payout)
      // Stock is deducted immediately upon order placement (20 -> 18)
      mockDbState.listings.get(listingId).stock_qty = 18;
      mockDbState.inventory.get(listingId).stock_quantity = 18;

      const orderId = 'ord-e2e-101';
      const sellerOrderId = 'so-e2e-101';
      mockDbState.orders.set(orderId, {
        id: orderId,
        order_number: 'ORD-E2E-101',
        customer_name: 'Aarav Patel',
        customer_phone: '9898989898',
        order_status: 'PLACED',
        payment_method: 'UPI',
        payment_status: 'PAID',
        delivery_mode: 'express_30m',
        grand_total: 1000,
        delivery_address: {
          full_name: 'Aarav Patel',
          address_line: 'Vesu Main Road',
          city: 'Surat',
          latitude: 21.1418,
          longitude: 72.7709
        },
        created_at: new Date().toISOString()
      });
      mockDbState.sellerOrders.set(sellerOrderId, {
        id: sellerOrderId,
        parent_order_id: orderId,
        store_id: '11111111-1111-1111-1111-111111111111',
        status: 'NEW',
        subtotal: 1000,
        commission_fee: 50,
        seller_payout_amount: 950,
        created_at: new Date().toISOString()
      });
      mockDbState.orderItems.push({
        id: 'oi-e2e-1',
        seller_order_id: sellerOrderId,
        listing_id: listingId,
        product_name: 'Premium Basmati Rice 5kg',
        quantity: 2,
        unit_price: 500,
        total_price: 1000
      });
      mockDbState.payments.set(orderId, {
        id: 'pay-e2e-101',
        order_id: orderId,
        amount: 1000,
        payment_method: 'UPI',
        status: 'COMPLETED'
      });

      // Verify order appears in Seller A's Orders dashboard as 'new'
      const ordersRes = await request(app)
        .get('/api/v1/seller/orders')
        .set(sellerAHeaders);
      expect(ordersRes.status).toBe(200);
      expect(ordersRes.body.data).toHaveLength(1);
      expect(ordersRes.body.data[0].id).toBe('ORD-E2E-101');
      expect(ordersRes.body.data[0].status).toBe('new');
      expect(ordersRes.body.data[0].amount).toBe(1000);

      // STEP 4: Seller Accepts Order (NEW -> ACCEPTED / packing)
      const acceptOrderRes = await request(app)
        .patch('/api/v1/seller/orders/ORD-E2E-101/status')
        .set({ ...sellerAHeaders, 'Idempotency-Key': 'idem-accept-101' })
        .send({ status: 'packing' });
      expect(acceptOrderRes.status).toBe(200);
      expect(acceptOrderRes.body.data.seller_order_status).toBe('ACCEPTED');
      // Stock remains 18 (not double-deducted on accept)
      expect(mockDbState.listings.get(listingId).stock_qty).toBe(18);

      // STEP 5: Seller Packs Order (ACCEPTED -> PACKED)
      const packOrderRes = await request(app)
        .patch('/api/v1/seller/orders/ORD-E2E-101/status')
        .set({ ...sellerAHeaders, 'Idempotency-Key': 'idem-pack-101' })
        .send({ status: 'packed' });
      expect(packOrderRes.status).toBe(200);
      expect(packOrderRes.body.data.seller_order_status).toBe('PACKED');

      // STEP 6: Seller Ships / Dispatches Order (PACKED -> DISPATCHED)
      const shipOrderRes = await request(app)
        .patch('/api/v1/seller/orders/ORD-E2E-101/status')
        .set({ ...sellerAHeaders, 'Idempotency-Key': 'idem-ship-101' })
        .send({ status: 'dispatched' });
      expect(shipOrderRes.status).toBe(200);
      expect(shipOrderRes.body.data.seller_order_status).toBe('DISPATCHED');

      // STEP 7: Seller Delivers Order (DISPATCHED -> DELIVERED)
      const deliverOrderRes = await request(app)
        .patch('/api/v1/seller/orders/ORD-E2E-101/status')
        .set({ ...sellerAHeaders, 'Idempotency-Key': 'idem-deliver-101' })
        .send({ status: 'delivered' });
      expect(deliverOrderRes.status).toBe(200);
      expect(deliverOrderRes.body.data.seller_order_status).toBe('DELIVERED');
      expect(mockDbState.orders.get(orderId).order_status).toBe('DELIVERED');

      // STEP 8: Customer initiates Return for 1 unit (₹500 refund)
      const returnId = 'ret1-e2e-0001-0000-000000000001';
      mockDbState.returns.set(returnId, {
        id: returnId,
        order_id: orderId,
        seller_order_id: sellerOrderId,
        customer_id: 'cust-1',
        reason: 'Ordered wrong pack size by mistake',
        status: 'REQUESTED',
        refund_amount: 500,
        requested_at: new Date().toISOString(),
        resolved_at: null
      });
      mockDbState.returnItems.push({
        id: 'ri-e2e-1',
        return_id: returnId,
        order_item_id: 'oi-e2e-1',
        quantity: 1,
        refund_amount: 500,
        item_condition: 'UNOPENED'
      });

      const returnsListRes = await request(app)
        .get('/api/v1/seller/returns')
        .set(sellerAHeaders);
      expect(returnsListRes.status).toBe(200);
      expect(returnsListRes.body.data).toHaveLength(1);
      expect(returnsListRes.body.data[0].status).toBe('pending');
      expect(returnsListRes.body.data[0].amount).toBe(500);

      // STEP 8A: Seller Approves Return (REQUESTED -> APPROVED, triggers REFUNDED on payment domain, stock stays 18)
      const approveReturnRes = await request(app)
        .patch(`/api/v1/seller/returns/${returnId}/status`)
        .set({ ...sellerAHeaders, 'Idempotency-Key': 'idem-ret-approve-1' })
        .send({ status: 'approved' });
      expect(approveReturnRes.status).toBe(200);
      expect(approveReturnRes.body.data.status).toBe('approved');
      expect(approveReturnRes.body.data.rawStatus).toBe('APPROVED');
      expect(approveReturnRes.body.data.paymentStatus).toBe('REFUNDED');
      expect(mockDbState.payments.get(orderId).status).toBe('REFUNDED');
      // Stock has NOT changed yet because item hasn't reached shop
      expect(mockDbState.listings.get(listingId).stock_qty).toBe(18);

      // STEP 8B: Item reaches store & Seller clicks "+ Add Back" (APPROVED -> COMPLETED + Restocks 1 unit: 18 -> 19)
      const restockReturnRes = await request(app)
        .patch(`/api/v1/seller/returns/${returnId}/status`)
        .set({ ...sellerAHeaders, 'Idempotency-Key': 'idem-ret-restock-1' })
        .send({ status: 'restocked' });
      expect(restockReturnRes.status).toBe(200);
      expect(restockReturnRes.body.data.status).toBe('restocked');
      expect(restockReturnRes.body.data.rawStatus).toBe('COMPLETED');
      expect(restockReturnRes.body.data.restockedQty).toBe(1);
      expect(restockReturnRes.body.data.currentListingStock).toBe(19);
      expect(mockDbState.listings.get(listingId).stock_qty).toBe(19);

      // STEP 9: Finance & Settlement Verification
      // Gross = 1000, Commission = 50, Net Payout = 950, Refunded = 500 => Unsettled Balance = 450
      const finSummaryBefore = await request(app)
        .get('/api/v1/seller/finance/summary')
        .set(sellerAHeaders);
      expect(finSummaryBefore.status).toBe(200);
      expect(finSummaryBefore.body.data.gross_sales).toBe(1000);
      expect(finSummaryBefore.body.data.total_commission).toBe(50);
      expect(finSummaryBefore.body.data.total_refunded).toBe(500);
      expect(finSummaryBefore.body.data.balance).toBe(450);

      // Withdraw unsettled balance to bank -> creates PAID settlement for ₹450
      const withdrawRes = await request(app)
        .post('/api/v1/seller/finance/withdraw')
        .set({ ...sellerAHeaders, 'Idempotency-Key': 'idem-withdraw-1' })
        .send({});
      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.data.net_payable).toBe(450);
      expect(withdrawRes.body.data.status).toBe('PAID');

      // After settlement, unsettled balance is 0 and settled_amount is 450
      const finSummaryAfter = await request(app)
        .get('/api/v1/seller/finance/summary')
        .set(sellerAHeaders);
      expect(finSummaryAfter.status).toBe(200);
      expect(finSummaryAfter.body.data.balance).toBe(0);
      expect(finSummaryAfter.body.data.settled_amount).toBe(450);
    });
  });

  describe('2. Day 6/7 Idempotency Key Replay Verification', () => {
    it('replays cached response with X-Idempotency-Replayed header without re-running DB mutations', async () => {
      const sellerAHeaders = {
        Authorization: `Bearer ${tokenSellerA}`,
        'x-store-id': '11111111-1111-1111-1111-111111111111',
        'Idempotency-Key': 'idem-duplicate-test-key'
      };

      mockDbState.orders.set('ord-idem-1', {
        id: 'ord-idem-1',
        order_number: 'ORD-IDEM-1',
        order_status: 'PLACED',
        grand_total: 250
      });
      mockDbState.sellerOrders.set('so-idem-1', {
        id: 'so-idem-1',
        parent_order_id: 'ord-idem-1',
        store_id: '11111111-1111-1111-1111-111111111111',
        status: 'NEW',
        subtotal: 250,
        commission_fee: 12.5,
        seller_payout_amount: 237.5
      });

      const firstRes = await request(app)
        .patch('/api/v1/seller/orders/ORD-IDEM-1/status')
        .set(sellerAHeaders)
        .send({ status: 'packing' });
      expect(firstRes.status).toBe(200);
      expect(firstRes.headers['x-idempotency-replayed']).toBe('false');

      const queryCountAfterFirst = mockDbState.queryLog.length;

      // Second identical call with same Idempotency-Key
      const secondRes = await request(app)
        .patch('/api/v1/seller/orders/ORD-IDEM-1/status')
        .set(sellerAHeaders)
        .send({ status: 'packing' });
      expect(secondRes.status).toBe(200);
      expect(secondRes.headers['x-idempotency-replayed']).toBe('true');
      expect(secondRes.body).toEqual(firstRes.body);
      // Only 1 auth verification query executed; zero additional mutation DB queries executed on replay
      expect(mockDbState.queryLog.length).toBe(queryCountAfterFirst + 1);
    });
  });

  describe('3. Authorization Audit (Cross-Seller Data Leak Prevention) & HTTP Error Codes (400, 401, 403, 404, 422)', () => {
    beforeEach(() => {
      // Seed an order, return, and Khata PO belonging to Seller A's store (11111111-1111-1111-1111-111111111111)
      mockDbState.orders.set('ord-a-1', {
        id: 'ord-a-1',
        order_number: 'ORD-STORE-A',
        order_status: 'PLACED',
        grand_total: 500
      });
      mockDbState.sellerOrders.set('so-a-1', {
        id: 'so-a-1',
        parent_order_id: 'ord-a-1',
        store_id: '11111111-1111-1111-1111-111111111111',
        status: 'NEW',
        subtotal: 500,
        commission_fee: 25,
        seller_payout_amount: 475
      });
      mockDbState.returns.set('ret-store-a-uuid', {
        id: 'ret-store-a-uuid',
        order_id: 'ord-a-1',
        seller_order_id: 'so-a-1',
        reason: 'Damaged pack',
        status: 'REQUESTED',
        refund_amount: 500
      });
      mockDbState.b2bPurchaseOrders.set('po-store-a', {
        id: 'po-store-a',
        buyer_store_id: '11111111-1111-1111-1111-111111111111',
        total_amount: 5000,
        payment_terms: 'CREDIT_14D'
      });
    });

    it('returns 401 Unauthorized when missing credentials or when an invalid Bearer token is provided (no default seller fallback)', async () => {
      const noAuthRes = await request(app).get('/api/v1/seller/orders');
      expect(noAuthRes.status).toBe(401);
      expect(noAuthRes.body.success).toBe(false);

      const res = await request(app)
        .get('/api/v1/seller/orders')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 Forbidden when Seller B attempts to spoof Seller A store header', async () => {
      const res = await request(app)
        .get('/api/v1/seller/orders')
        .set({
          Authorization: `Bearer ${tokenSellerB}`,
          'x-store-id': '11111111-1111-1111-1111-111111111111' // Store A's ID!
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden: Cross-seller store access denied/i);
    });

    it('returns 403 Forbidden when Seller B attempts to mutate Seller A order, return, or Khata PO', async () => {
      const sellerBHeaders = {
        Authorization: `Bearer ${tokenSellerB}`,
        'x-store-id': '22222222-2222-2222-2222-222222222222'
      };

      // Seller B cannot see Seller A's orders
      const listRes = await request(app)
        .get('/api/v1/seller/orders')
        .set(sellerBHeaders);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(0);

      // Seller B cannot update Seller A's order status
      const orderRes = await request(app)
        .patch('/api/v1/seller/orders/ORD-STORE-A/status')
        .set(sellerBHeaders)
        .send({ status: 'packing' });
      expect(orderRes.status).toBe(403);

      // Seller B cannot approve Seller A's return request
      const returnRes = await request(app)
        .patch('/api/v1/seller/returns/ret-store-a-uuid/status')
        .set(sellerBHeaders)
        .send({ status: 'approved' });
      expect(returnRes.status).toBe(403);

      // Seller B cannot pay Seller A's Khata purchase order
      const khataRes = await request(app)
        .post('/api/v1/seller/finance/khata/po-store-a/pay')
        .set(sellerBHeaders)
        .send({});
      expect(khataRes.status).toBe(403);
    });

    it('returns 400 Bad Request when required parameters are missing', async () => {
      const res = await request(app)
        .patch('/api/v1/seller/orders/ORD-STORE-A/status')
        .set(sellerAHeaders)
        .send({}); // missing status
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Order ID and status are required/i);
    });

    it('returns 404 Not Found when querying or updating non-existent resources', async () => {
      const order404 = await request(app)
        .patch('/api/v1/seller/orders/ORD-DOES-NOT-EXIST/status')
        .set(sellerAHeaders)
        .send({ status: 'packing' });
      expect(order404.status).toBe(404);

      const return404 = await request(app)
        .patch('/api/v1/seller/returns/RET-DOES-NOT-EXIST/status')
        .set(sellerAHeaders)
        .send({ status: 'approved' });
      expect(return404.status).toBe(404);

      const profile404 = await request(app)
        .get('/api/v1/seller/profile')
        .set({ Authorization: `Bearer ${tokenSellerNoProfile}` });
      expect(profile404.status).toBe(404);
    });

    it('returns 422 Unprocessable Entity on invalid state values or zero-balance withdrawal', async () => {
      const invalidOrderStatus = await request(app)
        .patch('/api/v1/seller/orders/ORD-STORE-A/status')
        .set(sellerAHeaders)
        .send({ status: 'teleported_to_mars' });
      expect(invalidOrderStatus.status).toBe(422);

      const invalidReturnStatus = await request(app)
        .patch('/api/v1/seller/returns/ret-store-a-uuid/status')
        .set(sellerAHeaders)
        .send({ status: 'unknown_action' });
      expect(invalidReturnStatus.status).toBe(422);

      // Seller B has 0 unsettled orders -> withdrawal returns 422
      const emptyWithdraw = await request(app)
        .post('/api/v1/seller/finance/withdraw')
        .set(sellerBHeaders)
        .send({});
      expect(emptyWithdraw.status).toBe(422);
    });
  });

  describe('4. Pagination, Filters, SQL Parameterization (SQL Injection Prevention) & Rate Limiting', () => {
    it('parameterizes pagination, status, and search filters safely against SQL injection payloads', async () => {
      const sqlInjectionPayload = "'; DROP TABLE orders; --";

      const res = await request(app)
        .get('/api/v1/seller/orders')
        .set(sellerAHeaders)
        .query({
          status: 'NEW',
          search: sqlInjectionPayload,
          limit: 15,
          page: 2
        });

      expect(res.status).toBe(200);
      const orderQuery = mockDbState.queryLog.find(q => q.sql.includes('LIMIT $4::int OFFSET $5::int'));
      expect(orderQuery).toBeDefined();
      // SQL query string never contains raw user input; payload is bound strictly in params array
      expect(orderQuery.sql).not.toContain('DROP TABLE');
      expect(orderQuery.params).toEqual([
        '11111111-1111-1111-1111-111111111111',
        'NEW',
        `%${sqlInjectionPayload}%`,
        15,
        15 // offset = (page 2 - 1) * limit 15
      ]);
    });

    it('enforces rate limiting and returns 429 Too Many Requests when threshold is exceeded', async () => {
      const rateLimitedApp = express();
      const strictLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false
      });
      rateLimitedApp.use('/api/', strictLimiter);
      rateLimitedApp.get('/api/ping', (req, res) => res.json({ ok: true }));

      const r1 = await request(rateLimitedApp).get('/api/ping');
      const r2 = await request(rateLimitedApp).get('/api/ping');
      const r3 = await request(rateLimitedApp).get('/api/ping');

      expect(r1.status).toBe(200);
      expect(r1.headers['ratelimit-limit']).toBe('2');
      expect(r2.status).toBe(200);
      expect(r3.status).toBe(429);
    });
  });
});
