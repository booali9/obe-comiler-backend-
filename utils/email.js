const nodemailer = require('nodemailer');

class Email {
  constructor(user, data) {
    this.to = user.email;
    this.name = user.name;
    this.from = `NED University <${process.env.EMAIL_FROM}>`;
    
    // For OTP emails
    this.otp = data.otp;
    
    // For form submission emails
    this.form = data.form;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Use SendGrid in production
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    // Use Mailtrap in development
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendPasswordResetOTP() {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: 'Your password reset OTP (valid for 10 minutes)',
      text: `Your OTP for password reset is: ${this.otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Reset Request</h2>
          <p>Hello ${this.name},</p>
          <p>Your OTP for password reset is:</p>
          <div style="background: #f4f4f4; padding: 10px; margin: 20px 0; 
                      font-size: 24px; letter-spacing: 2px; text-align: center;">
            ${this.otp}
          </div>
          <p>This OTP is valid for 10 minutes only.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">NED University</p>
        </div>
      `
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendFormSubmissionAlert() {
    if (!this.form) {
      throw new Error('Form data is required for submission alert');
    }

    const quizDetails = this.form.quizzes.map(quiz => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">Quiz ${quiz.quizNumber}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${quiz.bestScore}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${quiz.averageScore}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${quiz.worstScore}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: `New Form Submission: ${this.form.courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">New Form Submission</h2>
          
          <div style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 5px;">Teacher Information</h3>
            <p><strong>Name:</strong> ${this.form.teacherName}</p>
            <p><strong>ID:</strong> ${this.form.teacherId}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 5px;">Course Details</h3>
            <p><strong>Course:</strong> ${this.form.courseName} (${this.form.courseCode})</p>
            <p><strong>Department:</strong> ${this.form.department}</p>
            <p><strong>Year/Semester:</strong> ${this.form.year} - ${this.form.semester}</p>
          </div>
          
          <h3 style="margin-bottom: 10px;">Quiz Results</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Quiz</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Best Score</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Average Score</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Worst Score</th>
              </tr>
            </thead>
            <tbody>
              ${quizDetails}
            </tbody>
          </table>
          
          <div style="margin-bottom: 20px;">
            <p><strong>Attendance File:</strong> 
              <a href="${process.env.BASE_URL}${this.form.attendanceFile}">Download</a>
            </p>
            <p><strong>Submitted At:</strong> ${new Date(this.form.submittedAt).toLocaleString()}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">NED University - Automated Notification</p>
        </div>
      `
    };

    await this.newTransport().sendMail(mailOptions);
  }
}

module.exports = Email;