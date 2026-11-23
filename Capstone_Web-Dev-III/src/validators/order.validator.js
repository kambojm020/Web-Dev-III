const { body, param, query } = require('express-validator');

const createOrderValidator = [
  body('deliveryAddress')
    .isObject()
    .withMessage('Delivery address is required'),
  body('deliveryAddress.fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required in delivery address'),
  body('deliveryAddress.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required in delivery address'),
  body('deliveryAddress.line1')
    .trim()
    .notEmpty()
    .withMessage('Address line 1 is required in delivery address'),
  body('deliveryAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required in delivery address'),
  body('deliveryAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required in delivery address'),
  body('deliveryAddress.postalCode')
    .trim()
    .notEmpty()
    .withMessage('Postal code is required in delivery address'),
  body('deliveryAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required in delivery address'),
  body('couponCode')
    .optional()
    .trim()
    .toUpperCase(),
];

const updateOrderStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('status')
    .isIn(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status value'),
  body('note')
    .optional()
    .trim(),
];

const cancelOrderValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('note')
    .optional()
    .trim(),
];

module.exports = {
  createOrderValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
};
