const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const ApiError = require('../utils/apiError');
const cartService = require('./cart.service');

class CouponService {
  async createCoupon(data) {
    const existing = await Coupon.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw ApiError.conflict(`Coupon code '${data.code}' already exists`);
    }

    const coupon = await Coupon.create({
      ...data,
      code: data.code.toUpperCase(),
    });
    return coupon;
  }

  async getCoupons() {
    return Coupon.find().sort({ createdAt: -1 });
  }

  async validateAndApply(userId, code) {
    const cart = await cartService.getCart(userId);
    if (!cart.items.length) {
      throw ApiError.badRequest('Cart is empty. Add items before applying a coupon.');
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      throw ApiError.notFound('Invalid coupon code');
    }

    const check = coupon.isValid(cart.subtotal);
    if (!check.valid) {
      throw ApiError.badRequest(check.message);
    }

    const discount = coupon.calculateDiscount(cart.subtotal);
    const newTotal = Math.round((cart.subtotal - discount) * 100) / 100;

    return {
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      originalSubtotal: cart.subtotal,
      discount,
      discountedSubtotal: newTotal,
    };
  }
}

module.exports = new CouponService();
