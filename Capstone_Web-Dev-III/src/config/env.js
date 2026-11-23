const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_capstone',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_jwt_access_secret_replace_in_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_replace_in_production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  lowStockDefault: parseInt(process.env.LOW_STOCK_DEFAULT || '5', 10),
};

module.exports = config;
