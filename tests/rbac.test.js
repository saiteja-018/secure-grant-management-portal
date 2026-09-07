jest.mock('../src/config/db', () => require('./mockDb'));

const request = require('supertest');
const app = require('../src/app');
const { mockDb } = require('./mockDb');

describe('RBAC (Role-Based Access Control) & Administration Tests', () => {
  let adminToken;
  let granteeToken;
  let grantorToken;
  let granteeUser;
  let grantorUser;

  beforeEach(async () => {
    mockDb.reset();

    // 1. Login as Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@grantportal.io',
        password: 'AdminPassword123!'
      });
    adminToken = adminLogin.body.accessToken;

    // 2. Register Grantee
    const regGrantee = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Normal Grantee',
        email: 'grantee@test.com',
        password: 'Password123!'
      });
    granteeUser = regGrantee.body;

    const granteeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'grantee@test.com',
        password: 'Password123!'
      });
    granteeToken = granteeLogin.body.accessToken;

    // 3. Register Grantor Candidate and promote via Admin
    const regGrantor = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Foundation Grantor',
        email: 'grantor@test.com',
        password: 'Password123!'
      });
    grantorUser = regGrantor.body;

    await request(app)
      .post(`/api/users/${grantorUser.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });

    const grantorLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'grantor@test.com',
        password: 'Password123!'
      });
    grantorToken = grantorLogin.body.accessToken;
  });

  describe('Authorization Enforcement (401 vs 403)', () => {
    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/grants')
        .send({
          title: 'Unauthorized Grant',
          description: 'Desc',
          amount: 10000
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Authorization header missing/i);
    });

    it('should return 401 Unauthorized when Bearer token is invalid/tampered', async () => {
      const res = await request(app)
        .get('/api/grants')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid or expired token/i);
    });

    it('should return 401 Unauthorized if Authorization format is not Bearer <token>', async () => {
      const res = await request(app)
        .get('/api/grants')
        .set('Authorization', 'Basic 12345');

      expect(res.status).toBe(401);
    });

    it('should return 403 Forbidden when a GRANTEE attempts to access GRANTOR-only endpoint (POST /api/grants)', async () => {
      const res = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${granteeToken}`)
        .send({
          title: 'Illegal Grant by Grantee',
          description: 'Testing RBAC blocks',
          amount: 50000
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('should return 403 Forbidden when a non-ADMIN attempts to assign roles', async () => {
      const res = await request(app)
        .post(`/api/users/${granteeUser.id}/roles`)
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({ roleName: 'ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });
  });

  describe('ADMIN-Only Role Assignment Endpoint (POST /api/users/:userId/roles)', () => {
    it('should allow ADMIN to assign GRANTOR role to a user and reflect in database', async () => {
      const res = await request(app)
        .post(`/api/users/${granteeUser.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'GRANTOR' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.user.roles).toContain('GRANTOR');

      // Verify in mockDb user_roles table
      const grantorRole = mockDb.roles.find(r => r.name === 'GRANTOR');
      const assigned = mockDb.user_roles.find(
        ur => ur.user_id === granteeUser.id && ur.role_id === grantorRole.id
      );
      expect(assigned).toBeDefined();
    });

    it('should return 400 Bad Request if roleName is missing or invalid', async () => {
      const resMissing = await request(app)
        .post(`/api/users/${granteeUser.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(resMissing.status).toBe(400);

      const resInvalid = await request(app)
        .post(`/api/users/${granteeUser.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'SUPERUSER_NOT_EXISTING' });

      expect(resInvalid.status).toBe(400);
    });

    it('should return 404 if assigning role to non-existent userId', async () => {
      const res = await request(app)
        .post('/api/users/non-existent-uuid/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'GRANTOR' });

      expect(res.status).toBe(404);
    });

    it('should allow ADMIN to view all users via GET /api/users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });
  });
});
