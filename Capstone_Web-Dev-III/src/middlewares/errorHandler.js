const ApiError = require('../utils/apiError');
const config = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose CastError (e.g., invalid ObjectId)
  if (error.name === 'CastError') {
    const message = `Invalid ${error.path}: ${error.value}`;
    error = ApiError.badRequest(message);
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (error.code === 11000) {
    const keys = Object.keys(error.keyValue || {});
    const field = keys.length ? keys.join(', ') : 'field';
    const message = `Duplicate value entered for ${field}. Value must be unique.`;
    error = ApiError.conflict(message);
  }

  // Handle Mongoose ValidationError
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Validation Error', validationErrors);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid authentication token');
  }
  if (error.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Authentication token has expired');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const errors = error.errors && error.errors.length > 0 ? error.errors : undefined;

  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  if (config.env === 'development' && statusCode === 500) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
