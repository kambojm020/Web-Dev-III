const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('User Endpoints (/api/users)', () => {
  let customerToken;
  let customerUser;
  let adminToken;
  let adminUser;

  beforeEach(async () => {
    // Create customer
    const custRes = await request(app).post('/api/auth/register').send({
      name: 'Charlie Customer',
      email: 'charlie@example.com',
      password: 'password123',
      role: 'customer',
    });
    customerToken = custRes.body.data.tokens.accessToken;
    customerUser = custRes.body.data.user;

    // Create admin directly in DB for testing
    const passwordHash = await User.hashPassword('adminpass123');
    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
    });
    const adminLoginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'adminpass123',
    });
    adminToken = adminLoginRes.body.data.tokens.accessToken;
  });

  it('GET /api/users/me should return 401 without auth token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/users/me should return current user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('charlie@example.com');
  });

  it('PATCH /api/users/me should update allowed fields and reject role changes', async () => {
    const updateRes = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Charlie Updated' });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.name).toBe('Charlie Updated');

    const roleAttemptRes = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ role: 'admin' });

    expect(roleAttemptRes.statusCode).toBe(400);
  });

  it('GET /api/users should forbid customer with 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/users should allow admin to view paginated users', async () => {
    const res = await request(app)
      .get('/api/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('totalPages');
    expect(res.body.meta).toHaveProperty('total');
  });

  it('PATCH /api/users/:id/status should update user active status', async () => {
    const res = await request(app)
      .patch(`/api/users/${customerUser.id || customerUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    // Deactivated user cannot login
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'charlie@example.com',
      password: 'password123',
    });
    expect(loginRes.statusCode).toBe(403);
  });
});
