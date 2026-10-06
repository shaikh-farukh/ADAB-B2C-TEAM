const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { closePool } = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ADMIN_ROLES } = require('../middleware/rolesPermissions');

describe('Service & API Contract Integration Tests', () => {
  let superAdminToken;
  const adminUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeAll(() => {
    superAdminToken = jwt.sign(
      { id: adminUuid, email: 'admin@adab.com', user_type: 'ADMIN', role: ADMIN_ROLES.SUPER_ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await closePool();
  });

  describe('Product/Category/Brand Boundary APIs', () => {
    it('GET /api/admin/categories should return categories contract shape', async () => {
      const res = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/admin/brands should return brands contract shape', async () => {
      const res = await request(app)
        .get('/api/admin/brands')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/admin/products-master should return master product boundary shape', async () => {
      const res = await request(app)
        .get('/api/admin/products-master')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Approval API Contracts', () => {
    it('GET /api/admin/approvals should return approval list DTO contract', async () => {
      const res = await request(app)
        .get('/api/admin/approvals?status=PENDING')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.contractVersion).toBe('1.0');
      expect(res.body.pagination).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/admin/approvals/counts should return approval counts DTO contract', async () => {
      const res = await request(app)
        .get('/api/admin/approvals/counts')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('pending');
      expect(res.body.data).toHaveProperty('approved');
      expect(res.body.data).toHaveProperty('rejected');
      expect(res.body.data).toHaveProperty('changes_requested');
      expect(res.body.data).toHaveProperty('total');
    });

    it('GET /api/admin/approvals/:id/history should return history DTO contract', async () => {
      const itemUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const res = await request(app)
        .get(`/api/admin/approvals/${itemUuid}/history`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/admin/approvals/:id/reject should enforce contract requiring rejection_reason', async () => {
      const itemUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const res = await request(app)
        .post(`/api/admin/approvals/${itemUuid}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_CONTRACT');
    });

    it('POST /api/admin/approvals/:id/request-changes should enforce contract requiring notes', async () => {
      const itemUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const res = await request(app)
        .post(`/api/admin/approvals/${itemUuid}/request-changes`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_CONTRACT');
    });

    it('POST /api/admin/approvals/:id/approve should execute valid approve contract', async () => {
      const itemUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const res = await request(app)
        .post(`/api/admin/approvals/${itemUuid}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ current_status: 'PENDING', notes: 'All criteria satisfied' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.new_status).toBe('APPROVED');
    });
  });
});
