
// In-memory store for rate limiting
// Note: In serverless environments (like Vercel), this may reset when the function cold-starts.
// For strict persistence, use a database (e.g. Redis or Turso).
const requestLog = {};

const MAX_REQUESTS_DEFAULT = 3;
const BLOCK_TIME_DEFAULT = 60 * 1000; // 1 minute

/**
 * Checks if a request is allowed based on IP and Device info.
 * @param {string} key - Unique identifier (IP + UserAgent/Device)
 * @param {number} limit - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if allowed, False if blocked
 */
export function checkRateLimit(key, limit = MAX_REQUESTS_DEFAULT, windowMs = BLOCK_TIME_DEFAULT) {
    if (!requestLog[key]) {
        requestLog[key] = {
            count: 1,
            lastRequestTime: Date.now(),
        };
        return true;
    }

    const { count, lastRequestTime } = requestLog[key];
    const now = Date.now();

    // If time window has passed, reset
    if (now - lastRequestTime > windowMs) {
        requestLog[key] = {
            count: 1,
            lastRequestTime: now,
        };
        return true;
    }

    // Check limit
    if (count >= limit) {
        return false;
    }

    // Increment
    requestLog[key].count += 1;
    return true;
}
