import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import * as campaignController from '../controllers/campaignController.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', campaignController.createCampaign);
router.get('/', campaignController.getCampaigns);

export default router;
