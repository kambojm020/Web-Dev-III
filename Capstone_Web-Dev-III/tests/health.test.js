const request = require('supertest');
const app = require('../src/app');

describe('Health and System Routes', () => {
  it('GET /api/health should return 200 with service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status', 'healthy');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
  });

  it('GET /api/unknown-route should return 404 via notFound middleware', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cannot GET');
  });
});
