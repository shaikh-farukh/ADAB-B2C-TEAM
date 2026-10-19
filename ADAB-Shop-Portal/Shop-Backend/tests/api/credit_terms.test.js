const request = require('supertest');
const express = require('express');

jest.mock('../../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
}));

jest.mock('../../src/middlewares/auth', () => ({
  requireSellerAuth: (req, res, next) => {
    req.user = { id: '00000000-0000-0000-0000-000000000001', role: 'seller' };
    req.headers['x-user-id'] = '00000000-0000-0000-0000-000000000001';
    req.headers['x-store-id'] = '00000000-0000-0000-0000-000000000001';
    next();
  },
  getAuthenticatedSellerContext: (req) => ({
    userId: '00000000-0000-0000-0000-000000000001',
    storeId: '00000000-0000-0000-0000-000000000001',
    roles: ['seller']
  })
}));

const mockCreditData = {
  rules: {
    id: 'rule-test-1',
    store_id: '00000000-0000-0000-0000-000000000001',
    enable_credit: true,
    credit_days: 14,
    min_order_amount: 5000,
    max_limit_per_store: 50000,
    max_stores_count: 10,
    total_exposure_cap: 300000,
    buy_max_shops: 5,
    buy_max_per_shop: 25000
  },
  give_metrics: {
    stores_count: 1,
    max_stores: 10,
    exposure_used: 12000,
    total_cap: 300000,
    stores_on_credit: [
      {
        store_id: 'buyer-1',
        store_name: 'Test Buyer Store',
        amount_owed: 12000,
        days_left: 10,
        credit_days: 14
      }
    ]
  },
  receive_metrics: {
    active_shops_count: 1,
    max_shops: 5,
    total_owed: 4500,
    seller_credits: [
      {
        store_id: 'supp-1',
        store_name: 'Test Supplier Store',
        credit_days: 14,
        limit: 25000,
        amount_owed: 4500
      }
    ]
  },
  adab_line: {
    total_limit: 250000,
    utilized_amount: 4500,
    available_amount: 245500,
    interest: '0% for 14 days',
    gstin_verified: true,
    status: 'Active'
  }
};

jest.mock('../../src/services/seller', () => ({
  getSellerStore: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' }),
  getStoreCreditRules: jest.fn(),
  updateCreditGiveTerms: jest.fn(),
  updateCreditBuyLimits: jest.fn()
}));

const sellerService = require('../../src/services/seller');
const sellerRoutes = require('../../src/routes/seller');

const app = express();
app.use(express.json());
app.use('/api/v1/seller', sellerRoutes);

describe('Store Credit Rules API Endpoints', () => {
  beforeEach(() => {
    sellerService.getStoreCreditRules.mockResolvedValue(mockCreditData);
    sellerService.updateCreditGiveTerms.mockImplementation((userId, storeId, terms) => Promise.resolve({
      ...mockCreditData,
      rules: {
        ...mockCreditData.rules,
        credit_days: terms.credit_days || 14,
        min_order_amount: terms.min_order_amount || 5000
      }
    }));
    sellerService.updateCreditBuyLimits.mockImplementation((userId, storeId, limits) => Promise.resolve({
      ...mockCreditData,
      rules: {
        ...mockCreditData.rules,
        buy_max_shops: limits.buy_max_shops || 5,
        buy_max_per_shop: limits.buy_max_per_shop || 25000
      }
    }));
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/seller/credit-terms should return dynamic store credit rules and metrics', async () => {
    const res = await request(app)
      .get('/api/v1/seller/credit-terms')
      .set('x-user-id', '00000000-0000-0000-0000-000000000001')
      .set('x-store-id', '00000000-0000-0000-0000-000000000001');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rules.credit_days).toBe(14);
    expect(res.body.data.give_metrics.exposure_used).toBe(12000);
    expect(res.body.data.adab_line.total_limit).toBe(250000);
  });

  it('PUT /api/v1/seller/credit-terms/give should update credit give terms', async () => {
    const res = await request(app)
      .put('/api/v1/seller/credit-terms/give')
      .set('x-user-id', '00000000-0000-0000-0000-000000000001')
      .set('x-store-id', '00000000-0000-0000-0000-000000000001')
      .send({
        credit_days: 21,
        min_order_amount: 10000,
        max_limit_per_store: 60000,
        max_stores_count: 15,
        total_exposure_cap: 500000
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rules.credit_days).toBe(21);
    expect(res.body.data.rules.min_order_amount).toBe(10000);
  });

  it('PUT /api/v1/seller/credit-terms/buy should update buyer credit limits', async () => {
    const res = await request(app)
      .put('/api/v1/seller/credit-terms/buy')
      .set('x-user-id', '00000000-0000-0000-0000-000000000001')
      .set('x-store-id', '00000000-0000-0000-0000-000000000001')
      .send({
        buy_max_shops: 8,
        buy_max_per_shop: 35000
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rules.buy_max_shops).toBe(8);
    expect(res.body.data.rules.buy_max_per_shop).toBe(35000);
  });
});
