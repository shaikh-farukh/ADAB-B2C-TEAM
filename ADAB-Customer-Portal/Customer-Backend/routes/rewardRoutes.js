const express = require('express');
const rewardController = require('../controllers/rewardController');

const router = express.Router();

// GET /api/v1/rewards — Rewards summary & balance
router.get('/', rewardController.getRewardsSummary);

// GET /api/v1/rewards/ledger — Points ledger
router.get('/ledger', rewardController.getRewardsLedger);

// POST /api/v1/rewards/redeem — Redeem points
router.post('/redeem', rewardController.redeemRewardPoints);

module.exports = router;
