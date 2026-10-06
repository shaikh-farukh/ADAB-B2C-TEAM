const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/', sellerController.getReturns);
router.get('/:id', sellerController.getReturnById);
router.post('/:id/approve', sellerController.approveReturn);
router.post('/:id/reject', sellerController.rejectReturn);
router.post('/:id/complete', sellerController.completeReturn);

module.exports = router;
