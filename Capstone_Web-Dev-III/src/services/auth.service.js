const User = require('../models/User');
const ApiError = require('../utils/apiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('./token.service');

class AuthService {
  async register({ name, email, password, role = 'customer' }) {
    if (role === 'admin') {
      throw ApiError.badRequest('Admin role cannot be self-registered');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokenHash = await User.hashToken(refreshToken);
    await user.save();

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('User account is deactivated. Please contact support.');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokenHash = await User.hashToken(refreshToken);
    await user.save();

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refresh(refreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id).select('+refreshTokenHash');
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('User account is deactivated');
    }

    const isValid = await user.compareRefreshToken(refreshToken);
    if (!isValid) {
      throw ApiError.unauthorized('Invalid refresh token or token has been revoked');
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshTokenHash = await User.hashToken(newRefreshToken);
    await user.save();

    return {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  async logout(userId) {
    const user = await User.findById(userId).select('+refreshTokenHash');
    if (user) {
      user.refreshTokenHash = null;
      await user.save();
    }
    return true;
  }
}

module.exports = new AuthService();
