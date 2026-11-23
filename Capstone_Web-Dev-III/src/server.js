const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');

const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Start server after connecting to MongoDB
const startServer = async () => {
  try {
    await connectDB();
    server.listen(config.port, () => {
      console.log(`[Server] Running on port ${config.port} in ${config.env} mode`);
      console.log(`[Server] Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    console.error(`[Server] Failed to start: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`[Server] Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

if (config.env !== 'test') {
  startServer();
}

module.exports = { app, server, io };
