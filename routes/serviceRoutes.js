const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth, requireRoles } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validate');
const {
  listCategories,
  listServices,
  getService,
  createService,
  updateService,
  deactivateService,
} = require('../controllers/serviceController');

const router = express.Router();

router.get(
  '/categories',
  query('parentId').optional(),
  validate,
  listCategories
);

router.get(
  '/services',
  query('q').optional().isString().withMessage('q must be a string'),
  query('categoryId').optional().isMongoId().withMessage('Invalid category id'),
  query('tag').optional().isString().withMessage('tag must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  validate,
  listServices
);

router.get(
  '/services/:id',
  param('id').isMongoId().withMessage('Invalid service id'),
  validate,
  getService
);

router.post(
  '/services',
  requireAuth,
  requireRoles('admin', 'provider'),
  body('categoryId').isMongoId().withMessage('Invalid category id'),
  body('name').notEmpty().withMessage('Name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('durationMins').isInt({ min: 1 }).withMessage('durationMins must be a positive integer'),
  body('images').optional().isArray().withMessage('images must be an array'),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  validate,
  createService
);

router.patch(
  '/services/:id',
  requireAuth,
  requireRoles('admin', 'provider'),
  param('id').isMongoId().withMessage('Invalid service id'),
  body('categoryId').optional().isMongoId().withMessage('Invalid category id'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('durationMins').optional().isInt({ min: 1 }).withMessage('durationMins must be a positive integer'),
  body('images').optional().isArray().withMessage('images must be an array'),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validate,
  updateService
);

router.delete(
  '/services/:id',
  requireAuth,
  requireRoles('admin', 'provider'),
  param('id').isMongoId().withMessage('Invalid service id'),
  validate,
  deactivateService
);

module.exports = router;
