const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockClient = {
  query: jest.fn().mockResolvedValue({ rows: [{ id: 1, status: 'UPDATED' }] }),
  release: jest.fn()
};

jest.mock('../db', () => ({
  query: jest.fn().mockImplementation((q) => {
    if (q.toLowerCase().includes('count(*) over()')) {
      return Promise.resolve({ rows: [{ full_count: '1', id: 1, email: 'test@test.com', status: 'PENDING' }] });
    }
    return Promise.resolve({ rows: [{ id: 1, email: 'test@test.com', status: 'PENDING' }] });
  }),
  connect: jest.fn().mockResolvedValue(mockClient)
}));

process.env.JWT_SECRET = 'testsecret';
const app = require('../server');

describe('Admin Day-5 & Day-6 Cross-Portal & Security Integration', () => {
  let adminToken;
  let auditorToken;

  beforeAll(() => {
    adminToken = jwt.sign(
      { userId: 'admin-1', user_type: 'ADMIN', role: 'ADMIN', permissions: ['catalog:read', 'catalog:write', 'catalog:approve', 'orders:read', 'orders:write', 'returns:read', 'returns:write'] },
      process.env.JWT_SECRET || 'adab-secret-key-change-in-prod'
    );
    auditorToken = jwt.sign(
      { userId: 'auditor-1', user_type: 'ADMIN', role: 'COMPLIANCE_AUDITOR', permissions: ['catalog:read', 'orders:read', 'returns:read'] },
      process.env.JWT_SECRET || 'adab-secret-key-change-in-prod'
    );
  });

  describe('Health & Readiness', () => {
    it('GET /api/health should return ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Endpoint-level RBAC & Permission Verification', () => {
    it('rejects unauthenticated requests to protected endpoints', async () => {
      const res = await request(app).get('/api/v1/admin/orders');
      expect(res.status).toBe(401);
    });

    it('denies mutation access for read-only COMPLIANCE_AUDITOR role', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/orders/ord-101/status')
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({ status: 'DELIVERED' });
      expect(res.status).toBe(403);
    });

    it('allows SUPER_ADMIN to perform order status mutation', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/orders/ord-101/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELIVERED', notes: 'Delivered by admin' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Approval Queue & Idempotent State Transitions', () => {
    it('fetches approval queue items', async () => {
      const res = await request(app)
        .get('/api/v1/admin/approvals/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('executes item approval with outbox event and audit tracking', async () => {
      const targetId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const res = await request(app)
        .post(`/api/v1/admin/approvals/${targetId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Verified compliance' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects duplicate/invalid state transitions idempotently', async () => {
      const targetId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const res = await request(app)
        .post(`/api/v1/admin/approvals/${targetId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ current_status: 'APPROVED', notes: 'Re-approve attempt' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('SAME_STATE_TRANSITION');
    });
  });

  describe('Returns & Resolutions Oversight', () => {
    it('fetches returns list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/returns')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('resolves return request safely', async () => {
      const res = await request(app)
        .post('/api/v1/admin/returns/ret-001/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'approve', notes: 'Refund authorized' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Day 5 Platform Offers APIs', () => {
    it('fetches platform offers list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/offers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('creates a new platform coupon offer', async () => {
      const res = await request(app)
        .post('/api/v1/admin/offers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'FESTIVE20',
          title: 'Festive 20% Discount',
          discount_type: 'PERCENTAGE',
          discount_value: 20,
          min_order_amount: 500
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code || res.body.data.offer?.code).toBe('FESTIVE20');
    });

    it('validates offer code eligibility', async () => {
      const res = await request(app)
        .post('/api/v1/admin/offers/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'WELCOME50', cart_amount: 300 });
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.discount_amount).toBe(100); // capped at 100
    });
  });
});

