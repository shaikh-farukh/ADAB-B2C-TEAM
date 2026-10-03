import express from 'express';
import authMiddleware from '../../Middleware/auth.js';
import { isDistributor } from '../../Middleware/roleCheck.js';
import * as dashboardController from '../../controllers/distributorDashboardController.js';

const router = express.Router();

// All routes require authentication and distributor role
router.use(authMiddleware);
router.use(isDistributor);

// Routes
router.get('/', dashboardController.getDashboardStats);
router.get('/health', dashboardController.getHealthScan);

export default router;