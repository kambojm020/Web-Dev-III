const express = require('express');
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// All reports require seller or admin
router.use(authenticate, authorize('seller', 'admin'));

router.get('/sales-summary', reportController.getSalesSummary);
router.get('/best-sellers', reportController.getBestSellers);
router.get('/inventory-summary', reportController.getInventorySummary);
router.get('/category-sales', reportController.getCategorySales);

module.exports = router;
