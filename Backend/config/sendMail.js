import dotenv from "dotenv";
import { BrevoClient } from "@getbrevo/brevo";

dotenv.config();

const normalizeEnvValue = (value = "") => {
  let normalized = String(value || "").trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  if (/^bearer\s+/i.test(normalized)) {
    normalized = normalized.replace(/^bearer\s+/i, "").trim();
  }
  return normalized;
};

const BREVO_API_KEY = normalizeEnvValue(process.env.BREVO_API_KEY);
const BREVO_FROM_EMAIL = normalizeEnvValue(process.env.BREVO_FROM_EMAIL);
const EMAIL_FROM_NAME = normalizeEnvValue(process.env.EMAIL_FROM_NAME);

let transactionalEmailsApi = null;

if (!BREVO_API_KEY) {
  console.warn("[sendMail] BREVO_API_KEY is not set. Emails will fail.");
} else {
  try {
    const client = new BrevoClient({ apiKey: BREVO_API_KEY });
    transactionalEmailsApi = client.transactionalEmails;
  } catch (error) {
    console.warn("[sendMail] Failed to initialize Brevo client:", error?.message || error);
  }
}

const sendEmail = async (to, otp) => {
  if (!transactionalEmailsApi) {
    return {
      ok: false,
      code: "BREVO_NOT_CONFIGURED",
      message: "Email provider is not configured.",
    };
  }

  if (!BREVO_FROM_EMAIL) {
    return {
      ok: false,
      code: "BREVO_FROM_MISSING",
      message: "Sender email is not configured.",
    };
  }

  try {
    const response = await transactionalEmailsApi.sendTransacEmail({
      sender: { name: EMAIL_FROM_NAME || "Haridwar University ERP", email: BREVO_FROM_EMAIL },
      to: [{ email: to }],
      subject: "Reset Your Password - OTP",
      textContent: `Your OTP is: ${otp}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 15px;">
          <h2 style="color: #2563eb;">Password Reset OTP</h2>
          <p>Hello,</p>
          <p>Your OTP for resetting password is:</p>
          <h1 style="letter-spacing: 4px; color: #111827;">${otp}</h1>
          <p style="color: gray;">This OTP is valid for only 5 minutes.</p>
          <p>Thanks,<br/>ERP Team</p>
        </div>
      `,
    });
    console.log("Email Sent Successfully:", response?.body?.messageId);
    return { ok: true };
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status || 0);
    const providerMessage = error?.message || "Brevo send failed";
    const isUnauthorized =
      statusCode === 401 ||
      /unauthorized|invalid api key|revoked|expired/i.test(String(providerMessage));

    console.error("Email Send Error:", providerMessage);
    if (process.env.NODE_ENV !== "production") {
      console.error("Email error stack:", error.stack || error);
    }

    return {
      ok: false,
      code: isUnauthorized ? "BREVO_AUTH_FAILED" : "BREVO_SEND_FAILED",
      message: isUnauthorized
        ? "Brevo authentication failed. API key is invalid, expired, or revoked."
        : providerMessage,
      statusCode,
    };
  }
};

export default sendEmail;

