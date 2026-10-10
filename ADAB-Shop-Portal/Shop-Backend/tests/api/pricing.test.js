const request = require('supertest');
const express = require('express');

// Mock db
jest.mock('../../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
}));

const pricingRoutes = require('../../src/routes/pricing');

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
jest.mock('../../src/controllers/pricingController', () => ({
  getPricing: (req, res) => res.json([{ id: '1', price: 100 }]),
  updateBulkPricing: (req, res) => res.status(200).json({ success: true }),
  updateListingPricing: (req, res) => res.json({ id: req.params.listingId, price: 150 }),
  getPricingHistory: (req, res) => res.json([]),
  previewPricing: (req, res) => res.json({ final_price: 150 }),
  schedulePricing: (req, res) => res.status(201).json({ id: '1' }),
  deleteSchedule: (req, res) => res.json({ success: true }),
}));

app.use('/api/v1/seller/pricing', pricingRoutes);

describe('Pricing API Routes (Supertest)', () => {
  it('GET /api/v1/seller/pricing', async () => {
    const res = await request(app).get('/api/v1/seller/pricing');
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/seller/pricing/bulk', async () => {
    const res = await request(app).post('/api/v1/seller/pricing/bulk').send({ updates: [] });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/v1/seller/pricing/:listingId', async () => {
    const res = await request(app).patch('/api/v1/seller/pricing/1').send({ price: 150 });
    expect(res.status).toBe(200);
  });
});
