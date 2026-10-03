import express from 'express';
import authMiddleware from '../../Middleware/auth.js';
import { isDistributor } from '../../Middleware/roleCheck.js';
import * as distributorController from '../../controllers/distributorController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(isDistributor);

router.get('/', distributorController.getShops);

export default router;
