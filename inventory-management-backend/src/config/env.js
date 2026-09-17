require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
    throw new Error('FATAL CONFIG ERROR: DATABASE_URL must be defined in production');
  }
  if (
    !process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_ACCESS_SECRET === 'dev_jwt_access_secret_inventory_v1' ||
    !process.env.JWT_ACCESS_SECRET.trim()
  ) {
    throw new Error('FATAL CONFIG ERROR: A secure JWT_ACCESS_SECRET must be defined in production (cannot use default dev secret)');
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_inventory_v1',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10
};
