const inventoryService = require('../services/inventory.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class InventoryController {
  getLowStock = asyncHandler(async (req, res) => {
    const products = await inventoryService.getLowStock(req.user);
    return ApiResponse.success(res, 200, 'Low stock products retrieved successfully', products);
  });

  getSummary = asyncHandler(async (req, res) => {
    const summary = await inventoryService.getInventorySummary(req.user);
    return ApiResponse.success(res, 200, 'Inventory summary retrieved successfully', summary);
  });
}

module.exports = new InventoryController();
