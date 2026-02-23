const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 60;
const store = new Map();

const getKey = (req) => {
  const userId = req.userId ? String(req.userId) : "anon";
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
  return `${userId}:${ip}`;
};

const feeRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = getKey(req);
  const existing = store.get(key);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return next();
  }

  if (existing.count >= MAX_REQUESTS) {
    return res.status(429).json({
      message: "Too many fee requests. Please retry after some time.",
    });
  }

  existing.count += 1;
  store.set(key, existing);
  return next();
};

export default feeRateLimit;
