import express from 'express';
import { handleWebhook } from '../controllers/razorpayWebhookController.js';

const router = express.Router();

// The webhook endpoint requires the raw body to verify the HMAC signature.
// express.raw({ type: 'application/json' }) must be applied BEFORE express.json()
// in the main app.js or applied directly here. We will assume app.js mounts this
// router with the correct raw body parser or that the controller expects a Buffer.

router.post('/razorpay', handleWebhook);

export default router;
