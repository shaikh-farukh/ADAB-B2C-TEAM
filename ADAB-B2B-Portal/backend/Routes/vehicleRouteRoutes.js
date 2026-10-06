import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { authenticateRole } from '../Middleware/roleCheck.js';
import { body } from 'express-validator';
import {
  createRoute,
  getRoutes,
  getRouteById,
  updateRoute,
  deleteRoute,
  assignVehicleToRoute
} from '../controllers/vehicleRouteController.js';

const router = express.Router();

const routeValidation = [
  body('route_name').trim().notEmpty().withMessage('Route name is required')
];

// Requirement: router.post('/assign-vehicle', authenticateRole(['MANUFACTURER', 'LOGISTICS']));
router.post('/assign-vehicle', authMiddleware, authenticateRole(['MANUFACTURER', 'LOGISTICS']), assignVehicleToRoute);

router.post('/', authMiddleware, routeValidation, createRoute);
router.get('/', authMiddleware, getRoutes);
router.get('/:id', authMiddleware, getRouteById);
router.put('/:id', authMiddleware, updateRoute);
router.delete('/:id', authMiddleware, deleteRoute);

export default router;
