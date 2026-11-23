const Review = require('../models/Review');
const Product = require('../models/Product');
const ApiError = require('../utils/apiError');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

class ReviewService {
  async createReview(productId, userId, { rating, comment }) {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw ApiError.notFound('Product not found or inactive');
    }

    const existing = await Review.findOne({ product: productId, user: userId });
    if (existing) {
      throw ApiError.conflict('You have already reviewed this product');
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      comment,
    });

    return review.populate('user', 'name');
  }

  async getProductReviews(productId, query = {}) {
    const { page, limit, skip } = getPagination(query);

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ product: productId }),
    ]);

    const meta = getPaginationMeta(total, page, limit);
    return { reviews, meta };
  }
}

module.exports = new ReviewService();
