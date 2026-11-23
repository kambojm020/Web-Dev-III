const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Static helper to update product averageRating and reviewCount after review modification
reviewSchema.statics.calcAverageRating = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        reviewCount: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  const Product = mongoose.model('Product');
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      reviewCount: stats[0].reviewCount,
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      reviewCount: 0,
      averageRating: 0,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.product);
});

reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) {
    doc.constructor.calcAverageRating(doc.product);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
