const { requireRoles } = require('./authMiddleware');

const requireAdmin = requireRoles('admin');

module.exports = { requireAdmin };