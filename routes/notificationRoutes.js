const express = require('express');
const { param, query } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const {
  listNotifications,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.get(
  '/notifications',
  requireAuth,
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  validate,
  listNotifications
);

router.patch(
  '/notifications/:id/read',
  requireAuth,
  param('id').isMongoId().withMessage('Invalid notification id'),
  validate,
  markRead
);

router.patch('/notifications/read-all', requireAuth, markAllRead);

module.exports = router;