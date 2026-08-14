const multer = require('multer');
const ApiError = require('../utils/ApiError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(422, 'Only image files are allowed', 'VALIDATION_ERROR'));
    }
  },
});

module.exports = upload;
