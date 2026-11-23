const reportService = require('../services/report.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class ReportController {
  getSalesSummary = asyncHandler(async (req, res) => {
    const data = await reportService.getSalesSummary(req.user, req.query);
    return ApiResponse.success(res, 200, 'Sales summary retrieved successfully', data);
  });

  getBestSellers = asyncHandler(async (req, res) => {
    const data = await reportService.getBestSellers(req.user, req.query);
    return ApiResponse.success(res, 200, 'Best sellers retrieved successfully', data);
  });

  getInventorySummary = asyncHandler(async (req, res) => {
    const data = await reportService.getInventorySummaryReport(req.user);
    return ApiResponse.success(res, 200, 'Category inventory summary retrieved successfully', data);
  });

  getCategorySales = asyncHandler(async (req, res) => {
    const data = await reportService.getCategorySales(req.user, req.query);
    return ApiResponse.success(res, 200, 'Category sales report retrieved successfully', data);
  });
}

module.exports = new ReportController();
