import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { isManufacturer, isDistributor } from '../Middleware/roleCheck.js';
import { body } from 'express-validator';
import {
  createProvider,
  getProviders,
  getProviderById,
  updateProvider,
  toggleProviderStatus,
  deleteProvider
} from '../controllers/logisticsProviderController.js';

const router = express.Router();

// Both manufacturer and distributor can manage their own logistics providers.
const allowRoles = (req, res, next) => {
  if (req.user.role === 'manufacturer' || req.user.role === 'distributor') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied' });
};

// Validations
const providerValidation = [
  body('provider_name').trim().notEmpty().withMessage('Provider name is required'),
  body('mobile').optional().trim(),
  body('email').optional().isEmail().withMessage('Valid email is required'),
];

router.post('/', authMiddleware, allowRoles, providerValidation, createProvider);
router.get('/', authMiddleware, allowRoles, getProviders);
router.get('/:id', authMiddleware, allowRoles, getProviderById);
router.put('/:id', authMiddleware, allowRoles, providerValidation, updateProvider);
router.patch('/:id/status', authMiddleware, allowRoles, toggleProviderStatus);
router.delete('/:id', authMiddleware, allowRoles, deleteProvider);

export default router;
