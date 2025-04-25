const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  quizNumber: Number,
  bestScore: Number,
  averageScore: Number,
  worstScore: Number
});

const formSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherName: String,
  teacherId: Number,
  department: String,
  courseName: String,
  courseCode: String,
  year: Number,
  semester: String,
  attendanceFile: String, // Path to uploaded file
  quizzes: [quizSchema], // Array of quizzes
  assignments: {
    best: String,
    average: String,
    worst: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const Form = mongoose.model('Form', formSchema);
module.exports = Form;