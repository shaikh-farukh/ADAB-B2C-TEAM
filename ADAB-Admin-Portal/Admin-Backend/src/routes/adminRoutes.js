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
  const token = jwt.sign(
    { userId: 'admin-dev', role: 'admin', user_type: 'ADMIN', permissions: ['catalog:read', 'catalog:write', 'catalog:approve', 'orders:read', 'orders:write', 'returns:read', 'returns:write'] },
    process.env.JWT_SECRET || 'adab-secret-key-change-in-prod',
    { expiresIn: '1d' }
  );
  res.json({ success: true, token });
});

// Apply auth middlewares to all admin routes
router.use(auth);
router.use(adminAuth);

// Dashboard
router.get('/dashboard/actions', dashboardController.getDashboardActions);
router.get('/dashboard', dashboardController.getDashboard);

// Notifications
router.get('/notifications', notificationController.getNotifications);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.post('/notifications/:id/read', notificationController.markAsRead);

// Sellers (Day-1 Skeletons & Oversight)
router.get('/reports/sellers', day5Controller.getSellersReport);
router.get('/sellers', sellerController.getSellers);
router.get('/sellers/:id/documents', sellerController.getSellerDocuments);
router.get('/sellers/:id/health', sellerController.getSellerHealth);
router.get('/sellers/:id', sellerController.getSellerDetails);
router.patch('/sellers/:id/status', sellerController.updateSellerStatus);

// Customers (Day-1 Skeletons & Oversight)
router.get('/reports/customers', day5Controller.getCustomersReport);
router.get('/customers', customerController.getCustomers);
router.get('/customers/:id/orders', customerController.getCustomerOrders);
router.get('/customers/:id/tickets', customerController.getCustomerTickets);
router.get('/customers/:id', customerController.getCustomerDetails);
router.patch('/customers/:id/status', customerController.updateCustomerStatus);

// Legacy Product Moderation Actions (Non-colliding)
router.post('/products/:id/approve', productController.approveProduct);
router.post('/products/:id/reject', productController.rejectProduct);
router.post('/products/:id/request-changes', productController.requestChangesProduct);
router.post('/products/:id/suspend', productController.suspendProduct);

// Reports by Domain (Day-4/5)
router.get('/reports/orders', day5Controller.getOrdersReport);
router.get('/reports/returns', day5Controller.getReturnsReport);
router.get('/reports/summary', day5Controller.getReportsSummary);
router.get('/reports/sales', day5Controller.getSalesReport);
router.get('/reports/reviews', day5Controller.getReviewsReport);
router.post('/reports/export', day5Controller.exportReport);
router.get('/audit/entity/:type/:id', day5Controller.getAuditLogByEntity);
router.get('/audit', day5Controller.getAuditLogs);
router.get('/settings', day5Controller.getSettings);
router.patch('/settings', day5Controller.updateSettings);

module.exports = router;
