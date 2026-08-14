const cloudinary = require('cloudinary').v2;

const hasCloudinaryConfig = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const getCloudinary = () => {
  if (!hasCloudinaryConfig()) {
    throw new Error('Cloudinary credentials not configured in .env');
  }
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  return cloudinary;
};

module.exports = { getCloudinary, hasCloudinaryConfig };
