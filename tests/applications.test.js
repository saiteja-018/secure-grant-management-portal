jest.mock('../src/config/db', () => require('./mockDb'));

const request = require('supertest');
const app = require('../src/app');
const { mockDb } = require('./mockDb');

describe('Grant Applications Management API Contract Tests', () => {
  let adminToken;
  let grantor1Token;
  let grantor2Token;
  let grantee1Token;
  let grantee2Token;
  let testGrantId;

  beforeEach(async () => {
    mockDb.reset();

    // 1. Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@grantportal.io', password: 'AdminPassword123!' });
    adminToken = adminLogin.body.accessToken;

    // 2. Grantor 1
    const regGrantor1 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alpha Foundation', email: 'grantor1@test.com', password: 'Password123!' });
    await request(app)
      .post(`/api/users/${regGrantor1.body.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });
    const g1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grantor1@test.com', password: 'Password123!' });
    grantor1Token = g1Login.body.accessToken;

    // 3. Grantor 2
    const regGrantor2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Beta Foundation', email: 'grantor2@test.com', password: 'Password123!' });
    await request(app)
      .post(`/api/users/${regGrantor2.body.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });
    const g2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grantor2@test.com', password: 'Password123!' });
    grantor2Token = g2Login.body.accessToken;

    // 4. Grantee 1
    const regGrantee1 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Researcher Alpha', email: 'grantee1@test.com', password: 'Password123!' });
    const gee1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grantee1@test.com', password: 'Password123!' });
    grantee1Token = gee1Login.body.accessToken;

    // 5. Grantee 2
    const regGrantee2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Researcher Beta', email: 'grantee2@test.com', password: 'Password123!' });
    const gee2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grantee2@test.com', password: 'Password123!' });
    grantee2Token = gee2Login.body.accessToken;

    // Create Grant by Grantor 1
    const grantRes = await request(app)
      .post('/api/grants')
      .set('Authorization', `Bearer ${grantor1Token}`)
      .send({
        title: 'Biomedical Innovation Grant',
        description: 'Funding next-generation therapies',
        amount: 150000
      });
    testGrantId = grantRes.body.id;
  });

  describe('POST /api/grants/:grantId/apply', () => {
    it('should allow a GRANTEE to apply with a proposal and return 201 with status submitted', async () => {
      const res = await request(app)
        .post(`/api/grants/${testGrantId}/apply`)
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({
          proposal: 'Our laboratory proposes a CRISPR targeted assay to evaluate tumor suppression.'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.grant_id).toBe(testGrantId);
      expect(res.body.status).toBe('submitted');
      expect(res.body.proposal).toContain('CRISPR');
    });

    it('should reject application if proposal is empty or missing', async () => {
      const res = await request(app)
        .post(`/api/grants/${testGrantId}/apply`)
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({ proposal: '   ' });

      expect(res.status).toBe(400);
    });

    it('should return 404 if applying to non-existent grant', async () => {
      const res = await request(app)
        .post('/api/grants/non-existent-grant-id/apply')
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({ proposal: 'Valid proposal content' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/grants/:grantId/applications (Grantor Application Review)', () => {
    let createdAppId;

    beforeEach(async () => {
      const appRes = await request(app)
        .post(`/api/grants/${testGrantId}/apply`)
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({
          proposal: 'Detailed proposal for cancer study'
        });
      createdAppId = appRes.body.id;
    });

    it('should allow the owner GRANTOR to retrieve all applications submitted for their grant', async () => {
      const res = await request(app)
        .get(`/api/grants/${testGrantId}/applications`)
        .set('Authorization', `Bearer ${grantor1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(createdAppId);
      expect(res.body[0].proposal).toContain('Detailed proposal');
    });

    it('should return 403 Forbidden when a DIFFERENT GRANTOR attempts to view applications', async () => {
      const res = await request(app)
        .get(`/api/grants/${testGrantId}/applications`)
        .set('Authorization', `Bearer ${grantor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });
  });

  describe('GET /api/applications/:appId and PATCH /api/applications/:appId/status', () => {
    let createdAppId;

    beforeEach(async () => {
      const appRes = await request(app)
        .post(`/api/grants/${testGrantId}/apply`)
        .set('Authorization', `Bearer ${grantee1Token}`)
        .send({
          proposal: 'Nanotechnology drug delivery proposal'
        });
      createdAppId = appRes.body.id;
    });

    it('should allow the submitting GRANTEE to view their application', async () => {
      const res = await request(app)
        .get(`/api/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${grantee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdAppId);
    });

    it('should allow the parent GRANTOR to view the application', async () => {
      const res = await request(app)
        .get(`/api/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${grantor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdAppId);
    });

    it('should return 403 when another unrelated GRANTEE attempts to view the application', async () => {
      const res = await request(app)
        .get(`/api/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${grantee2Token}`);

      expect(res.status).toBe(403);
    });

    it('should allow the grant owner to update application status to approved', async () => {
      const res = await request(app)
        .patch(`/api/applications/${createdAppId}/status`)
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
    });

    it('should reject invalid application status', async () => {
      const res = await request(app)
        .patch(`/api/applications/${createdAppId}/status`)
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({ status: 'not-a-valid-status' });

      expect(res.status).toBe(400);
    });

    it('should allow GRANTEE to retrieve their submissions via /api/applications/my', async () => {
      const res = await request(app)
        .get('/api/applications/my')
        .set('Authorization', `Bearer ${grantee1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });
  });
});
