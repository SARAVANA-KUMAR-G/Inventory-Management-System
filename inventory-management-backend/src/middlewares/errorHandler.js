const { AppError } = require('../utils/errors');
const { sendError } = require('../utils/responseEnvelope');
const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error(err.message, {
    stack: err.stack,
    requestId: req.id,
    path: req.originalUrl,
    method: req.method
  });

  // Handle known AppError
  if (err instanceof AppError) {
    return sendError(res, err, err.statusCode, req.id);
  }

  // Handle Zod Error
  if (err.name === 'ZodError') {
    const details = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }));
    return sendError(res, {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details
    }, 400, req.id);
  }

  // Handle Prisma Errors
  if (err.code === 'P2002') {
    const target = err.meta?.target || 'Field';
    return sendError(res, {
      code: 'DUPLICATE_RESOURCE',
      message: `A resource with this ${target} already exists.`,
      details: err.meta
    }, 409, req.id);
  }

  if (err.code === 'P2025') {
    return sendError(res, {
      code: 'RESOURCE_NOT_FOUND',
      message: 'The requested record was not found.',
      details: err.meta
    }, 404, req.id);
  }

  // Default internal server error
  return sendError(res, {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : err.message
  }, 500, req.id);
}

module.exports = errorHandler;

