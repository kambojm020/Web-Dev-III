const express = require('express');
const cartController = require('../controllers/cart.controller');
const couponController = require('../controllers/coupon.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  addItemValidator,
  updateItemValidator,
  removeItemValidator,
} = require('../validators/cart.validator');
const { applyCouponValidator } = require('../validators/coupon.validator');

const router = express.Router();

// Cart is scoped to customer only
router.use(authenticate, authorize('customer'));

router.get('/', cartController.getCart);
router.post('/items', validate(addItemValidator), cartController.addItem);
router.patch('/items/:productId', validate(updateItemValidator), cartController.updateItem);
router.delete('/items/:productId', validate(removeItemValidator), cartController.removeItem);
router.delete('/', cartController.clearCart);
router.post('/coupon', validate(applyCouponValidator), couponController.applyCoupon);

module.exports = router;
