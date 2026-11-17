const crypto = require('crypto');

const FOLDER = 'adab/profile-images';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB in bytes
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates whether Cloudinary environment variables are configured
 */
function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  const isConfigured = Boolean(
    cloudName &&
    apiKey &&
    apiSecret &&
    !cloudName.startsWith('your_') &&
    !apiKey.startsWith('your_') &&
    !apiSecret.startsWith('your_')
  );

  return {
    cloudName,
    apiKey,
    apiSecret,
    isConfigured
  };
}

/**
 * Generates parameters and SHA-1 signature for direct client-to-Cloudinary upload
 */
function generateUploadSignature(userId, fileType, fileSize) {
  const config = getCloudinaryConfig();
  if (!config.isConfigured) {
    const error = new Error('Cloudinary storage is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Customer-Backend/.env.');
    error.status = 503;
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }

  // Server-side validation: MIME type
  if (fileType) {
    const normalizedType = String(fileType).toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
      const error = new Error('Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed.');
      error.status = 400;
      error.code = 'INVALID_FILE_TYPE';
      throw error;
    }
  }

  // Server-side validation: File size
  if (fileSize) {
    const bytes = Number(fileSize);
    if (isNaN(bytes) || bytes <= 0) {
      const error = new Error('Invalid file size provided.');
      error.status = 400;
      error.code = 'INVALID_FILE_SIZE';
      throw error;
    }
    if (bytes > MAX_FILE_SIZE) {
      const error = new Error('File size exceeds the 2 MB limit. Please select a smaller photo.');
      error.status = 400;
      error.code = 'FILE_TOO_LARGE';
      throw error;
    }
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `cust_${userId}_${Date.now()}`;

  // Cloudinary signature parameters must be sorted alphabetically by key
  const paramsToSign = {
    folder: FOLDER,
    public_id: publicId,
    timestamp: timestamp
  };

  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&');
  const stringToSign = `${serialized}${config.apiSecret}`;

  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    folder: FOLDER,
    publicId: publicId,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    maxBytes: MAX_FILE_SIZE,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
  };
}

/**
 * Deletes an image asset from Cloudinary via its REST destroy endpoint
 */
async function deleteCloudinaryAsset(publicId) {
  if (!publicId || typeof publicId !== 'string' || !publicId.trim()) {
    return { success: true, skipped: true };
  }

  const config = getCloudinaryConfig();
  if (!config.isConfigured) {
    console.warn('Skipping Cloudinary asset destroy: credentials not configured in environment.');
    return { success: false, skipped: true, reason: 'CLOUDINARY_NOT_CONFIGURED' };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const cleanPublicId = publicId.trim();

    const paramsToSign = {
      public_id: cleanPublicId,
      timestamp: timestamp
    };

    const sortedKeys = Object.keys(paramsToSign).sort();
    const serialized = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&');
    const stringToSign = `${serialized}${config.apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    const formData = new URLSearchParams();
    formData.append('public_id', cleanPublicId);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const data = await response.json();
    const isSuccess = data.result === 'ok' || data.result === 'not found';
    return { success: isSuccess, data };
  } catch (err) {
    console.warn(`Failed to destroy Cloudinary asset "${publicId}":`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  FOLDER,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  getCloudinaryConfig,
  generateUploadSignature,
  deleteCloudinaryAsset
};
