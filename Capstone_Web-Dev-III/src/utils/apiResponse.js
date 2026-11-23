class ApiResponse {
  static success(res, statusCode = 200, message = 'Success', data = null, meta = undefined) {
    const payload = {
      success: true,
      message,
      data,
    };
    if (meta !== undefined) {
      payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, message = 'Created successfully', data = null, meta = undefined) {
    return ApiResponse.success(res, 201, message, data, meta);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static error(res, statusCode = 500, message = 'Internal Server Error', errors = []) {
    const payload = {
      success: false,
      message,
    };
    if (errors && errors.length > 0) {
      payload.errors = errors;
    }
    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
