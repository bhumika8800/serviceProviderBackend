const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { verify, completeProfile, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');

const router = express.Router();

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' },
});

router.post(
  '/verify',
  verifyLimiter,
  body('idToken').notEmpty().withMessage('idToken is required'),
  validate,
  verify
);

router.post(
  '/complete-profile',
  requireAuth,
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  validate,
  completeProfile
);

router.post('/logout', requireAuth, logout);

module.exports = router;
