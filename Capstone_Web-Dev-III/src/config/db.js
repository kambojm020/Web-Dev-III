const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async (uri = config.mongoUri) => {
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    if (config.env !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed');
  } catch (error) {
    console.error(`[MongoDB] Disconnection error: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
