const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new ApiError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) {
      throw new ApiError(401, 'User no longer exists', 'UNAUTHORIZED');
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.is_active) {
        req.user = user;
        req.userId = user._id.toString();
      }
    }
    next();
  } catch {
    next();
  }
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));
  }
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
  }
  next();
};

module.exports = { requireAuth, requireRoles, optionalAuth };
