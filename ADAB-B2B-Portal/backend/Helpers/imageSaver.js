import crypto from 'crypto';
import path from 'path';
import minioClient, { BUCKET_NAME } from '../Config/minioClient.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

import fs from 'fs';
import fileURLToPath from 'url';

const __filename = fileURLToPath ? import.meta.url : '';
const uploadsDir = path.join(process.cwd(), 'uploads');

/**
 * Uploads a Buffer to local disk storage and MinIO storage under folder (`products/` or `profiles/`).
 */
export const uploadBufferToMinio = async (buffer, mimeType, folder = 'products') => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file buffer');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File size exceeds maximum allowed limit of 5MB');
  }

  const normalizedMime = (mimeType || '').toLowerCase();
  let ext = 'jpg';
  if (normalizedMime.includes('png')) ext = 'png';
  else if (normalizedMime.includes('webp')) ext = 'webp';
  else if (normalizedMime.includes('jpeg') || normalizedMime.includes('jpg')) ext = 'jpg';
  else {
    throw new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.');
  }

  const uniqueHash = crypto.randomBytes(16).toString('hex');
  const fileName = `${Date.now()}-${uniqueHash}.${ext}`;
  const objectName = `${folder}/${fileName}`;

  // 1. Always save locally first as a guaranteed fallback
  const targetFolderDir = path.join(uploadsDir, folder);
  try {
    if (!fs.existsSync(targetFolderDir)) {
      fs.mkdirSync(targetFolderDir, { recursive: true });
    }
    const localFilePath = path.join(targetFolderDir, fileName);
    fs.writeFileSync(localFilePath, buffer);
  } catch (fsErr) {
    console.warn('⚠️ Local disk save warning:', fsErr.message);
  }

  const backendHost = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';
  const localUrl = `${backendHost}/uploads/${folder}/${fileName}`;

  // 2. Try uploading to MinIO
  try {
    await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
      'Content-Type': normalizedMime || `image/${ext}`
    });

    const minioHost = process.env.MINIO_PUBLIC_HOST || 'localhost';
    const minioPort = process.env.MINIO_PORT || '9000';
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';

    return `${protocol}://${minioHost}:${minioPort}/${BUCKET_NAME}/${objectName}`;
  } catch (minioErr) {
    console.warn('⚠️ [MinIO] Upload warning, falling back to local disk storage:', minioErr.message);
    return localUrl;
  }
};

/**
 * Saves a base64 encoded image string to MinIO storage.
 */
export const saveBase64Image = async (base64String, folder = 'products') => {
  if (!base64String || typeof base64String !== 'string') {
    return base64String || null;
  }

  // If already a URL (HTTP/HTTPS), return as-is
  if (base64String.startsWith('http://') || base64String.startsWith('https://') || base64String.startsWith('/uploads/')) {
    return base64String;
  }

  if (!base64String.startsWith('data:image/')) {
    return base64String;
  }

  try {
    const matches = base64String.match(/^data:(image\/[a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64String;
    }

    const mimeType = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    return await uploadBufferToMinio(buffer, mimeType, folder);
  } catch (error) {
    console.error('Error saving base64 image to MinIO:', error);
    throw error;
  }
};

/**
 * Safely removes an old object from MinIO storage when replaced or deleted.
 */
export const deleteMinioObject = async (imageUrlOrObjectName) => {
  if (!imageUrlOrObjectName || typeof imageUrlOrObjectName !== 'string') return;

  try {
    let objectName = imageUrlOrObjectName;
    if (imageUrlOrObjectName.includes(`/${BUCKET_NAME}/`)) {
      objectName = imageUrlOrObjectName.split(`/${BUCKET_NAME}/`)[1];
    }

    if (objectName && (objectName.startsWith('products/') || objectName.startsWith('profiles/'))) {
      await minioClient.removeObject(BUCKET_NAME, objectName);
      console.log(`🗑️ [MinIO] Successfully removed object: ${objectName}`);
    }
  } catch (error) {
    console.warn(`⚠️ [MinIO] Failed to remove object (${imageUrlOrObjectName}):`, error.message);
  }
};
