/**
 * Rate Limiting Cache Layer
 * Provides in-memory caching before database checks to reduce latency
 */

import { queryInfra } from './db-pool.js';

// In-memory cache for rate limits
const rateLimitCache = new Map();

// Cache statistics
const stats = {
    hits: 0,
    misses: 0,
    dbQueries: 0,
    evictions: 0
};

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 10000; // Max entries before eviction

/**
 * Clean up expired cache entries
 */
function cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of rateLimitCache.entries()) {
        if (entry.expires < now) {
            rateLimitCache.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        stats.evictions += cleaned;
    }
    
    // If cache is too large, evict oldest entries
    if (rateLimitCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(rateLimitCache.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        
        const toEvict = rateLimitCache.size - MAX_CACHE_SIZE;
        for (let i = 0; i < toEvict; i++) {
            rateLimitCache.delete(entries[i][0]);
            stats.evictions++;
        }
    }
}

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupExpired, CLEANUP_INTERVAL);
}

/**
 * Check rate limit with caching
 * @param {string} identifier - Rate limit identifier (e.g., "rate_limit:auth:ip:window")
 * @param {number} limit - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<boolean>} - True if within limit, false if exceeded
 */
export async function checkRateLimitCached(identifier, limit, windowMs) {
    const now = Date.now();
    const cached = rateLimitCache.get(identifier);
    
    // Check in-memory cache first
    if (cached) {
        if (cached.expires > now) {
            // Cache hit - check if limit exceeded
            cached.lastAccess = now;
            stats.hits++;
            
            if (cached.count >= limit) {
                return false; // Limit exceeded
            }
            
            // Increment count
            cached.count++;
            return true; // Within limit
        } else {
            // Expired entry - remove it
            rateLimitCache.delete(identifier);
        }
    }
    
    // Cache miss - check database
    stats.misses++;
    stats.dbQueries++;
    
    try {
        const result = await queryInfra(
            'SELECT count, reset_time FROM rate_limits WHERE identifier = ?',
            [identifier]
        );
        
        const dbEntry = result.length > 0 ? result[0] : null;
        const resetTime = dbEntry?.reset_time || (Math.floor(now / 1000) + Math.floor(windowMs / 1000));
        const count = dbEntry?.count || 0;
        
        // Check if limit exceeded
        if (count >= limit) {
            // Cache the exceeded state
            rateLimitCache.set(identifier, {
                count,
                expires: resetTime * 1000,
                lastAccess: now
            });
            return false; // Limit exceeded
        }
        
        // Increment count in database
        const newCount = count + 1;
        await queryInfra(
            `INSERT INTO rate_limits (identifier, count, reset_time) 
             VALUES (?, ?, ?) 
             ON CONFLICT(identifier) DO UPDATE SET count = count + 1`,
            [identifier, newCount, resetTime]
        );
        
        // Cache the result
        rateLimitCache.set(identifier, {
            count: newCount,
            expires: resetTime * 1000,
            lastAccess: now
        });
        
        return true; // Within limit
    } catch (error) {
        // On database error, fail open (allow request)
        console.error('[RateLimitCache] DB error, failing open:', error);
        return true;
    }
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
    const hitRate = stats.hits + stats.misses > 0
        ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
        : 0;
    
    return {
        ...stats,
        size: rateLimitCache.size,
        hitRate: `${hitRate}%`,
        maxSize: MAX_CACHE_SIZE
    };
}

/**
 * Clear the cache (for testing or manual invalidation)
 */
export function clearCache() {
    rateLimitCache.clear();
    stats.hits = 0;
    stats.misses = 0;
    stats.dbQueries = 0;
    stats.evictions = 0;
}
