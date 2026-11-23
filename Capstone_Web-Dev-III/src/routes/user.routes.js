const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  updateMeValidator,
  updateUserStatusValidator,
} = require('../validators/user.validator');

const router = express.Router();

// Current authenticated user endpoints
router.get('/me', authenticate, userController.getMe);
router.patch('/me', authenticate, validate(updateMeValidator), userController.updateMe);

// Admin endpoints
router.get('/', authenticate, authorize('admin'), userController.getUsers);
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  validate(updateUserStatusValidator),
  userController.updateUserStatus
);

module.exports = router;
