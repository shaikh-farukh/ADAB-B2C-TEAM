/**
 * Backward-compatibility adapter for legacy MinIO calls.
 * All image operations are forwarded to Cloudinary.
 */
const cloudinaryService = require('./cloudinaryService');

const uploadImage = async (fileBuffer, originalName, mimeType) => {
  const result = await cloudinaryService.uploadImage(fileBuffer, originalName, mimeType, { folder: 'adab/products' });
  return result.secure_url;
};

module.exports = {
  uploadImage
};
