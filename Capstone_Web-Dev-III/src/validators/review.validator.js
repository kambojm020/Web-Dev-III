const { body, param } = require('express-validator');

const createReviewValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
];

module.exports = {
  createReviewValidator,
};
