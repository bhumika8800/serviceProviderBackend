const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  if (err.name === 'ValidationError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Duplicate value for a unique field';
  }

  if (err.name === 'CastError') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or expired token';
  }

  if (!err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message, code });
};

module.exports = { notFound, errorHandler };
