const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createCategoryValidator,
  updateCategoryValidator,
} = require('../validators/category.validator');

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin only routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCategoryValidator),
  categoryController.createCategory
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateCategoryValidator),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  categoryController.deleteCategory
);

module.exports = router;
