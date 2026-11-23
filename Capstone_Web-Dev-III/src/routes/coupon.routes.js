const express = require('express');
const couponController = require('../controllers/coupon.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createCouponValidator,
  applyCouponValidator,
} = require('../validators/coupon.validator');

const router = express.Router();

// Admin routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCouponValidator),
  couponController.createCoupon
);

router.get('/', authenticate, authorize('admin'), couponController.getCoupons);

module.exports = router;
