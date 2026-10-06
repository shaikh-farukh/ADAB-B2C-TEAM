import express from 'express';
import * as discoveryController from '../controllers/discoveryController.js';
import auth from '../Middleware/auth.js';

const router = express.Router();

// Publicly accessible discovery routes (or can add authMiddleware if needed)
router.get('/area', discoveryController.searchShopsByArea);
router.get('/product', discoveryController.searchProductAvailability);
router.get('/shops-near-me', discoveryController.searchShopsNearMe);
router.get('/featured-shops', discoveryController.getFeaturedShops);

router.post('/connect', auth, discoveryController.requestConnection);

export default router;
