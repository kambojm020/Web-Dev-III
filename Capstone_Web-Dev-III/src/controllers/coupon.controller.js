const couponService = require('../services/coupon.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class CouponController {
  createCoupon = asyncHandler(async (req, res) => {
    const coupon = await couponService.createCoupon(req.body);
    return ApiResponse.created(res, 'Coupon created successfully', coupon);
  });

  getCoupons = asyncHandler(async (req, res) => {
    const coupons = await couponService.getCoupons();
    return ApiResponse.success(res, 200, 'Coupons retrieved successfully', coupons);
  });

  applyCoupon = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const result = await couponService.validateAndApply(req.user._id, code);
    return ApiResponse.success(res, 200, 'Coupon applied successfully', result);
  });
}

module.exports = new CouponController();
