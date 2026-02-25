import crypto from "crypto";
import redisClient from "../config/redisClient.js";

const ONLINE_MODES = new Set(["UPI", "NETBANKING", "CARD", "BANK_TRANSFER"]);
const NONCE_WINDOW_SECONDS = 5 * 60;
const usedSignatureStore = new Map();

const getGatewaySecret = (gateway = "") => {
  const normalized = String(gateway || "").toUpperCase();
  if (normalized === "RAZORPAY") return process.env.PAYMENT_SIGNING_SECRET_RAZORPAY || "";
  if (normalized === "PAYU") return process.env.PAYMENT_SIGNING_SECRET_PAYU || "";
  if (normalized === "CASHFREE") return process.env.PAYMENT_SIGNING_SECRET_CASHFREE || "";
  return process.env.PAYMENT_SIGNING_SECRET || "";
};

const safe = (value) => String(value ?? "").trim();

// Canonical payload to protect demand + amount + mode + gateway + transaction tuple.
const buildSigningString = ({ demandId, amount, mode, gateway, transactionId, timestamp }) =>
  [demandId, amount, mode, gateway, transactionId, timestamp].map(safe).join("|");

const pruneUsedSignatureStore = () => {
  const now = Date.now();
  for (const [key, expiresAt] of usedSignatureStore.entries()) {
    if (Number(expiresAt || 0) <= now) {
      usedSignatureStore.delete(key);
    }
  }
};

const markSignatureUse = async (key) => {
  if (!key) return false;

  if (redisClient.isEnabled) {
    const result = await redisClient.set(key, "1", { EX: NONCE_WINDOW_SECONDS, NX: true });
    return result === "OK";
  }

  if (usedSignatureStore.size > 2000) {
    pruneUsedSignatureStore();
  }

  if (usedSignatureStore.has(key)) return false;
  usedSignatureStore.set(key, Date.now() + NONCE_WINDOW_SECONDS * 1000);
  return true;
};

const verifyGatewaySignature = async (req, res, next) => {
  try {
    const mode = safe(req.body?.mode).toUpperCase();
    if (!ONLINE_MODES.has(mode)) return next();

    const gateway = safe(req.body?.gateway || "NONE").toUpperCase();
    if (gateway === "NONE") {
      return res.status(400).json({ message: "gateway is required for online payment modes" });
    }

    const signature = safe(req.headers["x-payment-signature"]);
    const timestamp = safe(req.headers["x-payment-timestamp"]);
    const nonce = safe(req.headers["x-payment-nonce"]);
    const transactionId = safe(req.body?.transactionId);
    const amount = safe(req.body?.amount);
    const demandId = safe(req.body?.demandId);

    if (!signature || !timestamp || !nonce) {
      return res.status(400).json({
        message: "x-payment-signature, x-payment-timestamp and x-payment-nonce headers are required",
      });
    }
    if (!transactionId) {
      return res.status(400).json({ message: "transactionId is required for signed online payments" });
    }

    const nowMs = Date.now();
    const tsMs = Number(timestamp);
    if (!Number.isFinite(tsMs) || tsMs <= 0) {
      return res.status(400).json({ message: "Invalid x-payment-timestamp header" });
    }
    // 5 minute anti-replay window
    if (Math.abs(nowMs - tsMs) > 5 * 60 * 1000) {
      return res.status(400).json({ message: "Payment signature timestamp expired" });
    }
    if (!/^[a-zA-Z0-9:_-]{8,120}$/.test(nonce)) {
      return res.status(400).json({ message: "Invalid x-payment-nonce header" });
    }

    const secret = getGatewaySecret(gateway);
    if (!secret) {
      return res.status(503).json({ message: "Payment signature verification is not configured" });
    }

    const signingString = buildSigningString({
      demandId,
      amount,
      mode,
      gateway,
      transactionId,
      timestamp,
    });
    const expected = crypto.createHmac("sha256", secret).update(signingString).digest("hex");

    const providedBuffer = Buffer.from(signature.toLowerCase(), "utf8");
    const expectedBuffer = Buffer.from(expected.toLowerCase(), "utf8");
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({ message: "Invalid payment signature" });
    }

    const replayKey = `payment:sig:${gateway}:${signature.toLowerCase()}:${nonce}:${timestamp}`;
    const firstUse = await markSignatureUse(replayKey);
    if (!firstUse) {
      return res.status(409).json({ message: "Payment signature replay detected" });
    }

    req.verifiedPaymentSignature = true;
    return next();
  } catch {
    return res.status(400).json({ message: "Invalid payment signature payload" });
  }
};

export default verifyGatewaySignature;