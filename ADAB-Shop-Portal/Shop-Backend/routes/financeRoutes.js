const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/summary', sellerController.getFinanceSummary);
router.get('/settlements', sellerController.getSettlements);
router.post('/credit-apply', sellerController.submitCreditApply);

module.exports = router;
