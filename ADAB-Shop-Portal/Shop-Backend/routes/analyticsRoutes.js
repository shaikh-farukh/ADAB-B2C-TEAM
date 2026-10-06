const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/', sellerController.getAnalytics);
router.get('/overview', sellerController.getAnalytics);

module.exports = router;
