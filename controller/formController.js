const Form = require('../models/form');
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const multer = require('multer');
const cloudinary = require('../CONFIG/cloudinary');
const streamifier = require('streamifier');
const Email = require('../utils/email');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only CSV, Excel, PDF, and image files are allowed!', 400), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

exports.uploadFiles = upload.fields([
  { name: 'attendanceFile', maxCount: 1 },
  { name: 'bestAssignment', maxCount: 1 },
  { name: 'averageAssignment', maxCount: 1 },
  { name: 'worstAssignment', maxCount: 1 }
]);

// Helper function to upload to Cloudinary
const uploadStreamToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ned_forms/${folder}`,
        resource_type: 'auto'
      },
      (error, result) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          reject(new AppError(`Error uploading file to Cloudinary: ${error.message}`, 500));
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

exports.submitForm = catchAsync(async (req, res, next) => {
  // 1) Process file uploads
  const fileUploads = {};
  
  if (req.files.attendanceFile) {
    fileUploads.attendanceFile = await uploadStreamToCloudinary(
      req.files.attendanceFile[0].buffer,
      'attendance'
    );
  }

  const assignmentUploads = {};
  if (req.files.bestAssignment) {
    assignmentUploads.best = await uploadStreamToCloudinary(
      req.files.bestAssignment[0].buffer,
      'assignments'
    );
  }
  if (req.files.averageAssignment) {
    assignmentUploads.average = await uploadStreamToCloudinary(
      req.files.averageAssignment[0].buffer,
      'assignments'
    );
  }
  if (req.files.worstAssignment) {
    assignmentUploads.worst = await uploadStreamToCloudinary(
      req.files.worstAssignment[0].buffer,
      'assignments'
    );
  }

  // 2) Process quizzes
  let quizzes = [];
  try {
    quizzes = JSON.parse(req.body.quizzes).map(quiz => ({
      quizNumber: quiz.quizNumber,
      bestScore: quiz.bestScore,
      averageScore: quiz.averageScore,
      worstScore: quiz.worstScore
    }));
  } catch (err) {
    return next(new AppError('Invalid quiz data format', 400));
  }

  // 3) Create form record
  const formData = {
    teacher: req.user._id,
    teacherName: req.body.teacherName,
    teacherId: req.body.teacherId,
    department: req.body.department,
    courseName: req.body.courseName,
    courseCode: req.body.courseCode,
    year: req.body.year,
    semester: req.body.semester,
    attendanceFile: fileUploads.attendanceFile || null,
    quizzes,
    assignments: {
      best: assignmentUploads.best || null,
      average: assignmentUploads.average || null,
      worst: assignmentUploads.worst || null
    }
  };

  const newForm = await Form.create(formData);

  // 4) Send email notification to admin
  try {
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      await new Email(admin, newForm).sendFormSubmissionAlert();
    }
  } catch (emailError) {
    console.error('Failed to send email notification:', emailError);
  }

  // 5) Send response
  res.status(201).json({
    status: 'success',
    data: {
      form: newForm
    }
  });
});

exports.getAllForms = catchAsync(async (req, res, next) => {
  const forms = await Form.find().populate('teacher', 'name email');

  res.status(200).json({
    status: 'success',
    results: forms.length,
    data: {
      forms
    }
  });
});

exports.getTeacherForms = catchAsync(async (req, res, next) => {
  const forms = await Form.find({ teacher: req.user._id });

  res.status(200).json({
    status: 'success',
    results: forms.length,
    data: {
      forms
    }
  });
});

exports.getForm = catchAsync(async (req, res, next) => {
  const form = await Form.findById(req.params.id).populate('teacher', 'name email');

  if (!form) {
    return next(new AppError('No form found with that ID', 404));
  }

  // Only admin or the form owner can view
  if (req.user.role !== 'admin' && form.teacher._id.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to view this form', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      form
    }
  });
});

exports.deleteForm = catchAsync(async (req, res, next) => {
  const form = await Form.findById(req.params.id);

  if (!form) {
    return next(new AppError('No form found with that ID', 404));
  }

  // Only admin or the form owner can delete
  if (req.user.role !== 'admin' && form.teacher.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to delete this form', 403));
  }

  // TODO: Add Cloudinary file deletion if needed

  await Form.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});