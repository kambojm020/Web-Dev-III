const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createOrderValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
} = require('../validators/order.validator');

const router = express.Router();

router.use(authenticate);

// Customer checkout
router.post(
  '/',
  authorize('customer'),
  validate(createOrderValidator),
  orderController.checkout
);

// List orders
router.get('/', orderController.getOrders);

// Single order details
router.get('/:id', orderController.getOrderById);

// Update status (seller or admin)
router.patch(
  '/:id/status',
  authorize('seller', 'admin'),
  validate(updateOrderStatusValidator),
  orderController.updateStatus
);

// Cancel order
router.post(
  '/:id/cancel',
  validate(cancelOrderValidator),
  orderController.cancelOrder
);

module.exports = router;
