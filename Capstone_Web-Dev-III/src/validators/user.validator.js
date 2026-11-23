const { body, param } = require('express-validator');

const updateMeValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+()-\s]{7,20}$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .custom(() => {
      throw new Error('Role cannot be changed via profile update');
    }),
  body('email')
    .optional()
    .custom(() => {
      throw new Error('Email cannot be changed via this endpoint');
    }),
];

const updateUserStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean (true or false)'),
];

module.exports = {
  updateMeValidator,
  updateUserStatusValidator,
};
