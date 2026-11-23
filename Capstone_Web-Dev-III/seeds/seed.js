const mongoose = require('mongoose');
const config = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const Coupon = require('../src/models/Coupon');
const Review = require('../src/models/Review');

const seed = async () => {
  try {
    console.log('--- Starting Database Seeding ---');
    await connectDB();

    // Clear existing collections
    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Coupon.deleteMany({}),
      Review.deleteMany({}),
    ]);

    // 1. Seed Users
    console.log('Seeding users (1 admin, 2 sellers, 3 customers)...');
    const adminPasswordHash = await User.hashPassword('Admin@123');
    const sellerPasswordHash = await User.hashPassword('Seller@123');
    const customerPasswordHash = await User.hashPassword('Customer@123');

    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@ecommerce.test',
      passwordHash: adminPasswordHash,
      role: 'admin',
    });

    const seller1 = await User.create({
      name: 'TechGear Official',
      email: 'seller1@techgear.test',
      passwordHash: sellerPasswordHash,
      role: 'seller',
    });

    const seller2 = await User.create({
      name: 'UrbanStyle Apparel',
      email: 'seller2@urbanwear.test',
      passwordHash: sellerPasswordHash,
      role: 'seller',
    });

    const customer1 = await User.create({
      name: 'Alice Johnson',
      email: 'customer1@example.test',
      passwordHash: customerPasswordHash,
      role: 'customer',
    });

    const customer2 = await User.create({
      name: 'Bob Smith',
      email: 'customer2@example.test',
      passwordHash: customerPasswordHash,
      role: 'customer',
    });

    const customer3 = await User.create({
      name: 'Clara Oswald',
      email: 'customer3@example.test',
      passwordHash: customerPasswordHash,
      role: 'customer',
    });

    // 2. Seed 4 Categories
    console.log('Seeding 4 categories...');
    const catElectronics = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      description: 'Laptops, smartphones, audio and smart gadgets',
    });

    const catFashion = await Category.create({
      name: 'Fashion & Apparel',
      slug: 'fashion-apparel',
      description: 'Men and women casual and formal clothing',
    });

    const catHome = await Category.create({
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Appliances, cookware, and decorative accessories',
    });

    const catSports = await Category.create({
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Fitness equipment, athletic footwear, and camping gear',
    });

    // 3. Seed 16 Products across sellers
    console.log('Seeding 16 products with varying stock levels...');
    const productsData = [
      // Seller 1: Electronics & Sports
      {
        name: 'Pro Noise Canceling Wireless Headphones',
        slug: 'pro-noise-canceling-wireless-headphones',
        description: 'Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.',
        price: 199.99,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 45,
        lowStockThreshold: 5,
      },
      {
        name: 'Ultra-Slim 4K Monitor 27-inch',
        slug: 'ultra-slim-4k-monitor-27-inch',
        description: 'IPS panel with 99% sRGB color gamut and HDR support.',
        price: 349.99,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 12,
        lowStockThreshold: 5,
      },
      {
        name: 'Mechanical Gaming Keyboard RGB',
        slug: 'mechanical-gaming-keyboard-rgb',
        description: 'Tactile blue switches with customizable per-key RGB backlighting.',
        price: 79.99,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 25,
        lowStockThreshold: 5,
      },
      {
        name: 'Smart Ergonomic Fitness Watch',
        slug: 'smart-ergonomic-fitness-watch',
        description: 'Heart rate, sleep tracking, GPS and 5ATM water resistance.',
        price: 129.5,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 2, // LOW STOCK
        lowStockThreshold: 5,
      },
      {
        name: 'USB-C Multiport Docking Station',
        slug: 'usb-c-multiport-docking-station',
        description: 'Dual HDMI, Ethernet, USB 3.0 and 100W Power Delivery passthrough.',
        price: 59.99,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 0, // OUT OF STOCK
        lowStockThreshold: 5,
      },
      {
        name: 'Portable Bluetooth Waterproof Speaker',
        slug: 'portable-bluetooth-waterproof-speaker',
        description: 'IPX7 waterproof 20W stereo sound speaker for outdoor trips.',
        price: 49.99,
        category: catElectronics._id,
        seller: seller1._id,
        stock: 18,
        lowStockThreshold: 5,
      },
      {
        name: 'Carbon Fiber Tennis Racket',
        slug: 'carbon-fiber-tennis-racket',
        description: 'Lightweight professional tournament tennis racket.',
        price: 139.0,
        category: catSports._id,
        seller: seller1._id,
        stock: 8,
        lowStockThreshold: 3,
      },
      {
        name: 'Adjustable Dumbbell Set 50lbs',
        slug: 'adjustable-dumbbell-set-50lbs',
        description: 'Rapid-switch selector pin dumbbell system for home gyms.',
        price: 249.99,
        category: catSports._id,
        seller: seller1._id,
        stock: 1, // LOW STOCK
        lowStockThreshold: 3,
      },

      // Seller 2: Fashion & Home
      {
        name: 'Organic Cotton Crewneck T-Shirt',
        slug: 'organic-cotton-crewneck-t-shirt',
        description: '100% GOTS certified organic combed ring-spun cotton.',
        price: 24.99,
        category: catFashion._id,
        seller: seller2._id,
        stock: 120,
        lowStockThreshold: 10,
      },
      {
        name: 'Water-Resistant Parka Jacket',
        slug: 'water-resistant-parka-jacket',
        description: 'Thermal insulated winter jacket with detachable hood.',
        price: 159.99,
        category: catFashion._id,
        seller: seller2._id,
        stock: 15,
        lowStockThreshold: 5,
      },
      {
        name: 'Classic Slim-Fit Denim Jeans',
        slug: 'classic-slim-fit-denim-jeans',
        description: 'Premium stretch denim with 5-pocket classic styling.',
        price: 69.5,
        category: catFashion._id,
        seller: seller2._id,
        stock: 35,
        lowStockThreshold: 5,
      },
      {
        name: 'Merino Wool Knitted Scarf',
        slug: 'merino-wool-knitted-scarf',
        description: 'Ultra-soft pure merino wool winter fashion accessory.',
        price: 39.99,
        category: catFashion._id,
        seller: seller2._id,
        stock: 3, // LOW STOCK
        lowStockThreshold: 5,
      },
      {
        name: 'Stainless Steel French Press Coffee Maker',
        slug: 'stainless-steel-french-press-coffee-maker',
        description: 'Double-wall insulated 34oz cafetiere for rich brewed coffee.',
        price: 32.5,
        category: catHome._id,
        seller: seller2._id,
        stock: 40,
        lowStockThreshold: 8,
      },
      {
        name: 'Cast Iron Dutch Oven 6-Quart',
        slug: 'cast-iron-dutch-oven-6-quart',
        description: 'Enameled cast iron pot with self-basting lid for stews and roasts.',
        price: 79.99,
        category: catHome._id,
        seller: seller2._id,
        stock: 14,
        lowStockThreshold: 4,
      },
      {
        name: 'Ceramic Non-Stick Chef Pan 10-inch',
        slug: 'ceramic-non-stick-chef-pan-10-inch',
        description: 'PTFE & PFOA free nonstick cooking skillet with stay-cool handle.',
        price: 44.99,
        category: catHome._id,
        seller: seller2._id,
        stock: 22,
        lowStockThreshold: 5,
      },
      {
        name: 'Aroma Diffuser Ultrasonic Humidifier',
        slug: 'aroma-diffuser-ultrasonic-humidifier',
        description: '500ml essential oil diffuser with ambient 7-color LED lighting.',
        price: 29.99,
        category: catHome._id,
        seller: seller2._id,
        stock: 30,
        lowStockThreshold: 5,
      },
    ];

    const createdProducts = await Product.create(productsData);

    // 4. Seed 2 Coupons (1 active, 1 expired)
    console.log('Seeding coupons (1 active, 1 expired)...');
    const activeCoupon = await Coupon.create({
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      minOrderAmount: 30,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
      usageLimit: 200,
      usedCount: 1,
      isActive: true,
    });

    const expiredCoupon = await Coupon.create({
      code: 'EXPIRED50',
      type: 'percent',
      value: 50,
      minOrderAmount: 50,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
      usageLimit: 50,
      usedCount: 50,
      isActive: true,
    });

    // 5. Seed 2 Sample Orders in different statuses
    console.log('Seeding 2 sample orders...');
    const order1 = await Order.create({
      orderNumber: 'ORD-DEMO-2026-0001',
      customer: customer1._id,
      items: [
        {
          product: createdProducts[0]._id, // Headphones ($199.99)
          seller: seller1._id,
          name: createdProducts[0].name,
          unitPrice: createdProducts[0].price,
          quantity: 1,
          lineTotal: 199.99,
        },
        {
          product: createdProducts[8]._id, // Organic T-Shirt ($24.99)
          seller: seller2._id,
          name: createdProducts[8].name,
          unitPrice: createdProducts[8].price,
          quantity: 2,
          lineTotal: 49.98,
        },
      ],
      subtotal: 249.97,
      discount: 24.99, // 10% coupon applied
      shippingFee: 0,
      totalAmount: 224.98,
      couponCode: 'WELCOME10',
      deliveryAddress: {
        fullName: 'Alice Johnson',
        phone: '+1-555-0101',
        line1: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'OR',
        postalCode: '97477',
        country: 'USA',
      },
      payment: {
        method: 'SIMULATED',
        status: 'paid',
        transactionId: 'TXN-DEMO-001',
      },
      status: 'paid',
      statusHistory: [
        {
          status: 'pending',
          changedBy: customer1._id,
          changedAt: new Date(Date.now() - 3600000),
          note: 'Order placed by customer',
        },
        {
          status: 'paid',
          changedBy: customer1._id,
          changedAt: new Date(Date.now() - 3500000),
          note: 'Payment simulated successfully',
        },
      ],
      createdAt: new Date(Date.now() - 3600000),
    });

    const order2 = await Order.create({
      orderNumber: 'ORD-DEMO-2026-0002',
      customer: customer2._id,
      items: [
        {
          product: createdProducts[1]._id, // Monitor ($349.99)
          seller: seller1._id,
          name: createdProducts[1].name,
          unitPrice: createdProducts[1].price,
          quantity: 1,
          lineTotal: 349.99,
        },
      ],
      subtotal: 349.99,
      discount: 0,
      shippingFee: 0,
      totalAmount: 349.99,
      deliveryAddress: {
        fullName: 'Bob Smith',
        phone: '+1-555-0202',
        line1: '456 Elm Street',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
      payment: {
        method: 'SIMULATED',
        status: 'paid',
        transactionId: 'TXN-DEMO-002',
      },
      status: 'delivered',
      statusHistory: [
        {
          status: 'pending',
          changedBy: customer2._id,
          changedAt: new Date(Date.now() - 86400000 * 3),
          note: 'Order placed',
        },
        {
          status: 'paid',
          changedBy: customer2._id,
          changedAt: new Date(Date.now() - 86400000 * 3),
          note: 'Payment simulated',
        },
        {
          status: 'processing',
          changedBy: seller1._id,
          changedAt: new Date(Date.now() - 86400000 * 2),
          note: 'Items packaged and ready for dispatch',
        },
        {
          status: 'shipped',
          changedBy: seller1._id,
          changedAt: new Date(Date.now() - 86400000 * 1),
          note: 'Carrier tracking #FEDEX-9921',
        },
        {
          status: 'delivered',
          changedBy: seller1._id,
          changedAt: new Date(Date.now() - 3600000),
          note: 'Package signed and received',
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 3),
    });

    console.log('\n======================================================');
    console.log('      DATABASE SEEDING COMPLETED SUCCESSFULLY!        ');
    console.log('======================================================');
    console.log('\nDemo User Accounts & Credentials:');
    console.table([
      { Role: 'Admin', Email: 'admin@ecommerce.test', Password: 'Admin@123', Name: 'System Administrator' },
      { Role: 'Seller 1', Email: 'seller1@techgear.test', Password: 'Seller@123', Name: 'TechGear Official' },
      { Role: 'Seller 2', Email: 'seller2@urbanwear.test', Password: 'Seller@123', Name: 'UrbanStyle Apparel' },
      { Role: 'Customer 1', Email: 'customer1@example.test', Password: 'Customer@123', Name: 'Alice Johnson' },
      { Role: 'Customer 2', Email: 'customer2@example.test', Password: 'Customer@123', Name: 'Bob Smith' },
      { Role: 'Customer 3', Email: 'customer3@example.test', Password: 'Customer@123', Name: 'Clara Oswald' },
    ]);

    console.log('\nSeed Summary:');
    console.log(`- Categories created: 4`);
    console.log(`- Products created:   ${createdProducts.length}`);
    console.log(`- Low-stock items:    ${createdProducts.filter((p) => p.stock <= p.lowStockThreshold && p.stock > 0).length}`);
    console.log(`- Out-of-stock items: ${createdProducts.filter((p) => p.stock === 0).length}`);
    console.log(`- Coupons:            2 (WELCOME10, EXPIRED50)`);
    console.log(`- Sample Orders:      2 (Statuses: ${order1.status}, ${order2.status})`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('Seeding failed with error:', error);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  seed();
}

module.exports = seed;
