const express = require('express');
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/products', authenticate, authorize('seller'), productController.getSellerProducts);

module.exports = router;
