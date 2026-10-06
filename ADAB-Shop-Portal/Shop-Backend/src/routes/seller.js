const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller');

// In a real scenario, an auth middleware would be injected here.
// router.use(authMiddleware);

// Core Read APIs for Day 1
router.get('/profile', sellerController.getProfile);
router.get('/store', sellerController.getStore);

module.exports = router;
