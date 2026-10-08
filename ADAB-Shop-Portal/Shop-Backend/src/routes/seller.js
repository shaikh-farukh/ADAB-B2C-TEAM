const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller');
const notificationController = require('../controllers/notification');
const { requireSellerAuth } = require('../middlewares/auth');

// Apply temporary development authentication
router.use(requireSellerAuth);

// Core Read APIs for Day 1
router.get('/profile', sellerController.getProfile);
router.patch('/profile', sellerController.updateProfile);
router.get('/store', sellerController.getStore);
router.patch('/store', sellerController.updateStore);
router.get('/settings', sellerController.getSettings);
router.patch('/settings', sellerController.updateSettings);
router.get('/dashboard', sellerController.getDashboardMetrics);

// Shared Platform Notification Endpoints (Consumed by Seller UI)
router.get('/notifications', notificationController.getNotifications);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.post('/notifications/:id/read', notificationController.markAsRead);

module.exports = router;
