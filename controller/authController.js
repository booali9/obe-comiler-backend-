const User = require('../models/User');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email'); // You'll need to implement this

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Only allow @cloud.neduet.edu.pk emails to sign up
exports.signup = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  if (!email.endsWith('@cloud.neduet.edu.pk')) {
    return next(new AppError('Only NED University emails (@cloud.neduet.edu.pk) are allowed', 400));
  }

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role || 'teacher'
  });

  newUser.password = undefined;

  res.status(201).json({
    status: 'success',
    data: {
      user: newUser
    }
  });
});

// Only allow @cloud.neduet.edu.pk emails to login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  if (!email.endsWith('@cloud.neduet.edu.pk')) {
    return next(new AppError('Only NED University emails (@cloud.neduet.edu.pk) are allowed', 403));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  if (!email.endsWith('@cloud.neduet.edu.pk')) {
    return next(new AppError('Only NED University emails (@cloud.neduet.edu.pk) are allowed', 403));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with that email address', 404));
  }

  const otp = user.createOTP();
  await user.save({ validateBeforeSave: false });

  try {
    // Implement your email sending functionality here
    await new Email(user, otp).sendPasswordResetOTP();
    
    res.status(200).json({
      status: 'success',
      message: 'OTP sent to email!'
    });
  } catch (err) {
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
  
  if (!email.endsWith('@cloud.neduet.edu.pk')) {
    return next(new AppError('Only NED University emails (@cloud.neduet.edu.pk) are allowed', 403));
  }

  const user = await User.findOne({
    email,
    otpExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('OTP is invalid or has expired', 400));
  }

  const hashedOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  if (hashedOTP !== user.otp) {
    return next(new AppError('OTP is incorrect', 400));
  }

  // OTP is correct - create a temporary token for password reset
  const tempToken = signToken(user._id);
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    token: tempToken,
    message: 'OTP verified successfully'
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.password = req.body.password;
  user.passwordChangedAt = Date.now();
  await user.save();

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
    message: 'Password updated successfully'
  });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(req.body.currentPassword))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
    message: 'Password changed successfully'
  });
});