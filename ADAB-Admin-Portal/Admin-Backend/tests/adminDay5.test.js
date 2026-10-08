const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => ({
  query: jest.fn().mockImplementation((q) => {
    if (q.toLowerCase().includes('count(*) over()')) {
      return Promise.resolve({ rows: [{ full_count: '1', id: 1, email: 'test@test.com', status: 'PENDING' }] });
    }
    return Promise.resolve({ rows: [{ id: 1, email: 'test@test.com', status: 'PENDING' }] });
  })
}));

process.env.JWT_SECRET = 'testsecret';
const app = require('../server');

describe('Admin Day-5 Platform Contracts', () => {
  let token;

  beforeAll(() => {
    process.env.JWT_SECRET = 'testsecret';
    token = jwt.sign({ userId: 1, role: 'ADMIN', permissions: ['settings:write', 'audit:read', 'catalog:write'] }, process.env.JWT_SECRET);
  });

  describe('Health & Readiness', () => {
    it('GET /api/health should return ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
