import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { body } from 'express-validator';
import {
  createDriver,
  getDrivers,
  getDriverById,
  updateDriver,
  toggleDriverStatus,
  deleteDriver,
  updateLocation
} from '../controllers/driverController.js';

const router = express.Router();

// Both manufacturer and distributor can manage their own drivers.
const allowRoles = (req, res, next) => {
  if (req.user.role === 'manufacturer' || req.user.role === 'distributor' || req.user.role === 'driver') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied' });
};

// Validations
const driverValidation = [
  body('driver_name').trim().notEmpty().withMessage('Driver name is required'),
  body('mobile').trim().notEmpty().withMessage('Mobile is required'),
  body('license_number').trim().notEmpty().withMessage('License number is required'),
];

const locationUpdateValidation = [
  body('orderId').notEmpty().withMessage('orderId is required'),
  body('latitude').isNumeric().withMessage('Valid latitude is required'),
  body('longitude').isNumeric().withMessage('Valid longitude is required'),
];

router.post('/location-update', authMiddleware, locationUpdateValidation, updateLocation);
router.post('/', authMiddleware, allowRoles, driverValidation, createDriver);
router.get('/', authMiddleware, allowRoles, getDrivers);
router.get('/:id', authMiddleware, allowRoles, getDriverById);
router.put('/:id', authMiddleware, allowRoles, driverValidation, updateDriver);
router.patch('/:id/status', authMiddleware, allowRoles, toggleDriverStatus);
router.delete('/:id', authMiddleware, allowRoles, deleteDriver);

export default router;
