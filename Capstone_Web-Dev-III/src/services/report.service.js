const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

class ReportService {
  /**
   * Aggregation Pipeline 1: Sales Summary
   * - Stage 1: $match on non-cancelled order status and optional date range
   * - Stage 2: $unwind items to inspect each ordered line item
   * - Stage 3: $match seller ID if caller is a seller (Seller-Scoped Sales)
   * - Stage 4: $group by period (day or month) and orderId to compute order totals
   * - Stage 5: $group by period to compute overall revenue, orderCount, and averageOrderValue
   * - Stage 6: $sort chronologically
   */
  async getSalesSummary(user, { dateFrom, dateTo, groupBy = 'day' }) {
    const matchConditions = {
      status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
    };

    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
    }

    const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const pipeline = [
      // Stage 1: Match orders by status and date range
      { $match: matchConditions },

      // Stage 2: Unwind items array so each line item can be analyzed
      { $unwind: '$items' },
    ];

    // Stage 3: If seller, scope matching strictly to their items
    if (user.role === 'seller') {
      pipeline.push({
        $match: {
          'items.seller': new mongoose.Types.ObjectId(user._id),
        },
      });
    }

    // Stage 4: Group per order first to calculate individual order revenue for this scope
    pipeline.push({
      $group: {
        _id: {
          period: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          orderId: '$_id',
        },
        orderRevenue: { $sum: '$items.lineTotal' },
      },
    });

    // Stage 5: Group by period to aggregate total revenue, order count, and average order value
    pipeline.push({
      $group: {
        _id: '$_id.period',
        totalRevenue: { $sum: '$orderRevenue' },
        orderCount: { $sum: 1 },
      },
    });

    // Stage 6: Project final calculated fields with rounded values
    pipeline.push({
      $project: {
        _id: 0,
        period: '$_id',
        totalRevenue: { $round: ['$totalRevenue', 2] },
        orderCount: 1,
        averageOrderValue: {
          $round: [
            {
              $cond: [
                { $gt: ['$orderCount', 0] },
                { $divide: ['$totalRevenue', '$orderCount'] },
                0,
              ],
            },
            2,
          ],
        },
      },
    });

    // Stage 7: Sort by period in ascending order
    pipeline.push({
      $sort: { period: 1 },
    });

    const results = await Order.aggregate(pipeline);
    return results;
  }

  /**
   * Aggregation Pipeline 2: Best Sellers
   * - Stage 1: $match on non-cancelled orders and date range
   * - Stage 2: $unwind items
   * - Stage 3: $match seller ID if caller is seller
   * - Stage 4: $group by product ID, summing quantity and revenue
   * - Stage 5: $lookup product details from products collection
   * - Stage 6: $unwind product details
   * - Stage 7: $sort by revenue descending
   * - Stage 8: $limit top N products
   * - Stage 9: $project readable format
   */
  async getBestSellers(user, { limit = 5, dateFrom, dateTo }) {
    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 5), 50);

    const matchConditions = {
      status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
    };

    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
    }

    const pipeline = [
      // Stage 1: Match valid orders
      { $match: matchConditions },

      // Stage 2: Deconstruct items array
      { $unwind: '$items' },
    ];

    // Stage 3: Seller filtering if seller
    if (user.role === 'seller') {
      pipeline.push({
        $match: {
          'items.seller': new mongoose.Types.ObjectId(user._id),
        },
      });
    }

    pipeline.push(
      // Stage 4: Group by product
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
        },
      },

      // Stage 5: Lookup additional product metadata (e.g. current stock, price)
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },

      // Stage 6: Unwind looked up details (preserve if deleted)
      {
        $unwind: {
          path: '$productDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 7: Sort by revenue descending
      { $sort: { totalRevenue: -1 } },

      // Stage 8: Limit to top N
      { $limit: parsedLimit },

      // Stage 9: Project clean representation
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: 1,
          quantitySold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          currentStock: '$productDetails.stock',
          currentPrice: '$productDetails.price',
        },
      }
    );

    const results = await Order.aggregate(pipeline);
    return results;
  }

  /**
   * Aggregation Pipeline 3: Category Inventory Summary
   * - Stage 1: $match active products (and seller if seller)
   * - Stage 2: $group by category, computing totals, out-of-stock, low-stock, and total stock value
   * - Stage 3: $lookup category names from categories collection
   * - Stage 4: $unwind category details
   * - Stage 5: $project clean output
   * - Stage 6: $sort by category name
   */
  async getInventorySummaryReport(user) {
    const matchConditions = { isActive: true };

    if (user.role === 'seller') {
      matchConditions.seller = new mongoose.Types.ObjectId(user._id);
    }

    const pipeline = [
      // Stage 1: Match active products
      { $match: matchConditions },

      // Stage 2: Group by category
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalStockUnits: { $sum: '$stock' },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$stock', 0] }, 1, 0],
            },
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$stock', 0] },
                    { $lte: ['$stock', '$lowStockThreshold'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          stockValue: {
            $sum: { $multiply: ['$price', '$stock'] },
          },
        },
      },

      // Stage 3: Lookup category details
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },

      // Stage 4: Unwind category
      {
        $unwind: {
          path: '$categoryDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 5: Project output format
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: { $ifNull: ['$categoryDetails.name', 'Uncategorized'] },
          categorySlug: '$categoryDetails.slug',
          totalProducts: 1,
          totalStockUnits: 1,
          outOfStockCount: 1,
          lowStockCount: 1,
          stockValue: { $round: ['$stockValue', 2] },
        },
      },

      // Stage 6: Sort alphabetically by category name
      { $sort: { categoryName: 1 } },
    ];

    const results = await Product.aggregate(pipeline);
    return results;
  }

  /**
   * Aggregation Pipeline 4: Category Sales Breakdown
   * - Stage 1: $match valid orders
   * - Stage 2: $unwind items
   * - Stage 3: $match seller ID if seller
   * - Stage 4: $lookup product to find category ID
   * - Stage 5: $unwind product
   * - Stage 6: $group by category, calculating quantitySold and revenue
   * - Stage 7: $lookup category name
   * - Stage 8: $unwind category
   * - Stage 9: $project and sort
   */
  async getCategorySales(user, { dateFrom, dateTo }) {
    const matchConditions = {
      status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
    };

    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
    }

    const pipeline = [
      { $match: matchConditions },
      { $unwind: '$items' },
    ];

    if (user.role === 'seller') {
      pipeline.push({
        $match: {
          'items.seller': new mongoose.Types.ObjectId(user._id),
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      {
        $unwind: {
          path: '$productDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$productDoc.category',
          totalRevenue: { $sum: '$items.lineTotal' },
          totalUnitsSold: { $sum: '$items.quantity' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      {
        $unwind: {
          path: '$categoryDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: { $ifNull: ['$categoryDoc.name', 'Uncategorized'] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalUnitsSold: 1,
        },
      },
      { $sort: { totalRevenue: -1 } }
    );

    const results = await Order.aggregate(pipeline);
    return results;
  }
}

module.exports = new ReportService();
