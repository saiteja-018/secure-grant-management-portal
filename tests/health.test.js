jest.mock('../src/config/db', () => require('./mockDb'));

const request = require('supertest');
const app = require('../src/app');

describe('System Health & Misc Route Tests', () => {
  it('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('services');
  });

  it('GET /api/non-existent-route should return 404', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
  });
});
