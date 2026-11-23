const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/apiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const appEmitter = require('../events');

class ProductService {
  async getProducts(query = {}) {
    const { page, limit, skip } = getPagination(query);

    // Build query filter with strict allowlisting against NoSQL injection
    const filter = { isActive: true };

    if (query.q && typeof query.q === 'string' && query.q.trim()) {
      filter.$text = { $search: query.q.trim() };
    }

    if (query.category && typeof query.category === 'string') {
      filter.category = query.category;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      const min = parseFloat(query.minPrice);
      const max = parseFloat(query.maxPrice);
      if (!Number.isNaN(min)) filter.price.$gte = min;
      if (!Number.isNaN(max)) filter.price.$lte = max;
    }

    if (query.inStock === 'true' || query.inStock === true) {
      filter.stock = { $gt: 0 };
    }

    // Sort allowlist
    const allowedSortFields = [
      'price',
      '-price',
      'createdAt',
      '-createdAt',
      'name',
      '-name',
      'averageRating',
      '-averageRating',
    ];

    let sortOption = { createdAt: -1 };
    if (query.sort && allowedSortFields.includes(query.sort)) {
      const field = query.sort.startsWith('-') ? query.sort.substring(1) : query.sort;
      const order = query.sort.startsWith('-') ? -1 : 1;
      sortOption = { [field]: order };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('seller', 'name email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    const meta = getPaginationMeta(total, page, limit);
    return { products, meta };
  }

  async getProductById(id, user = null) {
    const product = await Product.findById(id)
      .populate('category', 'name slug')
      .populate('seller', 'name email');

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Inactive products are hidden from public/customers
    if (!product.isActive) {
      const isOwner = user && user._id && product.seller._id.toString() === user._id.toString();
      const isAdmin = user && user.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw ApiError.notFound('Product not found');
      }
    }

    return product;
  }

  async createProduct(productData, user) {
    // Check category exists and is active
    const category = await Category.findById(productData.category);
    if (!category || !category.isActive) {
      throw ApiError.badRequest('Valid active category is required');
    }

    const sellerId = user.role === 'seller' ? user._id : productData.seller || user._id;

    const product = await Product.create({
      ...productData,
      seller: sellerId,
    });

    return product.populate(['category', 'seller']);
  }

  async updateProduct(id, updateData, user) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Ownership check for seller
    if (user.role === 'seller' && product.seller.toString() !== user._id.toString()) {
      throw ApiError.forbidden('You can only modify your own products');
    }

    if (updateData.category) {
      const category = await Category.findById(updateData.category);
      if (!category || !category.isActive) {
        throw ApiError.badRequest('Valid active category is required');
      }
      product.category = updateData.category;
    }

    if (updateData.name) product.name = updateData.name;
    if (updateData.description) product.description = updateData.description;
    if (updateData.price !== undefined) product.price = updateData.price;
    if (updateData.lowStockThreshold !== undefined) {
      product.lowStockThreshold = updateData.lowStockThreshold;
    }
    if (updateData.isActive !== undefined) product.isActive = updateData.isActive;

    await product.save();
    return product.populate(['category', 'seller']);
  }

  async updateStock(id, { stock, adjustment }, user) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Ownership check for seller
    if (user.role === 'seller' && product.seller.toString() !== user._id.toString()) {
      throw ApiError.forbidden('You can only modify stock for your own products');
    }

    let newStock = product.stock;
    if (stock !== undefined) {
      newStock = stock;
    } else if (adjustment !== undefined) {
      newStock = product.stock + adjustment;
    }

    if (newStock < 0) {
      throw ApiError.badRequest('Stock cannot become negative');
    }

    product.stock = newStock;
    await product.save();

    // Emit event if stock is at or below threshold
    if (product.stock <= product.lowStockThreshold) {
      appEmitter.emit('stock.low', {
        product,
        currentStock: product.stock,
        threshold: product.lowStockThreshold,
      });
    }

    return product;
  }

  async deleteProduct(id, user) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Ownership check for seller
    if (user.role === 'seller' && product.seller.toString() !== user._id.toString()) {
      throw ApiError.forbidden('You can only delete your own products');
    }

    // Soft delete
    product.isActive = false;
    await product.save();
    return true;
  }

  async getSellerProducts(sellerId, query = {}) {
    const { page, limit, skip } = getPagination(query);

    const filter = { seller: sellerId };
    if (query.inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    const meta = getPaginationMeta(total, page, limit);
    return { products, meta };
  }
}

module.exports = new ProductService();
