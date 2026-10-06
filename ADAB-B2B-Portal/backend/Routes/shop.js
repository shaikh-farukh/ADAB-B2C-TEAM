import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { isShop } from '../Middleware/roleCheck.js';
import * as shopController from '../controllers/shopController.js';
import * as campaignController from '../controllers/campaignController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(isShop);

router.get('/catalog', shopController.getCatalog);
router.post('/orders', shopController.placeOrder);
router.get('/orders', shopController.getOrders);
router.get('/orders/:id', shopController.getOrderDetail);

// Campaign notifications received by shop
router.get('/notifications', campaignController.getShopNotifications);
router.post('/notifications/:delivery_id/read', campaignController.readNotification);

export default router;
