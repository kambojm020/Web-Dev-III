const { body, param, query } = require('express-validator');

const createProductValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 200 })
    .withMessage('Product name cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be an integer greater than or equal to 0'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),
  body('seller')
    .optional()
    .isMongoId()
    .withMessage('Seller must be a valid user ID'),
];

const updateProductValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Product name cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Threshold must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

const updateStockValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('adjustment')
    .optional()
    .isInt()
    .withMessage('Adjustment must be an integer'),
  body().custom((value, { req }) => {
    if (req.body.stock === undefined && req.body.adjustment === undefined) {
      throw new Error("Either 'stock' or 'adjustment' must be provided");
    }
    return true;
  }),
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  updateStockValidator,
};
