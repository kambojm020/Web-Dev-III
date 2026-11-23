const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigin === '*' ? '*' : config.clientOrigin.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret);
      socket.user = decoded; // { id, role, email }
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user) return;

    // Join user-specific room
    socket.join(`user:${user.id}`);

    // Join role room
    if (user.role === 'seller') {
      socket.join('role:seller');
      socket.join(`seller:${user.id}`);
    } else if (user.role === 'admin') {
      socket.join('role:admin');
    }

    socket.on('disconnect', () => {
      // Handled cleanly
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
