const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async updateProfile(userId, { name, phone }) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();
    return user;
  }

  async getUsers(query) {
    const { page, limit, skip } = getPagination(query);

    const filter = {};
    if (query.role && ['customer', 'seller', 'admin'].includes(query.role)) {
      filter.role = query.role;
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true' || query.isActive === true;
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const meta = getPaginationMeta(total, page, limit);
    return { users, meta };
  }

  async updateUserStatus(userId, isActive) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.isActive = isActive;
    await user.save();
    return user;
  }
}

module.exports = new UserService();
