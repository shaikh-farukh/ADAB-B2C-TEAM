const request = require('supertest');
process.env.JWT_SECRET = 'testsecret'; // Set before require('../server')
const app = require('../server');
const jwt = require('jsonwebtoken');

// Mock db calls if needed, or rely on actual db handling.
jest.mock('../db', () => {
  return {
    query: jest.fn().mockImplementation((q) => {
      if (q.includes('admin_notifications')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [{ total: 10, active: 5, pending: 2, count: 0 }] });
    })
  };
});

describe('Admin APIs', () => {
  let token;
  let nonAdminToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'testsecret';
    token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET);
    nonAdminToken = jwt.sign({ userId: 2, role: 'customer' }, process.env.JWT_SECRET);
  });

  it('should reject unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('should reject non-admin access', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${nonAdminToken}`);
    expect(res.status).toBe(403);
  });

  it('should get dashboard data', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalSellers');
    expect(res.body).toHaveProperty('activeSellers');
  });

  it('should get notifications', async () => {
    const res = await request(app)
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
