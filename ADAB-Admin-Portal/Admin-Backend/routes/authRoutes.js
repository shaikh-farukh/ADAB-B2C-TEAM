const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ─── Admin Authentication Endpoints ───
// POST /api/v1/auth/signup (First Name, Last Name, Email, Password)
router.post('/signup', authCtrl.signup);

// POST /api/v1/auth/login (Email + Password)
router.post('/login', authCtrl.login);

// POST /api/v1/auth/otp/request (Email OTP Step 1: Request 6-digit OTP)
router.post('/otp/request', authCtrl.requestOtp);

// POST /api/v1/auth/otp/verify (Email OTP Step 2: Verify 6-digit OTP)
router.post('/otp/verify', authCtrl.verifyOtp);

// POST /api/v1/auth/forgot-password (Request Password Reset Email + Code)
router.post('/forgot-password', authCtrl.forgotPassword);

// POST /api/v1/auth/reset-password (Verify Reset Code & Save New Password in DB)
router.post('/reset-password', authCtrl.resetPassword);

// POST /api/v1/auth/logout
router.post('/logout', authCtrl.logout);

// GET /api/v1/auth/me (Protected by authMiddleware)
router.get('/me', authMiddleware, authCtrl.getMe);

module.exports = router;
