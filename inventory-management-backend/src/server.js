const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./config/prisma');

const server = http.createServer(app);

server.listen(env.PORT, () => {
  logger.info(`🚀 Inventory Management Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  if (env.NODE_ENV === 'production') {
    logger.info(`📡 API Route Prefix: ${env.API_PREFIX}`);
  } else {
    logger.info(`📡 API Base Path: http://localhost:${env.PORT}${env.API_PREFIX}`);
  }
  logger.info(`🌐 Configured Frontend Origin: ${env.FRONTEND_ORIGIN}`);
});

const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Closing server gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
    } catch (e) {
      // ignore
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Force shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', { message: err.message, stack: err.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { message: err.message, stack: err.stack });
  process.exit(1);
});
