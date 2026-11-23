const { body } = require('express-validator');

const createCouponValidator = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .toUpperCase(),
  body('type')
    .isIn(['percent', 'fixed'])
    .withMessage("Coupon type must be 'percent' or 'fixed'"),
  body('value')
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minOrderAmount must be non-negative'),
  body('expiresAt')
    .isISO8601()
    .withMessage('expiresAt must be a valid ISO8601 date'),
  body('usageLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('usageLimit must be an integer >= 1'),
];

const applyCouponValidator = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .toUpperCase(),
];

module.exports = {
  createCouponValidator,
  applyCouponValidator,
};
