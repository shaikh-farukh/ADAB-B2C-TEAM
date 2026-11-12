const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ─── Admin Email OTP Authentication Endpoints ───
// POST /api/v1/auth/otp/request
router.post('/otp/request', authCtrl.requestOtp);

// POST /api/v1/auth/otp/verify
router.post('/otp/verify', authCtrl.verifyOtp);

// POST /api/v1/auth/login (Delegates to OTP verify if otp provided)
router.post('/login', authCtrl.login);

// POST /api/v1/auth/logout
router.post('/logout', authCtrl.logout);

// GET /api/v1/auth/me (Protected by authMiddleware)
router.get('/me', authMiddleware, authCtrl.getMe);

module.exports = router;
