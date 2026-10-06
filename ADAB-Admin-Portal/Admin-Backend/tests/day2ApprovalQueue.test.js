const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { closePool } = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ADMIN_ROLES } = require('../middleware/rolesPermissions');

describe('Day 2 — Admin Approval Queue & State Transition Tests', () => {
  let superAdminToken;
  let auditorToken;
  let nonAdminToken;

  const adminUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const auditorUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const customerUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

  beforeAll(() => {
    superAdminToken = jwt.sign(
      { id: adminUuid, email: 'admin@adab.com', user_type: 'ADMIN', role: ADMIN_ROLES.SUPER_ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    auditorToken = jwt.sign(
      { id: auditorUuid, email: 'auditor@adab.com', user_type: 'ADMIN', role: ADMIN_ROLES.COMPLIANCE_AUDITOR },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    nonAdminToken = jwt.sign(
      { id: customerUuid, email: 'customer@gmail.com', user_type: 'CUSTOMER', role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await closePool();
  });

  describe('1. Approval Queue API', () => {
    it('should allow authorized Admin to retrieve queue items', async () => {
      const res = await request(app)
        .get('/api/admin/approvals/queue?status=PENDING')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject unauthenticated request to queue with 401', async () => {
      const res = await request(app).get('/api/admin/approvals/queue');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHENTICATED');
    });

    it('should reject non-admin request to queue with 403', async () => {
      const res = await request(app)
        .get('/api/admin/approvals/queue')
        .set('Authorization', `Bearer ${nonAdminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('should correctly handle filtering and pagination parameters', async () => {
      const res = await request(app)
        .get('/api/admin/approvals/queue?status=PENDING&page=1&limit=10&sort=DESC')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should return empty array for non-matching filter', async () => {
      const res = await request(app)
        .get('/api/admin/approvals/queue?seller_id=00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('2. Approval Read by ID API', () => {
    it('should retrieve existing approval item details with history', async () => {
      const listingId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const res = await request(app)
        .get(`/api/admin/approvals/${listingId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(listingId);
    });

    it('should return 404 for nonexistent approval item', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000999';
      const res = await request(app)
        .get(`/api/admin/approvals/${fakeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });

  describe('3. Approve Action & State Machine Validation', () => {
    it('should approve item with valid transition from PENDING to APPROVED', async () => {
      const listingId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const res = await request(app)
        .post(`/api/admin/approvals/${listingId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ notes: 'Quality check passed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.new_status).toBe('APPROVED');
    });

    it('should reject invalid transition when item is already APPROVED', async () => {
      const listingId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const res = await request(app)
        .post(`/api/admin/approvals/${listingId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ notes: 'Duplicate approve' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('SAME_STATE_TRANSITION');
    });

    it('should reject approve request from Admin without catalog:approve permission', async () => {
      const listingId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const res = await request(app)
        .post(`/api/admin/approvals/${listingId}/approve`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({ notes: 'Auditor attempt' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('4. Reject Action & Rejection Reason Validation', () => {
    it('should reject item with valid rejection_reason', async () => {
      const listingId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const res = await request(app)
        .post(`/api/admin/approvals/${listingId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ rejection_reason: 'Expired product batch' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.new_status).toBe('REJECTED');
      expect(res.body.data.rejection_reason).toBe('Expired product batch');
    });

    it('should fail rejection if rejection_reason is missing', async () => {
      const listingId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const res = await request(app)
        .post(`/api/admin/approvals/${listingId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_CONTRACT');
    });
  });

  describe('5. Request Changes Action', () => {
    it('should request changes with required notes from PENDING item', async () => {
      const freshListingId = 'fresh-pending-item-99';
      const res = await request(app)
        .post(`/api/admin/approvals/${freshListingId}/request-changes`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ current_status: 'PENDING', notes: 'Upload original tax invoice image' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.new_status).toBe('CHANGES_REQUESTED');
    });

    it('should fail request-changes if notes are missing', async () => {
      const freshListingId = 'fresh-pending-item-99';
      const res = await request(app)
        .post(`/api/admin/approvals/${freshListingId}/request-changes`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ current_status: 'PENDING' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_CONTRACT');
    });
  });
});
