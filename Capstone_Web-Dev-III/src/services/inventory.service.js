const mongoose = require('mongoose');
const Product = require('../models/Product');

class InventoryService {
  async getLowStock(user) {
    const filter = {
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    };

    if (user.role === 'seller') {
      filter.seller = user._id;
    }

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .populate('seller', 'name email')
      .sort({ stock: 1 });

    return products;
  }

  async getInventorySummary(user) {
    const match = { isActive: true };
    if (user.role === 'seller') {
      match.seller = new mongoose.Types.ObjectId(user._id);
    }

    const stats = await Product.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
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
          totalStockValue: {
            $sum: { $multiply: ['$price', '$stock'] },
          },
        },
      },
    ]);

    if (!stats.length) {
      return {
        totalProducts: 0,
        totalStockUnits: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
        totalStockValue: 0,
      };
    }

    const result = stats[0];
    delete result._id;
    result.totalStockValue = Math.round(result.totalStockValue * 100) / 100;
    return result;
  }
}

module.exports = new InventoryService();
