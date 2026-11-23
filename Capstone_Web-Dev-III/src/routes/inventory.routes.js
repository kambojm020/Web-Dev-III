const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// Inventory is accessible by seller or admin
router.use(authenticate, authorize('seller', 'admin'));

router.get('/low-stock', inventoryController.getLowStock);
router.get('/summary', inventoryController.getSummary);

module.exports = router;
