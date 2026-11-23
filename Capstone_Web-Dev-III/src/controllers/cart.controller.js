const cartService = require('../services/cart.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class CartController {
  getCart = asyncHandler(async (req, res) => {
    const cart = await cartService.getCart(req.user._id);
    return ApiResponse.success(res, 200, 'Cart retrieved successfully', cart);
  });

  addItem = asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;
    const cart = await cartService.addItem(req.user._id, { productId, quantity });
    return ApiResponse.success(res, 200, 'Item added to cart successfully', cart);
  });

  updateItem = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateItem(req.user._id, productId, quantity);
    return ApiResponse.success(res, 200, 'Cart updated successfully', cart);
  });

  removeItem = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const cart = await cartService.removeItem(req.user._id, productId);
    return ApiResponse.success(res, 200, 'Item removed from cart successfully', cart);
  });

  clearCart = asyncHandler(async (req, res) => {
    const cart = await cartService.clearCart(req.user._id);
    return ApiResponse.success(res, 200, 'Cart cleared successfully', cart);
  });
}

module.exports = new CartController();
