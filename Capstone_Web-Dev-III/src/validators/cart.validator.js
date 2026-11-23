const { body, param } = require('express-validator');

const addItemValidator = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer greater than or equal to 1'),
];

const updateItemValidator = [
  param('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer (0 removes the item)'),
];

const removeItemValidator = [
  param('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
];

module.exports = {
  addItemValidator,
  updateItemValidator,
  removeItemValidator,
};
