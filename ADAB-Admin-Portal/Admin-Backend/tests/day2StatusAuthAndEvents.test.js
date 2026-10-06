const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { closePool } = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ADMIN_ROLES, PERMISSIONS } = require('../middleware/rolesPermissions');
const { emitOutboxEvent } = require('../services/outboxService');

describe('Day 2 — User Status Authorization & Outbox Event Integration Tests', () => {
  let superAdminToken;
  let catalogManagerToken;
  let customerToken;

  const adminUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const managerUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const customerUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

  beforeAll(() => {
    superAdminToken = jwt.sign(
      { id: adminUuid, email: 'admin@adab.com', user_type: 'ADMIN', role: ADMIN_ROLES.SUPER_ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    catalogManagerToken = jwt.sign(
      { id: managerUuid, email: 'manager@adab.com', user_type: 'ADMIN', role: ADMIN_ROLES.CATALOG_MANAGER },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { id: customerUuid, email: 'customer@gmail.com', user_type: 'CUSTOMER', role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await closePool();
  });

  describe('1. Seller / Customer User Status Authorization', () => {
    it('should allow authorized Admin with users:manage permission to update user status', async () => {
      const targetUserUuid = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      const res = await request(app)
        .post(`/api/admin/users/${targetUserUuid}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'SUSPENDED', reason: 'Compliance document failure' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUSPENDED');
      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('should reject user status change from Admin lacking users:manage permission (e.g. Catalog Manager)', async () => {
      const targetUserUuid = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      const res = await request(app)
        .post(`/api/admin/users/${targetUserUuid}/status`)
        .set('Authorization', `Bearer ${catalogManagerToken}`)
        .send({ status: 'BANNED' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject unauthenticated request to user status endpoint with 401', async () => {
      const targetUserUuid = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      const res = await request(app)
        .post(`/api/admin/users/${targetUserUuid}/status`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHENTICATED');
    });

    it('should reject status update with invalid target status value', async () => {
      const targetUserUuid = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      const res = await request(app)
        .post(`/api/admin/users/${targetUserUuid}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_STATUS');
    });
  });

  describe('2. Outbox Event Integration', () => {
    it('should successfully emit outbox event to canonical outbox_events structure', async () => {
      const itemUuid = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const outboxRes = await emitOutboxEvent({
        aggregate_type: 'PRODUCT_LISTING',
        aggregate_id: itemUuid,
        event_type: 'PRODUCT_APPROVED',
        payload: {
          listing_id: itemUuid,
          admin_id: adminUuid,
          status: 'APPROVED',
          timestamp: new Date().toISOString()
        }
      });

      expect(outboxRes.success).toBe(true);
      expect(outboxRes.aggregate_type).toBe('PRODUCT_LISTING');
      expect(outboxRes.event_type).toBe('PRODUCT_APPROVED');
      expect(outboxRes.status).toBe('PENDING');
    });
  });
});
