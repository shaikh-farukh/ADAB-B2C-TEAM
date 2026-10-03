import express from 'express';
import authMiddleware from '../../Middleware/auth.js';
import { isDistributor } from '../../Middleware/roleCheck.js';
import * as controller from '../../controllers/distributorShopOrdersController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(isDistributor);

router.get('/', controller.getShopOrders);
router.get('/:id', controller.getShopOrderDetail);
router.patch('/:id/accept', controller.acceptShopOrder);
router.patch('/:id/reject', controller.rejectShopOrder);
router.patch('/:id/start-processing', controller.startProcessingShopOrder);
router.patch('/:id/mark-packed', controller.markPackedShopOrder);
router.patch('/:id/dispatch', controller.dispatchShopOrder);
router.patch('/:id/mark-delivered', controller.markDeliveredShopOrder);

export default router;
