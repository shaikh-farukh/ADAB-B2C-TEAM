const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuthMiddleware');
const dashboardController = require('../controllers/adminDashboardController');
const notificationController = require('../controllers/adminNotificationController');
const sellerController = require('../controllers/adminSellerController');
const customerController = require('../controllers/adminCustomerController');
const approvalController = require('../controllers/adminApprovalController');
const productController = require('../controllers/adminProductController');

// Dev login to get a token easily
router.post('/dev-login', (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET || 'adab-secret-key-change-in-prod', { expiresIn: '1d' });
  res.json({ success: true, token });
});

// Apply auth middlewares to all admin routes
router.use(auth);
router.use(adminAuth);

// Dashboard
router.get('/dashboard', dashboardController.getDashboard);

// Notifications
router.get('/notifications', notificationController.getNotifications);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.post('/notifications/:id/read', notificationController.markAsRead);

// Sellers (Day-1 Skeletons)
router.get('/sellers', sellerController.getSellers);
router.get('/sellers/:id', sellerController.getSellerDetails);
router.patch('/sellers/:id/status', sellerController.updateSellerStatus);

// Customers (Day-1 Skeletons)
router.get('/customers', customerController.getCustomers);
router.get('/customers/:id', customerController.getCustomerDetails);
router.patch('/customers/:id/status', customerController.updateCustomerStatus);

// Approvals (Day-2)
router.get('/approvals', approvalController.getApprovals);
router.patch('/approvals/:id', approvalController.updateApproval);

// Products / Moderation (Day-3)
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductDetails);
router.post('/products/:id/approve', productController.approveProduct);
router.post('/products/:id/reject', productController.rejectProduct);
router.post('/products/:id/request-changes', productController.requestChangesProduct);
router.post('/products/:id/suspend', productController.suspendProduct);

module.exports = router;
