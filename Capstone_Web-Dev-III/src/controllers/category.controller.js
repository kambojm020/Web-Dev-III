const categoryService = require('../services/category.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class CategoryController {
  getAllCategories = asyncHandler(async (req, res) => {
    // If admin, can optionally view all (including inactive)
    const includeInactive = req.user && req.user.role === 'admin' && req.query.includeInactive === 'true';
    const categories = await categoryService.getAllCategories(includeInactive);
    return ApiResponse.success(res, 200, 'Categories retrieved successfully', categories);
  });

  getCategoryById = asyncHandler(async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id);
    return ApiResponse.success(res, 200, 'Category retrieved successfully', category);
  });

  createCategory = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const category = await categoryService.createCategory({ name, description });
    return ApiResponse.created(res, 'Category created successfully', category);
  });

  updateCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return ApiResponse.success(res, 200, 'Category updated successfully', category);
  });

  deleteCategory = asyncHandler(async (req, res) => {
    await categoryService.deleteCategory(req.params.id);
    return ApiResponse.success(res, 200, 'Category deleted successfully');
  });
}

module.exports = new CategoryController();
