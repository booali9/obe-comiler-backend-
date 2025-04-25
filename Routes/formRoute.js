const express = require('express');
const router = express.Router();
const formController = require('../controller/formController');
const authController = require('../controller/authController');
const {protect,restrictTo}=require("../middleware/authMiddleware")

// Protect all routes after this middleware
router.use(protect);

// Teacher routes
router.post(
  '/submit',
 // formController.uploadAssignmentFiles,
  //formController.resizeAssignmentFiles,
  formController.submitForm
);
router.get('/my-forms', formController.getTeacherForms);
router.get('/:id', formController.getForm);

// Admin-only routes
router.use(restrictTo('admin'));
router.get('/', formController.getAllForms);

module.exports = router;