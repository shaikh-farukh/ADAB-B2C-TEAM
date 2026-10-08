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

// ─── Categories APIs ───
router.get('/categories', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getCategories);
router.post(
  '/categories',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_CREATE_CATEGORY', entityType: 'CATEGORY' }),
  productCtrl.createCategory
);
router.get('/categories/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getCategoryById);
router.patch(
  '/categories/:id',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_UPDATE_CATEGORY', entityType: 'CATEGORY' }),
  productCtrl.updateCategory
);

// ─── Brands APIs ───
router.get('/brands', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getBrands);
router.post(
  '/brands',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_CREATE_BRAND', entityType: 'BRAND' }),
  productCtrl.createBrand
);
router.get('/brands/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getBrandById);
router.patch(
  '/brands/:id',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_UPDATE_BRAND', entityType: 'BRAND' }),
  productCtrl.updateBrand
);

// ─── Products Master & Variant APIs ───
router.get('/products', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getProductsMaster);
router.get('/products-master', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getProductsMaster);
router.post(
  '/products',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_CREATE_PRODUCT', entityType: 'PRODUCT' }),
  productCtrl.createProductMaster
);
router.get('/products/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getProductMasterById);
router.get('/products-master/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getProductMasterById);
router.patch(
  '/products/:id',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_UPDATE_PRODUCT', entityType: 'PRODUCT' }),
  productCtrl.updateProductMaster
);
router.post(
  '/products/:id/variants',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_CREATE_PRODUCT_VARIANT', entityType: 'PRODUCT_VARIANT' }),
  productCtrl.addProductVariant
);
router.get('/products/:id/listings', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), productCtrl.getProductListings);

// Product listing moderation status update (PATCH /products/:id/status or /listings/:id/status)
router.patch(
  '/products/:id/status',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_APPROVE] }),
  auditMiddleware({ action: 'ADMIN_UPDATE_PRODUCT_STATUS', entityType: 'PRODUCT_LISTING' }),
  approvalCtrl.updateListingStatus
);

// ─── Approval Queue & Moderation APIs ───
router.get('/approvals/queue', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalQueue);
router.get('/approvals', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalList);
router.get('/approvals/counts', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalCounts);
router.get('/approvals/:id', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalById);
router.get('/approvals/:id/history', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalHistory);

// Sensitive Admin Listing Moderation Mutations (Audited & Outbox Emitted)
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

router.post(
  '/approvals/:id/suspend',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_APPROVE] }),
  auditMiddleware({ action: 'ADMIN_SUSPEND_ITEM', entityType: 'PRODUCT_LISTING' }),
  approvalCtrl.suspendItem
);

// ─── Seller / Customer User Status Authorization ───
router.post(
  '/users/:id/status',
  adminGuard({ permissions: [PERMISSIONS.USERS_MANAGE] }),
  auditMiddleware({ action: 'ADMIN_UPDATE_USER_STATUS', entityType: 'USER' }),
  approvalCtrl.handleUserStatusUpdate
);

module.exports = router;
