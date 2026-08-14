const { validationResult } = require('express-validator');
const ApiError = require('./ApiError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(', ');
    return next(new ApiError(422, message, 'VALIDATION_ERROR'));
  }
  next();
};

module.exports = { validate };
