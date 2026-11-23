const mongoose = require('mongoose');
const config = require('../config/env');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    // Price stored as a positive 2-decimal number in standard currency units (e.g. 19.99 USD)
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      set: (v) => Math.round(v * 100) / 100,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock count is required'],
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      min: [0, 'Threshold cannot be negative'],
      default: () => config.lowStockDefault,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
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

// Indexes
productSchema.index({ category: 1, price: 1 });
productSchema.index({ seller: 1, stock: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Auto-generate slug before validation if not given
productSchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    this.slug = `${baseSlug}-${randomSuffix}`;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
