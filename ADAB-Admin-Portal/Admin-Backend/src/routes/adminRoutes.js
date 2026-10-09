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
const orderController = require('../controllers/adminOrderController');
const returnController = require('../controllers/adminReturnController');
const day5Controller = require('../controllers/adminDay5Controller');

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

// Orders (Day-4)
router.get('/orders', orderController.getOrders);
router.get('/orders/:id', orderController.getOrderDetails);
router.patch('/orders/:id/status', orderController.updateOrderStatus);

// Returns (Day-4)
router.get('/returns', returnController.getReturns);
router.get('/returns/:id', returnController.getReturnDetails);
router.post('/returns/:id/resolve', returnController.resolveReturn);

// Day-5 (Offers, Reports, Audit, Settings)
router.get('/offers', day5Controller.getOffers);
router.get('/reports/summary', day5Controller.getReportsSummary);
router.get('/audit', day5Controller.getAuditLogs);
router.get('/settings', day5Controller.getSettings);
router.patch('/settings', day5Controller.updateSettings);

module.exports = router;
