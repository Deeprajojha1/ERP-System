const WINDOW_MS = Number(process.env.LINKEDIN_ANALYZER_RATE_LIMIT_WINDOW_MS) || 60 * 1000;
const MAX_REQUESTS = Number(process.env.LINKEDIN_ANALYZER_RATE_LIMIT_MAX) || 5;
const MAX_BUCKETS = 2000;

const buckets = new Map();

const cleanupExpiredBuckets = (now) => {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

const getRateLimitKey = (req) => {
  const userPart = String(req.userId || "anonymous");
  const ipPart = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
  return `${userPart}:${ipPart}`;
};

const linkedinAnalyzerRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = getRateLimitKey(req);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = {
      count: 0,
      resetAt: now + WINDOW_MS,
    };
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "Too many LinkedIn analyzer requests. Please retry shortly.",
      retryAfterSeconds: retryAfter,
    });
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > MAX_BUCKETS) {
    cleanupExpiredBuckets(now);
  }

  return next();
};

export default linkedinAnalyzerRateLimit;
