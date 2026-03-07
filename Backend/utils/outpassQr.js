import crypto from "crypto";
import jwt from "jsonwebtoken";

const QR_TOKEN_TYPE = "HOSTEL_OUTPASS_QR";
const FALLBACK_QR_SECRET = "hostel_outpass_qr_secret_dev";

const getQrSecret = () =>
  process.env.OUTPASS_QR_SECRET || process.env.JWT_SECRET || FALLBACK_QR_SECRET;

export const createOutpassQrKey = () => crypto.randomBytes(24).toString("hex");

export const getOutpassQrExpiryDate = (outpass) => {
  const toDate = new Date(outpass?.dateTo);
  if (!Number.isNaN(toDate.getTime())) {
    return toDate;
  }
  const fallback = new Date();
  fallback.setHours(fallback.getHours() + 24);
  return fallback;
};

export const signOutpassQrToken = ({ outpassId, qrKey, expiresAt }) => {
  const expiry = new Date(expiresAt);
  const exp = Math.max(Math.floor(Date.now() / 1000) + 60, Math.floor(expiry.getTime() / 1000));
  return jwt.sign(
    {
      type: QR_TOKEN_TYPE,
      outpassId: String(outpassId),
      qrKey: String(qrKey || ""),
      exp,
    },
    getQrSecret(),
    { noTimestamp: true }
  );
};

export const verifyOutpassQrToken = (token) => jwt.verify(token, getQrSecret());

export const isOutpassQrPayload = (payload) =>
  payload && payload.type === QR_TOKEN_TYPE && payload.outpassId && payload.qrKey;

const toLocalDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const isSameLocalCalendarDay = (a, b) => {
  const aKey = toLocalDateKey(a);
  const bKey = toLocalDateKey(b);
  return Boolean(aKey) && Boolean(bKey) && aKey === bKey;
};

export const getOutpassQrUsability = (outpass, now = new Date()) => {
  const status = String(outpass?.status || "");
  const isScannableStatus = ["Approved", "Exited"].includes(status);
  const qrActive = Boolean(outpass?.qr?.active);
  const qrKey = String(outpass?.qr?.key || "").trim();
  const issuedAt = outpass?.qr?.issuedAt ? new Date(outpass.qr.issuedAt) : null;
  const expiresAt = outpass?.qr?.expiresAt ? new Date(outpass.qr.expiresAt) : null;
  const scanCount = Number(outpass?.qr?.scanCount || 0);
  const maxScans = Number(outpass?.qr?.maxScans || 2);

  if (!qrActive) return { usable: false, reason: "inactive", scanCount, maxScans };
  if (!qrKey) return { usable: false, reason: "missing_key", scanCount, maxScans };
  if (!issuedAt || Number.isNaN(issuedAt.getTime())) {
    return { usable: false, reason: "missing_issued_at", scanCount, maxScans };
  }
  if (!isSameLocalCalendarDay(issuedAt, now)) {
    return { usable: false, reason: "next_day", scanCount, maxScans };
  }
  if (scanCount >= maxScans) return { usable: false, reason: "max_scans", scanCount, maxScans };
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) {
    return { usable: false, reason: "expired", scanCount, maxScans };
  }
  if (!isScannableStatus) return { usable: false, reason: "invalid_status", scanCount, maxScans };

  return {
    usable: true,
    reason: "ok",
    scanCount,
    maxScans,
    expiresAt: expiresAt || null,
    issuedAt,
  };
};
