import express from 'express';
import { body } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import { isDistributor } from '../../Middleware/roleCheck.js';
import * as ordersController from '../../controllers/distributorOrdersController.js';

const router = express.Router();

// All routes require authentication and distributor role
router.use(authMiddleware);
router.use(isDistributor);

// Validation
const placeOrderValidation = [
  body('shipping_address').trim().notEmpty().withMessage('Shipping address is required')
];

// Routes
router.post('/', placeOrderValidation, ordersController.placeOrder);
router.get('/', ordersController.getOrders);
router.get('/smart-reorders', ordersController.getSmartReorders);
router.get('/:id', ordersController.getOrder);
router.get('/:id/invoices', ordersController.downloadInvoice);
router.get('/:id/invoices/pdf', ordersController.downloadInvoicePDF);

export default router;