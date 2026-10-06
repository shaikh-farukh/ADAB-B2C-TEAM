import express from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import * as kybController from '../controllers/kybController.js';
import authMiddleware from '../Middleware/auth.js';
import validate from '../Middleware/validate.js';

const router = express.Router();

// ─── RATE LIMITERS ──────────────────────────────────────────────

// Login & OTP verify — increased for local development and testing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again after 15 minutes.'
  }
});

// OTP request & forgot password
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.'
  }
});

// Signup — 100 per hour per IP (increased for testing)
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many signup attempts. Please try again after 1 hour.'
  }
});

// ─── SHARED VALIDATION RULES ────────────────────────────────────

/**
 * Password strength rule — consistent across signup, reset, and change.
 * Requires: ≥8 chars, uppercase, lowercase, digit, special character.
 */
const passwordStrengthRule = (fieldName = 'password') =>
  body(fieldName)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
    .withMessage('Password must contain uppercase, lowercase, number and special character');

// ─── VALIDATION CHAINS ─────────────────────────────────────────

const signupValidation = [
  body('full_name')
    .trim().notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name must be 100 characters or less'),
  body('email')
    .isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('mobile')
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^[+]?[\d\s-]{7,15}$/).withMessage('Valid mobile number is required (7-15 digits)'),
  body('company_name')
    .trim().notEmpty().withMessage('Business name is required')
    .isLength({ max: 200 }).withMessage('Business name must be 200 characters or less'),
  body('role')
    .isIn(['manufacturer', 'distributor']).withMessage('Role must be manufacturer or distributor'),
  passwordStrengthRule('password'),
];

const loginValidation = [
  body('email')
    .isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const requestOTPValidation = [
  body('email')
    .isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const verifyOTPValidation = [
  body('email')
    .isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),
  passwordStrengthRule('new_password'),
];

const changePasswordValidation = [
  body('current_password')
    .notEmpty().withMessage('Current password is required'),
  passwordStrengthRule('new_password'),
];

const profileUpdateValidation = [
  body('company_name').optional().trim().notEmpty().withMessage('Company name cannot be empty')
    .isLength({ max: 200 }).withMessage('Company name must be 200 characters or less'),
  body('gst_number').optional().trim().isLength({ max: 20 }),
  body('address').optional().trim().isLength({ max: 500 }),
  body('country').optional().trim().isLength({ max: 100 }),
  body('mobile').optional().matches(/^[+]?[\d\s-]{7,15}$/).withMessage('Valid mobile number required'),
  body('company_logo').optional().trim(),
  body('age').optional().isInt({ min: 18, max: 120 }).withMessage('Age must be between 18 and 120'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('personal_contact').optional().matches(/^[+]?[\d\s-]{7,15}$/).withMessage('Valid contact number required'),
  body('personal_email').optional().isEmail().withMessage('Valid personal email required'),
  body('international_business').optional().isBoolean().withMessage('Must be true or false'),
  body('wish_to_export_countries').optional().trim().isLength({ max: 500 }),
];

const deleteAccountValidation = [
  body('password')
    .notEmpty().withMessage('Password is required to delete account'),
];

// ─── PUBLIC ROUTES (with rate limiting) ─────────────────────────
router.post('/signup',          signupLimiter,  signupValidation,          validate, authController.signup);
router.post('/login',           authLimiter,    loginValidation,           validate, authController.login);
router.post('/otp/request',     otpLimiter,     requestOTPValidation,      validate, authController.requestOTP);
router.post('/otp/verify',      authLimiter,    verifyOTPValidation,       validate, authController.verifyOTP);
router.post('/forgot-password', otpLimiter,     forgotPasswordValidation,  validate, authController.forgotPassword);
router.post('/reset-password',  authLimiter,    resetPasswordValidation,   validate, authController.resetPassword);
router.post('/refresh',         authLimiter,    authController.refreshToken);
router.post('/google',          authLimiter,    authController.googleLogin);
router.get('/google/callback',  authLimiter,    (req, res) => res.status(200).json({ success: true, message: 'Google Auth Test Passed' }));

// ─── AUTHENTICATED ROUTES ───────────────────────────────────────
router.get('/profile',          authMiddleware, authController.getProfile);
router.put('/profile',          authMiddleware, profileUpdateValidation, validate, authController.updateProfile);
router.patch('/profile',        authMiddleware, profileUpdateValidation, validate, authController.updateProfile);
router.post('/kyb-submit',      authMiddleware, kybController.submitKYB);
router.get('/kyb-status',       authMiddleware, kybController.getKYBStatus);
router.post('/change-password', authMiddleware, changePasswordValidation, validate, authController.changePassword);
router.post('/logout',          authMiddleware, authController.logout);
router.delete('/account',       authMiddleware, deleteAccountValidation, validate, authController.deleteAccount);

export default router;