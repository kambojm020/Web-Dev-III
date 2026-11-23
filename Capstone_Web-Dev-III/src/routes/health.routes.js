const express = require('express');
const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

router.get('/health', (req, res) => {
  const mongoStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const data = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: mongoStatusMap[mongoose.connection.readyState] || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  };

  return ApiResponse.success(res, 200, 'Service is running normally', data);
});

module.exports = router;
