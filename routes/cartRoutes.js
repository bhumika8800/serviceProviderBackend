const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
} = require('../controllers/cartController');

const router = express.Router();

router.get('/cart', requireAuth, getCart);

router.post(
  '/cart',
  requireAuth,
  body('serviceId').isMongoId().withMessage('Invalid service id'),
  body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('quantity must be an integer between 1 and 99'),
  validate,
  addItem
);

router.patch(
  '/cart/:serviceId',
  requireAuth,
  param('serviceId').isMongoId().withMessage('Invalid service id'),
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('quantity must be an integer between 1 and 99'),
  validate,
  updateQuantity
);

router.delete(
  '/cart/:serviceId',
  requireAuth,
  param('serviceId').isMongoId().withMessage('Invalid service id'),
  validate,
  removeItem
);

router.delete('/cart', requireAuth, clearCart);

module.exports = router;