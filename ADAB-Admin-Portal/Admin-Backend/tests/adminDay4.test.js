const request = require('supertest');
const app = require('../server');

describe('Admin Orders & Returns API (Day-4)', () => {
  let adminToken;

  beforeAll(async () => {
    // Get dev token
    const res = await request(app).post('/api/v1/admin/dev-login');
    adminToken = res.body.token;
  });

  describe('Orders Integration', () => {
    let testOrderId;

    it('should list orders with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      if (res.body.data.length > 0) {
        testOrderId = res.body.data[0].id;
      }
    });

    it('should get order details by ID', async () => {
      if (!testOrderId) return; // Skip if no orders
      const res = await request(app)
        .get(`/api/v1/admin/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update order status', async () => {
      if (!testOrderId) return;
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'OUT_FOR_DELIVERY', notes: 'Dispatched to delivery partner' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order_status).toBe('OUT_FOR_DELIVERY');
    });

    it('should validate invalid order status', async () => {
      if (!testOrderId) return;
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Returns Integration', () => {
    it('should list returns with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/returns')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('should get return details by ID', async () => {
      const res = await request(app)
        .get('/api/v1/admin/returns/ret-201')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order_number).toBe('ORD-1001-A');
    });

    it('should resolve a return (reject without reason fails)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/returns/ret-201/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'reject' });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Rejection reason is required');
    });

    it('should resolve a return (approve successfully)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/returns/ret-201/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'approve' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });
});
