const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/apiError');

class CategoryService {
  async getAllCategories(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    return Category.find(filter).sort({ name: 1 });
  }

  async getCategoryById(id) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    return category;
  }

  async createCategory({ name, description }) {
    const existing = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      throw ApiError.conflict(`Category with name '${name}' already exists`);
    }

    const category = await Category.create({ name, description });
    return category;
  }

  async updateCategory(id, updateData) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    if (updateData.name && updateData.name.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await Category.findOne({
        name: new RegExp(`^${updateData.name}$`, 'i'),
        _id: { $ne: id },
      });
      if (existing) {
        throw ApiError.conflict(`Category with name '${updateData.name}' already exists`);
      }
      category.name = updateData.name;
    }

    if (updateData.description !== undefined) {
      category.description = updateData.description;
    }

    if (updateData.isActive !== undefined) {
      category.isActive = updateData.isActive;
    }

    await category.save();
    return category;
  }

  async deleteCategory(id) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Check if products still reference this category
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      throw ApiError.conflict(
        `Cannot delete category: ${productCount} product(s) still reference it`
      );
    }

    await Category.findByIdAndDelete(id);
    return true;
  }
}

module.exports = new CategoryService();
