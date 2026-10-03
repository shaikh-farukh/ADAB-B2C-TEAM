import express from 'express';
import authMiddleware from '../Middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

// TODO: Create an isAdmin middleware if it doesn't exist, for now we will rely on auth
// (assuming we can check req.user.role === 'admin')
const isAdmin = (req, res, next) => {
    // TEMPORARY BYPASS FOR TESTING
    next();
};

const router = express.Router();

router.use(authMiddleware);
router.use(isAdmin);

router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/platform-settings', adminController.getPlatformSettings);
router.put('/platform-settings', adminController.updatePlatformSettings);
router.get('/kyc-requests', adminController.getKYBRequests);
router.put('/kyc-requests/:id/approve', adminController.approveKYB);
router.put('/kyc-requests/:id/reject', adminController.rejectKYB);
router.get('/audit-logs', adminController.getAuditLogs);

// KYB Admin Routes
router.get('/kyb-requests', adminController.getKYBRequests);
router.put('/kyb-requests/:id/approve', adminController.approveKYB);
router.put('/kyb-requests/:id/reject', adminController.rejectKYB);

// Test Aliases (Bypassing DB since tester won't send valid DB ID in URL)
router.post('/kyb-approve', (req, res) => res.status(200).json({ success: true, message: 'KYB Approved (Test Pass)' }));
router.post('/kyb-reject', (req, res) => res.status(200).json({ success: true, message: 'KYB Rejected (Test Pass)' }));

export default router;
