import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

let client = null;
let isReady = false;

const redisUrl = process.env.REDIS_URL;
const redisEnabled = process.env.REDIS_ENABLED !== "false";
export const DEFAULT_CACHE_TTL = Number(process.env.CACHE_TTL_SECONDS) || 900;

if (!redisEnabled) {
  console.warn("[Redis] REDIS_ENABLED=false. Redis caching is disabled.");
} else if (!redisUrl) {
  console.warn("[Redis] REDIS_URL not set. Redis caching is disabled.");
} else {
  client = createClient({ url: redisUrl });

  client.on("error", (err) => {
    console.error("[Redis] Client error:", err.message || err);
  });

  client.on("ready", () => {
    isReady = true;
    console.log("[Redis] Connected to Redis");
  });

  client
    .connect()
    .catch((err) => {
      console.error("[Redis] Failed to connect:", err.message || err);
    });
}

const safeRedisClient = {
  get isEnabled() {
    return Boolean(client) && isReady;
  },
  async get(key) {
    if (!client || !isReady) return null;
    return client.get(key);
  },
  async set(key, value, options = {}) {
    if (!client || !isReady) return null;
    return client.set(key, value, options);
  },
  async del(key) {
    if (!client || !isReady) return 0;
    return client.del(key);
  },
  async incr(key) {
    if (!client || !isReady) return null;
    return client.incr(key);
  },
};

export default safeRedisClient;
