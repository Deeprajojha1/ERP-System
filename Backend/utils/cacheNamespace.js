import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

const VERSION_KEY_PREFIX = "cache:ns";

const toSafeString = (value) => String(value ?? "").trim();

const getVersionStorageKey = (namespace) =>
  `${VERSION_KEY_PREFIX}:${toSafeString(namespace)}:version`;

export const getNamespaceVersion = async (namespace) => {
  if (!redisClient.isEnabled) return "1";

  const storageKey = getVersionStorageKey(namespace);
  const current = await redisClient.get(storageKey);
  if (current) return String(current);

  await redisClient.set(storageKey, "1", { NX: true });
  return "1";
};

export const buildVersionedCacheKey = async (namespace, baseKey) => {
  const version = await getNamespaceVersion(namespace);
  return `${toSafeString(namespace)}:v${version}:${toSafeString(baseKey)}`;
};

export const getOrSetVersionedJsonCache = async ({
  namespace,
  baseKey,
  noCache = false,
  ttlSeconds = DEFAULT_CACHE_TTL,
  fetcher,
}) => {
  if (typeof fetcher !== "function") {
    throw new Error("fetcher must be a function");
  }

  if (!redisClient.isEnabled || noCache) {
    return fetcher();
  }

  const cacheKey = await buildVersionedCacheKey(namespace, baseKey);

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error("[Redis] cache read failed:", err.message || err);
  }

  const payload = await fetcher();

  try {
    await redisClient.set(cacheKey, JSON.stringify(payload), { EX: ttlSeconds });
  } catch (err) {
    console.error("[Redis] cache write failed:", err.message || err);
  }

  return payload;
};

export const bumpNamespaceVersion = async (namespace) => {
  if (!redisClient.isEnabled) return null;

  const storageKey = getVersionStorageKey(namespace);
  try {
    const next = await redisClient.incr(storageKey);
    return Number(next);
  } catch (err) {
    console.error("[Redis] namespace bump failed:", err.message || err);
    return null;
  }
};
