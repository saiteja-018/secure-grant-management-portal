jest.mock('../src/config/db', () => require('./mockDb'));

const request = require('supertest');
const app = require('../src/app');
const { mockDb } = require('./mockDb');

describe('Grant Management API Contract Tests', () => {
  let adminToken;
  let grantor1Token;
  let grantor2Token;
  let granteeToken;

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
      .send({ name: 'Grantor One', email: 'grantor1@test.com', password: 'Password123!' });
    await request(app)
      .post(`/api/users/${regGrantor1.body.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });
    const grantor1Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grantor1@test.com', password: 'Password123!' });
    grantor1Token = grantor1Login.body.accessToken;

    // 3. Grantor 2
    const regGrantor2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Grantor Two', email: 'grantor2@test.com', password: 'Password123!' });
    await request(app)
      .post(`/api/users/${regGrantor2.body.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'GRANTOR' });
    const grantor2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grantor2@test.com', password: 'Password123!' });
    grantor2Token = grantor2Login.body.accessToken;

    // 4. Grantee
    const regGrantee = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Grantee User', email: 'grantee@test.com', password: 'Password123!' });
    const granteeLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grantee@test.com', password: 'Password123!' });
    granteeToken = granteeLogin.body.accessToken;
  });

  describe('POST /api/grants', () => {
    it('should allow GRANTOR to create a new grant and return 201 with grantor_id associated', async () => {
      const res = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Quantum Computing Research Grant',
          description: 'Funding for novel algorithms',
          amount: 75000
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Quantum Computing Research Grant');
      expect(Number(res.body.amount)).toBe(75000);
      expect(res.body).toHaveProperty('grantor_id');
    });

    it('should reject grant creation if title, description, or amount is missing/invalid', async () => {
      const resMissing = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({ title: 'Incomplete Grant' });

      expect(resMissing.status).toBe(400);

      const resNegativeAmount = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Negative Amount',
          description: 'Invalid',
          amount: -500
        });

      expect(resNegativeAmount.status).toBe(400);
    });
  });

  describe('GET /api/grants and GET /api/grants/:id', () => {
    let testGrantId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'AI Ethics and Safety Fellowship',
          description: 'Fellowship for alignment research',
          amount: 50000
        });
      testGrantId = createRes.body.id;
    });

    it('should allow GRANTEE to retrieve list of all grants', async () => {
      const res = await request(app)
        .get('/api/grants')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow retrieval of single grant by ID', async () => {
      const res = await request(app)
        .get(`/api/grants/${testGrantId}`)
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testGrantId);
      expect(res.body.title).toBe('AI Ethics and Safety Fellowship');
    });

    it('should return 404 for non-existent grant ID', async () => {
      const res = await request(app)
        .get('/api/grants/non-existent-grant-id')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/grants/:id (Ownership Protection)', () => {
    let testGrantId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Renewable Energy Initiative',
          description: 'Original description',
          amount: 60000
        });
      testGrantId = createRes.body.id;
    });

    it('should allow the owner GRANTOR to update their grant', async () => {
      const res = await request(app)
        .put(`/api/grants/${testGrantId}`)
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Renewable Energy Initiative v2',
          amount: 80000
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Renewable Energy Initiative v2');
      expect(Number(res.body.amount)).toBe(80000);
    });

    it('should return 403 Forbidden when a DIFFERENT GRANTOR attempts to update the grant', async () => {
      const res = await request(app)
        .put(`/api/grants/${testGrantId}`)
        .set('Authorization', `Bearer ${grantor2Token}`)
        .send({
          title: 'Unauthorized Hijack Attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });
  });

  describe('DELETE /api/grants/:id', () => {
    let testGrantId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantor1Token}`)
        .send({
          title: 'Temporary Grant',
          description: 'To be deleted',
          amount: 10000
        });
      testGrantId = createRes.body.id;
    });

    it('should allow the owner GRANTOR to delete their grant', async () => {
      const res = await request(app)
        .delete(`/api/grants/${testGrantId}`)
        .set('Authorization', `Bearer ${grantor1Token}`);

      expect(res.status).toBe(200);

      // Verify grant is gone
      const getRes = await request(app)
        .get(`/api/grants/${testGrantId}`)
        .set('Authorization', `Bearer ${grantor1Token}`);
      expect(getRes.status).toBe(404);
    });

    it('should allow an ADMIN to delete any grant', async () => {
      const res = await request(app)
        .delete(`/api/grants/${testGrantId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 403 when a different grantor attempts to delete the grant', async () => {
      const res = await request(app)
        .delete(`/api/grants/${testGrantId}`)
        .set('Authorization', `Bearer ${grantor2Token}`);

      expect(res.status).toBe(403);
    });
  });
});
