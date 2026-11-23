const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Milestone 3: Categories, Products & Cart Integration', () => {
  let adminToken;
  let seller1Token;
  let seller1User;
  let seller2Token;
  let customerToken;
  let categoryId;
  let productId;

  beforeEach(async () => {
    // Admin user
    const adminHash = await User.hashPassword('admin123');
    await User.create({
      name: 'System Admin',
      email: 'admin@capstone.test',
      passwordHash: adminHash,
      role: 'admin',
    });
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@capstone.test',
      password: 'admin123',
    });
    adminToken = adminLogin.body.data.tokens.accessToken;

    // Seller 1
    const s1Res = await request(app).post('/api/auth/register').send({
      name: 'Seller One',
      email: 'seller1@capstone.test',
      password: 'password123',
      role: 'seller',
    });
    seller1Token = s1Res.body.data.tokens.accessToken;
    seller1User = s1Res.body.data.user;

    // Seller 2
    const s2Res = await request(app).post('/api/auth/register').send({
      name: 'Seller Two',
      email: 'seller2@capstone.test',
      password: 'password123',
      role: 'seller',
    });
    seller2Token = s2Res.body.data.tokens.accessToken;

    // Customer
    const cRes = await request(app).post('/api/auth/register').send({
      name: 'Customer One',
      email: 'customer1@capstone.test',
      password: 'password123',
      role: 'customer',
    });
    customerToken = cRes.body.data.tokens.accessToken;

    // Create a category
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
      });
    categoryId = catRes.body.data.id || catRes.body.data._id;

    // Seller 1 creates a product
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        name: 'Wireless Noise Canceling Headphones',
        description: 'High fidelity audio headphones',
        price: 99.99,
        category: categoryId,
        stock: 10,
        lowStockThreshold: 3,
      });
    productId = prodRes.body.data.id || prodRes.body.data._id;
  });

  describe('Categories', () => {
    it('GET /api/categories should return all active categories publicly', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/categories should be forbidden for customers', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Books' });
      expect(res.statusCode).toBe(403);
    });

    it('DELETE /api/categories/:id should return 409 if products still reference it', async () => {
      const res = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('still reference it');
    });
  });

  describe('Products', () => {
    it('GET /api/products should return list of active products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('GET /api/products/:id with non-existent id should return 404', async () => {
      const res = await request(app).get('/api/products/650000000000000000000099');
      expect(res.statusCode).toBe(404);
    });

    it('POST /api/products should reject customer with 403', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Fake product',
          description: 'fake',
          price: 10,
          category: categoryId,
          stock: 5,
        });
      expect(res.statusCode).toBe(403);
    });

    it('PATCH /api/products/:id should forbid seller 2 from editing seller 1 product', async () => {
      const res = await request(app)
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${seller2Token}`)
        .send({ price: 19.99 });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('only modify your own products');
    });

    it('PATCH /api/products/:id/stock should allow owner seller to update stock', async () => {
      const res = await request(app)
        .patch(`/api/products/${productId}/stock`)
        .set('Authorization', `Bearer ${seller1Token}`)
        .send({ stock: 25 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.stock).toBe(25);
    });

    it('DELETE /api/products/:id soft deletes product and hides from public', async () => {
      const delRes = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${seller1Token}`);

      expect(delRes.statusCode).toBe(200);

      // Customer view returns 404
      const getRes = await request(app).get(`/api/products/${productId}`);
      expect(getRes.statusCode).toBe(404);
    });
  });

  describe('Cart', () => {
    it('POST /api/cart/items should add product to cart', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 2 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.subtotal).toBe(199.98);
    });

    it('POST /api/cart/items should return 409 if requested quantity exceeds stock', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 999 });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('exceeds available stock');
    });

    it('PATCH /api/cart/items/:productId should update quantity or remove if 0', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 2 });

      const updateRes = await request(app)
        .patch(`/api/cart/items/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 4 });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data.items[0].quantity).toBe(4);

      const zeroRes = await request(app)
        .patch(`/api/cart/items/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 0 });

      expect(zeroRes.statusCode).toBe(200);
      expect(zeroRes.body.data.items.length).toBe(0);
    });

    it('DELETE /api/cart should clear the entire cart', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, quantity: 1 });

      const clearRes = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(clearRes.statusCode).toBe(200);
      expect(clearRes.body.data.items.length).toBe(0);
    });
  });
});
