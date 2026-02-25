import redisClient from "../config/redisClient.js";

const toPositiveInt = (value, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
};

const IS_PROD = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const RATE_LIMIT_ENABLED =
  String(process.env.FEE_RATE_LIMIT_ENABLED || (IS_PROD ? "true" : "false")).toLowerCase() ===
  "true";

const WINDOW_MS = toPositiveInt(process.env.FEE_RATE_WINDOW_MS, 5 * 60 * 1000);
const MAX_READ_REQUESTS = toPositiveInt(
  process.env.FEE_RATE_MAX_READ,
  IS_PROD ? 300 : 2000
);
const MAX_WRITE_REQUESTS = toPositiveInt(
  process.env.FEE_RATE_MAX_WRITE,
  IS_PROD ? 100 : 500
);
const store = new Map();

const getClientIp = (req) => {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || String(req.ip || "unknown");
};

const getScope = (req) => {
  const method = String(req.method || "GET").toUpperCase();
  return method === "GET" ? "read" : "write";
};

const getKey = (req) => {
  const userId = req.userId ? String(req.userId) : "anon";
  const ip = getClientIp(req);
  const scope = getScope(req);
  return `${userId}:${ip}:${scope}`;
};

const pruneExpired = (now) => {
  for (const [key, entry] of store.entries()) {
    if (!entry?.windowStart || now - entry.windowStart >= WINDOW_MS) {
      store.delete(key);
    }
  }
};

const feeRateLimit = (req, res, next) => {
  if (!RATE_LIMIT_ENABLED) return next();
  if (redisClient.isEnabled) {
    return feeRateLimitWithRedis(req, res, next);
  }
  return feeRateLimitWithMemory(req, res, next);
};

const feeRateLimitWithMemory = (req, res, next) => {
  const now = Date.now();
  if (store.size > 1000) pruneExpired(now);

  const key = getKey(req);
  const existing = store.get(key);
  const limit = getScope(req) === "write" ? MAX_WRITE_REQUESTS : MAX_READ_REQUESTS;

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(limit - 1));
    return next();
  }

  if (existing.count >= limit) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - existing.windowStart)) / 1000);
    res.setHeader("Retry-After", String(Math.max(1, retryAfter)));
    return res.status(429).json({
      message: "Too many fee requests. Please retry after some time.",
    });
  }

  existing.count += 1;
  store.set(key, existing);
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - existing.count)));
  return next();
};

const feeRateLimitWithRedis = async (req, res, next) => {
  try {
    const key = `ratelimit:fee:${getKey(req)}`;
    const limit = getScope(req) === "write" ? MAX_WRITE_REQUESTS : MAX_READ_REQUESTS;
    const ttlSeconds = Math.ceil(WINDOW_MS / 1000);

    const currentRaw = await redisClient.incr(key);
    const current = Number(currentRaw || 0);
    if (current === 1) {
      await redisClient.expire(key, ttlSeconds);
    }

    const ttl = await redisClient.ttl(key);
    const remaining = Math.max(0, limit - current);
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (current > limit) {
      res.setHeader("Retry-After", String(Math.max(1, ttl > 0 ? ttl : 1)));
      return res.status(429).json({
        message: "Too many fee requests. Please retry after some time.",
      });
    }
    return next();
  } catch {
    // Fail open to in-memory limiter if Redis has transient issues.
    return feeRateLimitWithMemory(req, res, next);
  }
};

export default feeRateLimit;