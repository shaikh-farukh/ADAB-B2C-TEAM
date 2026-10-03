import express from 'express';
import multer from 'multer';
import authMiddleware from '../Middleware/auth.js';
import { uploadBufferToMinio } from '../Helpers/imageSaver.js';

const router = express.Router();

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE: Only JPG, PNG, and WebP images are allowed.'));
    }
  }
});

// Upload Product Image to MinIO
router.post('/image', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds maximum limit of 5MB'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    try {
      const folder = req.query.folder === 'profiles' ? 'profiles' : 'products';
      const imageUrl = await uploadBufferToMinio(req.file.buffer, req.file.mimetype, folder);

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully to MinIO',
        url: imageUrl,
        public_id: imageUrl
      });
    } catch (error) {
      console.error('MinIO Upload Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to store image in MinIO'
      });
    }
  });
});

// Upload Profile Image to MinIO
router.post('/profile-image', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No profile image uploaded' });
    }

    try {
      const imageUrl = await uploadBufferToMinio(req.file.buffer, req.file.mimetype, 'profiles');
      res.status(200).json({
        success: true,
        message: 'Profile image uploaded successfully to MinIO',
        url: imageUrl
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

export default router;
