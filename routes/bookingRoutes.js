const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth, requireRoles } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const {
  createBooking,
  listBookings,
  getBooking,
  cancelBooking,
  updateStatus,
} = require('../controllers/bookingController');

const router = express.Router();

router.post(
  '/bookings',
  requireAuth,
  body('serviceId').isMongoId().withMessage('Invalid service id'),
  body('addressId').isMongoId().withMessage('Invalid address id'),
  body('bookingDate').isISO8601().withMessage('A valid booking date is required'),
  body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('quantity must be an integer between 1 and 99'),
  validate,
  createBooking
);

router.get(
  '/bookings',
  requireAuth,
  query('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid booking status'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  validate,
  listBookings
);

router.get(
  '/bookings/:id',
  requireAuth,
  param('id').isMongoId().withMessage('Invalid booking id'),
  validate,
  getBooking
);

router.patch(
  '/bookings/:id/cancel',
  requireAuth,
  param('id').isMongoId().withMessage('Invalid booking id'),
  validate,
  cancelBooking
);

router.patch(
  '/bookings/:id/status',
  requireAuth,
  requireRoles('admin', 'provider'),
  param('id').isMongoId().withMessage('Invalid booking id'),
  body('status').isIn(['confirmed', 'in_progress', 'completed']).withMessage('Invalid target status'),
  validate,
  updateStatus
);

module.exports = router;