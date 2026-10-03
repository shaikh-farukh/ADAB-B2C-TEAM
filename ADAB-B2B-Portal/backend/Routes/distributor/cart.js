import express from 'express';
import { body } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import { isDistributor } from '../../Middleware/roleCheck.js';
import * as cartController from '../../controllers/distributorCartController.js';

const router = express.Router();

// All routes require authentication and distributor role
router.use(authMiddleware);
router.use(isDistributor);

// Validation
const addToCartValidation = [
  body('product_id').isInt().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

const updateCartValidation = [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// Routes
router.post('/', addToCartValidation, cartController.addToCart);
router.get('/', cartController.getCart);
router.put('/:id', updateCartValidation, cartController.updateCartItem);
router.delete('/:id', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

export default router;