import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { isDistributor } from '../Middleware/roleCheck.js';
import * as distributorInventoryController from '../controllers/distributorInventoryController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(isDistributor);

router.get('/', distributorInventoryController.getInventory);
router.post('/publish', distributorInventoryController.publishProduct);

export default router;
