const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');

describe('Milestone 4: Checkout, Order Lifecycle & Stock Concurrency', () => {
  let adminToken;
  let sellerToken;
  let sellerUser;
  let customerToken;
  let customerUser;
  let categoryId;
  let productId;

  const validAddress = {
    fullName: 'Jane Doe',
    phone: '+1-555-0199',
    line1: '123 Market St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'USA',
  };

  beforeEach(async () => {
    // Admin
    const adminHash = await User.hashPassword('admin123');
    await User.create({
      name: 'Order Admin',
      email: 'orderadmin@capstone.test',
      passwordHash: adminHash,
      role: 'admin',
    });
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'orderadmin@capstone.test',
      password: 'admin123',
    });
    adminToken = adminLogin.body.data.tokens.accessToken;

    // Seller
    const sRes = await request(app).post('/api/auth/register').send({
      name: 'Order Seller',
      email: 'orderseller@capstone.test',
      password: 'password123',
      role: 'seller',
    });
    sellerToken = sRes.body.data.tokens.accessToken;
    sellerUser = sRes.body.data.user;

    // Customer
    const cRes = await request(app).post('/api/auth/register').send({
      name: 'Order Customer',
      email: 'ordercustomer@capstone.test',
      password: 'password123',
      role: 'customer',
    });
    customerToken = cRes.body.data.tokens.accessToken;
    customerUser = cRes.body.data.user;

    // Category
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Gadgets', description: 'Smart gadgets' });
    categoryId = catRes.body.data.id || catRes.body.data._id;

    // Product with stock 10
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Smart Fitness Tracker',
        description: 'Track daily steps and heart rate',
        price: 50.0,
        category: categoryId,
        stock: 10,
        lowStockThreshold: 3,
      });
    productId = prodRes.body.data.id || prodRes.body.data._id;
  });

  it('Full checkout flow: cart -> checkout -> atomic stock decrement -> cart cleared', async () => {
    // 1. Add 2 units to cart
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId, quantity: 2 });

    // 2. Checkout
    const checkoutRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        deliveryAddress: validAddress,
      });

    expect(checkoutRes.statusCode).toBe(201);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data).toHaveProperty('orderNumber');
    expect(checkoutRes.body.data.totalAmount).toBe(100.0);
    expect(checkoutRes.body.data.payment.method).toBe('SIMULATED');
    expect(checkoutRes.body.data.status).toBe('paid');

    // 3. Verify stock decreased by 2 (10 -> 8)
    const productInDb = await Product.findById(productId);
    expect(productInDb.stock).toBe(8);

    // 4. Verify cart is now empty
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(cartRes.body.data.items.length).toBe(0);
  });

  it('Checkout with valid coupon should apply discount and increment usedCount', async () => {
    // Create active coupon (20% off)
    const couponRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'SAVE20',
        type: 'percent',
        value: 20,
        minOrderAmount: 40,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        usageLimit: 10,
      });
    expect(couponRes.statusCode).toBe(201);

    // Add 1 unit ($50) to cart
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId, quantity: 1 });

    // Checkout with coupon
    const checkoutRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        deliveryAddress: validAddress,
        couponCode: 'SAVE20',
      });

    expect(checkoutRes.statusCode).toBe(201);
    expect(checkoutRes.body.data.subtotal).toBe(50.0);
    expect(checkoutRes.body.data.discount).toBe(10.0);
    expect(checkoutRes.body.data.totalAmount).toBe(40.0);

    const couponInDb = await Coupon.findOne({ code: 'SAVE20' });
    expect(couponInDb.usedCount).toBe(1);
  });

  it('Concurrency test: stock of 5, fire 10 parallel checkouts for 1 unit each -> exactly 5 succeed, stock ends at 0', async () => {
    // Set stock strictly to 5
    await Product.findByIdAndUpdate(productId, { stock: 5 });

    // Register 10 distinct customers with 1 item in cart each
    const customerTokens = [];
    for (let i = 1; i <= 10; i++) {
      const reg = await request(app).post('/api/auth/register').send({
        name: `Customer Batch ${i}`,
        email: `batch_cust_${i}@capstone.test`,
        password: 'password123',
        role: 'customer',
      });
      const token = reg.body.data.tokens.accessToken;
      customerTokens.push(token);

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId, quantity: 1 });
    }

    // Fire 10 simultaneous checkout requests
    const checkoutPromises = customerTokens.map((token) =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ deliveryAddress: validAddress })
    );

    const results = await Promise.all(checkoutPromises);

    const successfulCheckouts = results.filter((r) => r.statusCode === 201);
    const rejectedCheckouts = results.filter((r) => r.statusCode === 409);

    expect(successfulCheckouts.length).toBe(5);
    expect(rejectedCheckouts.length).toBe(5);

    // Stock must be exactly 0, never negative
    const productAfter = await Product.findById(productId);
    expect(productAfter.stock).toBe(0);
  });

  it('Order status lifecycle: seller transitions paid -> processing -> shipped -> delivered', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId, quantity: 1 });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ deliveryAddress: validAddress });

    const orderId = orderRes.body.data.id || orderRes.body.data._id;

    // Invalid transition: paid -> delivered directly (must return 409)
    const badTransition = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'delivered' });
    expect(badTransition.statusCode).toBe(409);

    // Valid: paid -> processing
    const procRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'processing', note: 'Packing goods' });
    expect(procRes.statusCode).toBe(200);
    expect(procRes.body.data.status).toBe('processing');

    // Valid: processing -> shipped
    const shipRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'shipped', note: 'Shipped with tracking #TRK123' });
    expect(shipRes.statusCode).toBe(200);
    expect(shipRes.body.data.status).toBe('shipped');

    // Valid: shipped -> delivered
    const delRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'delivered', note: 'Delivered to customer' });
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.data.status).toBe('delivered');

    // Terminal: delivered cannot be transitioned
    const termRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'cancelled' });
    expect(termRes.statusCode).toBe(409);
  });

  it('Cancel order restores stock exactly once; double cancellation is prevented', async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId, quantity: 3 });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ deliveryAddress: validAddress });

    const orderId = orderRes.body.data.id || orderRes.body.data._id;

    // Stock decreased from 10 to 7
    let prod = await Product.findById(productId);
    expect(prod.stock).toBe(7);

    // Customer cancels order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ note: 'Changed mind' });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');

    // Stock restored to 10
    prod = await Product.findById(productId);
    expect(prod.stock).toBe(10);

    // Cancel again: must be rejected with 409 and NOT restore stock again
    const secondCancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ note: 'Cancel again' });

    expect(secondCancelRes.statusCode).toBe(409);
    prod = await Product.findById(productId);
    expect(prod.stock).toBe(10);
  });
});
