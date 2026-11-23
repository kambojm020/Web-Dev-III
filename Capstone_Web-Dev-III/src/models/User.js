const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'User email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['customer', 'seller', 'admin'],
        message: 'Role must be either customer, seller, or admin',
      },
      default: 'customer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash password
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
  return bcrypt.hash(password, salt);
};

// Static helper to hash refresh token using SHA-256 (safe against bcrypt 72-byte truncation on JWTs)
userSchema.statics.hashToken = function (token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Method to verify refresh token using timing-safe comparison
userSchema.methods.compareRefreshToken = function (token) {
  if (!this.refreshTokenHash) return false;
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const bufA = Buffer.from(this.refreshTokenHash);
  const bufB = Buffer.from(hash);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
