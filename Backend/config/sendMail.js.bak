import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, EMAIL_FROM_NAME } = process.env;

if (!SENDGRID_API_KEY) {
  console.warn("[sendMail] SENDGRID_API_KEY is not set. Emails will fail.");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Function to send OTP email
const sendEmail = async (to, otp) => {
  try {
    const msg = {
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: EMAIL_FROM_NAME || "Haridwar University ERP",
      },
      to,
      subject: "Reset Your Password - OTP",
      text: `Your OTP is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 15px;">
          <h2 style="color: #2563eb;">Password Reset OTP</h2>
          <p>Hello 👋</p>
          <p>Your OTP for resetting password is:</p>

          <h1 style="letter-spacing: 4px; color: #111827;">${otp}</h1>

          <p style="color: gray;">This OTP is valid for only 5 minutes.</p>
          <p>Thanks,<br/>ERP Team</p>
        </div>
      `,
    };

    const [response] = await sgMail.send(msg);
    console.log("Email Sent Successfully:", response.statusCode);

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
