const reviewService = require('../services/review.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class ReviewController {
  createReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const review = await reviewService.createReview(req.params.id, req.user._id, {
      rating,
      comment,
    });
    return ApiResponse.created(res, 'Review submitted successfully', review);
  });

  getProductReviews = asyncHandler(async (req, res) => {
    const { reviews, meta } = await reviewService.getProductReviews(
      req.params.id,
      req.query
    );
    return ApiResponse.success(res, 200, 'Reviews retrieved successfully', reviews, meta);
  });
}

module.exports = new ReviewController();
