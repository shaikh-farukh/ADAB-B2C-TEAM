import express from 'express';
import authMiddleware from '../../Middleware/auth.js';
import { isDistributor } from '../../Middleware/roleCheck.js';
import * as catalogController from '../../controllers/distributorCatalogController.js';

const router = express.Router();

// All routes require authentication and distributor role
router.use(authMiddleware);
router.use(isDistributor);

// Routes
router.get('/', catalogController.getProducts);
router.get('/categories', catalogController.getCategories);
router.get('/:id', catalogController.getProduct);

export default router;