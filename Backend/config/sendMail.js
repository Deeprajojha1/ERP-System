import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

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

const SENDGRID_API_KEY = normalizeEnvValue(process.env.SENDGRID_API_KEY);
const SENDGRID_FROM_EMAIL = normalizeEnvValue(process.env.SENDGRID_FROM_EMAIL);
const EMAIL_FROM_NAME = normalizeEnvValue(process.env.EMAIL_FROM_NAME);

let sendGridReady = false;

if (!SENDGRID_API_KEY) {
  console.warn("[sendMail] SENDGRID_API_KEY is not set. Emails will fail.");
} else if (!SENDGRID_API_KEY.startsWith("SG.")) {
  console.warn("[sendMail] SENDGRID_API_KEY format looks invalid. It should start with 'SG.'");
} else {
  try {
    sgMail.setApiKey(SENDGRID_API_KEY);
    sendGridReady = true;
  } catch (error) {
    console.warn("[sendMail] Failed to initialize SendGrid client:", error?.message || error);
  }
}

const sendEmail = async (to, otp) => {
  if (!sendGridReady) {
    return {
      ok: false,
      code: "SENDGRID_NOT_CONFIGURED",
      message: "Email provider is not configured.",
    };
  }

  if (!SENDGRID_FROM_EMAIL) {
    return {
      ok: false,
      code: "SENDGRID_FROM_MISSING",
      message: "Sender email is not configured.",
    };
  }

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
          <p>Hello,</p>
          <p>Your OTP for resetting password is:</p>
          <h1 style="letter-spacing: 4px; color: #111827;">${otp}</h1>
          <p style="color: gray;">This OTP is valid for only 5 minutes.</p>
          <p>Thanks,<br/>ERP Team</p>
        </div>
      `,
    };

    const [response] = await sgMail.send(msg);
    console.log("Email Sent Successfully:", response.statusCode);
    return { ok: true };
  } catch (error) {
    const statusCode = Number(
      error?.code || error?.response?.statusCode || error?.response?.status || 0
    );
    const providerMessage =
      error?.response?.body?.errors?.[0]?.message || error?.message || "SendGrid send failed";
    const isUnauthorized =
      statusCode === 401 ||
      /authorization grant is invalid|unauthorized|invalid api key|revoked|expired/i.test(
        String(providerMessage)
      );

    console.error("Email Send Error:", providerMessage);
    if (error.response && error.response.body) {
      console.error("SendGrid response body:", error.response.body);
    } else if (process.env.NODE_ENV !== "production") {
      console.error("Email error stack:", error.stack || error);
    }

    return {
      ok: false,
      code: isUnauthorized ? "SENDGRID_AUTH_FAILED" : "SENDGRID_SEND_FAILED",
      message: isUnauthorized
        ? "SendGrid authentication failed. API key is invalid, expired, or revoked."
        : providerMessage,
      statusCode,
    };
  }
};

export default sendEmail;

