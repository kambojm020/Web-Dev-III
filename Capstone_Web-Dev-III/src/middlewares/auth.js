const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../services/token.service');
const User = require('../models/User');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token is missing or malformed');
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized('User belonging to this token no longer exists');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('User account is deactivated. Please contact support.');
  }

  req.user = user;
  next();
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `User role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
