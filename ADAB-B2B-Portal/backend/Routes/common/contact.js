import express from 'express';
import { body } from 'express-validator';
import authMiddleware from '../../Middleware/auth.js';
import optionalAuth from '../../Middleware/optionalAuth.js';
import * as contactController from '../../controllers/contactController.js';

const router = express.Router();

// Validation
const contactFormValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('message').trim().notEmpty().withMessage('Message is required')
];

// Routes
router.post('/', optionalAuth, contactFormValidation, contactController.submitContactForm);
router.post('/submit', optionalAuth, contactFormValidation, contactController.submitContactForm);

// Authenticated route to view own submissions
router.get('/my-submissions', authMiddleware, contactController.getMySubmissions);

export default router;