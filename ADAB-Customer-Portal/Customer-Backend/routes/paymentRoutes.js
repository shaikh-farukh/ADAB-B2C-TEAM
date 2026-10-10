const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { idempotencyMiddleware } = require('../middleware/idempotency');

// GET /api/v1/payments/:id
router.get('/:id', paymentController.getPayment);

// POST /api/v1/payments/:id/confirm
router.post('/:id/confirm', idempotencyMiddleware(), paymentController.confirmPayment);

// POST /api/v1/payments/:id/retry
router.post('/:id/retry', idempotencyMiddleware(), paymentController.retryPayment);

module.exports = router;
