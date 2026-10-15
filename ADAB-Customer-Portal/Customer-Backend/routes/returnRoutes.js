const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');

// Returns routes: /api/v1/returns/*
router.get('/', returnController.getCustomerReturns);
router.get('/:id', returnController.getReturnById);
router.patch('/:id/status', returnController.updateReturnStatus);
router.post('/:id/status', returnController.updateReturnStatus);
router.post('/:id/cancel', returnController.cancelReturn);
router.post('/:id/evidence', returnController.uploadReturnEvidence);

module.exports = router;
