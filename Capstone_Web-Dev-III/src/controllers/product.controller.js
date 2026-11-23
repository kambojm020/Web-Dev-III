const productService = require('../services/product.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class ProductController {
  getProducts = asyncHandler(async (req, res) => {
    const { products, meta } = await productService.getProducts(req.query);
    return ApiResponse.success(res, 200, 'Products retrieved successfully', products, meta);
  });

  getProductById = asyncHandler(async (req, res) => {
    const product = await productService.getProductById(req.params.id, req.user);
    return ApiResponse.success(res, 200, 'Product retrieved successfully', product);
  });

  createProduct = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.body, req.user);
    return ApiResponse.created(res, 'Product created successfully', product);
  });

  updateProduct = asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.body, req.user);
    return ApiResponse.success(res, 200, 'Product updated successfully', product);
  });

  updateStock = asyncHandler(async (req, res) => {
    const { stock, adjustment } = req.body;
    const product = await productService.updateStock(
      req.params.id,
      { stock, adjustment },
      req.user
    );
    return ApiResponse.success(res, 200, 'Product stock updated successfully', product);
  });

  deleteProduct = asyncHandler(async (req, res) => {
    await productService.deleteProduct(req.params.id, req.user);
    return ApiResponse.success(res, 200, 'Product deleted successfully');
  });

  getSellerProducts = asyncHandler(async (req, res) => {
    const { products, meta } = await productService.getSellerProducts(req.user._id, req.query);
    return ApiResponse.success(res, 200, 'Seller products retrieved successfully', products, meta);
  });
}

module.exports = new ProductController();
