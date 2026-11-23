const ApiError = require('../utils/apiError');

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
