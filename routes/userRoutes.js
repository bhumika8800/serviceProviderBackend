const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const upload = require('../middleware/uploadMiddleware');
const {
  getMe,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  uploadImage,
} = require('../controllers/userController');

const router = express.Router();

router.get('/me', requireAuth, getMe);

router.patch(
  '/me',
  requireAuth,
  body('email').optional().isEmail().withMessage('A valid email is required'),
  validate,
  updateProfile
);

router.post(
  '/me/addresses',
  requireAuth,
  body('line1').notEmpty().withMessage('Address line 1 is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('pincode').notEmpty().withMessage('Pincode is required'),
  body('label').optional().isIn(['home', 'work', 'other']).withMessage('label must be home, work or other'),
  validate,
  addAddress
);

router.patch(
  '/me/addresses/:addressId',
  requireAuth,
  param('addressId').isMongoId().withMessage('Invalid address id'),
  body('label').optional().isIn(['home', 'work', 'other']).withMessage('label must be home, work or other'),
  validate,
  updateAddress
);

router.delete(
  '/me/addresses/:addressId',
  requireAuth,
  param('addressId').isMongoId().withMessage('Invalid address id'),
  validate,
  deleteAddress
);

router.post('/me/upload-image', requireAuth, upload.single('image'), uploadImage);

module.exports = router;
