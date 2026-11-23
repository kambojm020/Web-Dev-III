const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      429,
      'Too many requests from this IP, please try again after 15 minutes.'
    );
  },
});

module.exports = {
  authLimiter,
};
