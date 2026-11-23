const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      jti: crypto.randomUUID(),
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.accessSecret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
