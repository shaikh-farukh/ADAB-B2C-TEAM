const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { closePool } = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ADMIN_ROLES } = require('../middleware/rolesPermissions');

describe('Audit Middleware Integration Tests', () => {
  let adminToken;
  const adminUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeAll(() => {
    adminToken = jwt.sign(
      { id: adminUuid, email: 'admin@adab.com', user_type: 'ADMIN', role: ADMIN_ROLES.SUPER_ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await closePool();
  });

  it('should generate and return X-Correlation-ID header on requests', async () => {
    const res = await request(app)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
    expect(res.headers['x-correlation-id']).toMatch(/^req-/);
  });

  it('should preserve incoming X-Correlation-ID if provided by caller', async () => {
    const customCorrelationId = 'custom-trace-id-12345';
    const res = await request(app)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Correlation-ID', customCorrelationId);
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBe(customCorrelationId);
  });

  it('should successfully execute audit middleware on sensitive mutation (approve)', async () => {
    const listingUuid = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    const res = await request(app)
      .post(`/api/admin/approvals/${listingUuid}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Verified compliance documentation' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.new_status).toBe('APPROVED');
    expect(res.headers['x-correlation-id']).toBeDefined();
  });
});
