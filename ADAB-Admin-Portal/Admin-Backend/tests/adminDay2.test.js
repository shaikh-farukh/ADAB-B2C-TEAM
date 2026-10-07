const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock db BEFORE importing server
jest.mock('../db', () => ({
  query: jest.fn().mockImplementation((q) => {
    if (q.toLowerCase().includes('count(*) over()')) {
      return Promise.resolve({ rows: [{ full_count: '1', id: 1, email: 'test@test.com', status: 'PENDING' }] });
    }
    if (q.includes('UPDATE')) {
      return Promise.resolve({ rows: [{ id: 1, status: 'ACTIVE' }] });
    }
    return Promise.resolve({ rows: [{ id: 1, email: 'test@test.com', status: 'PENDING' }] });
  })
}));

process.env.JWT_SECRET = 'testsecret';
const app = require('../server');

describe('Admin APIs - Day 2 (Approvals, Sellers, Customers)', () => {
  let token;

  beforeAll(() => {
    process.env.JWT_SECRET = 'testsecret';
    token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET);
  });

  describe('Sellers API', () => {
    it('should fetch sellers with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sellers?page=1&pageSize=10')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('should update seller status', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/sellers/1/status')
        .send({ status: 'ACTIVE' })
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Customers API', () => {
    it('should fetch customers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should update customer status', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/customers/1/status')
        .send({ status: 'LOCKED' })
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Approvals API', () => {
    it('should fetch pending approvals', async () => {
      const res = await request(app)
        .get('/api/v1/admin/approvals?type=seller')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should approve an entity', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/approvals/1')
        .send({ type: 'seller', action: 'approve' })
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
