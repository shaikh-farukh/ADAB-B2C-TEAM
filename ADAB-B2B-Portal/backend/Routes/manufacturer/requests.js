import express from 'express';
import { param, body } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import { isManufacturer } from '../../Middleware/roleCheck.js';
import * as requestAccessController from '../../controllers/requestAccessController.js';
import validate from '../../Middleware/validate.js';

const router = express.Router();

// All routes require authentication and manufacturer role
router.use(authMiddleware);
router.use(isManufacturer);

const idParamValidation = [
  param('id').isInt().withMessage('Request ID must be an integer')
];

const sendConnectionRequestValidation = [
  body('distributor_id').isInt().withMessage('Valid distributor ID is required'),
  body('description').optional().trim()
];

const counterOfferValidation = [
  param('id').isInt().withMessage('Request ID must be an integer'),
  body('counter_price').isNumeric().withMessage('Valid counter price is required'),
  body('notes').optional().trim(),
  body('deadline').optional().trim()
];

// Routes
router.get('/', requestAccessController.getReceivedRequests);
router.post('/', sendConnectionRequestValidation, validate, requestAccessController.sendConnectionRequest);
router.get('/:id', idParamValidation, validate, requestAccessController.getRequest);
router.put('/:id/counter', counterOfferValidation, validate, requestAccessController.counterOfferRFQ);
router.patch('/:id/accept', idParamValidation, validate, requestAccessController.acceptRequest);
router.patch('/:id/reject', idParamValidation, validate, requestAccessController.rejectRequest);

export default router;