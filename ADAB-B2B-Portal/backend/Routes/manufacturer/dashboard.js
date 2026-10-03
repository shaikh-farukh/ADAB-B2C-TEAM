import express from 'express';
import authMiddleware from '../../Middleware/auth.js';
import { isManufacturer } from '../../Middleware/roleCheck.js';
import * as dashboardController from '../../controllers/dashboardController.js';

const router = express.Router();

// All routes require authentication and manufacturer role
router.use(authMiddleware);
router.use(isManufacturer);

// Routes
router.get('/', dashboardController.getDashboardStats);
router.get('/orders/summary', dashboardController.getOrderStatusOverview);
router.get('/efficiency', dashboardController.getFacilityEfficiency);

export default router;