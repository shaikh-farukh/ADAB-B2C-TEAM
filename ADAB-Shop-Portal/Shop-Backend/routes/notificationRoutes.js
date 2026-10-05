const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/', sellerController.getNotifications);
router.post('/:id/read', sellerController.markNotificationRead);

module.exports = router;
