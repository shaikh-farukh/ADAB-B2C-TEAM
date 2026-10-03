import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import * as creditController from '../controllers/creditController.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', creditController.setCredit);
router.get('/', creditController.getCredits);
router.get('/balance', creditController.getCreditBalance);

export default router;
