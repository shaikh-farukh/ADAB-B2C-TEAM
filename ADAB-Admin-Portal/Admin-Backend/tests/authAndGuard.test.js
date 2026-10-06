const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { closePool } = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ADMIN_ROLES } = require('../middleware/rolesPermissions');

describe('Authentication & Admin Authorization Guard Tests', () => {
  let validAdminToken;
  let nonAdminToken;
  let restrictedAdminToken;

  const adminUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const customerUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const auditorUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  beforeAll(() => {
    validAdminToken = jwt.sign(
      { id: adminUuid, email: 'admin@adab.com', user_type: 'ADMIN', role: ADMIN_ROLES.SUPER_ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    nonAdminToken = jwt.sign(
      { id: customerUuid, email: 'customer@gmail.com', user_type: 'CUSTOMER', role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    restrictedAdminToken = jwt.sign(
      { id: auditorUuid, email: 'auditor@adab.com', user_type: 'ADMIN', role: ADMIN_ROLES.COMPLIANCE_AUDITOR },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await closePool();
  });

  describe('1. Authentication Rejection', () => {
    it('should reject request when no authorization header is provided', async () => {
      const res = await request(app).get('/api/admin/categories');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('UNAUTHENTICATED');
    });

    it('should reject request with invalid token format', async () => {
      const res = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', 'Bearer invalid-token-string');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_TOKEN');
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: adminUuid, user_type: 'ADMIN', role: ADMIN_ROLES.SUPER_ADMIN },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );
      const res = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('TOKEN_EXPIRED');
    });
  });

  describe('2. Admin Authorization & Permission Enforcement', () => {
    it('should reject non-admin user with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${nonAdminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('should reject admin lacking required permission (e.g. catalog:approve for auditor)', async () => {
      const itemUuid = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
      const res = await request(app)
        .post(`/api/admin/approvals/${itemUuid}/approve`)
        .set('Authorization', `Bearer ${restrictedAdminToken}`)
        .send({ notes: 'Looks okay' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow authorized Admin request with valid token and permission', async () => {
      const res = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${validAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
