const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Order = require('../src/models/Order');

describe('Milestone 5: Inventory, Reports Aggregations & Reviews', () => {
  let adminToken;
  let sellerToken;
  let sellerUser;
  let customerToken;
  let customerUser;
  let categoryId;
  let product1Id;
  let product2Id;

  beforeEach(async () => {
    // Admin
    const adminHash = await User.hashPassword('admin123');
    const admin = await User.create({
      name: 'Report Admin',
      email: 'reportadmin@capstone.test',
      passwordHash: adminHash,
      role: 'admin',
    });
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'reportadmin@capstone.test',
      password: 'admin123',
    });
    adminToken = adminLogin.body.data.tokens.accessToken;

    // Seller
    const sRes = await request(app).post('/api/auth/register').send({
      name: 'Report Seller',
      email: 'reportseller@capstone.test',
      password: 'password123',
      role: 'seller',
    });
    sellerToken = sRes.body.data.tokens.accessToken;
    sellerUser = sRes.body.data.user;

    // Customer
    const cRes = await request(app).post('/api/auth/register').send({
      name: 'Report Customer',
      email: 'reportcustomer@capstone.test',
      password: 'password123',
      role: 'customer',
    });
    customerToken = cRes.body.data.tokens.accessToken;
    customerUser = cRes.body.data.user;

    // Category
    const cat = await Category.create({
      name: 'Footwear',
      slug: 'footwear',
      description: 'Shoes and sneakers',
    });
    categoryId = cat._id;

    // Product 1: Low stock (2 units <= 5 threshold)
    const p1 = await Product.create({
      name: 'Running Shoes Pro',
      slug: 'running-shoes-pro',
      description: 'Ergonomic running shoes',
      price: 100,
      category: categoryId,
      seller: sellerUser.id || sellerUser._id,
      stock: 2,
      lowStockThreshold: 5,
    });
    product1Id = p1._id;

    // Product 2: In stock (20 units)
    const p2 = await Product.create({
      name: 'Sport Socks Pack',
      slug: 'sport-socks-pack',
      description: 'Pack of 3 breathable socks',
      price: 15,
      category: categoryId,
      seller: sellerUser.id || sellerUser._id,
      stock: 20,
      lowStockThreshold: 5,
    });
    product2Id = p2._id;

    // Create a mock paid order for reports aggregation testing
    await Order.create({
      orderNumber: 'ORD-TEST-REPORT-001',
      customer: customerUser.id || customerUser._id,
      items: [
        {
          product: product1Id,
          seller: sellerUser.id || sellerUser._id,
          name: 'Running Shoes Pro',
          unitPrice: 100,
          quantity: 2,
          lineTotal: 200,
        },
        {
          product: product2Id,
          seller: sellerUser.id || sellerUser._id,
          name: 'Sport Socks Pack',
          unitPrice: 15,
          quantity: 4,
          lineTotal: 60,
        },
      ],
      subtotal: 260,
      discount: 0,
      shippingFee: 0,
      totalAmount: 260,
      deliveryAddress: {
        fullName: 'John Runner',
        phone: '1234567890',
        line1: '100 Olympic Way',
        city: 'Denver',
        state: 'CO',
        postalCode: '80202',
        country: 'USA',
      },
      payment: {
        method: 'SIMULATED',
        status: 'paid',
        transactionId: 'TXN-TEST-001',
      },
      status: 'paid',
      createdAt: new Date(),
    });
  });

  describe('Inventory Endpoints', () => {
    it('GET /api/inventory/low-stock should return products at or below threshold', async () => {
      const res = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Running Shoes Pro');
      expect(res.body.data[0].stock).toBe(2);
    });

    it('GET /api/inventory/summary should return correct summary statistics', async () => {
      const res = await request(app)
        .get('/api/inventory/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalProducts).toBe(2);
      expect(res.body.data.totalStockUnits).toBe(22);
      expect(res.body.data.lowStockCount).toBe(1);
      expect(res.body.data.totalStockValue).toBe(2 * 100 + 20 * 15); // 500
    });
  });

  describe('Reports Aggregation Pipelines', () => {
    it('GET /api/reports/sales-summary should group revenue and averageOrderValue', async () => {
      const res = await request(app)
        .get('/api/reports/sales-summary?groupBy=day')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].totalRevenue).toBe(260);
      expect(res.body.data[0].orderCount).toBe(1);
      expect(res.body.data[0].averageOrderValue).toBe(260);
    });

    it('GET /api/reports/best-sellers should return top products sorted by revenue desc', async () => {
      const res = await request(app)
        .get('/api/reports/best-sellers?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].name).toBe('Running Shoes Pro');
      expect(res.body.data[0].totalRevenue).toBe(200);
      expect(res.body.data[1].name).toBe('Sport Socks Pack');
      expect(res.body.data[1].totalRevenue).toBe(60);
    });

    it('GET /api/reports/inventory-summary should group inventory by category', async () => {
      const res = await request(app)
        .get('/api/reports/inventory-summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].categoryName).toBe('Footwear');
      expect(res.body.data[0].totalProducts).toBe(2);
      expect(res.body.data[0].totalStockUnits).toBe(22);
      expect(res.body.data[0].lowStockCount).toBe(1);
      expect(res.body.data[0].stockValue).toBe(500);
    });

    it('GET /api/reports/category-sales should aggregate sales by product category', async () => {
      const res = await request(app)
        .get('/api/reports/category-sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].categoryName).toBe('Footwear');
      expect(res.body.data[0].totalRevenue).toBe(260);
      expect(res.body.data[0].totalUnitsSold).toBe(6);
    });
  });

  describe('Reviews on Products', () => {
    it('POST /api/products/:id/reviews should submit review and update averageRating', async () => {
      const res = await request(app)
        .post(`/api/products/${product1Id}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          comment: 'Best running shoes ever!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.rating).toBe(5);

      const updatedProd = await Product.findById(product1Id);
      expect(updatedProd.averageRating).toBe(5);
      expect(updatedProd.reviewCount).toBe(1);
    });

    it('Duplicate review from same user on same product should return 409 Conflict', async () => {
      await request(app)
        .post(`/api/products/${product1Id}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 4, comment: 'Great' });

      const duplicateRes = await request(app)
        .post(`/api/products/${product1Id}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 5, comment: 'Attempting second review' });

      expect(duplicateRes.statusCode).toBe(409);
      expect(duplicateRes.body.message).toContain('already reviewed');
    });
  });
});
