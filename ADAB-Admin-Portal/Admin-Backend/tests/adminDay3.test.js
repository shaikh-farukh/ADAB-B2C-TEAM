const request = require('supertest');
const app = require('../server'); // Assuming server.js exports the app

describe('Admin Product Endpoints (Day-3)', () => {
  let token;

  beforeAll(async () => {
    // Generate a test token
    const res = await request(app).post('/api/v1/admin/dev-login');
    token = res.body.token;
  });

  it('should fetch products with default pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products).toBeInstanceOf(Array);
  });

  it('should filter products by status', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products?status=PENDING')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.products.every(p => p.status === 'PENDING')).toBe(true);
  });

  it('should fetch product details for existing product', async () => {
    const res = await request(app)
      .get('/api/v1/admin/products/prod-001')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toEqual('prod-001');
  });

  it('should approve a product', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products/prod-002/approve')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product.status).toEqual('LIVE');
  });

  it('should reject a product with reason', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products/prod-005/reject')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Incomplete information' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product.status).toEqual('REJECTED');
    expect(res.body.product.moderationReason).toEqual('Incomplete information');
  });

  it('should fail to reject a product without reason', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products/prod-005/reject')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });
});
