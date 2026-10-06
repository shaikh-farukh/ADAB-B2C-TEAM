import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { body } from 'express-validator';
import {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  toggleVehicleStatus,
  deleteVehicle
} from '../controllers/vehicleController.js';

const router = express.Router();

// Both manufacturer and distributor can manage their own vehicles.
const allowRoles = (req, res, next) => {
  if (req.user.role === 'manufacturer' || req.user.role === 'distributor') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied' });
};

// Validations
const vehicleValidation = [
  body('vehicle_number').trim().notEmpty().withMessage('Vehicle number is required'),
  body('vehicle_type').trim().notEmpty().withMessage('Vehicle type is required')
];

router.post('/', authMiddleware, allowRoles, vehicleValidation, createVehicle);
router.get('/', authMiddleware, allowRoles, getVehicles);
router.get('/:id', authMiddleware, allowRoles, getVehicleById);
router.put('/:id', authMiddleware, allowRoles, vehicleValidation, updateVehicle);
router.patch('/:id/status', authMiddleware, allowRoles, toggleVehicleStatus);
router.delete('/:id', authMiddleware, allowRoles, deleteVehicle);

export default router;
