/**
 * Simple in-memory cache with TTL (Time To Live)
 * Useful for caching API responses and database queries
 */
class Cache {
    constructor() {
        this.store = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0
        };
    }

    /**
     * Set cache value with TTL
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (default: 60 seconds)
     */
    set(key, value, ttl = 60000) {
        this.store.set(key, {
            value,
            expires: Date.now() + ttl
        });
        this.stats.sets++;
    }

    /**
     * Get cache value
     * @param {string} key - Cache key
     * @returns {*} Cached value or null if not found/expired
     */
    get(key) {
        const item = this.store.get(key);

        if (!item) {
            this.stats.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() > item.expires) {
            this.store.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return item.value;
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and valid
     */
    has(key) {
        const item = this.store.get(key);
        if (!item) return false;

        if (Date.now() > item.expires) {
            this.store.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Delete cache entry
     * @param {string} key - Cache key
     */
    delete(key) {
        this.store.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.store.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0
        };
    }

    /**
     * Clear expired entries
     */
    clearExpired() {
        const now = Date.now();
        let cleared = 0;

        for (const [key, item] of this.store.entries()) {
            if (now > item.expires) {
                this.store.delete(key);
                cleared++;
            }
        }

        if (cleared > 0) {
            console.log(`[Cache] Cleared ${cleared} expired entries`);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            size: this.store.size,
            hitRate: `${hitRate}%`
        };
    }

    /**
     * Get or set pattern - fetch from cache or execute function and cache result
     * @param {string} key - Cache key
     * @param {Function} fn - Function to execute if cache miss
     * @param {number} ttl - Time to live in milliseconds
     * @returns {Promise<*>} Cached or fresh value
     */
    async getOrSet(key, fn, ttl = 60000) {
        const cached = this.get(key);

        if (cached !== null) {
            return cached;
        }

        const value = await fn();
        this.set(key, value, ttl);
        return value;
    }
}

// Singleton instance
export const cache = new Cache();

// Auto-cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => cache.clearExpired(), 5 * 60 * 1000);
}

// Export class for creating multiple cache instances if needed
export { Cache };
