import express from 'express';
import authMiddleware from '../../Middleware/auth.js';
import { isManufacturer } from '../../Middleware/roleCheck.js';
import * as orderController from '../../controllers/orderController.js';
import validateRequest from '../../Middleware/validateRequest.js';
import { 
  idParamSchema, 
  updateStatusSchema, 
  rejectOrderSchema, 
  markShippedSchema, 
  dispatchSchema 
} from '../../validations/orderSchemas.js';

const router = express.Router();

// All routes require authentication and manufacturer role
router.use(authMiddleware);
router.use(isManufacturer);

// Routes
// Get all orders with filters
router.get('/', orderController.getOrders);

// Get order statistics
router.get('/summary', orderController.getOrderStats);

// Get single order details
router.get('/:id', validateRequest(idParamSchema), orderController.getOrderDetails);

// Get order status history
router.get('/:id/history', validateRequest(idParamSchema), orderController.getOrderStatusHistory);

// Update order status (legacy endpoint)
router.patch('/:id/status', validateRequest(updateStatusSchema), orderController.updateOrderStatus);

// Accept order (PENDING → ACCEPTED)
router.patch('/:id/accept', validateRequest(idParamSchema), orderController.acceptOrder);

// Start processing (ACCEPTED → PROCESSING)
router.patch('/:id/start-processing', validateRequest(idParamSchema), orderController.startProcessing);

// Mark ready for dispatch (PROCESSING → READY_FOR_DISPATCH)
router.patch('/:id/ready-for-dispatch', validateRequest(idParamSchema), orderController.markReadyForDispatch);

// Dispatch order (READY_FOR_DISPATCH → DISPATCHED)
router.patch('/:id/dispatch', validateRequest(dispatchSchema), orderController.dispatchOrder);

// Reject order
router.patch('/:id/reject', validateRequest(rejectOrderSchema), orderController.rejectOrder);

// Mark as shipped (legacy endpoint)
router.patch('/:id/ship', validateRequest(markShippedSchema), orderController.markAsShipped);

// Mark as delivered (DISPATCHED → DELIVERED)
router.patch('/:id/mark-delivered', validateRequest(idParamSchema), orderController.markOrderDelivered);

// Legacy mark as delivered endpoint
router.patch('/:id/deliver', validateRequest(idParamSchema), orderController.markAsDelivered);

// Generate invoice
router.get('/:id/invoice', validateRequest(idParamSchema), orderController.generateInvoice);

// Generate invoice PDF
router.get('/:id/invoice/pdf', validateRequest(idParamSchema), orderController.generateInvoicePDF);

export default router;