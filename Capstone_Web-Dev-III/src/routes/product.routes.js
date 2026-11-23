const express = require('express');
const productController = require('../controllers/product.controller');
const reviewController = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createProductValidator,
  updateProductValidator,
  updateStockValidator,
} = require('../validators/product.validator');
const { createReviewValidator } = require('../validators/review.validator');

const router = express.Router();

// Reviews on products
router.get('/:id/reviews', reviewController.getProductReviews);
router.post(
  '/:id/reviews',
  authenticate,
  authorize('customer'),
  validate(createReviewValidator),
  reviewController.createReview
);

// Public endpoints
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Seller & Admin protected endpoints
router.post(
  '/',
  authenticate,
  authorize('seller', 'admin'),
  validate(createProductValidator),
  productController.createProduct
);

router.patch(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  validate(updateProductValidator),
  productController.updateProduct
);

router.patch(
  '/:id/stock',
  authenticate,
  authorize('seller', 'admin'),
  validate(updateStockValidator),
  productController.updateStock
);

router.delete(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  productController.deleteProduct
);

module.exports = router;
