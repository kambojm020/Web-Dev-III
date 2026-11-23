const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const {
  registerValidator,
  loginValidator,
  refreshValidator,
} = require('../validators/auth.validator');
const { authLimiter } = require('../middlewares/rateLimiter');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// Apply auth rate limiting
router.use(authLimiter);

router.post('/register', validate(registerValidator), authController.register);
router.post('/login', validate(loginValidator), authController.login);
router.post('/refresh', validate(refreshValidator), authController.refresh);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
