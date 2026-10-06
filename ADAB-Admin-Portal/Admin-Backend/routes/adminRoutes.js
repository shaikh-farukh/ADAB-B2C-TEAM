const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const adminGuard = require('../middleware/adminGuard');
const auditMiddleware = require('../middleware/auditMiddleware');
const { PERMISSIONS, ADMIN_ROLES } = require('../middleware/rolesPermissions');

const productCtrl = require('../controllers/productBoundaryController');
const approvalCtrl = require('../controllers/approvalContractController');

// All admin routes require authentication, correlation trace & base Admin guard
router.use(authMiddleware);
router.use(auditMiddleware());
router.use(adminGuard());

// ─── Product/Category/Brand Boundaries ───
router.get('/categories', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getCategories);
router.get('/categories/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getCategoryById);
router.get('/brands', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getBrands);
router.get('/brands/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getBrandById);
router.get('/products-master', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getProductsMaster);
router.get('/products-master/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getProductMasterById);

// ─── Approval API Contracts ───
router.get('/approvals', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalList);
router.get('/approvals/counts', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalCounts);
router.get('/approvals/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalById);
router.get('/approvals/:id/history', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalHistory);

// Sensitive Admin Approval Mutations (Audited)
router.post(
  '/approvals/:id/approve',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_APPROVE] }),
  auditMiddleware({ action: 'ADMIN_APPROVE_ITEM', entityType: 'PRODUCT_LISTING' }),
  approvalCtrl.approveItem
);

router.post(
  '/approvals/:id/reject',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_APPROVE] }),
  auditMiddleware({ action: 'ADMIN_REJECT_ITEM', entityType: 'PRODUCT_LISTING' }),
  approvalCtrl.rejectItem
);

router.post(
  '/approvals/:id/request-changes',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_APPROVE] }),
  auditMiddleware({ action: 'ADMIN_REQUEST_CHANGES', entityType: 'PRODUCT_LISTING' }),
  approvalCtrl.requestChangesItem
);

module.exports = router;
