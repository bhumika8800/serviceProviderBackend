const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query } = require('express-validator');
const { requireAuth, requireRoles, optionalAuth } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const { createQuery, listQueries, closeQuery } = require('../controllers/queryController');

const router = express.Router();

const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many submissions. Please try again later.', code: 'RATE_LIMITED' },
});

router.post(
  '/queries',
  queryLimiter,
  optionalAuth,
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('phone').optional().isString().withMessage('phone must be a string'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  validate,
  createQuery
);

router.get(
  '/queries',
  requireAuth,
  requireRoles('admin'),
  query('status').optional().isIn(['open', 'closed']).withMessage('Invalid query status'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  validate,
  listQueries
);

router.patch(
  '/queries/:id/close',
  requireAuth,
  requireRoles('admin'),
  param('id').isMongoId().withMessage('Invalid query id'),
  validate,
  closeQuery
);

module.exports = router;