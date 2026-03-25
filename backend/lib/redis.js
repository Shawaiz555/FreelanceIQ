const crypto = require('crypto');

// Upstash Redis REST client (uses fetch — works in Vercel Edge + Node.js)
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in env vars.
// Falls back to a no-op (passthrough) if env vars are not set, so the app
// still works without Redis (just no caching).

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function isConfigured() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisRequest(command, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const response = await fetch(`${url}/${[command, ...args].map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Upstash error ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  return json.result;
}

/**
 * Build a stable cache key from a job description.
 * Normalises whitespace and lowercases before hashing so minor formatting
 * differences in the same job text still hit the cache.
 */
function buildCacheKey(jobDescription) {
  const normalised = jobDescription.replace(/\s+/g, ' ').trim().toLowerCase();
  const hash = crypto.createHash('sha256').update(normalised).digest('hex').slice(0, 32);
  return `analysis:v1:${hash}`;
}

/**
 * Try to get a cached analysis result.
 * Returns parsed object or null.
 */
async function getCached(jobDescription) {
  if (!isConfigured()) return null;
  try {
    const key = buildCacheKey(jobDescription);
    const value = await redisRequest('GET', key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (err) {
    console.warn('[Redis] getCached error (skipping cache):', err.message);
    return null;
  }
}

/**
 * Store an analysis result in cache for 24 hours.
 */
async function setCached(jobDescription, data) {
  if (!isConfigured()) return;
  try {
    const key = buildCacheKey(jobDescription);
    await redisRequest('SET', key, JSON.stringify(data), 'EX', String(CACHE_TTL_SECONDS));
  } catch (err) {
    console.warn('[Redis] setCached error (skipping cache):', err.message);
  }
}

module.exports = { getCached, setCached, buildCacheKey };
