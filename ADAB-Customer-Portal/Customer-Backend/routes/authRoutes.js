const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Customer Auth Endpoints
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/signup', authController.register); // alias for signup
router.post('/send-registration-otp', authController.sendRegistrationOtp);
router.post('/send-otp', authController.sendRegistrationOtp); // alias
router.post('/verify-registration-otp', authController.verifyRegistrationOtp);
router.post('/verify-otp', authController.verifyRegistrationOtp); // alias
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authController.getCurrentUser);

module.exports = router;
