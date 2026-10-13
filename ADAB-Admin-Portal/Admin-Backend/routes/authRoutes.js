const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ─── Authentication Endpoints ───
// POST /api/v1/auth/login
router.post('/login', authCtrl.login);

// POST /api/v1/auth/logout
router.post('/logout', authCtrl.logout);

// GET /api/v1/auth/me (Protected by authMiddleware)
router.get('/me', authMiddleware, authCtrl.getMe);

module.exports = router;
