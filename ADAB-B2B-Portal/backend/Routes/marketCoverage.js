import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import * as marketCoverageController from '../controllers/marketCoverageController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', marketCoverageController.getMarketCoverage);

export default router;
