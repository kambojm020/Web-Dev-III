const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const sellerRoutes = require('./seller.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const couponRoutes = require('./coupon.routes');
const inventoryRoutes = require('./inventory.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/seller', sellerRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/coupons', couponRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
