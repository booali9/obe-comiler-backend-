const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const userController = require('../controller/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Only admin can access these routes
router.use(authMiddleware.restrictTo('admin'));

router.post('/users', authController.signup);
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUser);
router.patch('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.patch('/reset-password', authMiddleware.protect, authController.resetPassword);

module.exports = router;