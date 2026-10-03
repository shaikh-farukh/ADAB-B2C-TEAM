import express from 'express';
import { body } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import * as supportController from '../../controllers/supportController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Validation
const createTicketValidation = [
  body('issue_type').trim().notEmpty().withMessage('Issue type is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('attachment').optional().trim()
];

// Routes
router.post('/', createTicketValidation, supportController.createTicket);
router.get('/', supportController.getTickets);
router.get('/issue-types', supportController.getIssueTypes);
router.get('/:id', supportController.getTicket);

export default router;