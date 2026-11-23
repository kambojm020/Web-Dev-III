const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const requestLogger = require('./middlewares/requestLogger');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const apiRouter = require('./routes');

const app = express();

// Security HTTP headers
app.use(helmet());

// Enable CORS
app.use(
  cors({
    origin: config.clientOrigin === '*' ? '*' : config.clientOrigin.split(','),
    credentials: true,
  })
);

// Body parsing with strict size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging (omit in test mode to keep test output clean)
if (config.env !== 'test') {
  app.use(requestLogger);
}

// Mount API routes under /api
app.use('/api', apiRouter);

// Catch-all 404 handler
app.use(notFound);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
