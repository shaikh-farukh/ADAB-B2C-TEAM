const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const adminGuard = require('../middleware/adminGuard');
const auditMiddleware = require('../middleware/auditMiddleware');
const { PERMISSIONS, ADMIN_ROLES } = require('../middleware/rolesPermissions');

const productCtrl = require('../controllers/productBoundaryController');
const approvalCtrl = require('../controllers/approvalContractController');
const orderCtrl = require('../controllers/adminOrderController');
const returnCtrl = require('../controllers/adminReturnController');
const offerCtrl = require('../controllers/adminOfferController');
const orderService = require('../services/adminOrderService');
const returnService = require('../services/adminReturnService');

// Allow /dev-login to bypass auth middleware for dev auto-login
router.use((req, res, next) => {
  if (req.path === '/dev-login') return next();
  authMiddleware(req, res, next);
});
router.use(auditMiddleware());
router.use((req, res, next) => {
  if (req.path === '/dev-login') return next();
  adminGuard()(req, res, next);
});

// ─── Orders Management APIs ───
router.get('/orders/exceptions', adminGuard({ permissions: [PERMISSIONS.ORDERS_READ] }), (req, res, next) => {
  req.query.exceptions = 'true';
  return orderCtrl.getOrders(req, res, next);
});
router.get('/orders', adminGuard({ permissions: [PERMISSIONS.ORDERS_READ] }), orderCtrl.getOrders);
router.get('/orders/:id/status-history', adminGuard({ permissions: [PERMISSIONS.ORDERS_READ] }), async (req, res) => {
  const order = await orderService.getAdminOrderById(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Order not found' });
  res.status(200).json({ success: true, data: order.status_history || [] });
});
router.get('/orders/:id/shipments', adminGuard({ permissions: [PERMISSIONS.ORDERS_READ] }), async (req, res) => {
  const order = await orderService.getAdminOrderById(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Order not found' });
  res.status(200).json({ success: true, data: order.shipments || [] });
});
router.get('/orders/:id', adminGuard({ permissions: [PERMISSIONS.ORDERS_READ] }), orderCtrl.getOrderById);
router.patch(
  '/orders/:id/status',
  adminGuard({ permissions: [PERMISSIONS.ORDERS_WRITE] }),
  auditMiddleware({ action: 'ADMIN_UPDATE_ORDER_STATUS', entityType: 'ORDER' }),
  orderCtrl.updateOrderStatus
);

// ─── Returns & Resolution APIs ───
router.get('/returns/exceptions', adminGuard({ permissions: [PERMISSIONS.RETURNS_READ] }), (req, res, next) => {
  req.query.exceptions = 'true';
  return returnCtrl.getReturns(req, res, next);
});
router.get('/returns', adminGuard({ permissions: [PERMISSIONS.RETURNS_READ] }), returnCtrl.getReturns);
router.get('/returns/:id/refund', adminGuard({ permissions: [PERMISSIONS.RETURNS_READ] }), async (req, res) => {
  const ret = await returnService.getAdminReturnById(req.params.id);
  if (!ret) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Return not found' });
  res.status(200).json({ success: true, data: ret.refunds || [] });
});
router.get('/returns/:id', adminGuard({ permissions: [PERMISSIONS.RETURNS_READ] }), returnCtrl.getReturnById);
router.post(
  '/returns/:id/resolve',
  adminGuard({ permissions: [PERMISSIONS.RETURNS_WRITE] }),
  auditMiddleware({ action: 'ADMIN_RESOLVE_RETURN', entityType: 'RETURN' }),
  returnCtrl.resolveReturn
);

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
router.get('/approvals/:type/:id/history', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), approvalCtrl.getApprovalHistory);

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

// ─── Platform Offers & Coupons APIs ───
router.get('/offers', adminGuard({ permissions: [PERMISSIONS.CATALOG_READ] }), offerCtrl.getOffers);
router.post(
  '/offers',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_CREATE_OFFER', entityType: 'OFFER' }),
  offerCtrl.createOffer
);
router.post('/offers/validate', offerCtrl.validateOffer);
router.patch(
  '/offers/:id',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_UPDATE_OFFER', entityType: 'OFFER' }),
  offerCtrl.updateOffer
);
router.delete(
  '/offers/:id',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_DELETE_OFFER', entityType: 'OFFER' }),
  offerCtrl.deleteOffer
);
router.post(
  '/offers/:id/activate',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_ACTIVATE_OFFER', entityType: 'OFFER' }),
  offerCtrl.activateOffer
);
router.post(
  '/offers/:id/pause',
  adminGuard({ permissions: [PERMISSIONS.CATALOG_WRITE] }),
  auditMiddleware({ action: 'ADMIN_PAUSE_OFFER', entityType: 'OFFER' }),
  offerCtrl.pauseOffer
);

// ─── Seller / Customer User Status Authorization ───
router.post(
  '/users/:id/status',
  adminGuard({ permissions: [PERMISSIONS.USERS_MANAGE] }),
  auditMiddleware({ action: 'ADMIN_UPDATE_USER_STATUS', entityType: 'USER' }),
  approvalCtrl.handleUserStatusUpdate
);

module.exports = router;
