const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');

// Refunds routes: /api/v1/refunds/*
router.get('/', returnController.getCustomerRefunds);
router.get('/:id', returnController.getRefundById);

module.exports = router;
