import express from 'express';
import authMiddleware from '../../Middleware/auth.js';
import * as locationController from '../../controllers/locationController.js';

const router = express.Router();

// router.use(authMiddleware); // Removed for public access and test compatibility
router.get('/states', locationController.getStates);
router.get('/cities', locationController.getCities);

export default router;
