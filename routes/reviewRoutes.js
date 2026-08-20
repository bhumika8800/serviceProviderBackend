const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const { createReview, listServiceReviews } = require('../controllers/reviewController');

const router = express.Router();

router.post(
  '/reviews',
  requireAuth,
  body('bookingId').isMongoId().withMessage('Invalid booking id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
  body('comment').optional().isString().withMessage('comment must be a string'),
  validate,
  createReview
);

router.get(
  '/services/:id/reviews',
  param('id').isMongoId().withMessage('Invalid service id'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  validate,
  listServiceReviews
);

module.exports = router;