import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import * as deliveryController from '../controllers/deliveryController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/configs', deliveryController.getDeliveryConfigs);
router.post('/configs', deliveryController.updateDeliveryConfig);
router.post('/calculate-charge', deliveryController.calculateCharge);

export default router;
