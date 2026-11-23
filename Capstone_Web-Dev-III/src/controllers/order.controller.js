const orderService = require('../services/order.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class OrderController {
  checkout = asyncHandler(async (req, res) => {
    const { deliveryAddress, couponCode } = req.body;
    const order = await orderService.checkout(req.user._id, {
      deliveryAddress,
      couponCode,
    });
    return ApiResponse.created(res, 'Order placed successfully', order);
  });

  getOrders = asyncHandler(async (req, res) => {
    const { orders, meta } = await orderService.getOrders(req.user, req.query);
    return ApiResponse.success(res, 200, 'Orders retrieved successfully', orders, meta);
  });

  getOrderById = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderById(req.params.id, req.user);
    return ApiResponse.success(res, 200, 'Order retrieved successfully', order);
  });

  updateStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    const order = await orderService.updateOrderStatus(
      req.params.id,
      status,
      note,
      req.user
    );
    return ApiResponse.success(res, 200, 'Order status updated successfully', order);
  });

  cancelOrder = asyncHandler(async (req, res) => {
    const { note } = req.body;
    const order = await orderService.cancelOrder(req.params.id, req.user, note);
    return ApiResponse.success(res, 200, 'Order cancelled successfully', order);
  });
}

module.exports = new OrderController();
