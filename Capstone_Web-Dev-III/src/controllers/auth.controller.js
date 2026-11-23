const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });
    return ApiResponse.created(res, 'User registered successfully', result);
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return ApiResponse.success(res, 200, 'Login successful', result);
  });

  refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    return ApiResponse.success(res, 200, 'Token refreshed successfully', result);
  });

  logout = asyncHandler(async (req, res) => {
    // If authenticated via token, user is req.user
    if (req.user) {
      await authService.logout(req.user._id);
    }
    return ApiResponse.success(res, 200, 'Logged out successfully');
  });
}

module.exports = new AuthController();
