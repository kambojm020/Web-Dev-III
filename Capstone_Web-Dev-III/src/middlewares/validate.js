const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations in parallel to gather all field errors
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return ApiResponse.error(res, 400, 'Validation failed', extractedErrors);
  };
};

module.exports = validate;
