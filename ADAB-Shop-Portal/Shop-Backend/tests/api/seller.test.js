const request = require('supertest');
const express = require('express');

// Mock db BEFORE importing routes
jest.mock('../../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
}));

const sellerRoutes = require('../../src/routes/seller');

const app = express();
app.use(express.json());

// Mocking the auth middleware to pass through a dummy user
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

// Mock the seller service so we don't actually hit the DB
jest.mock('../../src/services/seller', () => ({
  getSellerProfile: jest.fn().mockResolvedValue({ id: '1', name: 'Test Profile' }),
  getSellerStore: jest.fn().mockResolvedValue({ id: '1', name: 'Test Store' }),
  updateSellerProfile: jest.fn().mockResolvedValue({ id: '1', name: 'Updated Profile' }),
  updateSellerStore: jest.fn().mockResolvedValue({ id: '1', name: 'Updated Store' }),
  getSellerSettings: jest.fn().mockResolvedValue({ notifications: true }),
  updateSellerSettings: jest.fn().mockResolvedValue({ notifications: false }),
  getDashboardMetrics: jest.fn().mockResolvedValue({ sales: 100 }),
  getThreads: jest.fn().mockResolvedValue([]),
  getThreadMessages: jest.fn().mockResolvedValue([]),
  sendThreadMessage: jest.fn().mockResolvedValue({ id: 'msg1' }),
  markThreadRead: jest.fn().mockResolvedValue({ success: true }),
}));

app.use('/api/v1/seller', sellerRoutes);

describe('Seller API Routes (Supertest)', () => {
  afterAll(async () => {
    // Clear mocks
    jest.clearAllMocks();
  });

  it('GET /api/v1/seller/profile should return profile', async () => {
    const res = await request(app).get('/api/v1/seller/profile');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Profile');
  });

  it('PATCH /api/v1/seller/profile should update profile', async () => {
    const res = await request(app).patch('/api/v1/seller/profile').send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Profile');
  });

  it('GET /api/v1/seller/store should return store', async () => {
    const res = await request(app).get('/api/v1/seller/store');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Store');
  });

  it('PATCH /api/v1/seller/store should update store', async () => {
    const res = await request(app).patch('/api/v1/seller/store').send({ name: 'New Store' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Store');
  });

  it('GET /api/v1/seller/settings should return settings', async () => {
    const res = await request(app).get('/api/v1/seller/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toBe(true);
  });

  it('PATCH /api/v1/seller/settings should update settings', async () => {
    const res = await request(app).patch('/api/v1/seller/settings').send({ notifications: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toBe(false);
  });

  it('GET /api/v1/seller/dashboard should return metrics', async () => {
    const res = await request(app).get('/api/v1/seller/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sales).toBe(100);
  });
});
