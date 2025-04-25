const cloudinary = require('cloudinary').v2;
const { createLogger, format, transports } = require('winston');
const streamifier = require('streamifier');

// Configure logger for Cloudinary operations
const cloudinaryLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/cloudinary.log' })
  ]
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS
  cdn_subdomain: true // Enable CDN subdomains
});

// Helper function to delete resources
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true // Invalidate CDN cache
    });
    cloudinaryLogger.info(`Deleted resource: ${publicId}`, { result });
    return result;
  } catch (error) {
    cloudinaryLogger.error(`Failed to delete resource: ${publicId}`, { error });
    throw error;
  }
};

// Helper to extract public ID from URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const matches = url.match(/upload\/(?:v\d+\/)?([^\.]+)/);
  return matches ? matches[1] : null;
};

// Custom upload stream with logging
const uploadStream = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        ...options
      },
      (error, result) => {
        if (result) {
          cloudinaryLogger.info(`Uploaded: ${result.secure_url}`);
          resolve(result);
        } else {
          cloudinaryLogger.error('Upload failed', { error });
          reject(new Error(error.message));
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = {
  cloudinary,
  deleteFromCloudinary,
  getPublicIdFromUrl,
  uploadStream
};