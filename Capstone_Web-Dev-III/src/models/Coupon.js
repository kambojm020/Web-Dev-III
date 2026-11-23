const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Coupon code cannot exceed 30 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ['percent', 'fixed'],
        message: "Coupon type must be 'percent' or 'fixed'",
      },
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [0, 'Coupon value cannot be negative'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
      default: 100,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

couponSchema.methods.isValid = function (orderSubtotal = 0) {
  if (!this.isActive) return { valid: false, message: 'Coupon is inactive' };
  if (new Date() > this.expiresAt) return { valid: false, message: 'Coupon has expired' };
  if (this.usedCount >= this.usageLimit) return { valid: false, message: 'Coupon usage limit reached' };
  if (orderSubtotal < this.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order amount of $${this.minOrderAmount.toFixed(2)} required for this coupon`,
    };
  }
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function (subtotal) {
  let discount = 0;
  if (this.type === 'percent') {
    discount = (subtotal * this.value) / 100;
  } else if (this.type === 'fixed') {
    discount = this.value;
  }
  return Math.min(Math.round(discount * 100) / 100, subtotal);
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
