const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../db');

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

process.env.JWT_SECRET = 'testsecret';
const app = require('../server');

describe('Admin Day-7 Hardening & Security', () => {
  let token;
  let nonAdminToken;

  beforeAll(() => {
    token = jwt.sign({ userId: 1, role: 'admin', permissions: ['*'] }, process.env.JWT_SECRET);
    nonAdminToken = jwt.sign({ userId: 2, role: 'seller', permissions: [] }, process.env.JWT_SECRET);
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization & RBAC', () => {
    it('GET /api/v1/admin/sellers should reject unauthorized non-admin role', async () => {
      const res = await request(app).get('/api/v1/admin/sellers').set('Authorization', `Bearer ${nonAdminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PII Masking', () => {
    it('GET /api/v1/admin/sellers should mask emails and phone numbers', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ 
          id: 1, 
          full_name: 'John Doe', 
          email: 'johndoe@example.com', 
          phone: '+1234567890',
          status: 'ACTIVE',
          user_type: 'SELLER'
        }]
      });
      const res = await request(app).get('/api/v1/admin/sellers').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].email).toBe('j***e@example.com');
      expect(res.body.data[0].phone).toBe('+12****890');
    });

    it('GET /api/v1/admin/customers should mask emails and phone numbers', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ 
          id: 1, 
          full_name: 'Jane Smith', 
          email: 'jane@test.com', 
          phone: '9876543210',
          status: 'ACTIVE',
          user_type: 'CUSTOMER'
        }]
      });
      const res = await request(app).get('/api/v1/admin/customers').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].email).toBe('j***e@test.com');
      expect(res.body.data[0].phone).toBe('987****210');
    });
  });

  describe('Status Mutations (Suspended, Rejected, Duplicate)', () => {
    it('PATCH /api/v1/admin/sellers/1/status should handle SUSPENDED seller', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'SUSPENDED', email: 'x@test.com', user_type: 'SELLER' }]
      });
      const res = await request(app)
        .patch('/api/v1/admin/sellers/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SUSPENDED');
    });
  });

  describe('Rate Limiting', () => {
    // Note: To test rate limiting reliably without blocking other tests if memory leaks,
    // we would spam an endpoint 101 times. We will just do a conceptual test here 
    // or run it in a separate express instance, but we can hit /api/health directly
    // Wait, supertest doesn't persist IPs reliably, or we can set it.
    it('Should block after 100 requests (Rate Limit)', async () => {
      // Mock db connection to just return quickly
      pool.query.mockResolvedValue({ rows: [{ db_time: new Date() }] });
      
      let res;
      // Depending on test speed, hitting 101 requests might be slow but it's local memory.
      for (let i = 0; i < 101; i++) {
        res = await request(app).get('/api/health').set('X-Forwarded-For', '192.168.1.100');
      }
      expect(res.status).toBe(429); // Too Many Requests
    });
  });
});
