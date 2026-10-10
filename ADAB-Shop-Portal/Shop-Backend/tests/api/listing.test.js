const request = require('supertest');
const express = require('express');

// Mock db BEFORE importing routes
jest.mock('../../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
}));

// Mock minio to avoid errors
jest.mock('../../src/services/minioService', () => ({
  uploadImage: jest.fn().mockResolvedValue('http://mock-minio/image.png')
}));

const listingRoutes = require('../../src/routes/listing');

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

// Mock the listing service
jest.mock('../../src/services/listing', () => ({
  createListing: jest.fn().mockResolvedValue({ id: '1', title: 'New Listing' }),
  getListings: jest.fn().mockResolvedValue([{ id: '1', title: 'Listing 1' }]),
  getListingById: jest.fn().mockResolvedValue({ id: '1', title: 'Listing 1' }),
  updateListing: jest.fn().mockResolvedValue({ id: '1', title: 'Updated Listing' }),
  deleteListing: jest.fn().mockResolvedValue(true),
  submitListing: jest.fn().mockResolvedValue({ id: '1', status: 'PENDING_APPROVAL' }),
  adminStartReview: jest.fn().mockResolvedValue({ id: '1', status: 'IN_REVIEW' }),
  adminReviewListing: jest.fn().mockResolvedValue({ id: '1', status: 'APPROVED' }),
  publishListing: jest.fn().mockResolvedValue({ id: '1', status: 'PUBLISHED' }),
  getApprovalHistory: jest.fn().mockResolvedValue([]),
  addDocument: jest.fn().mockResolvedValue({ id: 'doc1' }),
  deleteImage: jest.fn().mockResolvedValue(true),
  getListingIssues: jest.fn().mockResolvedValue([])
}));

app.use('/api/v1/seller/listings', listingRoutes);

describe('Listing API Routes (Supertest)', () => {
  afterAll(async () => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/seller/listings should return listings', async () => {
    const res = await request(app).get('/api/v1/seller/listings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/v1/seller/listings should create listing', async () => {
    const res = await request(app).post('/api/v1/seller/listings').send({ title: 'New' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Listing');
  });

  it('GET /api/v1/seller/listings/:id should return single listing', async () => {
    const res = await request(app).get('/api/v1/seller/listings/1');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Listing 1');
  });

  it('PATCH /api/v1/seller/listings/:id should update listing', async () => {
    const res = await request(app).patch('/api/v1/seller/listings/1').send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Listing');
  });

  it('POST /api/v1/seller/listings/:id/submit should submit listing', async () => {
    const res = await request(app).post('/api/v1/seller/listings/1/submit');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_APPROVAL');
  });

  it('DELETE /api/v1/seller/listings/:id should delete listing', async () => {
    const res = await request(app).delete('/api/v1/seller/listings/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
