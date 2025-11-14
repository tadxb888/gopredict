const logger = require('../utils/logger');

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.path
  });
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  logger.logError(err, req);

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Async route wrapper to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error handler
 */
function validationErrorHandler(errors) {
  return {
    success: false,
    message: 'Validation failed',
    errors: errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }))
  };
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  validationErrorHandler
};
