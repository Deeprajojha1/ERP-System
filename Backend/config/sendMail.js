import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_SERVICE,
  USER_EMAIL,
  USER_PASSWORD,
} = process.env;

// Transporter setup
// If explicit SMTP host/port are provided (e.g. on Render), use them.
// Otherwise fall back to Gmail service, which you already use locally.
const transporter = nodemailer.createTransport(
  SMTP_HOST
    ? {
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: SMTP_SECURE === "true", // typically false for 587, true for 465
        auth: {
          user: USER_EMAIL,
          pass: USER_PASSWORD,
        },
      }
    : {
        service: SMTP_SERVICE || "Gmail",
        auth: {
          user: USER_EMAIL,
          pass: USER_PASSWORD,
        },
      }
);

// Function to send OTP email
const sendEmail = async (to, otp) => {
  try {
    const mailOptions = {
      from: process.env.USER_EMAIL, 
      to: to,
      subject: "Reset Your Password - OTP",
      text: `Your OTP is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 15px;">
          <h2 style="color: #2563eb;">Password Reset OTP</h2>
          <p>Hello 👋</p>
          <p>Your OTP for resetting password is:</p>

          <h1 style="letter-spacing: 4px; color: #111827;">${otp}</h1>

          <p style="color: gray;">This OTP is valid for only 5 minutes.</p>
          <p>Thanks,<br/>LMS Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email Sent Successfully:", info.messageId);

    return true;
  } catch (error) {
    console.log("❌ Email Send Error:", error.message);
    if (process.env.NODE_ENV !== "production") {
      console.log("Email error stack:", error.stack);
    }
    return false;
  }
};

export default sendEmail;
