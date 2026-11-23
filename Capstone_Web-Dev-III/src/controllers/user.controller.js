const userService = require('../services/user.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class UserController {
  getMe = asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user._id);
    return ApiResponse.success(res, 200, 'Profile fetched successfully', user);
  });

  updateMe = asyncHandler(async (req, res) => {
    const { name, phone } = req.body;
    const updatedUser = await userService.updateProfile(req.user._id, { name, phone });
    return ApiResponse.success(res, 200, 'Profile updated successfully', updatedUser);
  });

  getUsers = asyncHandler(async (req, res) => {
    const { users, meta } = await userService.getUsers(req.query);
    return ApiResponse.success(res, 200, 'Users retrieved successfully', users, meta);
  });

  updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await userService.updateUserStatus(id, isActive);
    return ApiResponse.success(
      res,
      200,
      `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    );
  });
}

module.exports = new UserController();
