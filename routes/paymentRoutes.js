const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const {
  createOrder,
  verifyPayment,
  webhook,
  getPaymentsByBooking,
} = require('../controllers/paymentController');

const router = express.Router();

router.post(
  '/payments/create-order',
  requireAuth,
  body('bookingId').isMongoId().withMessage('Invalid booking id'),
  validate,
  createOrder
);

router.post(
  '/payments/verify',
  requireAuth,
  body('orderId').notEmpty().withMessage('orderId is required'),
  body('paymentId').notEmpty().withMessage('paymentId is required'),
  body('signature').notEmpty().withMessage('signature is required'),
  body('bookingId').isMongoId().withMessage('Invalid booking id'),
  validate,
  verifyPayment
);

router.post('/payments/webhook', webhook);

router.get(
  '/payments/:bookingId',
  requireAuth,
  param('bookingId').isMongoId().withMessage('Invalid booking id'),
  validate,
  getPaymentsByBooking
);

module.exports = router;