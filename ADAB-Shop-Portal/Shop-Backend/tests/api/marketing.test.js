const request = require('supertest');
const express = require('express');

// Mock db
jest.mock('../../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
}));

const marketingRoutes = require('../../src/routes/marketing');

const app = express();
app.use(express.json());

// Auth mock
jest.mock('../../src/middlewares/auth', () => ({
  requireSellerAuth: (req, res, next) => next(),
  getAuthenticatedSellerContext: (req) => ({
    userId: '1',
    storeId: '1',
    roles: ['seller']
  })
}));

// Mock controller
jest.mock('../../src/controllers/marketingController', () => ({
  getPromotions: (req, res) => res.json([{ id: '1', title: 'Promo 1' }]),
  createPromotion: (req, res) => res.status(201).json({ id: '1', title: req.body.title }),
  updatePromotion: (req, res) => res.json({ id: '1', title: req.body.title }),
  deletePromotion: (req, res) => res.json({ success: true }),
  getCoupons: (req, res) => res.json([{ id: '1', code: 'CODE1' }]),
  createCoupon: (req, res) => res.status(201).json({ id: '1', code: req.body.code }),
  updateCoupon: (req, res) => res.json({ id: '1', code: req.body.code }),
}));

app.use('/api/v1/seller', marketingRoutes);

describe('Marketing API Routes (Supertest)', () => {
  it('GET /api/v1/seller/promotions', async () => {
    const res = await request(app).get('/api/v1/seller/promotions');
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/seller/promotions', async () => {
    const res = await request(app).post('/api/v1/seller/promotions').send({ title: 'New' });
    expect(res.status).toBe(201);
  });

  it('PATCH /api/v1/seller/promotions/:id', async () => {
    const res = await request(app).patch('/api/v1/seller/promotions/1').send({ title: 'Updated' });
    expect(res.status).toBe(200);
  });

  it('DELETE /api/v1/seller/promotions/:id', async () => {
    const res = await request(app).delete('/api/v1/seller/promotions/1');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/seller/coupons', async () => {
    const res = await request(app).get('/api/v1/seller/coupons');
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/seller/coupons', async () => {
    const res = await request(app).post('/api/v1/seller/coupons').send({ code: 'CODE2' });
    expect(res.status).toBe(201);
  });

  it('PATCH /api/v1/seller/coupons/:id', async () => {
    const res = await request(app).patch('/api/v1/seller/coupons/1').send({ code: 'CODE3' });
    expect(res.status).toBe(200);
  });
});
