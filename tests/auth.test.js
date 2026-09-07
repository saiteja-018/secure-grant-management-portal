jest.mock('../src/config/db', () => require('./mockDb'));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { mockDb } = require('./mockDb');

describe('Authentication & OAuth 2.0 API Contract Tests', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with default GRANTEE role and return 201 without password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Applicant',
          email: 'jane@applicant.edu',
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Jane Applicant');
      expect(res.body.email).toBe('jane@applicant.edu');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('password_hash');

      // Verify user has role GRANTEE
      const user = mockDb.users.find(u => u.email === 'jane@applicant.edu');
      expect(user).toBeDefined();
      const userRole = mockDb.user_roles.find(ur => ur.user_id === user.id);
      expect(userRole).toBeDefined();
      expect(userRole.role_id).toBe(3); // 3 is GRANTEE
    });

    it('should return 409 Conflict if email is already registered', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email: 'duplicate@test.com',
          password: 'Password123!'
        });

      // Second registration with duplicate email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@test.com',
          password: 'Password456!'
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 Bad Request if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'missing_name@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Login User',
          email: 'login@test.com',
          password: 'MySecretPassword123!'
        });
    });

    it('should login successfully and return 200 with a valid accessToken', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'MySecretPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');

      // Verify JWT payload matches required specification: userId, roles, iat, exp
      const decoded = jwt.decode(res.body.accessToken);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('roles');
      expect(Array.isArray(decoded.roles)).toBe(true);
      expect(decoded.roles).toContain('GRANTEE');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });

    it('should return 401 Unauthorized for incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid email or password/i);
    });

    it('should return 401 Unauthorized for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPassword123!'
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 if email or password missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('OAuth 2.0 Integration', () => {
    it('GET /api/auth/google should redirect to Google OAuth authorization endpoint', async () => {
      const res = await request(app).get('/api/auth/google');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');
      expect(res.headers.location).toContain('response_type=code');
    });

    it('GET /api/auth/google/callback should exchange code, create user with GRANTEE role, and issue JWT', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback?code=mock_code_researcher')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('researcher@example.com');
      expect(res.body.user.roles).toContain('GRANTEE');

      const decoded = jwt.decode(res.body.accessToken);
      expect(decoded).toHaveProperty('userId');
      expect(decoded.roles).toContain('GRANTEE');
    });

    it('GET /api/auth/google/callback without code should return 400', async () => {
      const res = await request(app).get('/api/auth/google/callback');
      expect(res.status).toBe(400);
    });

    it('GET /api/auth/google/callback with HTML accept header should redirect with token parameter', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback?code=mock_code_html')
        .set('Accept', 'text/html,application/xhtml+xml');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/?token=');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile when token is valid', async () => {
      // Login as admin
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@grantportal.io',
          password: 'AdminPassword123!'
        });

      const token = loginRes.body.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('admin@grantportal.io');
      expect(res.body.roles).toContain('ADMIN');
    });
  });
});
