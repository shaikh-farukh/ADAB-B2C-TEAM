import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { assignDelivery, getTimeline, outForDelivery, submitProofOfDelivery } from '../controllers/sharedOrderController.js';

const router = express.Router();

router.post('/:id/assign-delivery', authMiddleware, assignDelivery);
router.get('/:id/timeline', authMiddleware, getTimeline);
router.post('/:id/out-for-delivery', authMiddleware, outForDelivery);
router.post('/:id/proof-of-delivery', authMiddleware, submitProofOfDelivery);

export default router;
