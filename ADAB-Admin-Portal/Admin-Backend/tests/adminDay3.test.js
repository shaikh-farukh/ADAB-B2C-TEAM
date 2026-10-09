const request = require('supertest');
const app = require('../server'); // Assuming server.js exports the app

describe('Admin Product Endpoints (Day-3)', () => {
  let token;

  beforeAll(async () => {
    const jwt = require('jsonwebtoken');
    token = jwt.sign(
      { userId: 'admin-dev', role: 'SUPER_ADMIN', user_type: 'ADMIN', permissions: ['catalog:read', 'catalog:write', 'catalog:approve'] },
      process.env.JWT_SECRET || 'adab-secret-key-change-in-prod'
    );
  });

  it('should fetch products with default pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('should filter products by status', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products?status=true')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch product details for existing product', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products/p-101')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should update listing status to APPROVED', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/products/b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'APPROVE' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject a product with reason', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/products/c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'REJECT', rejection_reason: 'Incomplete information' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should fail to reject a product without reason', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/products/c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'REJECT' });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });
});
