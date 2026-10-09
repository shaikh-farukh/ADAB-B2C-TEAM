const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../db');

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

process.env.JWT_SECRET = 'testsecret';
const app = require('../server');

describe('Admin Day-5 Platform Contracts', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ userId: 1, role: 'admin', permissions: ['settings:write', 'audit:read', 'catalog:write'] }, process.env.JWT_SECRET || 'adab-secret-key-change-in-prod');
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health & Readiness', () => {
    it('GET /api/health should return ok status', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ db_time: new Date() }] });
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Offers API', () => {
    it('GET /api/v1/admin/offers should fetch from DB', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: '1', title: 'DISCOUNT', end_date: '2026-10-10', is_active: true }]
      });
      const res = await request(app).get('/api/v1/admin/offers').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].code).toBe('DISCOUNT');
      expect(res.body.data[0].status).toBe('ACTIVE');
    });

    it('GET /api/v1/admin/offers should bubble DB errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB connection failed'));
      const res = await request(app).get('/api/v1/admin/offers').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  describe('Reports API', () => {
    it('GET /api/v1/admin/reports/summary should return data with null approvalRate', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ gmv: '1000' }] })
                .mockResolvedValueOnce({ rows: [{ count: '10' }] })
                .mockResolvedValueOnce({ rows: [{ count: '5' }] });
      const res = await request(app).get('/api/v1/admin/reports/summary').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.gmv).toBe(1000);
      expect(res.body.data.approvalRate).toBeNull();
    });
  });

  describe('Settings API', () => {
    it('GET /api/v1/admin/settings should fetch settings', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ key: 'autoApproveProducts', value: 'true' }]
      });
      const res = await request(app).get('/api/v1/admin/settings').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.autoApproveProducts).toBe(true);
    });

    it('PATCH /api/v1/admin/settings should update and validate settings', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      pool.connect.mockResolvedValueOnce(mockClient);
      pool.query.mockResolvedValueOnce({ rows: [{ key: 'autoApproveProducts', value: 'true' }] }); // for getSettings
      
      const res = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ autoApproveProducts: true });
        
      expect(res.status).toBe(200);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('PATCH /api/v1/admin/settings should reject invalid keys', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      pool.connect.mockResolvedValueOnce(mockClient);
      
      const res = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ invalidKey: true });
        
      expect(res.status).toBe(400);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('PATCH /api/v1/admin/settings should reject invalid values', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      pool.connect.mockResolvedValueOnce(mockClient);
      
      const res = await request(app)
        .patch('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ autoApproveProducts: 'yes' });
        
      expect(res.status).toBe(400);
    });
  });
});
