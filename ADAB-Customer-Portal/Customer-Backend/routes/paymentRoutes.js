const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { idempotencyMiddleware } = require('../middleware/idempotency');

// Webhook endpoint (must be declared before /:id routes so "webhook" isn't matched as an ID)
router.post('/webhook', paymentController.handleWebhook);

// GET /api/v1/payments/:id
router.get('/:id', paymentController.getPayment);

// POST /api/v1/payments/:id/confirm
router.post('/:id/confirm', idempotencyMiddleware(), paymentController.confirmPayment);

// POST /api/v1/payments/:id/retry
router.post('/:id/retry', idempotencyMiddleware(), paymentController.retryPayment);

module.exports = router;
