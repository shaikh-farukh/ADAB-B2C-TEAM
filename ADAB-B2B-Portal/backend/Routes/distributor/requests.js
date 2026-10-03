import express from 'express';
import { body, param } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import { isDistributor } from '../../Middleware/roleCheck.js';
import * as requestAccessController from '../../controllers/requestAccessController.js';
import validate from '../../Middleware/validate.js';

const router = express.Router();

// All routes require authentication and distributor role
router.use(authMiddleware);
router.use(isDistributor);

// Validation
const sendRequestValidation = [
  body('manufacturer_id').isInt().withMessage('Valid manufacturer ID is required'),
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('target_price').optional().isNumeric().withMessage('Target price must be a valid number'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('product_id').optional().isInt().withMessage('Product ID must be an integer'),
  body('product_name').optional().trim(),
  body('deadline').optional().trim()
];

const idParamValidation = [
  param('id').isInt().withMessage('Request ID must be an integer')
];

const respondRFQValidation = [
  param('id').isInt().withMessage('Request ID must be an integer'),
  body('action').isIn(['ACCEPT', 'REJECT', 'accept', 'reject']).withMessage('Action must be ACCEPT or REJECT'),
  body('notes').optional().trim()
];

// Routes
router.post('/', sendRequestValidation, validate, requestAccessController.sendRequest);
router.post('/:id/respond', respondRFQValidation, validate, requestAccessController.respondRFQ);
router.get('/my-status', requestAccessController.getRequestStatus);
router.get('/:id', idParamValidation, validate, requestAccessController.getRequestDetails);
router.patch('/:id/accept', idParamValidation, validate, requestAccessController.acceptRequestDistributor);
router.patch('/:id/reject', idParamValidation, validate, requestAccessController.rejectRequestDistributor);

export default router;