import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import { initializePayment, updatePaymentStatus } from '../controllers/paymentController.js';
import { createCheckout, verifyPayment, handlePaymentFailure, createLedgerCheckout } from '../controllers/razorpayController.js';

const router = express.Router();

// Route to initialize payment/checkout (accessible by distributor)
router.post('/initialize', authMiddleware, initializePayment);

// Route to update payment status (could be webhook or admin/manufacturer updating status)
router.post('/update-status', authMiddleware, updatePaymentStatus);

// --- New Razorpay Checkout Endpoints ---
router.post('/razorpay/create-order', authMiddleware, createCheckout);
router.post('/razorpay/create-ledger-order', authMiddleware, createLedgerCheckout);
router.post('/razorpay/verify', authMiddleware, verifyPayment);
router.post('/razorpay/failure', authMiddleware, handlePaymentFailure);

export default router;
