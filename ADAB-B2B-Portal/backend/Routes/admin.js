import express from 'express';
import * as adminController from '../controllers/adminController.js';
import authMiddleware from '../Middleware/auth.js';

const router = express.Router();

// Ensure admin only using req.user
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.warn(`[SECURITY AUDIT] Unauthorized admin access attempt by User ID: ${req.user?.userId || 'Unknown'} (Role: ${req.user?.role || 'None'})`);
    return res.status(403).json({
      success: false,
      error: {
        message: 'Forbidden. Admin access required.',
        code: 'FORBIDDEN_ADMIN_ONLY'
      }
    });
  }
};

// Simple middleware to log audit actions securely
const auditLogger = (actionName) => (req, res, next) => {
  // We capture the original res.json to log after successful execution
  const originalJson = res.json;
  res.json = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`[AUDIT LOG] Action: ${actionName} | Admin ID: ${req.user.userId} | Target ID: ${req.params.id || 'N/A'} | Timestamp: ${new Date().toISOString()}`);
    }
    return originalJson.call(this, data);
  };
  next();
};

// Apply auth and admin check to all routes in this router
router.use(authMiddleware);
router.use(adminOnly);

// Dashboard & Settings
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/platform-settings', adminController.getPlatformSettings);
router.put('/platform-settings', auditLogger('UPDATE_SETTINGS'), adminController.updatePlatformSettings);

// KYC/KYB Approvals (supporting both paths for compatibility)
router.get('/kyc-requests', adminController.getKYBRequests);
router.put('/kyc-requests/:id/approve', auditLogger('KYC_APPROVE'), adminController.approveKYB);
router.put('/kyc-requests/:id/reject', auditLogger('KYC_REJECT'), adminController.rejectKYB);
router.get('/kyb-requests', adminController.getKYBRequests);
router.put('/kyb-requests/:id/approve', auditLogger('KYB_APPROVE'), adminController.approveKYB);
router.put('/kyb-requests/:id/reject', auditLogger('KYB_REJECT'), adminController.rejectKYB);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
