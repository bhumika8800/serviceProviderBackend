const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth, requireRoles } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const {
  createComplaint,
  listComplaints,
  getComplaint,
  updateComplaintStatus,
} = require('../controllers/complaintController');

const router = express.Router();

router.post(
  '/complaints',
  requireAuth,
  body('bookingId').isMongoId().withMessage('Invalid booking id'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  validate,
  createComplaint
);

router.get(
  '/complaints',
  requireAuth,
  query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid complaint status'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  validate,
  listComplaints
);

router.get(
  '/complaints/:id',
  requireAuth,
  param('id').isMongoId().withMessage('Invalid complaint id'),
  validate,
  getComplaint
);

router.patch(
  '/complaints/:id/status',
  requireAuth,
  requireRoles('admin'),
  param('id').isMongoId().withMessage('Invalid complaint id'),
  body('status').isIn(['in_progress', 'resolved', 'closed']).withMessage('Invalid target status'),
  body('resolutionNotes').optional().isString().withMessage('resolutionNotes must be a string'),
  validate,
  updateComplaintStatus
);

module.exports = router;