import { env } from './env-config.js';
import { createClient } from "@libsql/client";

// Connection pool configuration
const POOL_SIZE = 10;
const MAX_RETRIES = 3;

/**
 * Database Connection Pool Manager
 * Manages pools for Primary and Infrastructure databases
 */
class DatabasePool {
    constructor() {
        this.primary = {
            connections: [],
            available: [],
            waiting: [],
            initialized: false,
            stats: { totalQueries: 0, activeConnections: 0, waitingRequests: 0 }
        };

        this.infra = {
            connections: [],
            available: [],
            waiting: [],
            initialized: false,
            stats: { totalQueries: 0, activeConnections: 0, waitingRequests: 0 }
        };

        this.subscriber = {
            connections: [],
            available: [],
            waiting: [],
            initialized: false,
            stats: { totalQueries: 0, activeConnections: 0, waitingRequests: 0 }
        };
    }

    /**
     * Initialize connection pool
     * @param {string} type - 'primary', 'infra', or 'subscriber'
     */
    async initialize(type = 'primary') {
        const pool = this[type];
        if (pool.initialized) return;

        let dbConfig;
        if (type === 'primary') dbConfig = env.database.primary;
        else if (type === 'infra') dbConfig = env.database.infra;
        else if (type === 'subscriber') dbConfig = env.database.subscriber;

        // If infra is same as primary, we might technically be sharing the same DB,
        // but let's maintain separate pools to avoid starvation if one is heavy.
        // Or we could alias them. For now, separate pools are safer for code logic.

        let dbUrl = dbConfig.url?.replace(/\/$/, "");
        if (dbUrl && dbUrl.startsWith("https://")) {
            dbUrl = dbUrl.replace("https://", "libsql://");
        }

        if (!dbUrl || !dbConfig.token) {
            console.error(`Missing DB config for ${type}`);
            throw new Error(`Database configuration missing for ${type}`);
        }

        // Create pool of connections
        for (let i = 0; i < POOL_SIZE; i++) {
            try {
                const client = createClient({
                    url: dbUrl,
                    authToken: dbConfig.token,
                });
                pool.connections.push(client);
                pool.available.push(client);
            } catch (error) {
                console.error(`Failed to create ${type} database connection ${i}:`, error.message);
                throw error;
            }
        }

        pool.initialized = true;
        console.log(`✅ ${type.toUpperCase()} Database pool initialized with ${POOL_SIZE} connections`);
    }

    /**
     * Get connection from pool
     * @param {string} type - 'primary' or 'infra'
     * @returns {Promise<Object>} Database client
     */
    async getConnection(type = 'primary') {
        const pool = this[type];
        await this.initialize(type);

        // Return available connection immediately
        if (pool.available.length > 0) {
            const client = pool.available.pop();
            pool.stats.activeConnections++;
            return client;
        }

        // Wait for available connection
        pool.stats.waitingRequests++;
        return new Promise((resolve) => {
            pool.waiting.push(resolve);
        });
    }

    /**
     * Release connection back to pool
     * @param {Object} client - Database client to release
     * @param {string} type - 'primary' or 'infra'
     */
    releaseConnection(client, type = 'primary') {
        const pool = this[type];
        pool.stats.activeConnections--;

        // Give to waiting request if any
        if (pool.waiting.length > 0) {
            const resolve = pool.waiting.shift();
            pool.stats.waitingRequests--;
            pool.stats.activeConnections++;
            resolve(client);
        } else {
            // Return to available pool
            pool.available.push(client);
        }
    }

    /**
     * Execute query with connection pooling
     * @param {string} sql - SQL query
     * @param {Array} args - Query arguments
     * @param {string} type - 'primary' or 'infra'
     * @returns {Promise<Array>} Query results
     */
    async query(sql, args = [], type = 'primary') {
        const client = await this.getConnection(type);
        const startTime = Date.now();

        try {
            const result = await client.execute({ sql, args });
            this[type].stats.totalQueries++;

            const duration = Date.now() - startTime;
            if (duration > 100) {
                console.warn(`[DB:${type}] Slow query (${duration}ms):`, sql.substring(0, 100));
            }

            return result.rows || [];
        } catch (error) {
            console.error(`[DB:${type}] Query Error: ${error.message}`, {
                sql: sql.substring(0, 100),
                args: args.length > 0 ? `${args.length} args` : 'no args'
            });
            throw error;
        } finally {
            this.releaseConnection(client, type);
        }
    }

    async queryWithRetry(sql, args = [], retries = MAX_RETRIES, type = 'primary') {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.query(sql, args, type);
            } catch (error) {
                if (i === retries - 1) throw error;
                const delay = Math.pow(2, i) * 100;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    getStats() {
        return {
            primary: {
                ...this.primary.stats,
                availableConnections: this.primary.available.length,
                totalConnections: this.primary.connections.length
            },
            infra: {
                ...this.infra.stats,
                availableConnections: this.infra.available.length,
                totalConnections: this.infra.connections.length
            }
        };
    }

    async close() {
        // Reset all pools
        ['primary', 'infra', 'subscriber'].forEach(type => {
            const pool = this[type];
            pool.connections = [];
            pool.available = [];
            pool.waiting = [];
            pool.initialized = false;
        });
    }
}

// Singleton instance
const pool = new DatabasePool();

// Export query functions
export const query = (sql, args) => pool.query(sql, args, 'primary'); // Default for backward compatibility
export const queryInfra = (sql, args) => pool.query(sql, args, 'infra');
export const querySubscriber = (sql, args) => pool.query(sql, args, 'subscriber');
export const queryWithRetry = (sql, args, retries) => pool.queryWithRetry(sql, args, retries, 'primary');

export const getPoolStats = () => pool.getStats();
export const closePool = () => pool.close();
export const dbPool = pool; // Export pool for custom usage if needed
