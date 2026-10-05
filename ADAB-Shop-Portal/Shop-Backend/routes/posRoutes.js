const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.post('/sales', sellerController.createPosSale);

module.exports = router;
