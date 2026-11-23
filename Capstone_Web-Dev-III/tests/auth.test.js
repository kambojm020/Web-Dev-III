const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Auth Endpoints (/api/auth)', () => {
  const customerPayload = {
    name: 'Alice Customer',
    email: 'alice@example.com',
    password: 'password123',
    role: 'customer',
  };

  const sellerPayload = {
    name: 'Bob Seller',
    email: 'bob@example.com',
    password: 'password123',
    role: 'seller',
  };

  it('POST /api/auth/register should register a customer successfully', async () => {
    const res = await request(app).post('/api/auth/register').send(customerPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.email).toBe(customerPayload.email.toLowerCase());
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('POST /api/auth/register should register a seller successfully', async () => {
    const res = await request(app).post('/api/auth/register').send(sellerPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('seller');
  });

  it('POST /api/auth/register should forbid self-registration as admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Evil Admin',
        email: 'admin_fake@example.com',
        password: 'password123',
        role: 'admin',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/register should reject duplicate email with 409 Conflict', async () => {
    await request(app).post('/api/auth/register').send(customerPayload);
    const res = await request(app).post('/api/auth/register').send(customerPayload);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('POST /api/auth/register should fail validation with 400 when fields are invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'not-an-email',
      password: '123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('POST /api/auth/login should log in with valid credentials', async () => {
    await request(app).post('/api/auth/register').send(customerPayload);

    const res = await request(app).post('/api/auth/login').send({
      email: customerPayload.email,
      password: customerPayload.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('POST /api/auth/login should reject invalid password with 401', async () => {
    await request(app).post('/api/auth/register').send(customerPayload);

    const res = await request(app).post('/api/auth/login').send({
      email: customerPayload.email,
      password: 'wrongpassword',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/refresh should rotate refresh token and provide new access token', async () => {
    const regRes = await request(app).post('/api/auth/register').send(customerPayload);
    const oldRefreshToken = regRes.body.data.tokens.refreshToken;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
    expect(res.body.data.tokens.refreshToken).not.toBe(oldRefreshToken);

    // Old refresh token must be invalidated
    const oldTryRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });
    expect(oldTryRes.statusCode).toBe(401);
  });

  it('POST /api/auth/logout should invalidate refresh token', async () => {
    const regRes = await request(app).post('/api/auth/register').send(customerPayload);
    const accessToken = regRes.body.data.tokens.accessToken;
    const refreshToken = regRes.body.data.tokens.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutRes.statusCode).toBe(200);

    // Refreshing with invalidated token should fail
    const refRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(refRes.statusCode).toBe(401);
  });
});
