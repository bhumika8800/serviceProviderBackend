const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const { validate } = require('../utils/validate');
const { listUsers, toggleUserActive, getDashboardStats } = require('../controllers/adminController');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/admin/users',
  query('role').optional().isIn(['customer', 'provider', 'admin']).withMessage('Invalid role'),
  query('q').optional().isString().withMessage('q must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  validate,
  listUsers
);

router.patch(
  '/admin/users/:id/active',
  param('id').isMongoId().withMessage('Invalid user id'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  validate,
  toggleUserActive
);

router.get('/admin/stats', getDashboardStats);

module.exports = router;